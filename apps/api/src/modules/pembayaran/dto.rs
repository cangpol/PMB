use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CekVoucherRequest {
    #[validate(length(min = 3, message = "Kode voucher minimal 3 karakter"))]
    pub kode_voucher: String,
    pub nominal_asli: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CekVoucherResponse {
    pub voucher_id: Uuid,
    pub kode_voucher: String,
    pub tipe_diskon: String,
    pub nilai_diskon: i64,
    pub jumlah_potongan: i64,
    pub nominal_setelah_diskon: i64,
    pub pesan_validasi: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PilihMetodeRequest {
    pub metode_pembayaran: String, // 'VIRTUAL_ACCOUNT' or 'TRANSFER_MANUAL'
    pub kode_voucher: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct KonfirmasiBayarRequest {
    pub pembayaran_id: Uuid,
    pub status: String, // 'LUNAS' or 'DITOLAK'
    pub catatan: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PembayaranDetailResponse {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_tagihan: String,
    pub jenis_tagihan: String,
    pub nominal_asli: i64,
    pub diskon: i64,
    pub nominal_akhir: i64,
    pub voucher_id: Option<Uuid>,
    pub status_pembayaran: String,
    pub metode_pembayaran: String,
    pub nomor_va: Option<String>,
    pub bukti_bayar_key: Option<String>,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub tgl_bayar: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
