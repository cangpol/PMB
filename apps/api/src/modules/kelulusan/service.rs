use std::collections::HashMap;

use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        kelulusan::{
            dto::{
                ApprovalSidangRequest, ArahkanPilihan2Request, ArahkanPilihan2Response,
                CekKelulusanCalonResponse, CekKelulusanPublikResponse, ContohNimItem,
                DaftarUlangInfoResponse, DrafKelulusanResponse, EksporSiakadItemDto,
                GenerateNimResponse, HasilCbtCalon, HasilKelulusanResponse, LingkupNimInfo,
                MahasiswaDaftarUlangDto, PratinjauRumusNimResponse, ProsesRankingRequest,
                RumusNimResponse, SimpanRumusNimRequest, TagihanDaftarUlangDto, TokenNimInfo,
                UpdateRumusRequest, UpdateStatusKandidatRequest, UploadBerkasDaftarUlangRequest,
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

/// Keputusan kelulusan satu calon.
#[derive(Debug, PartialEq)]
pub struct Keputusan {
    pub status: &'static str,
    pub prodi_diterima_id: Option<Uuid>,
    pub pilihan_ke: Option<i32>,
}

/// Tentukan hasil seleksi satu calon dari skor akhirnya (ujian CBT hanya sekali).
/// 1. Lulus pilihan 1 bila skor mencapai passing grade dan kuota masih ada.
/// 2. Gagal di pilihan 1 (nilai kurang atau kuota penuh) -> otomatis dialihkan ke pilihan 2
///    memakai skor yang sama, tanpa ujian ulang, selama memenuhi passing grade dan kuota prodi 2.
/// 3. Selain itu CADANGAN (skor tidak jauh di bawah ambang) atau TIDAK_LULUS.
///    `kuota_terisi` diperbarui bila calon diterima.
pub fn tentukan_keputusan(
    skor_akhir: f64,
    p1: Option<&crate::modules::kelulusan::repository::ProdiQuotaInfo>,
    p2: Option<&crate::modules::kelulusan::repository::ProdiQuotaInfo>,
    kuota_terisi: &mut HashMap<Uuid, i32>,
) -> Keputusan {
    let mut terima = |prodi: &crate::modules::kelulusan::repository::ProdiQuotaInfo| {
        let terisi = *kuota_terisi.get(&prodi.id).unwrap_or(&0);
        if skor_akhir >= prodi.passing_grade && terisi < prodi.kuota {
            kuota_terisi.insert(prodi.id, terisi + 1);
            true
        } else {
            false
        }
    };
    if let Some(p) = p1 {
        if terima(p) {
            return Keputusan {
                status: "LULUS_PILIHAN_1",
                prodi_diterima_id: Some(p.id),
                pilihan_ke: Some(1),
            };
        }
    }
    if let Some(p) = p2 {
        if terima(p) {
            return Keputusan {
                status: "LULUS_PILIHAN_2",
                prodi_diterima_id: Some(p.id),
                pilihan_ke: Some(2),
            };
        }
    }
    let min_passing = p1.map(|p| p.passing_grade).unwrap_or(65.0);
    Keputusan {
        status: if skor_akhir >= min_passing - 5.0 {
            "CADANGAN"
        } else {
            "TIDAK_LULUS"
        },
        prodi_diterima_id: None,
        pilihan_ke: None,
    }
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

            // Pilihan 1 -> (bila gagal) otomatis pilihan 2 dengan skor yang sama, tanpa ujian ulang
            let Keputusan {
                status,
                prodi_diterima_id,
                pilihan_ke,
            } = tentukan_keputusan(skor_akhir, p1, p2, &mut kuota_terisi);

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
                None,
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
                None,
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
        // Status pendaftar ikut berubah hanya bila tanggal pengumuman sudah tiba;
        // bila belum, sinkronisasi terjadi saat calon membuka portal setelah tanggal itu.
        crate::modules::pendaftaran::alur::sinkron_status_kelulusan(
            self.repo.pool(),
            None,
            Some(sidang_id),
        )
        .await?;

        self.repo
            .insert_audit_log(
                None,
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

        // Memindahkan penempatan prodi (pilihan 1 <-> 2) tidak boleh setelah calon membayar daftar ulang
        if req.status_baru.starts_with("LULUS")
            && hasil_lama.prodi_diterima_id != req.prodi_diterima_id
            && self
                .repo
                .ada_pembayaran_daftar_ulang_berjalan(req.pendaftar_id)
                .await?
        {
            return Err(AppError::Conflict(
                "Calon sudah mengirim/menyelesaikan pembayaran daftar ulang; penempatan prodi tidak dapat diubah"
                    .to_string(),
            ));
        }

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
                Some(req.pendaftar_id),
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

        if hasil_lama.prodi_diterima_id != req.prodi_diterima_id {
            self.repo
                .batalkan_tagihan_daftar_ulang_basi(req.pendaftar_id)
                .await?;
        }

        crate::modules::pendaftaran::alur::sinkron_status_kelulusan(
            self.repo.pool(),
            Some(req.pendaftar_id),
            None,
        )
        .await?;

        Ok(res)
    }

    /// Calon tidak diterima di pilihan 1 (tidak lulus / cadangan): admin mengarahkan ke
    /// program studi pilihan ke-2 sebagai alternatif. Hasil menjadi LULUS_PILIHAN_2 lengkap
    /// dengan nomor LoA; calon langsung melihatnya bila hasil sudah dipublikasikan.
    pub async fn arahkan_ke_pilihan_2(
        &self,
        req: ArahkanPilihan2Request,
        actor_id: Uuid,
        actor_name: &str,
    ) -> Result<ArahkanPilihan2Response, AppError> {
        let pendaftar = self
            .pendaftar_repo
            .find_by_id(req.pendaftar_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Pendaftar tidak ditemukan".to_string()))?;
        let prodi2_id = pendaftar.prodi_pilihan_2.ok_or_else(|| {
            AppError::BadRequest(
                "Calon ini tidak memiliki pilihan program studi kedua untuk dialihkan".to_string(),
            )
        })?;
        let hasil = self
            .repo
            .find_by_pendaftar_id(req.pendaftar_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound(
                    "Data kelulusan calon belum ada. Jalankan proses ranking terlebih dahulu"
                        .to_string(),
                )
            })?;
        match hasil.status_kelulusan.as_str() {
            "TIDAK_LULUS" | "CADANGAN" => {}
            "LULUS_PILIHAN_2" => {
                return Err(AppError::Conflict(
                    "Calon sudah diterima di program studi pilihan kedua".to_string(),
                ));
            }
            _ => {
                return Err(AppError::Conflict(
                    "Calon sudah diterima di pilihan pertama; pengalihan tidak diperlukan"
                        .to_string(),
                ));
            }
        }
        if self
            .repo
            .ada_pembayaran_daftar_ulang_berjalan(req.pendaftar_id)
            .await?
        {
            return Err(AppError::Conflict(
                "Calon sudah mengirim/menyelesaikan pembayaran daftar ulang; pengalihan prodi tidak dapat dilakukan"
                    .to_string(),
            ));
        }
        let prodi2 = self
            .master_repo
            .get_prodi_by_id(prodi2_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Program studi pilihan 2 tidak ditemukan".into()))?;

        let baru = self
            .repo
            .update_kandidat_status(
                req.pendaftar_id,
                "LULUS_PILIHAN_2",
                Some(prodi2_id),
                Some(&req.catatan),
            )
            .await?;
        // Biaya daftar ulang mengikuti prodi baru
        self.repo
            .batalkan_tagihan_daftar_ulang_basi(req.pendaftar_id)
            .await?;
        self.repo
            .insert_audit_log(
                Some(req.pendaftar_id),
                hasil.sidang_id,
                Some(&hasil.status_kelulusan),
                "LULUS_PILIHAN_2",
                hasil.prodi_diterima_id,
                Some(prodi2_id),
                Some(actor_id),
                actor_name,
                Some(&format!("Diarahkan ke pilihan 2: {}", req.catatan)),
            )
            .await?;
        crate::modules::pendaftaran::alur::sinkron_status_kelulusan(
            self.repo.pool(),
            Some(req.pendaftar_id),
            None,
        )
        .await?;

        let tampil = baru.is_published;
        Ok(ArahkanPilihan2Response {
            pesan: if tampil {
                "Calon diarahkan ke program studi pilihan kedua dan hasilnya sudah dapat dilihat calon."
                    .to_string()
            } else {
                "Calon diarahkan ke program studi pilihan kedua. Hasil tampil ke calon setelah sidang dipublikasikan."
                    .to_string()
            },
            prodi_baru: format!("{} {}", prodi2.jenjang, prodi2.nama_prodi),
            status_kelulusan: baru.status_kelulusan,
            nomor_surat_loa: baru.nomor_surat_loa,
            sudah_tampil_ke_calon: tampil,
        })
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

        // Calon yang lulus CBT tetapi belum punya hasil kelulusan (data lama): terbitkan LoA
        crate::modules::kelulusan::repository::terbitkan_kelulusan_dari_cbt(
            self.repo.pool(),
            Some(pendaftar.id),
        )
        .await?;
        let hasil = self.repo.find_by_pendaftar_id(pendaftar.id).await?;

        // Hasil CBT terbaru (nilai di atas passing grade atau disetujui panitia = memenuhi)
        let hasil_cbt = sqlx::query_as::<_, HasilCbtCalon>(
            "SELECT h.nilai_akhir, h.jumlah_benar, h.jumlah_salah, h.jumlah_kosong,
                    pu.passing_grade, h.is_lulus AS memenuhi_passing_grade,
                    h.disetujui_admin, h.waktu_submit
             FROM hasil_ujian h
             JOIN peserta_sesi ps ON ps.id = h.peserta_sesi_id
             JOIN sesi_ujian s ON s.id = ps.sesi_id
             JOIN paket_ujian pu ON pu.id = s.paket_id
             WHERE h.pendaftar_id = $1
             ORDER BY h.waktu_submit DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(self.repo.pool())
        .await?;

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
                hasil_cbt: hasil_cbt.clone(),
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
                hasil_cbt: hasil_cbt.clone(),
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
            hasil_cbt,
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

        // Jadwal & kanal pembayaran daftar ulang untuk dicantumkan di surat
        let prodi_diterima = hasil.prodi_diterima_id.unwrap_or(pendaftar.prodi_pilihan_1);
        let rincian = rincian_biaya_daftar_ulang(
            self.repo.pool(),
            pendaftar.id,
            prodi_diterima,
            pendaftar.jalur_id,
            pendaftar.gelombang_id,
        )
        .await?;
        let jatuh_tempo_tagihan: Option<chrono::DateTime<Utc>> = sqlx::query_scalar(
            "SELECT tgl_jatuh_tempo FROM tagihan
             WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT' AND status <> 'BATAL'
             ORDER BY tgl_terbit DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(self.repo.pool())
        .await?;
        let batas_bayar = match jatuh_tempo_tagihan {
            Some(t) => t,
            None => batas_daftar_ulang(self.repo.pool(), pendaftar.gelombang_id).await?,
        };
        let rekening: Vec<(String, Option<String>, String)> = sqlx::query_as(
            "SELECT jenis, nomor, atas_nama FROM rekening_pembayaran WHERE is_active = TRUE",
        )
        .fetch_all(self.repo.pool())
        .await?;
        let va_mandiri = rekening
            .iter()
            .find(|r| r.0 == "VA_MANDIRI")
            .and_then(|r| r.1.clone().map(|no| (no, r.2.clone())));
        let ada_qris = rekening.iter().any(|r| r.0 == "QRIS");
        let nomor_registrasi = Some(
            crate::modules::kelulusan::bukti_bayar::ensure_nomor_registrasi(
                self.repo.pool(),
                pendaftar.id,
            )
            .await?,
        );

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
            tgl_batas_daftar_ulang: {
                let wib = chrono::FixedOffset::east_opt(7 * 3600).expect("offset WIB valid");
                batas_bayar
                    .with_timezone(&wib)
                    .format("%d-%m-%Y %H:%M")
                    .to_string()
            },
            verifikasi_url: format!(
                "https://pmb.pignatelli.ac.id/verifikasi-loa/{}",
                pendaftar.id
            ),
            rincian_biaya: rincian
                .into_iter()
                .map(|r| (r.komponen, r.nominal))
                .collect(),
            va_mandiri,
            ada_qris,
            nomor_registrasi,
            nim_resmi: hasil.nim_resmi.clone(),
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

        crate::modules::pendaftaran::alur::sinkron_status_kelulusan(
            self.repo.pool(),
            Some(pendaftar.id),
            None,
        )
        .await?;

        let prodi_diterima = hasil.prodi_diterima_id.unwrap_or(pendaftar.prodi_pilihan_1);
        let rincian = rincian_biaya_daftar_ulang(
            self.repo.pool(),
            pendaftar.id,
            prodi_diterima,
            pendaftar.jalur_id,
            pendaftar.gelombang_id,
        )
        .await?;
        let va_mandiri: Option<String> = sqlx::query_scalar(
            "SELECT nomor FROM rekening_pembayaran
             WHERE jenis = 'VA_MANDIRI' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1",
        )
        .fetch_optional(self.repo.pool())
        .await?
        .flatten();

        // Cari atau buatkan tagihan daftar ulang (sekali, idempoten per pendaftar)
        let tagihan_row: Option<BarisTagihanDu> =
            sqlx::query_as(
                "SELECT id, nomor_tagihan, nominal_asli, nominal_akhir, diskon_voucher, status, tgl_jatuh_tempo
                 FROM tagihan
                 WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT' AND status <> 'BATAL'
                 ORDER BY tgl_terbit DESC LIMIT 1",
            )
            .bind(pendaftar.id)
            .fetch_optional(self.repo.pool())
            .await?;

        let tagihan_row = match tagihan_row {
            Some(t) => t,
            None => {
                let nominal: i64 = rincian.iter().map(|r| r.nominal).sum();
                let jatuh_tempo =
                    batas_daftar_ulang(self.repo.pool(), pendaftar.gelombang_id).await?;
                let no_tagihan =
                    format!("INV-DU-{}", pendaftar.nomor_pendaftaran.replace("PMB-", ""));
                let t: BarisTagihanDu =
                    sqlx::query_as(
                        "INSERT INTO tagihan (
                            nomor_tagihan, pendaftar_id, jenis_tagihan, nominal_asli, diskon_voucher,
                            nominal_akhir, status, tgl_jatuh_tempo, catatan
                        ) VALUES ($1, $2, 'DAFTAR_ULANG_UKT', $3, 0, $3, 'MENUNGGU_PEMBAYARAN', $4,
                                  'Biaya daftar ulang mahasiswa baru')
                        ON CONFLICT (nomor_tagihan) DO UPDATE SET
                            -- tagihan yang sebelumnya dibatalkan (mis. prodi berubah) terbit ulang
                            nominal_asli = CASE WHEN tagihan.status = 'BATAL'
                                THEN EXCLUDED.nominal_asli ELSE tagihan.nominal_asli END,
                            nominal_akhir = CASE WHEN tagihan.status = 'BATAL'
                                THEN EXCLUDED.nominal_akhir ELSE tagihan.nominal_akhir END,
                            tgl_jatuh_tempo = CASE WHEN tagihan.status = 'BATAL'
                                THEN EXCLUDED.tgl_jatuh_tempo ELSE tagihan.tgl_jatuh_tempo END,
                            status = CASE WHEN tagihan.status = 'BATAL'
                                THEN 'MENUNGGU_PEMBAYARAN' ELSE tagihan.status END,
                            updated_at = NOW()
                        RETURNING id, nomor_tagihan, nominal_asli, nominal_akhir, diskon_voucher, status, tgl_jatuh_tempo",
                    )
                    .bind(&no_tagihan)
                    .bind(pendaftar.id)
                    .bind(nominal)
                    .bind(jatuh_tempo)
                    .fetch_one(self.repo.pool())
                    .await?;

                let _ = self
                    .repo
                    .update_status_daftar_ulang(pendaftar.id, "TAGIHAN_TERBIT")
                    .await;
                t
            }
        };

        // Tagihan yang belum dibayar mengikuti rumus biaya terbaru (admisi dikurangi biaya formulir),
        // selama belum ada bukti bayar yang sedang diperiksa.
        let nominal_terbaru: i64 = rincian.iter().map(|r| r.nominal).sum();
        let mut tagihan_row = tagihan_row;
        if tagihan_row.5 == "MENUNGGU_PEMBAYARAN" && tagihan_row.2 != nominal_terbaru {
            let diperbarui = sqlx::query(
                "UPDATE tagihan SET nominal_asli = $2, nominal_akhir = GREATEST($2 - diskon_voucher, 0),
                        updated_at = NOW()
                 WHERE id = $1 AND status = 'MENUNGGU_PEMBAYARAN'
                   AND NOT EXISTS (SELECT 1 FROM bukti_pembayaran b
                                   WHERE b.tagihan_id = tagihan.id AND b.status = 'PENDING')",
            )
            .bind(tagihan_row.0)
            .bind(nominal_terbaru)
            .execute(self.repo.pool())
            .await?
            .rows_affected();
            if diperbarui > 0 {
                tagihan_row.2 = nominal_terbaru;
                tagihan_row.3 = (nominal_terbaru - tagihan_row.4).max(0);
            }
        }

        // Potongan 100%: tagihan Rp 0 langsung lunas dan calon lanjut ke pengunggahan berkas
        let mut hasil = hasil;
        if tagihan_row.5 == "MENUNGGU_PEMBAYARAN"
            && tagihan_row.3 == 0
            && crate::modules::pembayaran::repository::lunasi_tagihan_gratis(
                self.repo.pool(),
                tagihan_row.0,
            )
            .await?
        {
            tagihan_row.5 = "LUNAS".to_string();
            hasil.status_daftar_ulang = "LUNAS".to_string();
        }

        let tagihan_dto = Some(TagihanDaftarUlangDto {
            id: tagihan_row.0,
            nomor_tagihan: tagihan_row.1,
            nominal_asli: tagihan_row.2,
            nominal_akhir: tagihan_row.3,
            diskon: tagihan_row.4,
            status: tagihan_row.5,
            metode_pembayaran: "TRANSFER_VA_MANDIRI_ATAU_QRIS".to_string(),
            payment_url: None,
            va_number: va_mandiri,
            tgl_jatuh_tempo: Some(tagihan_row.6),
            rincian,
        });

        // Ambil daftar berkas daftar ulang yang telah diunggah
        let berkas_list = self.repo.list_berkas_daftar_ulang(pendaftar.id).await?;

        // Nomor registrasi daftar ulang (dibuat sekali) & status bukti bayar terakhir
        let nomor_registrasi = crate::modules::kelulusan::bukti_bayar::ensure_nomor_registrasi(
            self.repo.pool(),
            pendaftar.id,
        )
        .await?;
        let bukti_terakhir: Option<(String, Option<String>)> = sqlx::query_as(
            "SELECT status, catatan FROM bukti_pembayaran
             WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT'
             ORDER BY created_at DESC LIMIT 1",
        )
        .bind(pendaftar.id)
        .fetch_optional(self.repo.pool())
        .await?;

        let (potongan_persen, benefit_jalur): (i32, Option<String>) = sqlx::query_as(
            "SELECT p.potongan_persen, j.benefit_tambahan
             FROM pendaftar p JOIN jalur_masuk j ON j.id = p.jalur_id WHERE p.id = $1",
        )
        .bind(pendaftar.id)
        .fetch_one(self.repo.pool())
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
            potongan_persen,
            benefit_jalur,
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
        crate::modules::pendaftaran::alur::pastikan_status(
            &pendaftar.status_pendaftaran,
            &[crate::modules::pendaftaran::alur::status::DAFTAR_ULANG_LUNAS],
            "Berkas registrasi ulang dapat diunggah setelah pembayaran daftar ulang disetujui admin PMB.",
        )?;
        let prefix = format!("daftar_ulang/{}/", pendaftar.id);
        if !req.file_key.starts_with(&prefix) || req.file_key.contains("..") {
            return Err(AppError::BadRequest("Kunci berkas tidak valid".to_string()));
        }

        let lengkap_sebelum =
            berkas_daftar_ulang_lengkap(&self.repo.list_berkas_daftar_ulang(pendaftar.id).await?);

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

        // Unggahan baru berstatus PENDING: penanda "berkas lengkap" sebelum NIM terbit tidak berlaku lagi
        if hasil.status_daftar_ulang == "BERKAS_LENGKAP" && hasil.nim_resmi.is_none() {
            self.repo
                .update_status_daftar_ulang(pendaftar.id, "LUNAS")
                .await?;
        }

        // Berkas terakhir terunggah: beri tahu calon bahwa pendaftarannya selesai dan tinggal menunggu admin
        if !lengkap_sebelum
            && berkas_daftar_ulang_lengkap(&self.repo.list_berkas_daftar_ulang(pendaftar.id).await?)
        {
            crate::modules::pendaftaran::alur::kirim_notifikasi(
                self.repo.pool(),
                pendaftar.id,
                "Pendaftaran Anda Telah Selesai",
                PESAN_DAFTAR_ULANG_SELESAI,
                "DAFTAR_ULANG_SELESAI",
            )
            .await;
        }

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
        let all_valid = semua_berkas_daftar_ulang_valid(&all_berkas);

        if !all_valid {
            // Ada berkas yang tidak (lagi) valid: batalkan penanda lengkap yang sebelumnya terpasang
            let hasil = self.repo.find_by_pendaftar_id(b.pendaftar_id).await?;
            if hasil
                .is_some_and(|h| h.status_daftar_ulang == "BERKAS_LENGKAP" && h.nim_resmi.is_none())
            {
                self.repo
                    .update_status_daftar_ulang(b.pendaftar_id, "LUNAS")
                    .await?;
            }
        }

        if all_valid {
            self.repo
                .update_status_daftar_ulang(b.pendaftar_id, "BERKAS_LENGKAP")
                .await?;

            // Registrasi ulang tuntas (bayar disetujui + berkas lengkap) -> NIM terbit
            let status_p: Option<String> =
                sqlx::query_scalar("SELECT status_pendaftaran FROM pendaftar WHERE id = $1")
                    .bind(b.pendaftar_id)
                    .fetch_optional(self.repo.pool())
                    .await?;
            if status_p.as_deref()
                == Some(crate::modules::pendaftaran::alur::status::DAFTAR_ULANG_LUNAS)
            {
                let nim = self.generate_nim_resmi_pendaftar(b.pendaftar_id).await?;
                crate::modules::pendaftaran::alur::kirim_notifikasi(
                    self.repo.pool(),
                    b.pendaftar_id,
                    "Selamat! NIM Resmi Anda Telah Terbit",
                    &format!(
                        "Registrasi ulang Anda telah selesai. NIM resmi Anda: {}. Surat penerimaan (LoA) yang memuat NIM dapat diunduh di menu Daftar Ulang. Selamat bergabung di Universitas Pignatelli Triputra.",
                        nim.nim_resmi
                    ),
                    "NIM_TERBIT",
                )
                .await;
            }
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
        // NIM hanya untuk yang sudah menuntaskan registrasi ulang (bayar disetujui + berkas lengkap)
        if hasil.nim_resmi.is_none()
            && !matches!(
                hasil.status_daftar_ulang.as_str(),
                "BERKAS_LENGKAP" | "TERDAFTAR_SEBAGAI_MAHASISWA"
            )
        {
            return Err(AppError::Conflict(
                "NIM baru dapat diterbitkan setelah pembayaran daftar ulang disetujui dan seluruh berkas registrasi ulang valid"
                    .to_string(),
            ));
        }

        // Penerbitan NIM baru: seluruh berkas daftar ulang wajib harus valid (dicek langsung, bukan
        // hanya dari penanda status)
        if hasil.nim_resmi.is_none()
            && !semua_berkas_daftar_ulang_valid(
                &self.repo.list_berkas_daftar_ulang(pendaftar_id).await?,
            )
        {
            return Err(AppError::Conflict(
                "NIM baru dapat diterbitkan setelah SEMUA berkas daftar ulang berstatus valid"
                    .to_string(),
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

        // Rumus NIM diatur admin (templat + lingkup nomor urut). Nomor urut diambil atomik;
        // bila rumus yang diubah menghasilkan NIM yang sudah pernah terbit, ambil nomor berikutnya.
        // Tahun masuk mengikuti gelombang tempat calon mendaftar (mis. 2027 -> "27")
        let (tahun, kode_angka) = {
            let mut conn = self.repo.pool().acquire().await?;
            (
                crate::modules::pendaftaran::nomor::tahun_masuk(&mut conn, pendaftar.gelombang_id)
                    .await?,
                crate::modules::pendaftaran::nomor::kode_prodi(&mut conn, prodi_id).await?,
            )
        };
        let (template, lingkup, _, _) = self.repo.get_pengaturan_nim().await?;
        let kunci = crate::modules::kelulusan::nim::kunci_pencacah(&lingkup, tahun, prodi_id);
        let mut nim = String::new();
        for _ in 0..20 {
            let urut = self.repo.nomor_urut_berikutnya(&kunci).await?;
            let calon = crate::modules::kelulusan::nim::render(
                &template,
                &crate::modules::kelulusan::nim::KonteksNim {
                    tahun,
                    jenjang: prodi.jenjang.clone(),
                    kode_prodi: prodi.kode_prodi.clone(),
                    kode_angka: kode_angka.clone(),
                    kode_fakultas: prodi.kode_fakultas.clone(),
                    urut,
                },
            )
            .map_err(|e| AppError::BadRequest(format!("Rumus NIM tidak dapat diterapkan: {e}")))?;
            if !self.repo.nim_sudah_dipakai(&calon).await? {
                nim = calon;
                break;
            }
        }
        if nim.is_empty() {
            return Err(AppError::Conflict(
                "Tidak dapat membentuk NIM unik dengan rumus saat ini. Periksa rumus NIM di pengaturan."
                    .to_string(),
            ));
        }

        self.repo.update_nim_resmi(pendaftar_id, &nim).await?;
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = $1, updated_at = NOW() WHERE id = $2",
        )
        .bind(crate::modules::pendaftaran::alur::status::TERDAFTAR)
        .bind(pendaftar_id)
        .execute(self.repo.pool())
        .await?;

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
    // 7b. RUMUS PENOMORAN NIM (diatur admin / super admin)
    // =========================================================================

    /// Panjang kode prodi dan kode fakultas terpanjang pada data saat ini (batas validasi rumus).
    async fn panjang_kode_maks(&self) -> Result<(usize, usize), AppError> {
        let semua = self.master_repo.get_all_prodi().await?;
        let mp = semua.iter().map(|p| p.kode_prodi.chars().count()).max();
        let mf = semua.iter().map(|p| p.kode_fakultas.chars().count()).max();
        Ok((mp.unwrap_or(10), mf.unwrap_or(5)))
    }

    pub async fn get_rumus_nim(&self) -> Result<RumusNimResponse, AppError> {
        use crate::modules::kelulusan::nim;
        let (template, lingkup, oleh, pada) = self.repo.get_pengaturan_nim().await?;
        Ok(RumusNimResponse {
            template,
            lingkup_urut: lingkup,
            template_bawaan: nim::TEMPLATE_BAWAAN.to_string(),
            diperbarui_oleh: oleh,
            diperbarui_pada: Some(pada),
            token: nim::TOKEN
                .iter()
                .map(|(t, k, c)| TokenNimInfo {
                    token: t.to_string(),
                    keterangan: k.to_string(),
                    contoh: c.to_string(),
                })
                .collect(),
            lingkup_pilihan: nim::LINGKUP
                .iter()
                .map(|(k, ket)| LingkupNimInfo {
                    kode: k.to_string(),
                    keterangan: ket.to_string(),
                })
                .collect(),
            panjang_maks: nim::PANJANG_MAKS as i32,
        })
    }

    /// Validasi rumus dan tampilkan contoh NIM per prodi tanpa menyimpan apa pun.
    pub async fn pratinjau_rumus_nim(
        &self,
        template: &str,
        lingkup: &str,
    ) -> Result<PratinjauRumusNimResponse, AppError> {
        use crate::modules::kelulusan::nim;
        let template = template.trim();
        let gagal = |pesan: String| PratinjauRumusNimResponse {
            valid: false,
            pesan: Some(pesan),
            contoh: Vec::new(),
        };
        if !nim::lingkup_valid(lingkup) {
            return Ok(gagal("Lingkup nomor urut tidak dikenal".to_string()));
        }
        let (mp, mf) = self.panjang_kode_maks().await?;
        if let Err(e) = nim::validasi(template, mp, mf) {
            return Ok(gagal(e));
        }
        let tahun = {
            let mut conn = self.repo.pool().acquire().await?;
            crate::modules::pendaftaran::nomor::tahun_masuk_aktif(&mut conn).await?
        };
        let mut contoh = Vec::new();
        for p in self.master_repo.get_all_prodi().await?.into_iter().take(10) {
            let kunci = nim::kunci_pencacah(lingkup, tahun, p.id);
            let urut = self.repo.nomor_urut_terakhir(&kunci).await? + 1;
            let kode_angka = {
                let mut conn = self.repo.pool().acquire().await?;
                crate::modules::pendaftaran::nomor::kode_prodi(&mut conn, p.id).await?
            };
            match nim::render(
                template,
                &nim::KonteksNim {
                    tahun,
                    jenjang: p.jenjang.clone(),
                    kode_prodi: p.kode_prodi.clone(),
                    kode_angka,
                    kode_fakultas: p.kode_fakultas.clone(),
                    urut,
                },
            ) {
                Ok(nim) => contoh.push(ContohNimItem {
                    prodi: format!("{} {}", p.jenjang, p.nama_prodi),
                    kode_prodi: p.kode_prodi,
                    nim,
                }),
                Err(e) => return Ok(gagal(e)),
            }
        }
        Ok(PratinjauRumusNimResponse {
            valid: true,
            pesan: None,
            contoh,
        })
    }

    pub async fn simpan_rumus_nim(
        &self,
        req: SimpanRumusNimRequest,
        actor_id: Uuid,
    ) -> Result<RumusNimResponse, AppError> {
        use crate::modules::kelulusan::nim;
        let template = req.template.trim().to_string();
        if !nim::lingkup_valid(&req.lingkup_urut) {
            return Err(AppError::BadRequest(
                "Lingkup nomor urut tidak dikenal".to_string(),
            ));
        }
        let (mp, mf) = self.panjang_kode_maks().await?;
        nim::validasi(&template, mp, mf).map_err(AppError::BadRequest)?;
        self.repo
            .simpan_pengaturan_nim(&template, &req.lingkup_urut, actor_id)
            .await?;
        self.get_rumus_nim().await
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
/// (id, nomor_tagihan, nominal_asli, nominal_akhir, diskon, status, tgl_jatuh_tempo)
type BarisTagihanDu = (Uuid, String, i64, i64, i64, String, chrono::DateTime<Utc>);

// =========================================================================
// HELPER BIAYA DAFTAR ULANG (dipakai halaman daftar ulang & surat penerimaan)
// =========================================================================

/// Pesan untuk calon setelah seluruh berkas daftar ulang terunggah.
pub const PESAN_DAFTAR_ULANG_SELESAI: &str =
    "Pendaftaran telah selesai. Admin akan memeriksa berkas dan menerbitkan NIM. Mohon menunggu.";

/// Seluruh jenis berkas daftar ulang sudah terunggah (berkas yang ditolak dan belum diunggah ulang
/// tidak dihitung).
pub fn berkas_daftar_ulang_lengkap(berkas: &[BerkasDaftarUlang]) -> bool {
    crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG
        .iter()
        .all(|jenis| {
            berkas
                .iter()
                .rfind(|b| b.jenis_berkas == *jenis)
                .is_some_and(|b| b.status_verifikasi != "INVALID")
        })
}

/// Jumlah jenis berkas daftar ulang wajib yang unggahan terbarunya berstatus VALID.
pub fn jumlah_berkas_wajib_valid(berkas: &[BerkasDaftarUlang]) -> usize {
    crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG
        .iter()
        .filter(|jenis| {
            berkas
                .iter()
                .rfind(|b| b.jenis_berkas == **jenis)
                .is_some_and(|b| b.status_verifikasi == "VALID")
        })
        .count()
}

/// NIM hanya boleh terbit bila SEMUA berkas daftar ulang wajib valid (unggahan terbarunya).
pub fn semua_berkas_daftar_ulang_valid(berkas: &[BerkasDaftarUlang]) -> bool {
    jumlah_berkas_wajib_valid(berkas)
        == crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG.len()
}

/// Biaya daftar ulang = biaya admisi program studi dikurangi biaya formulir pendaftaran
/// yang sudah dibayar calon. Hasilnya tidak pernah di bawah nol.
pub fn biaya_daftar_ulang(admisi: i64, biaya_formulir: i64) -> i64 {
    (admisi - biaya_formulir).max(0)
}

/// Biaya formulir yang sudah dibayar calon (setelah voucher); bila tagihan formulir belum ada,
/// memakai biaya formulir jalurnya.
async fn biaya_formulir_calon(
    pool: &sqlx::PgPool,
    pendaftar_id: Uuid,
    jalur_id: Uuid,
) -> Result<i64, AppError> {
    let tagihan: Option<i64> = sqlx::query_scalar(
        "SELECT nominal_akhir FROM tagihan
         WHERE pendaftar_id = $1 AND jenis_tagihan = 'FORMULIR' AND status <> 'BATAL'
         ORDER BY (status = 'LUNAS') DESC, tgl_terbit DESC LIMIT 1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await?;
    if let Some(n) = tagihan {
        return Ok(n);
    }
    Ok(
        sqlx::query_scalar("SELECT biaya_formulir FROM jalur_masuk WHERE id = $1")
            .bind(jalur_id)
            .fetch_optional(pool)
            .await?
            .unwrap_or(0),
    )
}

/// Rincian biaya daftar ulang: Biaya Admisi program studi (Rincian Biaya Kuliah) dikurangi
/// biaya formulir pendaftaran yang sudah dibayar. Bila admisi prodi belum diisi, memakai matriks
/// biaya (prodi x jalur x gelombang) atau UKT pokok prodi seperti sebelumnya.
pub(crate) async fn rincian_biaya_daftar_ulang(
    pool: &sqlx::PgPool,
    pendaftar_id: Uuid,
    prodi_id: Uuid,
    jalur_id: Uuid,
    gelombang_id: Uuid,
) -> Result<Vec<crate::modules::kelulusan::dto::RincianBiayaDto>, AppError> {
    use crate::modules::kelulusan::dto::RincianBiayaDto;

    let admisi: i64 =
        sqlx::query_scalar("SELECT admisi FROM rincian_biaya_kuliah WHERE prodi_id = $1")
            .bind(prodi_id)
            .fetch_optional(pool)
            .await?
            .unwrap_or(0);
    // Potongan beasiswa jalur READY (persen) untuk biaya DPP dan SKS
    let potongan: i64 =
        sqlx::query_scalar("SELECT potongan_persen::bigint FROM pendaftar WHERE id = $1")
            .bind(pendaftar_id)
            .fetch_optional(pool)
            .await?
            .unwrap_or(0);
    if admisi > 0 {
        let formulir = biaya_formulir_calon(pool, pendaftar_id, jalur_id).await?;
        let potongan_rp = admisi * potongan / 100;
        let setelah_potongan = admisi - potongan_rp;
        let dibayar = biaya_daftar_ulang(setelah_potongan, formulir);
        let mut baris = vec![RincianBiayaDto {
            komponen: "Biaya Admisi".to_string(),
            nominal: admisi,
        }];
        if potongan_rp > 0 {
            baris.push(RincianBiayaDto {
                komponen: format!("Potongan beasiswa {potongan}%"),
                nominal: -potongan_rp,
            });
        }
        // Jumlah baris selalu sama dengan biaya akhir (tidak negatif)
        baris.push(RincianBiayaDto {
            komponen: "Dikurangi biaya formulir pendaftaran".to_string(),
            nominal: dibayar - setelah_potongan,
        });
        return Ok(baris);
    }

    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT k.nama_komponen, m.nominal
         FROM matriks_biaya m
         JOIN komponen_biaya k ON k.id = m.komponen_id
         WHERE m.prodi_id = $1 AND m.jalur_id = $2 AND m.gelombang_id = $3
           AND k.is_active = TRUE AND m.nominal > 0
         ORDER BY k.kode_komponen ASC",
    )
    .bind(prodi_id)
    .bind(jalur_id)
    .bind(gelombang_id)
    .fetch_all(pool)
    .await?;

    if !rows.is_empty() {
        let mut baris: Vec<RincianBiayaDto> = rows
            .into_iter()
            .map(|(komponen, nominal)| RincianBiayaDto { komponen, nominal })
            .collect();
        let total: i64 = baris.iter().map(|r| r.nominal).sum();
        if potongan > 0 {
            baris.push(RincianBiayaDto {
                komponen: format!("Potongan beasiswa {potongan}%"),
                nominal: -(total * potongan / 100),
            });
        }
        return Ok(baris);
    }

    let ukt: Option<i64> =
        sqlx::query_scalar("SELECT ukt_nominal FROM program_studi WHERE id = $1")
            .bind(prodi_id)
            .fetch_optional(pool)
            .await?;
    let ukt = ukt.ok_or_else(|| {
        AppError::Internal("Biaya daftar ulang untuk program studi ini belum diatur".to_string())
    })?;
    let mut baris = vec![RincianBiayaDto {
        komponen: "UKT Semester 1".to_string(),
        nominal: ukt,
    }];
    if potongan > 0 {
        baris.push(RincianBiayaDto {
            komponen: format!("Potongan beasiswa {potongan}%"),
            nominal: -(ukt * potongan / 100),
        });
    }
    Ok(baris)
}

/// Batas bayar daftar ulang: tanggal batas gelombang (akhir hari WIB), atau 14 hari dari sekarang.
pub(crate) async fn batas_daftar_ulang(
    pool: &sqlx::PgPool,
    gelombang_id: Uuid,
) -> Result<chrono::DateTime<Utc>, AppError> {
    let tgl: Option<chrono::NaiveDate> =
        sqlx::query_scalar("SELECT tgl_batas_daftar_ulang FROM gelombang WHERE id = $1")
            .bind(gelombang_id)
            .fetch_optional(pool)
            .await?
            .flatten();

    let batas = tgl
        .and_then(|d| d.and_hms_opt(23, 59, 59))
        // 23:59:59 WIB = 16:59:59 UTC
        .map(|dt| dt.and_utc() - chrono::Duration::hours(7))
        .filter(|t| *t > Utc::now())
        .unwrap_or_else(|| Utc::now() + chrono::Duration::days(14));
    Ok(batas)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn berkas(jenis: &str, status: &str) -> BerkasDaftarUlang {
        BerkasDaftarUlang {
            id: Uuid::new_v4(),
            pendaftar_id: Uuid::nil(),
            jenis_berkas: jenis.to_string(),
            file_key: "k".into(),
            file_name: "f.pdf".into(),
            mime_type: "application/pdf".into(),
            file_size_bytes: 1,
            status_verifikasi: status.to_string(),
            catatan: None,
            uploaded_at: Utc::now(),
            verified_by: None,
            verified_at: None,
        }
    }

    #[test]
    fn nim_hanya_bila_semua_berkas_wajib_valid() {
        let jenis = crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG;
        let mut l: Vec<_> = jenis.iter().map(|j| berkas(j, "VALID")).collect();
        assert!(semua_berkas_daftar_ulang_valid(&l));
        assert_eq!(jumlah_berkas_wajib_valid(&l), jenis.len());
        // satu berkas belum diperiksa -> belum boleh
        l[2].status_verifikasi = "PENDING".into();
        assert!(!semua_berkas_daftar_ulang_valid(&l));
        // unggahan lama VALID tidak menolong bila unggahan terbaru ditolak/menunggu
        let mut l: Vec<_> = jenis.iter().map(|j| berkas(j, "VALID")).collect();
        l.push(berkas(jenis[0], "PENDING"));
        assert!(!semua_berkas_daftar_ulang_valid(&l));
        // berkas kurang
        assert!(!semua_berkas_daftar_ulang_valid(&l[..3]));
    }

    #[test]
    fn berkas_daftar_ulang_lengkap_bila_semua_jenis_terunggah() {
        let semua: Vec<_> = crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG
            .iter()
            .map(|j| berkas(j, "PENDING"))
            .collect();
        assert!(berkas_daftar_ulang_lengkap(&semua));
        assert!(!berkas_daftar_ulang_lengkap(&semua[..5]));
        assert!(!berkas_daftar_ulang_lengkap(&[]));
    }

    #[test]
    fn berkas_ditolak_dihitung_belum_terunggah_sampai_diunggah_ulang() {
        let mut semua: Vec<_> = crate::modules::kelulusan::handler::JENIS_BERKAS_DAFTAR_ULANG
            .iter()
            .map(|j| berkas(j, "PENDING"))
            .collect();
        semua[3].status_verifikasi = "INVALID".into();
        assert!(!berkas_daftar_ulang_lengkap(&semua));
        // diunggah ulang (baris terbaru) -> kembali lengkap
        semua.push(berkas(&semua[3].jenis_berkas.clone(), "PENDING"));
        assert!(berkas_daftar_ulang_lengkap(&semua));
    }

    #[test]
    fn biaya_daftar_ulang_admisi_dikurangi_formulir() {
        assert_eq!(biaya_daftar_ulang(5_000_000, 250_000), 4_750_000);
        // formulir gratis (beasiswa/voucher penuh): tidak ada pengurang
        assert_eq!(biaya_daftar_ulang(5_000_000, 0), 5_000_000);
        // tidak pernah negatif
        assert_eq!(biaya_daftar_ulang(200_000, 250_000), 0);
    }

    fn prodi(passing: f64, kuota: i32) -> crate::modules::kelulusan::repository::ProdiQuotaInfo {
        crate::modules::kelulusan::repository::ProdiQuotaInfo {
            id: Uuid::new_v4(),
            nama: "P".into(),
            kode: "P".into(),
            jenjang: "S1".into(),
            kuota,
            passing_grade: passing,
            fakultas: "F".into(),
        }
    }

    #[test]
    fn keputusan_lulus_pilihan_1() {
        let (p1, p2) = (prodi(75.0, 10), prodi(60.0, 10));
        let mut kuota = HashMap::new();
        let k = tentukan_keputusan(80.0, Some(&p1), Some(&p2), &mut kuota);
        assert_eq!(k.status, "LULUS_PILIHAN_1");
        assert_eq!(k.prodi_diterima_id, Some(p1.id));
        assert_eq!(kuota[&p1.id], 1);
    }

    #[test]
    fn gagal_pilihan_1_otomatis_ke_pilihan_2_tanpa_ujian_ulang() {
        // Skor 68 < passing prodi 1 (75) tetapi >= passing prodi 2 (60): dialihkan otomatis
        let (p1, p2) = (prodi(75.0, 10), prodi(60.0, 10));
        let mut kuota = HashMap::new();
        let k = tentukan_keputusan(68.0, Some(&p1), Some(&p2), &mut kuota);
        assert_eq!(k.status, "LULUS_PILIHAN_2");
        assert_eq!(k.prodi_diterima_id, Some(p2.id));
        assert_eq!(k.pilihan_ke, Some(2));
        assert!(!kuota.contains_key(&p1.id));
    }

    #[test]
    fn kuota_pilihan_1_penuh_dialihkan_ke_pilihan_2() {
        let (p1, p2) = (prodi(60.0, 1), prodi(60.0, 5));
        let mut kuota = HashMap::new();
        assert_eq!(
            tentukan_keputusan(90.0, Some(&p1), Some(&p2), &mut kuota).status,
            "LULUS_PILIHAN_1"
        );
        let k = tentukan_keputusan(85.0, Some(&p1), Some(&p2), &mut kuota);
        assert_eq!(k.status, "LULUS_PILIHAN_2");
        assert_eq!(k.prodi_diterima_id, Some(p2.id));
    }

    #[test]
    fn tanpa_pilihan_2_atau_gagal_keduanya() {
        let (p1, p2) = (prodi(75.0, 10), prodi(70.0, 10));
        let mut kuota = HashMap::new();
        // dekat ambang -> cadangan; jauh -> tidak lulus
        assert_eq!(
            tentukan_keputusan(72.0, Some(&p1), None, &mut kuota).status,
            "CADANGAN"
        );
        assert_eq!(
            tentukan_keputusan(50.0, Some(&p1), Some(&p2), &mut kuota).status,
            "TIDAK_LULUS"
        );
        assert!(kuota.is_empty());
    }

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
