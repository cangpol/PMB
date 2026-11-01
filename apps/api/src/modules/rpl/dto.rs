use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

pub use super::model::{
    BerkasRplItem, PengalamanKerjaItem, RiwayatPendidikanItem, RplMataKuliahDiajukanDetail,
};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct CreateMataKuliahRequest {
    pub prodi_id: Uuid,
    #[validate(length(min = 2, message = "Kode mata kuliah minimal 2 karakter"))]
    pub kode_mk: String,
    #[validate(length(min = 3, message = "Nama mata kuliah minimal 3 karakter"))]
    pub nama_mk: String,
    #[validate(range(min = 1, max = 6, message = "SKS harus antara 1 sampai 6"))]
    pub sks: i32,
    #[validate(range(min = 1, max = 8, message = "Semester harus antara 1 sampai 8"))]
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct UpdateMataKuliahRequest {
    #[validate(length(min = 3, message = "Nama mata kuliah minimal 3 karakter"))]
    pub nama_mk: String,
    #[validate(range(min = 1, max = 6, message = "SKS harus antara 1 sampai 6"))]
    pub sks: i32,
    #[validate(range(min = 1, max = 8, message = "Semester harus antara 1 sampai 8"))]
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct MatakuliahDiajukanInput {
    pub mata_kuliah_id: Uuid,
    #[validate(length(min = 3, message = "Keterangan pemohon minimal 3 karakter"))]
    pub keterangan_pemohon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct SubmitRplPermohonanRequest {
    pub tipe_rpl: String, // 'TIPE_A' (Perolehan SKS/Kerja) atau 'TIPE_B' (Transfer SKS)
    pub riwayat_pendidikan: Vec<RiwayatPendidikanItem>,
    pub pengalaman_kerja: Vec<PengalamanKerjaItem>,
    pub berkas_pendukung: Vec<BerkasRplItem>,
    #[validate(length(min = 1, message = "Wajib memilih minimal 1 mata kuliah yang diajukan"))]
    pub mata_kuliah_list: Vec<MatakuliahDiajukanInput>,
    pub is_draft: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RplPermohonanDetailResponse {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub prodi_id: Uuid,
    pub prodi_nama: String,
    pub jenjang: String,
    pub tipe_rpl: String,
    pub status: String,
    pub riwayat_pendidikan: Vec<RiwayatPendidikanItem>,
    pub pengalaman_kerja: Vec<PengalamanKerjaItem>,
    pub berkas_pendukung: Vec<BerkasRplItem>,
    pub mata_kuliah_list: Vec<RplMataKuliahDiajukanDetail>,
    pub total_sks_diajukan: i32,
    pub total_sks_diakui: i32,
    pub ipk_konversi: f64,
    pub persentase_rekognisi: f64,
    pub asesor_id: Option<Uuid>,
    pub asesor_nama: Option<String>,
    pub catatan_asesor: Option<String>,
    pub catatan_admin: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub assessed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct AssignAsesorRequest {
    pub asesor_id: Uuid,
    pub catatan_admin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct PenilaianMataKuliahInput {
    pub mata_kuliah_id: Uuid,
    pub status_kelayakan: String, // 'MENUNGGU', 'DIAKUI', 'DITOLAK'
    pub nilai_transfer: Option<String>, // 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'
    pub catatan_asesor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Validate)]
pub struct SubmitPenilaianRplRequest {
    pub items: Vec<PenilaianMataKuliahInput>,
    pub catatan_asesor: Option<String>,
    pub finalisasi: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RplItemRekapDto {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub prodi_nama: String,
    pub jenjang: String,
    pub tipe_rpl: String,
    pub status: String,
    pub total_sks_diajukan: i32,
    pub total_sks_diakui: i32,
    pub ipk_konversi: f64,
    pub persentase_rekognisi: f64,
    pub asesor_id: Option<Uuid>,
    pub asesor_nama: Option<String>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub assessed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LaporanRplItemCourse {
    pub no: i32,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub status_kelayakan: String,
    pub nilai_transfer: String,
    pub bobot_nilai: f64,
    pub catatan_asesor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LaporanRplResponse {
    pub nomor_berita_acara: String,
    pub tanggal_berita_acara: String,
    pub permohonan_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub nik: String,
    pub prodi_nama: String,
    pub jenjang: String,
    pub fakultas: String,
    pub tipe_rpl: String,
    pub total_sks_diajukan: i32,
    pub total_sks_diakui: i32,
    pub ipk_konversi: f64,
    pub persentase_rekognisi: f64,
    pub asesor_nama: String,
    pub catatan_rekomendasi: String,
    pub daftar_mata_kuliah: Vec<LaporanRplItemCourse>,
}
