use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
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
    pub data_formulir: serde_json::Value,
    pub channel: String,
    pub catatan_verifikator: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct BerkasPendaftar {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub definisi_berkas_id: Option<Uuid>,
    pub jenis_berkas: String,
    pub file_key: String,
    pub file_name: String,
    pub mime_type: String,
    pub file_size_bytes: i64,
    pub status_verifikasi: String,
    pub catatan: Option<String>,
    pub uploaded_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
    pub verified_by: Option<Uuid>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DefinisiField {
    pub id: Uuid,
    pub jalur_id: Option<Uuid>,
    pub kode_field: String,
    pub label: String,
    pub tipe_field: String,
    pub placeholder: Option<String>,
    pub wajib: bool,
    pub opsi: serde_json::Value,
    pub aturan_validasi: serde_json::Value,
    pub urutan: i32,
    pub kelompok: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DefinisiBerkas {
    pub id: Uuid,
    pub jalur_id: Option<Uuid>,
    /// NULL = berlaku untuk semua prodi; terisi = khusus calon yang memilih prodi ini.
    pub prodi_id: Option<Uuid>,
    pub kode_berkas: String,
    pub nama: String,
    pub deskripsi: Option<String>,
    pub wajib: bool,
    pub tipe_file: String,
    pub ukuran_maks_kb: i32,
    pub urutan: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DefinisiLangkah {
    pub id: Uuid,
    pub jalur_id: Option<Uuid>,
    pub kode_langkah: String,
    pub judul_langkah: String,
    pub deskripsi: Option<String>,
    pub tipe_langkah: String,
    pub urutan: i32,
    pub wajib: bool,
    pub syarat_lanjut: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct StateLangkahPendaftar {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub langkah_id: Uuid,
    pub status: String,
    pub data_tambahan: serde_json::Value,
    pub selesai_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}
