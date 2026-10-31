use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SubmitBiodataRequest {
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,

    #[validate(length(min = 16, max = 16, message = "NIK harus tepat 16 digit"))]
    pub nik: String,

    #[validate(length(min = 2, message = "Tempat lahir tidak boleh kosong"))]
    pub tempat_lahir: String,

    pub tgl_lahir: NaiveDate,

    #[validate(length(min = 1, max = 1, message = "Jenis kelamin harus 'L' atau 'P'"))]
    pub jenis_kelamin: String,

    #[validate(length(min = 2, message = "Agama tidak boleh kosong"))]
    pub agama: String,

    #[validate(length(min = 5, message = "Alamat lengkap minimal 5 karakter"))]
    pub alamat_lengkap: String,

    #[validate(length(min = 2, message = "Nama orang tua/wali tidak boleh kosong"))]
    pub nama_ortu: String,

    #[validate(length(min = 10, max = 20, message = "Nomor HP orang tua harus 10-20 digit"))]
    pub no_hp_ortu: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct SubmitAkademikRequest {
    #[validate(length(min = 3, message = "Asal sekolah minimal 3 karakter"))]
    pub asal_sekolah: String,

    #[validate(length(min = 2, message = "Jurusan sekolah minimal 2 karakter"))]
    pub jurusan_sekolah: String,

    #[validate(range(
        min = 0.0,
        max = 100.0,
        message = "Nilai rapor rata-rata harus antara 0 - 100"
    ))]
    pub nilai_rapor_avg: f64,

    pub prodi_pilihan_1: Uuid,
    pub prodi_pilihan_2: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct VerifikasiBerkasRequest {
    pub berkas_id: Uuid,
    pub status_verifikasi: String, // 'VALID' or 'INVALID'
    pub catatan: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    pub catatan_verifikator: Option<String>,
    pub berkas: Vec<BerkasResponse>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Serialize, Validate, ToSchema)]
pub struct UploadBerkasRequest {
    #[validate(length(min = 2, message = "Jenis berkas wajib diisi"))]
    pub jenis_berkas: String,
    #[validate(length(min = 3, message = "Nama berkas minimal 3 karakter"))]
    pub file_name: String,
    #[validate(length(min = 3, message = "MIME type wajib diisi"))]
    pub mime_type: String,
    #[validate(range(
        min = 1,
        max = 5242880,
        message = "Ukuran berkas antara 1 byte sampai 5 MB"
    ))]
    pub file_size_bytes: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PresignedUrlResponse {
    pub berkas_id: Uuid,
    pub presigned_url: String,
    pub expires_in_seconds: u64,
}
