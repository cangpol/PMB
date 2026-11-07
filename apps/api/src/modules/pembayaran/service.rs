use chrono::{DateTime, Duration, Utc};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::{
        dto::{
            CekVoucherRequest, CekVoucherResponse, FilterTransaksiKeuanganRequest,
            KonfirmasiBayarRequest, ListTransaksiAdminResponse, MidtransWebhookPayload,
            MockWebhookPayload, PembayaranDetailResponse, RekonsiliasiResponse,
            TagihanWithTransaksiResponse, TransaksiDetailResponse,
        },
        gateway::{CreateTransactionPayload, CustomerDetails, PaymentGateway},
        model::{TransaksiPembayaran, Voucher},
        repository::PembayaranRepository,
    },
};

// ==============================================================================
// Logika Bisnis Murni (Dapat Diuji Unit Test Secara Terisolasi)
// ==============================================================================

pub fn hitung_diskon_voucher(tipe_diskon: &str, nilai_diskon: i64, nominal_asli: i64) -> i64 {
    match tipe_diskon {
        "PERCENT" => {
            let pct = nilai_diskon.clamp(0, 100);
            (nominal_asli * pct) / 100
        }
        "NOMINAL" => nilai_diskon.min(nominal_asli).max(0),
        _ => 0,
    }
}

pub fn validasi_voucher(voucher: &Voucher, now: DateTime<Utc>) -> Result<(), &'static str> {
    if !voucher.is_active {
        return Err("Kode voucher saat ini tidak aktif");
    }
    if now > voucher.tgl_kadaluarsa {
        return Err("Kode voucher telah melewati batas masa berlaku (kedaluwarsa)");
    }
    if voucher.kuota_terpakai >= voucher.kuota {
        return Err("Kuota penggunaan kode voucher ini telah habis");
    }
    Ok(())
}

pub fn validasi_voucher_restrictions(
    batas_jalur_id: Option<Uuid>,
    batas_prodi_id: Option<Uuid>,
    calon_jalur_id: Option<Uuid>,
    calon_prodi_id: Option<Uuid>,
) -> Result<(), &'static str> {
    if let (Some(bj), Some(cj)) = (batas_jalur_id, calon_jalur_id) {
        if bj != cj {
            return Err("Kode voucher ini tidak berlaku untuk jalur pendaftaran yang Anda pilih");
        }
    }
    if let (Some(bp), Some(cp)) = (batas_prodi_id, calon_prodi_id) {
        if bp != cp {
            return Err("Kode voucher ini tidak berlaku untuk program studi yang Anda pilih");
        }
    }
    Ok(())
}

pub fn generate_virtual_account(sequence: i64) -> String {
    format!("88001{:07}", sequence)
}

// ==============================================================================
// Service Layer
// ==============================================================================

#[derive(Clone)]
pub struct PembayaranService {
    repo: PembayaranRepository,
    gateway: Arc<dyn PaymentGateway>,
}

impl PembayaranService {
    pub fn new(repo: PembayaranRepository, gateway: Arc<dyn PaymentGateway>) -> Self {
        Self { repo, gateway }
    }

    pub fn gateway(&self) -> &Arc<dyn PaymentGateway> {
        &self.gateway
    }

    // ==========================================
    // 1. CEK VOUCHER
    // ==========================================

    pub async fn cek_voucher(
        &self,
        req: CekVoucherRequest,
        jalur_id: Option<Uuid>,
        prodi_id: Option<Uuid>,
    ) -> Result<CekVoucherResponse, AppError> {
        let v_data = self
            .repo
            .find_voucher_with_limits(&req.kode_voucher)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Kode voucher tidak ditemukan atau tidak aktif".to_string())
            })?;

        let (v, batas_jalur, batas_prodi) = v_data;

        validasi_voucher(&v, Utc::now()).map_err(|e| AppError::BadRequest(e.to_string()))?;
        validasi_voucher_restrictions(batas_jalur, batas_prodi, jalur_id, prodi_id)
            .map_err(|e| AppError::BadRequest(e.to_string()))?;

        let potongan = hitung_diskon_voucher(&v.tipe_diskon, v.nilai_diskon, req.nominal_asli);
        let nominal_akhir = (req.nominal_asli - potongan).max(0);

        Ok(CekVoucherResponse {
            voucher_id: v.id,
            kode_voucher: v.kode_voucher,
            tipe_diskon: v.tipe_diskon,
            nilai_diskon: v.nilai_diskon,
            jumlah_potongan: potongan,
            nominal_setelah_diskon: nominal_akhir,
            pesan_validasi: "Voucher berhasil diterapkan!".to_string(),
        })
    }

    // ==========================================
    // 2. PEMBUATAN TAGIHAN (MATRIKS BIAYA + VOUCHER)
    // ==========================================

    pub async fn buat_atau_ambil_tagihan_formulir(
        &self,
        pendaftar_id: Uuid,
        prodi_id: Uuid,
        jalur_id: Uuid,
        gelombang_id: Uuid,
        kode_voucher: Option<String>,
    ) -> Result<TagihanWithTransaksiResponse, AppError> {
        // Cek apakah pendaftar sudah memiliki tagihan formulir
        let existing_list = self.repo.find_tagihan_by_pendaftar_id(pendaftar_id).await?;
        // Tagihan kedaluwarsa/batal tidak dipakai lagi: calon mendapat tagihan baru
        if let Some(existing) = existing_list.into_iter().find(|t| {
            t.jenis_tagihan == "FORMULIR" && !matches!(t.status.as_str(), "KEDALUWARSA" | "BATAL")
        }) {
            let active_tx = self
                .repo
                .find_active_transaksi_by_tagihan_id(existing.id)
                .await?;
            return Ok(TagihanWithTransaksiResponse {
                id: existing.id,
                nomor_tagihan: existing.nomor_tagihan,
                pendaftar_id: existing.pendaftar_id,
                jenis_tagihan: existing.jenis_tagihan,
                nominal_asli: existing.nominal_asli,
                diskon_voucher: existing.diskon_voucher,
                nominal_akhir: existing.nominal_akhir,
                voucher_id: existing.voucher_id,
                status: existing.status,
                tgl_terbit: existing.tgl_terbit,
                tgl_jatuh_tempo: existing.tgl_jatuh_tempo,
                lunas_at: existing.lunas_at,
                catatan: existing.catatan,
                active_transaksi: active_tx.map(Self::map_transaksi_response),
            });
        }

        // 1. Biaya formulir ditetapkan per jalur (jalur_masuk.biaya_formulir).
        //    matriks_biaya berisi komponen biaya daftar ulang, bukan biaya formulir.
        let _ = gelombang_id;
        let nominal_asli = self.repo.get_biaya_formulir_jalur(jalur_id).await?;

        // 2. Validasi & Kalkulasi Voucher jika diberikan
        let mut diskon = 0;
        let mut voucher_id = None;

        // Voucher yang diisi tetapi tidak berlaku ditolak dengan alasannya, bukan diabaikan:
        // tagihan yang telanjur terbit dengan harga penuh tidak bisa diberi voucher lagi.
        let kode_voucher = kode_voucher
            .map(|k| k.trim().to_uppercase())
            .filter(|k| !k.is_empty());
        if let Some(ref kode) = kode_voucher {
            let (v, b_jalur, b_prodi) = self
                .repo
                .find_voucher_with_limits(kode)
                .await?
                .ok_or_else(|| {
                    AppError::BadRequest(format!(
                        "Kode voucher {kode} tidak ditemukan atau tidak aktif."
                    ))
                })?;
            validasi_voucher(&v, Utc::now()).map_err(|e| AppError::BadRequest(e.to_string()))?;
            validasi_voucher_restrictions(b_jalur, b_prodi, Some(jalur_id), Some(prodi_id))
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            // Klaim kuota voucher secara atomic
            if !self.repo.claim_voucher_atomic(v.id).await? {
                return Err(AppError::BadRequest(
                    "Kuota voucher sudah habis.".to_string(),
                ));
            }
            diskon = hitung_diskon_voucher(&v.tipe_diskon, v.nilai_diskon, nominal_asli);
            voucher_id = Some(v.id);
        }

        let nominal_akhir = (nominal_asli - diskon).max(0);
        let seq = self.repo.get_next_sequence().await?;
        let nomor_tagihan = format!("INV-2026-{:05}", seq);
        // Transfer manual (VA Mandiri / QRIS statis) + verifikasi admin butuh jeda lebih longgar
        let tgl_jatuh_tempo = Utc::now() + Duration::days(3);

        let tagihan = self
            .repo
            .create_tagihan(
                pendaftar_id,
                &nomor_tagihan,
                "FORMULIR",
                nominal_asli,
                diskon,
                nominal_akhir,
                voucher_id,
                tgl_jatuh_tempo,
            )
            .await?;

        // 3. Jika nominal_akhir == 0 (misal voucher 100%), langsung auto-settle!
        if nominal_akhir == 0 {
            let _ = self
                .repo
                .settle_pembayaran_idempoten(&nomor_tagihan, Utc::now())
                .await?;
        }

        let refreshed = self
            .repo
            .find_tagihan_by_id(tagihan.id)
            .await?
            .unwrap_or(tagihan);

        Ok(TagihanWithTransaksiResponse {
            id: refreshed.id,
            nomor_tagihan: refreshed.nomor_tagihan,
            pendaftar_id: refreshed.pendaftar_id,
            jenis_tagihan: refreshed.jenis_tagihan,
            nominal_asli: refreshed.nominal_asli,
            diskon_voucher: refreshed.diskon_voucher,
            nominal_akhir: refreshed.nominal_akhir,
            voucher_id: refreshed.voucher_id,
            status: refreshed.status,
            tgl_terbit: refreshed.tgl_terbit,
            tgl_jatuh_tempo: refreshed.tgl_jatuh_tempo,
            lunas_at: refreshed.lunas_at,
            catatan: refreshed.catatan,
            active_transaksi: None,
        })
    }

    // ==========================================
    // 3. CHARGE PEMBAYARAN GATEWAY (VA / QRIS)
    // ==========================================

    pub async fn charge_tagihan(
        &self,
        tagihan_id: Uuid,
        metode_pembayaran: &str,
        customer_name: &str,
        customer_email: &str,
        customer_phone: &str,
    ) -> Result<TransaksiDetailResponse, AppError> {
        let tagihan = self
            .repo
            .find_tagihan_by_id(tagihan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Tagihan tidak ditemukan".to_string()))?;

        if tagihan.status == "LUNAS" {
            return Err(AppError::BadRequest("Tagihan ini sudah lunas".to_string()));
        }

        if tagihan.status == "KEDALUWARSA" || tagihan.tgl_jatuh_tempo < Utc::now() {
            return Err(AppError::BadRequest(
                "Masa berlaku tagihan telah kedaluwarsa. Silakan ajukan tagihan baru.".to_string(),
            ));
        }

        // Cek jika sudah ada transaksi pending yang masih berlaku dengan metode sama
        if let Some(existing_tx) = self
            .repo
            .find_active_transaksi_by_tagihan_id(tagihan.id)
            .await?
        {
            if existing_tx.status == "PENDING"
                && existing_tx.metode_pembayaran == metode_pembayaran
                && existing_tx.waktu_berlaku_sampai > Utc::now()
            {
                return Ok(Self::map_transaksi_response(existing_tx));
            }
        }

        // Generate nomor transaksi unik
        let seq = self.repo.get_next_sequence().await?;
        let nomor_transaksi = format!(
            "TRX-{}-{:04}",
            Utc::now().format("%Y%m%d%H%M"),
            (seq % 10000).abs()
        );

        let payload = CreateTransactionPayload {
            order_id: nomor_transaksi.clone(),
            gross_amount: tagihan.nominal_akhir,
            payment_method: metode_pembayaran.to_string(),
            customer_details: CustomerDetails {
                name: customer_name.to_string(),
                email: customer_email.to_string(),
                phone: customer_phone.to_string(),
            },
            expiry_hours: 24,
        };

        // Panggil payment gateway yang aktif (Mock / Midtrans)
        let charge_res = self.gateway.create_transaction(&payload).await?;

        // Simpan transaksi pembayaran ke database
        let trx = self
            .repo
            .create_transaksi(
                tagihan.id,
                &nomor_transaksi,
                self.gateway.provider_name(),
                Some(&charge_res.gateway_reference_id),
                &charge_res.payment_method,
                charge_res.nomor_va.as_deref(),
                charge_res.qr_string.as_deref(),
                charge_res.qr_url.as_deref(),
                charge_res.nominal,
                charge_res.waktu_berlaku_sampai,
                &charge_res.raw_response,
            )
            .await?;

        Ok(Self::map_transaksi_response(trx))
    }

    pub async fn get_my_active_tagihan(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<TagihanWithTransaksiResponse>, AppError> {
        let list = self.repo.find_tagihan_by_pendaftar_id(pendaftar_id).await?;
        let tagihan = match list.into_iter().next() {
            Some(t) => t,
            None => return Ok(None),
        };

        let active_tx = self
            .repo
            .find_active_transaksi_by_tagihan_id(tagihan.id)
            .await?;

        Ok(Some(TagihanWithTransaksiResponse {
            id: tagihan.id,
            nomor_tagihan: tagihan.nomor_tagihan,
            pendaftar_id: tagihan.pendaftar_id,
            jenis_tagihan: tagihan.jenis_tagihan,
            nominal_asli: tagihan.nominal_asli,
            diskon_voucher: tagihan.diskon_voucher,
            nominal_akhir: tagihan.nominal_akhir,
            voucher_id: tagihan.voucher_id,
            status: tagihan.status,
            tgl_terbit: tagihan.tgl_terbit,
            tgl_jatuh_tempo: tagihan.tgl_jatuh_tempo,
            lunas_at: tagihan.lunas_at,
            catatan: tagihan.catatan,
            active_transaksi: active_tx.map(Self::map_transaksi_response),
        }))
    }

    // ==========================================
    // 4. PENANGANAN WEBHOOK IDEMPOTEN
    // ==========================================

    pub async fn handle_midtrans_webhook(
        &self,
        payload: MidtransWebhookPayload,
        raw_signature: Option<String>,
    ) -> Result<(bool, String), AppError> {
        let sig = payload
            .signature_key
            .as_deref()
            .or(raw_signature.as_deref())
            .unwrap_or("");

        let is_valid = self.gateway.verify_webhook_signature(
            &payload.order_id,
            &payload.status_code,
            &payload.gross_amount,
            sig,
        );

        if !is_valid {
            let _ = self
                .repo
                .log_webhook(
                    "MIDTRANS",
                    None,
                    Some(&payload.order_id),
                    Some(&payload.status_code),
                    Some(&payload.transaction_status),
                    &serde_json::to_value(&payload).unwrap_or_default(),
                    Some(sig),
                    "FAILED_SIGNATURE",
                    Some("Signature hash SHA512 tidak valid"),
                )
                .await;
            return Err(AppError::Forbidden(
                "Signature webhook tidak valid".to_string(),
            ));
        }

        let status = payload.transaction_status.to_lowercase();
        let fraud = payload.fraud_status.as_deref().unwrap_or("accept");

        if (status == "capture" && fraud == "accept") || status == "settlement" {
            let (settled, _) = self
                .repo
                .settle_pembayaran_idempoten(&payload.order_id, Utc::now())
                .await?;

            let _ = self
                .repo
                .log_webhook(
                    "MIDTRANS",
                    None,
                    Some(&payload.order_id),
                    Some(&payload.status_code),
                    Some(&payload.transaction_status),
                    &serde_json::to_value(&payload).unwrap_or_default(),
                    Some(sig),
                    if settled {
                        "PROCESSED"
                    } else {
                        "IGNORED_DUPLICATE"
                    },
                    Some(if settled {
                        "Pembayaran berhasil diselesaikan"
                    } else {
                        "Idempotent duplicate webhook diabaikan"
                    }),
                )
                .await;

            return Ok((
                settled,
                if settled {
                    "Pembayaran berhasil diselesaikan".to_string()
                } else {
                    "Idempotent duplicate webhook diabaikan".to_string()
                },
            ));
        }

        if status == "expire" {
            let expired = self
                .repo
                .expire_pembayaran_idempoten(&payload.order_id)
                .await?;
            let _ = self
                .repo
                .log_webhook(
                    "MIDTRANS",
                    None,
                    Some(&payload.order_id),
                    Some(&payload.status_code),
                    Some(&payload.transaction_status),
                    &serde_json::to_value(&payload).unwrap_or_default(),
                    Some(sig),
                    "PROCESSED",
                    Some(if expired {
                        "Status transaksi kedaluwarsa dicatat"
                    } else {
                        "Abaikan expire karena sudah lunas"
                    }),
                )
                .await;

            return Ok((false, "Status kedaluwarsa diproses".to_string()));
        }

        // Pending / cancel / deny
        let _ = self
            .repo
            .log_webhook(
                "MIDTRANS",
                None,
                Some(&payload.order_id),
                Some(&payload.status_code),
                Some(&payload.transaction_status),
                &serde_json::to_value(&payload).unwrap_or_default(),
                Some(sig),
                "PROCESSED",
                Some("Status transaksi non-settlement dicatat"),
            )
            .await;

        Ok((false, format!("Status {} dicatat", status)))
    }

    pub async fn handle_mock_webhook(
        &self,
        payload: MockWebhookPayload,
    ) -> Result<(bool, String), AppError> {
        let sig = payload.signature.as_deref().ok_or_else(|| {
            AppError::Forbidden("Signature webhook mock wajib disertakan".to_string())
        })?;
        let is_valid =
            self.gateway
                .verify_webhook_signature(&payload.order_id, "200", "250000", sig);

        if !is_valid {
            return Err(AppError::Forbidden(
                "Signature webhook mock tidak valid".to_string(),
            ));
        }

        if payload.status == "SETTLEMENT" || payload.status == "LUNAS" {
            let (settled, _) = self
                .repo
                .settle_pembayaran_idempoten(&payload.order_id, Utc::now())
                .await?;

            return Ok((
                settled,
                if settled {
                    "Simulasi settlement mock berhasil".to_string()
                } else {
                    "Idempotent duplicate mock webhook diabaikan".to_string()
                },
            ));
        }

        if payload.status == "EXPIRED" {
            let _ = self
                .repo
                .expire_pembayaran_idempoten(&payload.order_id)
                .await?;
            return Ok((
                false,
                "Simulasi transaksi kedaluwarsa mock berhasil".to_string(),
            ));
        }

        Ok((false, "Status mock diproses".to_string()))
    }

    pub async fn simulasi_va_bayar(&self, pembayaran_or_tagihan_id: Uuid) -> Result<(), AppError> {
        // Cek tagihan
        let tagihan = self
            .repo
            .find_tagihan_by_id(pembayaran_or_tagihan_id)
            .await?;
        if let Some(t) = tagihan {
            if t.status == "LUNAS" {
                return Err(AppError::BadRequest("Tagihan ini sudah lunas".to_string()));
            }
            let _ = self
                .repo
                .settle_pembayaran_idempoten(&t.nomor_tagihan, Utc::now())
                .await?;
            return Ok(());
        }

        // Cek pembayaran legacy
        let p = self
            .repo
            .find_by_id(pembayaran_or_tagihan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Tagihan tidak ditemukan".to_string()))?;

        if p.status_pembayaran == "LUNAS" {
            return Err(AppError::BadRequest("Tagihan ini sudah lunas".to_string()));
        }

        let _ = self
            .repo
            .settle_pembayaran_idempoten(&p.nomor_tagihan, Utc::now())
            .await?;
        Ok(())
    }

    // ==========================================
    // 5. REKONSILIASI & ADMIN KEUANGAN
    // ==========================================

    pub async fn rekonsiliasi_transaksi(
        &self,
        transaksi_id: Uuid,
    ) -> Result<RekonsiliasiResponse, AppError> {
        let trx = self
            .repo
            .find_transaksi_by_id(transaksi_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Transaksi pembayaran tidak ditemukan".to_string())
            })?;

        let previous_status = trx.status.clone();
        let gw_res = self.gateway.check_status(&trx.nomor_transaksi).await?;

        let mut updated = false;
        let final_status = if gw_res.status == "SETTLEMENT" && previous_status != "SETTLEMENT" {
            let (settled, _) = self
                .repo
                .settle_pembayaran_idempoten(&trx.nomor_transaksi, Utc::now())
                .await?;
            updated = settled;
            "SETTLEMENT".to_string()
        } else if gw_res.status == "EXPIRED" && previous_status == "PENDING" {
            let expired = self
                .repo
                .expire_pembayaran_idempoten(&trx.nomor_transaksi)
                .await?;
            updated = expired;
            "EXPIRED".to_string()
        } else {
            previous_status.clone()
        };

        Ok(RekonsiliasiResponse {
            transaksi_id: trx.id,
            nomor_transaksi: trx.nomor_transaksi,
            status_sebelumnya: previous_status,
            status_terkini: final_status,
            berhasil_disinkronkan: updated,
            pesan: if updated {
                "Status transaksi berhasil diperbarui dari gateway".to_string()
            } else {
                "Status transaksi sudah sinkron dengan gateway".to_string()
            },
        })
    }

    pub async fn list_transaksi_keuangan(
        &self,
        filter: &FilterTransaksiKeuanganRequest,
    ) -> Result<ListTransaksiAdminResponse, AppError> {
        self.repo.list_transaksi_keuangan(filter).await
    }

    pub async fn manual_settle_tagihan(
        &self,
        admin_id: Uuid,
        tagihan_id: Uuid,
        catatan: Option<String>,
    ) -> Result<(), AppError> {
        self.repo
            .manual_settle_tagihan(tagihan_id, admin_id, catatan)
            .await
    }

    pub async fn ekspor_transaksi_csv(
        &self,
        filter: &FilterTransaksiKeuanganRequest,
    ) -> Result<String, AppError> {
        let f = FilterTransaksiKeuanganRequest {
            q: filter.q.clone(),
            status: filter.status.clone(),
            metode: filter.metode.clone(),
            start_date: filter.start_date.clone(),
            end_date: filter.end_date.clone(),
            page: Some(1),
            limit: Some(1000), // Ambil sampai 1000 item untuk ekspor
        };

        let data = self.repo.list_transaksi_keuangan(&f).await?;

        let mut csv = String::new();
        csv.push_str("No,Nomor Tagihan,Nomor Transaksi,Nomor Pendaftaran,Nama Calon,Jenis Tagihan,Nominal Asli,Diskon Voucher,Nominal Akhir,Metode,Gateway,Nomor VA,Status,Waktu Dibuat,Waktu Lunas\n");

        for (idx, item) in data.items.iter().enumerate() {
            let va = item.nomor_va.as_deref().unwrap_or("-");
            let lunas = item
                .waktu_dibayar
                .map(|t| t.format("%Y-%m-%d %H:%M:%S WIB").to_string())
                .unwrap_or_else(|| "-".to_string());
            let dibuat = item
                .waktu_dibuat
                .format("%Y-%m-%d %H:%M:%S WIB")
                .to_string();

            csv.push_str(&format!(
                "{},\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},{},{},\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                idx + 1,
                item.nomor_tagihan,
                item.nomor_transaksi,
                item.nomor_pendaftaran,
                item.nama_pendaftar.replace('"', "\"\""),
                item.jenis_tagihan,
                item.nominal_asli,
                item.diskon_voucher,
                item.nominal,
                item.metode_pembayaran,
                item.gateway_provider,
                va,
                item.status,
                dibuat,
                lunas
            ));
        }

        Ok(csv)
    }

    // ==========================================
    // 6. LEGACY COMPATIBILITY METHODS
    // ==========================================

    pub async fn list_tagihan_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<PembayaranDetailResponse>, AppError> {
        let list = self.repo.find_by_pendaftar_id(pendaftar_id).await?;
        Ok(list
            .into_iter()
            .map(|p| PembayaranDetailResponse {
                id: p.id,
                pendaftar_id: p.pendaftar_id,
                nomor_tagihan: p.nomor_tagihan,
                jenis_tagihan: p.jenis_tagihan,
                nominal_asli: p.nominal_asli,
                diskon: p.diskon,
                nominal_akhir: p.nominal_akhir,
                voucher_id: p.voucher_id,
                status_pembayaran: p.status_pembayaran,
                metode_pembayaran: p.metode_pembayaran,
                nomor_va: p.nomor_va,
                qr_string: None,
                qr_url: None,
                bukti_bayar_key: p.bukti_bayar_key,
                tgl_kadaluarsa: p.tgl_kadaluarsa,
                tgl_bayar: p.tgl_bayar,
                created_at: p.created_at,
            })
            .collect())
    }

    pub async fn list_all(&self) -> Result<Vec<PembayaranDetailResponse>, AppError> {
        let list = self.repo.list_all().await?;
        Ok(list
            .into_iter()
            .map(|p| PembayaranDetailResponse {
                id: p.id,
                pendaftar_id: p.pendaftar_id,
                nomor_tagihan: p.nomor_tagihan,
                jenis_tagihan: p.jenis_tagihan,
                nominal_asli: p.nominal_asli,
                diskon: p.diskon,
                nominal_akhir: p.nominal_akhir,
                voucher_id: p.voucher_id,
                status_pembayaran: p.status_pembayaran,
                metode_pembayaran: p.metode_pembayaran,
                nomor_va: p.nomor_va,
                qr_string: None,
                qr_url: None,
                bukti_bayar_key: p.bukti_bayar_key,
                tgl_kadaluarsa: p.tgl_kadaluarsa,
                tgl_bayar: p.tgl_bayar,
                created_at: p.created_at,
            })
            .collect())
    }

    pub async fn konfirmasi_keuangan(
        &self,
        admin_id: Uuid,
        req: KonfirmasiBayarRequest,
    ) -> Result<(), AppError> {
        self.repo
            .update_status_bayar(req.pembayaran_id, &req.status, Some(admin_id))
            .await?;
        Ok(())
    }

    fn map_transaksi_response(t: TransaksiPembayaran) -> TransaksiDetailResponse {
        TransaksiDetailResponse {
            id: t.id,
            tagihan_id: t.tagihan_id,
            nomor_transaksi: t.nomor_transaksi,
            gateway_provider: t.gateway_provider,
            metode_pembayaran: t.metode_pembayaran,
            nomor_va: t.nomor_va,
            qr_string: t.qr_string,
            qr_url: t.qr_url,
            nominal: t.nominal,
            status: t.status,
            waktu_dibuat: t.waktu_dibuat,
            waktu_berlaku_sampai: t.waktu_berlaku_sampai,
            waktu_dibayar: t.waktu_dibayar,
        }
    }
}
