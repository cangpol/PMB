// Generator Surat Penerimaan Resmi / Letter of Acceptance (LoA) PDF
// Universitas Pignatelli Triputra (UPT) Surakarta
// Standar ISO 32000-1 (PDF-1.4) dengan Vektor QR Code & Skema Biru-Putih Resmi

use qrcode::{Color, QrCode};

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
}

fn pdf_escape(text: &str) -> String {
    let mut out = String::with_capacity(text.len() * 2);
    for c in text.chars() {
        match c {
            '(' => out.push_str("\\("),
            ')' => out.push_str("\\)"),
            '\\' => out.push_str("\\\\"),
            _ if c.is_ascii() => out.push(c),
            _ => out.push('?'),
        }
    }
    out
}

fn generate_qr_vector_stream(qr_data: &str, x0: f64, y0: f64, target_size: f64) -> String {
    let code = match QrCode::new(qr_data.as_bytes()) {
        Ok(c) => c,
        Err(_) => return String::new(),
    };

    let modules = code.to_colors();
    let width = code.width();
    let module_size = target_size / (width as f64);

    let mut stream = String::new();
    stream.push_str("0 0 0 rg\n"); // Hitam

    for y in 0..width {
        for x in 0..width {
            let color = modules[y * width + x];
            if color == Color::Dark {
                let rx = x0 + (x as f64) * module_size;
                let ry = y0 + ((width - 1 - y) as f64) * module_size;
                stream.push_str(&format!(
                    "{:.2} {:.2} {:.2} {:.2} re f\n",
                    rx, ry, module_size, module_size
                ));
            }
        }
    }

    stream
}

pub fn generate_loa_pdf(data: &LoaPdfData) -> Vec<u8> {
    // Dimensi A4: 595.28 x 841.89 pt
    let mut s = String::with_capacity(16 * 1024);

    // 1. Header Banner Biru Royal
    // #061633 (0.024, 0.086, 0.200)
    s.push_str("0.024 0.086 0.200 rg\n");
    s.push_str("0 740 595.28 102 re f\n");

    // Garis Aksen Emas/Kuning Halus di bawah header
    s.push_str("0.85 0.70 0.25 rg\n");
    s.push_str("0 735 595.28 5 re f\n");

    // Teks Header Universitas
    s.push_str("1 1 1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 20 Tf\n");
    s.push_str("50 795 Td\n");
    s.push_str("(UNIVERSITAS PIGNATELLI TRIPUTRA) Tj\n");
    s.push_str("ET\n");

    s.push_str("BT\n");
    s.push_str("/F1 10 Tf\n");
    s.push_str("50 778 Td\n");
    s.push_str("(Jl. Duwet I No. 1, Karangasem, Laweyan, Surakarta, Jawa Tengah 57145) Tj\n");
    s.push_str("ET\n");

    s.push_str("BT\n");
    s.push_str("/F1 9 Tf\n");
    s.push_str("50 763 Td\n");
    s.push_str("(Website: pmb.upit.ac.id | Email: pmb@upit.ac.id | Telp: (0271) 714424) Tj\n");
    s.push_str("ET\n");

    // 2. Judul Dokumen Surat Keputusan
    s.push_str("0.05 0.15 0.35 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 15 Tf\n");
    s.push_str("50 690 Td\n");
    s.push_str("(SURAT KEPUTUSAN KELULUSAN SELEKSI PMB) Tj\n");
    s.push_str("ET\n");

    s.push_str("0.4 0.4 0.4 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 11 Tf\n");
    s.push_str("50 673 Td\n");
    s.push_str("(OFFICIAL LETTER OF ACCEPTANCE) Tj\n");
    s.push_str("ET\n");

    s.push_str("0.1 0.1 0.1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 10 Tf\n");
    s.push_str("50 655 Td\n");
    s.push_str(&format!(
        "(Nomor Surat: {}) Tj\n",
        pdf_escape(&data.nomor_surat_loa)
    ));
    s.push_str("ET\n");

    // Garis Pemisah
    s.push_str("0.8 0.8 0.8 rg\n");
    s.push_str("50 642 495.28 1 re f\n");

    // 3. Pernyataan Keputusan Resmi
    s.push_str("0.1 0.1 0.1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 10 Tf\n");
    s.push_str("50 620 Td\n");
    s.push_str(
        "(Rektor Universitas Pignatelli Triputra dengan ini menetapkan bahwa calon mahasiswa di bawah ini:) Tj\n",
    );
    s.push_str("ET\n");

    // 4. Tabel Identitas Calon
    let draw_row = |stream: &mut String, y: f64, label: &str, val: &str| {
        stream.push_str("0.35 0.35 0.35 rg\n");
        stream.push_str("BT\n");
        stream.push_str("/F1 10 Tf\n");
        stream.push_str(&format!("50 {:.2} Td\n", y));
        stream.push_str(&format!("({}:) Tj\n", pdf_escape(label)));
        stream.push_str("ET\n");

        stream.push_str("0.05 0.05 0.05 rg\n");
        stream.push_str("BT\n");
        stream.push_str("/F2 10 Tf\n");
        stream.push_str(&format!("180 {:.2} Td\n", y));
        stream.push_str(&format!("({}) Tj\n", pdf_escape(val)));
        stream.push_str("ET\n");
    };

    draw_row(&mut s, 595.0, "Nomor Pendaftaran", &data.nomor_pendaftaran);
    draw_row(&mut s, 577.0, "Nama Lengkap", &data.nama_lengkap);
    draw_row(&mut s, 559.0, "Nomor Induk (NIK)", &data.nik);
    draw_row(&mut s, 541.0, "Asal Sekolah", &data.asal_sekolah);
    draw_row(&mut s, 523.0, "Jalur Penerimaan", &data.jalur_nama);

    // Garis Pemisah Bagian Keputusan
    s.push_str("0.85 0.85 0.85 rg\n");
    s.push_str("50 508 495.28 1 re f\n");

    // 5. Kotak Status DITERIMA / LULUS (Emerald Light Box)
    s.push_str("0.92 0.98 0.94 rg\n"); // #ecfdf5
    s.push_str("50 420 495.28 75 re f\n");
    s.push_str("0.20 0.65 0.40 rg\n"); // Border Hijau
    s.push_str("50 420 495.28 75 re s\n");

    s.push_str("0.05 0.45 0.25 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 13 Tf\n");
    s.push_str("70 472 Td\n");
    s.push_str("(DINYATAKAN DITERIMA SEBAGAI MAHASISWA BARU) Tj\n");
    s.push_str("ET\n");

    s.push_str("0.05 0.15 0.35 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 11 Tf\n");
    s.push_str("70 452 Td\n");
    s.push_str(&format!(
        "(Program Studi : {} {} (Pilihan Ke-{})) Tj\n",
        pdf_escape(&data.jenjang),
        pdf_escape(&data.prodi_diterima),
        data.pilihan_ke
    ));
    s.push_str("ET\n");

    s.push_str("0.2 0.2 0.2 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 10 Tf\n");
    s.push_str("70 434 Td\n");
    s.push_str(&format!(
        "(Fakultas      : {} | Skor Seleksi: {:.2} (Peringkat {})) Tj\n",
        pdf_escape(&data.fakultas),
        data.skor_akhir,
        data.ranking
    ));
    s.push_str("ET\n");

    // 6. Petunjuk & Batas Waktu Daftar Ulang
    s.push_str("0.1 0.1 0.1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 11 Tf\n");
    s.push_str("50 395 Td\n");
    s.push_str("(Ketentuan & Prosedur Registrasi Ulang:) Tj\n");
    s.push_str("ET\n");

    let bullets = [
        "1. Calon mahasiswa wajib menyelesaikan pembayaran biaya daftar ulang sebelum batas waktu.",
        "2. Mengunggah berkas registrasi: Surat Pernyataan Mahasiswa Baru & Surat Bebas Narkoba.",
        "3. Nomor Induk Mahasiswa (NIM) resmi akan diterbitkan otomatis setelah berkas diverifikasi.",
        "4. Apabila tidak melakukan daftar ulang sampai batas waktu, hak penerimaan dianggap gugur.",
    ];

    let mut by = 377.0;
    for b in bullets {
        s.push_str("0.2 0.2 0.2 rg\n");
        s.push_str("BT\n");
        s.push_str("/F1 9 Tf\n");
        s.push_str(&format!("50 {:.2} Td\n", by));
        s.push_str(&format!("({}) Tj\n", pdf_escape(b)));
        s.push_str("ET\n");
        by -= 16.0;
    }

    // Kotak Batas Waktu Registrasi
    s.push_str("0.95 0.97 1.0 rg\n"); // Biru muda
    s.push_str("50 280 495.28 28 re f\n");
    s.push_str("0.15 0.40 0.85 rg\n");
    s.push_str("50 280 495.28 28 re s\n");

    s.push_str("0.05 0.15 0.45 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 10 Tf\n");
    s.push_str("65 291 Td\n");
    s.push_str(&format!(
        "(Batas Akhir Daftar Ulang: {} WIB) Tj\n",
        pdf_escape(&data.tgl_batas_daftar_ulang)
    ));
    s.push_str("ET\n");

    // 7. Area Tanda Tangan & QR Code Verifikasi
    // QR Code Vektor di sebelah kiri bawah
    let qr_str = generate_qr_vector_stream(&data.verifikasi_url, 50.0, 130.0, 90.0);
    s.push_str(&qr_str);

    s.push_str("0.4 0.4 0.4 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 8 Tf\n");
    s.push_str("50 115 Td\n");
    s.push_str("(Pindai QR Code untuk memverifikasi) Tj\n");
    s.push_str("ET\n");
    s.push_str("BT\n");
    s.push_str("/F1 8 Tf\n");
    s.push_str("50 105 Td\n");
    s.push_str("(keaslian Surat Keputusan Penerimaan ini) Tj\n");
    s.push_str("ET\n");

    // Pengesahan Pejabat di sebelah kanan bawah
    s.push_str("0.1 0.1 0.1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 10 Tf\n");
    s.push_str("370 215 Td\n");
    s.push_str(&format!(
        "(Surakarta, {}) Tj\n",
        pdf_escape(&data.tanggal_sk)
    ));
    s.push_str("ET\n");

    s.push_str("BT\n");
    s.push_str("/F1 10 Tf\n");
    s.push_str("370 200 Td\n");
    s.push_str("(Universitas Pignatelli Triputra) Tj\n");
    s.push_str("ET\n");

    s.push_str("BT\n");
    s.push_str("/F2 10 Tf\n");
    s.push_str("370 185 Td\n");
    s.push_str("(Ketua Panitia Seleksi PMB,) Tj\n");
    s.push_str("ET\n");

    // Stempel / Digital Signature Box
    s.push_str("0.90 0.93 0.98 rg\n");
    s.push_str("370 145 150 25 re f\n");
    s.push_str("0.15 0.35 0.70 rg\n");
    s.push_str("370 145 150 25 re s\n");
    s.push_str("0.10 0.25 0.55 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 8 Tf\n");
    s.push_str("385 155 Td\n");
    s.push_str("(TERTANDA SECARA DIGITAL) Tj\n");
    s.push_str("ET\n");

    s.push_str("0.1 0.1 0.1 rg\n");
    s.push_str("BT\n");
    s.push_str("/F2 10 Tf\n");
    s.push_str("370 125 Td\n");
    s.push_str("(Dr. Ir. Fransiskus Xaverius, M.Kom.) Tj\n");
    s.push_str("ET\n");

    s.push_str("0.4 0.4 0.4 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 9 Tf\n");
    s.push_str("370 110 Td\n");
    s.push_str("(NIDN: 0612087501) Tj\n");
    s.push_str("ET\n");

    // Footer Dokumen
    s.push_str("0.5 0.5 0.5 rg\n");
    s.push_str("BT\n");
    s.push_str("/F1 8 Tf\n");
    s.push_str("50 40 Td\n");
    s.push_str(
        "(Dokumen ini sah dan diterbitkan secara resmi melalui Sistem Informasi PMB UPT. Verifikasi keaslian via pmb.upit.ac.id/verifikasi) Tj\n",
    );
    s.push_str("ET\n");

    build_pdf_file(&s)
}

fn build_pdf_file(stream_content: &str) -> Vec<u8> {
    let mut pdf = Vec::with_capacity(32 * 1024);
    let mut xref_offsets: Vec<usize> = Vec::with_capacity(10);
    xref_offsets.push(0); // Objek 0 kosong

    pdf.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    // Obj 1: Catalog
    xref_offsets.push(pdf.len());
    pdf.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // Obj 2: Pages
    xref_offsets.push(pdf.len());
    pdf.extend_from_slice(
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 595.28 841.89] >>\nendobj\n",
    );

    // Obj 3: Page
    xref_offsets.push(pdf.len());
    pdf.extend_from_slice(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    );

    // Obj 4: Font F1 (Helvetica)
    xref_offsets.push(pdf.len());
    pdf.extend_from_slice(
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    );

    // Obj 5: Font F2 (Helvetica-Bold)
    xref_offsets.push(pdf.len());
    pdf.extend_from_slice(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    );

    // Obj 6: Stream Konten Halaman
    xref_offsets.push(pdf.len());
    let stream_bytes = stream_content.as_bytes();
    let stream_len = stream_bytes.len();
    pdf.extend_from_slice(format!("6 0 obj\n<< /Length {} >>\nstream\n", stream_len).as_bytes());
    pdf.extend_from_slice(stream_bytes);
    pdf.extend_from_slice(b"\nendstream\nendobj\n");

    // XRef Table
    let xref_start = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n", xref_offsets.len()).as_bytes());
    pdf.extend_from_slice(b"0000000000 65535 f \n");
    for &offset in &xref_offsets[1..] {
        pdf.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
    }

    // Trailer
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            xref_offsets.len(),
            xref_start
        )
        .as_bytes(),
    );

    pdf
}
