use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ProdiResponse {
    pub id: Uuid,
    pub kode_prodi: String,
    pub nama_prodi: String,
    pub jenjang: String,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub passing_score: f64,
    pub kuota: i32,
    pub ukt_nominal: i64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateProdiRequest {
    #[validate(length(min = 2, max = 10, message = "Kode prodi harus 2-10 karakter"))]
    pub kode_prodi: String,
    #[validate(length(min = 3, message = "Nama prodi minimal 3 karakter"))]
    pub nama_prodi: String,
    pub jenjang: String,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub passing_score: f64,
    pub kuota: i32,
    pub ukt_nominal: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct JalurResponse {
    pub id: Uuid,
    pub kode_jalur: String,
    pub nama_jalur: String,
    pub deskripsi: String,
    pub biaya_formulir: i64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct GelombangResponse {
    pub id: Uuid,
    pub nama_gelombang: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,
    pub kuota: i32,
    pub is_active: bool,
}
