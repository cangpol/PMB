use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HasilKelulusanResponse {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub status_kelulusan: String,
    pub prodi_diterima_id: Option<Uuid>,
    pub nama_prodi_diterima: Option<String>,
    pub jenjang_diterima: Option<String>,
    pub fakultas_diterima: Option<String>,
    pub skor_akhir: f64,
    pub nim_resmi: Option<String>,
    pub nomor_surat_loa: Option<String>,
    pub tanggal_sk: Option<NaiveDate>,
    pub is_published: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ProsesSeleksiRequest {
    pub passing_score_override: Option<f64>,
}
