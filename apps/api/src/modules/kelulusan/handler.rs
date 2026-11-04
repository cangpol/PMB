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
                ApprovalSidangRequest, CekKelulusanCalonResponse, CekKelulusanPublikQuery,
                CekKelulusanPublikResponse, DaftarUlangInfoResponse, DrafKelulusanResponse,
                EksporSiakadItemDto, GenerateNimResponse, HasilKelulusanResponse,
                MahasiswaDaftarUlangDto, ProsesRankingRequest, UpdateRumusRequest,
                UpdateStatusKandidatRequest, UploadBerkasDaftarUlangRequest,
                VerifikasiBerkasDaftarUlangRequest,
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
        .route("/daftar-ulang", get(get_daftar_ulang_info_handler))
        .route(
            "/daftar-ulang/berkas",
            post(upload_berkas_daftar_ulang_handler),
        )
        // Admin Kelulusan & Seleksi
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
