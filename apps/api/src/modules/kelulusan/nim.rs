//! Rumus penomoran NIM berbasis templat yang dapat diatur admin.
//!
//! Token yang dikenali (huruf besar, dalam kurung kurawal):
//!   {TAHUN} 4 digit, {TAHUN2} 2 digit, {KODE_JENJANG} (S1=1, S2=2, D3=3, D4=4),
//!   {JENJANG} (S1/D3/...), {KODE_PRODI} atau {KODE_PRODI:N} (N karakter terakhir),
//!   {KODE_ANGKA} (kode prodi 2 digit, mis. 31), {KODE_FAKULTAS}, dan {URUT:N} nomor urut N digit (wajib, tepat satu).
//! Karakter lain boleh huruf/angka/tanda hubung/titik/garis miring.

pub const TEMPLATE_BAWAAN: &str = "{TAHUN2}{KODE_ANGKA}{URUT:4}";
/// Kolom `nim_resmi` bertipe VARCHAR(20).
pub const PANJANG_MAKS: usize = 20;

pub const LINGKUP: [(&str, &str); 3] = [
    (
        "PER_PRODI_TAHUN",
        "Nomor urut mulai dari 1 untuk setiap program studi di setiap tahun",
    ),
    (
        "PER_TAHUN",
        "Nomor urut mulai dari 1 setiap tahun, dibagi untuk seluruh program studi",
    ),
    (
        "GLOBAL",
        "Satu nomor urut berlanjut untuk semua tahun dan prodi",
    ),
];

pub const TOKEN: [(&str, &str, &str); 8] = [
    ("{TAHUN}", "Tahun masuk 4 digit", "2027"),
    ("{TAHUN2}", "Tahun masuk 2 digit", "27"),
    (
        "{KODE_ANGKA}",
        "Kode prodi 2 digit (mis. 31 Bahasa Inggris)",
        "31",
    ),
    (
        "{KODE_JENJANG}",
        "Kode jenjang (S1=1, S2=2, D3=3, D4=4)",
        "1",
    ),
    ("{KODE_PRODI:2}", "N karakter terakhir kode prodi", "02"),
    ("{KODE_FAKULTAS}", "Kode fakultas", "FT"),
    ("{JENJANG}", "Jenjang (S1, D3, ...)", "S1"),
    ("{URUT:4}", "Nomor urut N digit (wajib)", "0001"),
];

#[derive(Debug, Clone)]
pub struct KonteksNim {
    pub tahun: i32,
    pub jenjang: String,
    pub kode_prodi: String,
    /// Kode prodi 2 digit untuk {KODE_ANGKA}
    pub kode_angka: String,
    pub kode_fakultas: String,
    pub urut: i64,
}

#[derive(Debug, PartialEq)]
enum Potong {
    Teks(String),
    Tahun,
    Tahun2,
    KodeJenjang,
    Jenjang,
    KodeProdi(Option<usize>),
    KodeAngka,
    KodeFakultas,
    Urut(usize),
}

fn kode_jenjang(jenjang: &str) -> &'static str {
    match jenjang {
        "S1" => "1",
        "S2" => "2",
        "D3" => "3",
        "D4" => "4",
        _ => "1",
    }
}

fn parse(template: &str) -> Result<Vec<Potong>, String> {
    let mut out = Vec::new();
    let mut teks = String::new();
    let mut it = template.chars().peekable();
    while let Some(c) = it.next() {
        match c {
            '{' => {
                if !teks.is_empty() {
                    out.push(Potong::Teks(std::mem::take(&mut teks)));
                }
                let mut isi = String::new();
                loop {
                    match it.next() {
                        Some('}') => break,
                        Some(x) => isi.push(x),
                        None => return Err("Tanda { tidak ditutup dengan }".to_string()),
                    }
                }
                let (nama, arg) = match isi.split_once(':') {
                    Some((n, a)) => (n, Some(a)),
                    None => (isi.as_str(), None),
                };
                let angka = |a: Option<&str>, min: usize, maks: usize, token: &str| {
                    let n: usize = a
                        .ok_or_else(|| {
                            format!("Token {{{token}}} perlu jumlah digit, mis. {{{token}:4}}")
                        })?
                        .parse()
                        .map_err(|_| format!("Jumlah pada {{{token}}} harus angka"))?;
                    if !(min..=maks).contains(&n) {
                        return Err(format!("Jumlah pada {{{token}}} harus {min}-{maks}"));
                    }
                    Ok(n)
                };
                out.push(match nama {
                    "TAHUN" if arg.is_none() => Potong::Tahun,
                    "TAHUN2" if arg.is_none() => Potong::Tahun2,
                    "KODE_JENJANG" if arg.is_none() => Potong::KodeJenjang,
                    "JENJANG" if arg.is_none() => Potong::Jenjang,
                    "KODE_FAKULTAS" if arg.is_none() => Potong::KodeFakultas,
                    "KODE_ANGKA" if arg.is_none() => Potong::KodeAngka,
                    "KODE_PRODI" => Potong::KodeProdi(match arg {
                        None => None,
                        a => Some(angka(a, 1, 10, "KODE_PRODI")?),
                    }),
                    "URUT" => Potong::Urut(angka(arg, 1, 8, "URUT")?),
                    _ => return Err(format!("Token {{{isi}}} tidak dikenal")),
                });
            }
            '}' => return Err("Tanda } tanpa pasangan {".to_string()),
            c if c.is_ascii_alphanumeric() || matches!(c, '-' | '.' | '/') => teks.push(c),
            c => {
                return Err(format!(
                    "Karakter '{c}' tidak diizinkan. Gunakan huruf, angka, tanda - . /"
                ));
            }
        }
    }
    if !teks.is_empty() {
        out.push(Potong::Teks(teks));
    }
    Ok(out)
}

fn ekor(s: &str, n: usize) -> String {
    let c: Vec<char> = s.chars().collect();
    c[c.len().saturating_sub(n)..].iter().collect()
}

/// Terapkan templat pada konteks. Gagal bila templat tidak valid atau nomor urut melebihi digitnya.
pub fn render(template: &str, k: &KonteksNim) -> Result<String, String> {
    let bagian = parse(template)?;
    let mut nim = String::new();
    for b in bagian {
        match b {
            Potong::Teks(t) => nim.push_str(&t),
            Potong::Tahun => nim.push_str(&format!("{:04}", k.tahun)),
            Potong::Tahun2 => nim.push_str(&format!("{:02}", k.tahun % 100)),
            Potong::KodeJenjang => nim.push_str(kode_jenjang(&k.jenjang)),
            Potong::Jenjang => nim.push_str(&k.jenjang),
            Potong::KodeProdi(None) => nim.push_str(&k.kode_prodi),
            Potong::KodeProdi(Some(n)) => {
                let e = ekor(&k.kode_prodi, n);
                nim.push_str(&format!("{e:0>n$}"));
            }
            Potong::KodeAngka => nim.push_str(&k.kode_angka),
            Potong::KodeFakultas => nim.push_str(&k.kode_fakultas),
            Potong::Urut(n) => {
                let teks = format!("{:0>n$}", k.urut, n = n);
                if teks.len() > n {
                    return Err(format!(
                        "Nomor urut {} melebihi {} digit; perbesar jumlah digit {{URUT:{}}}",
                        k.urut, n, n
                    ));
                }
                nim.push_str(&teks);
            }
        }
    }
    Ok(nim)
}

/// Periksa templat: sintaks, tepat satu {URUT:N}, dan panjang hasil terburuk <= 20 karakter.
/// `maks_prodi` / `maks_fakultas` = panjang kode terpanjang yang dipakai data saat ini.
pub fn validasi(template: &str, maks_prodi: usize, maks_fakultas: usize) -> Result<(), String> {
    let template = template.trim();
    if template.is_empty() {
        return Err("Rumus NIM tidak boleh kosong".to_string());
    }
    let bagian = parse(template)?;
    let jumlah_urut = bagian
        .iter()
        .filter(|b| matches!(b, Potong::Urut(_)))
        .count();
    if jumlah_urut != 1 {
        return Err("Rumus wajib memuat tepat satu {URUT:N} (nomor urut)".to_string());
    }
    // Kasus terburuk: kode prodi/fakultas terpanjang, nomor urut memenuhi semua digitnya
    let urut_digit = bagian
        .iter()
        .find_map(|b| {
            if let Potong::Urut(n) = b {
                Some(*n)
            } else {
                None
            }
        })
        .unwrap_or(1);
    let terburuk = KonteksNim {
        tahun: 2026,
        jenjang: "S1".to_string(),
        kode_prodi: "A".repeat(maks_prodi.max(1)),
        kode_angka: "99".to_string(),
        kode_fakultas: "B".repeat(maks_fakultas.max(1)),
        urut: 10_i64.pow(urut_digit as u32) - 1,
    };
    let panjang = render(template, &terburuk)?.chars().count();
    if panjang > PANJANG_MAKS {
        return Err(format!(
            "Hasil NIM bisa mencapai {panjang} karakter; maksimum {PANJANG_MAKS}. Perpendek rumusnya"
        ));
    }
    Ok(())
}

pub fn lingkup_valid(kode: &str) -> bool {
    LINGKUP.iter().any(|(k, _)| *k == kode)
}

/// Kunci pencacah sesuai lingkup.
pub fn kunci_pencacah(lingkup: &str, tahun: i32, prodi_id: uuid::Uuid) -> String {
    match lingkup {
        "PER_TAHUN" => tahun.to_string(),
        "GLOBAL" => "ALL".to_string(),
        _ => format!("{tahun}:{prodi_id}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn k(urut: i64) -> KonteksNim {
        KonteksNim {
            tahun: 2026,
            jenjang: "S1".into(),
            kode_prodi: "02".into(),
            kode_angka: "31".into(),
            kode_fakultas: "FT".into(),
            urut,
        }
    }

    #[test]
    fn bawaan_tahun_kode_prodi_urut() {
        // Tahun masuk 2027, Bahasa Inggris (31), urut 1 -> 27310001
        let c = KonteksNim {
            tahun: 2027,
            ..k(1)
        };
        assert_eq!(render(TEMPLATE_BAWAAN, &c).unwrap(), "27310001");
        let fis = KonteksNim {
            tahun: 2027,
            kode_angka: "42".into(),
            urut: 45,
            ..k(1)
        };
        assert_eq!(render(TEMPLATE_BAWAAN, &fis).unwrap(), "27420045");
        assert!(validasi(TEMPLATE_BAWAAN, 10, 5).is_ok());
    }

    #[test]
    fn token_lain_dan_literal() {
        assert_eq!(
            render("{TAHUN}-{KODE_FAKULTAS}-{KODE_PRODI}.{URUT:3}", &k(7)).unwrap(),
            "2026-FT-02.007"
        );
        assert_eq!(
            render("UPT{TAHUN2}{JENJANG}{URUT:5}", &k(12)).unwrap(),
            "UPT26S100012"
        );
    }

    #[test]
    fn kode_prodi_pendek_diberi_nol_di_depan() {
        let p = KonteksNim {
            kode_prodi: "7".into(),
            ..k(1)
        };
        assert_eq!(render("{KODE_PRODI:3}{URUT:2}", &p).unwrap(), "00701");
    }

    #[test]
    fn validasi_menolak_rumus_buruk() {
        for buruk in [
            "",
            "{TAHUN2}",                                               // tanpa URUT
            "{URUT:3}{URUT:3}",                                       // dua URUT
            "{FOO}{URUT:3}",                                          // token asing
            "{URUT}",                                                 // URUT tanpa digit
            "{URUT:9}",                                               // di luar 1-8
            "{TAHUN2 {URUT:3}",                                       // kurung tak tertutup
            "{TAHUN2}#{URUT:3}",                                      // karakter terlarang
            "{TAHUN}{KODE_FAKULTAS}{KODE_PRODI}{KODE_PRODI}{URUT:8}", // kepanjangan
        ] {
            assert!(
                validasi(buruk, 10, 5).is_err(),
                "seharusnya ditolak: {buruk:?}"
            );
        }
    }

    #[test]
    fn batas_panjang_memakai_kode_terpanjang_yang_ada() {
        let t = "{TAHUN}-{KODE_FAKULTAS}-{KODE_PRODI}.{URUT:3}";
        assert!(validasi(t, 10, 5).is_err()); // kasus terburuk 25 karakter
        assert!(validasi(t, 3, 2).is_ok()); // kode nyata pendek: 4+1+2+1+3+1+3 = 15
    }

    #[test]
    fn urut_melebihi_digit_ditolak() {
        assert!(render("{URUT:2}", &k(100)).is_err());
        assert_eq!(render("{URUT:2}", &k(99)).unwrap(), "99");
    }

    #[test]
    fn kunci_pencacah_sesuai_lingkup() {
        let p = uuid::Uuid::nil();
        assert_eq!(kunci_pencacah("GLOBAL", 2026, p), "ALL");
        assert_eq!(kunci_pencacah("PER_TAHUN", 2026, p), "2026");
        assert!(kunci_pencacah("PER_PRODI_TAHUN", 2026, p).starts_with("2026:"));
    }
}
