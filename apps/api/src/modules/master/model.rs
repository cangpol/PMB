use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct ProgramStudi {
    pub id: Uuid,
    pub kode_prodi: String,
    pub kode_singkat: Option<String>,
    pub nama_prodi: String,
    pub jenjang: String,
    pub slug: Option<String>,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub fakultas_id: Option<Uuid>,
    pub gelar: Option<String>,
    pub lama_studi_semester: Option<i32>,
    pub akreditasi: Option<String>,
    pub deskripsi_singkat: Option<String>,
    pub tentang_prodi: Option<String>,
    pub kompetensi_lulusan: Option<Vec<String>>,
    pub prospek_karier: Option<Vec<String>>,
    pub fasilitas: Option<Vec<String>>,
    pub passing_score: f64,
    pub passing_grade: Option<f64>,
    pub kuota: i32,
    pub daya_tampung: Option<i32>,
    pub ukt_nominal: i64,
    pub biaya_ukt_min: Option<i64>,
    pub biaya_ukt_maks: Option<i64>,
    pub urutan_tampil: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct FakultasModel {
    pub id: Uuid,
    pub kode_fakultas: String,
    pub nama_fakultas: String,
    pub slug: Option<String>,
    pub deskripsi_singkat: Option<String>,
    pub deskripsi: Option<String>,
    pub urutan_tampil: i32,
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
