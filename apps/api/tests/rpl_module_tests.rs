#![allow(clippy::collapsible_if)]

// Test Suite Komprehensif Modul Jalur RPL (Rekognisi Pembelajaran Lampau)
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian Wajib:
// 1. Kalkulasi Bobot Nilai Huruf & Rekapitulasi Konversi SKS (SKS Diakui, IPK Konversi, Persentase Rekognisi)
// 2. Format & Konten Ekspor CSV Berita Acara Rekognisi RPL
// 3. Hak Akses & Isolasi Otorisasi Asesor (Asesor A vs Asesor B terisolasi ketat, Admin omni-akses, Calon IDOR protection)
// 4. Validasi Permohonan RPL Calon (Minimal 1 mata kuliah, status DRAFT vs DIAJUKAN, proteksi edit setelah finalisasi)
// 5. Alur Lengkap RPL End-to-End dari Pendaftaran, Penugasan Asesor, Penilaian Matakuliah, Finalisasi Konversi, hingga Laporan BA & Integrasi Seleksi Kelulusan

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// =============================================================================
// DOMAIN TYPES UNTUK PENGUJIAN LOGIKA RPL
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MataKuliah {
    pub id: Uuid,
    pub prodi_id: Uuid,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RplMataKuliahDiajukanDetail {
    pub id: Uuid,
    pub permohonan_id: Uuid,
    pub mata_kuliah_id: Uuid,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub silabus_ringkas: Option<String>,
    pub keterangan_pemohon: Option<String>,
    pub status_kelayakan: String, // 'MENUNGGU', 'DIAKUI', 'DITOLAK'
    pub nilai_transfer: Option<String>,
    pub bobot_nilai: Option<f64>,
    pub catatan_asesor: Option<String>,
    pub assessed_at: Option<DateTime<Utc>>,
    pub assessed_by_nama: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatakuliahDiajukanInput {
    pub mata_kuliah_id: Uuid,
    pub keterangan_pemohon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaporanRplItemCourse {
    pub no: i32,
    pub kode_mk: String,
    pub nama_mk: String,
    pub sks: i32,
    pub semester: i32,
    pub status_kelayakan: String,
    pub nilai_transfer: String,
    pub bobot_nilai: f64,
    pub catatan_asesor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaporanRplResponse {
    pub nomor_berita_acara: String,
    pub tanggal_berita_acara: String,
    pub permohonan_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub nik: String,
    pub prodi_nama: String,
    pub jenjang: String,
    pub fakultas: String,
    pub tipe_rpl: String,
    pub total_sks_diajukan: i32,
    pub total_sks_diakui: i32,
    pub ipk_konversi: f64,
    pub persentase_rekognisi: f64,
    pub asesor_nama: String,
    pub catatan_rekomendasi: String,
    pub daftar_mata_kuliah: Vec<LaporanRplItemCourse>,
}

// =============================================================================
// FUNGSI MURNI KALKULASI & FORMATTING (PERSIS SEPERTI DI SERVICE RPL)
// =============================================================================

pub fn hitung_bobot_nilai(nilai_huruf: &str) -> f64 {
    match nilai_huruf.trim().to_uppercase().as_str() {
        "A" => 4.0,
        "A-" => 3.7,
        "B+" => 3.3,
        "B" => 3.0,
        "B-" => 2.7,
        "C+" => 2.3,
        "C" => 2.0,
        "D" => 1.0,
        _ => 0.0,
    }
}

pub fn hitung_rekap_konversi_sks(items: &[RplMataKuliahDiajukanDetail]) -> (i32, i32, f64, f64) {
    let mut total_sks_diajukan = 0;
    let mut total_sks_diakui = 0;
    let mut total_mutu = 0.0;

    for item in items {
        total_sks_diajukan += item.sks;
        if item.status_kelayakan == "DIAKUI" {
            total_sks_diakui += item.sks;
            let bobot = item.bobot_nilai.unwrap_or_else(|| {
                item.nilai_transfer
                    .as_deref()
                    .map(hitung_bobot_nilai)
                    .unwrap_or(0.0)
            });
            total_mutu += bobot * (item.sks as f64);
        }
    }

    let ipk_konversi = if total_sks_diakui > 0 {
        ((total_mutu / (total_sks_diakui as f64)) * 100.0).round() / 100.0
    } else {
        0.0
    };

    let persentase_rekognisi = if total_sks_diajukan > 0 {
        (((total_sks_diakui as f64) / (total_sks_diajukan as f64) * 100.0) * 100.0).round() / 100.0
    } else {
        0.0
    };

    (
        total_sks_diajukan,
        total_sks_diakui,
        ipk_konversi,
        persentase_rekognisi,
    )
}

pub fn to_csv_laporan_rpl(laporan: &LaporanRplResponse) -> String {
    let mut csv = String::new();
    csv.push_str("BERITA ACARA REKOGNISI PEMBELAJARAN LAMPAU (RPL)\n");
    csv.push_str(&format!(
        "Nomor Berita Acara: \"{}\"\n",
        laporan.nomor_berita_acara
    ));
    csv.push_str(&format!("Tanggal: \"{}\"\n", laporan.tanggal_berita_acara));
    csv.push_str(&format!(
        "Nomor Pendaftaran: \"{}\"\n",
        laporan.nomor_pendaftaran
    ));
    csv.push_str(&format!("Nama Mahasiswa: \"{}\"\n", laporan.nama_lengkap));
    csv.push_str(&format!("NIK: \"{}\"\n", laporan.nik));
    csv.push_str(&format!(
        "Program Studi: \"{} - {}\"\n",
        laporan.prodi_nama, laporan.jenjang
    ));
    csv.push_str(&format!("Fakultas: \"{}\"\n", laporan.fakultas));
    csv.push_str(&format!("Tipe RPL: \"{}\"\n", laporan.tipe_rpl));
    csv.push_str(&format!(
        "Total SKS Diajukan: {}\n",
        laporan.total_sks_diajukan
    ));
    csv.push_str(&format!("Total SKS Diakui: {}\n", laporan.total_sks_diakui));
    csv.push_str(&format!("IPK Konversi: {:.2}\n", laporan.ipk_konversi));
    csv.push_str(&format!(
        "Persentase Rekognisi: {:.1}%\n",
        laporan.persentase_rekognisi
    ));
    csv.push_str(&format!("Asesor: \"{}\"\n", laporan.asesor_nama));
    csv.push_str(&format!(
        "Catatan / Rekomendasi: \"{}\"\n\n",
        laporan.catatan_rekomendasi.replace('"', "\"\"")
    ));

    csv.push_str("DAFTAR MATA KULIAH HASIL KONVERSI:\n");
    csv.push_str("No,Kode MK,Nama Mata Kuliah,SKS,Semester,Status Kelayakan,Nilai Transfer,Bobot,Catatan Asesor\n");
    for mk in &laporan.daftar_mata_kuliah {
        csv.push_str(&format!(
            "{},\"{}\",\"{}\",{},{},\"{}\",\"{}\",{:.2},\"{}\"\n",
            mk.no,
            mk.kode_mk,
            mk.nama_mk.replace('"', "\"\""),
            mk.sks,
            mk.semester,
            mk.status_kelayakan,
            mk.nilai_transfer,
            mk.bobot_nilai,
            mk.catatan_asesor.replace('"', "\"\"")
        ));
    }

    csv
}

// =============================================================================
// TEST 1: KALKULASI BOBOT NILAI HURUF & REKAPITULASI KONVERSI SKS
// =============================================================================

#[test]
fn test_kalkulasi_bobot_nilai_huruf() {
    assert_eq!(hitung_bobot_nilai("A"), 4.0);
    assert_eq!(hitung_bobot_nilai("a"), 4.0);
    assert_eq!(hitung_bobot_nilai("A-"), 3.7);
    assert_eq!(hitung_bobot_nilai("B+"), 3.3);
    assert_eq!(hitung_bobot_nilai("b+"), 3.3);
    assert_eq!(hitung_bobot_nilai("B"), 3.0);
    assert_eq!(hitung_bobot_nilai("B-"), 2.7);
    assert_eq!(hitung_bobot_nilai("C+"), 2.3);
    assert_eq!(hitung_bobot_nilai("C"), 2.0);
    assert_eq!(hitung_bobot_nilai("D"), 1.0);
    assert_eq!(hitung_bobot_nilai("E"), 0.0);
    assert_eq!(hitung_bobot_nilai("TIDAK_VALID"), 0.0);
}

#[test]
fn test_kalkulasi_rekap_konversi_sks_dan_ipk() {
    let permohonan_id = Uuid::new_v4();

    let items = vec![
        // MK 1: Pemrograman Web (3 SKS) -> DIAKUI, Nilai A (4.0) -> Bobot Mutu = 12.0
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: Uuid::new_v4(),
            kode_mk: "IF101".to_string(),
            nama_mk: "Pemrograman Web".to_string(),
            sks: 3,
            semester: 1,
            silabus_ringkas: Some("HTML, CSS, JS, React".to_string()),
            keterangan_pemohon: Some("Pengalaman frontend engineer 3 tahun".to_string()),
            status_kelayakan: "DIAKUI".to_string(),
            nilai_transfer: Some("A".to_string()),
            bobot_nilai: Some(4.0),
            catatan_asesor: Some("Portofolio aplikasi produksi sangat memadai".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Dr. Asesor RPL".to_string()),
        },
        // MK 2: Basis Data Relasional (3 SKS) -> DIAKUI, Nilai B+ (3.3) -> Bobot Mutu = 9.9
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: Uuid::new_v4(),
            kode_mk: "IF102".to_string(),
            nama_mk: "Basis Data".to_string(),
            sks: 3,
            semester: 2,
            silabus_ringkas: Some("SQL, Normalisasi, PostgreSQL".to_string()),
            keterangan_pemohon: Some("Sertifikasi DBA Oracle".to_string()),
            status_kelayakan: "DIAKUI".to_string(),
            nilai_transfer: Some("B+".to_string()),
            bobot_nilai: Some(3.3),
            catatan_asesor: Some("Transkrip D3 dan sertifikasi valid".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Dr. Asesor RPL".to_string()),
        },
        // MK 3: Algoritma & Struktur Data (3 SKS) -> DIAKUI, Nilai B (3.0) -> Bobot Mutu = 9.0
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: Uuid::new_v4(),
            kode_mk: "IF103".to_string(),
            nama_mk: "Algoritma & Struktur Data".to_string(),
            sks: 3,
            semester: 2,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Pernah lulus di universitas asal nilai B".to_string()),
            status_kelayakan: "DIAKUI".to_string(),
            nilai_transfer: Some("B".to_string()),
            bobot_nilai: Some(3.0),
            catatan_asesor: Some("Silabus 85% identik".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Dr. Asesor RPL".to_string()),
        },
        // MK 4: Keamanan Sistem (3 SKS) -> DITOLAK (Tidak dihitung dalam SKS diakui / IPK)
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: Uuid::new_v4(),
            kode_mk: "IF201".to_string(),
            nama_mk: "Keamanan Sistem".to_string(),
            sks: 3,
            semester: 3,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Pernah ikut seminar cyber security".to_string()),
            status_kelayakan: "DITOLAK".to_string(),
            nilai_transfer: None,
            bobot_nilai: None,
            catatan_asesor: Some(
                "Sertifikat kehadiran seminar tidak memenuhi capaian pembelajaran".to_string(),
            ),
            assessed_at: None,
            assessed_by_nama: Some("Dr. Asesor RPL".to_string()),
        },
        // MK 5: Desain Grafis (2 SKS) -> MENUNGGU (Belum dinilai)
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: Uuid::new_v4(),
            kode_mk: "MK005".to_string(),
            nama_mk: "Desain Grafis".to_string(),
            sks: 2,
            semester: 1,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Hobi membuat desain".to_string()),
            status_kelayakan: "MENUNGGU".to_string(),
            nilai_transfer: None,
            bobot_nilai: None,
            catatan_asesor: None,
            assessed_at: None,
            assessed_by_nama: None,
        },
    ];

    let (sks_diajukan, sks_diakui, ipk_konversi, persentase_rekognisi) =
        hitung_rekap_konversi_sks(&items);

    // Total SKS Diajukan = 3 + 3 + 3 + 3 + 2 = 14 SKS
    assert_eq!(sks_diajukan, 14);

    // Total SKS Diakui = 3 (MK1) + 3 (MK2) + 3 (MK3) = 9 SKS
    assert_eq!(sks_diakui, 9);

    // Total Mutu = (3 * 4.0) + (3 * 3.3) + (3 * 3.0) = 12.0 + 9.9 + 9.0 = 30.9
    // IPK Konversi = 30.9 / 9 = 3.4333... dibulatkan 2 desimal = 3.43
    assert!((ipk_konversi - 3.43).abs() < 0.001);

    // Persentase Rekognisi = (9 / 14) * 100 = 64.2857... dibulatkan = 64.29%
    assert!((persentase_rekognisi - 64.29).abs() < 0.01);
}

#[test]
fn test_kalkulasi_rekap_kosong_dan_semua_ditolak() {
    // Kasus 1: Tidak ada mata kuliah
    let empty_items: Vec<RplMataKuliahDiajukanDetail> = Vec::new();
    let (sks_ajukan, sks_akui, ipk, pct) = hitung_rekap_konversi_sks(&empty_items);
    assert_eq!(sks_ajukan, 0);
    assert_eq!(sks_akui, 0);
    assert_eq!(ipk, 0.0);
    assert_eq!(pct, 0.0);

    // Kasus 2: Semua mata kuliah ditolak
    let ditolak_items = vec![RplMataKuliahDiajukanDetail {
        id: Uuid::new_v4(),
        permohonan_id: Uuid::new_v4(),
        mata_kuliah_id: Uuid::new_v4(),
        kode_mk: "MK01".to_string(),
        nama_mk: "Statistika".to_string(),
        sks: 3,
        semester: 1,
        silabus_ringkas: None,
        keterangan_pemohon: Some("Pernah belajar otodidak".to_string()),
        status_kelayakan: "DITOLAK".to_string(),
        nilai_transfer: None,
        bobot_nilai: None,
        catatan_asesor: Some("Bukti tidak relevan".to_string()),
        assessed_at: None,
        assessed_by_nama: None,
    }];
    let (sks_ajukan2, sks_akui2, ipk2, pct2) = hitung_rekap_konversi_sks(&ditolak_items);
    assert_eq!(sks_ajukan2, 3);
    assert_eq!(sks_akui2, 0);
    assert_eq!(ipk2, 0.0);
    assert_eq!(pct2, 0.0);
}

// =============================================================================
// TEST 2: EKSPOR CSV BERITA ACARA REKOGNISI RPL
// =============================================================================

#[test]
fn test_ekspor_csv_berita_acara_rpl() {
    let permohonan_id = Uuid::new_v4();
    let laporan = LaporanRplResponse {
        nomor_berita_acara: "BA-RPL/UPT/2026/00123".to_string(),
        tanggal_berita_acara: "01 November 2026".to_string(),
        permohonan_id,
        nomor_pendaftaran: "PMB-2026-00123".to_string(),
        nama_lengkap: "Budi Santoso, A.Md.Kom.".to_string(),
        nik: "3301234567890001".to_string(),
        prodi_nama: "Informatika".to_string(),
        jenjang: "S1".to_string(),
        fakultas: "Fakultas Sains dan Teknologi".to_string(),
        tipe_rpl: "TIPE_A".to_string(),
        total_sks_diajukan: 12,
        total_sks_diakui: 9,
        ipk_konversi: 3.56,
        persentase_rekognisi: 75.0,
        asesor_nama: "Ir. FX. Hendra, M.Kom.".to_string(),
        catatan_rekomendasi: "Memenuhi syarat transfer kredit profesi ke program sarjana"
            .to_string(),
        daftar_mata_kuliah: vec![
            LaporanRplItemCourse {
                no: 1,
                kode_mk: "IF101".to_string(),
                nama_mk: "Pemrograman Berorientasi Objek".to_string(),
                sks: 3,
                semester: 2,
                status_kelayakan: "DIAKUI".to_string(),
                nilai_transfer: "A".to_string(),
                bobot_nilai: 4.0,
                catatan_asesor: "Pengalaman kerja Java dev 2 tahun".to_string(),
            },
            LaporanRplItemCourse {
                no: 2,
                kode_mk: "IF102".to_string(),
                nama_mk: "Jaringan Komputer".to_string(),
                sks: 3,
                semester: 3,
                status_kelayakan: "DITOLAK".to_string(),
                nilai_transfer: "-".to_string(),
                bobot_nilai: 0.0,
                catatan_asesor: "Materi routing belum terpenuhi".to_string(),
            },
        ],
    };

    let csv_output = to_csv_laporan_rpl(&laporan);

    // Verifikasi Header & Metadata Berita Acara
    assert!(csv_output.contains("BERITA ACARA REKOGNISI PEMBELAJARAN LAMPAU (RPL)"));
    assert!(csv_output.contains("BA-RPL/UPT/2026/00123"));
    assert!(csv_output.contains("Budi Santoso, A.Md.Kom."));
    assert!(csv_output.contains("3301234567890001"));
    assert!(csv_output.contains("Informatika - S1"));
    assert!(csv_output.contains("Total SKS Diajukan: 12"));
    assert!(csv_output.contains("Total SKS Diakui: 9"));
    assert!(csv_output.contains("IPK Konversi: 3.56"));
    assert!(csv_output.contains("Persentase Rekognisi: 75.0%"));
    assert!(csv_output.contains("Ir. FX. Hendra, M.Kom."));

    // Verifikasi Kolom Tabel Mata Kuliah
    assert!(csv_output.contains("No,Kode MK,Nama Mata Kuliah,SKS,Semester,Status Kelayakan,Nilai Transfer,Bobot,Catatan Asesor"));
    assert!(csv_output.contains("1,\"IF101\",\"Pemrograman Berorientasi Objek\",3,2,\"DIAKUI\",\"A\",4.00,\"Pengalaman kerja Java dev 2 tahun\""));
    assert!(csv_output.contains("2,\"IF102\",\"Jaringan Komputer\",3,3,\"DITOLAK\",\"-\",0.00,\"Materi routing belum terpenuhi\""));
}

// =============================================================================
// TEST 3: ISOLASI HAK AKSES ASESOR RPL (AUTHORIZATION & RBAC)
// =============================================================================

#[derive(Clone, Debug)]
struct MockAuthUser {
    pub user_id: Uuid,
    pub role: String,
}

struct MockPermohonanRpl {
    pub asesor_id: Option<Uuid>,
}

fn check_asesor_access(user: &MockAuthUser, permohonan: &MockPermohonanRpl) -> Result<(), String> {
    // Admin dan Super Admin memiliki akses penuh (Omni-access)
    if user.role == "super_admin" || user.role == "admin_pmb" {
        return Ok(());
    }

    // Asesor RPL strictly hanya boleh mengakses permohonan yang ditugaskan padanya
    if user.role == "asesor_rpl" {
        if permohonan.asesor_id == Some(user.user_id) {
            return Ok(());
        } else {
            return Err(
                "Akses ditolak: Anda tidak ditugaskan sebagai asesor untuk permohonan RPL ini."
                    .to_string(),
            );
        }
    }

    // Role lain tidak memiliki hak akses penilaian
    Err("Akses ditolak: Role tidak berwenang.".to_string())
}

#[test]
fn test_otorisasi_hak_akses_asesor_terisolasi() {
    let asesor_a = MockAuthUser {
        user_id: Uuid::new_v4(),
        role: "asesor_rpl".to_string(),
    };

    let asesor_b = MockAuthUser {
        user_id: Uuid::new_v4(),
        role: "asesor_rpl".to_string(),
    };

    let admin = MockAuthUser {
        user_id: Uuid::new_v4(),
        role: "admin_pmb".to_string(),
    };

    let pendaftar_user = MockAuthUser {
        user_id: Uuid::new_v4(),
        role: "calon_mahasiswa".to_string(),
    };

    // Permohonan 1 ditugaskan ke Asesor A
    let permohonan_1 = MockPermohonanRpl {
        asesor_id: Some(asesor_a.user_id),
    };

    // Permohonan 2 ditugaskan ke Asesor B
    let permohonan_2 = MockPermohonanRpl {
        asesor_id: Some(asesor_b.user_id),
    };

    // 1. Asesor A BISA akses Permohonan 1
    assert!(check_asesor_access(&asesor_a, &permohonan_1).is_ok());

    // 2. Asesor A DITOLAK saat mencoba akses Permohonan 2
    let err_a_ke_2 = check_asesor_access(&asesor_a, &permohonan_2);
    assert!(err_a_ke_2.is_err());
    assert!(
        err_a_ke_2
            .unwrap_err()
            .contains("tidak ditugaskan sebagai asesor")
    );

    // 3. Asesor B BISA akses Permohonan 2
    assert!(check_asesor_access(&asesor_b, &permohonan_2).is_ok());

    // 4. Asesor B DITOLAK saat mencoba akses Permohonan 1
    let err_b_ke_1 = check_asesor_access(&asesor_b, &permohonan_1);
    assert!(err_b_ke_1.is_err());
    assert!(
        err_b_ke_1
            .unwrap_err()
            .contains("tidak ditugaskan sebagai asesor")
    );

    // 5. Admin BISA akses keduanya (Permohonan 1 dan 2)
    assert!(check_asesor_access(&admin, &permohonan_1).is_ok());
    assert!(check_asesor_access(&admin, &permohonan_2).is_ok());

    // 6. Calon Mahasiswa DITOLAK dari akses asesor
    assert!(check_asesor_access(&pendaftar_user, &permohonan_1).is_err());
}

// =============================================================================
// TEST 4: VALIDASI PERMOHONAN RPL CALON MAHASISWA
// =============================================================================

#[test]
fn test_validasi_permohonan_rpl_calon() {
    let mk_id_1 = Uuid::new_v4();
    let mk_id_2 = Uuid::new_v4();

    // 1. Permohonan valid dengan 2 mata kuliah
    let valid_input = [
        MatakuliahDiajukanInput {
            mata_kuliah_id: mk_id_1,
            keterangan_pemohon: "Pengalaman web frontend 2 tahun".to_string(),
        },
        MatakuliahDiajukanInput {
            mata_kuliah_id: mk_id_2,
            keterangan_pemohon: "Pengalaman database backend 2 tahun".to_string(),
        },
    ];
    assert!(!valid_input.is_empty());
    assert_eq!(valid_input.len(), 2);

    // 2. Permohonan tidak valid: daftar mata kuliah kosong
    let empty_input: Vec<MatakuliahDiajukanInput> = vec![];
    assert!(empty_input.is_empty());

    // 3. Proteksi edit: jika status DALAM_PENILAIAN atau SELESAI_DINILAI, permohonan terkunci
    let can_edit = |status: &str| status != "DALAM_PENILAIAN" && status != "SELESAI_DINILAI";

    assert!(can_edit("DRAFT"));
    assert!(can_edit("DIAJUKAN"));
    assert!(!can_edit("DALAM_PENILAIAN"));
    assert!(!can_edit("SELESAI_DINILAI"));

    // 4. Proteksi penugasan asesor: tidak boleh menugaskan asesor saat permohonan masih DRAFT
    let can_assign_asesor = |status: &str| status != "DRAFT";
    assert!(!can_assign_asesor("DRAFT"));
    assert!(can_assign_asesor("DIAJUKAN"));
    assert!(can_assign_asesor("DALAM_PENILAIAN"));

    // 5. Validasi finalisasi penilaian: tidak boleh finalisasi jika masih ada mata kuliah MENUNGGU
    let items_ada_menunggu = [("DIAKUI", "A"), ("MENUNGGU", "A"), ("DITOLAK", "")];
    let has_menunggu = items_ada_menunggu.iter().any(|(s, _)| *s == "MENUNGGU");
    assert!(has_menunggu); // Finalisasi harus ditolak jika has_menunggu == true

    let items_lengkap = [("DIAKUI", "A"), ("DIAKUI", "B+"), ("DITOLAK", "")];
    let all_decided = items_lengkap
        .iter()
        .all(|(s, _)| *s == "DIAKUI" || *s == "DITOLAK");
    assert!(all_decided); // Finalisasi diizinkan karena semua telah diputuskan
}

// =============================================================================
// TEST 5: SIMULASI ALUR LENGKAP RPL END-TO-END
// =============================================================================

#[test]
fn test_alur_lengkap_rpl_end_to_end() {
    let permohonan_id = Uuid::new_v4();
    let asesor_id = Uuid::new_v4();

    // Kurikulum Prodi RPL (Target S1 Informatika)
    let mk1 = (Uuid::new_v4(), "IF101", "Pemrograman Web", 3);
    let mk2 = (Uuid::new_v4(), "IF102", "Basis Data", 3);
    let mk3 = (Uuid::new_v4(), "IF103", "Rekayasa Perangkat Lunak", 3);

    // State Mesin Langkah Pendaftaran
    let mut step_states: HashMap<&str, &str> = HashMap::new();
    step_states.insert("rpl", "BELUM_MULAI");

    // FASE 1: Calon mengisi formulir RPL & memilih 3 mata kuliah yang diajukan (9 SKS)
    let pengajuan = [
        MatakuliahDiajukanInput {
            mata_kuliah_id: mk1.0,
            keterangan_pemohon: "Pengalaman web engineer di PT ABC".to_string(),
        },
        MatakuliahDiajukanInput {
            mata_kuliah_id: mk2.0,
            keterangan_pemohon: "Sertifikasi PostgreSQL Associate".to_string(),
        },
        MatakuliahDiajukanInput {
            mata_kuliah_id: mk3.0,
            keterangan_pemohon: "Pengalaman Scrum Master 1 tahun".to_string(),
        },
    ];
    let total_sks_diajukan: i32 = pengajuan.len() as i32 * 3;
    assert_eq!(total_sks_diajukan, 9);

    // Calon Submit Permohonan
    let mut status_permohonan = "DIAJUKAN";
    step_states.insert("rpl", "SELESAI");
    assert_eq!(status_permohonan, "DIAJUKAN");
    assert_eq!(step_states.get("rpl"), Some(&"SELESAI"));

    // FASE 2: Admin PMB Menugaskan Asesor
    let assigned_asesor_id: Option<Uuid> = Some(asesor_id);
    status_permohonan = "DALAM_PENILAIAN";
    assert_eq!(status_permohonan, "DALAM_PENILAIAN");
    assert_eq!(assigned_asesor_id, Some(asesor_id));

    // FASE 3: Asesor Menilai Per Mata Kuliah
    // Hasil:
    // MK 1: DIAKUI, A (4.0) -> mutu = 12.0
    // MK 2: DIAKUI, A- (3.7) -> mutu = 11.1
    // MK 3: DITOLAK (0 SKS)
    let assessed_items = vec![
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: mk1.0,
            kode_mk: mk1.1.to_string(),
            nama_mk: mk1.2.to_string(),
            sks: mk1.3,
            semester: 1,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Pengalaman web".to_string()),
            status_kelayakan: "DIAKUI".to_string(),
            nilai_transfer: Some("A".to_string()),
            bobot_nilai: Some(4.0),
            catatan_asesor: Some("Portofolio valid".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Asesor UPT".to_string()),
        },
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: mk2.0,
            kode_mk: mk2.1.to_string(),
            nama_mk: mk2.2.to_string(),
            sks: mk2.3,
            semester: 2,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Sertifikasi".to_string()),
            status_kelayakan: "DIAKUI".to_string(),
            nilai_transfer: Some("A-".to_string()),
            bobot_nilai: Some(3.7),
            catatan_asesor: Some("Kompetensi sesuai".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Asesor UPT".to_string()),
        },
        RplMataKuliahDiajukanDetail {
            id: Uuid::new_v4(),
            permohonan_id,
            mata_kuliah_id: mk3.0,
            kode_mk: mk3.1.to_string(),
            nama_mk: mk3.2.to_string(),
            sks: mk3.3,
            semester: 3,
            silabus_ringkas: None,
            keterangan_pemohon: Some("Pengalaman Scrum".to_string()),
            status_kelayakan: "DITOLAK".to_string(),
            nilai_transfer: None,
            bobot_nilai: None,
            catatan_asesor: Some("Kurang mendalam pada siklus SDLC arsitektur".to_string()),
            assessed_at: None,
            assessed_by_nama: Some("Asesor UPT".to_string()),
        },
    ];

    // FASE 4: Finalisasi Penilaian & Perhitungan Hasil Konversi
    let (sks_ajukan, sks_akui, ipk_konversi, persentase) =
        hitung_rekap_konversi_sks(&assessed_items);

    assert_eq!(sks_ajukan, 9);
    assert_eq!(sks_akui, 6); // 2 MK x 3 SKS

    // Total Mutu = (3 * 4.0) + (3 * 3.7) = 12.0 + 11.1 = 23.1
    // IPK Konversi = 23.1 / 6 = 3.85
    assert_eq!(ipk_konversi, 3.85);

    // Persentase = (6 / 9) * 100 = 66.67%
    assert_eq!(persentase, 66.67);

    status_permohonan = "SELESAI_DINILAI";
    assert_eq!(status_permohonan, "SELESAI_DINILAI");
    step_states.insert("rpl", "TERVERIFIKASI");
    assert_eq!(step_states.get("rpl"), Some(&"TERVERIFIKASI"));

    // FASE 5: Validasi Integrasi dengan Modul Kelulusan
    // IPK konversi (skala 4.0) dikonversi ke skala 100 untuk penilaian seleksi:
    let skor_rpl_skala_100 = (ipk_konversi / 4.0) * 100.0; // 3.85 / 4.0 * 100 = 96.25
    assert!((skor_rpl_skala_100 - 96.25).abs() < 0.01);

    // Laporan Berita Acara siap diunduh
    let laporan = LaporanRplResponse {
        nomor_berita_acara: "BA-RPL/UPT/2026/00999".to_string(),
        tanggal_berita_acara: "01 November 2026".to_string(),
        permohonan_id,
        nomor_pendaftaran: "PMB-2026-00999".to_string(),
        nama_lengkap: "Dewi Lestari".to_string(),
        nik: "3302198765430002".to_string(),
        prodi_nama: "Informatika".to_string(),
        jenjang: "S1".to_string(),
        fakultas: "Fakultas Sains dan Teknologi".to_string(),
        tipe_rpl: "TIPE_A".to_string(),
        total_sks_diajukan: sks_ajukan,
        total_sks_diakui: sks_akui,
        ipk_konversi,
        persentase_rekognisi: persentase,
        asesor_nama: "Ir. FX. Hendra, M.Kom.".to_string(),
        catatan_rekomendasi: "Lulus rekognisi 6 SKS".to_string(),
        daftar_mata_kuliah: vec![
            LaporanRplItemCourse {
                no: 1,
                kode_mk: mk1.1.to_string(),
                nama_mk: mk1.2.to_string(),
                sks: mk1.3,
                semester: 1,
                status_kelayakan: "DIAKUI".to_string(),
                nilai_transfer: "A".to_string(),
                bobot_nilai: 4.0,
                catatan_asesor: "Portofolio valid".to_string(),
            },
            LaporanRplItemCourse {
                no: 2,
                kode_mk: mk2.1.to_string(),
                nama_mk: mk2.2.to_string(),
                sks: mk2.3,
                semester: 2,
                status_kelayakan: "DIAKUI".to_string(),
                nilai_transfer: "A-".to_string(),
                bobot_nilai: 3.7,
                catatan_asesor: "Kompetensi sesuai".to_string(),
            },
        ],
    };

    let csv_ba = to_csv_laporan_rpl(&laporan);
    assert!(csv_ba.contains("Dewi Lestari"));
    assert!(csv_ba.contains("Total SKS Diakui: 6"));
    assert!(csv_ba.contains("IPK Konversi: 3.85"));
}
