use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::get,
};
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    modules::master::{
        dto::{FakultasWithProdiResponse, GelombangResponse, JalurResponse, ProdiResponse},
        repository::MasterRepository,
        service::MasterService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        list_prodi_handler,
        get_prodi_handler,
        get_prodi_by_slug_handler,
        list_fakultas_prodi_handler,
        list_jalur_handler,
        list_gelombang_handler
    ),
    components(schemas(
        ProdiResponse,
        FakultasWithProdiResponse,
        JalurResponse,
        GelombangResponse,
        ApiErrorResponse
    ))
)]
pub struct MasterApiDoc;

pub fn master_router() -> Router<AppState> {
    Router::new()
        .route("/prodi", get(list_prodi_handler))
        .route("/prodi/{id}", get(get_prodi_handler))
        .route("/prodi/slug/{slug}", get(get_prodi_by_slug_handler))
        .route("/fakultas", get(list_fakultas_prodi_handler))
        .route("/jalur", get(list_jalur_handler))
        .route("/gelombang", get(list_gelombang_handler))
}

#[utoipa::path(
    get,
    path = "/api/master/prodi",
    tag = "Master",
    responses(
        (status = 200, description = "Daftar seluruh program studi aktif", body = Vec<ProdiResponse>)
    )
)]
pub async fn list_prodi_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.list_prodi().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/master/prodi/{id}",
    tag = "Master",
    params(
        ("id" = Uuid, Path, description = "ID Program Studi")
    ),
    responses(
        (status = 200, description = "Detail program studi", body = ProdiResponse),
        (status = 404, description = "Program studi tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_prodi_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.get_prodi(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/master/prodi/slug/{slug}",
    tag = "Master",
    params(
        ("slug" = String, Path, description = "Slug Program Studi, misal s1-informatika")
    ),
    responses(
        (status = 200, description = "Detail program studi berdasarkan slug", body = ProdiResponse),
        (status = 404, description = "Program studi tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_prodi_by_slug_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.get_prodi_by_slug(&slug).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/master/fakultas",
    tag = "Master",
    responses(
        (status = 200, description = "Daftar fakultas aktif beserta program studi binaannya", body = Vec<FakultasWithProdiResponse>)
    )
)]
pub async fn list_fakultas_prodi_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.list_fakultas_with_prodi().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/master/jalur",
    tag = "Master",
    responses(
        (status = 200, description = "Daftar jalur pendaftaran", body = Vec<JalurResponse>)
    )
)]
pub async fn list_jalur_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.list_jalur().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/master/gelombang",
    tag = "Master",
    responses(
        (status = 200, description = "Daftar gelombang pendaftaran aktif", body = Vec<GelombangResponse>)
    )
)]
pub async fn list_gelombang_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = MasterService::new(MasterRepository::new(state.db.clone()));
    let res = service.list_gelombang().await?;
    Ok(Json(res))
}
