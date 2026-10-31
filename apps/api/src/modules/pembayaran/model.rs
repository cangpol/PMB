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
