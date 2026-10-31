use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct UjianCbt {
    pub id: Uuid,
    pub judul: String,
    pub deskripsi: String,
    pub durasi_menit: i32,
    pub passing_grade: f64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct SoalUjian {
    pub id: Uuid,
    pub ujian_id: Uuid,
    pub nomor_urut: i32,
    pub pertanyaan: String,
    pub pilihan_a: String,
    pub pilihan_b: String,
    pub pilihan_c: String,
    pub pilihan_d: String,
    pub kunci_jawaban: String,
    pub bobot: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct PesertaUjian {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub ujian_id: Uuid,
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub waktu_selesai: Option<DateTime<Utc>>,
    pub total_skor: Option<f64>,
    pub is_lulus: Option<bool>,
    pub jawaban_json: Option<String>,
    pub created_at: DateTime<Utc>,
}
