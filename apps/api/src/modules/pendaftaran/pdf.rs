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

/// Merakit berkas PDF-1.4 lengkap dari stream grafis halaman tunggal A4
fn assemble_pdf(stream_content: &str) -> Vec<u8> {
    let stream_bytes = stream_content.as_bytes();
    let stream_len = stream_bytes.len();

    let mut body = Vec::new();
    let mut offsets = Vec::new();

    // Header
    body.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    // 1 0 obj: Catalog
    offsets.push(body.len());
    body.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // 2 0 obj: Pages
    offsets.push(body.len());
    body.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    // 3 0 obj: Page A4 (595.28 x 841.89 points)
    offsets.push(body.len());
    body.extend_from_slice(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n"
    );

    // 4 0 obj: Regular Font (Helvetica)
    offsets.push(body.len());
    body.extend_from_slice(
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    // 5 0 obj: Bold Font (Helvetica-Bold)
    offsets.push(body.len());
    body.extend_from_slice(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    // 6 0 obj: Contents Stream
    offsets.push(body.len());
    let stream_header = format!("6 0 obj\n<< /Length {} >>\nstream\n", stream_len);
    body.extend_from_slice(stream_header.as_bytes());
    body.extend_from_slice(stream_bytes);
    body.extend_from_slice(b"\nendstream\nendobj\n");

    // Cross-Reference Table
    let xref_offset = body.len();
    body.extend_from_slice(b"xref\n0 7\n0000000000 65535 f \n");
    for offset in offsets {
        body.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
    }

    // Trailer
    body.extend_from_slice(
        format!(
            "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            xref_offset
        )
        .as_bytes(),
    );

    body
}

/// Menghasilkan stream grafis modul vektor QR code
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

    // 1. Background Kartu & Bingkai Header
    // Header Banner Biru Tua (Biru-950)
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str("40 735 515.28 75 re f\n");

    // Aksen Emas / Garis Biru Terang Pembatas
    s.push_str("0.20 0.40 0.85 rg\n");
    s.push_str("40 730 515.28 5 re f\n");

    // Teks Kop Surat Resmi Universitas (Teks Putih)
    s.push_str("BT\n1 1 1 rg\n");
    s.push_str("/F2 15 Tf 55 785 Td (UNIVERSITAS PIGNATELLI TRIPUTRA) Tj\n");
    s.push_str("/F1 9 Tf 55 770 Td (PANITIA PENERIMAAN MAHASISWA BARU (PMB) TAHUN AKADEMIK 2026/2027) Tj\n");
    s.push_str("/F1 8 Tf 55 756 Td (Jl. Mayor Sunaryo No. 37, Sukoharjo - Surakarta, Jawa Tengah | pmb.pignatelli.ac.id) Tj\n");
    s.push_str("ET\n");

    // 2. Judul Dokumen
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 13 Tf 40 705 Td (TANDA BUKTI PENDAFTARAN RESMI) Tj\n");
    s.push_str("/F1 8 Tf 40 692 Td (Dokumen ini merupakan bukti sah pendaftaran calon mahasiswa baru) Tj\n");
    s.push_str("ET\n");

    // Badge Jalur & Status
    s.push_str("0.93 0.96 1.00 rg\n");
    s.push_str("370 695 185.28 25 re f\n");
    s.push_str("0.20 0.40 0.85 RG 0.75 w\n");
    s.push_str("370 695 185.28 25 re s\n");

    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 9 Tf 380 705 Td (Status: ) Tj\n");
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
    s.push_str("/F1 8 Tf 55 655 Td (NOMOR PENDAFTARAN RESMI CALON MAHASISWA) Tj\n");
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 16 Tf 55 637 Td ({}) Tj\n",
        pdf_escape(&data.nomor_pendaftaran)
    ));
    s.push_str("ET\n");

    // Badge Jalur / Gelombang di kanan kotak sorot
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 9 Tf 330 655 Td (Jalur: {}) Tj\n",
        pdf_escape(&data.jalur_nama)
    ));
    s.push_str(&format!(
        "/F1 8.5 Tf 330 640 Td (Gelombang: {} - Saluran: {}) Tj\n",
        pdf_escape(&data.gelombang_nama),
        pdf_escape(&data.channel.to_uppercase())
    ));
    s.push_str("ET\n");

    // 4. Tabel Biodata Calon Mahasiswa
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 11 Tf 40 600 Td (I. IDENTITAS DIRI CALON MAHASISWA) Tj\n");
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
            "/F1 8.5 Tf 50 {:.2} Td ({}) Tj\n",
            cur_y,
            pdf_escape(lbl)
        ));
        s.push_str("0.08 0.12 0.18 rg\n");
        s.push_str(&format!(
            "/F2 8.5 Tf 220 {:.2} Td (: {}) Tj\n",
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
        "/F2 11 Tf 40 {:.2} Td (II. PILIHAN PROGRAM STUDI AKADEMIK) Tj\n",
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
        "/F2 9 Tf 50 {:.2} Td (Pilihan 1 (Prioritas Utama): {}) Tj\n",
        cur_y - 5.0,
        pdf_escape(&data.prodi_1_nama)
    ));
    let p2 = data
        .prodi_2_nama
        .as_deref()
        .unwrap_or("Tidak memilih program studi kedua");
    s.push_str(&format!(
        "/F1 8.5 Tf 50 {:.2} Td (Pilihan 2 (Pilihan Cadangan): {}) Tj\n",
        cur_y - 20.0,
        pdf_escape(p2)
    ));
    s.push_str("ET\n");

    // 6. Status Keuangan & QR Code
    cur_y -= 50.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 40 {:.2} Td (III. VERIFIKASI KEABSAHAN & STATUS ADMINISTRASI) Tj\n",
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
        "/F2 8.5 Tf 50 {:.2} Td (Status Biaya Formulir: {}) Tj\n",
        cur_y + 60.0,
        pdf_escape(&data.status_pembayaran)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 50 {:.2} Td (Waktu Pencetakan Dokumen: {}) Tj\n",
        cur_y + 44.0,
        pdf_escape(&data.tanggal_cetak)
    ));
    s.push_str(&format!("/F1 7.5 Tf 50 {:.2} Td (Catatan: Simpan lembar ini sebagai bukti otentik untuk ditunjukkan) Tj\n", cur_y + 26.0));
    s.push_str(&format!("/F1 7.5 Tf 50 {:.2} Td (saat verifikasi berkas fisik atau pelaksanaan ujian seleksi masuk.) Tj\n", cur_y + 14.0));
    s.push_str("ET\n");

    // QR Code Vektor (Kanan bawah)
    let qr_svg = render_qr_vector(qr_url, 445.0, cur_y + 5.0, 70.0);
    s.push_str(&qr_svg);

    // Label di bawah QR
    s.push_str("BT\n0.35 0.42 0.52 rg\n");
    s.push_str(&format!(
        "/F1 7 Tf 445 {:.2} Td (Scan Verifikasi) Tj\n",
        cur_y - 4.0
    ));
    s.push_str("ET\n");

    // 7. Area Tanda Tangan
    let ttd_y = cur_y - 65.0;
    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F1 8 Tf 60 {:.2} Td (Calon Mahasiswa Baru,) Tj\n",
        ttd_y
    ));
    s.push_str(&format!(
        "/F1 8 Tf 390 {:.2} Td (Panitia Penerimaan Mahasiswa Baru,) Tj\n",
        ttd_y
    ));

    s.push_str(&format!(
        "/F2 8.5 Tf 60 {:.2} Td (( {} )) Tj\n",
        ttd_y - 45.0,
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 390 {:.2} Td (( Panitia Admisi PMB UPT )) Tj\n",
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

    assemble_pdf(&s)
}

/// 2. Cetak Kartu Peserta Ujian / Seleksi PMB
pub fn generate_kartu_peserta_pdf(
    data: &PendaftarPdfData,
    jadwal: Option<&JadwalUjianPdfData>,
    qr_url: &str,
) -> Vec<u8> {
    let mut s = String::new();

    // 1. Header Kartu Ujian (Biru Royal)
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str("40 735 515.28 75 re f\n");

    s.push_str("0.20 0.40 0.85 rg\n");
    s.push_str("40 730 515.28 5 re f\n");

    s.push_str("BT\n1 1 1 rg\n");
    s.push_str("/F2 15 Tf 55 785 Td (UNIVERSITAS PIGNATELLI TRIPUTRA) Tj\n");
    s.push_str("/F2 11 Tf 55 770 Td (KARTU TANDA PESERTA UJIAN SELEKSI PMB 2026/2027) Tj\n");
    s.push_str("/F1 8 Tf 55 756 Td (Wajib dicetak dan dibawa saat pelaksanaan ujian seleksi tertulis / CBT online) Tj\n");
    s.push_str("ET\n");

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
    s.push_str("/F1 8 Tf 55 704 Td (NOMOR PESERTA UJIAN) Tj\n");
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 16 Tf 55 684 Td ({}) Tj\n",
        pdf_escape(no_peserta)
    ));

    s.push_str("0.35 0.42 0.52 rg\n");
    s.push_str("/F1 8 Tf 330 704 Td (NOMOR PENDAFTARAN) Tj\n");
    s.push_str("0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F2 13 Tf 330 686 Td ({}) Tj\n",
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
    s.push_str("/F1 8.5 Tf 65 585 Td (PASFOTO) Tj\n");
    s.push_str("/F1 7 Tf 68 570 Td (3 x 4) Tj\n");
    s.push_str("ET\n");

    // Detail Data Diri di samping pasfoto
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 11 Tf 160 {:.2} Td (DATA DIRI PESERTA UJIAN) Tj\n",
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
            "/F1 8.5 Tf 160 {:.2} Td ({}) Tj\n",
            cur_y,
            pdf_escape(lbl)
        ));
        s.push_str("0.08 0.12 0.18 rg\n");
        s.push_str(&format!(
            "/F2 8.5 Tf 290 {:.2} Td (: {}) Tj\n",
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
        "/F2 11 Tf 40 {:.2} Td (JADWAL & TEMPAT PELAKSANAAN UJIAN) Tj\n",
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
        "/F2 8.5 Tf 50 {:.2} Td (Mata Uji: {}) Tj\n",
        cur_y + 52.0,
        pdf_escape(nama_tes)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 50 {:.2} Td (Tanggal & Waktu: {}, {}) Tj\n",
        cur_y + 36.0,
        pdf_escape(tgl_tes),
        pdf_escape(waktu_tes)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 50 {:.2} Td (Lokasi / Ruang: {}) Tj\n",
        cur_y + 20.0,
        pdf_escape(lokasi_tes)
    ));
    s.push_str("ET\n");

    // QR Code Pemindaian Pengawas
    let qr_svg = render_qr_vector(qr_url, 435.0, cur_y - 2.0, 75.0);
    s.push_str(&qr_svg);

    s.push_str("BT\n0.35 0.42 0.52 rg\n");
    s.push_str(&format!(
        "/F1 7 Tf 435 {:.2} Td (Presensi Pengawas) Tj\n",
        cur_y - 12.0
    ));
    s.push_str("ET\n");

    // 5. Tata Tertib Ujian
    cur_y -= 30.0;
    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 10 Tf 40 {:.2} Td (TATA TERTIB PESERTA UJIAN SELEKSI:) Tj\n",
        cur_y
    ));
    s.push_str("0.25 0.35 0.45 rg\n");
    s.push_str(&format!("/F1 7.5 Tf 40 {:.2} Td (1. Peserta wajib hadir di ruang ujian fisik / online 15 menit sebelum ujian dimulai.) Tj\n", cur_y - 14.0));
    s.push_str(&format!("/F1 7.5 Tf 40 {:.2} Td (2. Membawa Kartu Tanda Peserta Ujian ini beserta identitas asli (KTP / Kartu Pelajar).) Tj\n", cur_y - 26.0));
    s.push_str(&format!("/F1 7.5 Tf 40 {:.2} Td (3. Berpakaian rapi, sopan, bersepatu (bukan kaos oblong/sandal), dan mentaati instruksi pengawas.) Tj\n", cur_y - 38.0));
    s.push_str(&format!("/F1 7.5 Tf 40 {:.2} Td (4. Segala bentuk kecurangan akan membatalkan status kepesertaan PMB secara permanen.) Tj\n", cur_y - 50.0));
    s.push_str("ET\n");

    // Area Tanda Tangan Pengawas
    let ttd_y = cur_y - 100.0;
    s.push_str("BT\n0.08 0.12 0.18 rg\n");
    s.push_str(&format!(
        "/F1 8 Tf 60 {:.2} Td (Tanda Tangan Peserta Ujian,) Tj\n",
        ttd_y
    ));
    s.push_str(&format!(
        "/F1 8 Tf 390 {:.2} Td (Verifikator / Pengawas Ujian,) Tj\n",
        ttd_y
    ));

    s.push_str(&format!(
        "/F2 8.5 Tf 60 {:.2} Td (( {} )) Tj\n",
        ttd_y - 45.0,
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 390 {:.2} Td (( Pengawas Ujian PMB )) Tj\n",
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

    assemble_pdf(&s)
}
