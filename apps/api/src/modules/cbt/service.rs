use chrono::{DateTime, Duration, Utc};
use rand::SeedableRng;
use rand::rngs::StdRng;
use rand::seq::SliceRandom;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        cbt::{
            dto::{
                AutosaveJawabanRequest, AutosaveJawabanResponse, CreatePaketRequest,
                LaporPelanggaranRequest, LaporPelanggaranResponse,
                CreateSesiRequest, ImportSoalResultResponse, LivePesertaStatusItem,
                MulaiUjianCbtResponse, PresensiCheckInRequest, PresensiCheckInResponse,
                SesiCalonInfoResponse, SoalCbtPesertaResponse, SoalOpsiDto, SubmitUjianResponse,
            },
            excel_importer::ExcelSoalImporter,
            model::{BankSoal, PaketUjian, PesertaSesi, SesiUjian},
            repository::CbtRepository,
        },
        email_queue::repository::EmailQueueRepository,
    },
};

#[derive(Clone)]
pub struct CbtService {
    repo: CbtRepository,
}

impl CbtService {
    pub fn new(repo: CbtRepository) -> Self {
        Self { repo }
    }

    // =========================================================================
    // 1. CALON MAHASISWA: INFORMASI & STATUS SESI
    // =========================================================================

    pub async fn get_my_sesi_info(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<SesiCalonInfoResponse, AppError> {
        let peserta_opt = self
            .repo
            .find_active_session_for_pendaftar(pendaftar_id)
            .await?;
        let peserta = match peserta_opt {
            Some(p) => p,
            None => match self
                .repo
                .find_latest_session_for_pendaftar(pendaftar_id)
                .await?
            {
                Some(p) => p,
                None => {
                    return Ok(SesiCalonInfoResponse {
                        sesi_id: None,
                        nama_sesi: None,
                        jadwal_mulai: None,
                        jadwal_selesai: None,
                        ruang: None,
                        durasi_menit: 60,
                        total_soal: 0,
                        passing_grade: 65.0,
                        nomor_peserta: "-".to_string(),
                        status_presensi: "BELUM_HADIR".to_string(),
                        status_ujian: "MENUNGGU".to_string(),
                        waktu_mulai: None,
                        batas_waktu: None,
                        sisa_detik: 0,
                        can_start: false,
                        pesan: Some(
                            "Anda belum dialokasikan ke dalam jadwal sesi ujian CBT. Silakan hubungi panitia PMB."
                                .to_string(),
                        ),
                    });
                }
            },
        };

        let sesi = self
            .repo
            .find_sesi_by_id(peserta.sesi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sesi ujian tidak ditemukan".to_string()))?;

        let paket = self
            .repo
            .find_paket_by_id(sesi.paket_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Paket ujian tidak ditemukan".to_string()))?;

        let now = Utc::now();
        let sisa_detik = if let Some(bw) = peserta.batas_waktu {
            if peserta.status_ujian == "SEDANG_MENGERJAKAN" {
                let diff = (bw - now).num_seconds();
                if diff > 0 { diff } else { 0 }
            } else {
                0
            }
        } else {
            (paket.durasi_menit as i64) * 60
        };

        let is_hadir = peserta.status_presensi == "HADIR";
        let is_in_progress = peserta.status_ujian == "SEDANG_MENGERJAKAN";
        let can_start = (is_hadir && peserta.status_ujian == "MENUNGGU") || is_in_progress;

        let pesan = if !is_hadir {
            Some(
                "Presensi Diperlukan: Tunjukkan kartu peserta PMB Anda kepada pengawas ruang untuk scan QR check-in sebelum memulai ujian."
                    .to_string(),
            )
        } else if peserta.status_ujian == "SELESAI" || peserta.status_ujian == "WAKTU_HABIS" {
            Some("Anda telah menyelesaikan ujian CBT seleksi PMB ini.".to_string())
        } else {
            None
        };

        Ok(SesiCalonInfoResponse {
            sesi_id: Some(sesi.id),
            nama_sesi: Some(sesi.nama_sesi),
            jadwal_mulai: Some(sesi.jadwal_mulai),
            jadwal_selesai: Some(sesi.jadwal_selesai),
            ruang: Some(sesi.ruang),
            durasi_menit: paket.durasi_menit,
            total_soal: paket.total_soal,
            passing_grade: paket.passing_grade,
            nomor_peserta: peserta.nomor_peserta,
            status_presensi: peserta.status_presensi,
            status_ujian: peserta.status_ujian,
            waktu_mulai: peserta.waktu_mulai,
            batas_waktu: peserta.batas_waktu,
            sisa_detik,
            can_start,
            pesan,
        })
    }

    // =========================================================================
    // 2. CALON MAHASISWA: MULAI SESI UJIAN (SERVER TIMER + ACAK SOAL/OPSI)
    // =========================================================================

    pub async fn mulai_ujian_calon(
        &self,
        pendaftar_id: Uuid,
        ip: Option<&str>,
        ua: Option<&str>,
    ) -> Result<MulaiUjianCbtResponse, AppError> {
        let now = Utc::now();

        // Cek jika sudah ada sesi yang SEDANG_MENGERJAKAN -> Pulihkan sesi yang sama
        if let Some(active_session) = self
            .repo
            .find_active_session_for_pendaftar(pendaftar_id)
            .await?
        {
            return self.restore_active_session(active_session, now).await;
        }

        // Ambil sesi terdaftar calon
        let peserta = self
            .repo
            .find_latest_session_for_pendaftar(pendaftar_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Anda belum terdaftar dalam sesi ujian CBT".to_string())
            })?;

        // GATEKEEPER PRESENSI: Wajib sudah HADIR
        if peserta.status_presensi != "HADIR" {
            return Err(AppError::Forbidden(
                "Akses Ujian Terkunci: Anda belum melakukan presensi. Silakan scan kartu peserta Anda di meja pengawas."
                    .to_string(),
            ));
        }

        if peserta.status_ujian == "SELESAI" || peserta.status_ujian == "WAKTU_HABIS" {
            return Err(AppError::BadRequest(
                "Anda telah menyelesaikan sesi ujian seleksi ini. Ujian hanya dapat diambil satu kali."
                    .to_string(),
            ));
        }

        let sesi = self
            .repo
            .find_sesi_by_id(peserta.sesi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sesi ujian tidak ditemukan".to_string()))?;

        let paket = self
            .repo
            .find_paket_by_id(sesi.paket_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Paket ujian tidak ditemukan".to_string()))?;

        let soal_raw = self.repo.get_soal_by_paket(paket.id).await?;
        if soal_raw.is_empty() {
            return Err(AppError::NotFound(
                "Belum ada butir soal dalam paket ujian ini".to_string(),
            ));
        }

        // Generate seed deterministik untuk pengacakan soal & opsi per peserta
        let seed = (now.timestamp_millis() ^ ((pendaftar_id.as_u128() & 0xFFFF_FFFF) as i64)).abs();
        let mut rng = StdRng::seed_from_u64(seed as u64);

        let mut shuffled_soal = soal_raw;
        if paket.acak_soal {
            shuffled_soal.shuffle(&mut rng);
        }

        let urutan_ids: Vec<Uuid> = shuffled_soal.iter().map(|s| s.id).collect();
        let urutan_json = serde_json::to_value(&urutan_ids).unwrap_or_default();

        // Durasi dihitung di server
        if now > sesi.jadwal_selesai {
            return Err(AppError::Forbidden(
                "Jadwal sesi ujian Anda telah berakhir. Hubungi panitia PMB.".to_string(),
            ));
        }
        if now < sesi.jadwal_mulai {
            return Err(AppError::Forbidden(
                "Sesi ujian belum dibuka. Tunggu hingga jadwal mulai sesi Anda.".to_string(),
            ));
        }

        // Waktu dihitung di SERVER dan tidak boleh melewati penutupan sesi
        let batas_waktu =
            (now + Duration::minutes(paket.durasi_menit as i64)).min(sesi.jadwal_selesai);

        let started_peserta = self
            .repo
            .start_peserta_session(peserta.id, batas_waktu, seed, urutan_json, ip, ua)
            .await?;

        // Format respon soal
        let daftar_soal = Self::format_soal_peserta(&shuffled_soal, paket.acak_opsi, seed, &[]);

        Ok(MulaiUjianCbtResponse {
            peserta_sesi_id: started_peserta.id,
            sesi_id: sesi.id,
            judul_paket: paket.nama_paket,
            durasi_menit: paket.durasi_menit,
            passing_grade: paket.passing_grade,
            waktu_mulai: now,
            batas_waktu,
            sisa_detik: (paket.durasi_menit as i64) * 60,
            total_soal: daftar_soal.len(),
            daftar_soal,
        })
    }

    async fn restore_active_session(
        &self,
        peserta: PesertaSesi,
        now: DateTime<Utc>,
    ) -> Result<MulaiUjianCbtResponse, AppError> {
        let sesi = self
            .repo
            .find_sesi_by_id(peserta.sesi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sesi ujian tidak ditemukan".to_string()))?;

        let paket = self
            .repo
            .find_paket_by_id(sesi.paket_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Paket ujian tidak ditemukan".to_string()))?;

        let batas_waktu = peserta.batas_waktu.unwrap_or(now);
        let sisa_detik = batas_waktu.signed_duration_since(now).num_seconds();

        // Jika waktu di server sudah habis -> auto submit
        if sisa_detik <= 0 {
            let _ = self.submit_ujian_calon(peserta.pendaftar_id).await;
            return Err(AppError::BadRequest(
                "Waktu ujian Anda telah habis dan jawaban telah otomatis disubmit".to_string(),
            ));
        }

        let soal_raw = self.repo.get_soal_by_paket(paket.id).await?;
        let jawaban_peserta = self.repo.get_jawaban_peserta(peserta.id).await?;

        // Rekonstruksi urutan soal berdasarkan urutan_soal_ids yang tersimpan
        let ordered_soal = if let Some(serde_json::Value::Array(ids)) = &peserta.urutan_soal_ids {
            let mut map: HashMap<Uuid, BankSoal> =
                soal_raw.into_iter().map(|s| (s.id, s)).collect();
            let mut list = Vec::new();
            for val in ids {
                if let Some(id_str) = val.as_str() {
                    if let Ok(id) = Uuid::parse_str(id_str) {
                        if let Some(s) = map.remove(&id) {
                            list.push(s);
                        }
                    }
                }
            }
            list
        } else {
            soal_raw
        };

        let daftar_soal = Self::format_soal_peserta(
            &ordered_soal,
            paket.acak_opsi,
            peserta.seed_acak,
            &jawaban_peserta,
        );

        Ok(MulaiUjianCbtResponse {
            peserta_sesi_id: peserta.id,
            sesi_id: sesi.id,
            judul_paket: paket.nama_paket,
            durasi_menit: paket.durasi_menit,
            passing_grade: paket.passing_grade,
            waktu_mulai: peserta.waktu_mulai.unwrap_or(now),
            batas_waktu,
            sisa_detik,
            total_soal: daftar_soal.len(),
            daftar_soal,
        })
    }

    fn format_soal_peserta(
        soal_list: &[BankSoal],
        acak_opsi: bool,
        seed: i64,
        jawaban_existing: &[crate::modules::cbt::model::JawabanPeserta],
    ) -> Vec<SoalCbtPesertaResponse> {
        let answer_map: HashMap<Uuid, (Option<String>, bool)> = jawaban_existing
            .iter()
            .map(|j| (j.soal_id, (j.pilihan_jawaban.clone(), j.ragu_ragu)))
            .collect();

        soal_list
            .iter()
            .enumerate()
            .map(|(idx, s)| {
                let mut raw_opsi: Vec<SoalOpsiDto> =
                    serde_json::from_value(s.opsi_jawaban.clone()).unwrap_or_default();

                // Pastikan id asli opsi terisi (jika kosong, gunakan label asal)
                for opt in &mut raw_opsi {
                    if opt.id.is_empty() {
                        opt.id = opt.label.clone();
                    }
                }

                if acak_opsi {
                    // Acak opsi deterministik per soal menggunakan seed gabungan
                    let soal_seed = (seed as u64) ^ (s.id.as_u128() as u64);
                    let mut rng = StdRng::seed_from_u64(soal_seed);
                    raw_opsi.shuffle(&mut rng);
                }

                // Tetapkan label tampilan urut ('A', 'B', 'C', 'D', 'E') dari atas ke bawah
                for (opt_idx, opt) in raw_opsi.iter_mut().enumerate() {
                    opt.label = match opt_idx {
                        0 => "A",
                        1 => "B",
                        2 => "C",
                        3 => "D",
                        4 => "E",
                        _ => "?",
                    }
                    .to_string();
                }

                let existing = answer_map.get(&s.id);
                let jawaban_terpilih = existing.and_then(|e| e.0.clone());
                let ragu_ragu = existing.map(|e| e.1).unwrap_or(false);

                SoalCbtPesertaResponse {
                    id: s.id,
                    nomor_urut: (idx + 1) as i32,
                    kategori: s.kategori.clone(),
                    bobot: s.bobot,
                    pertanyaan: s.pertanyaan.clone(),
                    gambar_url: s.gambar_url.clone(),
                    opsi_jawaban: raw_opsi,
                    jawaban_terpilih,
                    ragu_ragu,
                }
            })
            .collect()
    }

    // =========================================================================
    // 3. CALON MAHASISWA: AUTOSAVE JAWABAN & SUBMIT
    // =========================================================================

    /// Mencatat pelanggaran integritas dari klien. Server sebagai penentu:
    /// setelah melewati batas, ujian otomatis disubmit.
    pub async fn lapor_pelanggaran(
        &self,
        pendaftar_id: Uuid,
        req: LaporPelanggaranRequest,
        ip: Option<&str>,
    ) -> Result<LaporPelanggaranResponse, AppError> {
        const BATAS: i64 = 5;
        const JENIS: [&str; 10] = [
            "TAB_PINDAH",
            "WINDOW_BLUR",
            "FULLSCREEN_KELUAR",
            "COPY",
            "PASTE",
            "CUT",
            "KLIK_KANAN",
            "DEVTOOLS",
            "CETAK",
            "SHORTCUT",
        ];
        let peserta = self
            .repo
            .find_active_session_for_pendaftar(pendaftar_id)
            .await?
            .ok_or_else(|| AppError::BadRequest("Tidak ada sesi ujian aktif".to_string()))?;

        if !JENIS.contains(&req.jenis.as_str()) {
            return Err(AppError::BadRequest(
                "Jenis pelanggaran tidak dikenal".to_string(),
            ));
        }
        self.repo
            .insert_pelanggaran(peserta.id, &req.jenis, req.detail.as_deref(), ip)
            .await?;
        let total = self.repo.count_pelanggaran(peserta.id).await?;
        let auto = total >= BATAS;
        if auto {
            let _ = self.submit_ujian_calon(pendaftar_id).await;
        }
        Ok(LaporPelanggaranResponse {
            total_pelanggaran: total,
            batas_pelanggaran: BATAS,
            auto_submitted: auto,
        })
    }

    pub async fn autosave_jawaban(
        &self,
        pendaftar_id: Uuid,
        req: AutosaveJawabanRequest,
    ) -> Result<AutosaveJawabanResponse, AppError> {
        let peserta = self
            .repo
            .find_active_session_for_pendaftar(pendaftar_id)
            .await?
            .ok_or_else(|| AppError::BadRequest("Tidak ada sesi ujian aktif".to_string()))?;

        let now = Utc::now();
        let batas = peserta.batas_waktu.unwrap_or(now);
        let sisa_detik = (batas - now).num_seconds();

        // Validasi Timer Server
        if sisa_detik <= 0 {
            // Waktu habis -> Auto submit
            let _ = self.submit_ujian_calon(pendaftar_id).await;
            return Ok(AutosaveJawabanResponse {
                status: "expired".to_string(),
                soal_id: req.soal_id,
                sisa_detik: 0,
                is_expired: true,
            });
        }

        // Soal harus bagian dari susunan soal peserta ini; format pilihan dibatasi
        let soal_valid = match &peserta.urutan_soal_ids {
            Some(serde_json::Value::Array(ids)) => ids
                .iter()
                .any(|v| v.as_str() == Some(req.soal_id.to_string().as_str())),
            _ => false,
        };
        if !soal_valid {
            return Err(AppError::BadRequest(
                "Soal tidak termasuk dalam sesi ujian Anda".to_string(),
            ));
        }
        if let Some(p) = req.pilihan_jawaban.as_deref() {
            if p.is_empty() || p.len() > 10 || !p.chars().all(|c| c.is_ascii_alphanumeric()) {
                return Err(AppError::BadRequest(
                    "Format pilihan jawaban tidak valid".to_string(),
                ));
            }
        }

        self.repo
            .autosave_jawaban(
                peserta.id,
                req.soal_id,
                req.pilihan_jawaban.as_deref(),
                req.ragu_ragu,
            )
            .await?;

        Ok(AutosaveJawabanResponse {
            status: "saved".to_string(),
            soal_id: req.soal_id,
            sisa_detik,
            is_expired: false,
        })
    }

    pub async fn submit_ujian_calon(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<SubmitUjianResponse, AppError> {
        let peserta = match self
            .repo
            .find_active_session_for_pendaftar(pendaftar_id)
            .await?
        {
            Some(p) => p,
            None => {
                // Cek jika sudah selesai sebelumnya
                let hasil = self.repo.get_hasil_by_pendaftar(pendaftar_id).await?;
                if let Some(h) = hasil {
                    return Ok(SubmitUjianResponse {
                        peserta_sesi_id: h.peserta_sesi_id,
                        total_soal: h.total_soal,
                        total_dijawab: h.total_dijawab,
                        jumlah_benar: h.jumlah_benar,
                        jumlah_salah: h.jumlah_salah,
                        jumlah_kosong: h.jumlah_kosong,
                        nilai_akhir: h.nilai_akhir,
                        is_lulus: h.is_lulus,
                        passing_grade: 65.0,
                        kategori_nilai: h.kategori_nilai.unwrap_or_default(),
                        waktu_submit: h.waktu_submit,
                    });
                }
                return Err(AppError::BadRequest(
                    "Tidak ada sesi ujian aktif yang dapat disubmit".to_string(),
                ));
            }
        };

        let sesi = self
            .repo
            .find_sesi_by_id(peserta.sesi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sesi ujian tidak ditemukan".to_string()))?;

        let paket = self
            .repo
            .find_paket_by_id(sesi.paket_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Paket ujian tidak ditemukan".to_string()))?;

        let soal_raw = self.repo.get_soal_by_paket(paket.id).await?;
        let jawaban_peserta = self.repo.get_jawaban_peserta(peserta.id).await?;

        // Evaluasi Penilaian Otomatis
        let answer_map: HashMap<Uuid, String> = jawaban_peserta
            .into_iter()
            .filter_map(|j| j.pilihan_jawaban.map(|p| (j.soal_id, p)))
            .collect();

        let mut total_bobot = 0.0;
        let mut bobot_benar = 0.0;
        let mut benar = 0;
        let mut salah = 0;
        let mut kosong = 0;
        let mut kategori_map: HashMap<String, (f64, f64)> = HashMap::new(); // Kategori -> (bobot_benar, total_bobot)

        for s in &soal_raw {
            total_bobot += s.bobot;
            let entry = kategori_map.entry(s.kategori.clone()).or_insert((0.0, 0.0));
            entry.1 += s.bobot;

            if let Some(pilihan) = answer_map.get(&s.id) {
                if pilihan.trim().eq_ignore_ascii_case(&s.kunci_jawaban) {
                    benar += 1;
                    bobot_benar += s.bobot;
                    entry.0 += s.bobot;
                } else {
                    salah += 1;
                }
            } else {
                kosong += 1;
            }
        }

        let nilai_akhir = if total_bobot > 0.0 {
            ((bobot_benar / total_bobot) * 100.0 * 100.0).round() / 100.0
        } else {
            0.0
        };

        let is_lulus = nilai_akhir >= paket.passing_grade;

        // Breakdown per kategori
        let mut kategori_nilai = serde_json::Map::new();
        for (kat, (b_benar, b_total)) in kategori_map {
            let skor_kat = if b_total > 0.0 {
                ((b_benar / b_total) * 100.0 * 10.0).round() / 10.0
            } else {
                0.0
            };
            kategori_nilai.insert(kat, serde_json::Value::from(skor_kat));
        }

        let now = Utc::now();
        let status_akhir = if let Some(bw) = peserta.batas_waktu {
            if now > bw { "WAKTU_HABIS" } else { "SELESAI" }
        } else {
            "SELESAI"
        };

        self.repo
            .finish_peserta_session(peserta.id, status_akhir)
            .await?;

        let hasil = self
            .repo
            .save_hasil_ujian(
                peserta.id,
                peserta.pendaftar_id,
                soal_raw.len() as i32,
                benar + salah,
                benar,
                salah,
                kosong,
                nilai_akhir,
                is_lulus,
                serde_json::Value::Object(kategori_nilai.clone()),
            )
            .await?;

        // Enqueue email pemberitahuan ujian selesai jika data user tersedia
        let user_info: Option<(String, String)> = sqlx::query_as(
            "SELECT u.email, u.nama_lengkap FROM pendaftar p JOIN users u ON u.id = p.user_id WHERE p.id = $1"
        )
        .bind(peserta.pendaftar_id)
        .fetch_optional(self.repo.pool())
        .await
        .unwrap_or(None);

        if let Some((to_email, to_name)) = user_info {
            let email_repo = EmailQueueRepository::new(self.repo.pool().clone());
            let _ = email_repo
                .enqueue(
                    &to_email,
                    &to_name,
                    "Hasil Pelaksanaan Ujian Seleksi CBT PMB",
                    &format!(
                        "Halo {}, Ujian seleksi CBT Anda telah selesai tercatat di sistem dengan nilai akhir {:.2}. Pengumuman hasil akhir dapat dipantau melalui portal PMB.",
                        to_name, nilai_akhir
                    ),
                    &format!(
                        "<p>Halo <strong>{}</strong>,</p><p>Ujian seleksi CBT Anda telah selesai tercatat di sistem dengan nilai akhir <strong>{:.2}</strong>.</p><p>Pengumuman kelulusan resmi dapat dipantau melalui portal PMB.</p>",
                        to_name, nilai_akhir
                    ),
                    "HASIL_UJIAN_CBT",
                    Some(peserta.pendaftar_id),
                )
                .await;
        }

        Ok(SubmitUjianResponse {
            peserta_sesi_id: peserta.id,
            total_soal: hasil.total_soal,
            total_dijawab: hasil.total_dijawab,
            jumlah_benar: hasil.jumlah_benar,
            jumlah_salah: hasil.jumlah_salah,
            jumlah_kosong: hasil.jumlah_kosong,
            nilai_akhir: hasil.nilai_akhir,
            is_lulus: hasil.is_lulus,
            passing_grade: paket.passing_grade,
            kategori_nilai: serde_json::Value::Object(kategori_nilai),
            waktu_submit: hasil.waktu_submit,
        })
    }

    // =========================================================================
    // 4. PENGAWAS: PRESENSI & LIVE MONITOR
    // =========================================================================

    pub async fn check_in_presensi(
        &self,
        pengawas_id: Uuid,
        req: PresensiCheckInRequest,
    ) -> Result<PresensiCheckInResponse, AppError> {
        let (peserta, nama_peserta, nama_sesi) = self
            .repo
            .find_peserta_by_nomor_or_qr(&req.nomor_peserta_atau_qr, req.sesi_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound(
                    "Data peserta ujian tidak ditemukan berdasarkan nomor/QR yang dipindai"
                        .to_string(),
                )
            })?;

        let updated = self
            .repo
            .record_presensi(
                peserta.id,
                Some(pengawas_id),
                if req.nomor_peserta_atau_qr.len() > 20 {
                    "QR_SCAN"
                } else {
                    "MANUAL_PENGAWAS"
                },
            )
            .await?;

        Ok(PresensiCheckInResponse {
            peserta_id: updated.id,
            nomor_peserta: updated.nomor_peserta,
            nama_peserta,
            nama_sesi,
            status_presensi: updated.status_presensi,
            waktu_presensi: updated.waktu_presensi.unwrap_or_else(Utc::now),
            pesan: "Presensi berhasil dicatat. Peserta diizinkan memulai ujian CBT.".to_string(),
        })
    }

    pub async fn get_live_sesi_snapshot(
        &self,
        sesi_id: Uuid,
    ) -> Result<Vec<LivePesertaStatusItem>, AppError> {
        self.repo.get_sesi_live_snapshot(sesi_id).await
    }

    pub async fn get_live_monitor_data(
        &self,
        sesi_id: Uuid,
    ) -> Result<crate::modules::cbt::dto::LiveMonitorStreamResponse, AppError> {
        let sesi = self
            .repo
            .find_sesi_by_id(sesi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sesi ujian tidak ditemukan".to_string()))?;

        let peserta = self.repo.get_sesi_live_snapshot(sesi_id).await?;
        let total_peserta = peserta.len();
        let total_hadir = peserta
            .iter()
            .filter(|p| p.status_presensi == "HADIR")
            .count();
        let total_sedang_mengerjakan = peserta
            .iter()
            .filter(|p| p.status_ujian == "SEDANG_MENGERJAKAN")
            .count();
        let total_selesai = peserta
            .iter()
            .filter(|p| p.status_ujian == "SELESAI" || p.status_ujian == "WAKTU_HABIS")
            .count();

        Ok(crate::modules::cbt::dto::LiveMonitorStreamResponse {
            sesi_id,
            nama_sesi: sesi.nama_sesi,
            total_kuota: sesi.kuota,
            total_peserta,
            total_hadir,
            total_sedang_mengerjakan,
            total_selesai,
            peserta,
        })
    }

    // =========================================================================
    // 5. ADMIN: BANK SOAL, PAKET, & SESI
    // =========================================================================

    pub async fn import_soal_excel(
        &self,
        bytes: &[u8],
        file_name: &str,
    ) -> Result<ImportSoalResultResponse, AppError> {
        let (valid_list, error_rows) =
            ExcelSoalImporter::parse_file(bytes, file_name).map_err(|e| AppError::BadRequest(e))?;

        let total_baris = valid_list.len() + error_rows.len();
        let total_sukses = if !valid_list.is_empty() {
            self.repo.create_soal_batch(&valid_list).await?
        } else {
            0
        };

        Ok(ImportSoalResultResponse {
            total_baris,
            total_sukses,
            total_gagal: error_rows.len(),
            error_baris: error_rows,
        })
    }

    pub async fn create_paket(&self, req: CreatePaketRequest) -> Result<PaketUjian, AppError> {
        self.repo
            .create_paket(
                &req.nama_paket,
                req.deskripsi.as_deref(),
                req.durasi_menit,
                req.passing_grade,
                req.acak_soal,
                req.acak_opsi,
                &req.soal_ids,
            )
            .await
    }

    pub async fn create_sesi(&self, req: CreateSesiRequest) -> Result<SesiUjian, AppError> {
        self.repo
            .create_sesi(
                req.paket_id,
                &req.nama_sesi,
                req.jadwal_mulai,
                req.jadwal_selesai,
                &req.ruang,
                req.kuota,
            )
            .await
    }
}
