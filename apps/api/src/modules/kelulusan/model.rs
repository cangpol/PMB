use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct HasilKelulusan {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub status_kelulusan: String, // 'LULUS_PILIHAN_1', 'LULUS_PILIHAN_2', 'CADANGAN', 'TIDAK_LULUS'
    pub prodi_diterima_id: Option<Uuid>,
    pub skor_akhir: f64,
    pub nim_resmi: Option<String>,
    pub nomor_surat_loa: Option<String>,
    pub tanggal_sk: Option<NaiveDate>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
