use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct ProgramStudi {
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
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct JalurMasuk {
    pub id: Uuid,
    pub kode_jalur: String,
    pub nama_jalur: String,
    pub deskripsi: String,
    pub biaya_formulir: i64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Gelombang {
    pub id: Uuid,
    pub nama_gelombang: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,
    pub kuota: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}
