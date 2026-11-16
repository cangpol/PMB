// Generator Dokumen PDF Resmi PMB (ISO 32000-1 / PDF-1.4)
// Universitas Pignatelli Triputra (UPT) Surakarta
//
// Karakteristik:
// 1. Native vector PDF: Rendisi vektor murni beresolusi tinggi tanpa dependensi headless browser
// 2. Desain Resmi: Skema warna biru royal (0.05, 0.14, 0.25) dan putih bersih (#0c2340 / putih)
// 3. QR Code Vektor: Modul QR dikonversi langsung menjadi kotak vektor re f sehingga tajam & dapat dipindai
// 4. Standar Tipografi: Menggunakan font Type 1 standar (Helvetica & Helvetica-Bold) yang didukung semua reader

use qrcode::{Color, QrCode};

#[derive(Clone, Debug)]
pub struct PendaftarPdfData {
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub email: String,
    pub no_hp: String,
    pub nik: String,
    pub tempat_lahir: String,
    pub tgl_lahir: String,
    pub jenis_kelamin: String,
    pub agama: String,
    pub asal_sekolah: String,
    pub jurusan_sekolah: String,
    pub jalur_nama: String,
    pub gelombang_nama: String,
    pub prodi_1_nama: String,
    pub prodi_2_nama: Option<String>,
    pub status_pendaftaran: String,
    pub channel: String,
    pub status_pembayaran: String,
    pub tanggal_cetak: String,
}

#[derive(Clone, Debug)]
pub struct JadwalUjianPdfData {
    pub nomor_peserta: String,
    pub nama_ujian: String,
    pub tanggal_ujian: String,
    pub waktu_ujian: String,
    pub lokasi_ruang: String,
    pub link_ujian: Option<String>,
}

/// Helper untuk escape karakter teks dalam literal string PDF: (, ), \
fn pdf_escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len() * 2);
    for c in text.chars() {
        match c {
            '(' => out.push_str("\\("),
            ')' => out.push_str("\\)"),
            '\\' => out.push_str("\\\\"),
            _ if c.is_ascii() => out.push(c),
            _ => out.push('?'), // Ganti karakter non-ascii dengan karakter aman
        }
    }
    out
}

fn render_qr_vector(content: &str, start_x: f64, start_y: f64, target_size: f64) -> String {
    let qr = match QrCode::new(content.as_bytes()) {
        Ok(q) => q,
        Err(_) => return String::new(),
    };

    let width = qr.width();
    let mod_size = target_size / (width as f64);
    let mut out = String::new();

    out.push_str("0.05 0.14 0.25 rg\n"); // Warna modul QR: Biru Navy Pekat
    let colors = qr.to_colors();

    for y in 0..width {
        for x in 0..width {
            if colors[y * width + x] == Color::Dark {
                let px = start_x + (x as f64) * mod_size;
                let py = (start_y + target_size) - ((y + 1) as f64) * mod_size;
                out.push_str(&format!(
                    "{:.2} {:.2} {:.2} {:.2} re f\n",
                    px, py, mod_size, mod_size
                ));
            }
        }
    }

    out
}

/// 1. Cetak Tanda Bukti Pendaftaran Resmi PMB
pub fn generate_bukti_pendaftaran_pdf(data: &PendaftarPdfData, qr_url: &str) -> Vec<u8> {
    let mut s = String::new();

    // 1. Kop surat resmi berlogo
    {
        let mut h = crate::pdfkit::Halaman::baru();
        h.logo_watermark(148.0, 270.0, 300.0);
        crate::pdfkit::kop_surat(
            &mut h,
            "Panitia Penerimaan Mahasiswa Baru (PMB) Tahun Akademik 2026/2027",
        );
        s.push_str(&h.s);
    }

    // 2. Judul Dokumen
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 13 Tf 1 0 0 1 40 705 Tm (TANDA BUKTI PENDAFTARAN RESMI) Tj\n");
    s.push_str("/F1 8 Tf 1 0 0 1 40 692 Tm (Dokumen ini merupakan bukti sah pendaftaran calon mahasiswa baru) Tj\n");
    s.push_str("ET\n");

    // Badge Jalur & Status
    s.push_str("0.93 0.96 1.00 rg\n");
    s.push_str("370 695 185.28 25 re f\n");
    s.push_str("0.20 0.40 0.85 RG 0.75 w\n");
    s.push_str("370 695 185.28 25 re s\n");

    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 9 Tf 1 0 0 1 380 705 Tm (Status: ) Tj\n");
    s.push_str(&format!(
        "/F2 9 Tf ({}) Tj\n",
        pdf_escape(&data.status_pendaftaran)
    ));
    s.push_str("ET\n");

    // Garis Pemisah
    s.push_str("0.85 0.90 0.95 RG 1 w\n");
    s.push_str("40 680 m 555.28 680 l s\n");

    // 3. Blok Nomor Pendaftaran (Kotak Sorot)
    s.push_str("0.96 0.98 1.00 rg\n");
    s.push_str("40 625 515.28 45 re f\n");
    s.push_str("0.05 0.14 0.25 RG 1.5 w\n");
    s.push_str("40 625 515.28 45 re s\n");

    s.push_str("BT\n0.25 0.35 0.50 rg\n");
    s.push_str("/F1 8 Tf 1 0 0 1 55 655 Tm (NOMOR PENDAFTARAN RESMI CALON MAHASISWA) Tj\n");
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 16 Tf 1 0 0 1 55 637 Tm ({}) Tj\n",
        pdf_escape(&data.nomor_pendaftaran)
    ));
    s.push_str("ET\n");

    // Badge Jalur / Gelombang di kanan kotak sorot
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 9 Tf 1 0 0 1 330 655 Tm (Jalur: {}) Tj\n",
        pdf_escape(&data.jalur_nama)
    ));
    s.push_str(&format!(
        "/F1 8.5 Tf 1 0 0 1 330 640 Tm (Gelombang: {} - Saluran: {}) Tj\n",
        pdf_escape(&data.gelombang_nama),
        pdf_escape(&data.channel.to_uppercase())
    ));
    s.push_str("ET\n");

    // 4. Tabel Biodata Calon Mahasiswa
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 11 Tf 1 0 0 1 40 600 Tm (I. IDENTITAS DIRI CALON MAHASISWA) Tj\n");
    s.push_str("ET\n");

    let labels_biodata = [
        ("Nama Lengkap", data.nama_lengkap.as_str()),
        ("Nomor Induk Kependudukan (NIK)", data.nik.as_str()),
        (
            "Tempat, Tanggal Lahir",
            &format!("{}, {}", data.tempat_lahir, data.tgl_lahir),
        ),
        (
            "Jenis Kelamin",
            if data.jenis_kelamin == "L" {
                "Laki-laki"
            } else {
                "Perempuan"
            },
        ),
        ("Agama", data.agama.as_str()),
        ("Nomor Telepon / WhatsApp", data.no_hp.as_str()),
        ("Alamat Email Akun", data.email.as_str()),
        (
            "Asal Sekolah & Jurusan",
            &format!("{} - {}", data.asal_sekolah, data.jurusan_sekolah),
        ),
    ];

    let mut cur_y = 580.0;
    for (lbl, val) in labels_biodata.iter() {
        // Strip selang-seling warna latar baris
        s.push_str("0.98 0.99 1.00 rg\n");
        s.push_str(&format!("40 {:.2} 515.28 17 re f\n", cur_y - 4.0));

        s.push_str("BT\n");
        s.push_str("0.35 0.42 0.52 rg\n");
        s.push_str(&format!(
            "/F1 8.5 Tf 1 0 0 1 50 {:.2} Tm ({}) Tj\n",
            cur_y,
            pdf_escape(lbl)
        ));
        s.push_str("0.08 0.12 0.18 rg\n");
        s.push_str(&format!(
            "/F2 8.5 Tf 1 0 0 1 220 {:.2} Tm (: {}) Tj\n",
            cur_y,
            pdf_escape(val)
        ));
        s.push_str("ET\n");
        cur_y -= 18.0;
    }

    // 5. Pilihan Program Studi
    cur_y -= 10.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 1 0 0 1 40 {:.2} Tm (II. PILIHAN PROGRAM STUDI AKADEMIK) Tj\n",
        cur_y
    ));
    s.push_str("ET\n");

    cur_y -= 20.0;
    s.push_str("0.96 0.98 1.00 rg\n");
    s.push_str(&format!("40 {:.2} 515.28 42 re f\n", cur_y - 26.0));
    s.push_str("0.80 0.88 0.95 RG 1 w\n");
    s.push_str(&format!("40 {:.2} 515.28 42 re s\n", cur_y - 26.0));

    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 9 Tf 1 0 0 1 50 {:.2} Tm (Pilihan 1 (Prioritas Utama): {}) Tj\n",
        cur_y - 5.0,
        pdf_escape(&data.prodi_1_nama)
    ));
    let p2 = data
        .prodi_2_nama
        .as_deref()
        .unwrap_or("Tidak memilih program studi kedua");
    s.push_str(&format!(
        "/F1 8.5 Tf 1 0 0 1 50 {:.2} Tm (Pilihan 2 (Pilihan Cadangan): {}) Tj\n",
        cur_y - 20.0,
        pdf_escape(p2)
    ));
    s.push_str("ET\n");

    // 6. Status Keuangan & QR Code
    cur_y -= 50.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 1 0 0 1 40 {:.2} Tm (III. VERIFIKASI KEABSAHAN & STATUS ADMINISTRASI) Tj\n",
        cur_y
    ));
    s.push_str("ET\n");

    // Kotak Keterangan Status Bayar & Cetak
    cur_y -= 85.0;
    s.push_str("0.98 0.99 1.00 rg\n");
    s.push_str(&format!("40 {:.2} 390 80 re f\n", cur_y));
    s.push_str("0.85 0.90 0.95 RG 1 w\n");
    s.push_str(&format!("40 {:.2} 390 80 re s\n", cur_y));

    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 50 {:.2} Tm (Status Biaya Formulir: {}) Tj\n",
        cur_y + 60.0,
        pdf_escape(&data.status_pembayaran)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 50 {:.2} Tm (Waktu Pencetakan Dokumen: {}) Tj\n",
        cur_y + 44.0,
        pdf_escape(&data.tanggal_cetak)
    ));
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 50 {:.2} Tm (Catatan: Simpan lembar ini sebagai bukti otentik untuk ditunjukkan) Tj\n", cur_y + 26.0));
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 50 {:.2} Tm (saat verifikasi berkas fisik atau pelaksanaan ujian seleksi masuk.) Tj\n", cur_y + 14.0));
    s.push_str("ET\n");

    // QR Code Vektor (Kanan bawah)
    let qr_svg = render_qr_vector(qr_url, 445.0, cur_y + 5.0, 70.0);
    s.push_str(&qr_svg);

    // Label di bawah QR
    s.push_str("BT\n0.35 0.42 0.52 rg\n");
    s.push_str(&format!(
        "/F1 7 Tf 1 0 0 1 445 {:.2} Tm (Scan Verifikasi) Tj\n",
        cur_y - 4.0
    ));
    s.push_str("ET\n");

    // 7. Area Tanda Tangan
    let ttd_y = cur_y - 65.0;
    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 60 {:.2} Tm (Calon Mahasiswa Baru,) Tj\n",
        ttd_y
    ));
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 390 {:.2} Tm (Panitia Penerimaan Mahasiswa Baru,) Tj\n",
        ttd_y
    ));

    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 60 {:.2} Tm (( {} )) Tj\n",
        ttd_y - 45.0,
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 390 {:.2} Tm (( Panitia Admisi PMB UPT )) Tj\n",
        ttd_y - 45.0
    ));
    s.push_str("ET\n");

    // Garis tanda tangan
    s.push_str("0.70 0.75 0.80 RG 0.5 w\n");
    s.push_str(&format!(
        "50 {:.2} m 210 {:.2} l s\n",
        ttd_y - 48.0,
        ttd_y - 48.0
    ));
    s.push_str(&format!(
        "380 {:.2} m 530 {:.2} l s\n",
        ttd_y - 48.0,
        ttd_y - 48.0
    ));

    crate::pdfkit::bangun_pdf(&s)
}

/// 2. Cetak Kartu Peserta Ujian / Seleksi PMB
pub fn generate_kartu_peserta_pdf(
    data: &PendaftarPdfData,
    jadwal: Option<&JadwalUjianPdfData>,
    qr_url: &str,
) -> Vec<u8> {
    let mut s = String::new();

    // 1. Kop surat resmi berlogo + judul kartu
    {
        let mut h = crate::pdfkit::Halaman::baru();
        h.logo_watermark(148.0, 270.0, 300.0);
        crate::pdfkit::kop_surat(
            &mut h,
            "Panitia Penerimaan Mahasiswa Baru (PMB) Tahun Akademik 2026/2027",
        );
        h.teks(
            40.0,
            729.0,
            true,
            11.5,
            crate::pdfkit::NAVY,
            "KARTU TANDA PESERTA UJIAN SELEKSI PMB 2026/2027",
        );
        h.teks(
            40.0,
            721.5,
            false,
            7.5,
            crate::pdfkit::ABU,
            "Wajib dicetak dan dibawa saat pelaksanaan ujian seleksi tertulis / CBT online",
        );
        s.push_str(&h.s);
    }

    // 2. Baris Nomor Peserta Ujian & Pendaftaran
    s.push_str("0.96 0.98 1.00 rg\n");
    s.push_str("40 670 515.28 48 re f\n");
    s.push_str("0.05 0.14 0.25 RG 1.5 w\n");
    s.push_str("40 670 515.28 48 re s\n");

    let no_peserta = jadwal
        .map(|j| j.nomor_peserta.as_str())
        .unwrap_or(data.nomor_pendaftaran.as_str());

    s.push_str("BT\n");
    s.push_str("0.35 0.42 0.52 rg\n");
    s.push_str("/F1 8 Tf 1 0 0 1 55 704 Tm (NOMOR PESERTA UJIAN) Tj\n");
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 16 Tf 1 0 0 1 55 684 Tm ({}) Tj\n",
        pdf_escape(no_peserta)
    ));

    s.push_str("0.35 0.42 0.52 rg\n");
    s.push_str("/F1 8 Tf 1 0 0 1 330 704 Tm (NOMOR PENDAFTARAN) Tj\n");
    s.push_str("0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F2 13 Tf 1 0 0 1 330 686 Tm ({}) Tj\n",
        pdf_escape(&data.nomor_pendaftaran)
    ));
    s.push_str("ET\n");

    // 3. Kolom Foto & Data Peserta
    let mut cur_y = 650.0;
    // Bingkai Kotak Pasfoto (Kiri)
    s.push_str("0.95 0.97 0.99 rg\n");
    s.push_str("40 520 100 130 re f\n");
    s.push_str("0.70 0.80 0.90 RG 1 w\n");
    s.push_str("40 520 100 130 re s\n");

    s.push_str("BT\n0.40 0.50 0.60 rg\n");
    s.push_str("/F1 8.5 Tf 1 0 0 1 65 585 Tm (PASFOTO) Tj\n");
    s.push_str("/F1 7 Tf 1 0 0 1 68 570 Tm (3 x 4) Tj\n");
    s.push_str("ET\n");

    // Detail Data Diri di samping pasfoto
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 1 0 0 1 160 {:.2} Tm (DATA DIRI PESERTA UJIAN) Tj\n",
        cur_y - 5.0
    ));
    s.push_str("ET\n");

    let peserta_rows = [
        ("Nama Lengkap", data.nama_lengkap.as_str()),
        ("NIK KTP", data.nik.as_str()),
        ("Asal Sekolah", data.asal_sekolah.as_str()),
        ("Jalur Masuk", data.jalur_nama.as_str()),
        ("Program Studi (Pilihan 1)", data.prodi_1_nama.as_str()),
        (
            "Program Studi (Pilihan 2)",
            data.prodi_2_nama.as_deref().unwrap_or("-"),
        ),
    ];

    cur_y -= 25.0;
    for (lbl, val) in peserta_rows.iter() {
        s.push_str("BT\n");
        s.push_str("0.35 0.42 0.52 rg\n");
        s.push_str(&format!(
            "/F1 8.5 Tf 1 0 0 1 160 {:.2} Tm ({}) Tj\n",
            cur_y,
            pdf_escape(lbl)
        ));
        s.push_str("0.08 0.12 0.18 rg\n");
        s.push_str(&format!(
            "/F2 8.5 Tf 1 0 0 1 290 {:.2} Tm (: {}) Tj\n",
            cur_y,
            pdf_escape(val)
        ));
        s.push_str("ET\n");
        cur_y -= 18.0;
    }

    // 4. Jadwal & Tempat Ujian Seleksi
    cur_y = 500.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 1 0 0 1 40 {:.2} Tm (JADWAL & TEMPAT PELAKSANAAN UJIAN) Tj\n",
        cur_y
    ));
    s.push_str("ET\n");

    cur_y -= 75.0;
    s.push_str("0.96 0.98 1.00 rg\n");
    s.push_str(&format!("40 {:.2} 370 70 re f\n", cur_y));
    s.push_str("0.20 0.40 0.85 RG 1 w\n");
    s.push_str(&format!("40 {:.2} 370 70 re s\n", cur_y));

    let nama_tes = jadwal
        .map(|j| j.nama_ujian.as_str())
        .unwrap_or("Tes Potensi Skolastik & Akademik CBT");
    let tgl_tes = jadwal
        .map(|j| j.tanggal_ujian.as_str())
        .unwrap_or("Sesuai Jadwal Gelombang");
    let waktu_tes = jadwal
        .map(|j| j.waktu_ujian.as_str())
        .unwrap_or("09:00 - 11:00 WIB");
    let lokasi_tes = jadwal
        .map(|j| j.lokasi_ruang.as_str())
        .unwrap_or("Laboratorium Komputer Kampus UPT");

    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 50 {:.2} Tm (Mata Uji: {}) Tj\n",
        cur_y + 52.0,
        pdf_escape(nama_tes)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 50 {:.2} Tm (Tanggal & Waktu: {}, {}) Tj\n",
        cur_y + 36.0,
        pdf_escape(tgl_tes),
        pdf_escape(waktu_tes)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 50 {:.2} Tm (Lokasi / Ruang: {}) Tj\n",
        cur_y + 20.0,
        pdf_escape(lokasi_tes)
    ));
    s.push_str("ET\n");

    // QR Code Pemindaian Pengawas
    let qr_svg = render_qr_vector(qr_url, 435.0, cur_y - 2.0, 75.0);
    s.push_str(&qr_svg);

    s.push_str("BT\n0.35 0.42 0.52 rg\n");
    s.push_str(&format!(
        "/F1 7 Tf 1 0 0 1 435 {:.2} Tm (Presensi Pengawas) Tj\n",
        cur_y - 12.0
    ));
    s.push_str("ET\n");

    // 5. Tata Tertib Ujian
    cur_y -= 30.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 10 Tf 1 0 0 1 40 {:.2} Tm (TATA TERTIB PESERTA UJIAN SELEKSI:) Tj\n",
        cur_y
    ));
    s.push_str("0.25 0.35 0.45 rg\n");
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 40 {:.2} Tm (1. Peserta wajib hadir di ruang ujian fisik / online 15 menit sebelum ujian dimulai.) Tj\n", cur_y - 14.0));
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 40 {:.2} Tm (2. Membawa Kartu Tanda Peserta Ujian ini beserta identitas asli (KTP / Kartu Pelajar).) Tj\n", cur_y - 26.0));
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 40 {:.2} Tm (3. Berpakaian rapi, sopan, bersepatu (bukan kaos oblong/sandal), dan mentaati instruksi pengawas.) Tj\n", cur_y - 38.0));
    s.push_str(&format!("/F1 7.5 Tf 1 0 0 1 40 {:.2} Tm (4. Segala bentuk kecurangan akan membatalkan status kepesertaan PMB secara permanen.) Tj\n", cur_y - 50.0));
    s.push_str("ET\n");

    // Area Tanda Tangan Pengawas
    let ttd_y = cur_y - 100.0;
    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 60 {:.2} Tm (Tanda Tangan Peserta Ujian,) Tj\n",
        ttd_y
    ));
    s.push_str(&format!(
        "/F1 8 Tf 1 0 0 1 390 {:.2} Tm (Verifikator / Pengawas Ujian,) Tj\n",
        ttd_y
    ));

    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 60 {:.2} Tm (( {} )) Tj\n",
        ttd_y - 45.0,
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 1 0 0 1 390 {:.2} Tm (( Pengawas Ujian PMB )) Tj\n",
        ttd_y - 45.0
    ));
    s.push_str("ET\n");

    s.push_str("0.70 0.75 0.80 RG 0.5 w\n");
    s.push_str(&format!(
        "50 {:.2} m 210 {:.2} l s\n",
        ttd_y - 48.0,
        ttd_y - 48.0
    ));
    s.push_str(&format!(
        "380 {:.2} m 530 {:.2} l s\n",
        ttd_y - 48.0,
        ttd_y - 48.0
    ));

    crate::pdfkit::bangun_pdf(&s)
}

// ==========================================================================
// 3. Formulir Pendaftaran Lengkap (seluruh isian calon + daftar berkas)
// ==========================================================================

/// Seluruh data yang diisi calon pada formulir pendaftaran, siap dicetak.
#[derive(Clone, Debug)]
pub struct FormulirPdfData {
    pub dasar: PendaftarPdfData,
    pub alamat_lengkap: String,
    pub nama_ortu: String,
    pub no_hp_ortu: String,
    pub nilai_rapor_avg: f64,
    /// Isian dinamis formulir: (kelompok, label, nilai).
    pub isian: Vec<(String, String, String)>,
    /// Berkas yang diunggah: (jenis, nama file, status verifikasi).
    pub berkas: Vec<(String, String, String)>,
}

/// Kolom tetap yang sudah tampil di blok biodata; tidak diulang pada isian dinamis.
const KUNCI_SUDAH_TAMPIL: [&str; 11] = [
    "nik",
    "agama",
    "no_hp",
    "tgl_lahir",
    "tempat_lahir",
    "jenis_kelamin",
    "asal_sekolah",
    "jurusan_sekolah",
    "nama_ortu",
    "no_hp_ortu",
    "alamat_lengkap",
];

/// Ubah nilai JSON isian menjadi teks yang dapat dibaca; `None` bila kosong.
fn nilai_json_ke_teks(v: &serde_json::Value) -> Option<String> {
    use serde_json::Value;
    let teks = match v {
        Value::Null => return None,
        Value::String(s) => s.trim().to_string(),
        Value::Bool(true) => "Ya".to_string(),
        Value::Bool(false) => "Tidak".to_string(),
        Value::Number(n) => n.to_string(),
        Value::Array(a) => a
            .iter()
            .filter_map(nilai_json_ke_teks)
            .collect::<Vec<_>>()
            .join(", "),
        Value::Object(_) => v.to_string(),
    };
    if teks.is_empty() { None } else { Some(teks) }
}

/// Label ramah dari kunci mentah, mis. `nama_ibu` -> `Nama Ibu`.
fn label_dari_kunci(kunci: &str) -> String {
    kunci
        .split('_')
        .filter(|k| !k.is_empty())
        .map(|k| {
            let mut c = k.chars();
            match c.next() {
                Some(h) => h.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Susun isian dinamis: urut sesuai definisi field (kode, label, kelompok), lalu kunci lain
/// yang tersimpan tetapi tidak punya definisi. Isian kosong dan kolom tetap dilewati.
pub fn susun_isian(
    data: &serde_json::Value,
    definisi: &[(String, String, String)],
) -> Vec<(String, String, String)> {
    let Some(peta) = data.as_object() else {
        return Vec::new();
    };
    let mut hasil = Vec::new();
    let mut terpakai: Vec<&str> = Vec::new();

    for (kode, label, kelompok) in definisi {
        terpakai.push(kode.as_str());
        if KUNCI_SUDAH_TAMPIL.contains(&kode.as_str()) {
            continue;
        }
        if let Some(teks) = peta.get(kode).and_then(nilai_json_ke_teks) {
            hasil.push((kelompok.clone(), label.clone(), teks));
        }
    }
    for (kunci, nilai) in peta {
        if terpakai.contains(&kunci.as_str()) || KUNCI_SUDAH_TAMPIL.contains(&kunci.as_str()) {
            continue;
        }
        if let Some(teks) = nilai_json_ke_teks(nilai) {
            hasil.push(("Data Tambahan".to_string(), label_dari_kunci(kunci), teks));
        }
    }
    hasil
}

const MARGIN_KIRI: f64 = 46.0;
const MARGIN_KANAN: f64 = 549.0;
const BATAS_BAWAH: f64 = 64.0;
const X_LABEL: f64 = 54.0;
const X_NILAI: f64 = 218.0;

/// Penulis halaman berurutan: otomatis pindah halaman saat ruang habis.
struct Penulis {
    selesai: Vec<String>,
    h: crate::pdfkit::Halaman,
    y: f64,
    baris_ke: usize,
}

impl Penulis {
    fn baru(subjudul: &str) -> Self {
        let mut h = crate::pdfkit::Halaman::baru();
        h.logo_watermark(148.0, 270.0, 300.0);
        let y = crate::pdfkit::kop_surat(&mut h, subjudul);
        Self {
            selesai: Vec::new(),
            h,
            y: y - 24.0,
            baris_ke: 0,
        }
    }

    fn halaman_baru(&mut self) {
        let mut h = crate::pdfkit::Halaman::baru();
        h.logo_watermark(148.0, 270.0, 300.0);
        h.kotak(0.0, 835.0, 595.28, 7.0, crate::pdfkit::NAVY);
        h.kotak(0.0, 832.0, 595.28, 2.5, crate::pdfkit::EMAS);
        h.teks(
            MARGIN_KIRI,
            812.0,
            true,
            9.0,
            crate::pdfkit::NAVY,
            "FORMULIR PENDAFTARAN PMB - Universitas Pignatelli Triputra",
        );
        h.garis(
            MARGIN_KIRI,
            803.0,
            MARGIN_KANAN,
            803.0,
            crate::pdfkit::EMAS,
            0.7,
        );
        let lama = std::mem::replace(&mut self.h, h);
        self.selesai.push(lama.s);
        self.y = 780.0;
        self.baris_ke = 0;
    }

    fn butuh(&mut self, tinggi: f64) {
        if self.y - tinggi < BATAS_BAWAH {
            self.halaman_baru();
        }
    }

    fn bagian(&mut self, judul: &str) {
        self.butuh(48.0);
        self.y -= 6.0;
        self.h.kotak(
            MARGIN_KIRI,
            self.y - 6.0,
            MARGIN_KANAN - MARGIN_KIRI,
            20.0,
            crate::pdfkit::NAVY,
        );
        self.h.teks(
            MARGIN_KIRI + 8.0,
            self.y,
            true,
            9.5,
            crate::pdfkit::PUTIH,
            judul,
        );
        self.y -= 24.0;
        self.baris_ke = 0;
    }

    fn baris(&mut self, label: &str, nilai: &str) {
        let nilai = if nilai.trim().is_empty() { "-" } else { nilai };
        let lebar = MARGIN_KANAN - X_NILAI - 6.0;
        let potong = crate::pdfkit::bungkus(nilai, true, 8.5, lebar);
        let label_potong = crate::pdfkit::bungkus(label, false, 8.5, X_NILAI - X_LABEL - 10.0);
        let n = potong.len().max(label_potong.len()).max(1);
        let tinggi = n as f64 * 12.0 + 6.0;
        self.butuh(tinggi);

        if self.baris_ke % 2 == 0 {
            self.h.kotak(
                MARGIN_KIRI,
                self.y - tinggi + 10.0,
                MARGIN_KANAN - MARGIN_KIRI,
                tinggi,
                crate::pdfkit::LATAR,
            );
        }
        let mut yy = self.y;
        for l in &label_potong {
            self.h.teks(X_LABEL, yy, false, 8.5, crate::pdfkit::ABU, l);
            yy -= 12.0;
        }
        let mut yy = self.y;
        for (i, l) in potong.iter().enumerate() {
            let t = if i == 0 {
                format!(": {l}")
            } else {
                format!("  {l}")
            };
            self.h
                .teks(X_NILAI - 6.0, yy, true, 8.5, crate::pdfkit::TEKS, &t);
            yy -= 12.0;
        }
        self.y -= tinggi;
        self.baris_ke += 1;
    }

    fn selesai(mut self) -> Vec<String> {
        let akhir = std::mem::take(&mut self.h.s);
        self.selesai.push(akhir);
        self.selesai
    }
}

fn status_ramah(s: &str) -> String {
    s.replace('_', " ")
}

/// 3. Cetak Formulir Pendaftaran Lengkap (A4, banyak halaman bila isian panjang).
pub fn generate_formulir_pendaftaran_pdf(data: &FormulirPdfData) -> Vec<u8> {
    use crate::pdfkit as k;
    let d = &data.dasar;
    let mut p = Penulis::baru("Formulir Pendaftaran Calon Mahasiswa Baru - Tahun Akademik 2026/2027");

    // Judul + nomor pendaftaran
    let y = p.y;
    p.h.teks(
        MARGIN_KIRI,
        y,
        true,
        14.0,
        k::NAVY,
        "FORMULIR PENDAFTARAN CALON MAHASISWA BARU",
    );
    p.y -= 14.0;
    let y = p.y;
    p.h.teks(
        MARGIN_KIRI,
        y,
        false,
        8.5,
        k::ABU,
        "Salinan seluruh data yang diisi calon mahasiswa pada saat pendaftaran PMB.",
    );
    p.y -= 20.0;
    let y = p.y;
    p.h.kotak(MARGIN_KIRI, y - 30.0, 503.0, 42.0, k::LATAR);
    p.h.bingkai(MARGIN_KIRI, y - 30.0, 503.0, 42.0, k::NAVY, 1.2);
    p.h.teks(MARGIN_KIRI + 10.0, y - 2.0, false, 7.5, k::ABU, "NOMOR PENDAFTARAN");
    p.h.teks(
        MARGIN_KIRI + 10.0,
        y - 20.0,
        true,
        15.0,
        k::NAVY,
        &d.nomor_pendaftaran,
    );
    p.h.teks_kanan(
        MARGIN_KANAN - 10.0,
        y - 2.0,
        true,
        8.5,
        k::TEKS,
        &format!("Status: {}", status_ramah(&d.status_pendaftaran)),
    );
    p.h.teks_kanan(
        MARGIN_KANAN - 10.0,
        y - 18.0,
        false,
        8.0,
        k::ABU,
        &format!("Saluran: {}", d.channel.to_uppercase()),
    );
    p.y -= 52.0;

    p.bagian("I. IDENTITAS DIRI");
    p.baris("Nama Lengkap", &d.nama_lengkap);
    p.baris("NIK", &d.nik);
    p.baris(
        "Tempat, Tanggal Lahir",
        &format!("{}, {}", d.tempat_lahir, d.tgl_lahir),
    );
    p.baris(
        "Jenis Kelamin",
        if d.jenis_kelamin == "L" {
            "Laki-laki"
        } else {
            "Perempuan"
        },
    );
    p.baris("Agama", &d.agama);
    p.baris("Alamat Lengkap", &data.alamat_lengkap);
    p.baris("Nomor HP / WhatsApp", &d.no_hp);
    p.baris("Email Akun", &d.email);

    p.bagian("II. DATA ORANG TUA / WALI");
    p.baris("Nama Orang Tua / Wali", &data.nama_ortu);
    p.baris("Nomor HP Orang Tua / Wali", &data.no_hp_ortu);

    p.bagian("III. DATA AKADEMIK");
    p.baris("Asal Sekolah", &d.asal_sekolah);
    p.baris("Jurusan Sekolah", &d.jurusan_sekolah);
    p.baris(
        "Rata-rata Nilai Rapor",
        &format!("{:.2}", data.nilai_rapor_avg),
    );

    p.bagian("IV. JALUR & PROGRAM STUDI");
    p.baris("Jalur Masuk", &d.jalur_nama);
    p.baris("Gelombang", &d.gelombang_nama);
    p.baris("Pilihan Program Studi 1", &d.prodi_1_nama);
    p.baris(
        "Pilihan Program Studi 2",
        d.prodi_2_nama.as_deref().unwrap_or("Tidak memilih"),
    );
    p.baris("Status Biaya Formulir", &d.status_pembayaran);

    // Isian dinamis dikelompokkan sesuai kelompok pada Form Builder.
    let romawi = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    let mut kelompok_sebelumnya: Option<&str> = None;
    let mut urutan_bagian = 0usize;
    for (kelompok, label, nilai) in &data.isian {
        if kelompok_sebelumnya != Some(kelompok.as_str()) {
            let r = romawi.get(urutan_bagian).copied().unwrap_or("+");
            p.bagian(&format!("{r}. {}", status_ramah(kelompok).to_uppercase()));
            kelompok_sebelumnya = Some(kelompok.as_str());
            urutan_bagian += 1;
        }
        p.baris(label, nilai);
    }

    // Berkas
    p.bagian("BERKAS YANG DIUNGGAH");
    if data.berkas.is_empty() {
        p.baris("Berkas", "Belum ada berkas yang diunggah");
    }
    for (jenis, nama_file, status) in &data.berkas {
        p.baris(
            &label_dari_kunci(&jenis.to_lowercase()),
            &format!("{nama_file}  [{}]", status_ramah(status)),
        );
    }

    // Pernyataan & tanda tangan
    p.butuh(130.0);
    p.y -= 14.0;
    let y = p.y;
    p.y = p.h.paragraf(
        MARGIN_KIRI,
        y,
        503.0,
        false,
        8.5,
        11.0,
        k::TEKS,
        "Saya menyatakan bahwa seluruh data yang tercantum pada formulir ini adalah benar dan dapat dipertanggungjawabkan. Apabila di kemudian hari ditemukan ketidaksesuaian, saya bersedia menerima keputusan panitia PMB.",
    );
    p.y -= 18.0;
    let y = p.y;
    p.h.teks(70.0, y, false, 8.5, k::TEKS, "Calon Mahasiswa Baru,");
    p.h.teks(380.0, y, false, 8.5, k::TEKS, "Panitia Penerimaan Mahasiswa Baru,");
    p.y -= 56.0;
    let y = p.y;
    p.h.garis(60.0, y - 4.0, 220.0, y - 4.0, k::GARIS, 0.6);
    p.h.garis(370.0, y - 4.0, 530.0, y - 4.0, k::GARIS, 0.6);
    p.h.teks_tengah(140.0, y - 16.0, true, 8.5, k::NAVY, &d.nama_lengkap);
    p.h.teks_tengah(450.0, y - 16.0, true, 8.5, k::NAVY, "Panitia Admisi PMB UPT");

    let mut halaman = p.selesai();
    let total = halaman.len();
    for (i, h) in halaman.iter_mut().enumerate() {
        let mut f = k::Halaman::baru();
        f.garis(MARGIN_KIRI, 48.0, MARGIN_KANAN, 48.0, k::GARIS, 0.6);
        f.teks(
            MARGIN_KIRI,
            36.0,
            false,
            7.5,
            k::ABU,
            &format!("Dicetak: {}", d.tanggal_cetak),
        );
        f.teks_kanan(
            MARGIN_KANAN,
            36.0,
            false,
            7.5,
            k::ABU,
            &format!("Halaman {} dari {}", i + 1, total),
        );
        h.push_str(&f.s);
    }
    k::bangun_pdf_banyak(&halaman, 595.28, 841.89)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn dasar() -> PendaftarPdfData {
        PendaftarPdfData {
            nomor_pendaftaran: "PMB-2026-0001".into(),
            nama_lengkap: "Budi Santoso".into(),
            email: "budi@contoh.id".into(),
            no_hp: "0812".into(),
            nik: "3372010101010001".into(),
            tempat_lahir: "Surakarta".into(),
            tgl_lahir: "01-01-2008".into(),
            jenis_kelamin: "L".into(),
            agama: "Islam".into(),
            asal_sekolah: "SMA N 1".into(),
            jurusan_sekolah: "IPA".into(),
            jalur_nama: "READY Admission".into(),
            gelombang_nama: "Gelombang 1".into(),
            prodi_1_nama: "Teknologi Informasi".into(),
            prodi_2_nama: None,
            status_pendaftaran: "BERKAS_VERIFIED".into(),
            channel: "online".into(),
            status_pembayaran: "LUNAS".into(),
            tanggal_cetak: "16 November 2026 10:00 WIB".into(),
        }
    }

    #[test]
    fn susun_isian_urut_definisi_dan_lewati_kolom_tetap() {
        let data = json!({
            "nik": "1", "nama_ibu": "Ani", "minat_ekskul": ["Robotik", "Debat"],
            "tahun_lulus": 2026, "kosong": "  ", "punya_laptop": true
        });
        let definisi = vec![
            (
                "nama_ibu".to_string(),
                "Nama Ibu Kandung".to_string(),
                "Keluarga".to_string(),
            ),
            (
                "nik".to_string(),
                "NIK".to_string(),
                "Identitas".to_string(),
            ),
        ];
        let hasil = susun_isian(&data, &definisi);
        assert_eq!(
            hasil[0],
            (
                "Keluarga".to_string(),
                "Nama Ibu Kandung".to_string(),
                "Ani".to_string()
            )
        );
        assert!(hasil.iter().all(|(_, l, _)| l != "NIK"));
        assert!(
            hasil
                .iter()
                .any(|(k, l, v)| k == "Data Tambahan" && l == "Minat Ekskul" && v == "Robotik, Debat")
        );
        assert!(
            hasil
                .iter()
                .any(|(_, l, v)| l == "Punya Laptop" && v == "Ya")
        );
        assert!(hasil.iter().all(|(_, l, _)| l != "Kosong"));
    }

    #[test]
    fn susun_isian_bukan_objek_kembali_kosong() {
        assert!(susun_isian(&json!(null), &[]).is_empty());
    }

    #[test]
    fn formulir_pdf_valid_dan_banyak_halaman_bila_isian_panjang() {
        let isian: Vec<_> = (0..120)
            .map(|i| {
                (
                    "Data Tambahan".to_string(),
                    format!("Isian {i}"),
                    "Nilai contoh yang cukup panjang untuk membungkus beberapa baris pada kolom nilai formulir pendaftaran"
                        .to_string(),
                )
            })
            .collect();
        let data = FormulirPdfData {
            dasar: dasar(),
            alamat_lengkap: "Jl. Contoh No. 1".into(),
            nama_ortu: "Ayah".into(),
            no_hp_ortu: "0813".into(),
            nilai_rapor_avg: 85.5,
            isian,
            berkas: vec![(
                "KARTU_KELUARGA".into(),
                "kk.pdf".into(),
                "TERVERIFIKASI".into(),
            )],
        };
        let pdf = generate_formulir_pendaftaran_pdf(&data);
        let teks = String::from_utf8_lossy(&pdf);
        assert!(teks.starts_with("%PDF-1.4"));
        assert!(teks.trim_end().ends_with("%%EOF"));
        assert!(
            !teks.contains("/Count 1 "),
            "isian panjang harus lebih dari satu halaman"
        );
        assert!(teks.contains("Halaman 1 dari"));
    }
}
