use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProdiResponse {
    pub id: Uuid,
    pub kode_prodi: String,
    pub kode_singkat: Option<String>,
    pub nama_prodi: String,
    pub jenjang: String,
    pub slug: String,
    pub fakultas: String,
    pub kode_fakultas: String,
    pub fakultas_id: Option<Uuid>,
    pub gelar: Option<String>,
    pub lama_studi_semester: Option<i32>,
    pub akreditasi: Option<String>,
    pub deskripsi_singkat: Option<String>,
    pub tentang_prodi: Option<String>,
    pub kompetensi_lulusan: Vec<String>,
    pub prospek_karier: Vec<String>,
    pub fasilitas: Vec<String>,
    pub passing_score: f64,
    pub passing_grade: Option<f64>,
    pub kuota: i32,
    pub daya_tampung: Option<i32>,
    pub ukt_nominal: i64,
    pub biaya_ukt_min: Option<i64>,
    pub biaya_ukt_maks: Option<i64>,
    pub urutan_tampil: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FakultasWithProdiResponse {
    pub id: Uuid,
    pub kode_fakultas: String,
    pub nama_fakultas: String,
    pub slug: String,
    pub deskripsi_singkat: Option<String>,
    pub urutan_tampil: i32,
    pub prodi_count: i64,
    pub prodi_list: Vec<ProdiResponse>,
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
    /// `CBT`, `BERKAS`, `CAMPURAN`, atau `RPL` (CBT/CAMPURAN wajib memilih sesi CBT)
    pub tipe_seleksi: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct GelombangResponse {
    pub id: Uuid,
    pub nama_gelombang: String,
    pub tgl_mulai: DateTime<Utc>,
    pub tgl_selesai: DateTime<Utc>,
    pub kuota: i32,
    pub is_active: bool,
    /// Tahap pendaftaran gelombang ini (kosong bila gelombang tidak dibagi tahap)
    #[serde(default)]
    pub tahap: Vec<crate::modules::pendaftaran::tahap::TahapResponse>,
    /// Informasi untuk halaman depan (diatur admin)
    pub deskripsi: Option<String>,
    pub info_daftar_ulang: Option<String>,
}
