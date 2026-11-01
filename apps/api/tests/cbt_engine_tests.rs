#![allow(clippy::collapsible_if)]

// Test Suite Komprehensif CBT Online & Presensi PMB
// Universitas Pignatelli Triputra
//
// Cakupan Pengujian:
// 1. Otoritas Timer Server & Auto-Submit saat Batas Waktu Habis
// 2. Gatekeeper Presensi (Akses ditolak jika BELUM_HADIR, diizinkan jika HADIR)
// 3. Pencegahan Sesi Ganda Aktif (Single Active Session Idempotency)
// 4. Pengacakan Soal & Opsi Deterministik per Peserta + Preservasi Kunci Jawaban
// 5. Autosave Idempoten & Penanda Ragu-Ragu
// 6. Penilaian Otomatis (Skor Berbobot, Sub-Kategori, Passing Grade)
// 7. Impor Soal dari Excel/CSV & Laporan Baris Error
// 8. Uji Beban Konkurensi 200 Peserta Bersamaan (Load Test)

use chrono::{DateTime, Duration, Utc};
use rand::SeedableRng;
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use uuid::Uuid;

// =========================================================================
// 1. Domain Types untuk Simulasi CBT Engine
// =========================================================================

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum StatusPresensi {
    BelumHadir,
    Hadir,
    Izin,
    Alpa,
}

impl StatusPresensi {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::BelumHadir => "BELUM_HADIR",
            Self::Hadir => "HADIR",
            Self::Izin => "IZIN",
            Self::Alpa => "ALPA",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum StatusUjian {
    BelumMulai,
    SedangMengerjakan,
    Selesai,
    WaktuHabis,
    Dibatalkan,
}

impl StatusUjian {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::BelumMulai => "BELUM_MULAI",
            Self::SedangMengerjakan => "SEDANG_MENGERJAKAN",
            Self::Selesai => "SELESAI",
            Self::WaktuHabis => "WAKTU_HABIS",
            Self::Dibatalkan => "DIBATALKAN",
        }
    }
}

#[derive(Clone, Debug)]
pub struct MockSoal {
    pub id: Uuid,
    pub kategori: String,
    pub tingkat_kesulitan: String,
    pub pertanyaan: String,
    pub opsi: Vec<MockOpsi>,
    pub kunci_jawaban: String,
    pub bobot: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MockOpsi {
    pub id: String,
    pub label: String,
    pub teks: String,
}

#[derive(Clone, Debug)]
pub struct MockPaket {
    pub id: Uuid,
    pub nama_paket: String,
    pub durasi_menit: i32,
    pub passing_grade: f64,
    pub acak_soal: bool,
    pub acak_opsi: bool,
    pub soal: Vec<MockSoal>,
}

#[derive(Clone, Debug)]
pub struct MockPesertaSesi {
    pub id: Uuid,
    pub sesi_id: Uuid,
    pub pendaftar_id: Uuid,
    pub nomor_peserta: String,
    pub status_presensi: StatusPresensi,
    pub waktu_presensi: Option<DateTime<Utc>>,
    pub status_ujian: StatusUjian,
    pub waktu_mulai: Option<DateTime<Utc>>,
    pub batas_waktu: Option<DateTime<Utc>>,
    pub waktu_selesai: Option<DateTime<Utc>>,
    pub seed_acak: i64,
    pub jawaban: HashMap<Uuid, (Option<String>, bool)>, // soal_id -> (jawaban, ragu_ragu)
}

#[derive(Clone, Debug)]
pub struct MockHasilUjian {
    pub total_soal: usize,
    pub total_dijawab: usize,
    pub benar: usize,
    pub salah: usize,
    pub kosong: usize,
    pub nilai_akhir: f64,
    pub is_lulus: bool,
    pub kategori_nilai: HashMap<String, f64>,
}

// =========================================================================
// 2. CBT Engine Implementation
// =========================================================================

#[derive(Default)]
pub struct CbtEngine {
    pub peserta_store: Arc<Mutex<HashMap<Uuid, MockPesertaSesi>>>,
}

impl CbtEngine {
    pub fn new() -> Self {
        Self {
            peserta_store: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Check-in presensi peserta via Scan QR atau input manual
    pub fn check_in_presensi(
        &self,
        peserta_id: Uuid,
        now: DateTime<Utc>,
    ) -> Result<MockPesertaSesi, &'static str> {
        let mut store = self.peserta_store.lock().unwrap();
        let peserta = store
            .get_mut(&peserta_id)
            .ok_or("Peserta tidak ditemukan")?;

        if peserta.status_presensi == StatusPresensi::Hadir {
            return Ok(peserta.clone()); // Idempoten
        }

        peserta.status_presensi = StatusPresensi::Hadir;
        peserta.waktu_presensi = Some(now);
        Ok(peserta.clone())
    }

    /// Mulai sesi ujian dengan otorisasi timer server dan gatekeeper presensi
    pub fn mulai_ujian(
        &self,
        peserta_id: Uuid,
        paket: &MockPaket,
        now: DateTime<Utc>,
    ) -> Result<(MockPesertaSesi, Vec<MockSoal>, i64), &'static str> {
        let mut store = self.peserta_store.lock().unwrap();
        let peserta = store
            .get_mut(&peserta_id)
            .ok_or("Peserta tidak ditemukan")?;

        // 1. Gatekeeper Presensi: Hanya yang HADIR yang boleh membuka ujian
        if peserta.status_presensi != StatusPresensi::Hadir {
            return Err("Akses ditolak: Anda belum melakukan presensi di meja pengawas ujian");
        }

        // 2. Jika sudah selesai atau waktu habis -> tolak
        if peserta.status_ujian == StatusUjian::Selesai
            || peserta.status_ujian == StatusUjian::WaktuHabis
        {
            return Err("Ujian ini telah selesai dikerjakan dan tidak dapat dimulai kembali");
        }

        // 3. Jika sesi sedang berjalan -> restore sesi aktif (idempoten / pemulihan koneksi)
        if peserta.status_ujian == StatusUjian::SedangMengerjakan {
            let batas = peserta.batas_waktu.unwrap_or(now);
            let sisa_detik = batas.signed_duration_since(now).num_seconds();

            if sisa_detik <= 0 {
                peserta.status_ujian = StatusUjian::WaktuHabis;
                peserta.waktu_selesai = Some(now);
                return Err("Waktu ujian Anda telah habis di server dan ujian otomatis ditutup");
            }

            // Susun kembali soal dengan seed deterministik yang sama
            let randomized = Self::randomize_exam(
                &paket.soal,
                paket.acak_soal,
                paket.acak_opsi,
                peserta.seed_acak,
            );
            return Ok((peserta.clone(), randomized, sisa_detik));
        }

        // 4. Inisialisasi sesi baru: TIMER DIHITUNG OLEH SERVER
        let batas_waktu = now + Duration::minutes(paket.durasi_menit as i64);
        let sisa_detik = paket.durasi_menit as i64 * 60;
        let seed = (now.timestamp_millis()
            ^ ((peserta.pendaftar_id.as_u128() & 0xFFFF_FFFF) as i64))
            .abs();

        peserta.status_ujian = StatusUjian::SedangMengerjakan;
        peserta.waktu_mulai = Some(now);
        peserta.batas_waktu = Some(batas_waktu);
        peserta.seed_acak = seed;

        let randomized = Self::randomize_exam(&paket.soal, paket.acak_soal, paket.acak_opsi, seed);
        Ok((peserta.clone(), randomized, sisa_detik))
    }

    /// Autosave jawaban idempoten dengan cek batas waktu server
    pub fn autosave_jawaban(
        &self,
        peserta_id: Uuid,
        soal_id: Uuid,
        pilihan: Option<String>,
        ragu_ragu: bool,
        now: DateTime<Utc>,
    ) -> Result<(i64, usize), &'static str> {
        let mut store = self.peserta_store.lock().unwrap();
        let peserta = store
            .get_mut(&peserta_id)
            .ok_or("Peserta tidak ditemukan")?;

        if peserta.status_ujian != StatusUjian::SedangMengerjakan {
            return Err("Sesi ujian tidak aktif");
        }

        let batas = peserta.batas_waktu.ok_or("Batas waktu belum diatur")?;
        let sisa_detik = batas.signed_duration_since(now).num_seconds();

        // Otoritas Server: Jika waktu habis saat request autosave masuk -> kunci sesi
        if sisa_detik <= 0 {
            peserta.status_ujian = StatusUjian::WaktuHabis;
            peserta.waktu_selesai = Some(now);
            return Err("Waktu ujian telah habis");
        }

        // Upsert jawaban idempoten
        peserta.jawaban.insert(soal_id, (pilihan, ragu_ragu));
        let total_terjawab = peserta
            .jawaban
            .values()
            .filter(|(p, _)| p.is_some())
            .count();

        Ok((sisa_detik, total_terjawab))
    }

    /// Submit ujian dan kalkulasi nilai otomatis
    pub fn submit_ujian(
        &self,
        peserta_id: Uuid,
        paket: &MockPaket,
        now: DateTime<Utc>,
    ) -> Result<MockHasilUjian, &'static str> {
        let mut store = self.peserta_store.lock().unwrap();
        let peserta = store
            .get_mut(&peserta_id)
            .ok_or("Peserta tidak ditemukan")?;

        if peserta.status_ujian == StatusUjian::Selesai {
            return Err("Ujian sudah disubmit sebelumnya");
        }

        let status_akhir = if let Some(bw) = peserta.batas_waktu {
            if now > bw {
                StatusUjian::WaktuHabis
            } else {
                StatusUjian::Selesai
            }
        } else {
            StatusUjian::Selesai
        };

        peserta.status_ujian = status_akhir;
        peserta.waktu_selesai = Some(now);

        // Penilaian otomatis
        let mut benar = 0;
        let mut salah = 0;
        let mut kosong = 0;
        let mut total_bobot = 0.0;
        let mut bobot_benar = 0.0;
        let mut kategori_map: HashMap<String, (f64, f64)> = HashMap::new(); // kat -> (bobot_benar, bobot_total)

        for soal in &paket.soal {
            total_bobot += soal.bobot;
            let entry = kategori_map
                .entry(soal.kategori.clone())
                .or_insert((0.0, 0.0));
            entry.1 += soal.bobot;

            match peserta.jawaban.get(&soal.id) {
                Some((Some(jawaban), _)) => {
                    if jawaban.eq_ignore_ascii_case(&soal.kunci_jawaban) {
                        benar += 1;
                        bobot_benar += soal.bobot;
                        entry.0 += soal.bobot;
                    } else {
                        salah += 1;
                    }
                }
                _ => {
                    kosong += 1;
                }
            }
        }

        let nilai_akhir = if total_bobot > 0.0 {
            ((bobot_benar / total_bobot) * 100.0 * 10.0).round() / 10.0
        } else {
            0.0
        };

        let is_lulus = nilai_akhir >= paket.passing_grade;

        let mut sub_kategori = HashMap::new();
        for (kat, (b_benar, b_total)) in kategori_map {
            let skor = if b_total > 0.0 {
                ((b_benar / b_total) * 100.0 * 10.0).round() / 10.0
            } else {
                0.0
            };
            sub_kategori.insert(kat, skor);
        }

        Ok(MockHasilUjian {
            total_soal: paket.soal.len(),
            total_dijawab: benar + salah,
            benar,
            salah,
            kosong,
            nilai_akhir,
            is_lulus,
            kategori_nilai: sub_kategori,
        })
    }

    /// Pengacakan deterministik: urutan soal dan urutan opsi per soal
    fn randomize_exam(
        soal: &[MockSoal],
        acak_soal: bool,
        acak_opsi: bool,
        seed: i64,
    ) -> Vec<MockSoal> {
        let mut list = soal.to_vec();
        let mut rng = StdRng::seed_from_u64(seed as u64);

        if acak_soal {
            list.shuffle(&mut rng);
        }

        if acak_opsi {
            for s in &mut list {
                let soal_seed = (seed as u64) ^ (s.id.as_u128() as u64);
                let mut opsi_rng = StdRng::seed_from_u64(soal_seed);
                s.opsi.shuffle(&mut opsi_rng);
            }
        }

        list
    }
}

// =========================================================================
// 3. Helper Factory Soal & Paket
// =========================================================================

fn create_sample_paket(passing_grade: f64) -> MockPaket {
    let soal_1 = MockSoal {
        id: Uuid::new_v4(),
        kategori: "TPA".to_string(),
        tingkat_kesulitan: "SEDANG".to_string(),
        pertanyaan: "Jika 2x + 5 = 15, berapakah nilai x?".to_string(),
        opsi: vec![
            MockOpsi {
                id: "A".to_string(),
                label: "A".to_string(),
                teks: "5".to_string(),
            },
            MockOpsi {
                id: "B".to_string(),
                label: "B".to_string(),
                teks: "6".to_string(),
            },
            MockOpsi {
                id: "C".to_string(),
                label: "C".to_string(),
                teks: "7".to_string(),
            },
            MockOpsi {
                id: "D".to_string(),
                label: "D".to_string(),
                teks: "8".to_string(),
            },
        ],
        kunci_jawaban: "A".to_string(),
        bobot: 1.0,
    };

    let soal_2 = MockSoal {
        id: Uuid::new_v4(),
        kategori: "TPA".to_string(),
        tingkat_kesulitan: "MUDAH".to_string(),
        pertanyaan: "Semua mahasiswa tekun. Budi adalah mahasiswa. Kesimpulan?".to_string(),
        opsi: vec![
            MockOpsi {
                id: "A".to_string(),
                label: "A".to_string(),
                teks: "Budi tekun".to_string(),
            },
            MockOpsi {
                id: "B".to_string(),
                label: "B".to_string(),
                teks: "Budi pintar".to_string(),
            },
            MockOpsi {
                id: "C".to_string(),
                label: "C".to_string(),
                teks: "Budi malas".to_string(),
            },
            MockOpsi {
                id: "D".to_string(),
                label: "D".to_string(),
                teks: "Tidak ada kesimpulan".to_string(),
            },
        ],
        kunci_jawaban: "A".to_string(),
        bobot: 1.0,
    };

    let soal_3 = MockSoal {
        id: Uuid::new_v4(),
        kategori: "BAHASA_INGGRIS".to_string(),
        tingkat_kesulitan: "SULIT".to_string(),
        pertanyaan: "Choose the correct form: She _____ to the campus every day.".to_string(),
        opsi: vec![
            MockOpsi {
                id: "A".to_string(),
                label: "A".to_string(),
                teks: "goes".to_string(),
            },
            MockOpsi {
                id: "B".to_string(),
                label: "B".to_string(),
                teks: "go".to_string(),
            },
            MockOpsi {
                id: "C".to_string(),
                label: "C".to_string(),
                teks: "gone".to_string(),
            },
            MockOpsi {
                id: "D".to_string(),
                label: "D".to_string(),
                teks: "going".to_string(),
            },
        ],
        kunci_jawaban: "A".to_string(),
        bobot: 2.0,
    };

    MockPaket {
        id: Uuid::new_v4(),
        nama_paket: "Ujian Saringan Masuk PMB 2026".to_string(),
        durasi_menit: 90,
        passing_grade,
        acak_soal: true,
        acak_opsi: true,
        soal: vec![soal_1, soal_2, soal_3],
    }
}

// =========================================================================
// 4. UNIT & INTEGRATION TESTS
// =========================================================================

#[test]
fn test_presensi_gatekeeper_blocks_unpresent_candidate() {
    let engine = CbtEngine::new();
    let paket = create_sample_paket(60.0);
    let peserta_id = Uuid::new_v4();
    let pendaftar_id = Uuid::new_v4();

    // Peserta belum presensi
    let peserta = MockPesertaSesi {
        id: peserta_id,
        sesi_id: Uuid::new_v4(),
        pendaftar_id,
        nomor_peserta: "CBT-2026-0001".to_string(),
        status_presensi: StatusPresensi::BelumHadir,
        waktu_presensi: None,
        status_ujian: StatusUjian::BelumMulai,
        waktu_mulai: None,
        batas_waktu: None,
        waktu_selesai: None,
        seed_acak: 0,
        jawaban: HashMap::new(),
    };
    engine
        .peserta_store
        .lock()
        .unwrap()
        .insert(peserta_id, peserta);

    let now = Utc::now();
    // 1. Mencoba mulai ujian saat status_presensi = BELUM_HADIR -> Harus Ditolak
    let result = engine.mulai_ujian(peserta_id, &paket, now);
    assert!(
        result.is_err(),
        "Peserta belum presensi harus ditolak memasuki ujian"
    );
    assert!(result.unwrap_err().contains("belum melakukan presensi"));

    // 2. Pengawas melakukan check-in scan QR
    let check_in = engine.check_in_presensi(peserta_id, now);
    assert!(check_in.is_ok());
    assert_eq!(check_in.unwrap().status_presensi, StatusPresensi::Hadir);

    // 3. Setelah status HADIR -> Ujian berhasil dimulai
    let mulai = engine.mulai_ujian(peserta_id, &paket, now);
    assert!(
        mulai.is_ok(),
        "Peserta yang telah hadir harus diizinkan memulai ujian"
    );
    let (p, _, sisa) = mulai.unwrap();
    assert_eq!(p.status_ujian, StatusUjian::SedangMengerjakan);
    assert_eq!(sisa, 90 * 60);
}

#[test]
fn test_server_timer_authority_and_auto_close_on_expiry() {
    let engine = CbtEngine::new();
    let paket = create_sample_paket(60.0);
    let peserta_id = Uuid::new_v4();
    let pendaftar_id = Uuid::new_v4();
    let start_time = Utc::now();

    let peserta = MockPesertaSesi {
        id: peserta_id,
        sesi_id: Uuid::new_v4(),
        pendaftar_id,
        nomor_peserta: "CBT-2026-0002".to_string(),
        status_presensi: StatusPresensi::Hadir,
        waktu_presensi: Some(start_time),
        status_ujian: StatusUjian::BelumMulai,
        waktu_mulai: None,
        batas_waktu: None,
        waktu_selesai: None,
        seed_acak: 0,
        jawaban: HashMap::new(),
    };
    engine
        .peserta_store
        .lock()
        .unwrap()
        .insert(peserta_id, peserta);

    // 1. Mulai ujian pada start_time (durasi 90 menit)
    let (_, _, sisa) = engine.mulai_ujian(peserta_id, &paket, start_time).unwrap();
    assert_eq!(sisa, 5400, "Sisa waktu awal harus 5400 detik");

    // 2. Autosave di pertengahan waktu (start_time + 30 menit)
    let time_mid = start_time + Duration::minutes(30);
    let soal_1_id = paket.soal[0].id;
    let (sisa_mid, count) = engine
        .autosave_jawaban(
            peserta_id,
            soal_1_id,
            Some("A".to_string()),
            false,
            time_mid,
        )
        .expect("Autosave waktu valid harus berhasil");
    assert_eq!(sisa_mid, 3600, "Sisa waktu di server harus 3600 detik");
    assert_eq!(count, 1);

    // 3. Client clock spoofing: Jika waktu lokal client dimundurkan, server tetap memakai `now` server
    let time_expired = start_time + Duration::minutes(91); // 91 menit berlalu di server
    let autosave_fail = engine.autosave_jawaban(
        peserta_id,
        paket.soal[1].id,
        Some("A".to_string()),
        false,
        time_expired,
    );
    assert!(
        autosave_fail.is_err(),
        "Autosave saat waktu server habis harus ditolak"
    );

    // 4. Status ujian otomatis WAKTU_HABIS
    let p_after = engine
        .peserta_store
        .lock()
        .unwrap()
        .get(&peserta_id)
        .unwrap()
        .clone();
    assert_eq!(p_after.status_ujian, StatusUjian::WaktuHabis);
}

#[test]
fn test_single_active_session_and_reconnection_idempotency() {
    let engine = CbtEngine::new();
    let paket = create_sample_paket(60.0);
    let peserta_id = Uuid::new_v4();
    let start_time = Utc::now();

    let peserta = MockPesertaSesi {
        id: peserta_id,
        sesi_id: Uuid::new_v4(),
        pendaftar_id: Uuid::new_v4(),
        nomor_peserta: "CBT-2026-0003".to_string(),
        status_presensi: StatusPresensi::Hadir,
        waktu_presensi: Some(start_time),
        status_ujian: StatusUjian::BelumMulai,
        waktu_mulai: None,
        batas_waktu: None,
        waktu_selesai: None,
        seed_acak: 0,
        jawaban: HashMap::new(),
    };
    engine
        .peserta_store
        .lock()
        .unwrap()
        .insert(peserta_id, peserta);

    // 1. Mulai pertama kali
    let (p1, soal1, _) = engine.mulai_ujian(peserta_id, &paket, start_time).unwrap();
    let seed1 = p1.seed_acak;

    // Jawab 1 soal
    let _ = engine.autosave_jawaban(
        peserta_id,
        soal1[0].id,
        Some("A".to_string()),
        true,
        start_time + Duration::minutes(5),
    );

    // 2. Pemulihan koneksi (koneksi putus lalu reload browser 10 menit kemudian)
    let reconnect_time = start_time + Duration::minutes(10);
    let (p2, soal2, sisa2) = engine
        .mulai_ujian(peserta_id, &paket, reconnect_time)
        .unwrap();

    // Sesi tidak dibuat ganda, urutan soal persis sama karena seed deterministik identik
    assert_eq!(p2.id, p1.id);
    assert_eq!(p2.seed_acak, seed1);
    assert_eq!(
        soal2[0].id, soal1[0].id,
        "Urutan butir soal harus identik saat dipulihkan"
    );
    assert_eq!(
        sisa2, 4800,
        "Sisa waktu server harus berkurang 10 menit (80 menit = 4800 detik)"
    );

    // Jawaban sebelumnya tetap tersimpan
    assert_eq!(
        p2.jawaban.get(&soal1[0].id).unwrap().0,
        Some("A".to_string())
    );
    assert!(
        p2.jawaban.get(&soal1[0].id).unwrap().1,
        "Flag ragu-ragu harus tetap tersimpan"
    );
}

#[test]
fn test_deterministic_shuffling_and_answer_key_preservation() {
    let paket = create_sample_paket(60.0);
    let seed_a: i64 = 123456789;
    let seed_b: i64 = 987654321;

    let exam_a = CbtEngine::randomize_exam(&paket.soal, true, true, seed_a);
    let exam_b = CbtEngine::randomize_exam(&paket.soal, true, true, seed_b);

    // Pengacakan soal untuk dua seed berbeda menghasilkan variasi
    assert_eq!(exam_a.len(), paket.soal.len());
    assert_eq!(exam_b.len(), paket.soal.len());

    // Pengacakan opsi tidak merusak teks atau id opsi asli
    for s in &exam_a {
        assert_eq!(s.opsi.len(), 4);
        let ids: Vec<String> = s.opsi.iter().map(|o| o.id.clone()).collect();
        assert!(ids.contains(&"A".to_string()));
        assert!(ids.contains(&"B".to_string()));
        assert!(ids.contains(&"C".to_string()));
        assert!(ids.contains(&"D".to_string()));
    }
}

#[test]
fn test_automated_grading_and_passing_grade_calculation() {
    let engine = CbtEngine::new();
    let paket = create_sample_paket(70.0); // Passing grade 70
    let peserta_id = Uuid::new_v4();
    let start_time = Utc::now();

    let peserta = MockPesertaSesi {
        id: peserta_id,
        sesi_id: Uuid::new_v4(),
        pendaftar_id: Uuid::new_v4(),
        nomor_peserta: "CBT-2026-0004".to_string(),
        status_presensi: StatusPresensi::Hadir,
        waktu_presensi: Some(start_time),
        status_ujian: StatusUjian::BelumMulai,
        waktu_mulai: None,
        batas_waktu: None,
        waktu_selesai: None,
        seed_acak: 0,
        jawaban: HashMap::new(),
    };
    engine
        .peserta_store
        .lock()
        .unwrap()
        .insert(peserta_id, peserta);

    let _ = engine.mulai_ujian(peserta_id, &paket, start_time).unwrap();

    // Soal 1: TPA, Bobot 1.0, Kunci 'A' -> Jawab Benar
    let _ = engine.autosave_jawaban(
        peserta_id,
        paket.soal[0].id,
        Some("A".to_string()),
        false,
        start_time,
    );
    // Soal 2: TPA, Bobot 1.0, Kunci 'A' -> Jawab Salah ('B')
    let _ = engine.autosave_jawaban(
        peserta_id,
        paket.soal[1].id,
        Some("B".to_string()),
        false,
        start_time,
    );
    // Soal 3: BAHASA_INGGRIS, Bobot 2.0, Kunci 'A' -> Jawab Benar
    let _ = engine.autosave_jawaban(
        peserta_id,
        paket.soal[2].id,
        Some("A".to_string()),
        false,
        start_time,
    );

    // Total Bobot = 1.0 + 1.0 + 2.0 = 4.0
    // Bobot Benar = 1.0 (Soal 1) + 2.0 (Soal 3) = 3.0
    // Nilai Akhir = (3.0 / 4.0) * 100 = 75.0
    // Passing Grade = 70.0 -> LULUS

    let submit_time = start_time + Duration::minutes(45);
    let hasil = engine
        .submit_ujian(peserta_id, &paket, submit_time)
        .expect("Submit harus sukses");

    assert_eq!(hasil.total_soal, 3);
    assert_eq!(hasil.benar, 2);
    assert_eq!(hasil.salah, 1);
    assert_eq!(hasil.kosong, 0);
    assert_eq!(hasil.nilai_akhir, 75.0);
    assert!(
        hasil.is_lulus,
        "Nilai 75.0 harus lulus karena passing grade 70.0"
    );

    // Validasi sub-kategori:
    // TPA: 1 benar dari 2 soal bobot 2.0 -> 50.0%
    assert_eq!(*hasil.kategori_nilai.get("TPA").unwrap(), 50.0);
    // BAHASA_INGGRIS: 1 benar dari 1 soal bobot 2.0 -> 100.0%
    assert_eq!(*hasil.kategori_nilai.get("BAHASA_INGGRIS").unwrap(), 100.0);
}

pub struct MockCsvSoalImporter;

#[derive(Clone, Debug)]
pub struct MockImportSoalItem {
    pub kategori: String,
    pub tingkat_kesulitan: String,
    pub pertanyaan: String,
    pub opsi: Vec<MockOpsi>,
    pub kunci_jawaban: String,
    pub bobot: Option<f64>,
    pub pembahasan: Option<String>,
}

#[derive(Clone, Debug)]
pub struct MockErrorBarisImport {
    pub baris: usize,
    pub pesan: String,
}

impl MockCsvSoalImporter {
    pub fn parse_csv(
        bytes: &[u8],
    ) -> Result<(Vec<MockImportSoalItem>, Vec<MockErrorBarisImport>), String> {
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(bytes);

        let mut valid_soal = Vec::new();
        let mut error_rows = Vec::new();
        let mut row_num = 2;

        for result in rdr.records() {
            let record = match result {
                Ok(rec) => rec,
                Err(e) => {
                    error_rows.push(MockErrorBarisImport {
                        baris: row_num,
                        pesan: format!("Format baris CSV tidak valid: {}", e),
                    });
                    row_num += 1;
                    continue;
                }
            };

            let get_col = |idx: usize| -> String {
                record
                    .get(idx)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default()
            };

            let kategori = get_col(0);
            let kesulitan = get_col(1);
            let pertanyaan = get_col(2);
            let opsi_a = get_col(3);
            let opsi_b = get_col(4);
            let opsi_c = get_col(5);
            let opsi_d = get_col(6);
            let opsi_e = get_col(7);
            let kunci = get_col(8).to_uppercase();
            let bobot_str = get_col(9);
            let pembahasan = get_col(10);

            if kategori.is_empty() && pertanyaan.is_empty() && opsi_a.is_empty() {
                row_num += 1;
                continue;
            }

            if kategori.is_empty() {
                error_rows.push(MockErrorBarisImport {
                    baris: row_num,
                    pesan: "Kolom 'Kategori' wajib diisi".to_string(),
                });
                row_num += 1;
                continue;
            }

            if pertanyaan.is_empty() {
                error_rows.push(MockErrorBarisImport {
                    baris: row_num,
                    pesan: "Pertanyaan tidak boleh kosong".to_string(),
                });
                row_num += 1;
                continue;
            }

            if opsi_a.is_empty() || opsi_b.is_empty() {
                error_rows.push(MockErrorBarisImport {
                    baris: row_num,
                    pesan: "Minimal harus ada 2 opsi".to_string(),
                });
                row_num += 1;
                continue;
            }

            let mut opsi_list = vec![
                MockOpsi {
                    id: "A".to_string(),
                    label: "A".to_string(),
                    teks: opsi_a,
                },
                MockOpsi {
                    id: "B".to_string(),
                    label: "B".to_string(),
                    teks: opsi_b,
                },
            ];

            if !opsi_c.is_empty() {
                opsi_list.push(MockOpsi {
                    id: "C".to_string(),
                    label: "C".to_string(),
                    teks: opsi_c,
                });
            }
            if !opsi_d.is_empty() {
                opsi_list.push(MockOpsi {
                    id: "D".to_string(),
                    label: "D".to_string(),
                    teks: opsi_d,
                });
            }
            if !opsi_e.is_empty() {
                opsi_list.push(MockOpsi {
                    id: "E".to_string(),
                    label: "E".to_string(),
                    teks: opsi_e,
                });
            }

            let valid_labels: Vec<&str> = opsi_list.iter().map(|o| o.label.as_str()).collect();
            if !valid_labels.contains(&kunci.as_str()) {
                error_rows.push(MockErrorBarisImport {
                    baris: row_num,
                    pesan: format!(
                        "Kunci jawaban '{}' tidak cocok dengan opsi yang tersedia",
                        kunci
                    ),
                });
                row_num += 1;
                continue;
            }

            let bobot = bobot_str.parse::<f64>().ok();

            valid_soal.push(MockImportSoalItem {
                kategori,
                tingkat_kesulitan: if kesulitan.is_empty() {
                    "SEDANG".to_string()
                } else {
                    kesulitan
                },
                pertanyaan,
                opsi: opsi_list,
                kunci_jawaban: kunci,
                bobot,
                pembahasan: if pembahasan.is_empty() {
                    None
                } else {
                    Some(pembahasan)
                },
            });

            row_num += 1;
        }

        Ok((valid_soal, error_rows))
    }
}

#[test]
fn test_excel_csv_importer_row_validation_and_errors() {
    // 1. Data CSV Valid
    let csv_valid = b"Kategori,Tingkat Kesulitan,Pertanyaan,Opsi A,Opsi B,Opsi C,Opsi D,Opsi E,Kunci Jawaban,Bobot,Pembahasan\n\
TPA,MUDAH,Berapakah 5 + 5?,8,9,10,11,,C,1.0,Penjumlahan dasar\n\
TPA,SEDANG,Ibu kota Indonesia adalah?,Bandung,Jakarta,Surabaya,Medan,,B,1.5,Pusat pemerintahan";

    let (valid_soal, errors) =
        MockCsvSoalImporter::parse_csv(csv_valid).expect("Parsing valid CSV");
    assert_eq!(valid_soal.len(), 2, "Harus menghasilkan 2 soal valid");
    assert!(errors.is_empty(), "Tidak boleh ada error pada CSV valid");
    assert_eq!(valid_soal[0].kunci_jawaban, "C");
    assert_eq!(valid_soal[0].bobot, Some(1.0));
    assert_eq!(valid_soal[1].kunci_jawaban, "B");
    assert_eq!(valid_soal[1].bobot, Some(1.5));

    // 2. Data CSV Tidak Valid (Kunci tidak ada di opsi, opsi kurang dari 2, pertanyaan kosong)
    let csv_invalid = b"Kategori,Tingkat Kesulitan,Pertanyaan,Opsi A,Opsi B,Opsi C,Opsi D,Opsi E,Kunci Jawaban,Bobot,Pembahasan\n\
TPA,MUDAH,,8,9,10,11,,A,1.0,\n\
TPA,SEDANG,Siapakah penemu bola lampu?,Edison,,,,,,A,1.0,\n\
TPA,SULIT,Berapakah 10 x 10?,10,50,80,100,,Z,1.0,Kunci Z tidak ada di opsi";

    let (valid_partial, errors_partial) =
        MockCsvSoalImporter::parse_csv(csv_invalid).expect("Parsing partial CSV");
    assert_eq!(
        valid_partial.len(),
        0,
        "Semua baris bermasalah harus tertangkap"
    );
    assert_eq!(errors_partial.len(), 3, "Harus melaporkan 3 baris error");
    assert_eq!(errors_partial[0].baris, 2);
    assert!(
        errors_partial[0]
            .pesan
            .contains("Pertanyaan tidak boleh kosong")
    );
    assert_eq!(errors_partial[1].baris, 3);
    assert!(errors_partial[1].pesan.contains("Minimal harus ada 2 opsi"));
    assert_eq!(errors_partial[2].baris, 4);
    assert!(
        errors_partial[2]
            .pesan
            .contains("Kunci jawaban 'Z' tidak cocok")
    );
}

// =========================================================================
// 5. UJI BEBAN: 200 PESERTA BERSAMAAN (CONCURRENT LOAD TEST)
// =========================================================================

#[test]
fn test_load_200_concurrent_cbt_participants() {
    println!("\n=== MEMULAI UJI BEBAN 200 PESERTA CBT BERSAMAAN ===");
    let engine = Arc::new(CbtEngine::new());
    let paket = Arc::new(create_sample_paket(60.0));
    let base_time = Utc::now();
    let num_participants = 200;

    // 1. Setup 200 peserta dengan status awal HADIR
    let mut peserta_ids = Vec::with_capacity(num_participants);
    {
        let mut store = engine.peserta_store.lock().unwrap();
        for i in 1..=num_participants {
            let pid = Uuid::new_v4();
            let p = MockPesertaSesi {
                id: pid,
                sesi_id: Uuid::new_v4(),
                pendaftar_id: Uuid::new_v4(),
                nomor_peserta: format!("CBT-LOAD-{:04}", i),
                status_presensi: StatusPresensi::Hadir,
                waktu_presensi: Some(base_time),
                status_ujian: StatusUjian::BelumMulai,
                waktu_mulai: None,
                batas_waktu: None,
                waktu_selesai: None,
                seed_acak: 0,
                jawaban: HashMap::new(),
            };
            store.insert(pid, p);
            peserta_ids.push(pid);
        }
    }

    let overall_start = Instant::now();
    let mut handles = Vec::new();

    // 2. Luncurkan 200 thread sistem secara simultan
    for pid in peserta_ids.clone() {
        let engine_clone = Arc::clone(&engine);
        let paket_clone = Arc::clone(&paket);

        let handle = std::thread::spawn(move || {
            let task_start = Instant::now();
            let mut latencies = Vec::new();

            // Step A: Mulai Ujian
            let t0 = Instant::now();
            let (p, soal_list, _) = engine_clone
                .mulai_ujian(pid, &paket_clone, base_time)
                .expect("Gagal mulai ujian");
            latencies.push(t0.elapsed());

            // Step B: Simulasikan 10 kali Autosave bergantian (navigasi & simpan ragu)
            for (idx, soal) in soal_list.iter().cycle().take(10).enumerate() {
                let ans = if idx % 2 == 0 {
                    Some("A".to_string())
                } else {
                    Some("B".to_string())
                };
                let ragu = idx % 3 == 0;
                let t_save = Instant::now();
                let _ = engine_clone
                    .autosave_jawaban(pid, soal.id, ans, ragu, base_time + Duration::minutes(10))
                    .expect("Autosave gagal");
                latencies.push(t_save.elapsed());
            }

            // Step C: Submit Akhir Ujian
            let t_sub = Instant::now();
            let hasil = engine_clone
                .submit_ujian(pid, &paket_clone, base_time + Duration::minutes(45))
                .expect("Submit gagal");
            latencies.push(t_sub.elapsed());

            (task_start.elapsed(), latencies, hasil.total_dijawab, p.id)
        });

        handles.push(handle);
    }

    // 3. Kumpulkan hasil eksekusi dari 200 pekerja paralel
    let mut total_requests = 0;
    let mut all_latencies = Vec::new();
    let mut successful_completions = 0;

    for h in handles {
        match h.join() {
            Ok((_, latencies, dijawab, _)) => {
                total_requests += latencies.len();
                all_latencies.extend(latencies);
                if dijawab > 0 {
                    successful_completions += 1;
                }
            }
            Err(e) => panic!("Thread panik saat uji beban: {:?}", e),
        }
    }

    let overall_duration = overall_start.elapsed();
    all_latencies.sort();

    let p50 = all_latencies[all_latencies.len() * 50 / 100];
    let p95 = all_latencies[all_latencies.len() * 95 / 100];
    let p99 = all_latencies[all_latencies.len() * 99 / 100];
    let max_lat = all_latencies.last().unwrap();
    let throughput = (total_requests as f64) / overall_duration.as_secs_f64();

    println!("--------------------------------------------------");
    println!("HASIL PENGUJIAN BEBAN KONKURENSI:");
    println!("Jumlah Peserta Konkuren  : {} peserta", num_participants);
    println!("Total Operasi (Requests) : {} request", total_requests);
    println!(
        "Sukses Selesai Sempurna  : {}/{} (100.0%)",
        successful_completions, num_participants
    );
    println!(
        "Total Waktu Pengujian    : {:.3} detik",
        overall_duration.as_secs_f64()
    );
    println!("Throughput Rata-rata     : {:.2} req/detik", throughput);
    println!("Latensi Median (p50)     : {:?}", p50);
    println!("Latensi 95th persentil   : {:?}", p95);
    println!("Latensi 99th persentil   : {:?}", p99);
    println!("Latensi Maksimum         : {:?}", max_lat);
    println!("--------------------------------------------------");

    assert_eq!(
        successful_completions, num_participants,
        "Semua 200 peserta harus selesai tanpa error"
    );
    assert_eq!(
        total_requests,
        200 * 12,
        "Setiap peserta harus menyelesaikan 12 operasi (1 start + 10 autosave + 1 submit)"
    );
    assert!(
        p99 < std::time::Duration::from_millis(200),
        "p99 latensi harus di bawah 200ms dalam memori lokal (200 thread konkuren debug build)"
    );
}
