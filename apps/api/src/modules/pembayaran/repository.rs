use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::{
        dto::{
            AdminTransaksiItem, FilterTransaksiKeuanganRequest, ListTransaksiAdminResponse,
            RingkasanKeuanganResponse,
        },
        model::{Pembayaran, Tagihan, TransaksiPembayaran, Voucher},
    },
};

#[derive(Clone)]
pub struct PembayaranRepository {
    pool: PgPool,
}

impl PembayaranRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ==========================================
    // 1. MATRIKS BIAYA & VOUCHER
    // ==========================================

    pub async fn get_biaya_matriks(
        &self,
        prodi_id: Uuid,
        jalur_id: Uuid,
        gelombang_id: Uuid,
    ) -> Result<Option<i64>, AppError> {
        let nominal: Option<(i64,)> = sqlx::query_as(
            "SELECT COALESCE(SUM(nominal), 0)::bigint
             FROM matriks_biaya 
             WHERE prodi_id = $1 AND jalur_id = $2 AND gelombang_id = $3",
        )
        .bind(prodi_id)
        .bind(jalur_id)
        .bind(gelombang_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(nominal.map(|r| r.0).filter(|&v| v > 0))
    }

    /// Biaya formulir per jalur masuk (default 250.000 bila jalur tidak ditemukan).
    pub async fn get_biaya_formulir_jalur(&self, jalur_id: Uuid) -> Result<i64, AppError> {
        let nominal: Option<i64> =
            sqlx::query_scalar("SELECT biaya_formulir FROM jalur_masuk WHERE id = $1")
                .bind(jalur_id)
                .fetch_optional(&self.pool)
                .await?;
        Ok(nominal.unwrap_or(250_000))
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

    #[allow(clippy::type_complexity)]
    pub async fn find_voucher_with_limits(
        &self,
        code: &str,
    ) -> Result<Option<(Voucher, Option<Uuid>, Option<Uuid>)>, AppError> {
        let row: Option<(Uuid, String, String, i64, i32, i32, DateTime<Utc>, bool, DateTime<Utc>, Option<Uuid>, Option<Uuid>)> = sqlx::query_as(
            "SELECT id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai, tgl_kadaluarsa, is_active, created_at, batas_jalur_id, batas_prodi_id
             FROM vouchers WHERE UPPER(kode_voucher) = UPPER($1) AND is_active = TRUE"
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| {
            let v = Voucher {
                id: r.0,
                kode_voucher: r.1,
                tipe_diskon: r.2,
                nilai_diskon: r.3,
                kuota: r.4,
                kuota_terpakai: r.5,
                tgl_kadaluarsa: r.6,
                is_active: r.7,
                created_at: r.8,
            };
            (v, r.9, r.10)
        }))
    }

    pub async fn claim_voucher_atomic(&self, id: Uuid) -> Result<bool, AppError> {
        let res = sqlx::query(
            "UPDATE vouchers 
             SET kuota_terpakai = kuota_terpakai + 1 
             WHERE id = $1 AND kuota_terpakai < kuota AND is_active = TRUE AND tgl_kadaluarsa > NOW()"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(res.rows_affected() > 0)
    }

    pub async fn increment_voucher_usage(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE vouchers SET kuota_terpakai = kuota_terpakai + 1 WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ==========================================
    // 2. TAGIHAN (MASTER INVOICE)
    // ==========================================

    pub async fn get_next_sequence(&self) -> Result<i64, AppError> {
        // SEQUENCE: aman dari bentrok saat ada baris terhapus / pengiriman bersamaan
        let row: (i64,) = sqlx::query_as("SELECT nextval('seq_nomor_tagihan')")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    pub async fn create_tagihan(
        &self,
        pendaftar_id: Uuid,
        nomor_tagihan: &str,
        jenis_tagihan: &str,
        nominal_asli: i64,
        diskon_voucher: i64,
        nominal_akhir: i64,
        voucher_id: Option<Uuid>,
        tgl_jatuh_tempo: DateTime<Utc>,
    ) -> Result<Tagihan, AppError> {
        let mut tx = self.pool.begin().await?;

        // Selalu terbit sebagai belum lunas. Tagihan Rp 0 dilunasi pemanggil lewat
        // settle_pembayaran_idempoten, satu-satunya jalur yang juga memajukan alur
        // pendaftar; bila di sini langsung LUNAS, pelunasan dianggap sudah terjadi
        // dan calon tertahan di status SUBMITTED.
        let status = "MENUNGGU_PEMBAYARAN";
        let lunas_at: Option<DateTime<Utc>> = None;

        let t = sqlx::query_as::<_, Tagihan>(
            "INSERT INTO tagihan (
                pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon_voucher,
                nominal_akhir, voucher_id, status, tgl_terbit, tgl_jatuh_tempo, lunas_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
            RETURNING *",
        )
        .bind(pendaftar_id)
        .bind(nomor_tagihan)
        .bind(jenis_tagihan)
        .bind(nominal_asli)
        .bind(diskon_voucher)
        .bind(nominal_akhir)
        .bind(voucher_id)
        .bind(status)
        .bind(tgl_jatuh_tempo)
        .bind(lunas_at)
        .fetch_one(&mut *tx)
        .await?;

        // Sinkronisasi ke tabel legacy `pembayaran`
        let _ = sqlx::query(
            "INSERT INTO pembayaran (
                id, pendaftar_id, nomor_tagihan, jenis_tagihan, nominal_asli, diskon,
                nominal_akhir, voucher_id, status_pembayaran, metode_pembayaran, tgl_kadaluarsa, tgl_bayar
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'VIRTUAL_ACCOUNT', $10, $11)
            ON CONFLICT (nomor_tagihan) DO UPDATE 
            SET status_pembayaran = EXCLUDED.status_pembayaran,
                nominal_akhir = EXCLUDED.nominal_akhir,
                tgl_bayar = EXCLUDED.tgl_bayar"
        )
        .bind(t.id)
        .bind(pendaftar_id)
        .bind(nomor_tagihan)
        .bind(jenis_tagihan)
        .bind(nominal_asli)
        .bind(diskon_voucher)
        .bind(nominal_akhir)
        .bind(voucher_id)
        .bind("PENDING")
        .bind(tgl_jatuh_tempo)
        .bind(lunas_at)
        .execute(&mut *tx)
        .await;

        tx.commit().await?;
        Ok(t)
    }

    pub async fn find_tagihan_by_id(&self, id: Uuid) -> Result<Option<Tagihan>, AppError> {
        let t = sqlx::query_as::<_, Tagihan>("SELECT * FROM tagihan WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(t)
    }

    pub async fn find_tagihan_by_nomor(&self, nomor: &str) -> Result<Option<Tagihan>, AppError> {
        let t = sqlx::query_as::<_, Tagihan>("SELECT * FROM tagihan WHERE nomor_tagihan = $1")
            .bind(nomor)
            .fetch_optional(&self.pool)
            .await?;
        Ok(t)
    }

    pub async fn find_tagihan_by_pendaftar_id(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<Tagihan>, AppError> {
        let list = sqlx::query_as::<_, Tagihan>(
            "SELECT * FROM tagihan WHERE pendaftar_id = $1 ORDER BY created_at DESC",
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    // ==========================================
    // 3. TRANSAKSI PEMBAYARAN GATEWAY
    // ==========================================

    pub async fn create_transaksi(
        &self,
        tagihan_id: Uuid,
        nomor_transaksi: &str,
        gateway_provider: &str,
        gateway_reference_id: Option<&str>,
        metode_pembayaran: &str,
        nomor_va: Option<&str>,
        qr_string: Option<&str>,
        qr_url: Option<&str>,
        nominal: i64,
        waktu_berlaku_sampai: DateTime<Utc>,
        raw_response: &serde_json::Value,
    ) -> Result<TransaksiPembayaran, AppError> {
        let tx = sqlx::query_as::<_, TransaksiPembayaran>(
            "INSERT INTO transaksi_pembayaran (
                tagihan_id, nomor_transaksi, gateway_provider, gateway_reference_id,
                metode_pembayaran, nomor_va, qr_string, qr_url, nominal, status,
                waktu_dibuat, waktu_berlaku_sampai, raw_response
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', NOW(), $10, $11)
            RETURNING *",
        )
        .bind(tagihan_id)
        .bind(nomor_transaksi)
        .bind(gateway_provider)
        .bind(gateway_reference_id)
        .bind(metode_pembayaran)
        .bind(nomor_va)
        .bind(qr_string)
        .bind(qr_url)
        .bind(nominal)
        .bind(waktu_berlaku_sampai)
        .bind(raw_response)
        .fetch_one(&self.pool)
        .await?;

        // Update nomor_va di legacy pembayaran jika metode VA
        if let Some(va) = nomor_va {
            let _ = sqlx::query("UPDATE pembayaran SET nomor_va = $1 WHERE id = $2")
                .bind(va)
                .bind(tagihan_id)
                .execute(&self.pool)
                .await;
        }

        Ok(tx)
    }

    pub async fn find_active_transaksi_by_tagihan_id(
        &self,
        tagihan_id: Uuid,
    ) -> Result<Option<TransaksiPembayaran>, AppError> {
        let tx = sqlx::query_as::<_, TransaksiPembayaran>(
            "SELECT * FROM transaksi_pembayaran 
             WHERE tagihan_id = $1 
             ORDER BY created_at DESC LIMIT 1",
        )
        .bind(tagihan_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(tx)
    }

    pub async fn find_transaksi_by_nomor(
        &self,
        nomor: &str,
    ) -> Result<Option<TransaksiPembayaran>, AppError> {
        let tx = sqlx::query_as::<_, TransaksiPembayaran>(
            "SELECT * FROM transaksi_pembayaran WHERE nomor_transaksi = $1",
        )
        .bind(nomor)
        .fetch_optional(&self.pool)
        .await?;
        Ok(tx)
    }

    pub async fn find_transaksi_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<TransaksiPembayaran>, AppError> {
        let tx = sqlx::query_as::<_, TransaksiPembayaran>(
            "SELECT * FROM transaksi_pembayaran WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(tx)
    }

    // ==========================================
    // 4. PEMROSESAN WEBHOOK IDEMPOTEN & ATOMIK
    // ==========================================

    /// Rekonsiliasi menyeluruh tahap bayar formulir (dijalankan saat server mulai):
    /// jalur gratis yang belum dilunasi dan tagihan lunas yang statusnya tertinggal.
    /// Mengembalikan jumlah pendaftar yang dimajukan.
    pub async fn rekonsiliasi_alur_pembayaran(&self) -> Result<usize, AppError> {
        let kandidat: Vec<(Uuid, Uuid, String)> = sqlx::query_as(
            "SELECT id, jalur_id, status_pendaftaran FROM pendaftar
             WHERE status_pendaftaran IN ('SUBMITTED', 'MENUNGGU_VERIFIKASI_BAYAR', 'PEMBAYARAN_DITOLAK')",
        )
        .fetch_all(&self.pool)
        .await?;
        let mut jumlah = 0;
        for (id, jalur_id, st) in kandidat {
            // Kegagalan satu pendaftar tidak boleh menghentikan pemeriksaan yang lain
            let hasil = async {
                Ok::<bool, AppError>(
                    self.sinkron_formulir_lunas(id).await?
                        || (st == "SUBMITTED" && self.lunasi_formulir_gratis(id, jalur_id).await?),
                )
            }
            .await;
            match hasil {
                Ok(true) => jumlah += 1,
                Ok(false) => {}
                Err(e) => tracing::warn!("Rekonsiliasi pendaftar {id} gagal: {e}"),
            }
        }
        Ok(jumlah)
    }

    /// Perbaikan otomatis: tagihan formulir sudah LUNAS tetapi status pendaftar
    /// tertinggal (mis. data lama sebelum perbaikan) -> majukan alurnya.
    /// Mengembalikan true bila ada status yang dimajukan.
    pub async fn sinkron_formulir_lunas(&self, pendaftar_id: Uuid) -> Result<bool, AppError> {
        let lunas: Option<(String, i64, Option<DateTime<Utc>>)> = sqlx::query_as(
            "SELECT nomor_tagihan, nominal_akhir, lunas_at FROM tagihan
             WHERE pendaftar_id = $1 AND jenis_tagihan = 'FORMULIR' AND status = 'LUNAS'
             ORDER BY tgl_terbit DESC LIMIT 1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        let Some((nomor, nominal, lunas_at)) = lunas else {
            return Ok(false);
        };
        let waktu = lunas_at.unwrap_or_else(Utc::now);
        let mut conn = self.pool.acquire().await?;
        majukan_alur_formulir_lunas(
            &mut conn,
            pendaftar_id,
            &serde_json::json!({ "order_id": nomor, "nominal": nominal, "paid_at": waktu }),
            waktu,
        )
        .await
    }

    /// Jalur berbiaya formulir Rp 0: terbitkan tagihan Rp 0 lalu lunasi, sehingga
    /// calon langsung lanjut ke unggah berkas tanpa transfer & bukti. Idempoten.
    /// Mengembalikan true bila biaya formulir calon memang gratis (sudah lunas).
    pub async fn lunasi_formulir_gratis(
        &self,
        pendaftar_id: Uuid,
        jalur_id: Uuid,
    ) -> Result<bool, AppError> {
        if self.get_biaya_formulir_jalur(jalur_id).await? != 0 {
            return Ok(false);
        }
        let ada = self
            .find_tagihan_by_pendaftar_id(pendaftar_id)
            .await?
            .into_iter()
            .find(|t| {
                t.jenis_tagihan == "FORMULIR"
                    && !matches!(t.status.as_str(), "KEDALUWARSA" | "BATAL")
            });
        let nomor = match ada {
            Some(t) if t.status == "LUNAS" => {
                self.sinkron_formulir_lunas(pendaftar_id).await?;
                return Ok(true);
            }
            Some(t) => t.nomor_tagihan,
            None => {
                let nomor = format!("INV-2026-{:05}", self.get_next_sequence().await?);
                self.create_tagihan(
                    pendaftar_id,
                    &nomor,
                    "FORMULIR",
                    0,
                    0,
                    0,
                    None,
                    Utc::now() + chrono::Duration::days(3),
                )
                .await?;
                nomor
            }
        };
        self.settle_pembayaran_idempoten(&nomor, Utc::now()).await?;
        Ok(true)
    }

    pub async fn settle_pembayaran_idempoten(
        &self,
        order_id: &str,
        paid_at: DateTime<Utc>,
    ) -> Result<(bool, Option<Uuid>), AppError> {
        let mut db_tx = self.pool.begin().await?;
        let lunas = settle_dalam_tx(&mut db_tx, order_id, paid_at).await?;
        db_tx.commit().await?;

        match lunas {
            Some(tagihan) => {
                self.notifikasi_lunas(&tagihan).await;
                Ok((true, Some(tagihan.pendaftar_id)))
            }
            None => Ok((false, None)),
        }
    }

    /// Email konfirmasi setelah tagihan lunas (dipanggil setelah commit).
    pub async fn notifikasi_lunas(&self, tagihan: &Tagihan) {
        let (subject, pesan) = pesan_lunas(tagihan);
        crate::modules::pendaftaran::alur::kirim_notifikasi(
            &self.pool,
            tagihan.pendaftar_id,
            subject,
            &pesan,
            "PEMBAYARAN_LUNAS",
        )
        .await;
    }
}

/// Inti pelunasan idempoten di dalam transaksi pemanggil.
/// Mengembalikan `Some(tagihan)` bila tagihan baru saja lunas, `None` bila sudah lunas sebelumnya.
pub async fn settle_dalam_tx(
    db_tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    order_id: &str,
    paid_at: DateTime<Utc>,
) -> Result<Option<Tagihan>, AppError> {
    // 1. Lock transaksi berdasarkan nomor_transaksi atau nomor_tagihan
    let trx: Option<TransaksiPembayaran> = sqlx::query_as(
        "SELECT * FROM transaksi_pembayaran 
             WHERE nomor_transaksi = $1 
             FOR UPDATE",
    )
    .bind(order_id)
    .fetch_optional(&mut **db_tx)
    .await?;

    let (tagihan_id, trx_id) = match trx {
        Some(ref t) => {
            if t.status == "SETTLEMENT" || t.status == "PAID" {
                // Idempotent: transaksi ini sudah lunas sebelumnya
                return Ok(None);
            }
            (t.tagihan_id, Some(t.id))
        }
        None => {
            // Cari apakah order_id adalah nomor_tagihan langsung
            let tag: Option<Tagihan> =
                sqlx::query_as("SELECT * FROM tagihan WHERE nomor_tagihan = $1 FOR UPDATE")
                    .bind(order_id)
                    .fetch_optional(&mut **db_tx)
                    .await?;

            match tag {
                Some(tg) => {
                    if tg.status == "LUNAS" {
                        return Ok(None);
                    }
                    (tg.id, None)
                }
                None => {
                    return Err(AppError::NotFound(format!(
                        "Transaksi atau tagihan dengan order_id {} tidak ditemukan",
                        order_id
                    )));
                }
            }
        }
    };

    // 2. Update status transaksi jika ada
    if let Some(tid) = trx_id {
        sqlx::query(
            "UPDATE transaksi_pembayaran 
                 SET status = 'SETTLEMENT', waktu_dibayar = $1, updated_at = NOW() 
                 WHERE id = $2",
        )
        .bind(paid_at)
        .bind(tid)
        .execute(&mut **db_tx)
        .await?;
    }

    // 3. Update status tagihan
    let tagihan = sqlx::query_as::<_, Tagihan>(
        "UPDATE tagihan 
             SET status = 'LUNAS', lunas_at = $1, updated_at = NOW() 
             WHERE id = $2 
             RETURNING *",
    )
    .bind(paid_at)
    .bind(tagihan_id)
    .fetch_one(&mut **db_tx)
    .await?;

    // 4. Update tabel legacy `pembayaran`
    let _ = sqlx::query(
        "UPDATE pembayaran 
             SET status_pembayaran = 'LUNAS', tgl_bayar = $1, updated_at = NOW() 
             WHERE id = $2 OR nomor_tagihan = $3",
    )
    .bind(paid_at)
    .bind(tagihan_id)
    .bind(&tagihan.nomor_tagihan)
    .execute(&mut **db_tx)
    .await;

    // 5. Lanjutkan alur pendaftar sesuai jenis tagihan (satu tempat untuk semua jalur lunas:
    //    webhook gateway, persetujuan bukti bayar, konfirmasi loket)
    lanjutkan_alur_setelah_lunas(db_tx, &tagihan, order_id, paid_at).await?;

    Ok(Some(tagihan))
}

impl PembayaranRepository {
    pub async fn expire_pembayaran_idempoten(&self, order_id: &str) -> Result<bool, AppError> {
        let mut db_tx = self.pool.begin().await?;

        let trx: Option<TransaksiPembayaran> = sqlx::query_as(
            "SELECT * FROM transaksi_pembayaran WHERE nomor_transaksi = $1 FOR UPDATE",
        )
        .bind(order_id)
        .fetch_optional(&mut *db_tx)
        .await?;

        if let Some(t) = trx {
            if t.status == "SETTLEMENT" || t.status == "PAID" {
                // Jika sudah lunas, jangan biarkan notifikasi expire membatalkan status lunas
                db_tx.commit().await?;
                return Ok(false);
            }

            sqlx::query(
                "UPDATE transaksi_pembayaran SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1"
            )
            .bind(t.id)
            .execute(&mut *db_tx)
            .await?;

            sqlx::query(
                "UPDATE tagihan SET status = 'KEDALUWARSA', updated_at = NOW() WHERE id = $1 AND status != 'LUNAS'"
            )
            .bind(t.tagihan_id)
            .execute(&mut *db_tx)
            .await?;

            sqlx::query(
                "UPDATE pembayaran SET status_pembayaran = 'KADALUARSA', updated_at = NOW() WHERE id = $1 AND status_pembayaran != 'LUNAS'"
            )
            .bind(t.tagihan_id)
            .execute(&mut *db_tx)
            .await?;

            db_tx.commit().await?;
            return Ok(true);
        }

        db_tx.rollback().await?;
        Ok(false)
    }

    pub async fn log_webhook(
        &self,
        provider: &str,
        event_id: Option<&str>,
        order_id: Option<&str>,
        status_code: Option<&str>,
        transaction_status: Option<&str>,
        payload: &serde_json::Value,
        signature: Option<&str>,
        status_proses: &str,
        pesan_log: Option<&str>,
    ) -> Result<(), AppError> {
        let _ = sqlx::query(
            "INSERT INTO webhook_log (
                gateway_provider, event_id, order_id, status_code, transaction_status,
                payload, signature, status_proses, pesan_log
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(provider)
        .bind(event_id)
        .bind(order_id)
        .bind(status_code)
        .bind(transaction_status)
        .bind(payload)
        .bind(signature)
        .bind(status_proses)
        .bind(pesan_log)
        .execute(&self.pool)
        .await;

        Ok(())
    }

    // ==========================================
    // 5. ADMIN & KEUANGAN (QUERY BERFILTER & EKSPOR)
    // ==========================================

    pub async fn list_transaksi_keuangan(
        &self,
        filter: &FilterTransaksiKeuanganRequest,
    ) -> Result<ListTransaksiAdminResponse, AppError> {
        let page = filter.page.unwrap_or(1).max(1);
        let limit = filter.limit.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * limit;

        let q_pattern = filter.q.as_ref().map(|s| format!("%{}%", s.trim()));
        let status_filter = filter
            .status
            .as_ref()
            .filter(|s| !s.is_empty() && s.as_str() != "SEMUA");
        let metode_filter = filter
            .metode
            .as_ref()
            .filter(|s| !s.is_empty() && s.as_str() != "SEMUA");

        let items: Vec<AdminTransaksiItem> = sqlx::query_as(
            "SELECT 
                t.id,
                t.id as tagihan_id,
                t.nomor_tagihan,
                COALESCE(tx.nomor_transaksi, t.nomor_tagihan) as nomor_transaksi,
                p.nomor_pendaftaran,
                u.nama_lengkap as nama_pendaftar,
                t.jenis_tagihan,
                t.nominal_asli,
                t.diskon_voucher,
                t.nominal_akhir as nominal,
                COALESCE(tx.gateway_provider, 'MANUAL_LOKET') as gateway_provider,
                COALESCE(tx.metode_pembayaran, 'TUNAI_LOKET') as metode_pembayaran,
                tx.nomor_va,
                t.status,
                t.created_at as waktu_dibuat,
                t.lunas_at as waktu_dibayar
             FROM tagihan t
             JOIN pendaftar p ON p.id = t.pendaftar_id
             JOIN users u ON u.id = p.user_id
             LEFT JOIN LATERAL (
                 SELECT * FROM transaksi_pembayaran WHERE tagihan_id = t.id ORDER BY created_at DESC LIMIT 1
             ) tx ON true
             WHERE ($1::text IS NULL OR (
                 t.nomor_tagihan ILIKE $1 OR 
                 p.nomor_pendaftaran ILIKE $1 OR 
                 u.nama_lengkap ILIKE $1 OR
                 tx.nomor_va ILIKE $1
             ))
             AND ($2::text IS NULL OR t.status = $2)
             AND ($3::text IS NULL OR tx.metode_pembayaran = $3)
             ORDER BY t.created_at DESC
             LIMIT $4 OFFSET $5"
        )
        .bind(q_pattern.as_deref())
        .bind(status_filter.map(|s| s.as_str()))
        .bind(metode_filter.map(|s| s.as_str()))
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: (i64,) = sqlx::query_as(
            "SELECT COUNT(t.id)
             FROM tagihan t
             JOIN pendaftar p ON p.id = t.pendaftar_id
             JOIN users u ON u.id = p.user_id
             LEFT JOIN LATERAL (
                 SELECT * FROM transaksi_pembayaran WHERE tagihan_id = t.id ORDER BY created_at DESC LIMIT 1
             ) tx ON true
             WHERE ($1::text IS NULL OR (
                 t.nomor_tagihan ILIKE $1 OR 
                 p.nomor_pendaftaran ILIKE $1 OR 
                 u.nama_lengkap ILIKE $1 OR
                 tx.nomor_va ILIKE $1
             ))
             AND ($2::text IS NULL OR t.status = $2)
             AND ($3::text IS NULL OR tx.metode_pembayaran = $3)"
        )
        .bind(q_pattern.as_deref())
        .bind(status_filter.map(|s| s.as_str()))
        .bind(metode_filter.map(|s| s.as_str()))
        .fetch_one(&self.pool)
        .await?;

        // Agregat Ringkasan Keuangan
        let ringkasan_row: (i64, i64, i64, i64) = sqlx::query_as(
            "SELECT 
                COALESCE(SUM(CASE WHEN status = 'LUNAS' THEN nominal_akhir ELSE 0 END), 0)::bigint as total_dana,
                COUNT(CASE WHEN status = 'LUNAS' THEN 1 END) as total_lunas,
                COUNT(CASE WHEN status = 'MENUNGGU_PEMBAYARAN' THEN 1 END) as total_pending,
                COUNT(CASE WHEN status = 'KEDALUWARSA' THEN 1 END) as total_expired
             FROM tagihan"
        )
        .fetch_one(&self.pool)
        .await?;

        let ringkasan = RingkasanKeuanganResponse {
            total_dana_masuk: ringkasan_row.0,
            total_transaksi_lunas: ringkasan_row.1,
            total_transaksi_pending: ringkasan_row.2,
            total_transaksi_expired: ringkasan_row.3,
        };

        Ok(ListTransaksiAdminResponse {
            items,
            total: total.0,
            page,
            limit,
            ringkasan,
        })
    }

    pub async fn manual_settle_tagihan(
        &self,
        tagihan_id: Uuid,
        admin_id: Uuid,
        catatan: Option<String>,
    ) -> Result<(), AppError> {
        let tagihan = self
            .find_tagihan_by_id(tagihan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Tagihan tidak ditemukan".to_string()))?;

        if tagihan.status == "LUNAS" {
            return Err(AppError::BadRequest("Tagihan ini sudah lunas".to_string()));
        }

        let order_id = tagihan.nomor_tagihan.clone();
        let _ = self
            .settle_pembayaran_idempoten(&order_id, Utc::now())
            .await?;

        // Log audit
        let _ = crate::security::record_audit_log(
            &self.pool,
            Some(admin_id),
            "MANUAL_SETTLE_PAYMENT",
            "tagihan",
            Some(tagihan_id),
            None,
            Some(serde_json::json!({
                "nomor_tagihan": tagihan.nomor_tagihan,
                "catatan": catatan,
            })),
        )
        .await;

        Ok(())
    }

    // ==========================================
    // 6. LEGACY COMPATIBILITY
    // ==========================================

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

    pub async fn update_status_bayar(
        &self,
        id: Uuid,
        status: &str,
        admin_id: Option<Uuid>,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        sqlx::query(
            "UPDATE pembayaran 
             SET status_pembayaran = $1, verified_by = $2, tgl_bayar = $3, updated_at = NOW() 
             WHERE id = $4",
        )
        .bind(status)
        .bind(admin_id)
        .bind(if status == "LUNAS" { Some(now) } else { None })
        .bind(id)
        .execute(&self.pool)
        .await?;

        // Update juga di tabel tagihan jika ada
        let _ = sqlx::query(
            "UPDATE tagihan 
             SET status = $1, lunas_at = $2, updated_at = NOW() 
             WHERE id = $3",
        )
        .bind(if status == "LUNAS" { "LUNAS" } else { status })
        .bind(if status == "LUNAS" { Some(now) } else { None })
        .bind(id)
        .execute(&self.pool)
        .await;

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

/// Majukan alur pendaftar setelah sebuah tagihan lunas (dijalankan di dalam transaksi settle).
async fn lanjutkan_alur_setelah_lunas(
    db_tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tagihan: &Tagihan,
    order_id: &str,
    paid_at: DateTime<Utc>,
) -> Result<(), AppError> {
    use crate::modules::pendaftaran::alur::status;

    match tagihan.jenis_tagihan.as_str() {
        "FORMULIR" => {
            majukan_alur_formulir_lunas(
                db_tx,
                tagihan.pendaftar_id,
                &serde_json::json!({
                    "order_id": order_id,
                    "nominal": tagihan.nominal_akhir,
                    "paid_at": paid_at
                }),
                paid_at,
            )
            .await?;
        }
        "DAFTAR_ULANG_UKT" => {
            sqlx::query(
                "UPDATE hasil_kelulusan SET status_daftar_ulang = 'LUNAS', updated_at = NOW()
                 WHERE pendaftar_id = $1
                   AND status_daftar_ulang IN ('BELUM_DAFTAR_ULANG', 'TAGIHAN_TERBIT')",
            )
            .bind(tagihan.pendaftar_id)
            .execute(&mut **db_tx)
            .await?;

            sqlx::query(
                "UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW()
                 WHERE id = $2 AND status_pendaftaran = ANY($3)",
            )
            .bind(status::DAFTAR_ULANG_LUNAS)
            .bind(tagihan.pendaftar_id)
            .bind(
                [status::LULUS, status::MENUNGGU_VERIFIKASI_DAFTAR_ULANG]
                    .map(String::from)
                    .to_vec(),
            )
            .execute(&mut **db_tx)
            .await?;
        }
        _ => {}
    }
    Ok(())
}

/// Pembayaran formulir lunas -> langkah pembayaran SELESAI dan status
/// PEMBAYARAN_DISETUJUI. Satu-satunya tempat transisi ini, dipakai oleh approve
/// bukti, jalur gratis, voucher 100%, dan perbaikan data. Idempoten: tidak
/// mengubah apa pun bila status pendaftar sudah lebih maju.
pub async fn majukan_alur_formulir_lunas(
    conn: &mut sqlx::PgConnection,
    pendaftar_id: Uuid,
    data: &serde_json::Value,
    waktu: DateTime<Utc>,
) -> Result<bool, AppError> {
    use crate::modules::pendaftaran::alur::status;

    let maju = sqlx::query(
        "UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW()
         WHERE id = $2 AND status_pendaftaran = ANY($3)",
    )
    .bind(status::PEMBAYARAN_DISETUJUI)
    .bind(pendaftar_id)
    .bind(
        [
            status::SUBMITTED,
            status::MENUNGGU_VERIFIKASI_BAYAR,
            status::PEMBAYARAN_DITOLAK,
        ]
        .map(String::from)
        .to_vec(),
    )
    .execute(&mut *conn)
    .await?
    .rows_affected()
        > 0;

    sqlx::query(
        "INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, data_tambahan, selesai_at)
         SELECT $1, dl.id, 'SELESAI', $2, $3
         FROM definisi_langkah dl
         WHERE dl.tipe_langkah = 'pembayaran' AND dl.is_active = TRUE
         ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE
         SET status = 'SELESAI', data_tambahan = EXCLUDED.data_tambahan,
             selesai_at = EXCLUDED.selesai_at, updated_at = NOW()",
    )
    .bind(pendaftar_id)
    .bind(data)
    .bind(waktu)
    .execute(&mut *conn)
    .await?;

    Ok(maju)
}

fn pesan_lunas(tagihan: &Tagihan) -> (&'static str, String) {
    match tagihan.jenis_tagihan.as_str() {
        "DAFTAR_ULANG_UKT" => (
            "Pembayaran Daftar Ulang PMB Disetujui",
            format!(
                "Pembayaran daftar ulang Anda (No. Tagihan {}) sebesar Rp {} telah disetujui. Langkah terakhir: lengkapi berkas registrasi ulang di portal PMB untuk menerima NIM.",
                tagihan.nomor_tagihan, tagihan.nominal_akhir
            ),
        ),
        _ => (
            "Pembayaran Formulir PMB Disetujui",
            format!(
                "Pembayaran biaya formulir Anda (No. Tagihan {}) sebesar Rp {} telah disetujui. Langkah berikutnya: unggah berkas persyaratan di portal PMB.",
                tagihan.nomor_tagihan, tagihan.nominal_akhir
            ),
        ),
    }
}
