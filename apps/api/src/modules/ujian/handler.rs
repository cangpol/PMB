use axum::{Json, Router, extract::State, response::IntoResponse, routing::post};
use utoipa::OpenApi;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::AuthUser,
    modules::{
        pendaftaran::repository::PendaftaranRepository,
        ujian::{
            dto::{HasilUjianResponse, MulaiUjianResponse, SoalPublicResponse, SubmitUjianRequest},
            repository::UjianRepository,
            service::UjianService,
        },
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(mulai_ujian_handler, submit_ujian_handler),
    components(schemas(
        MulaiUjianResponse,
        SoalPublicResponse,
        SubmitUjianRequest,
        HasilUjianResponse,
        ApiErrorResponse
    ))
)]
pub struct UjianApiDoc;

pub fn ujian_router() -> Router<AppState> {
    Router::new()
        .route("/mulai", post(mulai_ujian_handler))
        .route("/submit", post(submit_ujian_handler))
}

#[utoipa::path(
    post,
    path = "/api/ujian/mulai",
    tag = "Ujian CBT",
    responses(
        (status = 200, description = "Sesi ujian dimulai, timer aktif", body = MulaiUjianResponse),
        (status = 400, description = "Ujian sudah pernah diambil atau belum memenuhi syarat", body = ApiErrorResponse),
        (status = 404, description = "Modul ujian aktif tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn mulai_ujian_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| {
            AppError::BadRequest(
                "Silakan isi formulir biodata pendaftaran terlebih dahulu".to_string(),
            )
        })?;

    let service = UjianService::new(UjianRepository::new(state.db.clone()));
    let res = service.mulai_ujian(pendaftar.id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/ujian/submit",
    tag = "Ujian CBT",
    request_body = SubmitUjianRequest,
    responses(
        (status = 200, description = "Ujian selesai dinilai", body = HasilUjianResponse),
        (status = 400, description = "Sesi ujian tidak valid", body = ApiErrorResponse)
    )
)]
pub async fn submit_ujian_handler(
    _auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<SubmitUjianRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = UjianService::new(UjianRepository::new(state.db.clone()));
    let res = service.submit_ujian(req).await?;
    Ok(Json(res))
}
