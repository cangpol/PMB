//! Pengaturan potongan biaya (DPP & SKS) per jalur masuk oleh admin.

use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{RequireAdmin, ValidatedJson},
    modules::konfigurasi::repository::KonfigurasiRepository,
    state::AppState,
};

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct PotonganJalurResponse {
    pub id: Uuid,
    pub kode_jalur: String,
    pub nama_jalur: String,
    pub alur_seleksi: String,
    pub biaya_formulir: i64,
    pub rapor_minimal: Option<f64>,
    /// Potongan tetap (persen) bila jalur memberi potongan seragam
    pub potongan_tetap: Option<i32>,
    /// Batas potongan (persen) yang boleh dipilih admin per calon
    pub potongan_maks: Option<i32>,
    pub benefit_tambahan: Option<String>,
    pub kriteria_seleksi: Option<String>,
    pub jumlah_calon_berpotongan: i64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdatePotonganJalurRequest {
    #[validate(range(min = 0.0, max = 100.0, message = "Rapor minimal 0-100"))]
    pub rapor_minimal: Option<f64>,
    #[validate(range(min = 0, max = 100, message = "Potongan tetap 0-100 persen"))]
    pub potongan_tetap: Option<i32>,
    #[validate(range(min = 0, max = 100, message = "Batas potongan 0-100 persen"))]
    pub potongan_maks: Option<i32>,
    #[validate(range(min = 0, message = "Biaya formulir tidak boleh negatif"))]
    pub biaya_formulir: Option<i64>,
    #[validate(length(max = 500, message = "Benefit maksimal 500 karakter"))]
    pub benefit_tambahan: Option<String>,
    #[validate(length(max = 2000, message = "Kriteria maksimal 2000 karakter"))]
    pub kriteria_seleksi: Option<String>,
}

const SELECT_POTONGAN: &str = "SELECT j.id, j.kode_jalur, j.nama_jalur, j.alur_seleksi, j.biaya_formulir,
        j.rapor_minimal, j.potongan_tetap, j.potongan_maks, j.benefit_tambahan, j.kriteria_seleksi,
        (SELECT COUNT(*) FROM pendaftar p WHERE p.jalur_id = j.id AND p.potongan_persen > 0) AS jumlah_calon_berpotongan,
        j.is_active
     FROM jalur_masuk j";

#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/potongan-jalur",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Aturan potongan per jalur", body = Vec<PotonganJalurResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_potongan_jalur_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let sql =
        format!("{SELECT_POTONGAN} ORDER BY j.is_active DESC, j.biaya_formulir ASC, j.nama_jalur");
    let rows = sqlx::query_as::<_, PotonganJalurResponse>(sqlx::AssertSqlSafe(sql))
        .fetch_all(&state.db)
        .await?;
    Ok(Json(rows))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/potongan-jalur/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Jalur Masuk")),
    request_body = UpdatePotonganJalurRequest,
    responses(
        (status = 200, description = "Aturan potongan diperbarui", body = PotonganJalurResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_potongan_jalur_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdatePotonganJalurRequest>,
) -> Result<impl IntoResponse, AppError> {
    if let (Some(tetap), Some(maks)) = (req.potongan_tetap, req.potongan_maks)
        && tetap > maks
    {
        return Err(AppError::BadRequest(
            "Potongan tetap tidak boleh melebihi batas potongan".to_string(),
        ));
    }
    let benefit = req
        .benefit_tambahan
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let kriteria = req
        .kriteria_seleksi
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let diubah = sqlx::query(
        "UPDATE jalur_masuk SET rapor_minimal = $1, potongan_tetap = $2, potongan_maks = $3,
             biaya_formulir = COALESCE($4, biaya_formulir), benefit_tambahan = $5,
             kriteria_seleksi = $6, updated_at = NOW()
         WHERE id = $7",
    )
    .bind(req.rapor_minimal)
    .bind(req.potongan_tetap)
    .bind(req.potongan_maks)
    .bind(req.biaya_formulir)
    .bind(benefit)
    .bind(kriteria)
    .bind(id)
    .execute(&state.db)
    .await?
    .rows_affected();
    if diubah == 0 {
        return Err(AppError::NotFound(
            "Jalur masuk tidak ditemukan".to_string(),
        ));
    }

    let detail = serde_json::json!({
        "rapor_minimal": req.rapor_minimal, "potongan_tetap": req.potongan_tetap,
        "potongan_maks": req.potongan_maks, "biaya_formulir": req.biaya_formulir,
    })
    .to_string();
    KonfigurasiRepository::new(state.db.clone())
        .record_audit(
            Some(admin.0.user_id),
            "UPDATE",
            "potongan_jalur",
            &id.to_string(),
            &detail,
        )
        .await;

    let sql = format!("{SELECT_POTONGAN} WHERE j.id = $1");
    let row = sqlx::query_as::<_, PotonganJalurResponse>(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_one(&state.db)
        .await?;
    Ok(Json(row))
}
