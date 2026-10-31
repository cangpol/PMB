use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pembayaran::{
        dto::{
            CekVoucherRequest, CekVoucherResponse, KonfirmasiBayarRequest,
            PembayaranDetailResponse, PilihMetodeRequest,
        },
        model::Voucher,
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

pub fn generate_virtual_account(sequence: i64) -> String {
    format!("88001{:07}", sequence)
}

// ==============================================================================
// Service Layer
// ==============================================================================

#[derive(Clone)]
pub struct PembayaranService {
    repo: PembayaranRepository,
}

impl PembayaranService {
    pub fn new(repo: PembayaranRepository) -> Self {
        Self { repo }
    }

    pub async fn cek_voucher(
        &self,
        req: CekVoucherRequest,
    ) -> Result<CekVoucherResponse, AppError> {
        let v = self
            .repo
            .find_voucher_by_code(&req.kode_voucher)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Kode voucher tidak ditemukan atau tidak aktif".to_string())
            })?;

        validasi_voucher(&v, Utc::now()).map_err(|e| AppError::BadRequest(e.to_string()))?;

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

    pub async fn buat_tagihan_formulir(
        &self,
        pendaftar_id: Uuid,
        biaya_asli: i64,
        req: PilihMetodeRequest,
    ) -> Result<PembayaranDetailResponse, AppError> {
        let mut diskon = 0;
        let mut voucher_id = None;

        if let Some(ref kode) = req.kode_voucher {
            if let Some(v) = self.repo.find_voucher_by_code(kode).await? {
                if validasi_voucher(&v, Utc::now()).is_ok() {
                    diskon = hitung_diskon_voucher(&v.tipe_diskon, v.nilai_diskon, biaya_asli);
                    voucher_id = Some(v.id);
                    self.repo.increment_voucher_usage(v.id).await?;
                }
            }
        }

        let nominal_akhir = (biaya_asli - diskon).max(0);
        let seq = self.repo.get_next_sequence().await?;
        let nomor_tagihan = format!("INV-2026-{:05}", seq);
        let nomor_va = if req.metode_pembayaran == "VIRTUAL_ACCOUNT" {
            Some(generate_virtual_account(seq))
        } else {
            None
        };

        let tgl_kadaluarsa = Utc::now() + Duration::hours(24);

        let p = self
            .repo
            .create_or_update_tagihan(
                pendaftar_id,
                &nomor_tagihan,
                "FORMULIR",
                biaya_asli,
                diskon,
                nominal_akhir,
                voucher_id,
                &req.metode_pembayaran,
                nomor_va.as_deref(),
                tgl_kadaluarsa,
            )
            .await?;

        Ok(PembayaranDetailResponse {
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
            bukti_bayar_key: p.bukti_bayar_key,
            tgl_kadaluarsa: p.tgl_kadaluarsa,
            tgl_bayar: p.tgl_bayar,
            created_at: p.created_at,
        })
    }

    pub async fn simulasi_va_bayar(&self, pembayaran_id: Uuid) -> Result<(), AppError> {
        let p = self
            .repo
            .find_by_id(pembayaran_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Tagihan tidak ditemukan".to_string()))?;

        if p.status_pembayaran == "LUNAS" {
            return Err(AppError::BadRequest("Tagihan ini sudah lunas".to_string()));
        }

        self.repo.update_status_bayar(p.id, "LUNAS", None).await?;
        Ok(())
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
                bukti_bayar_key: p.bukti_bayar_key,
                tgl_kadaluarsa: p.tgl_kadaluarsa,
                tgl_bayar: p.tgl_bayar,
                created_at: p.created_at,
            })
            .collect())
    }
}

// ==============================================================================
// Unit Test Logika Bisnis Pembayaran & Voucher
// ==============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hitung_diskon_persen() {
        let asli = 250_000;
        let diskon = hitung_diskon_voucher("PERCENT", 20, asli);
        assert_eq!(diskon, 50_000);
        assert_eq!(asli - diskon, 200_000);

        // Diskon 100%
        let gratis = hitung_diskon_voucher("PERCENT", 100, asli);
        assert_eq!(gratis, 250_000);
    }

    #[test]
    fn test_hitung_diskon_nominal() {
        let asli = 250_000;
        let diskon = hitung_diskon_voucher("NOMINAL", 100_000, asli);
        assert_eq!(diskon, 100_000);

        // Diskon nominal melebihi harga asli -> tidak boleh minus
        let over = hitung_diskon_voucher("NOMINAL", 300_000, asli);
        assert_eq!(over, 250_000);
    }

    #[test]
    fn test_validasi_voucher_kadaluarsa_dan_kuota() {
        let now = Utc::now();
        let voucher_valid = Voucher {
            id: Uuid::new_v4(),
            kode_voucher: "TRIPUTRA2026".to_string(),
            tipe_diskon: "PERCENT".to_string(),
            nilai_diskon: 25,
            kuota: 10,
            kuota_terpakai: 5,
            tgl_kadaluarsa: now + Duration::days(5),
            is_active: true,
            created_at: now,
        };
        assert!(validasi_voucher(&voucher_valid, now).is_ok());

        let voucher_expired = Voucher {
            tgl_kadaluarsa: now - Duration::hours(1),
            ..voucher_valid.clone()
        };
        assert!(validasi_voucher(&voucher_expired, now).is_err());

        let voucher_full = Voucher {
            kuota_terpakai: 10,
            ..voucher_valid.clone()
        };
        assert!(validasi_voucher(&voucher_full, now).is_err());
    }

    #[test]
    fn test_generate_virtual_account() {
        let va = generate_virtual_account(42);
        assert_eq!(va, "880010000042");
    }
}
