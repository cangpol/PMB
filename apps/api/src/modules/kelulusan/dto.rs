use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

use crate::modules::kelulusan::model::{AuditKelulusan, BerkasDaftarUlang, SidangKelulusan};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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
    pub pilihan_ke: Option<i32>,
    pub ranking: Option<i32>,
    pub skor_akhir: f64,
    pub nim_resmi: Option<String>,
    pub nomor_surat_loa: Option<String>,
    pub tanggal_sk: Option<NaiveDate>,
    pub is_published: bool,
    pub status_daftar_ulang: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CekKelulusanCalonResponse {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_nama: String,
    pub gelombang_nama: String,
    pub status_kelulusan: String, // 'LULUS_PILIHAN_1', 'LULUS_PILIHAN_2', 'CADANGAN', 'TIDAK_LULUS', 'BELUM_DIPUTUSKAN'
    pub prodi_diterima: Option<String>,
    pub jenjang_diterima: Option<String>,
    pub fakultas_diterima: Option<String>,
    pub pilihan_ke: Option<i32>,
    pub skor_akhir: f64,
    pub nim_resmi: Option<String>,
    pub nomor_surat_loa: Option<String>,
    pub tanggal_sk: Option<NaiveDate>,
    pub is_published: bool,
    pub tgl_pengumuman: Option<DateTime<Utc>>,
    pub is_pengumuman_buka: bool,
    pub status_daftar_ulang: String,
    pub pesan: String,
    /// Hasil CBT terbaru calon (tampil di halaman hasil kelulusan sebelum pengumuman resmi).
    pub hasil_cbt: Option<HasilCbtCalon>,
}

/// Ringkasan hasil CBT untuk calon mahasiswa.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, sqlx::FromRow)]
pub struct HasilCbtCalon {
    pub nilai_akhir: f64,
    pub jumlah_benar: i32,
    pub jumlah_salah: i32,
    pub jumlah_kosong: i32,
    pub passing_grade: f64,
    /// Memenuhi passing grade atau disetujui admin.
    pub memenuhi_passing_grade: bool,
    /// Hasil di bawah passing grade yang disetujui panitia.
    pub disetujui_admin: bool,
    pub waktu_submit: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema, Validate)]
pub struct CekKelulusanPublikQuery {
    #[validate(length(min = 3, message = "Nomor pendaftaran minimal 3 karakter"))]
    pub nomor_pendaftaran: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CekKelulusanPublikResponse {
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_nama: String,
    pub gelombang_nama: String,
    pub status_kelulusan: String,
    pub prodi_diterima: Option<String>,
    pub jenjang_diterima: Option<String>,
    pub fakultas_diterima: Option<String>,
    pub is_pengumuman_buka: bool,
    pub tgl_pengumuman: Option<DateTime<Utc>>,
    pub pesan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct UpdateRumusRequest {
    #[validate(range(min = 0.0, max = 100.0))]
    pub bobot_cbt: f64,
    #[validate(range(min = 0.0, max = 100.0))]
    pub bobot_rapor: f64,
    #[validate(range(min = 0.0, max = 100.0))]
    pub bobot_prestasi: f64,
    #[validate(range(min = 0.0, max = 100.0))]
    pub bobot_wawancara: f64,
    #[validate(range(min = 0.0, max = 100.0))]
    pub default_passing_score: f64,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct ProsesRankingRequest {
    pub gelombang_id: Option<Uuid>,
    #[validate(length(min = 3, message = "Nama sidang pleno minimal 3 karakter"))]
    pub nama_sidang: String,
    pub nomor_sk: Option<String>,
    pub tgl_pengumuman: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DrafKelulusanItemDto {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_id: Uuid,
    pub jalur_nama: String,
    pub prodi_pilihan_1_id: Uuid,
    pub prodi_pilihan_1_nama: String,
    pub prodi_pilihan_2_id: Option<Uuid>,
    pub prodi_pilihan_2_nama: Option<String>,
    pub skor_cbt: f64,
    pub nilai_rapor: f64,
    pub nilai_prestasi: f64,
    pub skor_akhir: f64,
    pub ranking: i32,
    pub status_kelulusan: String,
    pub prodi_diterima_id: Option<Uuid>,
    pub prodi_diterima_nama: Option<String>,
    pub pilihan_ke: Option<i32>,
    pub catatan: Option<String>,
    /// Hasil seleksi rapor: MENUNGGU | LULUS | TIDAK_LULUS
    pub status_seleksi_rapor: String,
    /// Hasil seleksi interview: MENUNGGU | LULUS | TIDAK_LULUS
    pub status_seleksi_interview: String,
    pub nilai_seleksi_interview: Option<f64>,
    /// Hasil CBT terakhir memenuhi passing grade (None = belum ujian)
    pub lulus_cbt: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DrafKelulusanResponse {
    pub sidang: SidangKelulusan,
    pub items: Vec<DrafKelulusanItemDto>,
    pub audit_logs: Vec<AuditKelulusan>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct ApprovalSidangRequest {
    pub catatan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct UpdateStatusKandidatRequest {
    pub pendaftar_id: Uuid,
    pub status_baru: String,
    pub prodi_diterima_id: Option<Uuid>,
    #[validate(length(
        min = 3,
        message = "Catatan alasan perubahan status wajib diisi minimal 3 karakter"
    ))]
    pub catatan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TagihanDaftarUlangDto {
    pub id: Uuid,
    pub nomor_tagihan: String,
    pub nominal_asli: i64,
    pub nominal_akhir: i64,
    pub diskon: i64,
    pub status: String, // 'PENDING', 'PAID', 'EXPIRED', 'FAILED'
    pub metode_pembayaran: String,
    pub payment_url: Option<String>,
    /// Nomor VA Mandiri kampus (rekening aktif) untuk transfer daftar ulang
    pub va_number: Option<String>,
    pub tgl_jatuh_tempo: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(default)]
    pub rincian: Vec<RincianBiayaDto>,
}

/// Satu komponen biaya daftar ulang (dari matriks biaya prodi x jalur x gelombang).
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RincianBiayaDto {
    pub komponen: String,
    pub nominal: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DaftarUlangInfoResponse {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub prodi_diterima: String,
    pub jenjang: String,
    pub fakultas: String,
    pub status_kelulusan: String,
    pub status_daftar_ulang: String, // 'BELUM_DAFTAR_ULANG', 'TAGIHAN_TERBIT', 'LUNAS', 'BERKAS_LENGKAP', 'TERDAFTAR_SEBAGAI_MAHASISWA'
    pub nomor_registrasi: Option<String>,
    pub status_bukti_bayar: Option<String>, // 'PENDING', 'DISETUJUI', 'DITOLAK'
    pub catatan_bukti_bayar: Option<String>,
    pub nim_resmi: Option<String>,
    pub nomor_loa: Option<String>,
    pub tagihan: Option<TagihanDaftarUlangDto>,
    pub berkas_list: Vec<BerkasDaftarUlang>,
    /// Potongan beasiswa DPP & SKS jalur READY (persen); 0 bila tidak ada.
    pub potongan_persen: i32,
    /// Benefit tambahan jalur (mis. Duta UPITRA, Student Leadership Camp Forum).
    pub benefit_jalur: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct UploadBerkasDaftarUlangRequest {
    pub jenis_berkas: String, // 'SPKP', 'BERKAS_PERATURAN', 'SURAT_PERNYATAAN_BEASISWA', 'KTP', 'KK', 'TRANSKRIP_NILAI'
    #[validate(length(min = 1, message = "Nama berkas tidak boleh kosong"))]
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub file_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct VerifikasiBerkasDaftarUlangRequest {
    pub status: String, // 'VALID', 'INVALID'
    pub catatan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GenerateNimResponse {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub prodi_nama: String,
    pub nim_resmi: String,
    pub status_daftar_ulang: String,
    pub pesan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EksporSiakadItemDto {
    pub no: i32,
    pub nim: String,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub nik: String,
    pub tempat_lahir: String,
    pub tgl_lahir: String,
    pub jenis_kelamin: String,
    pub agama: String,
    pub alamat: String,
    pub no_hp: String,
    pub email: String,
    pub nama_ibu_kandung: String,
    pub nama_ayah: String,
    pub kode_prodi: String,
    pub nama_prodi: String,
    pub jenjang: String,
    pub jalur_masuk: String,
    pub tahun_masuk: String,
    pub skor_akhir: f64,
    pub tanggal_daftar_ulang: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MahasiswaDaftarUlangDto {
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub prodi_diterima: String,
    pub jenjang: String,
    pub status_kelulusan: String,
    pub status_daftar_ulang: String,
    pub nim_resmi: Option<String>,
    pub nomor_loa: Option<String>,
    pub status_ukt: String,
    pub total_berkas_valid: i64,
    pub total_berkas_pending: i64,
    /// Jumlah jenis berkas wajib yang unggahan terbarunya VALID.
    pub berkas_wajib_valid: i64,
    /// Jumlah jenis berkas wajib daftar ulang.
    pub berkas_wajib_total: i64,
    /// Semua berkas wajib valid: syarat penerbitan NIM.
    pub semua_berkas_valid: bool,
}

// ---------------------------------------------------------------------------
// Rumus penomoran NIM
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TokenNimInfo {
    pub token: String,
    pub keterangan: String,
    pub contoh: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LingkupNimInfo {
    pub kode: String,
    pub keterangan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RumusNimResponse {
    pub template: String,
    pub lingkup_urut: String,
    pub template_bawaan: String,
    pub diperbarui_oleh: Option<String>,
    pub diperbarui_pada: Option<DateTime<Utc>>,
    pub token: Vec<TokenNimInfo>,
    pub lingkup_pilihan: Vec<LingkupNimInfo>,
    pub panjang_maks: i32,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct SimpanRumusNimRequest {
    #[validate(length(min = 1, max = 100, message = "Rumus NIM 1-100 karakter"))]
    pub template: String,
    #[validate(length(min = 1, message = "Lingkup nomor urut wajib dipilih"))]
    pub lingkup_urut: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContohNimItem {
    pub prodi: String,
    pub kode_prodi: String,
    /// Hasil bila NIM diterbitkan sekarang (memakai nomor urut berikutnya)
    pub nim: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PratinjauRumusNimResponse {
    pub valid: bool,
    pub pesan: Option<String>,
    pub contoh: Vec<ContohNimItem>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct ArahkanPilihan2Request {
    pub pendaftar_id: Uuid,
    #[validate(length(min = 5, max = 500, message = "Catatan wajib diisi (5-500 karakter)"))]
    pub catatan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ArahkanPilihan2Response {
    pub pesan: String,
    pub prodi_baru: String,
    pub status_kelulusan: String,
    pub nomor_surat_loa: Option<String>,
    /// `true` bila hasil sudah langsung terlihat oleh calon di halaman kelulusan
    pub sudah_tampil_ke_calon: bool,
}
