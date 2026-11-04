use std::collections::HashMap;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        kelulusan::{
            dto::{
                ApprovalSidangRequest, CekKelulusanCalonResponse, CekKelulusanPublikResponse,
                DaftarUlangInfoResponse, DrafKelulusanResponse, EksporSiakadItemDto,
                GenerateNimResponse, HasilKelulusanResponse, MahasiswaDaftarUlangDto,
                ProsesRankingRequest, TagihanDaftarUlangDto, UpdateRumusRequest,
                UpdateStatusKandidatRequest, UploadBerkasDaftarUlangRequest,
                VerifikasiBerkasDaftarUlangRequest,
            },
            model::{BerkasDaftarUlang, HasilKelulusan, RumusPenilaianJalur, SidangKelulusan},
            pdf::{LoaPdfData, generate_loa_pdf},
            repository::KelulusanRepository,
        },
        master::repository::MasterRepository,
        pendaftaran::repository::PendaftaranRepository,
    },
};

// ==============================================================================
// Logika Murni: Hitung Skor, Ranking, & Format NIM
// ==============================================================================

pub fn hitung_skor_bobot(
    skor_cbt: f64,
    nilai_rapor: f64,
    nilai_prestasi: f64,
    nilai_wawancara: f64,
    rumus: &RumusPenilaianJalur,
) -> f64 {
    let total_bobot =
        rumus.bobot_cbt + rumus.bobot_rapor + rumus.bobot_prestasi + rumus.bobot_wawancara;
    if total_bobot <= 0.0 {
        return (skor_cbt * 0.5) + (nilai_rapor * 0.3) + (nilai_prestasi * 0.2);
    }
    let skor = (skor_cbt * rumus.bobot_cbt)
        + (nilai_rapor * rumus.bobot_rapor)
        + (nilai_prestasi * rumus.bobot_prestasi)
        + (nilai_wawancara * rumus.bobot_wawancara);
    (skor / total_bobot * 100.0).round() / 100.0
}

pub fn format_nim_resmi(tahun: i32, jenjang: &str, kode_prodi: &str, sequence: i32) -> String {
    let thn = tahun % 100;
    let j_code = match jenjang {
        "S1" => "1",
        "D3" => "3",
        "D4" => "4",
        "S2" => "2",
        _ => "1",
    };
    // Menggunakan 2 digit prodi atau kode prodi yang ada
    let clean_kode = if kode_prodi.len() >= 2 {
        &kode_prodi[kode_prodi.len() - 2..]
    } else {
        kode_prodi
    };
    format!("{:02}{}{:0>2}{:04}", thn, j_code, clean_kode, sequence)
}

pub fn format_nomor_loa(tahun: i32, sequence: i32) -> String {
    format!("SK/PMB-UPT/{}/{:04}", tahun, sequence)
}

pub fn mask_nama(nama: &str) -> String {
    let clean = nama.trim();
    if clean.is_empty() {
        return "Calon Mahasiswa".to_string();
    }
    clean
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    let rest_count = chars.count();
                    if rest_count > 0 {
                        format!("{}{}", first, "*".repeat(rest_count))
                    } else {
                        first.to_string()
                    }
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ==============================================================================
// Service Layer
// ==============================================================================

#[derive(Clone)]
pub struct KelulusanService {
    repo: KelulusanRepository,
    pendaftar_repo: PendaftaranRepository,
    master_repo: MasterRepository,
}

impl KelulusanService {
    pub fn new(
        repo: KelulusanRepository,
        pendaftar_repo: PendaftaranRepository,
        master_repo: MasterRepository,
    ) -> Self {
        Self {
            repo,
            pendaftar_repo,
            master_repo,
        }
    }

    // =========================================================================
    // 1. RUMUS PENILAIAN PER JALUR
    // =========================================================================

    pub async fn get_rumus_penilaian(&self) -> Result<Vec<RumusPenilaianJalur>, AppError> {
        self.repo.list_all_rumus().await
    }

    pub async fn update_rumus_penilaian(
        &self,
        jalur_id: Uuid,
        req: UpdateRumusRequest,
    ) -> Result<RumusPenilaianJalur, AppError> {
        self.repo
            .upsert_rumus(
                jalur_id,
                req.bobot_cbt,
                req.bobot_rapor,
                req.bobot_prestasi,
                req.bobot_wawancara,
                req.default_passing_score,
                req.keterangan.as_deref(),
            )
            .await
    }

    // =========================================================================
    // 2. PROSES RANKING DENGAN TIE-BREAKER & ALOKASI KUOTA
    // =========================================================================

    pub async fn proses_ranking_kelulusan(
        &self,
        req: ProsesRankingRequest,
        actor_id: Uuid,
        actor_name: &str,
    ) -> Result<DrafKelulusanResponse, AppError> {
        // A. Ambil semua rumus penilaian
        let rumus_list = self.repo.list_all_rumus().await?;
        let rumus_map: HashMap<Uuid, RumusPenilaianJalur> =
            rumus_list.into_iter().map(|r| (r.jalur_id, r)).collect();

        // B. Ambil informasi kuota & passing grade semua prodi
        let prodi_list = self.repo.get_prodi_quotas().await?;
        let prodi_map: HashMap<Uuid, _> = prodi_list.into_iter().map(|p| (p.id, p)).collect();

        // C. Ambil kandidat pendaftar
        let candidates = self.repo.fetch_candidates_to_rank(req.gelombang_id).await?;
        if candidates.is_empty() {
            return Err(AppError::BadRequest(
                "Tidak ada pendaftar valid untuk diproses ranking pada gelombang ini".to_string(),
            ));
        }

        // D. Hitung skor akhir masing-masing kandidat sesuai rumus jalurnya
        struct RankedCandidate {
            candidate: crate::modules::kelulusan::repository::CandidateToRank,
            skor_akhir: f64,
        }

        let mut scored_candidates: Vec<RankedCandidate> = candidates
            .into_iter()
            .map(|c| {
                let default_rumus = RumusPenilaianJalur {
                    id: Uuid::nil(),
                    jalur_id: c.jalur_id,
                    bobot_cbt: 50.0,
                    bobot_rapor: 30.0,
                    bobot_prestasi: 20.0,
                    bobot_wawancara: 0.0,
                    default_passing_score: 65.0,
                    keterangan: None,
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                };
                let rumus = rumus_map.get(&c.jalur_id).unwrap_or(&default_rumus);
                let skor = hitung_skor_bobot(
                    c.skor_cbt,
                    c.nilai_rapor_avg,
                    c.nilai_prestasi,
                    c.nilai_wawancara,
                    rumus,
                );
                RankedCandidate {
                    candidate: c,
                    skor_akhir: skor,
                }
            })
            .collect();

        // E. Sort dengan hierarki TIE-BREAKER:
        // 1. skor_akhir DESC
        // 2. skor_cbt DESC
        // 3. nilai_rapor_avg DESC
        // 4. created_at ASC
        scored_candidates.sort_by(|a, b| {
            b.skor_akhir
                .partial_cmp(&a.skor_akhir)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    b.candidate
                        .skor_cbt
                        .partial_cmp(&a.candidate.skor_cbt)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .then_with(|| {
                    b.candidate
                        .nilai_rapor_avg
                        .partial_cmp(&a.candidate.nilai_rapor_avg)
                        .unwrap_or(std::cmp::Ordering::Equal)
                })
                .then_with(|| a.candidate.created_at.cmp(&b.candidate.created_at))
        });

        // F. Buat Sidang Kelulusan baru (Status DRAFT)
        let sidang = self
            .repo
            .create_sidang(
                req.gelombang_id,
                &req.nama_sidang,
                req.nomor_sk.as_deref(),
                req.tgl_pengumuman,
            )
            .await?;

        // G. Evaluasi kuota prodi & status kelulusan (P1 -> P2 -> CADANGAN -> TIDAK_LULUS)
        let mut kuota_terisi: HashMap<Uuid, i32> = HashMap::new();
        let mut total_lulus = 0;
        let mut total_cadangan = 0;
        let mut total_tidak_lulus = 0;
        let total_peserta = scored_candidates.len() as i32;

        let tahun = 2026;
        let mut seq_loa = 1;

        for (idx, sc) in scored_candidates.into_iter().enumerate() {
            let ranking = (idx + 1) as i32;
            let c = sc.candidate;
            let skor_akhir = sc.skor_akhir;

            let p1 = prodi_map.get(&c.prodi_pilihan_1_id);
            let p2 = c.prodi_pilihan_2_id.and_then(|id| prodi_map.get(&id));

            let mut status = "TIDAK_LULUS";
            let mut prodi_diterima_id = None;
            let mut pilihan_ke = None;

            // Cek Pilihan 1
            if let Some(p1_info) = p1 {
                let terisi = *kuota_terisi.get(&p1_info.id).unwrap_or(&0);
                if skor_akhir >= p1_info.passing_grade && terisi < p1_info.kuota {
                    status = "LULUS_PILIHAN_1";
                    prodi_diterima_id = Some(p1_info.id);
                    pilihan_ke = Some(1);
                    kuota_terisi.insert(p1_info.id, terisi + 1);
                }
            }

            // Jika belum lulus di Pilihan 1, cek Pilihan 2
            if status == "TIDAK_LULUS" {
                if let Some(p2_info) = p2 {
                    let terisi = *kuota_terisi.get(&p2_info.id).unwrap_or(&0);
                    if skor_akhir >= p2_info.passing_grade && terisi < p2_info.kuota {
                        status = "LULUS_PILIHAN_2";
                        prodi_diterima_id = Some(p2_info.id);
                        pilihan_ke = Some(2);
                        kuota_terisi.insert(p2_info.id, terisi + 1);
                    }
                }
            }

            // Jika kuota penuh tetapi skor di atas ambang batas cadangan
            if status == "TIDAK_LULUS" {
                let min_passing = p1.map(|p| p.passing_grade).unwrap_or(65.0);
                if skor_akhir >= (min_passing - 5.0) {
                    status = "CADANGAN";
                }
            }

            let nomor_loa = if status.starts_with("LULUS") {
                total_lulus += 1;
                let no = format_nomor_loa(tahun, seq_loa);
                seq_loa += 1;
                Some(no)
            } else if status == "CADANGAN" {
                total_cadangan += 1;
                None
            } else {
                total_tidak_lulus += 1;
                None
            };

            let today = Utc::now().date_naive();

            self.repo
                .save_hasil_kelulusan_item(
                    c.pendaftar_id,
                    Some(sidang.id),
                    status,
                    prodi_diterima_id,
                    pilihan_ke,
                    ranking,
                    c.skor_cbt,
                    c.nilai_rapor_avg,
                    c.nilai_prestasi,
                    skor_akhir,
                    nomor_loa.as_deref(),
                    Some(today),
                    false, // is_published = false (tetap DRAFT sampai di-approve & dipublish)
                )
                .await?;
        }

        // H. Update summary total di Sidang
        self.repo
            .update_sidang_counts(
                sidang.id,
                total_peserta,
                total_lulus,
                total_cadangan,
                total_tidak_lulus,
            )
            .await?;

        // I. Catat Audit Log
        self.repo
            .insert_audit_log(
                Uuid::nil(),
                Some(sidang.id),
                None,
                "DRAFT_GENERATED",
                None,
                None,
                Some(actor_id),
                actor_name,
                Some(&format!(
                    "Draf ranking berhasil dibuat: {} peserta (Lulus: {}, Cadangan: {}, Tidak Lulus: {})",
                    total_peserta, total_lulus, total_cadangan, total_tidak_lulus
                )),
            )
            .await?;

        // J. Kembalikan respons draf
        self.get_draf_kelulusan(Some(sidang.id)).await
    }

    // =========================================================================
    // 3. GET DRAF, APPROVAL, PUBLISH, & UPDATE KANDIDAT
    // =========================================================================

    pub async fn get_draf_kelulusan(
        &self,
        sidang_id: Option<Uuid>,
    ) -> Result<DrafKelulusanResponse, AppError> {
        let sidang = if let Some(id) = sidang_id {
            self.repo
                .find_sidang_by_id(id)
                .await?
                .ok_or_else(|| AppError::NotFound("Sidang kelulusan tidak ditemukan".to_string()))?
        } else {
            self.repo.find_latest_sidang().await?.ok_or_else(|| {
                AppError::NotFound("Belum ada sidang kelulusan yang dibuat".to_string())
            })?
        };

        let items = self.repo.list_draf_items_by_sidang(sidang.id).await?;
        let audit_logs = self.repo.list_audit_by_sidang(sidang.id).await?;

        Ok(DrafKelulusanResponse {
            sidang,
            items,
            audit_logs,
        })
    }

    pub async fn approve_sidang(
        &self,
        sidang_id: Uuid,
        req: ApprovalSidangRequest,
        actor_id: Uuid,
        actor_name: &str,
    ) -> Result<SidangKelulusan, AppError> {
        let sidang = self
            .repo
            .find_sidang_by_id(sidang_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sidang tidak ditemukan".to_string()))?;

        if sidang.status_sidang != "DRAFT" {
            return Err(AppError::BadRequest(
                "Hanya sidang berstatus DRAFT yang dapat disetujui".to_string(),
            ));
        }

        self.repo
            .update_sidang_status(
                sidang_id,
                "DISETUJUI",
                Some(actor_id),
                Some(Utc::now()),
                req.catatan.as_deref(),
            )
            .await?;

        self.repo
            .insert_audit_log(
                Uuid::nil(),
                Some(sidang_id),
                Some("DRAFT"),
                "DISETUJUI",
                None,
                None,
                Some(actor_id),
                actor_name,
                req.catatan.as_deref(),
            )
            .await?;

        self.repo
            .find_sidang_by_id(sidang_id)
            .await?
            .ok_or_else(|| AppError::Internal("Gagal mengambil sidang".to_string()))
    }

    pub async fn publish_sidang(
        &self,
        sidang_id: Uuid,
        actor_id: Uuid,
        actor_name: &str,
    ) -> Result<SidangKelulusan, AppError> {
        let sidang = self
            .repo
            .find_sidang_by_id(sidang_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sidang tidak ditemukan".to_string()))?;

        if sidang.status_sidang != "DISETUJUI" {
            return Err(AppError::BadRequest(
                "Sidang pleno kelulusan harus berstatus DISETUJUI oleh Admin/Rektorat sebelum dipublikasikan"
                    .to_string(),
            ));
        }

        self.repo.publish_sidang_results(sidang_id).await?;
        self.repo
            .update_sidang_status(sidang_id, "DIPUBLIKASIKAN", None, None, None)
            .await?;

        self.repo
            .insert_audit_log(
                Uuid::nil(),
                Some(sidang_id),
                Some("DISETUJUI"),
                "DIPUBLIKASIKAN",
                None,
                None,
                Some(actor_id),
                actor_name,
                Some("Hasil sidang kelulusan resmi dipublikasikan ke portal pendaftar"),
            )
            .await?;

        self.repo
            .find_sidang_by_id(sidang_id)
            .await?
            .ok_or_else(|| AppError::Internal("Gagal mengambil sidang".to_string()))
    }

    pub async fn update_status_kandidat(
        &self,
        req: UpdateStatusKandidatRequest,
        actor_id: Uuid,
        actor_name: &str,
    ) -> Result<HasilKelulusan, AppError> {
        let hasil_lama = self
            .repo
            .find_by_pendaftar_id(req.pendaftar_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Data kelulusan kandidat tidak ditemukan".to_string())
            })?;

        let res = self
            .repo
            .update_kandidat_status(
                req.pendaftar_id,
                &req.status_baru,
                req.prodi_diterima_id,
                Some(&req.catatan),
            )
            .await?;

        self.repo
            .insert_audit_log(
                req.pendaftar_id,
                hasil_lama.sidang_id,
                Some(&hasil_lama.status_kelulusan),
                &req.status_baru,
                hasil_lama.prodi_diterima_id,
                req.prodi_diterima_id,
                Some(actor_id),
                actor_name,
                Some(&req.catatan),
            )
            .await?;

        Ok(res)
    }

    // =========================================================================
    // 4. CEK KELULUSAN CALON MAHASISWA (IDOR-SAFE & JADWAL TERKONTROL)
    // =========================================================================

    pub async fn get_cek_kelulusan_calon(
        &self,
        user_id: Uuid,
    ) -> Result<CekKelulusanCalonResponse, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun Anda".to_string())
            })?;

        let hasil = self.repo.find_by_pendaftar_id(pendaftar.id).await?;

        let user = sqlx::query_as::<_, (String,)>("SELECT nama_lengkap FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(self.repo.pool())
            .await?
            .unwrap_or_else(|| ("Calon Mahasiswa".to_string(),));

        let jalur_row =
            sqlx::query_as::<_, (String,)>("SELECT nama_jalur FROM jalur_masuk WHERE id = $1")
                .bind(pendaftar.jalur_id)
                .fetch_optional(self.repo.pool())
                .await?
                .unwrap_or_else(|| ("Jalur Reguler".to_string(),));

        let gelombang_row =
            sqlx::query_as::<_, (String,)>("SELECT nama_gelombang FROM gelombang WHERE id = $1")
                .bind(pendaftar.gelombang_id)
                .fetch_optional(self.repo.pool())
                .await?
                .unwrap_or_else(|| ("Gelombang 1".to_string(),));

        if hasil.is_none() {
            return Ok(CekKelulusanCalonResponse {
                pendaftar_id: pendaftar.id,
                nomor_pendaftaran: pendaftar.nomor_pendaftaran,
                nama_lengkap: user.0,
                jalur_nama: jalur_row.0,
                gelombang_nama: gelombang_row.0,
                status_kelulusan: "BELUM_DIPUTUSKAN".to_string(),
                prodi_diterima: None,
                jenjang_diterima: None,
                fakultas_diterima: None,
                pilihan_ke: None,
                skor_akhir: 0.0,
                nim_resmi: None,
                nomor_surat_loa: None,
                tanggal_sk: None,
                is_published: false,
                tgl_pengumuman: None,
                is_pengumuman_buka: false,
                status_daftar_ulang: "BELUM_DAFTAR_ULANG".to_string(),
                pesan: "Hasil seleksi pendaftaran Anda belum diputuskan oleh panitia PMB."
                    .to_string(),
            });
        }

        let h = hasil.unwrap();

        // Ambil info sidang untuk cek jadwal pengumuman
        let sidang = if let Some(sid) = h.sidang_id {
            self.repo.find_sidang_by_id(sid).await?
        } else {
            None
        };

        let tgl_pengumuman = sidang.as_ref().map(|s| s.tgl_pengumuman);
        let now = Utc::now();
        let is_pengumuman_buka = h.is_published
            && match tgl_pengumuman {
                Some(tgl) => now >= tgl,
                None => true,
            };

        if !is_pengumuman_buka {
            let pesan = if let Some(tgl) = tgl_pengumuman {
                format!(
                    "Pengumuman hasil kelulusan akan dirilis secara resmi pada {}",
                    tgl.format("%d %B %Y jam %H:%M WIB")
                )
            } else {
                "Pengumuman hasil seleksi belum dirilis ke publik.".to_string()
            };

            return Ok(CekKelulusanCalonResponse {
                pendaftar_id: pendaftar.id,
                nomor_pendaftaran: pendaftar.nomor_pendaftaran,
                nama_lengkap: user.0,
                jalur_nama: jalur_row.0,
                gelombang_nama: gelombang_row.0,
                status_kelulusan: "BELUM_DIPUTUSKAN".to_string(),
                prodi_diterima: None,
                jenjang_diterima: None,
                fakultas_diterima: None,
                pilihan_ke: None,
                skor_akhir: 0.0,
                nim_resmi: None,
                nomor_surat_loa: None,
                tanggal_sk: None,
                is_published: false,
                tgl_pengumuman,
                is_pengumuman_buka: false,
                status_daftar_ulang: h.status_daftar_ulang,
                pesan,
            });
        }

        let mut prodi_diterima = None;
        let mut jenjang_diterima = None;
        let mut fakultas_diterima = None;

        if let Some(pid) = h.prodi_diterima_id {
            if let Ok(Some(p)) = self.master_repo.get_prodi_by_id(pid).await {
                prodi_diterima = Some(p.nama_prodi);
                jenjang_diterima = Some(p.jenjang);
                fakultas_diterima = Some(p.fakultas);
            }
        }

        let pesan = match h.status_kelulusan.as_str() {
            "LULUS_PILIHAN_1" | "LULUS_PILIHAN_2" => {
                "Selamat! Anda dinyatakan LULUS seleksi penerimaan mahasiswa baru Universitas Pignatelli Triputra."
                    .to_string()
            }
            "CADANGAN" => {
                "Anda ditempatkan pada status CADANGAN. Panitia akan menginformasikan jika ada kuota tersedia."
                    .to_string()
            }
            _ => {
                "Terima kasih atas partisipasi Anda. Mohon maaf, Anda belum memenuhi kualifikasi seleksi jalur ini."
                    .to_string()
            }
        };

        Ok(CekKelulusanCalonResponse {
            pendaftar_id: pendaftar.id,
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: user.0,
            jalur_nama: jalur_row.0,
            gelombang_nama: gelombang_row.0,
            status_kelulusan: h.status_kelulusan,
            prodi_diterima,
            jenjang_diterima,
            fakultas_diterima,
            pilihan_ke: h.pilihan_ke,
            skor_akhir: h.skor_akhir,
            nim_resmi: h.nim_resmi,
            nomor_surat_loa: h.nomor_surat_loa,
            tanggal_sk: h.tanggal_sk,
            is_published: h.is_published,
            tgl_pengumuman,
            is_pengumuman_buka: true,
            status_daftar_ulang: h.status_daftar_ulang,
            pesan,
        })
    }

    pub async fn get_cek_kelulusan_publik(
        &self,
        nomor_pendaftaran: &str,
    ) -> Result<CekKelulusanPublikResponse, AppError> {
        let clean_nomor = nomor_pendaftaran.trim();
        if clean_nomor.is_empty() {
            return Err(AppError::BadRequest(
                "Nomor pendaftaran wajib diisi".to_string(),
            ));
        }

        let row = self
            .repo
            .find_publik_by_nomor_pendaftaran(clean_nomor)
            .await?
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Nomor pendaftaran '{}' tidak ditemukan dalam sistem seleksi resmi PMB.",
                    clean_nomor
                ))
            })?;

        let now = Utc::now();
        let is_pengumuman_buka = row.is_published
            && match row.tgl_pengumuman {
                Some(tgl) => now >= tgl,
                None => true,
            };

        let masked_name = mask_nama(&row.nama_lengkap);

        if !is_pengumuman_buka {
            let pesan = if let Some(tgl) = row.tgl_pengumuman {
                format!(
                    "Pengumuman hasil seleksi resmi untuk pendaftaran ini akan dirilis pada {}.",
                    tgl.format("%d %B %Y jam %H:%M WIB")
                )
            } else {
                "Pengumuman hasil seleksi kelulusan untuk pendaftaran ini belum dirilis secara resmi oleh panitia PMB.".to_string()
            };

            return Ok(CekKelulusanPublikResponse {
                nomor_pendaftaran: row.nomor_pendaftaran,
                nama_lengkap: masked_name,
                jalur_nama: row.jalur_nama,
                gelombang_nama: row.gelombang_nama,
                status_kelulusan: "BELUM_DIPUTUSKAN".to_string(),
                prodi_diterima: None,
                jenjang_diterima: None,
                fakultas_diterima: None,
                is_pengumuman_buka: false,
                tgl_pengumuman: row.tgl_pengumuman,
                pesan,
            });
        }

        let pesan = match row.status_kelulusan.as_str() {
            "LULUS_PILIHAN_1" | "LULUS_PILIHAN_2" => {
                "Selamat! Anda dinyatakan LULUS seleksi penerimaan mahasiswa baru Universitas Pignatelli Triputra. Silakan login ke Portal Calon Mahasiswa untuk melihat SK, mengunduh Letter of Acceptance (LoA), dan melanjutkan proses registrasi ulang."
                    .to_string()
            }
            "CADANGAN" => {
                "Anda berstatus CADANGAN pada seleksi penerimaan mahasiswa baru Universitas Pignatelli Triputra. Panitia PMB akan menginformasikan jika terdapat kuota yang tersedia."
                    .to_string()
            }
            "TIDAK_LULUS" => {
                "Terima kasih atas partisipasi Anda dalam seleksi PMB Universitas Pignatelli Triputra. Mohon maaf, Anda belum memenuhi kualifikasi seleksi pada jalur ini."
                    .to_string()
            }
            _ => {
                "Status seleksi pendaftaran Anda masih dalam tahap evaluasi oleh panitia PMB."
                    .to_string()
            }
        };

        Ok(CekKelulusanPublikResponse {
            nomor_pendaftaran: row.nomor_pendaftaran,
            nama_lengkap: masked_name,
            jalur_nama: row.jalur_nama,
            gelombang_nama: row.gelombang_nama,
            status_kelulusan: row.status_kelulusan,
            prodi_diterima: row.nama_prodi,
            jenjang_diterima: row.jenjang,
            fakultas_diterima: row.fakultas,
            is_pengumuman_buka: true,
            tgl_pengumuman: row.tgl_pengumuman,
            pesan,
        })
    }

    async fn ensure_pengumuman_buka(&self, hasil: &HasilKelulusan) -> Result<(), AppError> {
        if !hasil.is_published {
            return Err(AppError::Forbidden(
                "Pengumuman hasil kelulusan belum dirilis ke publik.".to_string(),
            ));
        }

        if let Some(sidang_id) = hasil.sidang_id {
            if let Some(sidang) = self.repo.find_sidang_by_id(sidang_id).await? {
                if Utc::now() < sidang.tgl_pengumuman {
                    return Err(AppError::Forbidden(format!(
                        "Pengumuman hasil kelulusan baru akan dibuka pada {}",
                        sidang.tgl_pengumuman.format("%d %B %Y jam %H:%M WIB")
                    )));
                }
            }
        }

        Ok(())
    }

    // =========================================================================
    // 5. GENERATE & STREAM LETTER OF ACCEPTANCE (LoA) PDF
    // =========================================================================

    pub async fn generate_loa_pdf_bytes(&self, user_id: Uuid) -> Result<Vec<u8>, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun Anda".to_string())
            })?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar.id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data kelulusan belum tersedia".to_string()))?;

        self.ensure_pengumuman_buka(&hasil).await?;

        if !hasil.status_kelulusan.starts_with("LULUS") {
            return Err(AppError::Forbidden(
                "Dokumen LoA hanya tersedia bagi calon mahasiswa yang dinyatakan LULUS".to_string(),
            ));
        }

        let user = sqlx::query_as::<_, (String,)>("SELECT nama_lengkap FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(self.repo.pool())
            .await?
            .unwrap_or_else(|| ("Calon Mahasiswa".to_string(),));

        let prodi_info = if let Some(pid) = hasil.prodi_diterima_id {
            self.master_repo.get_prodi_by_id(pid).await?
        } else {
            None
        };

        let jalur_row =
            sqlx::query_as::<_, (String,)>("SELECT nama_jalur FROM jalur_masuk WHERE id = $1")
                .bind(pendaftar.jalur_id)
                .fetch_optional(self.repo.pool())
                .await?
                .unwrap_or_else(|| ("Jalur Reguler PMB".to_string(),));

        let loa_data = LoaPdfData {
            nomor_surat_loa: hasil
                .nomor_surat_loa
                .unwrap_or_else(|| "SK/PMB-UPT/2026/0001".to_string()),
            tanggal_sk: hasil
                .tanggal_sk
                .map(|t| t.format("%d %B %Y").to_string())
                .unwrap_or_else(|| Utc::now().format("%d %B %Y").to_string()),
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: user.0,
            nik: pendaftar.nik,
            asal_sekolah: pendaftar.asal_sekolah,
            jalur_nama: jalur_row.0,
            prodi_diterima: prodi_info
                .as_ref()
                .map(|p| p.nama_prodi.clone())
                .unwrap_or_else(|| "Informatika".to_string()),
            jenjang: prodi_info
                .as_ref()
                .map(|p| p.jenjang.clone())
                .unwrap_or_else(|| "S1".to_string()),
            fakultas: prodi_info
                .as_ref()
                .map(|p| p.fakultas.clone())
                .unwrap_or_else(|| "Fakultas Sains dan Teknologi".to_string()),
            pilihan_ke: hasil.pilihan_ke.unwrap_or(1),
            skor_akhir: hasil.skor_akhir,
            ranking: hasil.ranking.unwrap_or(1),
            tgl_batas_daftar_ulang: "15 Agustus 2026".to_string(),
            verifikasi_url: format!(
                "https://pmb.pignatelli.ac.id/verifikasi-loa/{}",
                pendaftar.id
            ),
        };

        Ok(generate_loa_pdf(&loa_data))
    }

    // =========================================================================
    // 6. DAFTAR ULANG (TAGIHAN, BERKAS, & VERIFIKASI)
    // =========================================================================

    pub async fn get_daftar_ulang_info(
        &self,
        user_id: Uuid,
    ) -> Result<DaftarUlangInfoResponse, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun Anda".to_string())
            })?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar.id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Data hasil kelulusan belum dipublikasikan".to_string())
            })?;

        self.ensure_pengumuman_buka(&hasil).await?;

        if !hasil.status_kelulusan.starts_with("LULUS") {
            return Err(AppError::Forbidden(
                "Fitur daftar ulang hanya dapat diakses oleh calon mahasiswa yang berstatus LULUS"
                    .to_string(),
            ));
        }

        let user = sqlx::query_as::<_, (String,)>("SELECT nama_lengkap FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(self.repo.pool())
            .await?
            .unwrap_or_else(|| ("Calon Mahasiswa".to_string(),));

        let prodi_info = if let Some(pid) = hasil.prodi_diterima_id {
            self.master_repo.get_prodi_by_id(pid).await?
        } else {
            None
        };

        // Cari atau buatkan tagihan daftar ulang
        let tagihan_row = sqlx::query(
            "SELECT id, nomor_tagihan, nominal_asli, nominal_akhir, diskon_voucher, status
             FROM tagihan 
             WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT'
             ORDER BY tgl_terbit DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(self.repo.pool())
        .await?;

        let tagihan_dto = if let Some(r) = tagihan_row {
            use sqlx::Row;
            let status: String = r.get("status");
            // Cari transaksi jika ada
            let tagihan_id: Uuid = r.get("id");
            let trx = sqlx::query(
                "SELECT va_number, payment_url, payment_method FROM transaksi_pembayaran
                 WHERE tagihan_id = $1 ORDER BY created_at DESC LIMIT 1",
            )
            .bind(tagihan_id)
            .fetch_optional(self.repo.pool())
            .await?;

            let (va, url, method) = if let Some(t) = trx {
                (
                    t.get::<Option<String>, _>("va_number"),
                    t.get::<Option<String>, _>("payment_url"),
                    t.get::<String, _>("payment_method"),
                )
            } else {
                (
                    Some("880812345678".to_string()),
                    Some("/portal/pembayaran".to_string()),
                    "VIRTUAL_ACCOUNT".to_string(),
                )
            };

            Some(TagihanDaftarUlangDto {
                id: tagihan_id,
                nomor_tagihan: r.get("nomor_tagihan"),
                nominal_asli: r.get("nominal_asli"),
                nominal_akhir: r.get("nominal_akhir"),
                diskon: r.get("diskon_voucher"),
                status,
                metode_pembayaran: method,
                payment_url: url,
                va_number: va,
            })
        } else if hasil.status_kelulusan.starts_with("LULUS") {
            // Auto generate tagihan daftar ulang (UKT Semester 1) jika belum ada
            let no_tagihan = format!(
                "INV-DU-{}-{}",
                pendaftar.nomor_pendaftaran.replace("PMB-", ""),
                Utc::now().timestamp() % 10000
            );
            let nominal = 5_000_000i64; // Biaya UKT PMB 2026

            let t = sqlx::query_as::<_, (Uuid, String, i64, i64, i64, String)>(
                "INSERT INTO tagihan (
                    nomor_tagihan, pendaftar_id, jenis_tagihan, nominal_asli, diskon_voucher,
                    nominal_akhir, status, tgl_jatuh_tempo, catatan
                ) VALUES ($1, $2, 'DAFTAR_ULANG_UKT', $3, 0, $3, 'MENUNGGU_PEMBAYARAN', NOW() + INTERVAL '14 days', 'Biaya Registrasi Ulang & UKT Semester 1')
                RETURNING id, nomor_tagihan, nominal_asli, diskon_voucher, nominal_akhir, status"
            )
            .bind(&no_tagihan)
            .bind(pendaftar.id)
            .bind(nominal)
            .fetch_one(self.repo.pool())
            .await?;

            let _ = self
                .repo
                .update_status_daftar_ulang(pendaftar.id, "TAGIHAN_TERBIT")
                .await;

            Some(TagihanDaftarUlangDto {
                id: t.0,
                nomor_tagihan: t.1.clone(),
                nominal_asli: t.2,
                nominal_akhir: t.4,
                diskon: t.3,
                status: t.5,
                metode_pembayaran: "MOCK_GATEWAY".to_string(),
                payment_url: Some(format!("/portal/pembayaran?invoice={}", t.1)),
                va_number: Some("880812345678".to_string()),
            })
        } else {
            None
        };

        // Ambil daftar berkas daftar ulang yang telah diunggah
        let berkas_list = self.repo.list_berkas_daftar_ulang(pendaftar.id).await?;

        // Nomor registrasi daftar ulang (dibuat sekali) & status bukti bayar terakhir
        let nomor_registrasi =
            crate::modules::kelulusan::bukti_bayar::ensure_nomor_registrasi(
                self.repo.pool(),
                pendaftar.id,
            )
            .await?;
        let bukti_terakhir: Option<(String, Option<String>)> = sqlx::query_as(
            "SELECT status, catatan FROM bukti_bayar_daftar_ulang
             WHERE pendaftar_id = $1 ORDER BY created_at DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(self.repo.pool())
        .await?;

        Ok(DaftarUlangInfoResponse {
            pendaftar_id: pendaftar.id,
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: user.0,
            prodi_diterima: prodi_info
                .as_ref()
                .map(|p| p.nama_prodi.clone())
                .unwrap_or_else(|| "-".to_string()),
            jenjang: prodi_info
                .as_ref()
                .map(|p| p.jenjang.clone())
                .unwrap_or_else(|| "-".to_string()),
            fakultas: prodi_info
                .as_ref()
                .map(|p| p.fakultas.clone())
                .unwrap_or_else(|| "-".to_string()),
            status_kelulusan: hasil.status_kelulusan,
            status_daftar_ulang: hasil.status_daftar_ulang,
            nomor_registrasi: Some(nomor_registrasi),
            status_bukti_bayar: bukti_terakhir.as_ref().map(|b| b.0.clone()),
            catatan_bukti_bayar: bukti_terakhir.and_then(|b| b.1),
            nim_resmi: hasil.nim_resmi,
            nomor_loa: hasil.nomor_surat_loa,
            tagihan: tagihan_dto,
            berkas_list,
        })
    }

    pub async fn upload_berkas_daftar_ulang(
        &self,
        user_id: Uuid,
        req: UploadBerkasDaftarUlangRequest,
    ) -> Result<BerkasDaftarUlang, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun Anda".to_string())
            })?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar.id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data hasil kelulusan belum tersedia".to_string()))?;

        self.ensure_pengumuman_buka(&hasil).await?;

        if !hasil.status_kelulusan.starts_with("LULUS") {
            return Err(AppError::Forbidden(
                "Hanya calon mahasiswa yang lulus yang dapat mengunggah berkas daftar ulang"
                    .to_string(),
            ));
        }

        let b = self
            .repo
            .insert_berkas_daftar_ulang(
                pendaftar.id,
                &req.jenis_berkas,
                &req.file_key,
                &req.file_name,
                &req.mime_type,
                req.file_size_bytes,
            )
            .await?;

        Ok(b)
    }

    pub async fn verifikasi_berkas_daftar_ulang(
        &self,
        berkas_id: Uuid,
        req: VerifikasiBerkasDaftarUlangRequest,
        verified_by: Uuid,
    ) -> Result<BerkasDaftarUlang, AppError> {
        let b = self
            .repo
            .verifikasi_berkas_daftar_ulang(
                berkas_id,
                &req.status,
                req.catatan.as_deref(),
                verified_by,
            )
            .await?;

        // Cek jika seluruh berkas daftar ulang sudah berstatus VALID
        let all_berkas = self.repo.list_berkas_daftar_ulang(b.pendaftar_id).await?;
        let required_docs = [
            "SURAT_PERNYATAAN_MABA",
            "SURAT_BEBAS_NARKOBA",
            "AKTA_KELAHIRAN",
            "IJAZAH_LEGALISIR",
        ];

        let mut all_valid = true;
        for req_doc in &required_docs {
            let has_valid = all_berkas
                .iter()
                .any(|d| d.jenis_berkas == *req_doc && d.status_verifikasi == "VALID");
            if !has_valid {
                all_valid = false;
                break;
            }
        }

        if all_valid {
            let _ = self
                .repo
                .update_status_daftar_ulang(b.pendaftar_id, "BERKAS_LENGKAP")
                .await;
        }

        Ok(b)
    }

    // =========================================================================
    // 7. PENERBITAN NIM RESMI OTOMATIS (KONKURENSI AMAN)
    // =========================================================================

    pub async fn generate_nim_resmi_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<GenerateNimResponse, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_id(pendaftar_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Pendaftar tidak ditemukan".to_string()))?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Data kelulusan pendaftar tidak ditemukan".to_string())
            })?;

        if !hasil.status_kelulusan.starts_with("LULUS") {
            return Err(AppError::BadRequest(
                "NIM hanya dapat diterbitkan untuk calon yang dinyatakan LULUS".to_string(),
            ));
        }

        let prodi_id = hasil
            .prodi_diterima_id
            .ok_or_else(|| AppError::BadRequest("Prodi diterima belum ditentukan".to_string()))?;

        let prodi = self
            .master_repo
            .get_prodi_by_id(prodi_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Program studi tidak ditemukan".to_string()))?;

        // Jika sudah ada NIM yang terbit, kembalikan NIM tersebut
        if let Some(existing_nim) = hasil.nim_resmi {
            return Ok(GenerateNimResponse {
                pendaftar_id,
                nomor_pendaftaran: pendaftar.nomor_pendaftaran,
                nama_lengkap: "Calon Mahasiswa".to_string(),
                prodi_nama: prodi.nama_prodi,
                nim_resmi: existing_nim,
                status_daftar_ulang: hasil.status_daftar_ulang,
                pesan: "NIM resmi sudah pernah diterbitkan sebelumnya".to_string(),
            });
        }

        // AMAN DARI DUPLIKASI KONKUREN:
        // Gunakan INSERT ON CONFLICT DO UPDATE RETURNING last_number
        let tahun = 2026;
        let sequence = self.repo.get_next_nim_counter(tahun, prodi_id).await?;

        let nim = format_nim_resmi(tahun, &prodi.jenjang, &prodi.kode_prodi, sequence);

        self.repo.update_nim_resmi(pendaftar_id, &nim).await?;

        // Ambil nama mahasiswa
        let user = sqlx::query_as::<_, (String,)>("SELECT nama_lengkap FROM users WHERE id = $1")
            .bind(pendaftar.user_id)
            .fetch_optional(self.repo.pool())
            .await?
            .unwrap_or_else(|| ("Calon Mahasiswa".to_string(),));

        Ok(GenerateNimResponse {
            pendaftar_id,
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: user.0,
            prodi_nama: prodi.nama_prodi,
            nim_resmi: nim,
            status_daftar_ulang: "TERDAFTAR_SEBAGAI_MAHASISWA".to_string(),
            pesan: "NIM resmi berhasil diterbitkan secara otomatis".to_string(),
        })
    }

    // =========================================================================
    // 8. EKSPOR DATA MAHASISWA BARU (SIAKAD STANDAR PD-DIKTI)
    // =========================================================================

    pub async fn ekspor_data_siakad(
        &self,
        sidang_id: Option<Uuid>,
    ) -> Result<Vec<EksporSiakadItemDto>, AppError> {
        self.repo.get_data_ekspor_siakad(sidang_id).await
    }

    pub fn to_csv_siakad(items: &[EksporSiakadItemDto]) -> String {
        let mut csv = String::from(
            "No,NIM,No Pendaftaran,Nama Lengkap,NIK,Tempat Lahir,Tanggal Lahir,Jenis Kelamin,Agama,Alamat,No HP,Email,Nama Ibu Kandung,Nama Ayah,Kode Prodi,Nama Prodi,Jenjang,Jalur Masuk,Tahun Masuk,Skor Akhir,Tanggal Terdaftar\n",
        );

        for item in items {
            csv.push_str(&format!(
                "{},\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{:.2},\"{}\"\n",
                item.no,
                item.nim.replace('"', "\"\""),
                item.nomor_pendaftaran.replace('"', "\"\""),
                item.nama_lengkap.replace('"', "\"\""),
                item.nik.replace('"', "\"\""),
                item.tempat_lahir.replace('"', "\"\""),
                item.tgl_lahir.replace('"', "\"\""),
                item.jenis_kelamin,
                item.agama.replace('"', "\"\""),
                item.alamat.replace('"', "\"\""),
                item.no_hp.replace('"', "\"\""),
                item.email.replace('"', "\"\""),
                item.nama_ibu_kandung.replace('"', "\"\""),
                item.nama_ayah.replace('"', "\"\""),
                item.kode_prodi,
                item.nama_prodi.replace('"', "\"\""),
                item.jenjang,
                item.jalur_masuk.replace('"', "\"\""),
                item.tahun_masuk,
                item.skor_akhir,
                item.tanggal_daftar_ulang.as_deref().unwrap_or("-")
            ));
        }

        csv
    }

    pub async fn list_daftar_ulang_admin(&self) -> Result<Vec<MahasiswaDaftarUlangDto>, AppError> {
        self.repo.list_daftar_ulang_admin().await
    }

    pub async fn list_berkas_daftar_ulang_admin(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<BerkasDaftarUlang>, AppError> {
        self.repo.list_berkas_daftar_ulang(pendaftar_id).await
    }

    // Backwards compatibility methods
    pub async fn get_my_kelulusan(
        &self,
        user_id: Uuid,
    ) -> Result<HasilKelulusanResponse, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_user_id(user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Belum ada formulir pendaftaran untuk akun ini".to_string())
            })?;

        let hasil = self
            .repo
            .find_by_pendaftar_id(pendaftar.id)
            .await?
            .ok_or_else(|| AppError::NotFound("Hasil seleksi belum diumumkan".to_string()))?;

        let mut nama_prodi = None;
        let mut jenjang = None;
        let mut fakultas = None;

        if let Some(pid) = hasil.prodi_diterima_id {
            if let Ok(Some(p)) = self.master_repo.get_prodi_by_id(pid).await {
                nama_prodi = Some(p.nama_prodi);
                jenjang = Some(p.jenjang);
                fakultas = Some(p.fakultas);
            }
        }

        Ok(HasilKelulusanResponse {
            id: hasil.id,
            pendaftar_id: hasil.pendaftar_id,
            nomor_pendaftaran: pendaftar.nomor_pendaftaran,
            nama_lengkap: "Calon Mahasiswa".to_string(),
            status_kelulusan: hasil.status_kelulusan,
            prodi_diterima_id: hasil.prodi_diterima_id,
            nama_prodi_diterima: nama_prodi,
            jenjang_diterima: jenjang,
            fakultas_diterima: fakultas,
            pilihan_ke: hasil.pilihan_ke,
            ranking: hasil.ranking,
            skor_akhir: hasil.skor_akhir,
            nim_resmi: hasil.nim_resmi,
            nomor_surat_loa: hasil.nomor_surat_loa,
            tanggal_sk: hasil.tanggal_sk,
            is_published: hasil.is_published,
            status_daftar_ulang: hasil.status_daftar_ulang,
        })
    }

    pub async fn proses_seleksi_massal(&self) -> Result<usize, AppError> {
        let candidates = self.repo.fetch_candidates_to_rank(None).await?;
        let count = candidates.len();
        if count == 0 {
            return Ok(0);
        }

        let _ = self
            .proses_ranking_kelulusan(
                ProsesRankingRequest {
                    gelombang_id: None,
                    nama_sidang: "Sidang Pleno Kelulusan PMB 2026 Otomatis".to_string(),
                    nomor_sk: Some("SK/PMB/2026/01".to_string()),
                    tgl_pengumuman: Utc::now(),
                },
                Uuid::nil(),
                "System Auto",
            )
            .await?;

        Ok(count)
    }

    pub async fn list_all(&self) -> Result<Vec<HasilKelulusanResponse>, AppError> {
        let list = self.repo.list_all().await?;
        let mut results = Vec::new();

        for h in list {
            let mut nama_prodi = None;
            let mut jenjang = None;
            let mut fakultas = None;

            if let Some(pid) = h.prodi_diterima_id {
                if let Ok(Some(p)) = self.master_repo.get_prodi_by_id(pid).await {
                    nama_prodi = Some(p.nama_prodi);
                    jenjang = Some(p.jenjang);
                    fakultas = Some(p.fakultas);
                }
            }

            results.push(HasilKelulusanResponse {
                id: h.id,
                pendaftar_id: h.pendaftar_id,
                nomor_pendaftaran: "PMB-2026".to_string(),
                nama_lengkap: "Pendaftar".to_string(),
                status_kelulusan: h.status_kelulusan,
                prodi_diterima_id: h.prodi_diterima_id,
                nama_prodi_diterima: nama_prodi,
                jenjang_diterima: jenjang,
                fakultas_diterima: fakultas,
                pilihan_ke: h.pilihan_ke,
                ranking: h.ranking,
                skor_akhir: h.skor_akhir,
                nim_resmi: h.nim_resmi,
                nomor_surat_loa: h.nomor_surat_loa,
                tanggal_sk: h.tanggal_sk,
                is_published: h.is_published,
                status_daftar_ulang: h.status_daftar_ulang,
            });
        }

        Ok(results)
    }
}

// ==============================================================================
// Unit Test Logika Bisnis Seleksi Kelulusan, Ranking & Concurrency-Safe NIM
// ==============================================================================
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_nim_resmi_s1_dan_d3() {
        // Tahun 2026 (26), S1 (1), Prodi IF (02), Urutan 1 -> "261020001"
        let nim_s1 = format_nim_resmi(2026, "S1", "02", 1);
        assert_eq!(nim_s1, "261020001");
        assert_eq!(nim_s1.len(), 9);

        // D3 (3), Prodi Akuntansi (01), Urutan 45 -> "263010045"
        let nim_d3 = format_nim_resmi(2026, "D3", "01", 45);
        assert_eq!(nim_d3, "263010045");
    }

    #[test]
    fn test_format_nomor_loa() {
        let loa = format_nomor_loa(2026, 12);
        assert_eq!(loa, "SK/PMB-UPT/2026/0012");
    }

    #[test]
    fn test_hitung_skor_bobot_fleksibel() {
        let rumus = RumusPenilaianJalur {
            id: Uuid::nil(),
            jalur_id: Uuid::nil(),
            bobot_cbt: 40.0,
            bobot_rapor: 40.0,
            bobot_prestasi: 20.0,
            bobot_wawancara: 0.0,
            default_passing_score: 70.0,
            keterangan: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        // Skor CBT: 80, Rapor: 90, Prestasi: 70
        // (80 * 0.4) + (90 * 0.4) + (70 * 0.2) = 32 + 36 + 14 = 82.0
        let skor = hitung_skor_bobot(80.0, 90.0, 70.0, 0.0, &rumus);
        assert_eq!(skor, 82.0);
    }

    #[test]
    fn test_siakad_csv_export_format() {
        let items = vec![EksporSiakadItemDto {
            no: 1,
            nim: "261020001".to_string(),
            nomor_pendaftaran: "PMB-2026-0001".to_string(),
            nama_lengkap: "Budi Santoso".to_string(),
            nik: "3301234567890001".to_string(),
            tempat_lahir: "Surakarta".to_string(),
            tgl_lahir: "2007-05-12".to_string(),
            jenis_kelamin: "L".to_string(),
            agama: "Katolik".to_string(),
            alamat: "Jl. Slamet Riyadi No. 10".to_string(),
            no_hp: "081234567890".to_string(),
            email: "budi@gmail.com".to_string(),
            nama_ibu_kandung: "Siti".to_string(),
            nama_ayah: "Bambang".to_string(),
            kode_prodi: "55201".to_string(),
            nama_prodi: "Informatika".to_string(),
            jenjang: "S1".to_string(),
            jalur_masuk: "Prestasi Akademik".to_string(),
            tahun_masuk: "2026".to_string(),
            skor_akhir: 85.5,
            tanggal_daftar_ulang: Some("2026-08-01".to_string()),
        }];

        let csv = KelulusanService::to_csv_siakad(&items);
        assert!(csv.contains("261020001"));
        assert!(csv.contains("Budi Santoso"));
        assert!(csv.contains("55201"));
        assert!(csv.contains("Informatika"));
    }
}
