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
    pub metode_pembayaran: String, // 'VA_BCA', 'VA_BNI', 'VA_BRI', 'VA_MANDIRI', 'QRIS', 'VIRTUAL_ACCOUNT', etc.
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
    pub qr_string: Option<String>,
    pub qr_url: Option<String>,
    pub bukti_bayar_key: Option<String>,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub tgl_bayar: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ChargePaymentRequest {
    pub tagihan_id: Uuid,
    pub metode_pembayaran: String, // 'VA_BCA', 'VA_BNI', 'VA_BRI', 'VA_MANDIRI', 'VA_PERMATA', 'QRIS'
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TransaksiDetailResponse {
    pub id: Uuid,
    pub tagihan_id: Uuid,
    pub nomor_transaksi: String,
    pub gateway_provider: String,
    pub metode_pembayaran: String,
    pub nomor_va: Option<String>,
    pub qr_string: Option<String>,
    pub qr_url: Option<String>,
    pub nominal: i64,
    pub status: String,
    pub waktu_dibuat: DateTime<Utc>,
    pub waktu_berlaku_sampai: DateTime<Utc>,
    pub waktu_dibayar: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TagihanWithTransaksiResponse {
    pub id: Uuid,
    pub nomor_tagihan: String,
    pub pendaftar_id: Uuid,
    pub jenis_tagihan: String,
    pub nominal_asli: i64,
    pub diskon_voucher: i64,
    pub nominal_akhir: i64,
    pub voucher_id: Option<Uuid>,
    pub status: String, // 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'KEDALUWARSA', 'BATAL'
    pub tgl_terbit: DateTime<Utc>,
    pub tgl_jatuh_tempo: DateTime<Utc>,
    pub lunas_at: Option<DateTime<Utc>>,
    pub catatan: Option<String>,
    pub active_transaksi: Option<TransaksiDetailResponse>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MidtransWebhookPayload {
    pub order_id: String,
    pub status_code: String,
    pub gross_amount: String,
    pub signature_key: Option<String>,
    pub transaction_status: String,
    pub fraud_status: Option<String>,
    pub payment_type: Option<String>,
    pub transaction_time: Option<String>,
    pub settlement_time: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MockWebhookPayload {
    pub order_id: String,
    pub status: String, // 'SETTLEMENT', 'EXPIRED', 'FAILED'
    pub signature: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct FilterTransaksiKeuanganRequest {
    pub q: Option<String>,
    pub status: Option<String>,
    pub metode: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RingkasanKeuanganResponse {
    pub total_dana_masuk: i64,
    pub total_transaksi_lunas: i64,
    pub total_transaksi_pending: i64,
    pub total_transaksi_expired: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, sqlx::FromRow)]
pub struct AdminTransaksiItem {
    pub id: Uuid,
    pub tagihan_id: Uuid,
    pub nomor_tagihan: String,
    pub nomor_transaksi: String,
    pub nomor_pendaftaran: String,
    pub nama_pendaftar: String,
    pub jenis_tagihan: String,
    pub nominal_asli: i64,
    pub diskon_voucher: i64,
    pub nominal: i64,
    pub gateway_provider: String,
    pub metode_pembayaran: String,
    pub nomor_va: Option<String>,
    pub status: String,
    pub waktu_dibuat: DateTime<Utc>,
    pub waktu_dibayar: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListTransaksiAdminResponse {
    pub items: Vec<AdminTransaksiItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub ringkasan: RingkasanKeuanganResponse,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RekonsiliasiResponse {
    pub transaksi_id: Uuid,
    pub nomor_transaksi: String,
    pub status_sebelumnya: String,
    pub status_terkini: String,
    pub berhasil_disinkronkan: bool,
    pub pesan: String,
}
