use axum::{
    Json, Router,
    body::Body,
    extract::{Path, Query, State},
    http::header,
    response::Response,
    routing::{get, post, put},
};
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    modules::rpl::{
        dto::{
            AssignAsesorRequest, CreateMataKuliahRequest, LaporanRplResponse, RplItemRekapDto,
            RplPermohonanDetailResponse, SubmitPenilaianRplRequest, SubmitRplPermohonanRequest,
            UpdateMataKuliahRequest,
        },
        model::MataKuliah,
        repository::RplRepository,
        service::RplService,
    },
    state::AppState,
};

fn create_service(state: &AppState) -> RplService {
    let repo = RplRepository::new(state.db.clone());
    RplService::new(repo)
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListPermohonanQuery {
    pub prodi_id: Option<Uuid>,
    pub status: Option<String>,
}

// =============================================================================
// ROUTER RPL
// =============================================================================

pub fn rpl_router() -> Router<AppState> {
    Router::new()
        // Calon Mahasiswa Endpoints
        .route(
            "/mata-kuliah/{prodi_id}",
            get(get_mata_kuliah_by_prodi_handler),
        )
        .route("/my-permohonan", get(get_my_permohonan_handler))
        .route("/submit", post(submit_permohonan_handler))
        // Admin & Asesor Endpoints
        .route("/admin/permohonan", get(list_permohonan_handler))
        .route("/admin/permohonan/{id}", get(get_permohonan_detail_handler))
        .route("/admin/assign-asesor/{id}", post(assign_asesor_handler))
        .route("/asesor/penilaian/{id}", post(submit_penilaian_handler))
        .route("/admin/laporan/{id}", get(get_laporan_rpl_handler))
        .route(
            "/admin/laporan/{id}/export",
            get(export_laporan_csv_handler),
        )
        // Master Mata Kuliah Kurikulum
        .route(
            "/admin/mata-kuliah",
            get(list_all_mata_kuliah_handler).post(create_mata_kuliah_handler),
        )
        .route("/admin/mata-kuliah/{id}", put(update_mata_kuliah_handler))
}

// =============================================================================
// HANDLERS
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/rpl/mata-kuliah/{prodi_id}",
    tag = "RPL",
    params(
        ("prodi_id" = Uuid, Path, description = "ID Program Studi")
    ),
    responses(
        (status = 200, description = "Daftar mata kuliah kurikulum program studi", body = Vec<MataKuliah>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_mata_kuliah_by_prodi_handler(
    State(state): State<AppState>,
    Path(prodi_id): Path<Uuid>,
) -> Result<Json<Vec<MataKuliah>>, AppError> {
    let service = create_service(&state);
    let list = service.get_mata_kuliah_by_prodi(prodi_id).await?;
    Ok(Json(list))
}

#[utoipa::path(
    get,
    path = "/api/rpl/my-permohonan",
    tag = "RPL",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Detail permohonan RPL milik calon mahasiswa login", body = RplPermohonanDetailResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Pendaftar tidak ditemukan"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_my_permohonan_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<RplPermohonanDetailResponse>, AppError> {
    let service = create_service(&state);
    let res = service.get_my_permohonan(&auth_user).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/rpl/submit",
    tag = "RPL",
    security(("bearer_auth" = [])),
    request_body = SubmitRplPermohonanRequest,
    responses(
        (status = 200, description = "Permohonan RPL berhasil disimpan atau diajukan", body = RplPermohonanDetailResponse),
        (status = 400, description = "Validasi gagal"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn submit_permohonan_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<SubmitRplPermohonanRequest>,
) -> Result<Json<RplPermohonanDetailResponse>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let service = create_service(&state);
    let res = service.submit_permohonan(&auth_user, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/rpl/admin/permohonan",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(ListPermohonanQuery),
    responses(
        (status = 200, description = "Daftar permohonan RPL (terfilter untuk asesor)", body = Vec<RplItemRekapDto>),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_permohonan_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<ListPermohonanQuery>,
) -> Result<Json<Vec<RplItemRekapDto>>, AppError> {
    let service = create_service(&state);
    let list = service
        .list_permohonan(&auth_user, query.prodi_id, query.status.as_deref())
        .await?;
    Ok(Json(list))
}

#[utoipa::path(
    get,
    path = "/api/rpl/admin/permohonan/{id}",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Permohonan RPL")
    ),
    responses(
        (status = 200, description = "Detail lengkap permohonan RPL", body = RplPermohonanDetailResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden (asesor tidak berwenang)"),
        (status = 404, description = "Not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_permohonan_detail_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<RplPermohonanDetailResponse>, AppError> {
    let service = create_service(&state);
    let detail = service.get_permohonan_detail(&auth_user, id).await?;
    Ok(Json(detail))
}

#[utoipa::path(
    post,
    path = "/api/rpl/admin/assign-asesor/{id}",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Permohonan RPL")
    ),
    request_body = AssignAsesorRequest,
    responses(
        (status = 200, description = "Asesor berhasil ditugaskan", body = RplPermohonanDetailResponse),
        (status = 400, description = "Asesor tidak valid"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden (bukan admin)"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn assign_asesor_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<AssignAsesorRequest>,
) -> Result<Json<RplPermohonanDetailResponse>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let service = create_service(&state);
    let res = service.assign_asesor(&auth_user, id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/rpl/asesor/penilaian/{id}",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Permohonan RPL")
    ),
    request_body = SubmitPenilaianRplRequest,
    responses(
        (status = 200, description = "Penilaian berhasil disimpan / difinalisasi", body = RplPermohonanDetailResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden (bukan asesor yang ditugaskan)"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn submit_penilaian_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<SubmitPenilaianRplRequest>,
) -> Result<Json<RplPermohonanDetailResponse>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let service = create_service(&state);
    let res = service.submit_penilaian(&auth_user, id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/rpl/admin/laporan/{id}",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Permohonan RPL")
    ),
    responses(
        (status = 200, description = "Data laporan Berita Acara Rekognisi RPL", body = LaporanRplResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Not found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_laporan_rpl_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<LaporanRplResponse>, AppError> {
    let service = create_service(&state);
    let lap = service.get_laporan_rpl(&auth_user, id).await?;
    Ok(Json(lap))
}

#[utoipa::path(
    get,
    path = "/api/rpl/admin/laporan/{id}/export",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Permohonan RPL")
    ),
    responses(
        (status = 200, description = "File CSV Berita Acara Rekognisi RPL"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn export_laporan_csv_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let service = create_service(&state);
    let csv = service.export_laporan_csv(&auth_user, id).await?;
    let filename = format!("Berita_Acara_RPL_{}.csv", id);

    let res = Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(csv))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(res)
}

#[utoipa::path(
    get,
    path = "/api/rpl/admin/mata-kuliah",
    tag = "RPL",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Daftar semua mata kuliah kurikulum", body = Vec<MataKuliah>),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_all_mata_kuliah_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<MataKuliah>>, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat melihat master kurikulum mata kuliah RPL".to_string(),
        ));
    }
    let service = create_service(&state);
    let list = service.list_all_mata_kuliah().await?;
    Ok(Json(list))
}

#[utoipa::path(
    post,
    path = "/api/rpl/admin/mata-kuliah",
    tag = "RPL",
    security(("bearer_auth" = [])),
    request_body = CreateMataKuliahRequest,
    responses(
        (status = 200, description = "Mata kuliah berhasil ditambahkan", body = MataKuliah),
        (status = 400, description = "Validasi gagal"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_mata_kuliah_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateMataKuliahRequest>,
) -> Result<Json<MataKuliah>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let service = create_service(&state);
    let mk = service.create_mata_kuliah(&auth_user, payload).await?;
    Ok(Json(mk))
}

#[utoipa::path(
    put,
    path = "/api/rpl/admin/mata-kuliah/{id}",
    tag = "RPL",
    security(("bearer_auth" = [])),
    params(
        ("id" = Uuid, Path, description = "ID Mata Kuliah")
    ),
    request_body = UpdateMataKuliahRequest,
    responses(
        (status = 200, description = "Mata kuliah berhasil diperbarui", body = MataKuliah),
        (status = 400, description = "Validasi gagal"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_mata_kuliah_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMataKuliahRequest>,
) -> Result<Json<MataKuliah>, AppError> {
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let service = create_service(&state);
    let mk = service.update_mata_kuliah(&auth_user, id, payload).await?;
    Ok(Json(mk))
}
