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
            "SELECT COALESCE(SUM(nominal), 0) 
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
        let row: (i64,) = sqlx::query_as("SELECT COALESCE(COUNT(*), 0) + 1 FROM tagihan")
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

        let status = if nominal_akhir == 0 {
            "LUNAS"
        } else {
            "MENUNGGU_PEMBAYARAN"
        };
        let lunas_at = if nominal_akhir == 0 {
            Some(Utc::now())
        } else {
            None
        };

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
        .bind(if nominal_akhir == 0 { "LUNAS" } else { "PENDING" })
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

    pub async fn settle_pembayaran_idempoten(
        &self,
        order_id: &str,
        paid_at: DateTime<Utc>,
    ) -> Result<(bool, Option<Uuid>), AppError> {
        let mut db_tx = self.pool.begin().await?;

        // 1. Lock transaksi berdasarkan nomor_transaksi atau nomor_tagihan
        let trx: Option<TransaksiPembayaran> = sqlx::query_as(
            "SELECT * FROM transaksi_pembayaran 
             WHERE nomor_transaksi = $1 
             FOR UPDATE",
        )
        .bind(order_id)
        .fetch_optional(&mut *db_tx)
        .await?;

        let (tagihan_id, trx_id) = match trx {
            Some(ref t) => {
                if t.status == "SETTLEMENT" || t.status == "PAID" {
                    // Idempotent: transaksi ini sudah lunas sebelumnya
                    db_tx.commit().await?;
                    return Ok((false, None));
                }
                (t.tagihan_id, Some(t.id))
            }
            None => {
                // Cari apakah order_id adalah nomor_tagihan langsung
                let tag: Option<Tagihan> =
                    sqlx::query_as("SELECT * FROM tagihan WHERE nomor_tagihan = $1 FOR UPDATE")
                        .bind(order_id)
                        .fetch_optional(&mut *db_tx)
                        .await?;

                match tag {
                    Some(tg) => {
                        if tg.status == "LUNAS" {
                            db_tx.commit().await?;
                            return Ok((false, None));
                        }
                        (tg.id, None)
                    }
                    None => {
                        db_tx.rollback().await?;
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
            .execute(&mut *db_tx)
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
        .fetch_one(&mut *db_tx)
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
        .execute(&mut *db_tx)
        .await;

        // 5. Update state langkah pendaftaran -> SELESAI
        let langkah_pembayaran_id: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM definisi_langkah WHERE tipe_langkah = 'pembayaran' LIMIT 1",
        )
        .fetch_optional(&mut *db_tx)
        .await?;

        if let Some((langkah_id,)) = langkah_pembayaran_id {
            let _ = sqlx::query(
                "INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, data, selesai_at)
                 VALUES ($1, $2, 'SELESAI', $3, $4)
                 ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE
                 SET status = 'SELESAI', data = EXCLUDED.data, selesai_at = EXCLUDED.selesai_at, updated_at = NOW()"
            )
            .bind(tagihan.pendaftar_id)
            .bind(langkah_id)
            .bind(serde_json::json!({
                "metode": "PAYMENT_GATEWAY",
                "order_id": order_id,
                "nominal": tagihan.nominal_akhir,
                "paid_at": paid_at
            }))
            .bind(paid_at)
            .execute(&mut *db_tx)
            .await;
        }

        // 6. Majukan status pendaftar ke MENUNGGU_UJIAN jika saat ini SUBMITTED atau DRAFT
        let _ = sqlx::query(
            "UPDATE pendaftar 
             SET status_pendaftaran = 'MENUNGGU_UJIAN', updated_at = NOW() 
             WHERE id = $1 AND status_pendaftaran IN ('SUBMITTED', 'DRAFT')",
        )
        .bind(tagihan.pendaftar_id)
        .execute(&mut *db_tx)
        .await;

        // 7. Enqueue notifikasi email via antrean_email
        let user_info: Option<(String, String)> = sqlx::query_as(
            "SELECT u.nama_lengkap, u.email 
             FROM users u 
             JOIN pendaftar p ON p.user_id = u.id 
             WHERE p.id = $1",
        )
        .bind(tagihan.pendaftar_id)
        .fetch_optional(&mut *db_tx)
        .await?;

        if let Some((nama, email)) = user_info {
            let subject = "Konfirmasi Pembayaran Biaya Formulir PMB Berhasil";
            let body_text = format!(
                "Halo {},\n\nPembayaran biaya formulir PMB Anda dengan Nomor Tagihan: {} sebesar Rp {} telah berhasil diverifikasi.\nTahapan seleksi Anda kini telah berlanjut ke Ujian Seleksi PMB. Silakan login ke portal PMB untuk mengunduh Kartu Peserta Ujian resmi Anda.",
                nama, tagihan.nomor_tagihan, tagihan.nominal_akhir
            );
            let body_html = format!(
                "<p>Halo <strong>{}</strong>,</p><p>Pembayaran biaya formulir PMB Anda dengan Nomor Tagihan: <strong>{}</strong> sebesar <strong>Rp {}</strong> telah berhasil diverifikasi lunas.</p><p>Tahapan seleksi Anda kini telah berlanjut ke Ujian Seleksi PMB. Silakan login ke portal PMB untuk mengunduh Kartu Peserta Ujian resmi Anda.</p>",
                nama, tagihan.nomor_tagihan, tagihan.nominal_akhir
            );

            let _ = sqlx::query(
                "INSERT INTO antrean_email (
                    to_email, to_name, subject, body_text, body_html, tipe_notifikasi, pendaftar_id
                ) VALUES ($1, $2, $3, $4, $5, 'PEMBAYARAN_LUNAS', $6)",
            )
            .bind(email)
            .bind(nama)
            .bind(subject)
            .bind(body_text)
            .bind(body_html)
            .bind(tagihan.pendaftar_id)
            .execute(&mut *db_tx)
            .await;
        }

        db_tx.commit().await?;
        Ok((true, Some(tagihan.pendaftar_id)))
    }

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
                COALESCE(SUM(CASE WHEN status = 'LUNAS' THEN nominal_akhir ELSE 0 END), 0) as total_dana,
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
        let _ = sqlx::query(
            "INSERT INTO audit_log (id, user_id, action, entity, entity_id, payload, created_at)
             VALUES ($1, $2, 'MANUAL_SETTLE_PAYMENT', 'tagihan', $3, $4, NOW())",
        )
        .bind(Uuid::new_v4())
        .bind(admin_id)
        .bind(tagihan_id)
        .bind(serde_json::json!({
            "nomor_tagihan": tagihan.nomor_tagihan,
            "catatan": catatan,
            "admin_id": admin_id
        }))
        .execute(&self.pool)
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
