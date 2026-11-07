use axum::{
    Json, Router,
    body::Body,
    extract::{Path, Query, State},
    http::header,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::Deserialize;
use utoipa::OpenApi;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::AuthUser,
    modules::{
        kelulusan::{
            dto::{
                ApprovalSidangRequest, ArahkanPilihan2Request, ArahkanPilihan2Response,
                CekKelulusanCalonResponse, CekKelulusanPublikQuery, CekKelulusanPublikResponse,
                DaftarUlangInfoResponse, DrafKelulusanResponse, EksporSiakadItemDto,
                GenerateNimResponse, HasilKelulusanResponse, MahasiswaDaftarUlangDto,
                PratinjauRumusNimResponse, ProsesRankingRequest, RumusNimResponse,
                SimpanRumusNimRequest, UpdateRumusRequest, UpdateStatusKandidatRequest,
                UploadBerkasDaftarUlangRequest, VerifikasiBerkasDaftarUlangRequest,
            },
            model::{BerkasDaftarUlang, RumusPenilaianJalur, SidangKelulusan},
            repository::KelulusanRepository,
            service::KelulusanService,
        },
        master::repository::MasterRepository,
        pendaftaran::repository::PendaftaranRepository,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_cek_kelulusan_publik_handler,
        get_cek_kelulusan_calon_handler,
        download_loa_pdf_handler,
        get_rumus_nim_handler,
        arahkan_pilihan_2_handler,
        simpan_rumus_nim_handler,
        pratinjau_rumus_nim_handler,
        get_daftar_ulang_info_handler,
        upload_berkas_daftar_ulang_handler,
        get_rumus_penilaian_handler,
        update_rumus_penilaian_handler,
        proses_ranking_kelulusan_handler,
        get_draf_kelulusan_handler,
        approve_sidang_handler,
        publish_sidang_handler,
        update_status_kandidat_handler,
        verifikasi_berkas_daftar_ulang_handler,
        list_daftar_ulang_admin_handler,
        list_berkas_daftar_ulang_admin_handler,
        generate_nim_handler,
        ekspor_siakad_handler,
        get_my_kelulusan_handler,
        admin_proses_seleksi_handler,
        admin_list_kelulusan_handler
    ),
    components(schemas(
        HasilKelulusanResponse,
        CekKelulusanCalonResponse,
        CekKelulusanPublikResponse,
        RumusNimResponse,
        SimpanRumusNimRequest,
        ArahkanPilihan2Request,
        ArahkanPilihan2Response,
        PratinjauRumusNimResponse,
        DaftarUlangInfoResponse,
        MahasiswaDaftarUlangDto,
        DrafKelulusanResponse,
        GenerateNimResponse,
        EksporSiakadItemDto,
        RumusPenilaianJalur,
        SidangKelulusan,
        BerkasDaftarUlang,
        UpdateRumusRequest,
        ProsesRankingRequest,
        ApprovalSidangRequest,
        UpdateStatusKandidatRequest,
        UploadBerkasDaftarUlangRequest,
        VerifikasiBerkasDaftarUlangRequest,
        ApiErrorResponse
    ))
)]
pub struct KelulusanApiDoc;

pub fn kelulusan_router() -> Router<AppState> {
    Router::new()
        // Cek Kelulusan Publik (Terbuka untuk umum tanpa auth)
        .route("/publik", get(get_cek_kelulusan_publik_handler))
        // Portal Calon Mahasiswa (IDOR-safe: strictly auth_user.user_id)
        .route("/cek", get(get_cek_kelulusan_calon_handler))
        .route("/my-status", get(get_my_kelulusan_handler))
        .route("/loa/pdf", get(download_loa_pdf_handler))
        .route("/verifikasi-qr", get(verifikasi_qr_handler))
        .route("/daftar-ulang", get(get_daftar_ulang_info_handler))
        .route(
            "/daftar-ulang/berkas",
            post(upload_berkas_daftar_ulang_handler),
        )
        .route(
            "/daftar-ulang/berkas/presign",
            post(presign_berkas_daftar_ulang_handler),
        )
        .route(
            "/admin/daftar-ulang/berkas/{berkas_id}/unduh",
            get(unduh_berkas_daftar_ulang_admin_handler),
        )
        // Admin Kelulusan & Seleksi
        .route(
            "/admin/rumus-nim",
            get(get_rumus_nim_handler).put(simpan_rumus_nim_handler),
        )
        .route(
            "/admin/rumus-nim/pratinjau",
            post(pratinjau_rumus_nim_handler),
        )
        .route("/admin/rumus", get(get_rumus_penilaian_handler))
        .route(
            "/admin/rumus/{jalur_id}",
            post(update_rumus_penilaian_handler),
        )
        .route(
            "/admin/proses-ranking",
            post(proses_ranking_kelulusan_handler),
        )
        .route("/admin/draf", get(get_draf_kelulusan_handler))
        .route("/admin/approve/{sidang_id}", post(approve_sidang_handler))
        .route("/admin/publish/{sidang_id}", post(publish_sidang_handler))
        .route("/admin/arahkan-pilihan-2", post(arahkan_pilihan_2_handler))
        .route(
            "/admin/kandidat/status",
            post(update_status_kandidat_handler),
        )
        // Admin Verifikasi Daftar Ulang & Terbitkan NIM
        .route(
            "/admin/daftar-ulang/list",
            get(list_daftar_ulang_admin_handler),
        )
        .route(
            "/admin/daftar-ulang/berkas/{pendaftar_id}",
            get(list_berkas_daftar_ulang_admin_handler),
        )
        .route(
            "/admin/daftar-ulang/verifikasi/{berkas_id}",
            post(verifikasi_berkas_daftar_ulang_handler),
        )
        .route(
            "/admin/generate-nim/{pendaftar_id}",
            post(generate_nim_handler),
        )
        .route("/admin/ekspor-siakad", get(ekspor_siakad_handler))
        // Backwards compatible routes
        .route("/admin/proses-seleksi", post(admin_proses_seleksi_handler))
        .route("/admin/list", get(admin_list_kelulusan_handler))
}

fn create_service(state: &AppState) -> KelulusanService {
    KelulusanService::new(
        KelulusanRepository::new(state.db.clone()),
        PendaftaranRepository::new(state.db.clone()),
        MasterRepository::new(state.db.clone()),
    )
}

// =========================================================================
// 1. HANDLER CALON MAHASISWA & PUBLIK
// =========================================================================

#[utoipa::path(
    get,
    path = "/api/kelulusan/publik",
    tag = "Kelulusan Portal",
    params(
        ("nomor_pendaftaran" = String, Query, description = "Nomor Pendaftaran PMB (misal: PMB-2026-0001)")
    ),
    responses(
        (status = 200, description = "Status kelulusan publik calon mahasiswa", body = CekKelulusanPublikResponse),
        (status = 404, description = "Nomor pendaftaran tidak ditemukan", body = ApiErrorResponse),
        (status = 400, description = "Parameter pencarian tidak valid", body = ApiErrorResponse)
    )
)]
pub async fn get_cek_kelulusan_publik_handler(
    State(state): State<AppState>,
    Query(query): Query<CekKelulusanPublikQuery>,
) -> Result<impl IntoResponse, AppError> {
    query
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let res = service
        .get_cek_kelulusan_publik(&query.nomor_pendaftaran)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/cek",
    tag = "Kelulusan Portal",
    responses(
        (status = 200, description = "Status kelulusan resmi calon mahasiswa", body = CekKelulusanCalonResponse),
        (status = 404, description = "Formulir pendaftaran tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_cek_kelulusan_calon_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = create_service(&state);
    let res = service.get_cek_kelulusan_calon(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/loa/pdf",
    tag = "Kelulusan Portal",
    responses(
        (status = 200, description = "Streaming Letter of Acceptance (LoA) PDF resmi", content_type = "application/pdf"),
        (status = 403, description = "Bukan calon mahasiswa yang berstatus LULUS", body = ApiErrorResponse)
    )
)]
pub async fn download_loa_pdf_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    let service = create_service(&state);
    let pdf_bytes = service.generate_loa_pdf_bytes(auth_user.user_id).await?;

    let filename = "Surat_Keputusan_Kelulusan_PMB_2026.pdf";
    let response = Response::builder()
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(pdf_bytes))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(response)
}

/// QR Code (SVG) tautan verifikasi dokumen milik calon yang sedang login;
/// isinya sama dengan QR pada PDF LoA sehingga tampilan web dan cetak konsisten.
pub async fn verifikasi_qr_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    let pendaftar = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;
    let svg = crate::pdfkit::qr_svg(&format!(
        "https://pmb.pignatelli.ac.id/verifikasi-loa/{}",
        pendaftar.id
    ));
    Response::builder()
        .header(header::CONTENT_TYPE, "image/svg+xml")
        .header(header::CACHE_CONTROL, "private, max-age=3600")
        .body(Body::from(svg))
        .map_err(|e| AppError::Internal(e.to_string()))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/daftar-ulang",
    tag = "Kelulusan Portal",
    responses(
        (status = 200, description = "Informasi daftar ulang, tagihan UKT, dan status berkas", body = DaftarUlangInfoResponse),
        (status = 404, description = "Hasil kelulusan belum ada", body = ApiErrorResponse)
    )
)]
pub async fn get_daftar_ulang_info_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = create_service(&state);
    let res = service.get_daftar_ulang_info(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/daftar-ulang/berkas",
    tag = "Kelulusan Portal",
    request_body = UploadBerkasDaftarUlangRequest,
    responses(
        (status = 200, description = "Berkas daftar ulang berhasil diunggah", body = BerkasDaftarUlang),
        (status = 400, description = "Validasi berkas gagal", body = ApiErrorResponse)
    )
)]
pub async fn upload_berkas_daftar_ulang_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<UploadBerkasDaftarUlangRequest>,
) -> Result<impl IntoResponse, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let res = service
        .upload_berkas_daftar_ulang(auth_user.user_id, payload)
        .await?;
    Ok(Json(res))
}

#[derive(Debug, Deserialize, Validate)]
pub struct PresignBerkasDaftarUlangRequest {
    pub jenis_berkas: String,
    #[validate(length(min = 1, max = 200))]
    pub file_name: String,
}

pub const JENIS_BERKAS_DAFTAR_ULANG: [&str; 4] = [
    "SURAT_PERNYATAAN_MABA",
    "SURAT_BEBAS_NARKOBA",
    "AKTA_KELAHIRAN",
    "IJAZAH_LEGALISIR",
];

/// URL unggah berkas registrasi ulang (key berawalan `daftar_ulang/{pendaftar_id}/`).
pub async fn presign_berkas_daftar_ulang_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<PresignBerkasDaftarUlangRequest>,
) -> Result<impl IntoResponse, AppError> {
    req.validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    if !JENIS_BERKAS_DAFTAR_ULANG.contains(&req.jenis_berkas.as_str()) {
        return Err(AppError::BadRequest(
            "Jenis berkas daftar ulang tidak dikenal".to_string(),
        ));
    }
    let pendaftar =
        crate::modules::pendaftaran::repository::PendaftaranRepository::new(state.db.clone())
            .find_by_user_id(auth_user.user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Formulir pendaftaran tidak ditemukan".to_string())
            })?;
    crate::modules::pendaftaran::alur::pastikan_status(
        &pendaftar.status_pendaftaran,
        &[crate::modules::pendaftaran::alur::status::DAFTAR_ULANG_LUNAS],
        "Berkas registrasi ulang dapat diunggah setelah pembayaran daftar ulang disetujui admin PMB.",
    )?;
    let ext = req
        .file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();
    if !["pdf", "jpg", "jpeg", "png"].contains(&ext.as_str()) {
        return Err(AppError::BadRequest(
            "Berkas harus berupa PDF, JPG, atau PNG".to_string(),
        ));
    }
    let key = format!(
        "daftar_ulang/{}/{}_{}.{}",
        pendaftar.id,
        req.jenis_berkas,
        Uuid::new_v4(),
        ext
    );
    Ok(Json(
        crate::modules::pembayaran::bukti::storage(&state).generate_presigned_put_url(&key, 900),
    ))
}

/// URL unduh berkas registrasi ulang untuk verifikasi admin (10 menit).
pub async fn unduh_berkas_daftar_ulang_admin_handler(
    auth_user: AuthUser,
    Path(berkas_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let key: String = sqlx::query_scalar("SELECT file_key FROM berkas_daftar_ulang WHERE id = $1")
        .bind(berkas_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Berkas tidak ditemukan".to_string()))?;
    Ok(Json(
        crate::modules::pembayaran::bukti::storage(&state).generate_presigned_get_url(&key, 600),
    ))
}

// =========================================================================
// 2. HANDLER ADMIN KELULUSAN
// =========================================================================

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/rumus",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Daftar konfigurasi rumus penilaian per jalur", body = Vec<RumusPenilaianJalur>),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn get_rumus_penilaian_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let list = service.get_rumus_penilaian().await?;
    Ok(Json(list))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/rumus/{jalur_id}",
    tag = "Kelulusan Admin",
    request_body = UpdateRumusRequest,
    responses(
        (status = 200, description = "Rumus penilaian berhasil diperbarui", body = RumusPenilaianJalur),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn update_rumus_penilaian_handler(
    auth_user: AuthUser,
    Path(jalur_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<UpdateRumusRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let res = service.update_rumus_penilaian(jalur_id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/proses-ranking",
    tag = "Kelulusan Admin",
    request_body = ProsesRankingRequest,
    responses(
        (status = 200, description = "Draf ranking kelulusan berhasil diproses", body = DrafKelulusanResponse),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn proses_ranking_kelulusan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<ProsesRankingRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let actor_name = "Admin PMB";
    let res = service
        .proses_ranking_kelulusan(payload, auth_user.user_id, actor_name)
        .await?;
    Ok(Json(res))
}

#[derive(Debug, Deserialize)]
pub struct DrafQuery {
    pub sidang_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/draf",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Draf hasil sidang kelulusan", body = DrafKelulusanResponse),
        (status = 404, description = "Belum ada sidang", body = ApiErrorResponse)
    )
)]
pub async fn get_draf_kelulusan_handler(
    auth_user: AuthUser,
    Query(query): Query<DrafQuery>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let res = service.get_draf_kelulusan(query.sidang_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/approve/{sidang_id}",
    tag = "Kelulusan Admin",
    request_body = ApprovalSidangRequest,
    responses(
        (status = 200, description = "Sidang kelulusan berhasil disetujui", body = SidangKelulusan),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn approve_sidang_handler(
    auth_user: AuthUser,
    Path(sidang_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<ApprovalSidangRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let actor_name = "Admin PMB";
    let res = service
        .approve_sidang(sidang_id, payload, auth_user.user_id, actor_name)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/publish/{sidang_id}",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Hasil kelulusan resmi dipublikasikan", body = SidangKelulusan),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn publish_sidang_handler(
    auth_user: AuthUser,
    Path(sidang_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let actor_name = "Admin PMB";
    let res = service
        .publish_sidang(sidang_id, auth_user.user_id, actor_name)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/kandidat/status",
    tag = "Kelulusan Admin",
    request_body = UpdateStatusKandidatRequest,
    responses(
        (status = 200, description = "Status kandidat berhasil diubah", body = HasilKelulusanResponse),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn update_status_kandidat_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(payload): Json<UpdateStatusKandidatRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let actor_name = "Admin PMB";
    let res = service
        .update_status_kandidat(payload, auth_user.user_id, actor_name)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/daftar-ulang/verifikasi/{berkas_id}",
    tag = "Kelulusan Admin",
    request_body = VerifikasiBerkasDaftarUlangRequest,
    responses(
        (status = 200, description = "Berkas daftar ulang berhasil diverifikasi", body = BerkasDaftarUlang),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn verifikasi_berkas_daftar_ulang_handler(
    auth_user: AuthUser,
    Path(berkas_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<VerifikasiBerkasDaftarUlangRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = create_service(&state);
    let res = service
        .verifikasi_berkas_daftar_ulang(berkas_id, payload, auth_user.user_id)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/daftar-ulang/list",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Daftar calon mahasiswa yang lulus dan status daftar ulangnya", body = Vec<MahasiswaDaftarUlangDto>),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn list_daftar_ulang_admin_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let list = service.list_daftar_ulang_admin().await?;
    Ok(Json(list))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/daftar-ulang/berkas/{pendaftar_id}",
    tag = "Kelulusan Admin",
    params(
        ("pendaftar_id" = Uuid, Path, description = "ID Pendaftar")
    ),
    responses(
        (status = 200, description = "Daftar berkas daftar ulang pendaftar", body = Vec<BerkasDaftarUlang>),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn list_berkas_daftar_ulang_admin_handler(
    auth_user: AuthUser,
    Path(pendaftar_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let list = service.list_berkas_daftar_ulang_admin(pendaftar_id).await?;
    Ok(Json(list))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/generate-nim/{pendaftar_id}",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "NIM resmi berhasil diterbitkan secara atomic", body = GenerateNimResponse),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn generate_nim_handler(
    auth_user: AuthUser,
    Path(pendaftar_id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let res = service.generate_nim_resmi_pendaftar(pendaftar_id).await?;
    Ok(Json(res))
}

#[derive(Debug, Deserialize)]
pub struct EksporQuery {
    pub sidang_id: Option<Uuid>,
    pub format: Option<String>,
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/ekspor-siakad",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Daftar mahasiswa baru untuk SIAKAD (JSON atau CSV)", body = Vec<EksporSiakadItemDto>),
        (status = 403, description = "Akses khusus admin", body = ApiErrorResponse)
    )
)]
pub async fn ekspor_siakad_handler(
    auth_user: AuthUser,
    Query(query): Query<EksporQuery>,
    State(state): State<AppState>,
) -> Result<Response, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let items = service.ekspor_data_siakad(query.sidang_id).await?;

    if query.format.as_deref() == Some("csv") {
        let csv = KelulusanService::to_csv_siakad(&items);
        let res = Response::builder()
            .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
            .header(
                header::CONTENT_DISPOSITION,
                "attachment; filename=\"Ekspor_Mahasiswa_Baru_SIAKAD_2026.csv\"",
            )
            .body(Body::from(csv))
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(res)
    } else {
        let json_body =
            serde_json::to_string(&items).map_err(|e| AppError::Internal(e.to_string()))?;
        let res = Response::builder()
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(json_body))
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(res)
    }
}

// =========================================================================
// 3. BACKWARDS COMPATIBLE HANDLERS
// =========================================================================

#[utoipa::path(
    get,
    path = "/api/kelulusan/my-status",
    tag = "Kelulusan",
    responses(
        (status = 200, description = "Status kelulusan calon mahasiswa", body = HasilKelulusanResponse),
        (status = 404, description = "Hasil belum ada", body = ApiErrorResponse)
    )
)]
pub async fn get_my_kelulusan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = create_service(&state);
    let res = service.get_my_kelulusan(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/proses-seleksi",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Proses seleksi massal")
    )
)]
pub async fn admin_proses_seleksi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let total = service.proses_seleksi_massal().await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": format!("Seleksi kelulusan berhasil diproses untuk {} pendaftar", total),
        "total_diproses": total
    })))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/list",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Daftar seluruh kelulusan", body = Vec<HasilKelulusanResponse>)
    )
)]
pub async fn admin_list_kelulusan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }
    let service = create_service(&state);
    let res = service.list_all().await?;
    Ok(Json(res))
}

fn wajib_admin(u: &AuthUser) -> Result<(), AppError> {
    if !u.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya Admin PMB atau Super Admin yang dapat mengatur rumus NIM".to_string(),
        ));
    }
    Ok(())
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/admin/rumus-nim",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Rumus penomoran NIM yang berlaku", body = RumusNimResponse),
        (status = 403, description = "Bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn get_rumus_nim_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    wajib_admin(&auth_user)?;
    Ok(Json(create_service(&state).get_rumus_nim().await?))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/rumus-nim/pratinjau",
    tag = "Kelulusan Admin",
    request_body = SimpanRumusNimRequest,
    responses(
        (status = 200, description = "Validasi rumus dan contoh NIM per prodi (tidak disimpan)", body = PratinjauRumusNimResponse),
        (status = 403, description = "Bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn pratinjau_rumus_nim_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<SimpanRumusNimRequest>,
) -> Result<impl IntoResponse, AppError> {
    wajib_admin(&auth_user)?;
    Ok(Json(
        create_service(&state)
            .pratinjau_rumus_nim(&req.template, &req.lingkup_urut)
            .await?,
    ))
}

#[utoipa::path(
    put,
    path = "/api/kelulusan/admin/rumus-nim",
    tag = "Kelulusan Admin",
    request_body = SimpanRumusNimRequest,
    responses(
        (status = 200, description = "Rumus NIM disimpan; berlaku untuk NIM yang terbit berikutnya", body = RumusNimResponse),
        (status = 400, description = "Rumus tidak valid", body = ApiErrorResponse),
        (status = 403, description = "Bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn simpan_rumus_nim_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    crate::extractors::ValidatedJson(req): crate::extractors::ValidatedJson<SimpanRumusNimRequest>,
) -> Result<impl IntoResponse, AppError> {
    wajib_admin(&auth_user)?;
    let service = create_service(&state);
    let sebelum = service.get_rumus_nim().await?;
    let hasil = service.simpan_rumus_nim(req, auth_user.user_id).await?;
    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
        "RUMUS_NIM_DIUBAH",
        "pengaturan_nim",
        None,
        Some(serde_json::json!({ "template": sebelum.template, "lingkup": sebelum.lingkup_urut })),
        Some(serde_json::json!({ "template": hasil.template, "lingkup": hasil.lingkup_urut })),
    )
    .await;
    Ok(Json(hasil))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/arahkan-pilihan-2",
    tag = "Kelulusan Admin",
    request_body = ArahkanPilihan2Request,
    responses(
        (status = 200, description = "Calon diarahkan ke program studi pilihan kedua", body = ArahkanPilihan2Response),
        (status = 400, description = "Calon tidak punya pilihan kedua", body = ApiErrorResponse),
        (status = 409, description = "Status calon tidak memungkinkan pengalihan", body = ApiErrorResponse)
    )
)]
pub async fn arahkan_pilihan_2_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    crate::extractors::ValidatedJson(req): crate::extractors::ValidatedJson<ArahkanPilihan2Request>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya Admin PMB atau Super Admin yang dapat mengarahkan calon ke pilihan kedua"
                .to_string(),
        ));
    }
    let res = create_service(&state)
        .arahkan_ke_pilihan_2(req, auth_user.user_id, &auth_user.nama_lengkap)
        .await?;
    Ok(Json(res))
}
