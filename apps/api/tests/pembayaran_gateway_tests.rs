#![allow(clippy::collapsible_if)]

// Test Suite Komprehensif Modul Pembayaran & Abstraksi Gateway
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian Wajib:
// 1. Kalkulasi Biaya Matriks + Validasi Voucher (Persen, Nominal, Batas Kuota, Batas Prodi/Jalur)
// 2. Transaksi Otomatis Selesai untuk Voucher 100% (Zero Nominal Auto-Settlement)
// 3. Pencegahan Pembayaran Ganda (Double Payment Prevention)
// 4. Penanganan Transaksi Kedaluwarsa (Transaction Expiry Handling)
// 5. Validasi Cryptographic Signature Webhook (SHA512 Midtrans / Mock Secret)
// 6. Idempotensi Webhook Duplikat (Duplicate Webhook Safety)
// 7. Penanganan Webhook Tidak Berurutan (Out-of-order Webhook: Late Pending & Expired)
// 8. Alur End-to-End Charge Gateway & Kemajuan Langkah Pendaftaran Otomatis

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha512};
use std::collections::HashMap;
use uuid::Uuid;

// =========================================================================
// 1. Domain Types & State Machine Pembayaran
// =========================================================================

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum StatusTagihan {
    MenungguPembayaran,
    Lunas,
    Kedaluwarsa,
    Batal,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum StatusTransaksi {
    Pending,
    Settlement,
    Expired,
    Failed,
}

#[derive(Clone, Debug)]
pub struct MockVoucher {
    pub id: Uuid,
    pub kode_voucher: String,
    pub tipe_diskon: String, // 'PERCENT' or 'NOMINAL'
    pub nilai_diskon: i64,
    pub kuota: i32,
    pub kuota_terpakai: i32,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub is_active: bool,
    pub batas_jalur_id: Option<Uuid>,
    pub batas_prodi_id: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub struct MockMatriksBiaya {
    pub prodi_id: Uuid,
    pub jalur_id: Uuid,
    pub gelombang_id: Uuid,
    pub nominal: i64,
}

#[derive(Clone, Debug)]
pub struct MockTagihan {
    pub id: Uuid,
    pub nomor_tagihan: String,
    pub pendaftar_id: Uuid,
    pub nominal_asli: i64,
    pub diskon_voucher: i64,
    pub nominal_akhir: i64,
    pub status: StatusTagihan,
    pub tgl_jatuh_tempo: DateTime<Utc>,
    pub lunas_at: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug)]
pub struct MockTransaksi {
    pub id: Uuid,
    pub tagihan_id: Uuid,
    pub nomor_transaksi: String,
    pub metode_pembayaran: String,
    pub nominal: i64,
    pub status: StatusTransaksi,
    pub waktu_berlaku_sampai: DateTime<Utc>,
    pub waktu_dibayar: Option<DateTime<Utc>>,
}

// =========================================================================
// 2. Payment Engine Simulator (Repository + Gateway + Idempotency)
// =========================================================================

pub struct PaymentEngineSimulator {
    pub server_key: String,
    pub vouchers: HashMap<String, MockVoucher>,
    pub matriks_biaya: Vec<MockMatriksBiaya>,
    pub tagihan_db: HashMap<Uuid, MockTagihan>,
    pub transaksi_db: HashMap<String, MockTransaksi>,
    pub pendaftar_langkah_db: HashMap<Uuid, String>, // pendaftar_id -> status_langkah
    pub pendaftar_status_db: HashMap<Uuid, String>,  // pendaftar_id -> status_pendaftaran
    pub email_queue: Vec<String>,
    pub webhook_log: Vec<(String, String)>, // (order_id, status_proses)
}

impl PaymentEngineSimulator {
    pub fn new(server_key: &str) -> Self {
        Self {
            server_key: server_key.to_string(),
            vouchers: HashMap::new(),
            matriks_biaya: Vec::new(),
            tagihan_db: HashMap::new(),
            transaksi_db: HashMap::new(),
            pendaftar_langkah_db: HashMap::new(),
            pendaftar_status_db: HashMap::new(),
            email_queue: Vec::new(),
            webhook_log: Vec::new(),
        }
    }

    pub fn hitung_biaya(&self, prodi: Uuid, jalur: Uuid, gelombang: Uuid) -> i64 {
        self.matriks_biaya
            .iter()
            .find(|m| m.prodi_id == prodi && m.jalur_id == jalur && m.gelombang_id == gelombang)
            .map(|m| m.nominal)
            .unwrap_or(250_000)
    }

    pub fn validasi_dan_pakai_voucher(
        &mut self,
        kode: &str,
        nominal_asli: i64,
        calon_jalur: Option<Uuid>,
        calon_prodi: Option<Uuid>,
        now: DateTime<Utc>,
    ) -> Result<(i64, i64), &'static str> {
        let v = self
            .vouchers
            .get_mut(&kode.to_uppercase())
            .ok_or("Kode voucher tidak ditemukan")?;

        if !v.is_active {
            return Err("Kode voucher saat ini tidak aktif");
        }
        if now > v.tgl_kadaluarsa {
            return Err("Kode voucher telah kedaluwarsa");
        }
        if v.kuota_terpakai >= v.kuota {
            return Err("Kuota voucher telah habis");
        }
        if let (Some(bj), Some(cj)) = (v.batas_jalur_id, calon_jalur) {
            if bj != cj {
                return Err("Voucher tidak berlaku untuk jalur ini");
            }
        }
        if let (Some(bp), Some(cp)) = (v.batas_prodi_id, calon_prodi) {
            if bp != cp {
                return Err("Voucher tidak berlaku untuk prodi ini");
            }
        }

        let diskon = match v.tipe_diskon.as_str() {
            "PERCENT" => (nominal_asli * v.nilai_diskon.clamp(0, 100)) / 100,
            "NOMINAL" => v.nilai_diskon.min(nominal_asli).max(0),
            _ => 0,
        };

        // Klaim atomic
        v.kuota_terpakai += 1;
        let nominal_akhir = (nominal_asli - diskon).max(0);
        Ok((diskon, nominal_akhir))
    }

    pub fn buat_tagihan(
        &mut self,
        pendaftar_id: Uuid,
        nomor_tagihan: &str,
        nominal_asli: i64,
        diskon_voucher: i64,
        tgl_jatuh_tempo: DateTime<Utc>,
    ) -> MockTagihan {
        let nominal_akhir = (nominal_asli - diskon_voucher).max(0);
        let status = if nominal_akhir == 0 {
            StatusTagihan::Lunas
        } else {
            StatusTagihan::MenungguPembayaran
        };
        let lunas_at = if nominal_akhir == 0 {
            Some(Utc::now())
        } else {
            None
        };

        let tagihan = MockTagihan {
            id: Uuid::new_v4(),
            nomor_tagihan: nomor_tagihan.to_string(),
            pendaftar_id,
            nominal_asli,
            diskon_voucher,
            nominal_akhir,
            status,
            tgl_jatuh_tempo,
            lunas_at,
        };

        self.tagihan_db.insert(tagihan.id, tagihan.clone());

        // Jika langsung lunas (voucher 100%), majukan pendaftaran
        if nominal_akhir == 0 {
            self.pendaftar_langkah_db
                .insert(pendaftar_id, "SELESAI".to_string());
            self.pendaftar_status_db
                .insert(pendaftar_id, "MENUNGGU_UJIAN".to_string());
            self.email_queue
                .push(format!("Konfirmasi Lunas: {}", nomor_tagihan));
        }

        tagihan
    }

    pub fn charge_gateway(
        &mut self,
        tagihan_id: Uuid,
        nomor_transaksi: &str,
        metode: &str,
        now: DateTime<Utc>,
    ) -> Result<MockTransaksi, &'static str> {
        let tagihan = self
            .tagihan_db
            .get(&tagihan_id)
            .ok_or("Tagihan tidak ditemukan")?;

        if tagihan.status == StatusTagihan::Lunas {
            return Err("Tagihan ini sudah lunas");
        }
        if tagihan.status == StatusTagihan::Kedaluwarsa || tagihan.tgl_jatuh_tempo < now {
            return Err("Tagihan telah kedaluwarsa");
        }

        let trx = MockTransaksi {
            id: Uuid::new_v4(),
            tagihan_id,
            nomor_transaksi: nomor_transaksi.to_string(),
            metode_pembayaran: metode.to_string(),
            nominal: tagihan.nominal_akhir,
            status: StatusTransaksi::Pending,
            waktu_berlaku_sampai: now + Duration::hours(24),
            waktu_dibayar: None,
        };

        self.transaksi_db
            .insert(nomor_transaksi.to_string(), trx.clone());
        Ok(trx)
    }

    pub fn compute_sha512_signature(
        &self,
        order_id: &str,
        status_code: &str,
        gross_amount: &str,
    ) -> String {
        let raw = format!(
            "{}{}{}{}",
            order_id, status_code, gross_amount, self.server_key
        );
        let mut hasher = Sha512::new();
        hasher.update(raw.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn process_webhook_idempoten(
        &mut self,
        order_id: &str,
        status_code: &str,
        gross_amount: &str,
        signature: &str,
        transaction_status: &str,
        now: DateTime<Utc>,
    ) -> Result<(bool, &'static str), &'static str> {
        // 1. Verifikasi Signature SHA512
        let expected_sig = self.compute_sha512_signature(order_id, status_code, gross_amount);
        if !expected_sig.eq_ignore_ascii_case(signature) {
            self.webhook_log
                .push((order_id.to_string(), "FAILED_SIGNATURE".to_string()));
            return Err("Signature tidak valid");
        }

        // 2. Ambil transaksi
        let trx = match self.transaksi_db.get_mut(order_id) {
            Some(t) => t,
            None => {
                self.webhook_log
                    .push((order_id.to_string(), "NOT_FOUND".to_string()));
                return Err("Transaksi tidak ditemukan");
            }
        };

        // 3. Tangani Idempotensi & Out-of-Order Webhook
        if trx.status == StatusTransaksi::Settlement {
            // Sudah lunas! Abaikan webhook duplikat atau webhook late pending/expired
            self.webhook_log
                .push((order_id.to_string(), "IGNORED_DUPLICATE".to_string()));
            return Ok((false, "Idempotent: transaksi sudah lunas"));
        }

        match transaction_status {
            "settlement" | "capture" => {
                trx.status = StatusTransaksi::Settlement;
                trx.waktu_dibayar = Some(now);

                let tagihan_id = trx.tagihan_id;
                if let Some(tagihan) = self.tagihan_db.get_mut(&tagihan_id) {
                    tagihan.status = StatusTagihan::Lunas;
                    tagihan.lunas_at = Some(now);

                    let pid = tagihan.pendaftar_id;
                    self.pendaftar_langkah_db.insert(pid, "SELESAI".to_string());
                    self.pendaftar_status_db
                        .insert(pid, "MENUNGGU_UJIAN".to_string());
                    self.email_queue
                        .push(format!("Konfirmasi Lunas: {}", tagihan.nomor_tagihan));
                }

                self.webhook_log
                    .push((order_id.to_string(), "PROCESSED".to_string()));
                Ok((true, "Pembayaran berhasil diselesaikan"))
            }
            "expire" => {
                trx.status = StatusTransaksi::Expired;
                let tagihan_id = trx.tagihan_id;
                if let Some(tagihan) = self.tagihan_db.get_mut(&tagihan_id) {
                    if tagihan.status != StatusTagihan::Lunas {
                        tagihan.status = StatusTagihan::Kedaluwarsa;
                    }
                }
                self.webhook_log
                    .push((order_id.to_string(), "PROCESSED".to_string()));
                Ok((false, "Status kedaluwarsa dicatat"))
            }
            _ => {
                self.webhook_log
                    .push((order_id.to_string(), "PROCESSED".to_string()));
                Ok((false, "Status non-settlement dicatat"))
            }
        }
    }
}

// =========================================================================
// 3. Test Cases Wajib
// =========================================================================

#[test]
fn test_matriks_biaya_dan_voucher_perhitungan() {
    let mut engine = PaymentEngineSimulator::new("test_secret_key");
    let prodi_ti = Uuid::new_v4();
    let jalur_reguler = Uuid::new_v4();
    let gelombang_1 = Uuid::new_v4();

    // 1. Setup Matriks Biaya
    engine.matriks_biaya.push(MockMatriksBiaya {
        prodi_id: prodi_ti,
        jalur_id: jalur_reguler,
        gelombang_id: gelombang_1,
        nominal: 300_000,
    });

    let biaya = engine.hitung_biaya(prodi_ti, jalur_reguler, gelombang_1);
    assert_eq!(biaya, 300_000);

    // 2. Setup Voucher Diskon Persen (20%)
    let voucher_persen = MockVoucher {
        id: Uuid::new_v4(),
        kode_voucher: "DISKON20".to_string(),
        tipe_diskon: "PERCENT".to_string(),
        nilai_diskon: 20,
        kuota: 2,
        kuota_terpakai: 0,
        tgl_kadaluarsa: Utc::now() + Duration::days(7),
        is_active: true,
        batas_jalur_id: Some(jalur_reguler),
        batas_prodi_id: None,
    };
    engine
        .vouchers
        .insert("DISKON20".to_string(), voucher_persen);

    let now = Utc::now();
    let (diskon, nominal_akhir) = engine
        .validasi_dan_pakai_voucher("DISKON20", biaya, Some(jalur_reguler), Some(prodi_ti), now)
        .expect("Voucher harus valid");

    assert_eq!(diskon, 60_000); // 20% dari 300.000 = 60.000
    assert_eq!(nominal_akhir, 240_000);

    // 3. Cek pembatasan jalur pada voucher
    let jalur_lain = Uuid::new_v4();
    let res_jalur_salah =
        engine.validasi_dan_pakai_voucher("DISKON20", biaya, Some(jalur_lain), Some(prodi_ti), now);
    assert!(
        res_jalur_salah.is_err(),
        "Voucher harus ditolak jika jalur tidak cocok"
    );

    // 4. Cek batas kuota
    let _ = engine.validasi_dan_pakai_voucher(
        "DISKON20",
        biaya,
        Some(jalur_reguler),
        Some(prodi_ti),
        now,
    );
    let res_kuota_habis = engine.validasi_dan_pakai_voucher(
        "DISKON20",
        biaya,
        Some(jalur_reguler),
        Some(prodi_ti),
        now,
    );
    assert!(
        res_kuota_habis.is_err(),
        "Voucher harus ditolak bila kuota habis"
    );
}

#[test]
fn test_zero_nominal_voucher_auto_settlement() {
    let mut engine = PaymentEngineSimulator::new("test_secret_key");
    let pendaftar_id = Uuid::new_v4();

    // Tagihan 250.000 dengan diskon voucher 100% (250.000)
    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00001",
        250_000,
        250_000,
        Utc::now() + Duration::hours(24),
    );

    assert_eq!(tagihan.nominal_akhir, 0);
    assert_eq!(tagihan.status, StatusTagihan::Lunas);
    assert!(tagihan.lunas_at.is_some());

    // Pendaftaran otomatis maju
    assert_eq!(
        engine.pendaftar_langkah_db.get(&pendaftar_id).unwrap(),
        "SELESAI",
        "Langkah pembayaran harus otomatis SELESAI jika biaya Rp 0"
    );
    assert_eq!(
        engine.pendaftar_status_db.get(&pendaftar_id).unwrap(),
        "MENUNGGU_UJIAN",
        "Status pendaftar harus otomatis MENUNGGU_UJIAN jika lunas"
    );
    assert_eq!(
        engine.email_queue.len(),
        1,
        "Harus ada notifikasi email terkirim"
    );
}

#[test]
fn test_pembayaran_ganda_tercegah() {
    let mut engine = PaymentEngineSimulator::new("test_secret_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    // Buat tagihan
    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00002",
        250_000,
        0,
        now + Duration::hours(24),
    );

    // Charge pertama kali -> Berhasil
    let trx = engine
        .charge_gateway(tagihan.id, "TRX-001", "VA_BCA", now)
        .expect("Charge pertama harus berhasil");
    assert_eq!(trx.status, StatusTransaksi::Pending);

    // Lunaskan tagihan via webhook
    let sig = engine.compute_sha512_signature("TRX-001", "200", "250000");
    let (settled, _) = engine
        .process_webhook_idempoten("TRX-001", "200", "250000", &sig, "settlement", now)
        .expect("Webhook settlement harus sukses");
    assert!(settled);

    // Percobaan charge kedua pada tagihan yang sudah lunas -> DITOLAK
    let res_double_charge = engine.charge_gateway(tagihan.id, "TRX-002", "VA_BNI", now);
    assert!(
        res_double_charge.is_err(),
        "Tidak boleh mengizinkan charge pada tagihan yang sudah lunas"
    );
}

#[test]
fn test_kedaluwarsa_transaksi() {
    let mut engine = PaymentEngineSimulator::new("test_secret_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    // Tagihan yang sudah lewat batas waktu (kemarin)
    let expired_due = now - Duration::hours(2);
    let tagihan = engine.buat_tagihan(pendaftar_id, "INV-2026-00003", 250_000, 0, expired_due);

    // Charge pada tagihan kedaluwarsa -> DITOLAK
    let res_charge = engine.charge_gateway(tagihan.id, "TRX-003", "QRIS", now);
    assert!(
        res_charge.is_err(),
        "Charge tagihan kedaluwarsa harus ditolak"
    );

    // Simulasi transaksi pending yang kemudian kedaluwarsa via webhook
    let fresh_tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00004",
        250_000,
        0,
        now + Duration::hours(24),
    );
    let trx = engine
        .charge_gateway(fresh_tagihan.id, "TRX-004", "QRIS", now)
        .unwrap();

    let sig = engine.compute_sha512_signature("TRX-004", "202", "250000");
    let _ = engine.process_webhook_idempoten("TRX-004", "202", "250000", &sig, "expire", now);

    assert_eq!(
        engine.transaksi_db.get("TRX-004").unwrap().status,
        StatusTransaksi::Expired
    );
    assert_eq!(
        engine.tagihan_db.get(&trx.tagihan_id).unwrap().status,
        StatusTagihan::Kedaluwarsa
    );
}

#[test]
fn test_webhook_signature_validation() {
    let mut engine = PaymentEngineSimulator::new("super_secret_midtrans_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00005",
        250_000,
        0,
        now + Duration::hours(24),
    );
    let _ = engine
        .charge_gateway(tagihan.id, "TRX-005", "VA_BCA", now)
        .unwrap();

    // 1. Signature Valid
    let valid_sig = engine.compute_sha512_signature("TRX-005", "200", "250000");
    let res_valid =
        engine.process_webhook_idempoten("TRX-005", "200", "250000", &valid_sig, "settlement", now);
    assert!(
        res_valid.is_ok(),
        "Webhook dengan signature SHA512 valid harus diterima"
    );

    // 2. Signature Dimanipulasi / Salah
    let invalid_sig = "deadbeef1234567890abcdef";
    let res_invalid = engine.process_webhook_idempoten(
        "TRX-005",
        "200",
        "250000",
        invalid_sig,
        "settlement",
        now,
    );
    assert!(
        res_invalid.is_err(),
        "Webhook dengan signature salah harus ditolak"
    );
    assert_eq!(engine.webhook_log.last().unwrap().1, "FAILED_SIGNATURE");
}

#[test]
fn test_webhook_idempotensi_duplikat() {
    let mut engine = PaymentEngineSimulator::new("secret_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00006",
        250_000,
        0,
        now + Duration::hours(24),
    );
    let _ = engine
        .charge_gateway(tagihan.id, "TRX-006", "VA_BRI", now)
        .unwrap();
    let sig = engine.compute_sha512_signature("TRX-006", "200", "250000");

    // Panggilan webhook pertama -> Diproses
    let (settled1, _) = engine
        .process_webhook_idempoten("TRX-006", "200", "250000", &sig, "settlement", now)
        .expect("Webhook pertama harus sukses");
    assert!(settled1);
    assert_eq!(engine.email_queue.len(), 1);

    // Panggilan webhook kedua dengan payload identik (duplikasi jaringan / retry gateway)
    let (settled2, msg2) = engine
        .process_webhook_idempoten("TRX-006", "200", "250000", &sig, "settlement", now)
        .expect("Webhook kedua harus tetap mengembalikan status sukses");
    assert!(!settled2, "Webhook duplikat tidak boleh re-settle");
    assert!(msg2.contains("Idempotent"));
    assert_eq!(
        engine.email_queue.len(),
        1,
        "Email notifikasi tidak boleh dikirim dua kali"
    );
    assert_eq!(engine.webhook_log.last().unwrap().1, "IGNORED_DUPLICATE");
}

#[test]
fn test_webhook_out_of_order_handling() {
    let mut engine = PaymentEngineSimulator::new("secret_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00007",
        250_000,
        0,
        now + Duration::hours(24),
    );
    let _ = engine
        .charge_gateway(tagihan.id, "TRX-007", "VA_MANDIRI", now)
        .unwrap();
    let sig_settle = engine.compute_sha512_signature("TRX-007", "200", "250000");

    // Transaksi lunas lebih dulu (settlement)
    let (settled, _) = engine
        .process_webhook_idempoten("TRX-007", "200", "250000", &sig_settle, "settlement", now)
        .unwrap();
    assert!(settled);

    // Notifikasi pending yang datang terlambat (out-of-order)
    let sig_pending = engine.compute_sha512_signature("TRX-007", "201", "250000");
    let (re_settled, _) = engine
        .process_webhook_idempoten("TRX-007", "201", "250000", &sig_pending, "pending", now)
        .unwrap();
    assert!(!re_settled);

    // Notifikasi expire yang datang terlambat
    let sig_expire = engine.compute_sha512_signature("TRX-007", "202", "250000");
    let (expire_settled, _) = engine
        .process_webhook_idempoten("TRX-007", "202", "250000", &sig_expire, "expire", now)
        .unwrap();
    assert!(!expire_settled);

    // Status harus tetap Lunas & Settlement
    assert_eq!(
        engine.transaksi_db.get("TRX-007").unwrap().status,
        StatusTransaksi::Settlement,
        "Status transaksi tidak boleh berubah mundur dari Settlement"
    );
    assert_eq!(
        engine.tagihan_db.get(&tagihan.id).unwrap().status,
        StatusTagihan::Lunas,
        "Status tagihan tidak boleh berubah mundur dari Lunas"
    );
}

#[test]
fn test_mock_gateway_charge_dan_advance_langkah() {
    let mut engine = PaymentEngineSimulator::new("secret_key");
    let pendaftar_id = Uuid::new_v4();
    let now = Utc::now();

    // Inisialisasi state pendaftar
    engine
        .pendaftar_langkah_db
        .insert(pendaftar_id, "BELUM_SELESAI".to_string());
    engine
        .pendaftar_status_db
        .insert(pendaftar_id, "SUBMITTED".to_string());

    let tagihan = engine.buat_tagihan(
        pendaftar_id,
        "INV-2026-00008",
        250_000,
        0,
        now + Duration::hours(24),
    );
    let trx = engine
        .charge_gateway(tagihan.id, "TRX-008", "QRIS", now)
        .expect("Charge QRIS harus sukses");

    assert_eq!(trx.metode_pembayaran, "QRIS");
    assert_eq!(trx.status, StatusTransaksi::Pending);

    // Lunaskan transaksi
    let sig = engine.compute_sha512_signature("TRX-008", "200", "250000");
    let (settled, _) = engine
        .process_webhook_idempoten("TRX-008", "200", "250000", &sig, "settlement", now)
        .unwrap();
    assert!(settled);

    // Verifikasi kemajuan otomatis
    assert_eq!(
        engine.pendaftar_langkah_db.get(&pendaftar_id).unwrap(),
        "SELESAI",
        "Langkah pembayaran pendaftar harus otomatis maju ke SELESAI"
    );
    assert_eq!(
        engine.pendaftar_status_db.get(&pendaftar_id).unwrap(),
        "MENUNGGU_UJIAN",
        "Status pendaftar harus otomatis maju ke MENUNGGU_UJIAN"
    );
}
