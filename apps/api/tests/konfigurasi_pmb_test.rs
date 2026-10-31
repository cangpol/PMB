// Test suite komprehensif Modul Konfigurasi PMB Admin
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian:
// 1. Validasi tanggal gelombang tidak tumpang tindih (non-overlapping dates)
// 2. Validasi kuota tidak boleh negatif (kuota >= 0)
// 3. Aturan unik kode voucher
// 4. Aturan voucher (kuota, kedaluwarsa, batas jalur & prodi, kalkulasi diskon)
// 5. Pencegahan kondisi balapan (race condition / concurrency) pada klaim kuota voucher
// 6. Perhitungan matriks biaya & skema simulasi cicilan
// 7. Otorisasi RBAC: Hanya admin_pmb dan super_admin yang berwenang, calon_mahasiswa ditolak (403 Forbidden)

use chrono::{DateTime, Duration, Utc};
use std::sync::{
    Arc,
    atomic::{AtomicI32, Ordering},
};
use uuid::Uuid;

// =========================================================================
// 1. Logika Validasi Gelombang Tumpang Tindih (Date Overlap Check)
// =========================================================================
pub fn is_gelombang_overlapping(
    existing_start: DateTime<Utc>,
    existing_end: DateTime<Utc>,
    new_start: DateTime<Utc>,
    new_end: DateTime<Utc>,
) -> bool {
    // Dua rentang [A, B] dan [C, D] tumpang tindih jika C < B && D > A
    new_start < existing_end && new_end > existing_start
}

#[test]
fn test_gelombang_overlapping_detection() {
    let base = Utc::now();
    let gelombang1_start = base;
    let gelombang1_end = base + Duration::days(30);

    // Kasus 1: Gelombang baru persis di dalam rentang Gelombang 1
    let inside_start = base + Duration::days(10);
    let inside_end = base + Duration::days(20);
    assert!(
        is_gelombang_overlapping(gelombang1_start, gelombang1_end, inside_start, inside_end),
        "Gelombang di dalam rentang harus dideteksi tumpang tindih"
    );

    // Kasus 2: Gelombang baru mulai sebelum akhir Gelombang 1 dan selesai sesudahnya
    let overlap_right_start = base + Duration::days(25);
    let overlap_right_end = base + Duration::days(50);
    assert!(
        is_gelombang_overlapping(
            gelombang1_start,
            gelombang1_end,
            overlap_right_start,
            overlap_right_end
        ),
        "Gelombang tumpang tindih parsial kanan harus dideteksi"
    );

    // Kasus 3: Gelombang baru mulai sebelum Gelombang 1 dan selesai di dalamnya
    let overlap_left_start = base - Duration::days(10);
    let overlap_left_end = base + Duration::days(5);
    assert!(
        is_gelombang_overlapping(
            gelombang1_start,
            gelombang1_end,
            overlap_left_start,
            overlap_left_end
        ),
        "Gelombang tumpang tindih parsial kiri harus dideteksi"
    );

    // Kasus 4: Gelombang baru melingkupi seluruh rentang Gelombang 1
    let enclosing_start = base - Duration::days(5);
    let enclosing_end = base + Duration::days(35);
    assert!(
        is_gelombang_overlapping(
            gelombang1_start,
            gelombang1_end,
            enclosing_start,
            enclosing_end
        ),
        "Gelombang yang melingkupi harus dideteksi tumpang tindih"
    );

    // Kasus 5: Gelombang baru setelah Gelombang 1 (valid, tidak tumpang tindih)
    let valid_next_start = base + Duration::days(31);
    let valid_next_end = base + Duration::days(60);
    assert!(
        !is_gelombang_overlapping(
            gelombang1_start,
            gelombang1_end,
            valid_next_start,
            valid_next_end
        ),
        "Gelombang berurutan setelahnya tidak boleh tumpang tindih"
    );

    // Kasus 6: Gelombang baru sebelum Gelombang 1 (valid, tidak tumpang tindih)
    let valid_prev_start = base - Duration::days(40);
    let valid_prev_end = base - Duration::days(1);
    assert!(
        !is_gelombang_overlapping(
            gelombang1_start,
            gelombang1_end,
            valid_prev_start,
            valid_prev_end
        ),
        "Gelombang sebelum gelombang 1 tidak boleh tumpang tindih"
    );
}

// =========================================================================
// 2. Logika Kuota Non-Negatif
// =========================================================================
pub fn validasi_kuota(kuota: i32) -> Result<(), &'static str> {
    if kuota < 0 {
        Err("Kuota tidak boleh bernilai negatif")
    } else {
        Ok(())
    }
}

#[test]
fn test_kuota_non_negative_validation() {
    assert!(validasi_kuota(0).is_ok());
    assert!(validasi_kuota(50).is_ok());
    assert!(validasi_kuota(1000).is_ok());

    assert_eq!(
        validasi_kuota(-1),
        Err("Kuota tidak boleh bernilai negatif")
    );
    assert_eq!(
        validasi_kuota(-100),
        Err("Kuota tidak boleh bernilai negatif")
    );
}

// =========================================================================
// 3. Logika Keunikan Kode Voucher
// =========================================================================
#[test]
fn test_voucher_code_canonicalization_and_uniqueness() {
    let mut voucher_codes = std::collections::HashSet::new();

    let code1 = "TRIPUTRA2026".trim().to_uppercase();
    assert!(voucher_codes.insert(code1.clone()));

    // Kode yang sama dengan spasi dan huruf kecil harus dianggap duplikat
    let code2 = "  triputra2026  ".trim().to_uppercase();
    assert!(
        !voucher_codes.insert(code2),
        "Kode voucher dengan case-insensitive atau spasi harus ditolak sebagai duplikat"
    );

    let code3 = "EARLYBIRD".trim().to_uppercase();
    assert!(voucher_codes.insert(code3));
}

// =========================================================================
// 4. Aturan Voucher (Kuota, Kedaluwarsa, Batas Jalur/Prodi, Nilai Diskon)
// =========================================================================
#[derive(Clone, Debug)]
pub struct MockVoucher {
    pub kode: String,
    pub tipe: String, // "NOMINAL" | "PERCENT"
    pub nilai: i64,
    pub kuota: i32,
    pub kuota_terpakai: i32,
    pub tgl_kadaluarsa: DateTime<Utc>,
    pub batas_jalur_id: Option<Uuid>,
    pub batas_prodi_id: Option<Uuid>,
    pub is_active: bool,
}

pub fn evaluasi_voucher(
    voucher: &MockVoucher,
    nominal_biaya: i64,
    jalur_id: Uuid,
    prodi_id: Uuid,
) -> Result<(i64, i64), String> {
    if !voucher.is_active {
        return Err("Voucher tidak aktif".to_string());
    }

    if Utc::now() > voucher.tgl_kadaluarsa {
        return Err("Masa berlaku voucher telah berakhir".to_string());
    }

    if voucher.kuota_terpakai >= voucher.kuota {
        return Err("Kuota voucher telah habis terpakai".to_string());
    }

    if voucher.batas_jalur_id.is_some_and(|b| b != jalur_id) {
        return Err("Voucher tidak berlaku untuk jalur ini".to_string());
    }

    if voucher.batas_prodi_id.is_some_and(|b| b != prodi_id) {
        return Err("Voucher tidak berlaku untuk program studi ini".to_string());
    }

    let diskon = match voucher.tipe.as_str() {
        "PERCENT" => {
            let pct = voucher.nilai.clamp(0, 100);
            (nominal_biaya * pct) / 100
        }
        "NOMINAL" => voucher.nilai.min(nominal_biaya).max(0),
        _ => 0,
    };

    let total_bayar = (nominal_biaya - diskon).max(0);
    Ok((diskon, total_bayar))
}

#[test]
fn test_voucher_rules_and_restrictions() {
    let prodi_si = Uuid::new_v4();
    let prodi_if = Uuid::new_v4();
    let jalur_rapor = Uuid::new_v4();
    let jalur_cbt = Uuid::new_v4();

    // 1. Voucher Kedaluwarsa
    let expired_voucher = MockVoucher {
        kode: "EXPIRED".to_string(),
        tipe: "NOMINAL".to_string(),
        nilai: 50000,
        kuota: 10,
        kuota_terpakai: 2,
        tgl_kadaluarsa: Utc::now() - Duration::days(1),
        batas_jalur_id: None,
        batas_prodi_id: None,
        is_active: true,
    };
    let res = evaluasi_voucher(&expired_voucher, 250000, jalur_rapor, prodi_si);
    assert_eq!(res.unwrap_err(), "Masa berlaku voucher telah berakhir");

    // 2. Voucher Kuota Habis
    let full_voucher = MockVoucher {
        kode: "FULL".to_string(),
        tipe: "PERCENT".to_string(),
        nilai: 50,
        kuota: 10,
        kuota_terpakai: 10,
        tgl_kadaluarsa: Utc::now() + Duration::days(30),
        batas_jalur_id: None,
        batas_prodi_id: None,
        is_active: true,
    };
    let res = evaluasi_voucher(&full_voucher, 250000, jalur_rapor, prodi_si);
    assert_eq!(res.unwrap_err(), "Kuota voucher telah habis terpakai");

    // 3. Batas Jalur Mismatch
    let jalur_locked_voucher = MockVoucher {
        kode: "KHUSUS_RAPOR".to_string(),
        tipe: "PERCENT".to_string(),
        nilai: 20,
        kuota: 50,
        kuota_terpakai: 0,
        tgl_kadaluarsa: Utc::now() + Duration::days(30),
        batas_jalur_id: Some(jalur_rapor),
        batas_prodi_id: None,
        is_active: true,
    };
    let res = evaluasi_voucher(&jalur_locked_voucher, 250000, jalur_cbt, prodi_si);
    assert_eq!(res.unwrap_err(), "Voucher tidak berlaku untuk jalur ini");

    // 4. Batas Prodi Mismatch
    let prodi_locked_voucher = MockVoucher {
        kode: "KHUSUS_SI".to_string(),
        tipe: "NOMINAL".to_string(),
        nilai: 100000,
        kuota: 50,
        kuota_terpakai: 0,
        tgl_kadaluarsa: Utc::now() + Duration::days(30),
        batas_jalur_id: None,
        batas_prodi_id: Some(prodi_si),
        is_active: true,
    };
    let res = evaluasi_voucher(&prodi_locked_voucher, 250000, jalur_rapor, prodi_if);
    assert_eq!(
        res.unwrap_err(),
        "Voucher tidak berlaku untuk program studi ini"
    );

    // 5. Valid: Diskon Nominal
    let valid_nominal = MockVoucher {
        kode: "POTONGAN50K".to_string(),
        tipe: "NOMINAL".to_string(),
        nilai: 50000,
        kuota: 50,
        kuota_terpakai: 5,
        tgl_kadaluarsa: Utc::now() + Duration::days(30),
        batas_jalur_id: None,
        batas_prodi_id: None,
        is_active: true,
    };
    let (diskon, total) = evaluasi_voucher(&valid_nominal, 250000, jalur_rapor, prodi_si).unwrap();
    assert_eq!(diskon, 50000);
    assert_eq!(total, 200000);

    // 6. Valid: Diskon Persen 50%
    let valid_percent = MockVoucher {
        kode: "DISKON50".to_string(),
        tipe: "PERCENT".to_string(),
        nilai: 50,
        kuota: 50,
        kuota_terpakai: 5,
        tgl_kadaluarsa: Utc::now() + Duration::days(30),
        batas_jalur_id: None,
        batas_prodi_id: None,
        is_active: true,
    };
    let (diskon, total) = evaluasi_voucher(&valid_percent, 250000, jalur_rapor, prodi_si).unwrap();
    assert_eq!(diskon, 125000);
    assert_eq!(total, 125000);
}

// =========================================================================
// 5. Pencegahan Kondisi Balapan (Concurrency / Atomic Claim Safety)
// =========================================================================
pub struct AtomicVoucherPool {
    pub kuota: i32,
    pub kuota_terpakai: AtomicI32,
}

impl AtomicVoucherPool {
    pub fn new(kuota: i32) -> Self {
        Self {
            kuota,
            kuota_terpakai: AtomicI32::new(0),
        }
    }

    /// Mensimulasikan operasi atomik test-and-set database:
    /// `UPDATE vouchers SET kuota_terpakai = kuota_terpakai + 1 WHERE kuota_terpakai < kuota`
    pub fn try_claim(&self) -> bool {
        let mut current = self.kuota_terpakai.load(Ordering::Acquire);
        loop {
            if current >= self.kuota {
                return false; // Kuota telah habis
            }
            match self.kuota_terpakai.compare_exchange_weak(
                current,
                current + 1,
                Ordering::SeqCst,
                Ordering::Acquire,
            ) {
                Ok(_) => return true,            // Berhasil mengklaim kuota secara atomik
                Err(actual) => current = actual, // Bersaing dengan thread lain, coba lagi
            }
        }
    }
}

#[test]
fn test_concurrent_voucher_claims_no_race_condition() {
    let total_kuota = 5;
    let pool = Arc::new(AtomicVoucherPool::new(total_kuota));
    let num_threads = 25; // 25 pendaftar berebut 5 voucher bersamaan

    let mut handles = Vec::new();
    let successful_claims = Arc::new(AtomicI32::new(0));

    for _ in 0..num_threads {
        let p = Arc::clone(&pool);
        let s = Arc::clone(&successful_claims);
        let handle = std::thread::spawn(move || {
            if p.try_claim() {
                s.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for h in handles {
        h.join().expect("Thread panics");
    }

    // Verifikasi ketat: Tepat 5 klaim yang berhasil, 20 klaim ditolak
    assert_eq!(
        successful_claims.load(Ordering::SeqCst),
        total_kuota,
        "Jumlah klaim sukses harus persis sama dengan kuota maksimum"
    );
    assert_eq!(
        pool.kuota_terpakai.load(Ordering::SeqCst),
        total_kuota,
        "Kuota terpakai tidak boleh melebihi kuota total (tidak boleh terjadi over-issuance)"
    );
}

// =========================================================================
// 6. Perhitungan Matriks Biaya & Skema Cicilan
// =========================================================================
#[derive(Clone, Debug)]
pub struct MockKomponenMatriks {
    pub kode: &'static str,
    pub nama: &'static str,
    pub nominal: i64,
    pub bisa_dicicil: bool,
    pub maksimal_cicilan: i32,
    pub nominal_cicilan_pertama: Option<i64>,
}

#[derive(Debug)]
pub struct SimulasiBiayaResult {
    pub total_biaya: i64,
    pub diskon_voucher: i64,
    pub total_setelah_diskon: i64,
    pub minimal_bayar_pertama: i64,
    pub jadwal_cicilan: Vec<(usize, i64)>, // (termin, nominal)
}

pub fn kalkulasi_matriks_dan_cicilan(
    komponen_list: &[MockKomponenMatriks],
    diskon_voucher: i64,
) -> SimulasiBiayaResult {
    let mut total_biaya = 0i64;
    let mut min_bayar_pertama = 0i64;
    let mut max_cicilan = 1;

    for k in komponen_list {
        total_biaya += k.nominal;
        if k.bisa_dicicil {
            max_cicilan = max_cicilan.max(k.maksimal_cicilan);
            let cicilan_1 = k
                .nominal_cicilan_pertama
                .unwrap_or(k.nominal / k.maksimal_cicilan.max(1) as i64);
            min_bayar_pertama += cicilan_1;
        } else {
            min_bayar_pertama += k.nominal;
        }
    }

    let diskon_terpakai = diskon_voucher.min(total_biaya).max(0);
    let total_setelah_diskon = total_biaya - diskon_terpakai;
    let bayar_pertama_final = (min_bayar_pertama - diskon_terpakai).max(0);

    // Distribusi termin cicilan
    let mut jadwal = Vec::new();
    if max_cicilan > 1 {
        jadwal.push((1, bayar_pertama_final));
        let sisa = total_setelah_diskon - bayar_pertama_final;
        let per_termin = sisa / (max_cicilan - 1) as i64;
        let mut distributed = 0i64;

        for termin in 2..=max_cicilan {
            if termin == max_cicilan {
                jadwal.push((termin as usize, sisa - distributed));
            } else {
                jadwal.push((termin as usize, per_termin));
                distributed += per_termin;
            }
        }
    } else {
        jadwal.push((1, total_setelah_diskon));
    }

    SimulasiBiayaResult {
        total_biaya,
        diskon_voucher: diskon_terpakai,
        total_setelah_diskon,
        minimal_bayar_pertama: bayar_pertama_final,
        jadwal_cicilan: jadwal,
    }
}

#[test]
fn test_perhitungan_biaya_dan_cicilan() {
    let komponen = vec![
        MockKomponenMatriks {
            kode: "DPK",
            nama: "Uang Gedung",
            nominal: 6000000,
            bisa_dicicil: true,
            maksimal_cicilan: 3,
            nominal_cicilan_pertama: Some(3000000), // termin 1: 3jt, sisa 3jt
        },
        MockKomponenMatriks {
            kode: "UKT",
            nama: "UKT Semester 1",
            nominal: 5000000,
            bisa_dicicil: true,
            maksimal_cicilan: 2,
            nominal_cicilan_pertama: Some(2500000), // termin 1: 2.5jt, sisa 2.5jt
        },
        MockKomponenMatriks {
            kode: "ALM",
            nama: "Jas Almamater",
            nominal: 1000000,
            bisa_dicicil: false, // Wajib lunas di depan
            maksimal_cicilan: 1,
            nominal_cicilan_pertama: None,
        },
    ];

    // Kasus 1: Tanpa Voucher
    let res = kalkulasi_matriks_dan_cicilan(&komponen, 0);
    assert_eq!(res.total_biaya, 12000000);
    assert_eq!(res.diskon_voucher, 0);
    assert_eq!(res.total_setelah_diskon, 12000000);
    // Minimal bayar pertama: 3jt (DPK) + 2.5jt (UKT) + 1jt (ALM wajib) = 6.500.000
    assert_eq!(res.minimal_bayar_pertama, 6500000);
    // Termin:
    // Termin 1: 6.500.000
    // Sisa: 5.500.000 dibagi ke termin 2 dan 3
    assert_eq!(res.jadwal_cicilan.len(), 3);
    assert_eq!(res.jadwal_cicilan[0], (1, 6500000));
    assert_eq!(res.jadwal_cicilan[1], (2, 2750000));
    assert_eq!(res.jadwal_cicilan[2], (3, 2750000));

    // Kasus 2: Dengan Voucher Diskon 500.000
    let res_voucher = kalkulasi_matriks_dan_cicilan(&komponen, 500000);
    assert_eq!(res_voucher.total_biaya, 12000000);
    assert_eq!(res_voucher.diskon_voucher, 500000);
    assert_eq!(res_voucher.total_setelah_diskon, 11500000);
    assert_eq!(res_voucher.minimal_bayar_pertama, 6000000);
}

// =========================================================================
// 7. Otorisasi RBAC: Calon Mahasiswa DITOLAK (403 Forbidden)
// =========================================================================
pub fn check_admin_authorization(role: &str) -> Result<(), (u16, &'static str)> {
    match role {
        "super_admin" | "admin_pmb" => Ok(()),
        _ => Err((
            403,
            "Akses ditolak: Hanya admin_pmb dan super_admin yang berwenang mengubah konfigurasi PMB",
        )),
    }
}

#[test]
fn test_rbac_admin_konfigurasi_access_control() {
    // 1. Admin yang sah
    assert!(check_admin_authorization("super_admin").is_ok());
    assert!(check_admin_authorization("admin_pmb").is_ok());

    // 2. Calon Mahasiswa DITOLAK keras
    let calon_err = check_admin_authorization("calon_mahasiswa").unwrap_err();
    assert_eq!(calon_err.0, 403);
    assert!(calon_err.1.contains("Akses ditolak"));

    // 3. Peran non-admin lainnya juga ditolak
    assert_eq!(check_admin_authorization("keuangan").unwrap_err().0, 403);
    assert_eq!(
        check_admin_authorization("pengawas_ujian").unwrap_err().0,
        403
    );
    assert_eq!(check_admin_authorization("asesor_rpl").unwrap_err().0, 403);
}
