//! Pembayaran manual alur PMB v2: calon membayar ke VA Mandiri / QRIS statis kampus,
//! mengunggah bukti, lalu admin PMB / keuangan menyetujui atau menolak.
//!
//! Berlaku untuk dua jenis tagihan:
//! - `FORMULIR`: SUBMITTED/PEMBAYARAN_DITOLAK -> MENUNGGU_VERIFIKASI_BAYAR, lalu
//!   PEMBAYARAN_DISETUJUI (disetujui) atau PEMBAYARAN_DITOLAK (ditolak).
//! - `DAFTAR_ULANG_UKT`: LULUS -> MENUNGGU_VERIFIKASI_DAFTAR_ULANG, lalu
//!   DAFTAR_ULANG_LUNAS (disetujui) atau kembali LULUS (ditolak).
//!
//! Persetujuan bukti dan pelunasan tagihan terjadi dalam SATU transaksi database
//! (lihat [`settle_dalam_tx`]).

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{get, post, put},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    extractors::{AuthUser, ValidatedJson},
    modules::{
        pembayaran::{
            model::Tagihan,
            repository::{PembayaranRepository, settle_dalam_tx},
        },
        pendaftaran::{
            alur::{self, status},
            repository::PendaftaranRepository,
        },
    },
    security::storage::{PresignedUploadResponse, StorageService},
    state::AppState,
};

pub const MIME_BUKTI: [&str; 4] = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
pub const EKSTENSI_BUKTI: [&str; 5] = ["jpg", "jpeg", "png", "webp", "pdf"];

/// Tanggal hari ini menurut WIB (UTC+7), zona calon. Memakai tanggal UTC akan menolak
/// bukti bayar bertanggal "hari ini" yang dikirim calon pada pukul 00.00-07.00 WIB.
pub fn hari_ini_wib(sekarang: chrono::DateTime<Utc>) -> NaiveDate {
    (sekarang + chrono::Duration::hours(7)).date_naive()
}

const MAKS_BYTES: i64 = 5 * 1024 * 1024;
pub const METODE_MANUAL: [&str; 2] = ["VA_MANDIRI", "QRIS"];
pub const JENIS_DIDUKUNG: [&str; 2] = ["FORMULIR", "DAFTAR_ULANG_UKT"];

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, ToSchema, FromRow)]
pub struct RekeningPembayaran {
    pub id: Uuid,
    /// `VA_MANDIRI` atau `QRIS`
    pub jenis: String,
    pub nama_bank: String,
    pub nomor: Option<String>,
    pub atas_nama: String,
    /// Object key gambar QRIS (dipakai admin saat menyimpan ulang tanpa unggah baru)
    pub qris_image_key: Option<String>,
    pub instruksi: Option<String>,
    pub is_active: bool,
    #[sqlx(skip)]
    pub qris_image_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SimpanRekeningRequest {
    /// `VA_MANDIRI` atau `QRIS`
    pub jenis: String,
    #[validate(length(min = 1, max = 100))]
    pub nama_bank: String,
    #[validate(length(min = 5, max = 100))]
    pub nomor: Option<String>,
    #[validate(length(min = 1, max = 255))]
    pub atas_nama: String,
    #[validate(length(min = 1, max = 500))]
    pub qris_image_key: Option<String>,
    #[validate(length(max = 2000))]
    pub instruksi: Option<String>,
    #[serde(default = "default_true")]
    pub is_active: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct PresignBuktiRequest {
    pub tagihan_id: Uuid,
    #[validate(length(min = 1, max = 200))]
    pub file_name: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct PresignQrisRequest {
    #[validate(length(min = 1, max = 200))]
    pub file_name: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SubmitBuktiRequest {
    pub tagihan_id: Uuid,
    /// `VA_MANDIRI` atau `QRIS`
    pub metode: String,
    #[validate(range(min = 1))]
    pub nominal_dibayar: i64,
    pub tgl_bayar: NaiveDate,
    #[validate(length(min = 1, max = 500))]
    pub file_key: String,
    #[validate(length(min = 1, max = 255))]
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, ToSchema, FromRow)]
pub struct BuktiPembayaranItem {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nomor_registrasi: Option<String>,
    pub nama_lengkap: String,
    pub jenis_tagihan: String,
    pub tagihan_id: Option<Uuid>,
    pub nomor_tagihan: Option<String>,
    /// Nominal yang harus dibayar (dari tagihan)
    pub nominal_tagihan: Option<i64>,
    /// Nominal yang diklaim calon pada bukti
    pub nominal_dibayar: Option<i64>,
    pub metode: Option<String>,
    pub tgl_bayar: Option<NaiveDate>,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub status: String,
    pub catatan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub reviewed_at: Option<DateTime<Utc>>,
    #[sqlx(skip)]
    pub download_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ReviewBuktiRequest {
    /// `DISETUJUI` atau `DITOLAK`
    pub status: String,
    #[validate(length(max = 1000))]
    pub catatan: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewBuktiResponse {
    pub status: String,
    pub jenis_tagihan: String,
    pub pesan: String,
}

#[derive(Debug, Deserialize)]
pub struct ListBuktiQuery {
    pub status: Option<String>,
    pub jenis: Option<String>,
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn bukti_router() -> Router<AppState> {
    Router::new()
        .route("/rekening", get(list_rekening_handler))
        .route("/bukti/presign", post(presign_bukti_handler))
        .route("/bukti", post(submit_bukti_handler))
        .route("/bukti/my", get(my_bukti_handler))
        .route("/admin/bukti", get(list_bukti_admin_handler))
        .route("/admin/bukti/{id}/review", post(review_bukti_handler))
        .route(
            "/admin/rekening",
            get(admin_list_rekening_handler).post(admin_create_rekening_handler),
        )
        .route("/admin/rekening/{id}", put(admin_update_rekening_handler))
        .route(
            "/admin/rekening/qris/presign",
            post(admin_presign_qris_handler),
        )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

pub fn storage(state: &AppState) -> StorageService {
    StorageService::new(
        state.config.s3_endpoint.clone(),
        state.config.s3_access_key.clone(),
        state.config.s3_secret_key.clone(),
        state.config.s3_bucket.clone(),
    )
}

fn ensure_reviewer(a: &AuthUser) -> Result<(), AppError> {
    if a.is_admin() || a.is_keuangan() {
        Ok(())
    } else {
        Err(AppError::Forbidden(
            "Hanya admin PMB atau keuangan yang dapat memverifikasi pembayaran".to_string(),
        ))
    }
}

fn ekstensi(file_name: &str) -> Result<String, AppError> {
    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    if file_name.contains('.') && EKSTENSI_BUKTI.contains(&ext.as_str()) {
        Ok(ext)
    } else {
        Err(AppError::BadRequest(
            "Bukti bayar harus berupa foto (JPG/PNG/WEBP) atau PDF".to_string(),
        ))
    }
}

/// Prefix object key bukti milik pendaftar (dipakai untuk cegah IDOR saat submit).
pub fn prefix_bukti(pendaftar_id: Uuid) -> String {
    format!("bukti_bayar/{pendaftar_id}/")
}

/// Status pendaftar yang boleh mengunggah bukti untuk jenis tagihan tertentu,
/// beserta status tujuan setelah bukti terkirim.
pub fn aturan_unggah(jenis_tagihan: &str) -> Option<(&'static [&'static str], &'static str)> {
    match jenis_tagihan {
        "FORMULIR" => Some((
            status::BOLEH_UNGGAH_BUKTI_FORMULIR,
            status::MENUNGGU_VERIFIKASI_BAYAR,
        )),
        "DAFTAR_ULANG_UKT" => Some((
            status::BOLEH_UNGGAH_BUKTI_DAFTAR_ULANG,
            status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG,
        )),
        _ => None,
    }
}

/// Status pendaftar setelah bukti ditolak admin.
pub fn status_setelah_ditolak(jenis_tagihan: &str) -> (&'static str, &'static str) {
    match jenis_tagihan {
        "DAFTAR_ULANG_UKT" => (status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG, status::LULUS),
        _ => (
            status::MENUNGGU_VERIFIKASI_BAYAR,
            status::PEMBAYARAN_DITOLAK,
        ),
    }
}

async fn tagihan_milik(
    state: &AppState,
    user_id: Uuid,
    tagihan_id: Uuid,
) -> Result<(crate::modules::pendaftaran::model::Pendaftar, Tagihan), AppError> {
    let pendaftar = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Formulir pendaftaran tidak ditemukan".to_string()))?;
    let tagihan = PembayaranRepository::new(state.db.clone())
        .find_tagihan_by_id(tagihan_id)
        .await?
        .filter(|t| t.pendaftar_id == pendaftar.id)
        .ok_or_else(|| AppError::NotFound("Tagihan tidak ditemukan".to_string()))?;
    Ok((pendaftar, tagihan))
}

async fn isi_qris_url(state: &AppState, items: &mut [RekeningPembayaran]) {
    let st = storage(state);
    for r in items.iter_mut() {
        if let Some(key) = r.qris_image_key.as_deref() {
            r.qris_image_url = Some(st.generate_presigned_get_url(key, 3600).download_url);
        }
    }
}

macro_rules! sel_rekening {
    ($tail:literal) => {
        concat!(
            "SELECT id, jenis, nama_bank, nomor, atas_nama, qris_image_key, instruksi, is_active
             FROM rekening_pembayaran ",
            $tail
        )
    };
}

/// Rekening aktif untuk ditampilkan di halaman pembayaran / surat penerimaan.
pub async fn rekening_aktif(state: &AppState) -> Result<Vec<RekeningPembayaran>, AppError> {
    let mut items = sqlx::query_as::<_, RekeningPembayaran>(sel_rekening!(
        "WHERE is_active = TRUE ORDER BY jenis DESC, created_at ASC"
    ))
    .fetch_all(&state.db)
    .await?;
    isi_qris_url(state, &mut items).await;
    Ok(items)
}

// ---------------------------------------------------------------------------
// Handlers calon
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/api/pembayaran/rekening",
    tag = "Pembayaran",
    responses((status = 200, description = "VA Mandiri & QRIS kampus yang aktif", body = [RekeningPembayaran]))
)]
pub async fn list_rekening_handler(
    _auth: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<RekeningPembayaran>>, AppError> {
    Ok(Json(rekening_aktif(&state).await?))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/bukti/presign",
    tag = "Pembayaran",
    request_body = PresignBuktiRequest,
    responses((status = 200, description = "URL unggah bukti bayar (15 menit)"))
)]
pub async fn presign_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<PresignBuktiRequest>,
) -> Result<Json<PresignedUploadResponse>, AppError> {
    let (pendaftar, tagihan) = tagihan_milik(&state, auth_user.user_id, req.tagihan_id).await?;
    let (boleh, _) = aturan_unggah(&tagihan.jenis_tagihan).ok_or_else(|| {
        AppError::BadRequest("Jenis tagihan ini tidak dibayar melalui unggah bukti".to_string())
    })?;
    alur::pastikan_status(
        &pendaftar.status_pendaftaran,
        boleh,
        "Bukti bayar tidak dapat diunggah pada tahap pendaftaran Anda saat ini.",
    )?;
    let ext = ekstensi(&req.file_name)?;
    let key = format!("{}{}.{}", prefix_bukti(pendaftar.id), Uuid::new_v4(), ext);
    Ok(Json(storage(&state).generate_presigned_put_url(&key, 900)))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/bukti",
    tag = "Pembayaran",
    request_body = SubmitBuktiRequest,
    responses(
        (status = 200, description = "Bukti bayar terkirim, menunggu verifikasi admin"),
        (status = 409, description = "Masih ada bukti yang menunggu verifikasi / tahap tidak sesuai")
    )
)]
pub async fn submit_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SubmitBuktiRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (pendaftar, tagihan) = tagihan_milik(&state, auth_user.user_id, req.tagihan_id).await?;
    let (boleh, ke) = aturan_unggah(&tagihan.jenis_tagihan).ok_or_else(|| {
        AppError::BadRequest("Jenis tagihan ini tidak dibayar melalui unggah bukti".to_string())
    })?;

    if !METODE_MANUAL.contains(&req.metode.as_str()) {
        return Err(AppError::BadRequest(
            "Metode pembayaran harus VA_MANDIRI atau QRIS".to_string(),
        ));
    }
    if tagihan.status == "LUNAS" || tagihan.status == "BATAL" {
        return Err(AppError::Conflict(format!(
            "Tagihan {} sudah berstatus {}",
            tagihan.nomor_tagihan, tagihan.status
        )));
    }
    if !MIME_BUKTI.contains(&req.mime_type.as_str()) {
        return Err(AppError::BadRequest(
            "Format bukti bayar harus JPG, PNG, WEBP, atau PDF".to_string(),
        ));
    }
    if req.file_size_bytes <= 0 || req.file_size_bytes > MAKS_BYTES {
        return Err(AppError::BadRequest(
            "Ukuran bukti bayar maksimal 5 MB".to_string(),
        ));
    }
    // Kunci file wajib berasal dari presign milik calon ini (cegah IDOR / path liar)
    if !req.file_key.starts_with(&prefix_bukti(pendaftar.id)) || req.file_key.contains("..") {
        return Err(AppError::BadRequest("Kunci berkas tidak valid".to_string()));
    }
    if req.tgl_bayar > hari_ini_wib(Utc::now()) {
        return Err(AppError::Validation(vec![
            "tgl_bayar: tanggal bayar tidak boleh di masa depan".to_string(),
        ]));
    }

    let mut tx = state.db.begin().await?;
    alur::transisi_status(
        &mut *tx,
        pendaftar.id,
        boleh,
        ke,
        "Bukti bayar tidak dapat diunggah pada tahap pendaftaran Anda saat ini (mungkin masih menunggu verifikasi).",
    )
    .await?;

    let insert = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO bukti_pembayaran
            (pendaftar_id, tagihan_id, jenis_tagihan, metode, nominal_dibayar, tgl_bayar,
             file_key, file_name, mime_type, file_size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
    )
    .bind(pendaftar.id)
    .bind(tagihan.id)
    .bind(&tagihan.jenis_tagihan)
    .bind(&req.metode)
    .bind(req.nominal_dibayar)
    .bind(req.tgl_bayar)
    .bind(&req.file_key)
    .bind(&req.file_name)
    .bind(&req.mime_type)
    .bind(req.file_size_bytes)
    .fetch_one(&mut *tx)
    .await;

    let id = match insert {
        Ok(id) => id,
        Err(sqlx::Error::Database(e)) if e.is_unique_violation() => {
            return Err(AppError::Conflict(
                "Bukti bayar Anda sedang menunggu verifikasi admin".to_string(),
            ));
        }
        Err(e) => return Err(e.into()),
    };
    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "id": id,
        "status": "PENDING",
        "pesan": "Bukti bayar terkirim. Menunggu verifikasi admin PMB."
    })))
}

macro_rules! sel_bukti {
    ($tail:literal) => {
        concat!("SELECT b.id, b.pendaftar_id, p.nomor_pendaftaran, h.nomor_registrasi,
        u.nama_lengkap, b.jenis_tagihan, b.tagihan_id, t.nomor_tagihan,
        t.nominal_akhir AS nominal_tagihan, b.nominal_dibayar, b.metode, b.tgl_bayar,
        b.file_name, b.mime_type, b.file_size_bytes, b.status, b.catatan, b.created_at, b.reviewed_at
     FROM bukti_pembayaran b
     JOIN pendaftar p ON p.id = b.pendaftar_id
     JOIN users u ON u.id = p.user_id
     LEFT JOIN hasil_kelulusan h ON h.pendaftar_id = b.pendaftar_id
     LEFT JOIN tagihan t ON t.id = b.tagihan_id ", $tail)
    };
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/bukti/my",
    tag = "Pembayaran",
    responses((status = 200, description = "Riwayat bukti bayar milik calon", body = [BuktiPembayaranItem]))
)]
pub async fn my_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<BuktiPembayaranItem>>, AppError> {
    let Some(p) = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(auth_user.user_id)
        .await?
    else {
        return Ok(Json(Vec::new()));
    };
    let items = sqlx::query_as::<_, BuktiPembayaranItem>(sel_bukti!(
        "WHERE b.pendaftar_id = $1 ORDER BY b.created_at DESC"
    ))
    .bind(p.id)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(items))
}

// ---------------------------------------------------------------------------
// Handlers admin: verifikasi bukti
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/api/pembayaran/admin/bukti",
    tag = "Pembayaran",
    params(
        ("status" = Option<String>, Query, description = "PENDING | DISETUJUI | DITOLAK"),
        ("jenis" = Option<String>, Query, description = "FORMULIR | DAFTAR_ULANG_UKT")
    ),
    responses((status = 200, description = "Antrean bukti bayar", body = [BuktiPembayaranItem]))
)]
pub async fn list_bukti_admin_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<ListBuktiQuery>,
) -> Result<Json<Vec<BuktiPembayaranItem>>, AppError> {
    ensure_reviewer(&auth_user)?;
    let status = q.status.unwrap_or_default();
    if !status.is_empty() && !["PENDING", "DISETUJUI", "DITOLAK"].contains(&status.as_str()) {
        return Err(AppError::BadRequest(
            "Filter status tidak valid".to_string(),
        ));
    }
    let jenis = q.jenis.unwrap_or_default();
    if !jenis.is_empty() && !JENIS_DIDUKUNG.contains(&jenis.as_str()) {
        return Err(AppError::BadRequest("Filter jenis tidak valid".to_string()));
    }

    let mut items = sqlx::query_as::<_, BuktiPembayaranItem>(sel_bukti!(
        "WHERE ($1 = '' OR b.status = $1) AND ($2 = '' OR b.jenis_tagihan = $2)
         ORDER BY (b.status = 'PENDING') DESC, b.created_at ASC LIMIT 500"
    ))
    .bind(&status)
    .bind(&jenis)
    .fetch_all(&state.db)
    .await?;

    // URL pratinjau berumur pendek (10 menit)
    let keys: Vec<(Uuid, String)> =
        sqlx::query_as("SELECT id, file_key FROM bukti_pembayaran WHERE id = ANY($1)")
            .bind(items.iter().map(|i| i.id).collect::<Vec<_>>())
            .fetch_all(&state.db)
            .await?;
    let st = storage(&state);
    for it in items.iter_mut() {
        if let Some((_, k)) = keys.iter().find(|(id, _)| *id == it.id) {
            it.download_url = Some(st.generate_presigned_get_url(k, 600).download_url);
        }
    }
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/admin/bukti/{id}/review",
    tag = "Pembayaran",
    params(("id" = Uuid, Path, description = "ID bukti pembayaran")),
    request_body = ReviewBuktiRequest,
    responses(
        (status = 200, description = "Bukti diproses", body = ReviewBuktiResponse),
        (status = 409, description = "Bukti sudah diproses sebelumnya")
    )
)]
pub async fn review_bukti_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ReviewBuktiRequest>,
) -> Result<Json<ReviewBuktiResponse>, AppError> {
    ensure_reviewer(&auth_user)?;
    let res = proses_review_bukti(&state, auth_user.user_id, id, &req.status, req.catatan).await?;
    Ok(Json(res))
}

/// Logika review bukti (dipakai juga oleh rute lama `/api/kelulusan/admin/bukti-bayar/{id}/review`).
pub async fn proses_review_bukti(
    state: &AppState,
    reviewer_id: Uuid,
    bukti_id: Uuid,
    status_review: &str,
    catatan: Option<String>,
) -> Result<ReviewBuktiResponse, AppError> {
    let status_review = status_review.trim().to_uppercase();
    if status_review != "DISETUJUI" && status_review != "DITOLAK" {
        return Err(AppError::BadRequest(
            "Status harus DISETUJUI atau DITOLAK".to_string(),
        ));
    }
    let catatan = catatan
        .map(|c| c.trim().to_string())
        .filter(|c| !c.is_empty());
    if status_review == "DITOLAK" && catatan.is_none() {
        return Err(AppError::Validation(vec![
            "catatan: alasan penolakan wajib diisi".to_string(),
        ]));
    }

    let mut tx = state.db.begin().await?;

    // Klaim atomik: hanya bukti PENDING yang bisa diproses (anti double-approve)
    let row: Option<(Uuid, Option<Uuid>, String, Option<String>)> = sqlx::query_as(
        "UPDATE bukti_pembayaran
         SET status = $2, catatan = $3, reviewed_by = $4, reviewed_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING pendaftar_id, tagihan_id, jenis_tagihan, metode",
    )
    .bind(bukti_id)
    .bind(&status_review)
    .bind(catatan.as_deref())
    .bind(reviewer_id)
    .fetch_optional(&mut *tx)
    .await?;
    let (pendaftar_id, tagihan_id, jenis, metode) = row.ok_or_else(|| {
        AppError::Conflict("Bukti bayar tidak ditemukan atau sudah diproses".to_string())
    })?;

    if status_review == "DITOLAK" {
        let (dari, ke) = status_setelah_ditolak(&jenis);
        // Toleran bila status pendaftar sudah bergeser (mis. data lama sebelum alur v2)
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW()
             WHERE id = $2 AND status_pendaftaran = $3",
        )
        .bind(ke)
        .bind(pendaftar_id)
        .bind(dari)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;

        alur::kirim_notifikasi(
            &state.db,
            pendaftar_id,
            "Bukti Pembayaran PMB Ditolak",
            &format!(
                "Bukti pembayaran Anda ditolak dengan alasan: {}. Silakan unggah ulang bukti pembayaran yang benar melalui portal PMB.",
                catatan.as_deref().unwrap_or("-")
            ),
            "PEMBAYARAN_DITOLAK",
        )
        .await;

        return Ok(ReviewBuktiResponse {
            status: status_review,
            jenis_tagihan: jenis,
            pesan: "Bukti bayar ditolak; calon dapat mengunggah ulang.".to_string(),
        });
    }

    let tagihan_id = tagihan_id.ok_or_else(|| {
        AppError::BadRequest("Bukti ini tidak terhubung ke tagihan mana pun".to_string())
    })?;

    // Catat transaksi manual lalu lunasi tagihan dalam transaksi yang sama
    let nomor_transaksi = format!(
        "MAN-{}",
        Uuid::new_v4().simple().to_string()[..16].to_uppercase()
    );
    sqlx::query(
        "INSERT INTO transaksi_pembayaran
            (tagihan_id, nomor_transaksi, gateway_provider, metode_pembayaran, nominal,
             status, waktu_berlaku_sampai, raw_response)
         SELECT t.id, $2, 'MANUAL', $3, t.nominal_akhir, 'PENDING', NOW(), $4
         FROM tagihan t WHERE t.id = $1",
    )
    .bind(tagihan_id)
    .bind(&nomor_transaksi)
    .bind(metode.as_deref().unwrap_or("VA_MANDIRI"))
    .bind(serde_json::json!({ "bukti_id": bukti_id, "reviewer_id": reviewer_id }))
    .execute(&mut *tx)
    .await?;

    let lunas = settle_dalam_tx(&mut tx, &nomor_transaksi, Utc::now()).await?;
    tx.commit().await?;

    if let Some(tagihan) = lunas.as_ref() {
        PembayaranRepository::new(state.db.clone())
            .notifikasi_lunas(tagihan)
            .await;
    }

    let _ = crate::security::record_audit_log(
        &state.db,
        Some(reviewer_id),
        "SETUJUI_BUKTI_BAYAR",
        "bukti_pembayaran",
        Some(bukti_id),
        None,
        Some(serde_json::json!({ "jenis_tagihan": jenis, "tagihan_id": tagihan_id })),
    )
    .await;

    Ok(ReviewBuktiResponse {
        status: status_review,
        pesan: if jenis == "DAFTAR_ULANG_UKT" {
            "Pembayaran daftar ulang disetujui. Calon dapat melengkapi registrasi ulang."
                .to_string()
        } else {
            "Pembayaran formulir disetujui. Calon dapat mengunggah berkas.".to_string()
        },
        jenis_tagihan: jenis,
    })
}

// ---------------------------------------------------------------------------
// Handlers admin: rekening VA Mandiri / QRIS
// ---------------------------------------------------------------------------

fn validasi_rekening(req: &SimpanRekeningRequest) -> Result<(), AppError> {
    match req.jenis.as_str() {
        "VA_MANDIRI" if req.nomor.as_deref().is_none_or(|n| n.trim().is_empty()) => {
            Err(AppError::Validation(vec![
                "nomor: nomor VA Mandiri wajib diisi".to_string(),
            ]))
        }
        "VA_MANDIRI" => Ok(()),
        "QRIS" if req.qris_image_key.is_none() => Err(AppError::Validation(vec![
            "qris_image_key: unggah gambar QRIS terlebih dahulu".to_string(),
        ])),
        "QRIS" => {
            let key = req.qris_image_key.as_deref().unwrap_or("");
            if key.starts_with("rekening/qris/") && !key.contains("..") {
                Ok(())
            } else {
                Err(AppError::BadRequest(
                    "Kunci gambar QRIS tidak valid".to_string(),
                ))
            }
        }
        _ => Err(AppError::BadRequest(
            "Jenis rekening harus VA_MANDIRI atau QRIS".to_string(),
        )),
    }
}

pub async fn admin_list_rekening_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<Json<Vec<RekeningPembayaran>>, AppError> {
    ensure_reviewer(&auth_user)?;
    let mut items = sqlx::query_as::<_, RekeningPembayaran>(sel_rekening!(
        "ORDER BY is_active DESC, jenis DESC, created_at ASC"
    ))
    .fetch_all(&state.db)
    .await?;
    isi_qris_url(&state, &mut items).await;
    Ok(Json(items))
}

pub async fn admin_create_rekening_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SimpanRekeningRequest>,
) -> Result<Json<RekeningPembayaran>, AppError> {
    ensure_reviewer(&auth_user)?;
    validasi_rekening(&req)?;
    let mut r = sqlx::query_as::<_, RekeningPembayaran>(
        "INSERT INTO rekening_pembayaran (jenis, nama_bank, nomor, atas_nama, qris_image_key, instruksi, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, jenis, nama_bank, nomor, atas_nama, qris_image_key, instruksi, is_active",
    )
    .bind(&req.jenis)
    .bind(&req.nama_bank)
    .bind(req.nomor.as_deref().map(str::trim))
    .bind(&req.atas_nama)
    .bind(&req.qris_image_key)
    .bind(&req.instruksi)
    .bind(req.is_active)
    .fetch_one(&state.db)
    .await?;
    isi_qris_url(&state, std::slice::from_mut(&mut r)).await;
    Ok(Json(r))
}

pub async fn admin_update_rekening_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SimpanRekeningRequest>,
) -> Result<Json<RekeningPembayaran>, AppError> {
    ensure_reviewer(&auth_user)?;
    validasi_rekening(&req)?;
    let mut r = sqlx::query_as::<_, RekeningPembayaran>(
        "UPDATE rekening_pembayaran
         SET jenis = $2, nama_bank = $3, nomor = $4, atas_nama = $5, qris_image_key = $6,
             instruksi = $7, is_active = $8, updated_at = NOW()
         WHERE id = $1
         RETURNING id, jenis, nama_bank, nomor, atas_nama, qris_image_key, instruksi, is_active",
    )
    .bind(id)
    .bind(&req.jenis)
    .bind(&req.nama_bank)
    .bind(req.nomor.as_deref().map(str::trim))
    .bind(&req.atas_nama)
    .bind(&req.qris_image_key)
    .bind(&req.instruksi)
    .bind(req.is_active)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Rekening tidak ditemukan".to_string()))?;
    isi_qris_url(&state, std::slice::from_mut(&mut r)).await;
    Ok(Json(r))
}

pub async fn admin_presign_qris_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<PresignQrisRequest>,
) -> Result<Json<PresignedUploadResponse>, AppError> {
    ensure_reviewer(&auth_user)?;
    let ext = req
        .file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["png", "jpg", "jpeg", "webp"].contains(&ext.as_str()) {
        return Err(AppError::BadRequest(
            "Gambar QRIS harus PNG, JPG, atau WEBP".to_string(),
        ));
    }
    let key = format!("rekening/qris/{}.{}", Uuid::new_v4(), ext);
    Ok(Json(storage(&state).generate_presigned_put_url(&key, 900)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn tanggal_bayar_memakai_hari_wib_bukan_utc() {
        // 18.27 UTC tanggal 7 = 01.27 WIB tanggal 8: calon di WIB boleh mengisi tanggal 8
        let utc = Utc.with_ymd_and_hms(2026, 11, 7, 18, 27, 0).unwrap();
        assert_eq!(
            hari_ini_wib(utc),
            NaiveDate::from_ymd_opt(2026, 11, 8).unwrap()
        );
        // 16.59 UTC = 23.59 WIB: masih hari yang sama
        let utc = Utc.with_ymd_and_hms(2026, 11, 7, 16, 59, 0).unwrap();
        assert_eq!(
            hari_ini_wib(utc),
            NaiveDate::from_ymd_opt(2026, 11, 7).unwrap()
        );
    }

    #[test]
    fn aturan_unggah_per_jenis() {
        let (boleh, ke) = aturan_unggah("FORMULIR").unwrap();
        assert!(boleh.contains(&status::SUBMITTED));
        assert!(boleh.contains(&status::PEMBAYARAN_DITOLAK));
        assert!(!boleh.contains(&status::MENUNGGU_VERIFIKASI_BAYAR));
        assert_eq!(ke, status::MENUNGGU_VERIFIKASI_BAYAR);

        let (boleh, ke) = aturan_unggah("DAFTAR_ULANG_UKT").unwrap();
        assert_eq!(boleh, &[status::LULUS]);
        assert_eq!(ke, status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG);

        assert!(aturan_unggah("LAINNYA").is_none());
    }

    #[test]
    fn ditolak_kembali_ke_tahap_bayar() {
        assert_eq!(
            status_setelah_ditolak("FORMULIR"),
            (
                status::MENUNGGU_VERIFIKASI_BAYAR,
                status::PEMBAYARAN_DITOLAK
            )
        );
        assert_eq!(
            status_setelah_ditolak("DAFTAR_ULANG_UKT"),
            (status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG, status::LULUS)
        );
    }

    #[test]
    fn ekstensi_bukti() {
        assert_eq!(ekstensi("bukti.JPG").unwrap(), "jpg");
        assert!(ekstensi("bukti.exe").is_err());
        assert!(ekstensi("tanpa_ekstensi").is_err());
    }

    #[test]
    fn rekening_va_wajib_nomor() {
        let req = SimpanRekeningRequest {
            jenis: "VA_MANDIRI".into(),
            nama_bank: "Bank Mandiri".into(),
            nomor: None,
            atas_nama: "Universitas Pignatelli Triputra".into(),
            qris_image_key: None,
            instruksi: None,
            is_active: true,
        };
        assert!(validasi_rekening(&req).is_err());
        let req = SimpanRekeningRequest {
            nomor: Some("8900012345678".into()),
            ..req
        };
        assert!(validasi_rekening(&req).is_ok());
    }

    #[test]
    fn rekening_qris_tolak_key_liar() {
        let req = SimpanRekeningRequest {
            jenis: "QRIS".into(),
            nama_bank: "QRIS".into(),
            nomor: None,
            atas_nama: "UPITRA".into(),
            qris_image_key: Some("bukti_bayar/../x.png".into()),
            instruksi: None,
            is_active: true,
        };
        assert!(validasi_rekening(&req).is_err());
    }
}
