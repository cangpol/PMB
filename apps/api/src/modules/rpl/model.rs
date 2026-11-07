use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct MataKuliah {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Riwayat pendidikan formal pemohon RPL.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RiwayatPendidikanItem {
    pub jenjang: String,
    pub nama_institusi: String,
    #[serde(default, alias = "jurusan")]
    pub program_studi: String,
    pub tahun_lulus: i32,
    #[serde(default, alias = "ipk")]
    pub ipk_nilai: Option<f64>,
    #[serde(default)]
    pub nomor_ijazah: Option<String>,
}

/// Pengalaman kerja pemohon RPL. Tanggal dalam format YYYY-MM-DD.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PengalamanKerjaItem {
    #[serde(alias = "instansi")]
    pub nama_perusahaan: String,
    #[serde(alias = "posisi")]
    pub jabatan: String,
    #[serde(default, alias = "deskripsi_tugas")]
    pub deskripsi_pekerjaan: String,
    pub tanggal_mulai: String,
    #[serde(default)]
    pub tanggal_selesai: Option<String>,
    #[serde(default)]
    pub masih_bekerja: bool,
}

/// Dokumen portofolio RPL yang diunggah ke object storage.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BerkasRplItem {
    /// Contoh: IJAZAH, TRANSKRIP, SERTIFIKAT, SURAT_KETERANGAN_KERJA, PORTOFOLIO, LAINNYA
    pub jenis_dokumen: String,
    pub nama_file: String,
    /// Kunci objek hasil presign `POST /api/rpl/berkas/presign`
    pub file_key: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub ukuran_bytes: i64,
    #[serde(default)]
    pub keterangan: Option<String>,
    /// URL unduh sementara (diisi server saat menampilkan; dikosongkan saat disimpan)
    #[serde(default)]
    pub url_unduh: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct RplPermohonan {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub tipe_rpl: String,
    pub riwayat_pendidikan: serde_json::Value,
    pub pengalaman_kerja: serde_json::Value,
    pub berkas_pendukung: serde_json::Value,
    pub status: String,
    pub asesor_id: Option<Uuid>,
    pub assigned_at: Option<DateTime<Utc>>,
    pub assigned_by: Option<Uuid>,
    pub catatan_asesor: Option<String>,
    pub catatan_admin: Option<String>,
    pub total_sks_diajukan: i32,
    pub total_sks_diakui: i32,
    pub ipk_konversi: f64,
    pub persentase_rekognisi: f64,
    pub submitted_at: Option<DateTime<Utc>>,
    pub assessed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct RplMataKuliahDiajukan {
    pub id: Uuid,
    pub permohonan_id: Uuid,
    pub mata_kuliah_id: Uuid,
    pub keterangan_pemohon: Option<String>,
    pub status_kelayakan: String,
    pub nilai_transfer: Option<String>,
    pub bobot_nilai: Option<f64>,
    pub catatan_asesor: Option<String>,
    pub assessed_at: Option<DateTime<Utc>>,
    pub assessed_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RplMataKuliahDiajukanDetail {
    pub id: Uuid,
    pub permohonan_id: Uuid,
    pub mata_kuliah_id: Uuid,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
    pub keterangan_pemohon: Option<String>,
    pub status_kelayakan: String,
    pub nilai_transfer: Option<String>,
    pub bobot_nilai: Option<f64>,
    pub catatan_asesor: Option<String>,
    pub assessed_at: Option<DateTime<Utc>>,
    pub assessed_by_nama: Option<String>,
}
