use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SoalPublicResponse {
    pub id: Uuid,
    pub nomor_urut: i32,
    pub pertanyaan: String,
    pub pilihan_a: String,
    pub pilihan_b: String,
    pub pilihan_c: String,
    pub pilihan_d: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MulaiUjianResponse {
    pub peserta_ujian_id: Uuid,
    pub ujian_id: Uuid,
    pub judul: String,
    pub durasi_menit: i32,
    pub waktu_mulai: DateTime<Utc>,
    pub batas_waktu_selesai: DateTime<Utc>,
    pub daftar_soal: Vec<SoalPublicResponse>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SubmitUjianRequest {
    pub peserta_ujian_id: Uuid,
    // Map dari Soal ID -> Jawaban ('A', 'B', 'C', 'D')
    pub jawaban: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HasilUjianResponse {
    pub peserta_ujian_id: Uuid,
    pub total_skor: f64,
    pub is_lulus: bool,
    pub passing_grade: f64,
    pub total_soal: usize,
    pub jumlah_benar: usize,
    pub waktu_selesai: DateTime<Utc>,
}
