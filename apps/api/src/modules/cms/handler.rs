use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::get,
};
use utoipa::OpenApi;

use crate::{
    error::{ApiErrorResponse, AppError},
    modules::cms::{dto::CmsPostResponse, repository::CmsRepository, service::CmsService},
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(list_posts_handler, get_post_handler),
    components(schemas(CmsPostResponse, ApiErrorResponse))
)]
pub struct CmsApiDoc;

pub fn cms_router() -> Router<AppState> {
    Router::new()
        .route("/posts", get(list_posts_handler))
        .route("/posts/{slug}", get(get_post_handler))
}

#[utoipa::path(
    get,
    path = "/api/cms/posts",
    tag = "CMS",
    responses(
        (status = 200, description = "Daftar artikel, berita, dan panduan PMB yang dipublikasikan", body = Vec<CmsPostResponse>)
    )
)]
pub async fn list_posts_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = CmsService::new(CmsRepository::new(state.db.clone()));
    let res = service.get_posts().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/posts/{slug}",
    tag = "CMS",
    params(
        ("slug" = String, Path, description = "Slug artikel / pengumuman")
    ),
    responses(
        (status = 200, description = "Detail artikel / pengumuman", body = CmsPostResponse),
        (status = 404, description = "Artikel tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_post_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = CmsService::new(CmsRepository::new(state.db.clone()));
    let res = service.get_post_by_slug(&slug).await?;
    Ok(Json(res))
}
