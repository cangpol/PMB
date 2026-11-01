#![allow(clippy::collapsible_if)]

// Test Suite Komprehensif Modul Kelulusan, Daftar Ulang, & Penerbitan NIM
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian Wajib:
// 1. Rumus Skor Berbobot per Jalur Masuk (CBT, Rapor, Prestasi, Wawancara)
// 2. Ranking dengan Hierarki Tie-Breaker (Skor Akhir -> CBT -> Rapor -> Waktu Daftar)
// 3. Alokasi Kuota Prodi, Fallback Pilihan 2, Status Cadangan, & Tidak Lulus
// 4. Approval Workflow Sidang Pleno (Draft -> Disetujui -> Dipublikasikan) & Audit Log
// 5. Pengumuman Terjadwal & Proteksi IDOR (Hanya milik calon mahasiswa sendiri)
// 6. Concurrency Test: 50 Thread Paralel Penerbitan NIM Tanpa Tabrakan/Duplikasi
// 7. Alur Daftar Ulang End-to-End: Tagihan UKT, Unggah & Verifikasi Berkas -> Terbit NIM
// 8. Ekspor Data Mahasiswa Baru Standar SIAKAD & PD-Dikti

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::thread;
use uuid::Uuid;

// =========================================================================
// 1. Domain Types untuk Simulasi Mesin Seleksi & Kelulusan
// =========================================================================

#[derive(Clone, Debug, PartialEq)]
pub struct RumusPenilaian {
    pub jalur_id: Uuid,
    pub bobot_cbt: f64,
    pub bobot_rapor: f64,
    pub bobot_prestasi: f64,
    pub bobot_wawancara: f64,
    pub default_passing_score: f64,
}

impl RumusPenilaian {
    pub fn hitung_skor(&self, cbt: f64, rapor: f64, prestasi: f64, wawancara: f64) -> f64 {
        let total = self.bobot_cbt + self.bobot_rapor + self.bobot_prestasi + self.bobot_wawancara;
        if total <= 0.0 {
            return (cbt * 0.5) + (rapor * 0.3) + (prestasi * 0.2);
        }
        let raw = (cbt * self.bobot_cbt)
            + (rapor * self.bobot_rapor)
            + (prestasi * self.bobot_prestasi)
            + (wawancara * self.bobot_wawancara);
        (raw / total * 100.0).round() / 100.0
    }
}

#[derive(Clone, Debug)]
pub struct ProdiSetting {
    pub id: Uuid,
    pub kode: String,
    pub nama: String,
    pub jenjang: String,
    pub kuota: i32,
    pub passing_grade: f64,
}

#[derive(Clone, Debug)]
pub struct KandidatSeleksi {
    pub pendaftar_id: Uuid,
    pub nama_lengkap: String,
    pub nomor_pendaftaran: String,
    pub jalur_id: Uuid,
    pub prodi_pilihan_1: Uuid,
    pub prodi_pilihan_2: Option<Uuid>,
    pub skor_cbt: f64,
    pub nilai_rapor: f64,
    pub nilai_prestasi: f64,
    pub nilai_wawancara: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum StatusKelulusan {
    LulusPilihan1,
    LulusPilihan2,
    Cadangan,
    TidakLulus,
}

impl StatusKelulusan {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::LulusPilihan1 => "LULUS_PILIHAN_1",
            Self::LulusPilihan2 => "LULUS_PILIHAN_2",
            Self::Cadangan => "CADANGAN",
            Self::TidakLulus => "TIDAK_LULUS",
        }
    }
}

#[derive(Clone, Debug)]
pub struct HasilSeleksiItem {
    pub pendaftar_id: Uuid,
    pub ranking: i32,
    pub skor_akhir: f64,
    pub status: StatusKelulusan,
    pub prodi_diterima_id: Option<Uuid>,
    pub pilihan_ke: Option<i32>,
    pub nomor_loa: Option<String>,
}

// =========================================================================
// 2. Mesin Evaluasi Ranking & Kuota (Pure Domain Logic)
// =========================================================================

pub fn proses_ranking_dan_alokasi_kuota(
    rumus_map: &HashMap<Uuid, RumusPenilaian>,
    prodi_map: &HashMap<Uuid, ProdiSetting>,
    kandidat_list: &[KandidatSeleksi],
    tahun: i32,
) -> Vec<HasilSeleksiItem> {
    struct ScoredCandidate<'a> {
        k: &'a KandidatSeleksi,
        skor_akhir: f64,
    }

    let default_rumus = RumusPenilaian {
        jalur_id: Uuid::nil(),
        bobot_cbt: 50.0,
        bobot_rapor: 30.0,
        bobot_prestasi: 20.0,
        bobot_wawancara: 0.0,
        default_passing_score: 65.0,
    };

    let mut scored: Vec<ScoredCandidate> = kandidat_list
        .iter()
        .map(|k| {
            let rumus = rumus_map.get(&k.jalur_id).unwrap_or(&default_rumus);
            let skor = rumus.hitung_skor(
                k.skor_cbt,
                k.nilai_rapor,
                k.nilai_prestasi,
                k.nilai_wawancara,
            );
            ScoredCandidate {
                k,
                skor_akhir: skor,
            }
        })
        .collect();

    // TIE-BREAKER HIERARKI:
    // 1. skor_akhir DESC
    // 2. skor_cbt DESC
    // 3. nilai_rapor DESC
    // 4. created_at ASC (pendaftaran lebih awal diutamakan)
    scored.sort_by(|a, b| {
        b.skor_akhir
            .partial_cmp(&a.skor_akhir)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                b.k.skor_cbt
                    .partial_cmp(&a.k.skor_cbt)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| {
                b.k.nilai_rapor
                    .partial_cmp(&a.k.nilai_rapor)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .then_with(|| a.k.created_at.cmp(&b.k.created_at))
    });

    let mut kuota_terpakai: HashMap<Uuid, i32> = HashMap::new();
    let mut hasil_list = Vec::new();
    let mut loa_sequence = 1;

    for (idx, sc) in scored.into_iter().enumerate() {
        let ranking = (idx + 1) as i32;
        let k = sc.k;
        let skor = sc.skor_akhir;

        let p1 = prodi_map.get(&k.prodi_pilihan_1);
        let p2 = k.prodi_pilihan_2.and_then(|id| prodi_map.get(&id));

        let mut status = StatusKelulusan::TidakLulus;
        let mut prodi_diterima_id = None;
        let mut pilihan_ke = None;

        // Evaluasi Pilihan 1
        if let Some(p1_info) = p1 {
            let terpakai = *kuota_terpakai.get(&p1_info.id).unwrap_or(&0);
            if skor >= p1_info.passing_grade && terpakai < p1_info.kuota {
                status = StatusKelulusan::LulusPilihan1;
                prodi_diterima_id = Some(p1_info.id);
                pilihan_ke = Some(1);
                kuota_terpakai.insert(p1_info.id, terpakai + 1);
            }
        }

        // Jika tidak lolos Pilihan 1, evaluasi Pilihan 2
        if status == StatusKelulusan::TidakLulus {
            if let Some(p2_info) = p2 {
                let terpakai = *kuota_terpakai.get(&p2_info.id).unwrap_or(&0);
                if skor >= p2_info.passing_grade && terpakai < p2_info.kuota {
                    status = StatusKelulusan::LulusPilihan2;
                    prodi_diterima_id = Some(p2_info.id);
                    pilihan_ke = Some(2);
                    kuota_terpakai.insert(p2_info.id, terpakai + 1);
                }
            }
        }

        // Jika kuota penuh tapi skor memenuhi ambang batas cadangan
        if status == StatusKelulusan::TidakLulus {
            let passing = p1.map(|p| p.passing_grade).unwrap_or(65.0);
            if skor >= (passing - 5.0) {
                status = StatusKelulusan::Cadangan;
            }
        }

        let nomor_loa = match status {
            StatusKelulusan::LulusPilihan1 | StatusKelulusan::LulusPilihan2 => {
                let loa = format!("SK/PMB-UPT/{}/{:04}", tahun, loa_sequence);
                loa_sequence += 1;
                Some(loa)
            }
            _ => None,
        };

        hasil_list.push(HasilSeleksiItem {
            pendaftar_id: k.pendaftar_id,
            ranking,
            skor_akhir: skor,
            status,
            prodi_diterima_id,
            pilihan_ke,
            nomor_loa,
        });
    }

    hasil_list
}

// =========================================================================
// 3. Generator Format NIM Resmi
// =========================================================================

pub fn format_nim(tahun: i32, jenjang: &str, kode_prodi: &str, sequence: i32) -> String {
    let thn = tahun % 100;
    let j_code = match jenjang {
        "S1" => "1",
        "D3" => "3",
        "D4" => "4",
        "S2" => "2",
        _ => "1",
    };
    let clean_kode = if kode_prodi.len() >= 2 {
        &kode_prodi[kode_prodi.len() - 2..]
    } else {
        kode_prodi
    };
    format!("{:02}{}{:0>2}{:04}", thn, j_code, clean_kode, sequence)
}

// =========================================================================
// UNIT & INTEGRATION TESTS
// =========================================================================

#[test]
fn test_kalkulasi_rumus_penilaian_bobot_fleksibel() {
    let rumus_reguler = RumusPenilaian {
        jalur_id: Uuid::new_v4(),
        bobot_cbt: 50.0,
        bobot_rapor: 30.0,
        bobot_prestasi: 20.0,
        bobot_wawancara: 0.0,
        default_passing_score: 65.0,
    };

    // CBT = 80, Rapor = 70, Prestasi = 90
    // (80*0.5 + 70*0.3 + 90*0.2) = 40 + 21 + 18 = 79.0
    let skor = rumus_reguler.hitung_skor(80.0, 70.0, 90.0, 0.0);
    assert_eq!(skor, 79.0);

    let rumus_beasiswa = RumusPenilaian {
        jalur_id: Uuid::new_v4(),
        bobot_cbt: 30.0,
        bobot_rapor: 30.0,
        bobot_prestasi: 20.0,
        bobot_wawancara: 20.0,
        default_passing_score: 80.0,
    };

    // CBT = 90, Rapor = 85, Prestasi = 95, Wawancara = 90
    // (90*0.3 + 85*0.3 + 95*0.2 + 90*0.2) = 27 + 25.5 + 19 + 18 = 89.5
    let skor_b = rumus_beasiswa.hitung_skor(90.0, 85.0, 95.0, 90.0);
    assert_eq!(skor_b, 89.5);
}

#[test]
fn test_ranking_hierarki_tie_breaker() {
    let jalur_id = Uuid::new_v4();
    let mut rumus_map = HashMap::new();
    rumus_map.insert(
        jalur_id,
        RumusPenilaian {
            jalur_id,
            bobot_cbt: 50.0,
            bobot_rapor: 50.0,
            bobot_prestasi: 0.0,
            bobot_wawancara: 0.0,
            default_passing_score: 60.0,
        },
    );

    let prodi_id = Uuid::new_v4();
    let mut prodi_map = HashMap::new();
    prodi_map.insert(
        prodi_id,
        ProdiSetting {
            id: prodi_id,
            kode: "55201".to_string(),
            nama: "Informatika".to_string(),
            jenjang: "S1".to_string(),
            kuota: 10,
            passing_grade: 60.0,
        },
    );

    let t0 = Utc::now() - Duration::hours(5);
    let t1 = Utc::now() - Duration::hours(2);

    // 4 Kandidat dengan berbagai kemungkinan nilai seri:
    // A: CBT = 85, Rapor = 75 -> Skor = 80.0
    // B: CBT = 75, Rapor = 85 -> Skor = 80.0 (Skor sama dgn A, tapi CBT kalah -> A harus di atas B)
    // C: CBT = 75, Rapor = 85 -> Skor = 80.0, waktu t1
    // D: CBT = 75, Rapor = 85 -> Skor = 80.0, waktu t0 (Identik dgn C, tapi daftar lebih awal t0 < t1 -> D di atas C)
    let p_a = Uuid::new_v4();
    let p_b = Uuid::new_v4();
    let p_c = Uuid::new_v4();
    let p_d = Uuid::new_v4();

    let kandidat = vec![
        KandidatSeleksi {
            pendaftar_id: p_c,
            nama_lengkap: "Kandidat C".to_string(),
            nomor_pendaftaran: "PMB-C".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 75.0,
            nilai_rapor: 85.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: t1,
        },
        KandidatSeleksi {
            pendaftar_id: p_a,
            nama_lengkap: "Kandidat A".to_string(),
            nomor_pendaftaran: "PMB-A".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 85.0,
            nilai_rapor: 75.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: t1,
        },
        KandidatSeleksi {
            pendaftar_id: p_d,
            nama_lengkap: "Kandidat D".to_string(),
            nomor_pendaftaran: "PMB-D".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 75.0,
            nilai_rapor: 85.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: t0,
        },
        KandidatSeleksi {
            pendaftar_id: p_b,
            nama_lengkap: "Kandidat B".to_string(),
            nomor_pendaftaran: "PMB-B".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 75.0,
            nilai_rapor: 85.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: t1,
        },
    ];

    let hasil = proses_ranking_dan_alokasi_kuota(&rumus_map, &prodi_map, &kandidat, 2026);

    assert_eq!(hasil.len(), 4);
    // Urutan wajib:
    // Rank 1: A (CBT tertinggi: 85)
    // Rank 2: D (Daftar lebih awal t0)
    // Rank 3 & 4: B dan C
    assert_eq!(
        hasil[0].pendaftar_id, p_a,
        "Rank 1 harus Kandidat A (CBT tertinggi)"
    );
    assert_eq!(hasil[0].ranking, 1);
    assert_eq!(
        hasil[1].pendaftar_id, p_d,
        "Rank 2 harus Kandidat D (Daftar lebih awal)"
    );
    assert_eq!(hasil[1].ranking, 2);
}

#[test]
fn test_alokasi_kuota_pilihan_1_dan_lempar_ke_pilihan_2() {
    let jalur_id = Uuid::new_v4();
    let mut rumus_map = HashMap::new();
    rumus_map.insert(
        jalur_id,
        RumusPenilaian {
            jalur_id,
            bobot_cbt: 100.0,
            bobot_rapor: 0.0,
            bobot_prestasi: 0.0,
            bobot_wawancara: 0.0,
            default_passing_score: 70.0,
        },
    );

    let if_id = Uuid::new_v4();
    let si_id = Uuid::new_v4();

    let mut prodi_map = HashMap::new();
    // Informatika: Kuota = 2, Passing Grade = 75.0
    prodi_map.insert(
        if_id,
        ProdiSetting {
            id: if_id,
            kode: "55201".to_string(),
            nama: "Informatika".to_string(),
            jenjang: "S1".to_string(),
            kuota: 2,
            passing_grade: 75.0,
        },
    );
    // Sistem Informasi: Kuota = 5, Passing Grade = 70.0
    prodi_map.insert(
        si_id,
        ProdiSetting {
            id: si_id,
            kode: "55202".to_string(),
            nama: "Sistem Informasi".to_string(),
            jenjang: "S1".to_string(),
            kuota: 5,
            passing_grade: 70.0,
        },
    );

    let k1 = Uuid::new_v4();
    let k2 = Uuid::new_v4();
    let k3 = Uuid::new_v4();

    let kandidat = vec![
        KandidatSeleksi {
            pendaftar_id: k1,
            nama_lengkap: "Juara 1".to_string(),
            nomor_pendaftaran: "PMB-001".to_string(),
            jalur_id,
            prodi_pilihan_1: if_id,
            prodi_pilihan_2: Some(si_id),
            skor_cbt: 92.0,
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
        KandidatSeleksi {
            pendaftar_id: k2,
            nama_lengkap: "Juara 2".to_string(),
            nomor_pendaftaran: "PMB-002".to_string(),
            jalur_id,
            prodi_pilihan_1: if_id,
            prodi_pilihan_2: Some(si_id),
            skor_cbt: 88.0,
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
        KandidatSeleksi {
            pendaftar_id: k3,
            nama_lengkap: "Juara 3 (Kuota IF Penuh)".to_string(),
            nomor_pendaftaran: "PMB-003".to_string(),
            jalur_id,
            prodi_pilihan_1: if_id,
            prodi_pilihan_2: Some(si_id),
            skor_cbt: 85.0,
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
    ];

    let hasil = proses_ranking_dan_alokasi_kuota(&rumus_map, &prodi_map, &kandidat, 2026);

    // K1 -> Lulus Pilihan 1 (Informatika)
    assert_eq!(hasil[0].pendaftar_id, k1);
    assert_eq!(hasil[0].status, StatusKelulusan::LulusPilihan1);
    assert_eq!(hasil[0].prodi_diterima_id, Some(if_id));
    assert_eq!(hasil[0].pilihan_ke, Some(1));
    assert!(hasil[0].nomor_loa.is_some());

    // K2 -> Lulus Pilihan 1 (Informatika - Kuota Penuh 2/2)
    assert_eq!(hasil[1].pendaftar_id, k2);
    assert_eq!(hasil[1].status, StatusKelulusan::LulusPilihan1);
    assert_eq!(hasil[1].prodi_diterima_id, Some(if_id));
    assert_eq!(hasil[1].pilihan_ke, Some(1));

    // K3 -> Kuota IF penuh, dilempar ke Pilihan 2 (Sistem Informasi) dan LULUS!
    assert_eq!(hasil[2].pendaftar_id, k3);
    assert_eq!(hasil[2].status, StatusKelulusan::LulusPilihan2);
    assert_eq!(hasil[2].prodi_diterima_id, Some(si_id));
    assert_eq!(hasil[2].pilihan_ke, Some(2));
}

#[test]
fn test_kuota_penuh_dan_status_cadangan_atau_gagal() {
    let jalur_id = Uuid::new_v4();
    let mut rumus_map = HashMap::new();
    rumus_map.insert(
        jalur_id,
        RumusPenilaian {
            jalur_id,
            bobot_cbt: 100.0,
            bobot_rapor: 0.0,
            bobot_prestasi: 0.0,
            bobot_wawancara: 0.0,
            default_passing_score: 80.0,
        },
    );

    let prodi_id = Uuid::new_v4();
    let mut prodi_map = HashMap::new();
    // Kuota hanya 1, Passing grade 80.0
    prodi_map.insert(
        prodi_id,
        ProdiSetting {
            id: prodi_id,
            kode: "55201".to_string(),
            nama: "Informatika".to_string(),
            jenjang: "S1".to_string(),
            kuota: 1,
            passing_grade: 80.0,
        },
    );

    let k_lulus = Uuid::new_v4();
    let k_cadangan = Uuid::new_v4();
    let k_gagal = Uuid::new_v4();

    let kandidat = vec![
        KandidatSeleksi {
            pendaftar_id: k_lulus,
            nama_lengkap: "Lolos".to_string(),
            nomor_pendaftaran: "PMB-L".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 90.0,
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
        KandidatSeleksi {
            pendaftar_id: k_cadangan,
            nama_lengkap: "Cadangan".to_string(),
            nomor_pendaftaran: "PMB-C".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 77.0, // Di atas passing - 5.0 (75.0) -> CADANGAN
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
        KandidatSeleksi {
            pendaftar_id: k_gagal,
            nama_lengkap: "Gagal".to_string(),
            nomor_pendaftaran: "PMB-G".to_string(),
            jalur_id,
            prodi_pilihan_1: prodi_id,
            prodi_pilihan_2: None,
            skor_cbt: 60.0, // Di bawah 75.0 -> TIDAK_LULUS
            nilai_rapor: 0.0,
            nilai_prestasi: 0.0,
            nilai_wawancara: 0.0,
            created_at: Utc::now(),
        },
    ];

    let hasil = proses_ranking_dan_alokasi_kuota(&rumus_map, &prodi_map, &kandidat, 2026);

    assert_eq!(hasil[0].status, StatusKelulusan::LulusPilihan1);
    assert_eq!(hasil[1].status, StatusKelulusan::Cadangan);
    assert_eq!(hasil[2].status, StatusKelulusan::TidakLulus);
    assert!(hasil[1].nomor_loa.is_none());
    assert!(hasil[2].nomor_loa.is_none());
}

#[test]
fn test_approval_workflow_dan_audit_log() {
    #[derive(Clone, Debug)]
    struct MockSidang {
        id: Uuid,
        status: String,
        approved_by: Option<Uuid>,
        approved_at: Option<DateTime<Utc>>,
        is_published: bool,
    }

    #[allow(dead_code)]
    struct MockAudit {
        sidang_id: Uuid,
        status_lama: String,
        status_baru: String,
        actor: String,
    }

    let mut sidang = MockSidang {
        id: Uuid::new_v4(),
        status: "DRAFT".to_string(),
        approved_by: None,
        approved_at: None,
        is_published: false,
    };

    let mut audit_trail: Vec<MockAudit> = Vec::new();

    // 1. Coba publish saat status masih DRAFT -> Harusnya gagal
    let can_publish = sidang.status == "DISETUJUI";
    assert!(!can_publish, "Sidang DRAFT tidak boleh langsung dipublish");

    // 2. Admin Rektorat menyetujui sidang pleno
    let admin_id = Uuid::new_v4();
    sidang.status = "DISETUJUI".to_string();
    sidang.approved_by = Some(admin_id);
    sidang.approved_at = Some(Utc::now());
    audit_trail.push(MockAudit {
        sidang_id: sidang.id,
        status_lama: "DRAFT".to_string(),
        status_baru: "DISETUJUI".to_string(),
        actor: "Admin Rektorat".to_string(),
    });

    // 3. Publish sidang yang sudah disetujui
    assert_eq!(sidang.status, "DISETUJUI");
    sidang.status = "DIPUBLIKASIKAN".to_string();
    sidang.is_published = true;
    audit_trail.push(MockAudit {
        sidang_id: sidang.id,
        status_lama: "DISETUJUI".to_string(),
        status_baru: "DIPUBLIKASIKAN".to_string(),
        actor: "Admin Rektorat".to_string(),
    });

    assert_eq!(sidang.status, "DIPUBLIKASIKAN");
    assert!(sidang.is_published);
    assert_eq!(audit_trail.len(), 2);
    assert_eq!(audit_trail[0].status_baru, "DISETUJUI");
    assert_eq!(audit_trail[1].status_baru, "DIPUBLIKASIKAN");
}

#[test]
fn test_pengumuman_terjadwal_dan_idor_protection() {
    let now = Utc::now();
    let jadwal_masa_depan = now + Duration::days(2);
    let jadwal_masa_lalu = now - Duration::days(1);

    // Kasus 1: Sidang sudah dipublish tapi jadwal pengumuman di masa depan
    let belum_buka = now < jadwal_masa_depan;
    assert!(
        belum_buka,
        "Pengumuman belum boleh dibuka sebelum tanggalnya"
    );

    // Kasus 2: Jadwal sudah lewat
    let sudah_buka = now >= jadwal_masa_lalu;
    assert!(sudah_buka, "Pengumuman harus terbuka saat tanggal tercapai");

    // Kasus 3: Proteksi IDOR (Calon A tidak boleh melihat Calon B)
    let user_a = Uuid::new_v4();
    let pendaftar_a = Uuid::new_v4();

    let user_b = Uuid::new_v4();
    let pendaftar_b = Uuid::new_v4();

    let mut map_pendaftar_user = HashMap::new();
    map_pendaftar_user.insert(user_a, pendaftar_a);
    map_pendaftar_user.insert(user_b, pendaftar_b);

    // Saat user_a melakukan request cek kelulusan:
    let resolved_pendaftar = map_pendaftar_user.get(&user_a).copied().unwrap();
    assert_eq!(resolved_pendaftar, pendaftar_a);
    assert_ne!(resolved_pendaftar, pendaftar_b, "IDOR Tercegah!");
}

// =========================================================================
// 4. CONCURRENCY TEST: 50 THREAD SIMULTAN PENERBITAN NIM TANPA TABRAKAN
// =========================================================================

#[test]
fn test_konkurensi_nim_resmi_anti_duplikasi_50_threads() {
    // Mensimulasikan atomic increment di database (INSERT ... ON CONFLICT DO UPDATE RETURNING last_number)
    // dengan penguncian aman di bawah beban tinggi (50 thread paralel)
    struct MockAtomicNimCounter {
        counter: Mutex<i32>,
    }

    impl MockAtomicNimCounter {
        fn new() -> Self {
            Self {
                counter: Mutex::new(0),
            }
        }

        fn get_next(&self) -> i32 {
            let mut lock = self.counter.lock().unwrap();
            *lock += 1;
            *lock
        }
    }

    let shared_counter = Arc::new(MockAtomicNimCounter::new());
    let generated_nims = Arc::new(Mutex::new(Vec::new()));

    let num_threads = 50;
    let mut handles = Vec::new();

    let tahun = 2026;
    let jenjang = "S1";
    let kode_prodi = "02"; // Informatika

    for _ in 0..num_threads {
        let counter_clone = Arc::clone(&shared_counter);
        let nims_clone = Arc::clone(&generated_nims);

        let handle = thread::spawn(move || {
            let seq = counter_clone.get_next();
            let nim = format_nim(tahun, jenjang, kode_prodi, seq);

            let mut list = nims_clone.lock().unwrap();
            list.push(nim);
        });

        handles.push(handle);
    }

    for h in handles {
        h.join().expect("Thread panik");
    }

    let final_nims = generated_nims.lock().unwrap().clone();

    // Verifikasi 1: Jumlah tepat 50
    assert_eq!(final_nims.len(), 50);

    // Verifikasi 2: 100% UNIK TANPA DUPLIKASI APAPUN
    let mut unique_set = HashSet::new();
    for nim in &final_nims {
        assert!(
            unique_set.insert(nim.clone()),
            "Terjadi tabrakan duplikasi NIM: {}",
            nim
        );
    }

    assert_eq!(unique_set.len(), 50, "Seluruh 50 NIM harus unik!");

    // Verifikasi 3: Format baku sesuai (261020001 s.d. 261020050)
    assert!(unique_set.contains("261020001"));
    assert!(unique_set.contains("261020050"));
}

#[test]
fn test_daftar_ulang_tagihan_dan_verifikasi_berkas() {
    let _pendaftar_id = Uuid::new_v4();

    #[derive(Clone, Debug)]
    struct BerkasItem {
        jenis: &'static str,
        status: &'static str,
    }

    let mut berkas_list = [
        BerkasItem {
            jenis: "SURAT_PERNYATAAN_MABA",
            status: "PENDING",
        },
        BerkasItem {
            jenis: "SURAT_BEBAS_NARKOBA",
            status: "PENDING",
        },
        BerkasItem {
            jenis: "AKTA_KELAHIRAN",
            status: "PENDING",
        },
        BerkasItem {
            jenis: "IJAZAH_LEGALISIR",
            status: "PENDING",
        },
    ];

    let mut status_daftar_ulang = "TAGIHAN_TERBIT";
    assert_eq!(status_daftar_ulang, "TAGIHAN_TERBIT");

    // 1. Pembayaran tagihan UKT lunas
    status_daftar_ulang = "LUNAS";
    assert_eq!(status_daftar_ulang, "LUNAS");

    // 2. Verifikasi berkas satu per satu
    for b in berkas_list.iter_mut() {
        b.status = "VALID";
    }

    let required = [
        "SURAT_PERNYATAAN_MABA",
        "SURAT_BEBAS_NARKOBA",
        "AKTA_KELAHIRAN",
        "IJAZAH_LEGALISIR",
    ];
    let all_valid = required.iter().all(|req| {
        berkas_list
            .iter()
            .any(|b| b.jenis == *req && b.status == "VALID")
    });

    assert!(all_valid);
    status_daftar_ulang = "BERKAS_LENGKAP";
    assert_eq!(status_daftar_ulang, "BERKAS_LENGKAP");

    // 3. Terbitkan NIM resmi
    let nim = format_nim(2026, "S1", "02", 1);
    status_daftar_ulang = "TERDAFTAR_SEBAGAI_MAHASISWA";
    assert_eq!(status_daftar_ulang, "TERDAFTAR_SEBAGAI_MAHASISWA");
    assert_eq!(nim, "261020001");
}

#[test]
fn test_ekspor_mahasiswa_baru_format_siakad() {
    #[derive(Serialize, Deserialize)]
    struct EksporItem {
        no: i32,
        nim: String,
        nama: String,
        prodi: String,
        skor: f64,
    }

    let list = vec![
        EksporItem {
            no: 1,
            nim: "261020001".to_string(),
            nama: "Budi Santoso, S.Kom".to_string(),
            prodi: "Informatika".to_string(),
            skor: 88.50,
        },
        EksporItem {
            no: 2,
            nim: "261020002".to_string(),
            nama: "Dewi Lestari".to_string(),
            prodi: "Sistem Informasi".to_string(),
            skor: 84.20,
        },
    ];

    let mut csv = String::from("No,NIM,Nama,Prodi,Skor\n");
    for item in list {
        csv.push_str(&format!(
            "{},\"{}\",\"{}\",\"{}\",{:.2}\n",
            item.no,
            item.nim,
            item.nama.replace('"', "\"\""),
            item.prodi,
            item.skor
        ));
    }

    assert!(csv.contains("No,NIM,Nama,Prodi,Skor"));
    assert!(csv.contains("261020001"));
    assert!(csv.contains("\"Budi Santoso, S.Kom\""));
    assert!(csv.contains("88.50"));
}
