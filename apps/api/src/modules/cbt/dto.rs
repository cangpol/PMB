use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SoalOpsiDto {
    #[serde(default)]
    pub id: String, // ID asli opsi ('A', 'B', 'C', 'D', 'E') untuk pencocokan kunci jawaban
    pub label: String, // Label tampilan ('A', 'B', 'C', 'D', 'E') berurutan dari atas ke bawah
    pub teks: String,
    pub gambar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SoalCbtPesertaResponse {
    pub id: Uuid,
    pub nomor_urut: i32,
    pub kategori: String,
    pub bobot: f64,
    pub pertanyaan: String,
    pub gambar_url: Option<String>,
    pub opsi_jawaban: Vec<SoalOpsiDto>,
    pub jawaban_terpilih: Option<String>,
    pub ragu_ragu: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SesiCalonInfoResponse {
    pub sesi_id: Option<Uuid>,
    pub nama_sesi: Option<String>,
    pub jadwal_mulai: Option<DateTime<Utc>>,
    pub jadwal_selesai: Option<DateTime<Utc>>,
    pub ruang: Option<String>,
    pub durasi_menit: i32,
    pub total_soal: i32,
    pub passing_grade: f64,
    pub nomor_peserta: String,
    pub status_presensi: String, // 'BELUM_HADIR', 'HADIR', 'TIDAK_HADIR'
    pub status_ujian: String,    // 'MENUNGGU', 'SEDANG_MENGERJAKAN', 'SELESAI', 'WAKTU_HABIS'
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub batas_waktu: Option<DateTime<Utc>>,
    pub sisa_detik: i64,
    pub can_start: bool,
    pub pesan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MulaiUjianCbtResponse {
    pub peserta_sesi_id: Uuid,
    pub sesi_id: Uuid,
    pub judul_paket: String,
    pub durasi_menit: i32,
    pub passing_grade: f64,
    pub waktu_mulai: DateTime<Utc>,
    pub batas_waktu: DateTime<Utc>,
    pub sisa_detik: i64,
    pub total_soal: usize,
    #[serde(alias = "soal")]
    pub daftar_soal: Vec<SoalCbtPesertaResponse>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct AutosaveJawabanRequest {
    pub soal_id: Uuid,
    pub pilihan_jawaban: Option<String>,
    pub ragu_ragu: bool,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct LaporPelanggaranRequest {
    #[validate(length(min = 1, max = 40))]
    pub jenis: String,
    #[validate(length(max = 255))]
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LaporPelanggaranResponse {
    pub total_pelanggaran: i64,
    pub batas_pelanggaran: i64,
    pub auto_submitted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AutosaveJawabanResponse {
    pub status: String,
    pub soal_id: Uuid,
    pub sisa_detik: i64,
    pub is_expired: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SubmitUjianResponse {
    pub peserta_sesi_id: Uuid,
    pub total_soal: i32,
    pub total_dijawab: i32,
    pub jumlah_benar: i32,
    pub jumlah_salah: i32,
    pub jumlah_kosong: i32,
    pub nilai_akhir: f64,
    pub is_lulus: bool,
    pub passing_grade: f64,
    pub kategori_nilai: serde_json::Value,
    pub waktu_submit: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct PresensiCheckInRequest {
    #[validate(length(min = 1, message = "Nomor kartu/pendaftaran atau QR code wajib diisi"))]
    #[serde(alias = "identifier")]
    pub nomor_peserta_atau_qr: String,
    pub sesi_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PresensiCheckInResponse {
    pub peserta_id: Uuid,
    pub nomor_peserta: String,
    pub nama_peserta: String,
    pub nama_sesi: String,
    pub status_presensi: String,
    pub waktu_presensi: DateTime<Utc>,
    pub pesan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LivePesertaStatusItem {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_peserta: String,
    pub nama_peserta: String,
    pub status_presensi: String,
    pub status_ujian: String,
    pub soal_terjawab: i64,
    pub total_soal: i64,
    pub sisa_detik: i64,
    pub nilai_akhir: Option<f64>,
    pub is_lulus: Option<bool>,
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub waktu_selesai: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LiveMonitorStreamResponse {
    pub sesi_id: Uuid,
    pub nama_sesi: String,
    pub total_kuota: i32,
    pub total_peserta: usize,
    pub total_hadir: usize,
    #[serde(alias = "sedang_mengerjakan")]
    pub total_sedang_mengerjakan: usize,
    #[serde(alias = "selesai")]
    pub total_selesai: usize,
    pub peserta: Vec<LivePesertaStatusItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErrorBarisImport {
    pub baris: usize,
    pub pesan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImportSoalResultResponse {
    pub total_baris: usize,
    pub total_sukses: usize,
    pub total_gagal: usize,
    pub error_baris: Vec<ErrorBarisImport>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct CreateSoalRequest {
    #[validate(length(min = 1, message = "Kategori soal wajib diisi"))]
    pub kategori: String,
    pub tingkat_kesulitan: String,
    #[validate(length(min = 3, message = "Pertanyaan wajib diisi"))]
    pub pertanyaan: String,
    pub gambar_url: Option<String>,
    pub opsi_jawaban: Vec<SoalOpsiDto>,
    #[validate(length(min = 1, message = "Kunci jawaban wajib diisi"))]
    pub kunci_jawaban: String,
    pub bobot: Option<f64>,
    pub pembahasan: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct CreatePaketRequest {
    #[validate(length(min = 3, message = "Nama paket ujian wajib diisi"))]
    pub nama_paket: String,
    pub deskripsi: Option<String>,
    pub durasi_menit: i32,
    pub passing_grade: f64,
    pub acak_soal: bool,
    pub acak_opsi: bool,
    pub soal_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct CreateSesiRequest {
    pub paket_id: Uuid,
    #[validate(length(min = 3, message = "Nama sesi ujian wajib diisi"))]
    pub nama_sesi: String,
    pub jadwal_mulai: DateTime<Utc>,
    pub jadwal_selesai: DateTime<Utc>,
    pub ruang: String,
    pub kuota: i32,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct AssignPesertaRequest {
    pub pendaftar_ids: Vec<Uuid>,
}
