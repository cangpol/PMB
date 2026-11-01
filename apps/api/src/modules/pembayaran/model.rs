use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Voucher {
    pub id: Uuid,
    pub kode_voucher: String,
    pub tipe_diskon: String, // 'PERCENT' or 'NOMINAL'
    pub nilai_diskon: i64,
    pub kuota: i32,
    pub kuota_terpakai: i32,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Pembayaran {
    pub id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_tagihan: String,
    pub jenis_tagihan: String, // 'FORMULIR' or 'DAFTAR_ULANG'
    pub nominal_asli: i64,
    pub diskon: i64,
    pub nominal_akhir: i64,
    pub voucher_id: Option<Uuid>,
    pub status_pembayaran: String, // 'PENDING', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'KADALUARSA'
    pub metode_pembayaran: String, // 'VIRTUAL_ACCOUNT' or 'TRANSFER_MANUAL'
    pub nomor_va: Option<String>,
    pub bukti_bayar_key: Option<String>,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub tgl_bayar: Option<DateTime<Utc>>,
    pub verified_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct Tagihan {
    pub id: Uuid,
    pub nomor_tagihan: String,
    pub pendaftar_id: Uuid,
    pub jenis_tagihan: String, // 'FORMULIR', 'DAFTAR_ULANG_UKT', 'BIAYA_PENGEMBANGAN', 'LAINNYA'
    pub komponen_biaya_id: Option<Uuid>,
    pub nominal_asli: i64,
    pub diskon_voucher: i64,
    pub nominal_akhir: i64,
    pub voucher_id: Option<Uuid>,
    pub status: String, // 'MENUNGGU_PEMBAYARAN', 'LUNAS', 'KEDALUWARSA', 'BATAL'
    pub tgl_terbit: DateTime<Utc>,
    pub tgl_jatuh_tempo: DateTime<Utc>,
    pub lunas_at: Option<DateTime<Utc>>,
    pub catatan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct TransaksiPembayaran {
    pub id: Uuid,
    pub tagihan_id: Uuid,
    pub nomor_transaksi: String,
    pub gateway_provider: String, // 'MOCK', 'MIDTRANS', 'XENDIT', 'MANUAL_LOKET'
    pub gateway_reference_id: Option<String>,
    pub metode_pembayaran: String, // 'VA_BCA', 'VA_BNI', 'VA_BRI', 'VA_MANDIRI', 'VA_PERMATA', 'QRIS', 'TUNAI_LOKET', 'TRANSFER_MANUAL'
    pub nomor_va: Option<String>,
    pub qr_string: Option<String>,
    pub qr_url: Option<String>,
    pub nominal: i64,
    pub status: String, // 'PENDING', 'SETTLEMENT', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED'
    pub waktu_dibuat: DateTime<Utc>,
    pub waktu_berlaku_sampai: DateTime<Utc>,
    pub waktu_dibayar: Option<DateTime<Utc>>,
    pub raw_response: Option<serde_json::Value>,
    pub signature_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct WebhookLog {
    pub id: Uuid,
    pub gateway_provider: String,
    pub event_id: Option<String>,
    pub order_id: Option<String>,
    pub status_code: Option<String>,
    pub transaction_status: Option<String>,
    pub payload: serde_json::Value,
    pub signature: Option<String>,
    pub status_proses: String, // 'PROCESSED', 'IGNORED_DUPLICATE', 'FAILED_SIGNATURE', 'ERROR'
    pub pesan_log: Option<String>,
    pub created_at: DateTime<Utc>,
}
