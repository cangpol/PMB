//! Kontak sekretariat PMB untuk website publik, diambil dari Pengaturan PMB.

use axum::{Json, extract::State, response::IntoResponse};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{error::AppError, state::AppState};

#[derive(Debug, Serialize, ToSchema)]
pub struct KontakPublikResponse {
    pub email: String,
    pub whatsapp: String,
    pub jam_layanan: String,
    pub alamat: String,
}

#[utoipa::path(
    get,
    path = "/api/cms/kontak",
    tag = "CMS Publik",
    responses((status = 200, description = "Kontak sekretariat PMB", body = KontakPublikResponse))
)]
pub async fn get_kontak_publik_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT kunci, nilai FROM pengaturan_pmb
         WHERE kunci IN ('KONTAK_EMAIL', 'KONTAK_WHATSAPP', 'JAM_LAYANAN', 'KONTAK_ALAMAT')",
    )
    .fetch_all(&state.db)
    .await?;
    let ambil = |k: &str| {
        rows.iter()
            .find(|(kunci, _)| kunci == k)
            .map(|(_, v)| v.trim().to_string())
            .unwrap_or_default()
    };
    Ok(Json(KontakPublikResponse {
        email: ambil("KONTAK_EMAIL"),
        whatsapp: ambil("KONTAK_WHATSAPP"),
        jam_layanan: ambil("JAM_LAYANAN"),
        alamat: ambil("KONTAK_ALAMAT"),
    }))
}
