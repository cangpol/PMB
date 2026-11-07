// Generator Surat Penerimaan Resmi / Letter of Acceptance (LoA) PDF
// Universitas Pignatelli Triputra (UPT) Surakarta
// Standar ISO 32000-1 (PDF-1.4): kop surat berlogo, tabel biodata, rincian biaya,
// QR Code verifikasi vektor, dan blok pengesahan.

use crate::pdfkit::{
    ABU, BIRU, EMAS, GARIS, Halaman, LATAR, NAVY, PUTIH, TEKS, bangun_pdf, bungkus, kop_surat,
    lebar_teks,
};

#[derive(Clone, Debug)]
pub struct LoaPdfData {
    pub nomor_surat_loa: String,
    pub tanggal_sk: String,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub nik: String,
    pub asal_sekolah: String,
    pub jalur_nama: String,
    pub prodi_diterima: String,
    pub jenjang: String,
    pub fakultas: String,
    pub pilihan_ke: i32,
    pub skor_akhir: f64,
    pub ranking: i32,
    pub tgl_batas_daftar_ulang: String,
    pub verifikasi_url: String,
    /// Rincian biaya daftar ulang (komponen, nominal)
    pub rincian_biaya: Vec<(String, i64)>,
    /// Nomor VA Mandiri kampus dan atas nama (bila sudah diatur admin)
    pub va_mandiri: Option<(String, String)>,
    pub ada_qris: bool,
    pub nomor_registrasi: Option<String>,
}

/// Format rupiah dengan pemisah ribuan titik, mis. 5000000 -> "Rp 5.000.000".
pub fn rupiah(n: i64) -> String {
    let digits = n.unsigned_abs().to_string();
    let mut out = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i).is_multiple_of(3) {
            out.push('.');
        }
        out.push(c);
    }
    format!("{}Rp {}", if n < 0 { "-" } else { "" }, out)
}

/// Kanal pembayaran yang tersedia (VA Mandiri dan/atau QRIS).
fn kanal_pembayaran(data: &LoaPdfData) -> String {
    match (&data.va_mandiri, data.ada_qris) {
        (Some((no, an)), true) => format!("VA Mandiri {} a.n. {} atau QRIS kampus", no, an),
        (Some((no, an)), false) => format!("VA Mandiri {} a.n. {}", no, an),
        (None, true) => "QRIS kampus (tersedia di portal PMB)".to_string(),
        (None, false) => "rekening resmi yang tertera di portal PMB".to_string(),
    }
}

/// Catatan transfer (nomor registrasi pada berita transfer + unggah bukti).
fn catatan_transfer(data: &LoaPdfData) -> String {
    match &data.nomor_registrasi {
        Some(nr) => format!(
            "Cantumkan No. Registrasi {} pada berita transfer, lalu unggah bukti bayar di portal PMB.",
            nr
        ),
        None => {
            "Setelah transfer, unggah bukti bayar di portal PMB (menu Daftar Ulang).".to_string()
        }
    }
}

/// Baris-baris instruksi pembayaran daftar ulang (maks. 7 baris agar muat di halaman).
pub fn baris_instruksi_daftar_ulang(data: &LoaPdfData) -> Vec<String> {
    let mut lines = vec!["Rincian biaya daftar ulang:".to_string()];
    // Maks. 3 baris komponen: bila lebih dari 3, tampilkan 2 + ringkasan "lainnya"
    let tampil = if data.rincian_biaya.len() > 3 { 2 } else { 3 };
    for (nama, nominal) in data.rincian_biaya.iter().take(tampil) {
        lines.push(format!("   - {}: {}", nama, rupiah(*nominal)));
    }
    if data.rincian_biaya.len() > tampil {
        let sisa: i64 = data.rincian_biaya[tampil..].iter().map(|r| r.1).sum();
        lines.push(format!("   - Komponen lainnya: {}", rupiah(sisa)));
    }
    let total: i64 = data.rincian_biaya.iter().map(|r| r.1).sum();
    lines.push(format!("   TOTAL: {}", rupiah(total)));

    lines.push(format!("Pembayaran melalui {}.", kanal_pembayaran(data)));
    lines.push(catatan_transfer(data));
    lines
}

const KIRI: f64 = 46.0;
const LEBAR: f64 = 503.0;

/// Komponen biaya yang ditampilkan (maks. 4 baris; sisanya diringkas "Komponen lainnya").
fn baris_biaya(data: &LoaPdfData) -> Vec<(String, i64)> {
    let tampil = if data.rincian_biaya.len() > 4 { 3 } else { 4 };
    let mut out: Vec<(String, i64)> = data.rincian_biaya.iter().take(tampil).cloned().collect();
    if data.rincian_biaya.len() > tampil {
        let sisa: i64 = data.rincian_biaya[tampil..].iter().map(|r| r.1).sum();
        out.push(("Komponen lainnya".to_string(), sisa));
    }
    out
}

fn judul_bagian(h: &mut Halaman, y: f64, judul: &str) {
    h.kotak(KIRI, y - 3.0, 3.0, 13.0, EMAS);
    h.teks(KIRI + 9.0, y, true, 10.5, NAVY, judul);
}

pub fn generate_loa_pdf(data: &LoaPdfData) -> Vec<u8> {
    let mut h = Halaman::baru();
    let tengah = 297.64;

    // Watermark logo (sangat samar) di tengah halaman
    h.logo_watermark(148.0, 270.0, 300.0);

    kop_surat(
        &mut h,
        "Panitia Penerimaan Mahasiswa Baru (PMB) Tahun Akademik 2026/2027",
    );

    // Judul & nomor surat
    h.teks_tengah(
        tengah,
        712.0,
        true,
        14.5,
        NAVY,
        "SURAT KEPUTUSAN PENERIMAAN MAHASISWA BARU",
    );
    h.teks_tengah(
        tengah,
        697.0,
        false,
        9.0,
        ABU,
        "Official Letter of Acceptance",
    );
    h.teks_tengah(
        tengah,
        682.0,
        true,
        10.0,
        TEKS,
        &format!("Nomor: {}", data.nomor_surat_loa),
    );

    let y = h.paragraf(
        KIRI,
        658.0,
        LEBAR,
        false,
        10.0,
        14.0,
        TEKS,
        "Rektor Universitas Pignatelli Triputra, berdasarkan hasil seleksi penerimaan mahasiswa baru Tahun Akademik 2026/2027, dengan ini menetapkan bahwa calon mahasiswa berikut:",
    );

    // Tabel biodata
    let baris: [(&str, &str); 5] = [
        ("Nomor Pendaftaran", &data.nomor_pendaftaran),
        ("Nama Lengkap", &data.nama_lengkap),
        ("Nomor Induk Kependudukan", &data.nik),
        ("Asal Sekolah", &data.asal_sekolah),
        ("Jalur Penerimaan", &data.jalur_nama),
    ];
    let tinggi = 20.0;
    let atas = y + 2.0;
    h.garis(KIRI, atas, KIRI + LEBAR, atas, NAVY, 1.0);
    for (i, (label, nilai)) in baris.iter().enumerate() {
        let yt = atas - tinggi * i as f64;
        if i % 2 == 1 {
            h.kotak(KIRI, yt - tinggi, LEBAR, tinggi, LATAR);
        }
        h.teks(KIRI + 10.0, yt - 13.5, false, 9.5, ABU, label);
        h.teks(KIRI + 150.0, yt - 13.5, false, 9.5, ABU, ":");
        let nilai = if lebar_teks(nilai, true, 10.0) > 330.0 {
            bungkus(nilai, true, 10.0, 330.0)
                .first()
                .cloned()
                .unwrap_or_default()
        } else {
            nilai.to_string()
        };
        h.teks(KIRI + 162.0, yt - 13.5, true, 10.0, TEKS, &nilai);
    }
    let bawah = atas - tinggi * baris.len() as f64;
    h.garis(KIRI, bawah, KIRI + LEBAR, bawah, GARIS, 0.8);

    // Kotak keputusan
    let kt = bawah - 14.0; // sisi atas kotak
    let kh = 74.0;
    h.kotak(KIRI, kt - kh, LEBAR, kh, NAVY);
    h.kotak(KIRI, kt - kh, 5.0, kh, EMAS);
    h.teks(
        KIRI + 20.0,
        kt - 18.0,
        true,
        8.5,
        EMAS,
        "DINYATAKAN DITERIMA SEBAGAI MAHASISWA BARU",
    );
    let prodi = format!("{} {}", data.jenjang, data.prodi_diterima);
    let ukuran_prodi = if lebar_teks(&prodi, true, 17.0) > 460.0 {
        13.0
    } else {
        17.0
    };
    h.teks(KIRI + 20.0, kt - 40.0, true, ukuran_prodi, PUTIH, &prodi);
    h.teks(
        KIRI + 20.0,
        kt - 56.0,
        false,
        9.5,
        (0.80, 0.86, 0.95),
        &format!("{}   |   Pilihan ke-{}", data.fakultas, data.pilihan_ke),
    );
    let skor = if data.ranking > 0 {
        format!(
            "Skor seleksi {:.2}   |   Peringkat {}",
            data.skor_akhir, data.ranking
        )
    } else {
        format!("Skor seleksi {:.2}", data.skor_akhir)
    };
    h.teks(
        KIRI + 20.0,
        kt - 68.0,
        false,
        9.5,
        (0.80, 0.86, 0.95),
        &skor,
    );

    // Ketentuan registrasi ulang + rincian biaya
    let mut y = kt - kh - 26.0;
    judul_bagian(&mut h, y, "KETENTUAN REGISTRASI ULANG");
    y -= 12.0;
    h.kotak(KIRI, y - 17.0, LEBAR, 17.0, NAVY);
    h.teks(KIRI + 10.0, y - 12.0, true, 9.0, PUTIH, "Komponen Biaya");
    h.teks_kanan(KIRI + LEBAR - 10.0, y - 12.0, true, 9.0, PUTIH, "Nominal");
    y -= 17.0;
    let rincian = baris_biaya(data);
    for (i, (nama, nominal)) in rincian.iter().enumerate() {
        if i % 2 == 1 {
            h.kotak(KIRI, y - 16.0, LEBAR, 16.0, LATAR);
        }
        h.teks(KIRI + 10.0, y - 11.5, false, 9.5, TEKS, nama);
        h.teks_kanan(
            KIRI + LEBAR - 10.0,
            y - 11.5,
            false,
            9.5,
            TEKS,
            &rupiah(*nominal),
        );
        y -= 16.0;
    }
    let total: i64 = data.rincian_biaya.iter().map(|r| r.1).sum();
    h.garis(KIRI, y, KIRI + LEBAR, y, NAVY, 0.8);
    h.kotak(KIRI, y - 18.0, LEBAR, 18.0, GARIS);
    h.teks(KIRI + 10.0, y - 12.5, true, 10.0, NAVY, "TOTAL");
    h.teks_kanan(
        KIRI + LEBAR - 10.0,
        y - 12.5,
        true,
        10.0,
        NAVY,
        &rupiah(total),
    );
    y -= 30.0;

    y = h.paragraf(
        KIRI,
        y,
        LEBAR,
        false,
        9.0,
        12.0,
        TEKS,
        &format!(
            "Pembayaran melalui {}. {}",
            kanal_pembayaran(data),
            catatan_transfer(data)
        ),
    );
    y -= 4.0;

    // Batas waktu
    h.kotak(KIRI, y - 22.0, LEBAR, 24.0, LATAR);
    h.bingkai(KIRI, y - 22.0, LEBAR, 24.0, BIRU, 0.8);
    h.kotak(KIRI, y - 22.0, 4.0, 24.0, BIRU);
    h.teks(
        KIRI + 14.0,
        y - 14.0,
        true,
        10.0,
        NAVY,
        &format!(
            "Batas akhir daftar ulang: {} WIB",
            data.tgl_batas_daftar_ulang
        ),
    );
    y -= 36.0;
    h.paragraf(
        KIRI,
        y,
        LEBAR,
        false,
        8.5,
        11.0,
        ABU,
        "Penerimaan gugur apabila registrasi ulang tidak diselesaikan sebelum batas waktu tanpa pemberitahuan tertulis kepada panitia. Surat ini dicetak dari portal PMB; keaslian dapat diperiksa melalui QR Code di bawah.",
    );

    // QR verifikasi (kiri) dan pengesahan (kanan)
    h.bingkai(KIRI, 82.0, 84.0, 84.0, GARIS, 0.8);
    h.qr(&data.verifikasi_url, KIRI + 5.0, 87.0, 74.0);
    h.teks(
        KIRI + 94.0,
        142.0,
        true,
        8.5,
        NAVY,
        "Dokumen Digital Terverifikasi",
    );
    h.paragraf(
        KIRI + 94.0,
        130.0,
        150.0,
        false,
        7.5,
        10.0,
        ABU,
        "Pindai QR Code untuk memeriksa keaslian Surat Keputusan Penerimaan ini.",
    );

    let kanan = 330.0;
    h.teks(
        kanan,
        164.0,
        false,
        9.5,
        TEKS,
        &format!("Surakarta, {}", data.tanggal_sk),
    );
    h.teks(kanan, 151.0, true, 9.5, TEKS, "Ketua Panitia Seleksi PMB,");
    h.kotak(kanan, 108.0, 170.0, 30.0, LATAR);
    h.bingkai(kanan, 108.0, 170.0, 30.0, BIRU, 0.8);
    h.teks_tengah(
        kanan + 85.0,
        120.0,
        true,
        8.0,
        BIRU,
        "TERTANDA SECARA DIGITAL",
    );
    h.teks(
        kanan,
        96.0,
        true,
        10.0,
        TEKS,
        "Dr. Ir. Fransiskus Xaverius, M.Kom.",
    );
    h.teks(kanan, 84.0, false, 8.5, ABU, "NIDN: 0612087501");

    // Footer
    h.garis(KIRI, 58.0, KIRI + LEBAR, 58.0, NAVY, 0.8);
    h.teks_tengah(
        tengah,
        46.0,
        false,
        7.5,
        ABU,
        "Dokumen ini sah dan diterbitkan secara resmi melalui Sistem Informasi PMB Universitas Pignatelli Triputra.",
    );
    h.teks_tengah(tengah, 36.0, false, 7.0, ABU, &data.verifikasi_url);

    bangun_pdf(&h.s)
}

#[cfg(test)]
mod tests_pembayaran {
    use super::*;

    fn data(rincian: Vec<(String, i64)>) -> LoaPdfData {
        LoaPdfData {
            nomor_surat_loa: "SK/1".into(),
            tanggal_sk: "1 Januari 2027".into(),
            nomor_pendaftaran: "PMB-2027-0001".into(),
            nama_lengkap: "Calon".into(),
            nik: "3300000000000000".into(),
            asal_sekolah: "SMA".into(),
            jalur_nama: "Mandiri".into(),
            prodi_diterima: "Fisioterapi".into(),
            jenjang: "S1".into(),
            fakultas: "FKES".into(),
            pilihan_ke: 1,
            skor_akhir: 80.0,
            ranking: 1,
            tgl_batas_daftar_ulang: "31-07-2027 23:59".into(),
            verifikasi_url: "https://x".into(),
            rincian_biaya: rincian,
            va_mandiri: Some(("8900012345678".into(), "UPITRA".into())),
            ada_qris: true,
            nomor_registrasi: Some("REG-2027-ABC234".into()),
        }
    }

    #[test]
    fn format_rupiah() {
        assert_eq!(rupiah(0), "Rp 0");
        assert_eq!(rupiah(250_000), "Rp 250.000");
        assert_eq!(rupiah(12_500_000), "Rp 12.500.000");
    }

    #[test]
    fn instruksi_memuat_va_total_dan_registrasi() {
        let lines = baris_instruksi_daftar_ulang(&data(vec![
            ("Dana Pengembangan".into(), 5_000_000),
            ("UKT Semester 1".into(), 6_500_000),
        ]));
        let teks = lines.join("\n");
        assert!(teks.contains("Rp 11.500.000"));
        assert!(teks.contains("VA Mandiri 8900012345678"));
        assert!(teks.contains("REG-2027-ABC234"));
    }

    #[test]
    fn instruksi_maksimal_tujuh_baris() {
        let banyak = (0..6).map(|i| (format!("K{i}"), 100_000)).collect();
        let lines = baris_instruksi_daftar_ulang(&data(banyak));
        assert!(lines.len() <= 7, "{} baris", lines.len());
        assert!(lines.join("\n").contains("Komponen lainnya: Rp 400.000"));
    }
}
