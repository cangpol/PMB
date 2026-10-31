use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

// ==========================================
// 1. DTO MESIN FORM DINAMIS (CALON MAHASISWA)
// ==========================================

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SubmitDinamisRequest {
    pub jalur_id: Option<Uuid>,
    pub gelombang_id: Option<Uuid>,
    pub prodi_pilihan_1: Option<Uuid>,
    pub prodi_pilihan_2: Option<Uuid>,
    pub data: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignUploadRequest {
    pub definisi_berkas_id: Uuid,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct KonfirmasiUploadRequest {
    pub definisi_berkas_id: Uuid,
    pub file_key: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct BerkasCalonItem {
    pub id: Option<Uuid>,
    pub definisi_berkas_id: Uuid,
    pub kode_berkas: String,
    pub nama: String,
    pub deskripsi: Option<String>,
    pub wajib: bool,
    pub tipe_file: String,
    pub ukuran_maks_kb: i32,
    pub urutan: i32,
    pub file_key: Option<String>,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub status_verifikasi: String, // BELUM_UNGGAH, PENDING, VALID, INVALID, DITERIMA, DITOLAK
    pub catatan: Option<String>,
    pub uploaded_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, FromRow)]
pub struct BerkasDetailItem {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub email: String,
    pub nama_jalur: String,
    pub definisi_berkas_id: Option<Uuid>,
    pub kode_berkas: String,
    pub nama_berkas: String,
    pub wajib: bool,
    pub file_key: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub status_verifikasi: String,
    pub catatan: Option<String>,
    pub uploaded_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct LangkahProgressItem {
    pub id: Uuid,
    pub kode_langkah: String,
    pub judul_langkah: String,
    pub deskripsi: Option<String>,
    pub tipe_langkah: String,
    pub urutan: i32,
    pub wajib: bool,
    pub status: String, // BELUM_MULAI, SEDANG_DIISI, SELESAI, TERVERIFIKASI
    pub bisa_diakses: bool,
    pub syarat_keterangan: Option<String>,
}

// ==========================================
// 2. DTO ADMIN FORM BUILDER
// ==========================================

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct CreateDefinisiFieldRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 100, message = "Kode field minimal 2 karakter"))]
    pub kode_field: String,
    #[validate(length(min = 2, max = 255, message = "Label field minimal 2 karakter"))]
    pub label: String,
    pub tipe_field: String,
    pub placeholder: Option<String>,
    pub wajib: bool,
    pub opsi: Option<serde_json::Value>,
    pub aturan_validasi: Option<serde_json::Value>,
    pub urutan: Option<i32>,
    pub kelompok: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct UpdateDefinisiFieldRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 255, message = "Label field minimal 2 karakter"))]
    pub label: String,
    pub tipe_field: String,
    pub placeholder: Option<String>,
    pub wajib: bool,
    pub opsi: Option<serde_json::Value>,
    pub aturan_validasi: Option<serde_json::Value>,
    pub urutan: i32,
    pub kelompok: String,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ReorderFieldsRequest {
    pub field_ids: Vec<Uuid>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct CreateDefinisiBerkasRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 100, message = "Kode berkas minimal 2 karakter"))]
    pub kode_berkas: String,
    #[validate(length(min = 2, max = 255, message = "Nama berkas minimal 2 karakter"))]
    pub nama: String,
    pub deskripsi: Option<String>,
    pub wajib: bool,
    pub tipe_file: Option<String>,
    pub ukuran_maks_kb: Option<i32>,
    pub urutan: Option<i32>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct UpdateDefinisiBerkasRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 255, message = "Nama berkas minimal 2 karakter"))]
    pub nama: String,
    pub deskripsi: Option<String>,
    pub wajib: bool,
    pub tipe_file: String,
    pub ukuran_maks_kb: i32,
    pub urutan: i32,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct CreateDefinisiLangkahRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 50, message = "Kode langkah minimal 2 karakter"))]
    pub kode_langkah: String,
    #[validate(length(min = 2, max = 255, message = "Judul langkah minimal 2 karakter"))]
    pub judul_langkah: String,
    pub deskripsi: Option<String>,
    pub tipe_langkah: String,
    pub urutan: Option<i32>,
    pub wajib: bool,
    pub syarat_lanjut: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct UpdateDefinisiLangkahRequest {
    pub jalur_id: Option<Uuid>,
    #[validate(length(min = 2, max = 255, message = "Judul langkah minimal 2 karakter"))]
    pub judul_langkah: String,
    pub deskripsi: Option<String>,
    pub tipe_langkah: String,
    pub urutan: i32,
    pub wajib: bool,
    pub syarat_lanjut: Option<serde_json::Value>,
    pub is_active: bool,
}

// ==========================================
// 3. DTO LEGACY & VERIFIKASI
// ==========================================

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct SubmitBiodataRequest {
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
    #[validate(length(equal = 16, message = "NIK harus 16 digit"))]
    pub nik: String,
    #[validate(length(min = 2, message = "Tempat lahir wajib diisi"))]
    pub tempat_lahir: String,
    pub tgl_lahir: NaiveDate,
    pub jenis_kelamin: String,
    pub agama: String,
    pub alamat_lengkap: String,
    pub nama_ortu: String,
    pub no_hp_ortu: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct SubmitAkademikRequest {
    #[validate(length(min = 3, message = "Asal sekolah minimal 3 karakter"))]
    pub asal_sekolah: String,
    pub jurusan_sekolah: String,
    #[validate(range(min = 0.0, max = 100.0, message = "Nilai rapor antara 0-100"))]
    pub nilai_rapor_avg: f64,
    pub prodi_pilihan_1: Uuid,
    pub prodi_pilihan_2: Option<Uuid>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UploadBerkasRequest {
    pub jenis_berkas: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignedUrlResponse {
    pub berkas_id: Uuid,
    pub presigned_url: String,
    pub expires_in_seconds: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct VerifikasiBerkasRequest {
    pub berkas_id: Uuid,
    pub status_verifikasi: String,
    pub catatan: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct BerkasResponse {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub jenis_berkas: String,
    pub file_key: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub status_verifikasi: String,
    pub catatan: Option<String>,
    pub uploaded_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PendaftarDetailResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub nama_lengkap: String,
    pub email: String,
    pub no_hp: String,
    pub nomor_pendaftaran: String,
    pub jalur_id: Uuid,
    pub nama_jalur: String,
    pub gelombang_id: Uuid,
    pub nama_gelombang: String,
    pub status_pendaftaran: String,
    pub nik: String,
    pub tempat_lahir: String,
    pub tgl_lahir: NaiveDate,
    pub jenis_kelamin: String,
    pub agama: String,
    pub alamat_lengkap: String,
    pub nama_ortu: String,
    pub no_hp_ortu: String,
    pub asal_sekolah: String,
    pub jurusan_sekolah: String,
    pub nilai_rapor_avg: f64,
    pub prodi_pilihan_1: Uuid,
    pub nama_prodi_1: String,
    pub prodi_pilihan_2: Option<Uuid>,
    pub nama_prodi_2: Option<String>,
    pub data_formulir: serde_json::Value,
    pub catatan_verifikator: Option<String>,
    pub berkas: Vec<BerkasResponse>,
    pub created_at: DateTime<Utc>,
}
