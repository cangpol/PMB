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
    pub va_number: Option<String>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct UploadBerkasDaftarUlangRequest {
    pub jenis_berkas: String, // 'SURAT_PERNYATAAN_MABA', 'SURAT_BEBAS_NARKOBA', 'AKTA_KELAHIRAN', 'IJAZAH_LEGALISIR'
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
}
