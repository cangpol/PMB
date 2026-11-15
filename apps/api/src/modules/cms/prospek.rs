//! Prospek calon: formulir minat di pop up halaman depan dan daftarnya untuk admin.

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::{Validate, ValidationError};

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{RequireAdmin, ValidatedJson},
    state::AppState,
};

/// Nomor HP/WA Indonesia: 9-15 digit, boleh diawali + dan berisi spasi atau tanda hubung.
fn validasi_no_hp(nilai: &str) -> Result<(), ValidationError> {
    let bersih: String = nilai
        .chars()
        .filter(|c| !matches!(c, ' ' | '-' | '+'))
        .collect();
    let ok = (9..=15).contains(&bersih.len())
        && bersih.chars().all(|c| c.is_ascii_digit())
        && nilai
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, ' ' | '-' | '+'));
    if ok {
        Ok(())
    } else {
        Err(ValidationError::new("no_hp").with_message("Nomor HP/WA tidak valid".into()))
    }
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct KirimProspekRequest {
    #[validate(length(min = 3, max = 100, message = "Nama lengkap 3-100 karakter"))]
    pub nama: String,
    #[validate(custom(function = "validasi_no_hp"))]
    pub no_hp: String,
    #[validate(email(message = "Format email tidak valid"), length(max = 150))]
    pub email: String,
    /// Wajib untuk formulir minat; tidak dipakai pada konsultasi online
    #[validate(length(min = 2, max = 150, message = "Asal sekolah 2-150 karakter"))]
    pub asal_sekolah: Option<String>,
    /// Program studi dari daftar (opsional bila memilih dari daftar)
    pub prodi_id: Option<Uuid>,
    #[validate(length(min = 2, max = 150, message = "Pilih program studi yang diminati"))]
    pub prodi_minat: String,
    /// Pertanyaan dari konsultasi online (halaman Kontak)
    #[validate(length(min = 5, max = 2000, message = "Pertanyaan 5-2000 karakter"))]
    pub pesan: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct KirimProspekResponse {
    pub pesan: String,
}

#[utoipa::path(
    post,
    path = "/api/cms/prospek",
    tag = "CMS Publik",
    request_body = KirimProspekRequest,
    responses(
        (status = 201, description = "Data minat tersimpan", body = KirimProspekResponse),
        (status = 422, description = "Validasi gagal", body = ApiErrorResponse),
        (status = 429, description = "Terlalu sering mengirim", body = ApiErrorResponse)
    )
)]
pub async fn kirim_prospek_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<KirimProspekRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pesan = req
        .pesan
        .as_deref()
        .map(str::trim)
        .filter(|p| !p.is_empty());
    let asal = req
        .asal_sekolah
        .as_deref()
        .map(str::trim)
        .filter(|a| !a.is_empty());
    if pesan.is_none() && asal.is_none() {
        return Err(AppError::BadRequest("Asal sekolah wajib diisi".into()));
    }
    let sumber = if pesan.is_some() {
        "KONSULTASI_ONLINE"
    } else {
        "POPUP_BERANDA"
    };

    // Cegah pengiriman berulang dengan email yang sama (3 kali per jam)
    // Batas global menahan banjir kiriman dengan email acak yang berbeda-beda
    state
        .rate_limiter
        .check_rate_limit("prospek:global", 300, 3600)
        .await?;
    state
        .rate_limiter
        .check_rate_limit(&format!("prospek:{}", req.email.to_lowercase()), 3, 3600)
        .await?;

    sqlx::query(
        "INSERT INTO prospek_calon (nama, no_hp, email, asal_sekolah, prodi_id, prodi_minat, pesan, sumber)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(req.nama.trim())
    .bind(req.no_hp.trim())
    .bind(req.email.trim().to_lowercase())
    .bind(asal)
    .bind(req.prodi_id)
    .bind(req.prodi_minat.trim())
    .bind(pesan)
    .bind(sumber)
    .execute(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(KirimProspekResponse {
            pesan: "Terima kasih. Tim PMB akan menghubungi Anda.".to_string(),
        }),
    ))
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct ProspekItem {
    pub id: Uuid,
    pub nama: String,
    pub no_hp: String,
    pub email: String,
    pub asal_sekolah: String,
    pub prodi_minat: String,
    /// Pertanyaan pada konsultasi online
    pub pesan: Option<String>,
    pub sumber: String,
    pub status: String,
    pub catatan: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/prospek",
    tag = "CMS Admin",
    responses(
        (status = 200, description = "Daftar prospek calon", body = Vec<ProspekItem>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_prospek_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as::<_, ProspekItem>(
        "SELECT id, nama, no_hp, email, COALESCE(asal_sekolah, '') AS asal_sekolah, prodi_minat, pesan, sumber, status, catatan, created_at
         FROM prospek_calon ORDER BY created_at DESC LIMIT 1000",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UbahProspekRequest {
    #[validate(custom(function = "validasi_status"))]
    pub status: String,
    #[validate(length(max = 1000, message = "Catatan maksimal 1000 karakter"))]
    pub catatan: Option<String>,
}

fn validasi_status(s: &str) -> Result<(), ValidationError> {
    if matches!(s, "BARU" | "DIHUBUNGI" | "SUDAH_DAFTAR") {
        Ok(())
    } else {
        Err(ValidationError::new("status").with_message("Status tidak dikenal".into()))
    }
}

#[utoipa::path(
    put,
    path = "/api/cms/admin/prospek/{id}",
    tag = "CMS Admin",
    params(("id" = Uuid, Path, description = "ID prospek")),
    request_body = UbahProspekRequest,
    responses(
        (status = 200, description = "Prospek diperbarui", body = ProspekItem),
        (status = 404, description = "Tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn ubah_prospek_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UbahProspekRequest>,
) -> Result<impl IntoResponse, AppError> {
    let row = sqlx::query_as::<_, ProspekItem>(
        "UPDATE prospek_calon SET status = $2, catatan = $3, updated_at = NOW() WHERE id = $1
         RETURNING id, nama, no_hp, email, COALESCE(asal_sekolah, '') AS asal_sekolah, prodi_minat, pesan, sumber, status, catatan, created_at",
    )
    .bind(id)
    .bind(&req.status)
    .bind(req.catatan.as_deref().map(str::trim).filter(|c| !c.is_empty()))
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Prospek tidak ditemukan".into()))?;
    Ok(Json(row))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nomor_hp_valid_dan_tidak() {
        assert!(validasi_no_hp("0812 3456 7890").is_ok());
        assert!(validasi_no_hp("+62812-3456-7890").is_ok());
        assert!(validasi_no_hp("08123").is_err());
        assert!(validasi_no_hp("0812abc4567890").is_err());
    }

    #[test]
    fn status_dikenal() {
        assert!(validasi_status("BARU").is_ok());
        assert!(validasi_status("LAINNYA").is_err());
    }
}
