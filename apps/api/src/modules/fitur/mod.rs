//! Sakelar fitur sistem yang hanya boleh diubah Super Admin.
//! Disimpan di `pengaturan_pmb` agar bertahan setelah server dimulai ulang.

use axum::{
    Json, Router,
    extract::State,
    response::IntoResponse,
    routing::{get, put},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::{OpenApi, ToSchema};

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{AuthUser, RequireSuperAdmin, ValidatedJson},
    security::record_audit_log,
    state::AppState,
};

/// Kunci di tabel `pengaturan_pmb`. Tidak boleh diubah lewat endpoint pengaturan umum.
pub const KUNCI_PENGAWAS_CBT: &str = "FITUR_PENGAWAS_CBT_AKTIF";

#[derive(OpenApi)]
#[openapi(
    paths(get_fitur_handler, set_pengawas_cbt_handler),
    components(schemas(FiturResponse, AturFiturRequest, ApiErrorResponse))
)]
pub struct FiturApiDoc;

#[derive(Debug, Serialize, ToSchema)]
pub struct FiturResponse {
    /// Bila `false`, akun berperan pengawas ujian tidak dapat memakai meja presensi/monitor CBT.
    pub pengawas_cbt_aktif: bool,
}

#[derive(Debug, Deserialize, validator::Validate, ToSchema)]
pub struct AturFiturRequest {
    pub aktif: bool,
}

pub fn fitur_router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_fitur_handler))
        .route("/pengawas-cbt", put(set_pengawas_cbt_handler))
}

/// Fitur pengawas CBT aktif secara bawaan (bila belum pernah diatur).
pub async fn pengawas_cbt_aktif(db: &PgPool) -> Result<bool, AppError> {
    let nilai: Option<String> =
        sqlx::query_scalar("SELECT nilai FROM pengaturan_pmb WHERE kunci = $1")
            .bind(KUNCI_PENGAWAS_CBT)
            .fetch_optional(db)
            .await?;
    Ok(nilai.as_deref() != Some("false"))
}

/// Tolak akun pengawas ujian bila fitur dimatikan. Admin & super admin tidak terpengaruh.
pub async fn pastikan_pengawas_boleh(db: &PgPool, user: &AuthUser) -> Result<(), AppError> {
    if user.role == "pengawas_ujian" && !pengawas_cbt_aktif(db).await? {
        return Err(AppError::Forbidden(
            "Fitur pengawas CBT sedang dinonaktifkan oleh Super Admin".to_string(),
        ));
    }
    Ok(())
}

#[utoipa::path(
    get,
    path = "/api/fitur",
    tag = "Fitur",
    responses(
        (status = 200, description = "Status sakelar fitur sistem", body = FiturResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_fitur_handler(
    _user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(FiturResponse {
        pengawas_cbt_aktif: pengawas_cbt_aktif(&state.db).await?,
    }))
}

#[utoipa::path(
    put,
    path = "/api/fitur/pengawas-cbt",
    tag = "Fitur",
    request_body = AturFiturRequest,
    responses(
        (status = 200, description = "Sakelar pengawas CBT diperbarui", body = FiturResponse),
        (status = 403, description = "Hanya Super Admin", body = ApiErrorResponse)
    )
)]
pub async fn set_pengawas_cbt_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<AturFiturRequest>,
) -> Result<impl IntoResponse, AppError> {
    let sebelum = pengawas_cbt_aktif(&state.db).await?;
    sqlx::query(
        "INSERT INTO pengaturan_pmb (kunci, nilai, deskripsi, updated_by)
         VALUES ($1, $2, 'Mengaktifkan fitur pengawas CBT (presensi & monitor)', $3)
         ON CONFLICT (kunci) DO UPDATE
           SET nilai = EXCLUDED.nilai, updated_by = EXCLUDED.updated_by, updated_at = NOW()",
    )
    .bind(KUNCI_PENGAWAS_CBT)
    .bind(if req.aktif { "true" } else { "false" })
    .bind(admin.user_id)
    .execute(&state.db)
    .await?;

    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        "FITUR_PENGAWAS_CBT",
        "pengaturan_pmb",
        None,
        Some(serde_json::json!({ "aktif": sebelum })),
        Some(serde_json::json!({ "aktif": req.aktif })),
    )
    .await;

    Ok(Json(FiturResponse {
        pengawas_cbt_aktif: req.aktif,
    }))
}
