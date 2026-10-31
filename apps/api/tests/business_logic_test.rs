// Unit test komprehensif logika bisnis krusial PMB Universitas Pignatelli Triputra
// 1. Biaya formulir & voucher
// 2. Passing grade & kuota kelulusan
// 3. Format baku Nomor Induk Mahasiswa (NIM)
// 4. Nomor Surat Penerimaan (LoA)
// 5. Penilaian Computer-Based Test (CBT)
// 6. Rekonsiliasi Pembayaran

use std::collections::HashMap;

// --- Logika Bisnis Murni ---

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

pub fn generate_nim_resmi(
    tahun_dua_digit: i32,
    kode_fakultas: &str,
    kode_prodi: &str,
    sequence: i64,
) -> String {
    format!(
        "{:02}{:0>2}{:0>2}{:04}",
        tahun_dua_digit % 100,
        kode_fakultas,
        kode_prodi,
        sequence
    )
}

pub fn generate_nomor_loa(tahun: i32, sequence: i64) -> String {
    format!("SK/PMB-UPT/{}/{:04}", tahun, sequence)
}

pub fn evaluasi_kelulusan(
    skor_akhir: f64,
    passing_prodi_1: f64,
    kuota_1: i32,
    passing_prodi_2: Option<f64>,
    kuota_2: i32,
) -> (&'static str, Option<usize>) {
    if skor_akhir >= passing_prodi_1 && kuota_1 > 0 {
        ("LULUS_PILIHAN_1", Some(1))
    } else if let Some(p2_pass) = passing_prodi_2 {
        if skor_akhir >= p2_pass && kuota_2 > 0 {
            ("LULUS_PILIHAN_2", Some(2))
        } else if skor_akhir >= (passing_prodi_1 - 5.0) {
            ("CADANGAN", None)
        } else {
            ("TIDAK_LULUS", None)
        }
    } else if skor_akhir >= (passing_prodi_1 - 5.0) {
        ("CADANGAN", None)
    } else {
        ("TIDAK_LULUS", None)
    }
}

pub fn hitung_skor_cbt(
    kunci_jawaban: &[(&str, &str, f64)],
    jawaban_user: &HashMap<&str, &str>,
) -> (f64, usize) {
    let mut total_bobot = 0.0;
    let mut bobot_benar = 0.0;
    let mut jumlah_benar = 0;

    for &(id, kunci, bobot) in kunci_jawaban {
        total_bobot += bobot;
        if jawaban_user
            .get(id)
            .is_some_and(|&jwb| jwb.eq_ignore_ascii_case(kunci))
        {
            bobot_benar += bobot;
            jumlah_benar += 1;
        }
    }

    let skor = if total_bobot > 0.0 {
        (bobot_benar / total_bobot) * 100.0
    } else {
        0.0
    };

    (skor, jumlah_benar)
}

pub fn verifikasi_pembayaran_transisi(
    status_sekarang: &str,
    aksi: &str,
) -> Result<&'static str, &'static str> {
    match (status_sekarang, aksi) {
        ("PENDING", "SIMULASI_VA") => Ok("LUNAS"),
        ("PENDING", "UPLOAD_BUKTI") => Ok("MENUNGGU_KONFIRMASI"),
        ("MENUNGGU_KONFIRMASI", "APPROVE") => Ok("LUNAS"),
        ("MENUNGGU_KONFIRMASI", "REJECT") => Ok("PENDING"),
        ("LUNAS", _) => Err("Tagihan ini sudah lunas, tidak dapat diubah lagi"),
        _ => Err("Transisi status pembayaran tidak valid"),
    }
}

// --- Test Cases ---

#[test]
fn test_biaya_dan_voucher_diskon() {
    let biaya_asli = 250_000;

    // Diskon persen 20%
    let diskon_persen = hitung_diskon_voucher("PERCENT", 20, biaya_asli);
    assert_eq!(diskon_persen, 50_000);
    assert_eq!(biaya_asli - diskon_persen, 200_000);

    // Diskon nominal Rp 100.000
    let diskon_nominal = hitung_diskon_voucher("NOMINAL", 100_000, biaya_asli);
    assert_eq!(diskon_nominal, 100_000);
    assert_eq!(biaya_asli - diskon_nominal, 150_000);

    // Diskon melebihi biaya asli -> diproteksi tidak minus
    let diskon_over = hitung_diskon_voucher("NOMINAL", 500_000, biaya_asli);
    assert_eq!(diskon_over, 250_000);
}

#[test]
fn test_format_baku_nim_resmi() {
    // Format: [Tahun (2)][Fakultas (2)][Prodi (2)][Urutan (4)]
    let nim_ti = generate_nim_resmi(2026, "01", "02", 42);
    assert_eq!(nim_ti, "2601020042");
    assert_eq!(nim_ti.len(), 10);

    let nim_si = generate_nim_resmi(2026, "01", "03", 1);
    assert_eq!(nim_si, "2601030001");
}

#[test]
fn test_format_nomor_loa() {
    let loa = generate_nomor_loa(2026, 42);
    assert_eq!(loa, "SK/PMB-UPT/2026/0042");
}

#[test]
fn test_evaluasi_passing_score_dan_kuota() {
    // 1. Tembus passing score pilihan 1
    let (res1, p1) = evaluasi_kelulusan(85.0, 70.0, 50, Some(65.0), 30);
    assert_eq!(res1, "LULUS_PILIHAN_1");
    assert_eq!(p1, Some(1));

    // 2. Gagal pilihan 1 tapi tembus pilihan 2
    let (res2, p2) = evaluasi_kelulusan(68.0, 75.0, 10, Some(65.0), 20);
    assert_eq!(res2, "LULUS_PILIHAN_2");
    assert_eq!(p2, Some(2));

    // 3. Cadangan (selisih <= 5 poin dari passing grade)
    let (res3, p3) = evaluasi_kelulusan(66.0, 70.0, 10, None, 0);
    assert_eq!(res3, "CADANGAN");
    assert_eq!(p3, None);

    // 4. Tidak lulus
    let (res4, p4) = evaluasi_kelulusan(50.0, 70.0, 10, Some(65.0), 10);
    assert_eq!(res4, "TIDAK_LULUS");
    assert_eq!(p4, None);
}

#[test]
fn test_skor_cbt_penilaian() {
    let soal = vec![
        ("q1", "A", 1.0),
        ("q2", "B", 1.0),
        ("q3", "C", 2.0),
        ("q4", "D", 1.0),
    ];
    let mut jawaban = HashMap::new();
    jawaban.insert("q1", "A"); // Benar (1.0)
    jawaban.insert("q2", "B"); // Benar (1.0)
    jawaban.insert("q3", "C"); // Benar (2.0)
    jawaban.insert("q4", "A"); // Salah (kunci D)

    let (skor, benar) = hitung_skor_cbt(&soal, &jawaban);
    assert_eq!(benar, 3);
    assert_eq!(skor, 80.0); // (4.0 / 5.0) * 100 = 80.0
}

#[test]
fn test_rekonsiliasi_status_pembayaran() {
    // Transisi dari PENDING -> LUNAS via simulasi VA
    assert_eq!(
        verifikasi_pembayaran_transisi("PENDING", "SIMULASI_VA"),
        Ok("LUNAS")
    );

    // Transisi dari PENDING -> MENUNGGU_KONFIRMASI via upload bukti
    assert_eq!(
        verifikasi_pembayaran_transisi("PENDING", "UPLOAD_BUKTI"),
        Ok("MENUNGGU_KONFIRMASI")
    );

    // Approve oleh keuangan
    assert_eq!(
        verifikasi_pembayaran_transisi("MENUNGGU_KONFIRMASI", "APPROVE"),
        Ok("LUNAS")
    );

    // Tolak jika tagihan sudah lunas
    assert!(verifikasi_pembayaran_transisi("LUNAS", "APPROVE").is_err());
}

#[test]
fn test_password_argon2_security() {
    use argon2::{
        Argon2,
        password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
    };

    let raw_pwd = "PignatelliTriputra2026!";
    let argon2 = Argon2::default();
    let hashed = argon2
        .hash_password(raw_pwd.as_bytes())
        .unwrap()
        .to_string();
    assert!(!hashed.is_empty());
    assert!(hashed.starts_with("$argon2id$"));

    let parsed = PasswordHash::new(&hashed).unwrap();
    assert!(
        Argon2::default()
            .verify_password(raw_pwd.as_bytes(), &parsed)
            .is_ok()
    );
    assert!(
        Argon2::default()
            .verify_password("PasswordSalah".as_bytes(), &parsed)
            .is_err()
    );
}
