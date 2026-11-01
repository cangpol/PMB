use axum::{Json, extract::State, response::IntoResponse};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HealthCheckResponse {
    pub status: String,
    pub service: String,
    pub institusi: String,
    pub versi: String,
    pub database: String,
    pub redis: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[utoipa::path(
    get,
    path = "/api/health",
    tag = "health",
    responses(
        (status = 200, description = "Status kesehatan layanan API, PostgreSQL, dan Redis", body = HealthCheckResponse)
    )
)]
pub async fn health_check_handler(State(state): State<AppState>) -> impl IntoResponse {
    // 1. Cek koneksi Database
    let db_status = match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    // 2. Cek koneksi Redis
    let redis_status = match redis::Client::open(state.config.redis_url.as_str()) {
        Ok(client) => match client.get_connection() {
            Ok(mut conn) => {
                let ping_res: Result<String, _> = redis::cmd("PING").query(&mut conn);
                if ping_res.is_ok() {
                    "connected"
                } else {
                    "disconnected"
                }
            }
            Err(_) => "disconnected",
        },
        Err(_) => "disconnected",
    };

    let overall_status = if db_status == "connected" && redis_status == "connected" {
        "ok"
    } else if db_status == "connected" || redis_status == "connected" {
        "degraded"
    } else {
        "offline"
    };

    (
        axum::http::StatusCode::OK,
        Json(HealthCheckResponse {
            status: overall_status.to_string(),
            service: "pmb-api".to_string(),
            institusi: "Universitas Pignatelli Triputra".to_string(),
            versi: "1.0.0".to_string(),
            database: db_status.to_string(),
            redis: redis_status.to_string(),
            timestamp: chrono::Utc::now(),
        }),
    )
}

#[utoipa::path(
    get,
    path = "/api/health/live",
    tag = "health",
    responses(
        (status = 200, description = "Liveness probe: server aktif")
    )
)]
pub async fn liveness_handler() -> impl IntoResponse {
    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({
            "status": "alive",
            "service": "pmb-api",
            "timestamp": chrono::Utc::now()
        })),
    )
}

#[utoipa::path(
    get,
    path = "/api/health/ready",
    tag = "health",
    responses(
        (status = 200, description = "Readiness probe: database terhubung dan siap melayani request"),
        (status = 503, description = "Database tidak terhubung")
    )
)]
pub async fn readiness_handler(State(state): State<AppState>) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1").execute(&state.db).await.is_ok();
    if db_ok {
        (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({
                "status": "ready",
                "database": "connected",
                "timestamp": chrono::Utc::now()
            })),
        )
    } else {
        (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unready",
                "database": "disconnected",
                "timestamp": chrono::Utc::now()
            })),
        )
    }
}
