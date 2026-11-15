//! Alur seleksi dan potongan biaya (DPP & SKS) per jalur READY.
//!
//! - `PENUH`: rapor -> CBT -> wawancara (READY Admission).
//! - `LANGSUNG_LULUS`: persetujuan admin pada seleksi rapor/berkas meluluskan CBT dan wawancara
//!   (READY Early, Partner Scholarship, Achievement, Legacy Scholarship, Future Leader).
//! - `TANPA_CBT`: persetujuan admin melewati CBT, wawancara tetap (READY Creator).

pub const ALUR_PENUH: &str = "PENUH";
pub const ALUR_LANGSUNG_LULUS: &str = "LANGSUNG_LULUS";
pub const ALUR_TANPA_CBT: &str = "TANPA_CBT";

pub const JALUR_ACHIEVEMENT: &str = "READY-ACHIEVEMENT";
pub const JALUR_CREATOR: &str = "READY-CREATOR";
pub const JALUR_LEGACY: &str = "READY-LEGACY";

pub const HUBUNGAN_ANAK: &str = "ANAK";
pub const HUBUNGAN_SAUDARA: &str = "SAUDARA";

pub const TINGKAT_INTERNASIONAL: &str = "INTERNASIONAL";
pub const TINGKAT_NASIONAL: &str = "NASIONAL";
pub const TINGKAT_PROVINSI: &str = "PROVINSI";
pub const TINGKAT_KOTA_KABUPATEN: &str = "KOTA_KABUPATEN";

/// Follower minimal agar content creator mendapat potongan.
pub const FOLLOWER_MINIMAL_CREATOR: i64 = 10_000;

/// Potongan READY Achievement dari rata-rata rapor:
/// > 88 = 100%, 83-88 = 75%, 78-82,9 = 50%, 75-77,9 = 25%, di bawah itu 0%.
pub fn potongan_dari_rapor(rata_rata: f64) -> i32 {
    if rata_rata > 88.0 {
        100
    } else if rata_rata >= 83.0 {
        75
    } else if rata_rata >= 78.0 {
        50
    } else if rata_rata >= 75.0 {
        25
    } else {
        0
    }
}

/// Potongan READY Achievement dari tingkat sertifikat prestasi.
pub fn potongan_dari_prestasi(tingkat: Option<&str>) -> i32 {
    match tingkat {
        Some(TINGKAT_INTERNASIONAL) => 100,
        Some(TINGKAT_NASIONAL) => 75,
        Some(TINGKAT_PROVINSI) => 50,
        Some(TINGKAT_KOTA_KABUPATEN) => 25,
        _ => 0,
    }
}

/// Potongan READY Legacy: anak alumni 50%, saudara alumni 25%.
pub fn potongan_dari_alumni(hubungan: Option<&str>) -> Option<i32> {
    match hubungan {
        Some(HUBUNGAN_ANAK) => Some(50),
        Some(HUBUNGAN_SAUDARA) => Some(25),
        _ => None,
    }
}

/// Aturan satu jalur (dari kolom `jalur_masuk`).
#[derive(Debug, Clone)]
pub struct AturanJalur<'a> {
    pub kode_jalur: &'a str,
    pub rapor_minimal: Option<f64>,
    pub potongan_tetap: Option<i32>,
    pub potongan_maks: Option<i32>,
    /// Ambang rata-rata rapor: di atas/sama dengan ambang mendapat `potongan_tetap`
    pub potongan_ambang_rapor: Option<f64>,
    /// Potongan bila rapor di bawah ambang; kosong = di bawah ambang tidak memenuhi syarat
    pub potongan_di_bawah_ambang: Option<i32>,
}

/// Masukan penilaian admin.
#[derive(Debug, Clone, Default)]
pub struct MasukanPotongan<'a> {
    pub rata_rata_rapor: Option<f64>,
    pub tingkat_prestasi: Option<&'a str>,
    pub jumlah_follower: Option<i64>,
    /// READY Legacy: ANAK | SAUDARA (alumni UPITRA)
    pub hubungan_alumni: Option<&'a str>,
    /// Potongan pilihan admin (hanya dipakai jalur yang potongannya ditentukan admin)
    pub potongan_admin: Option<i32>,
}

/// Hitung potongan DPP & SKS (persen). Galat berisi pesan untuk admin.
pub fn hitung_potongan(aturan: &AturanJalur, m: &MasukanPotongan) -> Result<i32, String> {
    if let Some(min) = aturan.rapor_minimal {
        match m.rata_rata_rapor {
            Some(n) if n >= min => {}
            Some(_) => return Err(format!("Rata-rata rapor minimal {min} untuk jalur ini")),
            None => return Err("Rata-rata rapor wajib diisi".to_string()),
        }
    }

    if aturan.kode_jalur == JALUR_ACHIEVEMENT {
        let dari_rapor = m.rata_rata_rapor.map(potongan_dari_rapor).unwrap_or(0);
        let dari_prestasi = potongan_dari_prestasi(m.tingkat_prestasi);
        let p = dari_rapor.max(dari_prestasi);
        if p == 0 {
            return Err(
                "Belum memenuhi syarat: rapor minimal 75 atau sertifikat prestasi yang sah"
                    .to_string(),
            );
        }
        return Ok(p);
    }

    if aturan.kode_jalur == JALUR_CREATOR {
        let cukup = m.jumlah_follower.unwrap_or(0) >= FOLLOWER_MINIMAL_CREATOR;
        return Ok(if cukup {
            aturan.potongan_tetap.unwrap_or(0)
        } else {
            0
        });
    }

    if aturan.kode_jalur == JALUR_LEGACY {
        return potongan_dari_alumni(m.hubungan_alumni).ok_or_else(|| {
            "Pilih hubungan dengan alumni: anak alumni (50%) atau saudara alumni (25%)".to_string()
        });
    }

    // Potongan bertingkat menurut rapor: >= ambang = potongan tetap, di bawahnya potongan lain
    if let Some(ambang) = aturan.potongan_ambang_rapor {
        let Some(rapor) = m.rata_rata_rapor else {
            return Err("Rata-rata rapor wajib diisi".to_string());
        };
        if rapor >= ambang {
            return Ok(aturan.potongan_tetap.unwrap_or(0));
        }
        return aturan
            .potongan_di_bawah_ambang
            .ok_or_else(|| format!("Rata-rata rapor minimal {ambang} untuk jalur ini"));
    }

    if let Some(tetap) = aturan.potongan_tetap {
        return Ok(tetap);
    }

    // Potongan ditentukan admin (Future Leader: up to 75%; Legacy/Admission: bawaan 0%)
    let batas = aturan.potongan_maks.unwrap_or(0);
    let p = m
        .potongan_admin
        .unwrap_or(batas.min(aturan.potongan_maks.unwrap_or(0)));
    if !(0..=batas).contains(&p) {
        return Err(format!("Potongan harus antara 0 dan {batas} persen"));
    }
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn aturan(kode: &'static str) -> AturanJalur<'static> {
        AturanJalur {
            kode_jalur: kode,
            rapor_minimal: None,
            potongan_tetap: None,
            potongan_maks: None,
            potongan_ambang_rapor: None,
            potongan_di_bawah_ambang: None,
        }
    }

    #[test]
    fn achievement_rapor_berjenjang() {
        assert_eq!(potongan_dari_rapor(90.0), 100);
        assert_eq!(potongan_dari_rapor(88.0), 75);
        assert_eq!(potongan_dari_rapor(83.0), 75);
        assert_eq!(potongan_dari_rapor(82.9), 50);
        assert_eq!(potongan_dari_rapor(78.0), 50);
        assert_eq!(potongan_dari_rapor(77.9), 25);
        assert_eq!(potongan_dari_rapor(75.0), 25);
        assert_eq!(potongan_dari_rapor(74.9), 0);
    }

    #[test]
    fn achievement_mengambil_potongan_terbesar_rapor_atau_sertifikat() {
        let a = aturan(JALUR_ACHIEVEMENT);
        let m = MasukanPotongan {
            rata_rata_rapor: Some(80.0),
            tingkat_prestasi: Some(TINGKAT_NASIONAL),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &m), Ok(75));
        let m = MasukanPotongan {
            rata_rata_rapor: Some(90.0),
            tingkat_prestasi: Some(TINGKAT_KOTA_KABUPATEN),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &m), Ok(100));
        // Rapor rendah tetapi sertifikat internasional
        let m = MasukanPotongan {
            rata_rata_rapor: Some(60.0),
            tingkat_prestasi: Some(TINGKAT_INTERNASIONAL),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &m), Ok(100));
        // Tidak memenuhi apa pun
        let m = MasukanPotongan {
            rata_rata_rapor: Some(60.0),
            ..Default::default()
        };
        assert!(hitung_potongan(&a, &m).is_err());
    }

    #[test]
    fn early_dan_partner_wajib_rapor_minimal() {
        let early = AturanJalur {
            kode_jalur: "READY-EARLY",
            rapor_minimal: Some(80.0),
            potongan_tetap: Some(100),
            potongan_maks: None,
            potongan_ambang_rapor: None,
            potongan_di_bawah_ambang: None,
        };
        let ok = MasukanPotongan {
            rata_rata_rapor: Some(80.0),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&early, &ok), Ok(100));
        let kurang = MasukanPotongan {
            rata_rata_rapor: Some(79.9),
            ..Default::default()
        };
        assert!(hitung_potongan(&early, &kurang).is_err());
        assert!(hitung_potongan(&early, &MasukanPotongan::default()).is_err());
    }

    #[test]
    fn creator_potongan_50_bila_follower_cukup() {
        let a = AturanJalur {
            kode_jalur: JALUR_CREATOR,
            rapor_minimal: None,
            potongan_tetap: Some(50),
            potongan_maks: None,
            potongan_ambang_rapor: None,
            potongan_di_bawah_ambang: None,
        };
        let banyak = MasukanPotongan {
            jumlah_follower: Some(10_000),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &banyak), Ok(50));
        let sedikit = MasukanPotongan {
            jumlah_follower: Some(9_999),
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &sedikit), Ok(0));
    }

    #[test]
    fn future_leader_hingga_75_persen_pilihan_admin() {
        let a = AturanJalur {
            kode_jalur: "READY-FUTURE-LEADER",
            rapor_minimal: Some(75.0),
            potongan_tetap: None,
            potongan_maks: Some(75),
            potongan_ambang_rapor: None,
            potongan_di_bawah_ambang: None,
        };
        let m = |p| MasukanPotongan {
            rata_rata_rapor: Some(76.0),
            potongan_admin: p,
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &m(Some(40))), Ok(40));
        assert_eq!(hitung_potongan(&a, &m(None)), Ok(75));
        assert!(hitung_potongan(&a, &m(Some(80))).is_err());
    }

    #[test]
    fn potongan_bertingkat_menurut_ambang_rapor() {
        let mut a = aturan("READY-EARLY");
        a.potongan_tetap = Some(100);
        a.potongan_ambang_rapor = Some(80.0);
        let rapor = |n: f64| MasukanPotongan {
            rata_rata_rapor: Some(n),
            ..Default::default()
        };
        // tepat 80 dan di atasnya: potongan tetap
        assert_eq!(hitung_potongan(&a, &rapor(80.0)), Ok(100));
        assert_eq!(hitung_potongan(&a, &rapor(95.5)), Ok(100));
        // di bawah 80 tanpa potongan lain: tidak memenuhi syarat
        assert!(hitung_potongan(&a, &rapor(79.9)).is_err());
        // di bawah 80 dengan potongan yang diatur admin
        a.potongan_di_bawah_ambang = Some(50);
        assert_eq!(hitung_potongan(&a, &rapor(79.9)), Ok(50));
        assert_eq!(hitung_potongan(&a, &rapor(60.0)), Ok(50));
        // rapor wajib diisi
        assert!(hitung_potongan(&a, &MasukanPotongan::default()).is_err());
        // batas minimal tetap berlaku lebih dulu
        a.rapor_minimal = Some(70.0);
        assert!(hitung_potongan(&a, &rapor(65.0)).is_err());
        assert_eq!(hitung_potongan(&a, &rapor(72.0)), Ok(50));
    }

    #[test]
    fn legacy_anak_dan_saudara_alumni() {
        let a = aturan(JALUR_LEGACY);
        let m = |h: Option<&'static str>| MasukanPotongan {
            hubungan_alumni: h,
            ..Default::default()
        };
        assert_eq!(hitung_potongan(&a, &m(Some("ANAK"))), Ok(50));
        assert_eq!(hitung_potongan(&a, &m(Some("SAUDARA"))), Ok(25));
        assert!(hitung_potongan(&a, &m(None)).is_err());
        assert!(hitung_potongan(&a, &m(Some("TEMAN"))).is_err());
    }
}
