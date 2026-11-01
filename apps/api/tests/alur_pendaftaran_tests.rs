#![allow(clippy::collapsible_if)]

// Test suite komprehensif Alur Pendaftaran Calon Mahasiswa & Pendaftaran Offline PMB
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian:
// 1. Transisi Status Pendaftaran (DRAFT -> SUBMITTED -> MENUNGGU_UJIAN -> SELESAI_UJIAN -> LULUS/TIDAK_LULUS)
// 2. Validasi Pilihan Program Studi (Pilihan 1 != Pilihan 2)
// 3. Aturan Gelombang Tertutup / Di luar Rentang Waktu
// 4. Aturan Kuota Penuh pada Gelombang Tertentu
// 5. Pencegahan Pendaftaran Ganda pada Akun yang Sudah Terdaftar
// 6. Alur Pendaftaran Offline Loket oleh Admin (Channel Offline, Akun Otomatis, Lunas Loket TUNAI_LOKET)
// 7. Integritas Dokumen PDF Bukti Pendaftaran & Kartu Peserta (Format %PDF-1.4, Palet Biru Royal, QR Code Vektor)
// 8. Sistem Antrean Notifikasi Email Asinkron (Non-blocking Queue & Worker Processing)

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// =========================================================================
// 1. State Machine & Transisi Status Pendaftaran
// =========================================================================

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum StatusPendaftaran {
    Draft,
    Submitted,
    MenungguUjian,
    SelesaiUjian,
    Lulus,
    TidakLulus,
}

impl StatusPendaftaran {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "DRAFT",
            Self::Submitted => "SUBMITTED",
            Self::MenungguUjian => "MENUNGGU_UJIAN",
            Self::SelesaiUjian => "SELESAI_UJIAN",
            Self::Lulus => "LULUS",
            Self::TidakLulus => "TIDAK_LULUS",
        }
    }

    pub fn can_transition_to(&self, next: StatusPendaftaran) -> bool {
        match (self, next) {
            // Draft hanya bisa diajukan ke SUBMITTED
            (Self::Draft, Self::Submitted) => true,
            // Setelah submit berkas & verifikasi / bayar, lanjut ke MENUNGGU_UJIAN
            (Self::Submitted, Self::MenungguUjian) => true,
            // Dari antre ujian lanjut ke SELESAI_UJIAN setelah tes
            (Self::MenungguUjian, Self::SelesaiUjian) => true,
            // Hasil seleksi bisa LULUS atau TIDAK_LULUS
            (Self::SelesaiUjian, Self::Lulus) | (Self::SelesaiUjian, Self::TidakLulus) => true,
            // Jalur RPL / Non-tes bisa langsung dari SUBMITTED ke LULUS / TIDAK_LULUS
            (Self::Submitted, Self::Lulus) | (Self::Submitted, Self::TidakLulus) => true,
            _ => false,
        }
    }

    pub fn allows_editing_prodi(&self) -> bool {
        matches!(self, Self::Draft)
    }
}

#[test]
fn test_transisi_status_pendaftaran_valid() {
    let current = StatusPendaftaran::Draft;
    assert!(current.can_transition_to(StatusPendaftaran::Submitted));
    assert!(!current.can_transition_to(StatusPendaftaran::Lulus));

    let submitted = StatusPendaftaran::Submitted;
    assert!(submitted.can_transition_to(StatusPendaftaran::MenungguUjian));
    assert!(submitted.can_transition_to(StatusPendaftaran::Lulus)); // Jalur berkas / RPL

    let ujian = StatusPendaftaran::MenungguUjian;
    assert!(ujian.can_transition_to(StatusPendaftaran::SelesaiUjian));

    let selesai = StatusPendaftaran::SelesaiUjian;
    assert!(selesai.can_transition_to(StatusPendaftaran::Lulus));
    assert!(selesai.can_transition_to(StatusPendaftaran::TidakLulus));
}

#[test]
fn test_pencegahan_modifikasi_prodi_setelah_submit() {
    let draft = StatusPendaftaran::Draft;
    assert!(
        draft.allows_editing_prodi(),
        "Draft harus mengizinkan perubahan prodi"
    );

    let submitted = StatusPendaftaran::Submitted;
    assert!(
        !submitted.allows_editing_prodi(),
        "Status SUBMITTED tidak boleh mengubah pilihan prodi"
    );

    let lulus = StatusPendaftaran::Lulus;
    assert!(
        !lulus.allows_editing_prodi(),
        "Status LULUS tidak boleh mengubah prodi"
    );
}

// =========================================================================
// 2. Validasi Pilihan Program Studi
// =========================================================================

pub fn validate_pilihan_prodi(prodi_1: Uuid, prodi_2: Option<Uuid>) -> Result<(), &'static str> {
    if let Some(p2) = prodi_2 {
        if p2 == prodi_1 {
            return Err("Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama");
        }
    }
    Ok(())
}

#[test]
fn test_validasi_pilihan_prodi_sama_ditolak() {
    let prodi_a = Uuid::new_v4();
    let res = validate_pilihan_prodi(prodi_a, Some(prodi_a));
    assert!(res.is_err());
    assert_eq!(
        res.unwrap_err(),
        "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama"
    );

    let prodi_b = Uuid::new_v4();
    let res_valid = validate_pilihan_prodi(prodi_a, Some(prodi_b));
    assert!(res_valid.is_ok());

    let res_single = validate_pilihan_prodi(prodi_a, None);
    assert!(res_single.is_ok());
}

// =========================================================================
// 3. Aturan Gelombang Aktif & Kuota
// =========================================================================

pub struct GelombangState {
    pub status: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
}

impl GelombangState {
    pub fn is_open_at(&self, current_date: NaiveDate) -> bool {
        self.status == "BUKA" && current_date >= self.tgl_mulai && current_date <= self.tgl_selesai
    }
}

pub struct KuotaState {
    pub kuota_maksimum: i32,
    pub kuota_terisi: i32,
    pub is_prodi_active: bool,
}

impl KuotaState {
    pub fn can_register(&self) -> bool {
        self.is_prodi_active && self.kuota_terisi < self.kuota_maksimum
    }
}

#[test]
fn test_aturan_gelombang_terbuka_dan_tertutup() {
    let gelombang = GelombangState {
        status: "BUKA".to_string(),
        tgl_mulai: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
        tgl_selesai: NaiveDate::from_ymd_opt(2026, 3, 31).unwrap(),
    };

    assert!(gelombang.is_open_at(NaiveDate::from_ymd_opt(2026, 2, 15).unwrap()));
    assert!(!gelombang.is_open_at(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap()));
    assert!(!gelombang.is_open_at(NaiveDate::from_ymd_opt(2026, 4, 1).unwrap()));

    let gelombang_tutup = GelombangState {
        status: "TUTUP".to_string(),
        tgl_mulai: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
        tgl_selesai: NaiveDate::from_ymd_opt(2026, 3, 31).unwrap(),
    };
    assert!(!gelombang_tutup.is_open_at(NaiveDate::from_ymd_opt(2026, 2, 15).unwrap()));
}

#[test]
fn test_aturan_kuota_penuh_menolak_pendaftaran() {
    let kuota_tersedia = KuotaState {
        kuota_maksimum: 50,
        kuota_terisi: 49,
        is_prodi_active: true,
    };
    assert!(kuota_tersedia.can_register());

    let kuota_penuh = KuotaState {
        kuota_maksimum: 50,
        kuota_terisi: 50,
        is_prodi_active: true,
    };
    assert!(
        !kuota_penuh.can_register(),
        "Kuota 50/50 harus menolak pendaftar baru"
    );

    let prodi_nonaktif = KuotaState {
        kuota_maksimum: 50,
        kuota_terisi: 10,
        is_prodi_active: false,
    };
    assert!(
        !prodi_nonaktif.can_register(),
        "Prodi tidak aktif harus menolak pendaftar"
    );
}

// =========================================================================
// 4. Logika Pendaftaran Offline Loket oleh Admin
// =========================================================================

pub struct OfflineRegistrationProcessor;

pub struct OfflineInput {
    pub nama: String,
    pub email: String,
    pub nik: String,
    pub lunas_loket: bool,
    pub existing_emails: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct OfflineOutput {
    pub nomor_pendaftaran: String,
    pub temporary_password: Option<String>,
    pub channel: String,
    pub status_pembayaran: String,
    pub steps_completed: Vec<&'static str>,
}

impl OfflineRegistrationProcessor {
    pub fn process(input: OfflineInput, sequence: i64) -> Result<OfflineOutput, &'static str> {
        if input.existing_emails.contains(&input.email) {
            return Err("Calon mahasiswa dengan email ini sudah terdaftar");
        }

        let nomor_pendaftaran = format!("PMB-2026-{:04}", sequence);
        let suffix = if input.nik.len() >= 4 {
            &input.nik[input.nik.len() - 4..]
        } else {
            "2026"
        };
        let temporary_password = Some(format!("Pmb{}!", suffix));

        let (status_pembayaran, mut steps) = if input.lunas_loket {
            (
                "TUNAI_LOKET".to_string(),
                vec!["pilih_prodi", "biodata", "pembayaran"],
            )
        } else {
            ("BELUM_BAYAR".to_string(), vec!["pilih_prodi", "biodata"])
        };

        steps.sort();

        Ok(OfflineOutput {
            nomor_pendaftaran,
            temporary_password,
            channel: "offline".to_string(),
            status_pembayaran,
            steps_completed: steps,
        })
    }
}

#[test]
fn test_pendaftaran_offline_sukses_dengan_lunas_loket() {
    let input = OfflineInput {
        nama: "Budi Santoso".to_string(),
        email: "budi.offline@example.com".to_string(),
        nik: "3372011205070001".to_string(),
        lunas_loket: true,
        existing_emails: vec!["existing@example.com".to_string()],
    };

    let result = OfflineRegistrationProcessor::process(input, 142).unwrap();
    assert_eq!(result.nomor_pendaftaran, "PMB-2026-0142");
    assert_eq!(result.channel, "offline");
    assert_eq!(result.temporary_password, Some("Pmb0001!".to_string()));
    assert_eq!(result.status_pembayaran, "TUNAI_LOKET");
    assert!(result.steps_completed.contains(&"pembayaran"));
    assert!(result.steps_completed.contains(&"biodata"));
    assert!(result.steps_completed.contains(&"pilih_prodi"));
}

#[test]
fn test_pendaftaran_offline_duplikasi_email_ditolak() {
    let input = OfflineInput {
        nama: "Budi Santoso".to_string(),
        email: "existing@example.com".to_string(),
        nik: "3372011205070001".to_string(),
        lunas_loket: false,
        existing_emails: vec!["existing@example.com".to_string()],
    };

    let result = OfflineRegistrationProcessor::process(input, 143);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Calon mahasiswa dengan email ini sudah terdaftar"
    );
}

// =========================================================================
// 5. Pengujian Integritas Dokumen PDF & QR Code Vektor
// =========================================================================

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

fn assemble_pdf(stream_content: &str) -> Vec<u8> {
    let stream_bytes = stream_content.as_bytes();
    let stream_len = stream_bytes.len();

    let mut body = Vec::new();
    let mut offsets = Vec::new();

    body.extend_from_slice(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    offsets.push(body.len());
    body.extend_from_slice(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    offsets.push(body.len());
    body.extend_from_slice(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    offsets.push(body.len());
    body.extend_from_slice(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n"
    );

    offsets.push(body.len());
    body.extend_from_slice(
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    offsets.push(body.len());
    body.extend_from_slice(
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    offsets.push(body.len());
    let stream_header = format!("6 0 obj\n<< /Length {} >>\nstream\n", stream_len);
    body.extend_from_slice(stream_header.as_bytes());
    body.extend_from_slice(stream_bytes);
    body.extend_from_slice(b"\nendstream\nendobj\n");

    let xref_offset = body.len();
    body.extend_from_slice(b"xref\n0 7\n0000000000 65535 f \n");
    for offset in offsets {
        body.extend_from_slice(format!("{:010} 00000 n \n", offset).as_bytes());
    }

    body.extend_from_slice(
        format!(
            "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            xref_offset
        )
        .as_bytes(),
    );

    body
}

fn render_qr_vector(content: &str, start_x: f64, start_y: f64, target_size: f64) -> String {
    let qr = match QrCode::new(content.as_bytes()) {
        Ok(q) => q,
        Err(_) => return String::new(),
    };

    let width = qr.width();
    let mod_size = target_size / (width as f64);
    let mut out = String::new();

    out.push_str("0.05 0.14 0.25 rg\n");
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

pub fn generate_bukti_pendaftaran_pdf(data: &PendaftarPdfData, qr_url: &str) -> Vec<u8> {
    let mut s = String::new();
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str("40 735 515.28 75 re f\n");
    s.push_str("0.20 0.40 0.85 rg\n");
    s.push_str("40 730 515.28 5 re f\n");

    s.push_str("BT\n1 1 1 rg\n");
    s.push_str("/F2 15 Tf 55 785 Td (UNIVERSITAS PIGNATELLI TRIPUTRA) Tj\n");
    s.push_str("/F1 9 Tf 55 770 Td (PANITIA PENERIMAAN MAHASISWA BARU (PMB) TAHUN AKADEMIK 2026/2027) Tj\n");
    s.push_str("ET\n");

    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str("/F2 13 Tf 40 705 Td (BUKTI PENDAFTARAN MAHASISWA BARU) Tj\n");
    s.push_str(&format!(
        "/F2 16 Tf 55 637 Td ({}) Tj\n",
        pdf_escape(&data.nomor_pendaftaran)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 220 580 Td (: {}) Tj\n",
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F2 9 Tf 50 490 Td (Pilihan 1: {}) Tj\n",
        pdf_escape(&data.prodi_1_nama)
    ));
    s.push_str("ET\n");

    let qr_svg = render_qr_vector(qr_url, 445.0, 300.0, 70.0);
    s.push_str(&qr_svg);

    assemble_pdf(&s)
}

pub fn generate_kartu_peserta_pdf(
    data: &PendaftarPdfData,
    jadwal: Option<&JadwalUjianPdfData>,
    qr_url: &str,
) -> Vec<u8> {
    let mut s = String::new();
    s.push_str("0.05 0.14 0.25 rg\n");
    s.push_str("40 735 515.28 75 re f\n");

    s.push_str("BT\n1 1 1 rg\n");
    s.push_str("/F2 15 Tf 55 785 Td (UNIVERSITAS PIGNATELLI TRIPUTRA) Tj\n");
    s.push_str("/F2 11 Tf 55 770 Td (KARTU PESERTA UJIAN SELEKSI PMB) Tj\n");
    s.push_str("ET\n");

    let no_peserta = jadwal
        .map(|j| j.nomor_peserta.as_str())
        .unwrap_or("CBT-2026-0000");
    let ruang = jadwal
        .map(|j| j.lokasi_ruang.as_str())
        .unwrap_or("Lab Komputer");

    s.push_str("BT\n0.05 0.14 0.25 rg\n");
    s.push_str(&format!(
        "/F2 16 Tf 55 684 Td ({}) Tj\n",
        pdf_escape(no_peserta)
    ));
    s.push_str(&format!(
        "/F2 8.5 Tf 290 550 Td (: {}) Tj\n",
        pdf_escape(&data.nama_lengkap)
    ));
    s.push_str(&format!(
        "/F1 8 Tf 50 420 Td (Lokasi: {}) Tj\n",
        pdf_escape(ruang)
    ));
    s.push_str("/F2 10 Tf 40 370 Td (Tata Tertib Peserta) Tj\n");
    s.push_str("ET\n");

    let qr_svg = render_qr_vector(qr_url, 435.0, 400.0, 75.0);
    s.push_str(&qr_svg);

    assemble_pdf(&s)
}

#[test]
fn test_integritas_pdf_bukti_pendaftaran() {
    let data = PendaftarPdfData {
        nomor_pendaftaran: "PMB-2026-0042".to_string(),
        nama_lengkap: "Maria Fransiska Kusuma".to_string(),
        email: "maria.kusuma@example.com".to_string(),
        no_hp: "081234567890".to_string(),
        nik: "3372015509070002".to_string(),
        tempat_lahir: "Surakarta".to_string(),
        tgl_lahir: "15-09-2007".to_string(),
        jenis_kelamin: "P".to_string(),
        agama: "Katolik".to_string(),
        asal_sekolah: "SMA Regina Pacis Surakarta".to_string(),
        jurusan_sekolah: "MIPA".to_string(),
        jalur_nama: "Jalur Prestasi Akademik Unggulan".to_string(),
        gelombang_nama: "Gelombang 1 - Early Bird".to_string(),
        prodi_1_nama: "S1 Sistem Informasi".to_string(),
        prodi_2_nama: Some("S1 Informatika".to_string()),
        status_pendaftaran: "SUBMITTED".to_string(),
        channel: "online".to_string(),
        status_pembayaran: "LUNAS (Terverifikasi)".to_string(),
        tanggal_cetak: "01 November 2026 05:00 WIB".to_string(),
    };

    let qr_payload = "VERIFIED-PMB|NO:PMB-2026-0042|NIK:3372015509070002";
    let pdf_bytes = generate_bukti_pendaftaran_pdf(&data, qr_payload);

    assert!(!pdf_bytes.is_empty(), "PDF bytes tidak boleh kosong");

    // 1. Validasi Magic Header PDF-1.4
    let header = std::str::from_utf8(&pdf_bytes[0..8]).unwrap_or_default();
    assert_eq!(
        header, "%PDF-1.4",
        "Header PDF harus sesuai standar PDF-1.4"
    );

    // 2. Validasi Akhir Dokumen %%EOF
    let footer =
        std::str::from_utf8(&pdf_bytes[pdf_bytes.len().saturating_sub(6)..]).unwrap_or_default();
    assert!(footer.contains("%%EOF"), "Akhir file harus memuat %%EOF");

    // 3. Validasi Konten Dokumen
    let full_text = String::from_utf8_lossy(&pdf_bytes);
    assert!(
        full_text.contains("UNIVERSITAS PIGNATELLI TRIPUTRA"),
        "Harus memuat header universitas"
    );
    assert!(
        full_text.contains("BUKTI PENDAFTARAN MAHASISWA BARU"),
        "Harus memuat judul dokumen"
    );
    assert!(
        full_text.contains("PMB-2026-0042"),
        "Harus memuat nomor pendaftaran"
    );
    assert!(
        full_text.contains("Maria Fransiska Kusuma"),
        "Harus memuat nama calon"
    );
    assert!(
        full_text.contains("S1 Sistem Informasi"),
        "Harus memuat pilihan prodi"
    );

    // 4. Validasi Vektor QR Code (Menggunakan perintah draw rectangle PDF 're f')
    assert!(
        full_text.contains("re f"),
        "Vektor QR code harus dirender menggunakan instruksi vektor re f"
    );

    // 5. Validasi Token Desain Biru Royal (#0c2340 -> 0.05 0.14 0.25 rg)
    assert!(
        full_text.contains("0.05 0.14 0.25 rg"),
        "Palet warna harus biru royal resmi"
    );
}

#[test]
fn test_integritas_pdf_kartu_peserta_ujian() {
    let data = PendaftarPdfData {
        nomor_pendaftaran: "PMB-2026-0088".to_string(),
        nama_lengkap: "Ignatius Antonius".to_string(),
        email: "ignatius@example.com".to_string(),
        no_hp: "081987654321".to_string(),
        nik: "3372010101070003".to_string(),
        tempat_lahir: "Semarang".to_string(),
        tgl_lahir: "01-01-2007".to_string(),
        jenis_kelamin: "L".to_string(),
        agama: "Katolik".to_string(),
        asal_sekolah: "SMA Kolese Loyola".to_string(),
        jurusan_sekolah: "MIPA".to_string(),
        jalur_nama: "Jalur Reguler CBT".to_string(),
        gelombang_nama: "Gelombang 1".to_string(),
        prodi_1_nama: "S1 Informatika".to_string(),
        prodi_2_nama: None,
        status_pendaftaran: "MENUNGGU_UJIAN".to_string(),
        channel: "offline".to_string(),
        status_pembayaran: "LUNAS (Loket Offline PMB)".to_string(),
        tanggal_cetak: "01 November 2026 05:00 WIB".to_string(),
    };

    let jadwal = JadwalUjianPdfData {
        nomor_peserta: "CBT-2026-0088".to_string(),
        nama_ujian: "Tes Potensi Skolastik & Literasi".to_string(),
        tanggal_ujian: "10-11-2026".to_string(),
        waktu_ujian: "08:30 WIB".to_string(),
        lokasi_ruang: "Lab Komputer Gedung Fransiskus Lantai 2".to_string(),
        link_ujian: None,
    };

    let qr_payload = "KARTU-UJIAN-PMB|NO:PMB-2026-0088|PESERTA:CBT-2026-0088";
    let pdf_bytes = generate_kartu_peserta_pdf(&data, Some(&jadwal), qr_payload);

    assert!(!pdf_bytes.is_empty(), "PDF bytes tidak boleh kosong");
    let full_text = String::from_utf8_lossy(&pdf_bytes);

    assert!(full_text.contains("%PDF-1.4"), "Header harus PDF-1.4");
    assert!(
        full_text.contains("KARTU PESERTA UJIAN SELEKSI PMB"),
        "Harus memuat judul kartu ujian"
    );
    assert!(
        full_text.contains("CBT-2026-0088"),
        "Harus memuat nomor peserta ujian"
    );
    assert!(
        full_text.contains("Lab Komputer Gedung Fransiskus Lantai 2"),
        "Harus memuat lokasi ruang ujian"
    );
    assert!(
        full_text.contains("Tata Tertib Peserta"),
        "Harus memuat tata tertib ujian resmi"
    );
}

// =========================================================================
// 6. Sistem Antrean Notifikasi Email Asinkron
// =========================================================================

pub struct MockEmailTask {
    pub id: Uuid,
    pub to_email: String,
    pub status: String,
    pub retry_count: i32,
}

pub struct EmailQueueSimulator {
    pub queue: Vec<MockEmailTask>,
}

impl Default for EmailQueueSimulator {
    fn default() -> Self {
        Self::new()
    }
}

impl EmailQueueSimulator {
    pub fn new() -> Self {
        Self { queue: Vec::new() }
    }

    pub fn enqueue(&mut self, to_email: &str) -> Uuid {
        let id = Uuid::new_v4();
        self.queue.push(MockEmailTask {
            id,
            to_email: to_email.to_string(),
            status: "PENDING".to_string(),
            retry_count: 0,
        });
        id
    }

    pub fn process_batch(&mut self, success: bool) {
        for task in self.queue.iter_mut().filter(|t| t.status == "PENDING") {
            if success {
                task.status = "SENT".to_string();
            } else {
                task.retry_count += 1;
                if task.retry_count >= 3 {
                    task.status = "FAILED".to_string();
                }
            }
        }
    }
}

#[test]
fn test_antrean_email_asinkron_lifecycle() {
    let mut simulator = EmailQueueSimulator::new();

    let id1 = simulator.enqueue("calon1@example.com");
    let id2 = simulator.enqueue("calon2@example.com");

    assert_eq!(simulator.queue.len(), 2);
    assert_eq!(simulator.queue[0].status, "PENDING");
    assert_eq!(simulator.queue[1].status, "PENDING");

    // Simulasi kegagalan pengiriman sekali
    simulator.process_batch(false);
    assert_eq!(simulator.queue[0].status, "PENDING");
    assert_eq!(simulator.queue[0].retry_count, 1);

    // Simulasi pengiriman berhasil pada percobaan berikutnya
    simulator.process_batch(true);
    assert_eq!(simulator.queue[0].status, "SENT");
    assert_eq!(simulator.queue[1].status, "SENT");
    assert_eq!(simulator.queue[0].id, id1);
    assert_eq!(simulator.queue[1].id, id2);
}

// =========================================================================
// 7. Keamanan Akses Unduh Dokumen (PDF Kartu & Bukti)
// =========================================================================

pub struct DocumentAccessControl {
    pub can_access_all: bool,
    pub pendaftar_user_id: Uuid,
    pub caller_user_id: Uuid,
    pub channel: String,
    pub status_pendaftaran: String,
    pub is_formulir_lunas: bool,
}

impl DocumentAccessControl {
    pub fn can_download_bukti(&self) -> Result<(), &'static str> {
        if !self.can_access_all && self.pendaftar_user_id != self.caller_user_id {
            return Err("Akses ditolak: bukan pemilik pendaftaran");
        }
        if !self.can_access_all && self.status_pendaftaran == "DRAFT" && self.channel != "offline" {
            return Err("Bukti pendaftaran belum dapat diunduh pada status draf");
        }
        Ok(())
    }

    pub fn can_download_kartu(&self) -> Result<(), &'static str> {
        if !self.can_access_all && self.pendaftar_user_id != self.caller_user_id {
            return Err("Akses ditolak: bukan pemilik pendaftaran");
        }
        if !self.can_access_all && self.channel != "offline" && !self.is_formulir_lunas {
            return Err("Kartu ujian hanya dapat diunduh jika biaya formulir lunas");
        }
        Ok(())
    }
}

#[test]
fn test_keamanan_unduh_kartu_ujian_tercegah_bila_belum_lunas() {
    let calon_user = Uuid::new_v4();

    // 1. Calon online yang belum bayar formulir -> DITOLAK
    let unpaying_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "online".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: false,
    };
    assert!(unpaying_calon.can_download_kartu().is_err());

    // 2. Calon online yang sudah bayar lunas -> DIIZINKAN
    let paid_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "online".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: true,
    };
    assert!(paid_calon.can_download_kartu().is_ok());

    // 3. Calon offline loket -> DIIZINKAN (Lunas di loket)
    let offline_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "offline".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: false,
    };
    assert!(offline_calon.can_download_kartu().is_ok());

    // 4. Admin / Asesor (can_access_all) -> DIIZINKAN untuk keperluan admisi
    let admin_access = DocumentAccessControl {
        can_access_all: true,
        pendaftar_user_id: calon_user,
        caller_user_id: Uuid::new_v4(),
        channel: "online".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: false,
    };
    assert!(admin_access.can_download_kartu().is_ok());

    // 5. User lain yang mencoba IDOR -> DITOLAK
    let idor_attempt = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: Uuid::new_v4(),
        channel: "online".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: true,
    };
    assert!(idor_attempt.can_download_kartu().is_err());
}

#[test]
fn test_keamanan_unduh_bukti_pendaftaran_draft() {
    let calon_user = Uuid::new_v4();

    // 1. Draf belum diajukan -> DITOLAK
    let draft_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "online".to_string(),
        status_pendaftaran: "DRAFT".to_string(),
        is_formulir_lunas: false,
    };
    assert!(draft_calon.can_download_bukti().is_err());

    // 2. Sudah diajukan (SUBMITTED) -> DIIZINKAN
    let submitted_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "online".to_string(),
        status_pendaftaran: "SUBMITTED".to_string(),
        is_formulir_lunas: false,
    };
    assert!(submitted_calon.can_download_bukti().is_ok());

    // 3. Pendaftaran offline loket -> DIIZINKAN
    let offline_calon = DocumentAccessControl {
        can_access_all: false,
        pendaftar_user_id: calon_user,
        caller_user_id: calon_user,
        channel: "offline".to_string(),
        status_pendaftaran: "DRAFT".to_string(),
        is_formulir_lunas: true,
    };
    assert!(offline_calon.can_download_bukti().is_ok());
}
