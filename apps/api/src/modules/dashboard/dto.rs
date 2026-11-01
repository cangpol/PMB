use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StepperStep {
    pub key: String,
    pub judul: String,
    pub deskripsi: String,
    pub status: String, // 'SELESAI', 'AKTIF', 'MENUNGGU'
    pub nomor_urut: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProdiStat {
    pub nama_prodi: String,
    pub jenjang: String,
    pub total_peminat: i64,
    pub kuota: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FunnelStat {
    pub tahapan: String,
    pub jumlah: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AdminDashboardResponse {
    pub total_pendaftar: i64,
    pub total_berkas_diverifikasi: i64,
    pub total_lulus: i64,
    pub total_pendapatan_rupiah: i64,
    pub distribusi_prodi: Vec<ProdiStat>,
    pub funnel_tahapan: Vec<FunnelStat>,
}

// =============================================================================
// EXECUTIVE ANALYTICS & FILTER DTOS
// =============================================================================

#[derive(Debug, Clone, Deserialize, IntoParams, ToSchema)]
pub struct DashboardFilterQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub gelombang_id: Option<Uuid>,
    pub jalur_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TrenHarianStat {
    pub tanggal: String,
    pub pendaftar: i64,
    pub terverifikasi: i64,
    pub bayar: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DistribusiProdiStat {
    pub prodi_id: Uuid,
    pub kode_prodi: String,
    pub nama_prodi: String,
    pub jenjang: String,
    pub kuota: i32,
    pub total_peminat: i64,
    pub total_lulus: i64,
    pub total_daftar_ulang: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DistribusiJalurStat {
    pub jalur_id: Uuid,
    pub nama_jalur: String,
    pub total_pendaftar: i64,
    pub total_lulus: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusPendaftaranStat {
    pub status: String,
    pub label: String,
    pub jumlah: i64,
    pub persentase: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecutiveDashboardResponse {
    pub total_pendaftar: i64,
    pub total_berkas_diverifikasi: i64,
    pub total_peserta_ujian: i64,
    pub total_lulus: i64,
    pub total_registrasi_nim: i64,
    pub total_pendapatan_rupiah: i64,
    pub total_piutang_rupiah: i64,
    pub tren_harian: Vec<TrenHarianStat>,
    pub distribusi_prodi: Vec<DistribusiProdiStat>,
    pub distribusi_jalur: Vec<DistribusiJalurStat>,
    pub status_pendaftaran: Vec<StatusPendaftaranStat>,
    pub funnel_tahapan: Vec<FunnelStat>,
}
