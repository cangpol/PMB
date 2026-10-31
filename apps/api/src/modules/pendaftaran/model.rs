use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Pendaftar {
    pub id: Uuid,
    pub user_id: Uuid,
    pub nomor_pendaftaran: String,
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
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
    pub prodi_pilihan_2: Option<Uuid>,
    pub catatan_verifikator: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct BerkasPendaftar {
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
    pub verified_at: Option<DateTime<Utc>>,
}
