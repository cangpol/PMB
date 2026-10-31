use axum::{
    Json, Router,
    extract::State,
    response::IntoResponse,
    routing::{get, post},
};
use utoipa::OpenApi;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::AuthUser,
    modules::{
        kelulusan::{
            dto::HasilKelulusanResponse, repository::KelulusanRepository, service::KelulusanService,
        },
        master::repository::MasterRepository,
        pendaftaran::repository::PendaftaranRepository,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_my_kelulusan_handler,
        admin_proses_seleksi_handler,
        admin_list_kelulusan_handler
    ),
    components(schemas(HasilKelulusanResponse, ApiErrorResponse))
)]
pub struct KelulusanApiDoc;

pub fn kelulusan_router() -> Router<AppState> {
    Router::new()
        .route("/my-status", get(get_my_kelulusan_handler))
        .route("/admin/proses-seleksi", post(admin_proses_seleksi_handler))
        .route("/admin/list", get(admin_list_kelulusan_handler))
}

#[utoipa::path(
    get,
    path = "/api/kelulusan/my-status",
    tag = "Kelulusan",
    responses(
        (status = 200, description = "Status kelulusan, dokumen LoA, dan NIM resmi calon mahasiswa", body = HasilKelulusanResponse),
        (status = 404, description = "Hasil seleksi belum diumumkan", body = ApiErrorResponse)
    )
)]
pub async fn get_my_kelulusan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KelulusanService::new(
        KelulusanRepository::new(state.db.clone()),
        PendaftaranRepository::new(state.db.clone()),
        MasterRepository::new(state.db.clone()),
    );
    let res = service.get_my_kelulusan(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/kelulusan/admin/proses-seleksi",
    tag = "Kelulusan Admin",
    responses(
        (status = 200, description = "Proses seleksi dan penerbitan NIM berhasil dijalankan"),
        (status = 403, description = "Akses khusus admin PMB", body = ApiErrorResponse)
    )
)]
pub async fn admin_proses_seleksi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya panitia PMB yang dapat memproses kelulusan".to_string(),
        ));
    }
    let service = KelulusanService::new(
        KelulusanRepository::new(state.db.clone()),
        PendaftaranRepository::new(state.db.clone()),
        MasterRepository::new(state.db.clone()),
    );
    let total = service.proses_seleksi_massal().await?;

    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
        "PROSES_SELEKSI_MASSAL",
        "hasil_kelulusan",
        None,
        None,
        Some(serde_json::json!({"total_diproses": total})),
    )
    .await;

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
        (status = 200, description = "Daftar hasil kelulusan seluruh pendaftar", body = Vec<HasilKelulusanResponse>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_kelulusan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses khusus panitia PMB".to_string()));
    }
    let service = KelulusanService::new(
        KelulusanRepository::new(state.db.clone()),
        PendaftaranRepository::new(state.db.clone()),
        MasterRepository::new(state.db.clone()),
    );
    let list = service.list_all().await?;
    Ok(Json(list))
}
