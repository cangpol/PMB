use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::model::{Pembayaran, Voucher},
};

#[derive(Clone)]
pub struct PembayaranRepository {
    pool: PgPool,
}

impl PembayaranRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_voucher_by_code(&self, code: &str) -> Result<Option<Voucher>, AppError> {
        let v = sqlx::query_as::<_, Voucher>(
            "SELECT id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai, tgl_kadaluarsa, is_active, created_at
             FROM vouchers WHERE UPPER(kode_voucher) = UPPER($1) AND is_active = TRUE"
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;
        Ok(v)
    }

    pub async fn increment_voucher_usage(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE vouchers SET kuota_terpakai = kuota_terpakai + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn find_by_pendaftar_id(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<Pembayaran>, AppError> {
        let list = sqlx::query_as::<_, Pembayaran>(
            "SELECT id, pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                    voucher_id, status_pembayaran, metode_pembayaran, nomor_va, bukti_bayar_key,
                    tgl_kadaluarsa, tgl_bayar, verified_by, created_at, updated_at
             FROM pembayaran WHERE pendaftar_id = $1 ORDER BY created_at DESC"
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Pembayaran>, AppError> {
        let p = sqlx::query_as::<_, Pembayaran>(
            "SELECT id, pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                    voucher_id, status_pembayaran, metode_pembayaran, nomor_va, bukti_bayar_key,
                    tgl_kadaluarsa, tgl_bayar, verified_by, created_at, updated_at
             FROM pembayaran WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn get_next_sequence(&self) -> Result<i64, AppError> {
        let row: (i64,) = sqlx::query_as("SELECT COALESCE(COUNT(*), 0) + 1 FROM pembayaran")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    pub async fn create_or_update_tagihan(
        &self,
        pendaftar_id: Uuid,
        nomor_tagihan: &str,
        jenis_tagihan: &str,
        nominal_asli: i64,
        diskon: i64,
        nominal_akhir: i64,
        voucher_id: Option<Uuid>,
        metode_pembayaran: &str,
        nomor_va: Option<&str>,
        tgl_kadaluarsa: chrono::DateTime<chrono::Utc>,
    ) -> Result<Pembayaran, AppError> {
        let p = sqlx::query_as::<_, Pembayaran>(
            "INSERT INTO pembayaran (
                pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                voucher_id, status_pembayaran, metode_pembayaran, nomor_va, tgl_kadaluarsa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10)
            RETURNING id, pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                      voucher_id, status_pembayaran, metode_pembayaran, nomor_va, bukti_bayar_key,
                      tgl_kadaluarsa, tgl_bayar, verified_by, created_at, updated_at"
        )
        .bind(pendaftar_id)
        .bind(nomor_tagihan)
        .bind(jenis_tagihan)
        .bind(nominal_asli)
        .bind(diskon)
        .bind(nominal_akhir)
        .bind(voucher_id)
        .bind(metode_pembayaran)
        .bind(nomor_va)
        .bind(tgl_kadaluarsa)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn update_status_bayar(
        &self,
        id: Uuid,
        status: &str,
        verified_by: Option<Uuid>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE pembayaran
             SET status_pembayaran = $1,
                 tgl_bayar = CASE WHEN $1 = 'LUNAS' THEN NOW() ELSE tgl_bayar END,
                 verified_by = $2,
                 updated_at = NOW()
             WHERE id = $3",
        )
        .bind(status)
        .bind(verified_by)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all(&self) -> Result<Vec<Pembayaran>, AppError> {
        let list = sqlx::query_as::<_, Pembayaran>(
            "SELECT id, pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon, nominal_akhir,
                    voucher_id, status_pembayaran, metode_pembayaran, nomor_va, bukti_bayar_key,
                    tgl_kadaluarsa, tgl_bayar, verified_by, created_at, updated_at
             FROM pembayaran ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }
}
