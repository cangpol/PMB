use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct StepperStep {
    pub key: String,
    pub judul: String,
    pub deskripsi: String,
    pub status: String, // 'SELESAI', 'AKTIF', 'MENUNGGU'
    pub nomor_urut: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CalonDashboardResponse {
    pub nomor_pendaftaran: Option<String>,
    pub status_pendaftaran: String,
    pub stepper: Vec<StepperStep>,
    pub tagihan_formulir_lunas: bool,
    pub berkas_terverifikasi: bool,
    pub ujian_selesai: bool,
    pub hasil_kelulusan: Option<String>,
    pub nim_resmi: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ProdiStat {
    pub nama_prodi: String,
    pub jenjang: String,
    pub total_peminat: i64,
    pub kuota: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FunnelStat {
    pub tahapan: String,
    pub jumlah: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AdminDashboardResponse {
    pub total_pendaftar: i64,
    pub total_berkas_diverifikasi: i64,
    pub total_lulus: i64,
    pub total_pendapatan_rupiah: i64,
    pub distribusi_prodi: Vec<ProdiStat>,
    pub funnel_tahapan: Vec<FunnelStat>,
}
