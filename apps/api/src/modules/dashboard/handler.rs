use axum::{Json, Router, extract::State, response::IntoResponse, routing::get};
use utoipa::OpenApi;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::AuthUser,
    modules::dashboard::{
        dto::{AdminDashboardResponse, CalonDashboardResponse, FunnelStat, ProdiStat, StepperStep},
        service::DashboardService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(get_calon_dashboard_handler, get_admin_dashboard_handler),
    components(schemas(
        CalonDashboardResponse,
        StepperStep,
        AdminDashboardResponse,
        ProdiStat,
        FunnelStat,
        ApiErrorResponse
    ))
)]
pub struct DashboardApiDoc;

pub fn dashboard_router() -> Router<AppState> {
    Router::new()
        .route("/calon", get(get_calon_dashboard_handler))
        .route("/admin", get(get_admin_dashboard_handler))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/calon",
    tag = "Dashboard",
    responses(
        (status = 200, description = "Ringkasan progres dan status tahapan calon mahasiswa", body = CalonDashboardResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_calon_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = DashboardService::new(state.db.clone());
    let res = service.get_calon_dashboard(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/admin",
    tag = "Dashboard Admin",
    responses(
        (status = 200, description = "Statistik eksekutif PMB (total, funnel, distribusi prodi, total penerimaan)", body = AdminDashboardResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn get_admin_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() && !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Akses khusus panitia PMB dan pimpinan".to_string(),
        ));
    }
    let service = DashboardService::new(state.db.clone());
    let res = service.get_admin_dashboard().await?;
    Ok(Json(res))
}
