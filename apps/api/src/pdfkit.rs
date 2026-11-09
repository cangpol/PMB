//! Perkakas pembuat dokumen PDF-1.4 bersama (LoA, kartu peserta, bukti pendaftaran).
//!
//! Murni Rust tanpa dependensi renderer: teks Helvetica standar, logo resmi sebagai gambar
//! (RGB + masker alpha, terkompresi Flate), serta QR vektor. `Halaman` membantu menyusun
//! stream konten dengan koordinat PDF (titik asal kiri-bawah, satuan pt).

use qrcode::{Color, QrCode};

/// Warna RGB 0.0-1.0.
pub type Warna = (f64, f64, f64);

pub const NAVY: Warna = (0.024, 0.086, 0.200);
pub const BIRU: Warna = (0.10, 0.30, 0.65);
pub const EMAS: Warna = (0.78, 0.62, 0.20);
pub const TEKS: Warna = (0.10, 0.12, 0.16);
pub const ABU: Warna = (0.42, 0.46, 0.52);
pub const GARIS: Warna = (0.80, 0.84, 0.90);
pub const LATAR: Warna = (0.955, 0.970, 0.992);
pub const PUTIH: Warna = (1.0, 1.0, 1.0);

/// Logo resmi 150x150 piksel: kanal RGB dan alpha terpisah, masing-masing zlib.
const LOGO_RGB_Z: &[u8] = include_bytes!("../assets/logo_rgb.z");
const LOGO_ALPHA_Z: &[u8] = include_bytes!("../assets/logo_alpha.z");
const LOGO_PX: u32 = 150;

/// Lebar glyph Helvetica / Helvetica-Bold (per 1000 em) untuk ASCII 32..=126.
const LEBAR_REG: [u16; 95] = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
    611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
    222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const LEBAR_BOLD: [u16; 95] = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
    611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
    278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/// Escape literal string PDF; karakter non-ASCII diganti "?" (font standar tanpa Unicode).
pub fn escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 8);
    for c in text.chars() {
        match c {
            '(' => out.push_str("\\("),
            ')' => out.push_str("\\)"),
            '\\' => out.push_str("\\\\"),
            _ if c.is_ascii() && !c.is_ascii_control() => out.push(c),
            _ => out.push('?'),
        }
    }
    out
}

/// Lebar teks dalam pt pada ukuran `ukuran`.
pub fn lebar_teks(teks: &str, tebal: bool, ukuran: f64) -> f64 {
    let tabel = if tebal { &LEBAR_BOLD } else { &LEBAR_REG };
    let total: u32 = teks
        .chars()
        .map(|c| {
            let k = c as u32;
            if (32..=126).contains(&k) {
                tabel[(k - 32) as usize] as u32
            } else {
                556
            }
        })
        .sum();
    total as f64 * ukuran / 1000.0
}

/// Pecah teks menjadi baris-baris yang tidak melebihi `maks` pt.
pub fn bungkus(teks: &str, tebal: bool, ukuran: f64, maks: f64) -> Vec<String> {
    let mut baris = Vec::new();
    let mut cur = String::new();
    for kata in teks.split_whitespace() {
        let calon = if cur.is_empty() {
            kata.to_string()
        } else {
            format!("{cur} {kata}")
        };
        if cur.is_empty() || lebar_teks(&calon, tebal, ukuran) <= maks {
            cur = calon;
        } else {
            baris.push(std::mem::take(&mut cur));
            cur = kata.to_string();
        }
    }
    if !cur.is_empty() {
        baris.push(cur);
    }
    baris
}

/// Penyusun stream konten satu halaman.
#[derive(Default)]
pub struct Halaman {
    pub s: String,
}

impl Halaman {
    pub fn baru() -> Self {
        Self::default()
    }

    fn isi(&mut self, (r, g, b): Warna) {
        self.s.push_str(&format!("{r:.3} {g:.3} {b:.3} rg\n"));
    }

    fn garis_warna(&mut self, (r, g, b): Warna, tebal: f64) {
        self.s
            .push_str(&format!("{r:.3} {g:.3} {b:.3} RG {tebal:.2} w\n"));
    }

    pub fn kotak(&mut self, x: f64, y: f64, w: f64, h: f64, warna: Warna) {
        self.isi(warna);
        self.s
            .push_str(&format!("{x:.2} {y:.2} {w:.2} {h:.2} re f\n"));
    }

    pub fn bingkai(&mut self, x: f64, y: f64, w: f64, h: f64, warna: Warna, tebal: f64) {
        self.garis_warna(warna, tebal);
        self.s
            .push_str(&format!("{x:.2} {y:.2} {w:.2} {h:.2} re S\n"));
    }

    pub fn garis(&mut self, x1: f64, y1: f64, x2: f64, y2: f64, warna: Warna, tebal: f64) {
        self.garis_warna(warna, tebal);
        self.s
            .push_str(&format!("{x1:.2} {y1:.2} m {x2:.2} {y2:.2} l S\n"));
    }

    /// Teks rata kiri dengan baseline di (x, y).
    pub fn teks(&mut self, x: f64, y: f64, tebal: bool, ukuran: f64, warna: Warna, teks: &str) {
        self.isi(warna);
        self.s.push_str(&format!(
            "BT /{} {ukuran:.2} Tf {x:.2} {y:.2} Td ({}) Tj ET\n",
            if tebal { "F2" } else { "F1" },
            escape(teks)
        ));
    }

    /// Teks rata tengah terhadap sumbu `cx`.
    pub fn teks_tengah(
        &mut self,
        cx: f64,
        y: f64,
        tebal: bool,
        ukuran: f64,
        warna: Warna,
        t: &str,
    ) {
        let x = cx - lebar_teks(t, tebal, ukuran) / 2.0;
        self.teks(x, y, tebal, ukuran, warna, t);
    }

    /// Teks rata kanan terhadap tepi kanan `xk`.
    pub fn teks_kanan(&mut self, xk: f64, y: f64, tebal: bool, ukuran: f64, warna: Warna, t: &str) {
        let x = xk - lebar_teks(t, tebal, ukuran);
        self.teks(x, y, tebal, ukuran, warna, t);
    }

    /// Paragraf berbungkus; mengembalikan y baris berikutnya.
    pub fn paragraf(
        &mut self,
        x: f64,
        mut y: f64,
        lebar: f64,
        tebal: bool,
        ukuran: f64,
        jarak: f64,
        warna: Warna,
        teks: &str,
    ) -> f64 {
        for baris in bungkus(teks, tebal, ukuran, lebar) {
            self.teks(x, y, tebal, ukuran, warna, &baris);
            y -= jarak;
        }
        y
    }

    /// Logo resmi berukuran `ukuran` pt dengan sudut kiri-bawah di (x, y).
    pub fn logo(&mut self, x: f64, y: f64, ukuran: f64) {
        self.s.push_str(&format!(
            "q {ukuran:.2} 0 0 {ukuran:.2} {x:.2} {y:.2} cm /Im1 Do Q\n"
        ));
    }

    /// Logo transparan sebagai watermark (alpha rendah).
    pub fn logo_watermark(&mut self, x: f64, y: f64, ukuran: f64) {
        self.s.push_str(&format!(
            "q /GS1 gs {ukuran:.2} 0 0 {ukuran:.2} {x:.2} {y:.2} cm /Im1 Do Q\n"
        ));
    }

    pub fn qr(&mut self, data: &str, x: f64, y: f64, ukuran: f64) {
        self.s.push_str(&qr_vektor(data, x, y, ukuran));
    }
}

/// QR sebagai deretan persegi vektor (tajam di semua zoom).
pub fn qr_vektor(data: &str, x0: f64, y0: f64, ukuran: f64) -> String {
    let Ok(kode) = QrCode::new(data.as_bytes()) else {
        return String::new();
    };
    let lebar = kode.width();
    let warna = kode.to_colors();
    let mod_size = ukuran / lebar as f64;
    let mut out = String::from("0 0 0 rg\n");
    for y in 0..lebar {
        for x in 0..lebar {
            if warna[y * lebar + x] == Color::Dark {
                out.push_str(&format!(
                    "{:.2} {:.2} {:.2} {:.2} re f\n",
                    x0 + x as f64 * mod_size,
                    y0 + (lebar - 1 - y) as f64 * mod_size,
                    mod_size,
                    mod_size
                ));
            }
        }
    }
    out
}

/// QR sebagai SVG (untuk ditampilkan di web); kuncinya sama dengan QR pada PDF.
pub fn qr_svg(data: &str) -> String {
    let Ok(kode) = QrCode::new(data.as_bytes()) else {
        return String::new();
    };
    let lebar = kode.width();
    let warna = kode.to_colors();
    let batas = 2; // quiet zone
    let total = lebar + batas * 2;
    let mut path = String::new();
    for y in 0..lebar {
        for x in 0..lebar {
            if warna[y * lebar + x] == Color::Dark {
                path.push_str(&format!("M{},{}h1v1h-1z", x + batas, y + batas));
            }
        }
    }
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {total} {total}\" shape-rendering=\"crispEdges\">\
         <rect width=\"{total}\" height=\"{total}\" fill=\"#fff\"/><path d=\"{path}\" fill=\"#000\"/></svg>"
    )
}

/// Rakit berkas PDF A4 satu halaman: font F1 (Helvetica), F2 (Helvetica-Bold),
/// gambar logo /Im1, dan status grafis /GS1 (opasitas 7% untuk watermark).
pub fn bangun_pdf(konten: &str) -> Vec<u8> {
    let mut pdf: Vec<u8> = Vec::with_capacity(48 * 1024);
    let mut offset: Vec<usize> = vec![0];
    pdf.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    let mut obj = |pdf: &mut Vec<u8>, isi: &[u8]| {
        offset.push(pdf.len());
        pdf.extend_from_slice(isi);
    };

    obj(
        &mut pdf,
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    );
    obj(
        &mut pdf,
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 595.28 841.89] >>\nendobj\n",
    );
    obj(
        &mut pdf,
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 7 0 R >> /ExtGState << /GS1 9 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    );
    obj(
        &mut pdf,
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    );
    obj(
        &mut pdf,
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    );

    let mut isi = format!("6 0 obj\n<< /Length {} >>\nstream\n", konten.len()).into_bytes();
    isi.extend_from_slice(konten.as_bytes());
    isi.extend_from_slice(b"\nendstream\nendobj\n");
    obj(&mut pdf, &isi);

    let mut gambar = format!(
        "7 0 obj\n<< /Type /XObject /Subtype /Image /Width {LOGO_PX} /Height {LOGO_PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 8 0 R /Length {} >>\nstream\n",
        LOGO_RGB_Z.len()
    )
    .into_bytes();
    gambar.extend_from_slice(LOGO_RGB_Z);
    gambar.extend_from_slice(b"\nendstream\nendobj\n");
    obj(&mut pdf, &gambar);

    let mut masker = format!(
        "8 0 obj\n<< /Type /XObject /Subtype /Image /Width {LOGO_PX} /Height {LOGO_PX} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length {} >>\nstream\n",
        LOGO_ALPHA_Z.len()
    )
    .into_bytes();
    masker.extend_from_slice(LOGO_ALPHA_Z);
    masker.extend_from_slice(b"\nendstream\nendobj\n");
    obj(&mut pdf, &masker);

    obj(
        &mut pdf,
        b"9 0 obj\n<< /Type /ExtGState /ca 0.07 /CA 0.07 >>\nendobj\n",
    );

    let xref = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", offset.len()).as_bytes());
    for o in &offset[1..] {
        pdf.extend_from_slice(format!("{o:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
            offset.len()
        )
        .as_bytes(),
    );
    pdf
}

/// Rakit PDF beberapa halaman dengan ukuran halaman bebas (mis. A4 lanskap 841.89 x 595.28).
/// Sumber daya sama dengan `bangun_pdf`: F1 Helvetica, F2 Helvetica-Bold, logo /Im1, /GS1.
pub fn bangun_pdf_banyak(halaman: &[String], lebar: f64, tinggi: f64) -> Vec<u8> {
    let mut pdf: Vec<u8> = Vec::with_capacity(64 * 1024);
    let mut offset: Vec<usize> = vec![0];
    pdf.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    let mut obj = |pdf: &mut Vec<u8>, isi: &[u8]| {
        offset.push(pdf.len());
        pdf.extend_from_slice(isi);
    };

    // Urutan objek: 1 katalog, 2 daftar halaman, 3 F1, 4 F2, 5 logo, 6 masker, 7 GS1,
    // lalu pasangan (halaman, isi) mulai objek 8.
    let kids: String = (0..halaman.len())
        .map(|i| format!("{} 0 R", 8 + 2 * i))
        .collect::<Vec<_>>()
        .join(" ");
    obj(
        &mut pdf,
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    );
    obj(
        &mut pdf,
        format!(
            "2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {} /MediaBox [0 0 {lebar:.2} {tinggi:.2}] >>\nendobj\n",
            halaman.len()
        )
        .as_bytes(),
    );
    obj(
        &mut pdf,
        b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    );
    obj(
        &mut pdf,
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    );
    let mut gambar = format!(
        "5 0 obj\n<< /Type /XObject /Subtype /Image /Width {LOGO_PX} /Height {LOGO_PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 6 0 R /Length {} >>\nstream\n",
        LOGO_RGB_Z.len()
    )
    .into_bytes();
    gambar.extend_from_slice(LOGO_RGB_Z);
    gambar.extend_from_slice(b"\nendstream\nendobj\n");
    obj(&mut pdf, &gambar);
    let mut masker = format!(
        "6 0 obj\n<< /Type /XObject /Subtype /Image /Width {LOGO_PX} /Height {LOGO_PX} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length {} >>\nstream\n",
        LOGO_ALPHA_Z.len()
    )
    .into_bytes();
    masker.extend_from_slice(LOGO_ALPHA_Z);
    masker.extend_from_slice(b"\nendstream\nendobj\n");
    obj(&mut pdf, &masker);
    obj(
        &mut pdf,
        b"7 0 obj\n<< /Type /ExtGState /ca 0.07 /CA 0.07 >>\nendobj\n",
    );

    for (i, konten) in halaman.iter().enumerate() {
        let (hal, isi_obj) = (8 + 2 * i, 9 + 2 * i);
        obj(
            &mut pdf,
            format!(
                "{hal} 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> /ExtGState << /GS1 7 0 R >> >> /Contents {isi_obj} 0 R >>\nendobj\n"
            )
            .as_bytes(),
        );
        let mut isi =
            format!("{isi_obj} 0 obj\n<< /Length {} >>\nstream\n", konten.len()).into_bytes();
        isi.extend_from_slice(konten.as_bytes());
        isi.extend_from_slice(b"\nendstream\nendobj\n");
        obj(&mut pdf, &isi);
    }

    let xref = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", offset.len()).as_bytes());
    for o in &offset[1..] {
        pdf.extend_from_slice(format!("{o:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n",
            offset.len()
        )
        .as_bytes(),
    );
    pdf
}

/// Kop surat standar (logo + "PMB" + nama universitas + alamat) pada halaman A4.
/// Mengembalikan y tepat di bawah garis kop.
pub fn kop_surat(h: &mut Halaman, subjudul: &str) -> f64 {
    // pita aksen tipis di tepi atas halaman
    h.kotak(0.0, 835.0, 595.28, 7.0, NAVY);
    h.kotak(0.0, 832.0, 595.28, 2.5, EMAS);
    h.logo(46.0, 756.0, 66.0);
    h.teks(124.0, 796.0, true, 25.0, NAVY, "PMB");
    h.teks(
        124.0,
        778.0,
        true,
        13.0,
        NAVY,
        "Universitas Pignatelli Triputra",
    );
    h.teks(124.0, 765.0, false, 8.5, ABU, subjudul);
    h.teks(
        124.0,
        754.0,
        false,
        8.0,
        ABU,
        "Jl. Bawean No. 9, Danukusuman, Serengan, Surakarta, Jawa Tengah 57156",
    );
    h.garis(46.0, 744.0, 549.0, 744.0, NAVY, 2.0);
    h.garis(46.0, 740.0, 549.0, 740.0, EMAS, 0.7);
    740.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lebar_teks_dan_bungkus() {
        assert!((lebar_teks("AAA", true, 10.0) - 21.66).abs() < 0.01);
        let baris = bungkus("satu dua tiga empat lima enam tujuh", false, 10.0, 60.0);
        assert!(baris.len() > 1);
        assert!(
            baris
                .iter()
                .all(|b| lebar_teks(b, false, 10.0) <= 60.0 || !b.contains(' '))
        );
    }

    #[test]
    fn pdf_memuat_logo_dan_struktur_valid() {
        let mut h = Halaman::baru();
        kop_surat(&mut h, "Panitia PMB");
        let pdf = bangun_pdf(&h.s);
        let teks = String::from_utf8_lossy(&pdf);
        assert!(teks.starts_with("%PDF-1.4"));
        assert!(teks.contains("/Subtype /Image"));
        assert!(teks.contains("/SMask 8 0 R"));
        assert!(teks.trim_end().ends_with("%%EOF"));
    }

    #[test]
    fn pdf_banyak_halaman_valid() {
        let mut a = Halaman::baru();
        a.teks(40.0, 500.0, true, 12.0, NAVY, "Halaman satu");
        let mut b = Halaman::baru();
        b.teks(40.0, 500.0, false, 12.0, NAVY, "Halaman dua");
        let pdf = bangun_pdf_banyak(&[a.s, b.s], 841.89, 595.28);
        let teks = String::from_utf8_lossy(&pdf);
        assert!(teks.starts_with("%PDF-1.4"));
        assert!(teks.contains("/Count 2"));
        assert!(teks.contains("/Kids [8 0 R 10 0 R]"));
        assert!(teks.contains("/MediaBox [0 0 841.89 595.28]"));
        assert!(teks.trim_end().ends_with("%%EOF"));
    }

    #[test]
    fn qr_svg_menghasilkan_svg() {
        let svg = qr_svg("https://contoh.id/verifikasi/1");
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("<path"));
    }
}
