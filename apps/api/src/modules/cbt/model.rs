use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BankSoal {
    pub id: Uuid,
    pub kategori: String,
    pub tingkat_kesulitan: String,
    pub pertanyaan: String,
    pub gambar_url: Option<String>,
    pub opsi_jawaban: serde_json::Value,
    pub kunci_jawaban: String,
    pub bobot: f64,
    pub pembahasan: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PaketUjian {
    pub id: Uuid,
    pub nama_paket: String,
    pub deskripsi: Option<String>,
    pub durasi_menit: i32,
    pub passing_grade: f64,
    pub total_soal: i32,
    pub acak_soal: bool,
    pub acak_opsi: bool,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SesiUjian {
    pub id: Uuid,
    pub paket_id: Uuid,
    pub nama_sesi: String,
    pub jadwal_mulai: DateTime<Utc>,
    pub jadwal_selesai: DateTime<Utc>,
    pub ruang: String,
    pub kuota: i32,
    pub status: String,
    /// `ONLINE` (dari rumah, tanpa presensi pengawas) atau `LURING` (wajib presensi QR)
    pub mode: String,
    pub gelombang_id: Option<Uuid>,
    pub jalur_id: Option<Uuid>,
    /// Sesi tampil sebagai pilihan jadwal seleksi di formulir calon
    pub is_dibuka_pendaftaran: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PesertaSesi {
    pub id: Uuid,
    pub sesi_id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_peserta: String,
    pub status_presensi: String,
    pub waktu_presensi: Option<DateTime<Utc>>,
    pub metode_presensi: Option<String>,
    pub pengawas_id: Option<Uuid>,
    pub status_ujian: String,
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub batas_waktu: Option<DateTime<Utc>>,
    pub waktu_selesai: Option<DateTime<Utc>>,
    pub seed_acak: i64,
    pub urutan_soal_ids: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct JawabanPeserta {
    pub id: Uuid,
    pub peserta_sesi_id: Uuid,
    pub soal_id: Uuid,
    pub pilihan_jawaban: Option<String>,
    pub ragu_ragu: bool,
    pub is_benar: Option<bool>,
    pub skor_diperoleh: Option<f64>,
    pub waktu_dijawab: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct HasilUjian {
    pub id: Uuid,
    pub peserta_sesi_id: Uuid,
    pub pendaftar_id: Uuid,
    pub total_soal: i32,
    pub total_dijawab: i32,
    pub jumlah_benar: i32,
    pub jumlah_salah: i32,
    pub jumlah_kosong: i32,
    pub nilai_akhir: f64,
    pub is_lulus: bool,
    pub kategori_nilai: Option<serde_json::Value>,
    pub waktu_submit: DateTime<Utc>,
}
