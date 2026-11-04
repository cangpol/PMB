//! Bukti bayar daftar ulang: calon mengunggah foto bukti transfer, admin/keuangan
//! menyetujui, lalu tagihan lunas dan NIM resmi diterbitkan otomatis.

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
};
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    extractors::{AuthUser, ValidatedJson},
    modules::{
        kelulusan::{repository::KelulusanRepository, service::KelulusanService},
        master::repository::MasterRepository,
        pendaftaran::repository::PendaftaranRepository,
    },
    security::storage::{PresignedUploadResponse, StorageService},
    state::AppState,
};

const MIME_BUKTI: [&str; 4] = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAKS_BYTES: i64 = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Nomor registrasi daftar ulang
// ---------------------------------------------------------------------------

/// Mengembalikan nomor registrasi calon; dibuat sekali (idempoten) dengan format
/// `REG-<tahun>-<6 karakter>` tanpa karakter ambigu (0/O, 1/I).
pub async fn ensure_nomor_registrasi(
    pool: &PgPool,
    pendaftar_id: Uuid,
) -> Result<String, AppError> {
    if let Some((Some(nr),)) = sqlx::query_as::<_, (Option<String>,)>(
        "SELECT nomor_registrasi FROM hasil_kelulusan WHERE pendaftar_id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await?
    {
        return Ok(nr);
    }

    const ALFABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    use chrono::Datelike;
    let tahun = Utc::now().year();
    for _ in 0..10 {
        let kode: String = {
            let mut rng = rand::thread_rng();
            (0..6)
                .map(|_| ALFABET[rng.gen_range(0..ALFABET.len())] as char)
                .collect()
        };
        let kandidat = format!("REG-{}-{}", tahun, kode);
        // WHERE nomor_registrasi IS NULL menjaga agar tidak menimpa pada akses paralel
        let res = sqlx::query(
            "UPDATE hasil_kelulusan SET nomor_registrasi = $1, updated_at = NOW()
             WHERE pendaftar_id = $2 AND nomor_registrasi IS NULL",
        )
        .bind(&kandidat)
        .bind(pendaftar_id)
        .execute(pool)
        .await;
        match res {
            Ok(r) if r.rows_affected() == 1 => return Ok(kandidat),
            Ok(_) => {
                // Sudah diisi proses lain
                let (nr,): (Option<String>,) = sqlx::query_as(
                    "SELECT nomor_registrasi FROM hasil_kelulusan WHERE pendaftar_id = $1",
                )
                .bind(pendaftar_id)
                .fetch_one(pool)
                .await?;
                if let Some(nr) = nr {
                    return Ok(nr);
                }
            }
            Err(_) => continue, // bentrok unik: coba kode lain
        }
    }
    Err(AppError::Internal(
        "Gagal membuat nomor registrasi, coba lagi".to_string(),
    ))
}

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, ToSchema, FromRow)]
pub struct BuktiBayarItem {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nomor_registrasi: Option<String>,
    pub nama_lengkap: String,
    pub nominal: Option<i64>,
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
pub struct SubmitBuktiBayarRequest {
    #[validate(length(min = 8, max = 30))]
    pub nomor_registrasi: String,
    #[validate(length(min = 1, max = 255))]
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    #[validate(length(min = 1, max = 500))]
    pub file_key: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ReviewBuktiBayarRequest {
    /// `DISETUJUI` atau `DITOLAK`
    pub status: String,
    #[validate(length(max = 1000))]
    pub catatan: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewBuktiBayarResponse {
    pub status: String,
    pub nim_resmi: Option<String>,
    pub pesan: String,
}

#[derive(Debug, Deserialize)]
pub struct ListBuktiQuery {
    pub status: Option<String>,
}

fn storage(state: &AppState) -> StorageService {
    StorageService::new(
        state.config.s3_endpoint.clone(),
        state.config.s3_access_key.clone(),
        state.config.s3_secret_key.clone(),
        state.config.s3_bucket.clone(),
    )
}

async fn pendaftar_lulus(state: &AppState, user_id: Uuid) -> Result<Uuid, AppError> {
    let p = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Formulir pendaftaran tidak ditemukan".to_string()))?;
    let (status,): (String,) =
        sqlx::query_as("SELECT status_kelulusan FROM hasil_kelulusan WHERE pendaftar_id = $1")
            .bind(p.id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Hasil kelulusan belum tersedia".to_string()))?;
    if !status.starts_with("LULUS") {
        return Err(AppError::Forbidden(
            "Hanya calon yang dinyatakan LULUS yang dapat daftar ulang".to_string(),
        ));
    }
    Ok(p.id)
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn bukti_bayar_router() -> Router<AppState> {
    Router::new()
        .route(
            "/daftar-ulang/bukti-bayar/presign",
            post(presign_bukti_handler),
        )
        .route(
            "/daftar-ulang/bukti-bayar",
            get(my_bukti_handler).post(submit_bukti_handler),
        )
        .route("/admin/bukti-bayar", get(list_bukti_admin_handler))
        .route("/admin/bukti-bayar/{id}/review", post(review_bukti_handler))
}

// ---------------------------------------------------------------------------
// Handlers calon
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, Validate)]
pub struct PresignBuktiRequest {
    #[validate(length(min = 1, max = 200))]
    pub file_name: String,
}

pub async fn presign_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<PresignBuktiRequest>,
) -> Result<Json<PresignedUploadResponse>, AppError> {
    let pendaftar_id = pendaftar_lulus(&state, auth_user.user_id).await?;
    let ext = req
        .file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["jpg", "jpeg", "png", "webp", "pdf"].contains(&ext.as_str()) {
        return Err(AppError::BadRequest(
            "Bukti bayar harus berupa foto (JPG/PNG/WEBP) atau PDF".to_string(),
        ));
    }
    let key = format!("daftar_ulang/bukti/{}/{}.{}", pendaftar_id, Uuid::new_v4(), ext);
    Ok(Json(storage(&state).generate_presigned_put_url(&key, 900)))
}

pub async fn submit_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SubmitBuktiBayarRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_id = pendaftar_lulus(&state, auth_user.user_id).await?;

    let nomor = ensure_nomor_registrasi(&state.db, pendaftar_id).await?;
    if !nomor.eq_ignore_ascii_case(req.nomor_registrasi.trim()) {
        return Err(AppError::BadRequest(
            "Nomor registrasi tidak sesuai dengan akun Anda".to_string(),
        ));
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
    let prefix = format!("daftar_ulang/bukti/{}/", pendaftar_id);
    if !req.file_key.starts_with(&prefix) || req.file_key.contains("..") {
        return Err(AppError::BadRequest("Kunci berkas tidak valid".to_string()));
    }

    let (status_du,): (String,) =
        sqlx::query_as("SELECT status_daftar_ulang FROM hasil_kelulusan WHERE pendaftar_id = $1")
            .bind(pendaftar_id)
            .fetch_one(&state.db)
            .await?;
    if status_du == "TERDAFTAR_SEBAGAI_MAHASISWA" || status_du == "LUNAS" {
        return Err(AppError::BadRequest(
            "Pembayaran daftar ulang Anda sudah diverifikasi".to_string(),
        ));
    }
    let pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM bukti_bayar_daftar_ulang WHERE pendaftar_id = $1 AND status = 'PENDING'",
    )
    .bind(pendaftar_id)
    .fetch_one(&state.db)
    .await?;
    if pending > 0 {
        return Err(AppError::Conflict(
            "Bukti bayar Anda sedang menunggu verifikasi admin".to_string(),
        ));
    }

    let tagihan_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM tagihan WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT'
         ORDER BY tgl_terbit DESC LIMIT 1",
    )
    .bind(pendaftar_id)
    .fetch_optional(&state.db)
    .await?;

    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO bukti_bayar_daftar_ulang
            (pendaftar_id, tagihan_id, file_key, file_name, mime_type, file_size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    )
    .bind(pendaftar_id)
    .bind(tagihan_id)
    .bind(&req.file_key)
    .bind(&req.file_name)
    .bind(&req.mime_type)
    .bind(req.file_size_bytes)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "id": id,
        "status": "PENDING",
        "pesan": "Bukti bayar terkirim. Menunggu verifikasi admin."
    })))
}

macro_rules! sel_item {
    ($tail:literal) => {
        concat!("SELECT b.id, b.pendaftar_id, p.nomor_pendaftaran, h.nomor_registrasi,
        u.nama_lengkap, t.nominal_akhir AS nominal, b.file_name, b.mime_type, b.file_size_bytes,
        b.status, b.catatan, b.created_at, b.reviewed_at
     FROM bukti_bayar_daftar_ulang b
     JOIN pendaftar p ON p.id = b.pendaftar_id
     JOIN users u ON u.id = p.user_id
     LEFT JOIN hasil_kelulusan h ON h.pendaftar_id = b.pendaftar_id
     LEFT JOIN tagihan t ON t.id = b.tagihan_id ", $tail)
    };
}

pub async fn my_bukti_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_id = pendaftar_lulus(&state, auth_user.user_id).await?;
    let items = sqlx::query_as::<_, BuktiBayarItem>(sel_item!("WHERE b.pendaftar_id = $1 ORDER BY b.created_at DESC"))
    .bind(pendaftar_id)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(items))
}

// ---------------------------------------------------------------------------
// Handlers admin
// ---------------------------------------------------------------------------

fn ensure_reviewer(a: &AuthUser) -> Result<(), AppError> {
    if a.is_admin() || a.is_keuangan() {
        Ok(())
    } else {
        Err(AppError::Forbidden("Akses ditolak".to_string()))
    }
}

pub async fn list_bukti_admin_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<ListBuktiQuery>,
) -> Result<impl IntoResponse, AppError> {
    ensure_reviewer(&auth_user)?;
    let status = q.status.unwrap_or_default();
    if !status.is_empty() && !["PENDING", "DISETUJUI", "DITOLAK"].contains(&status.as_str()) {
        return Err(AppError::BadRequest("Filter status tidak valid".to_string()));
    }
    let mut items = sqlx::query_as::<_, BuktiBayarItem>(sel_item!("WHERE ($1 = '' OR b.status = $1) ORDER BY b.created_at DESC LIMIT 500"))
    .bind(&status)
    .fetch_all(&state.db)
    .await?;

    // URL pratinjau berumur pendek
    let keys: Vec<(Uuid, String)> = sqlx::query_as(
        "SELECT id, file_key FROM bukti_bayar_daftar_ulang WHERE id = ANY($1)",
    )
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

pub async fn review_bukti_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ReviewBuktiBayarRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_reviewer(&auth_user)?;
    if req.status != "DISETUJUI" && req.status != "DITOLAK" {
        return Err(AppError::BadRequest(
            "Status harus DISETUJUI atau DITOLAK".to_string(),
        ));
    }
    if req.status == "DITOLAK" && req.catatan.as_deref().unwrap_or("").trim().is_empty() {
        return Err(AppError::BadRequest(
            "Catatan alasan penolakan wajib diisi".to_string(),
        ));
    }

    // Klaim atomik: hanya bukti berstatus PENDING yang bisa diproses (anti double-approve)
    let row: Option<(Uuid, Option<Uuid>)> = sqlx::query_as(
        "UPDATE bukti_bayar_daftar_ulang
         SET status = $2, catatan = $3, reviewed_by = $4, reviewed_at = NOW()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING pendaftar_id, tagihan_id",
    )
    .bind(id)
    .bind(&req.status)
    .bind(req.catatan.as_deref())
    .bind(auth_user.user_id)
    .fetch_optional(&state.db)
    .await?;
    let (pendaftar_id, tagihan_id) = row.ok_or_else(|| {
        AppError::Conflict("Bukti bayar tidak ditemukan atau sudah diproses".to_string())
    })?;

    if req.status == "DITOLAK" {
        return Ok(Json(ReviewBuktiBayarResponse {
            status: req.status,
            nim_resmi: None,
            pesan: "Bukti bayar ditolak; calon dapat mengunggah ulang.".to_string(),
        }));
    }

    if let Some(tid) = tagihan_id {
        sqlx::query(
            "UPDATE tagihan SET status = 'LUNAS', lunas_at = NOW(), updated_at = NOW() WHERE id = $1",
        )
        .bind(tid)
        .execute(&state.db)
        .await?;
    }
    KelulusanRepository::new(state.db.clone())
        .update_status_daftar_ulang(pendaftar_id, "LUNAS")
        .await?;

    // NIM otomatis setelah pembayaran disetujui
    let service = KelulusanService::new(
        KelulusanRepository::new(state.db.clone()),
        PendaftaranRepository::new(state.db.clone()),
        MasterRepository::new(state.db.clone()),
    );
    let nim = service.generate_nim_resmi_pendaftar(pendaftar_id).await?;

    Ok(Json(ReviewBuktiBayarResponse {
        status: req.status,
        nim_resmi: Some(nim.nim_resmi),
        pesan: "Pembayaran disetujui dan NIM resmi telah diterbitkan.".to_string(),
    }))
}
