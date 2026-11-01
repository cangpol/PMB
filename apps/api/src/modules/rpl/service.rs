use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    modules::rpl::{
        dto::{
            AssignAsesorRequest, CreateMataKuliahRequest, LaporanRplResponse, RplItemRekapDto,
            RplPermohonanDetailResponse, SubmitPenilaianRplRequest, SubmitRplPermohonanRequest,
            UpdateMataKuliahRequest,
        },
        model::{MataKuliah, RplMataKuliahDiajukanDetail},
        repository::RplRepository,
    },
};

// =============================================================================
// FUNGSI MURNI KALKULASI & FORMATTING (UNIT-TESTABLE)
// =============================================================================

/// Mengubah nilai transfer huruf menjadi bobot angka IPK (skala 4.0).
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

/// Menghitung akumulasi SKS diajukan, SKS diakui, IPK konversi, dan persentase rekognisi.
/// IPK konversi dihitung dari mata kuliah yang berstatus DIAKUI: sum(bobot * sks) / sum(sks).
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

/// Menghasilkan format teks CSV untuk Berita Acara Rekognisi Pembelajaran Lampau (RPL).
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
// SERVICE RPL
// =============================================================================

#[derive(Clone)]
pub struct RplService {
    repo: RplRepository,
}

impl RplService {
    pub fn new(repo: RplRepository) -> Self {
        Self { repo }
    }

    pub fn repo(&self) -> &RplRepository {
        &self.repo
    }

    // =========================================================================
    // 1. MASTER MATA KULIAH KURIKULUM
    // =========================================================================

    pub async fn get_mata_kuliah_by_prodi(
        &self,
        prodi_id: Uuid,
    ) -> Result<Vec<MataKuliah>, AppError> {
        self.repo.list_mata_kuliah_by_prodi(prodi_id).await
    }

    pub async fn list_all_mata_kuliah(&self) -> Result<Vec<MataKuliah>, AppError> {
        self.repo.list_all_mata_kuliah().await
    }

    pub async fn create_mata_kuliah(
        &self,
        auth_user: &AuthUser,
        req: CreateMataKuliahRequest,
    ) -> Result<MataKuliah, AppError> {
        if !auth_user.is_admin() {
            return Err(AppError::Forbidden(
                "Hanya admin PMB yang dapat menambahkan kurikulum mata kuliah RPL".to_string(),
            ));
        }
        self.repo.create_mata_kuliah(req).await
    }

    pub async fn update_mata_kuliah(
        &self,
        auth_user: &AuthUser,
        id: Uuid,
        req: UpdateMataKuliahRequest,
    ) -> Result<MataKuliah, AppError> {
        if !auth_user.is_admin() {
            return Err(AppError::Forbidden(
                "Hanya admin PMB yang dapat mengubah kurikulum mata kuliah RPL".to_string(),
            ));
        }
        self.repo.update_mata_kuliah(id, req).await
    }

    // =========================================================================
    // 2. PERMOHONAN RPL CALON MAHASISWA
    // =========================================================================

    pub async fn get_my_permohonan(
        &self,
        auth_user: &AuthUser,
    ) -> Result<RplPermohonanDetailResponse, AppError> {
        let pendaftar = self
            .repo
            .find_pendaftar_by_user_id(auth_user.user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Anda belum terdaftar dalam sistem PMB".to_string())
            })?;

        let (pendaftar_id, jalur_id, _prodi_id, _no_reg) = pendaftar;

        // Validasi apakah jalur pendaftaran memiliki langkah RPL
        let has_rpl = self.repo.check_jalur_has_rpl_step(jalur_id).await?;
        if !has_rpl {
            return Err(AppError::BadRequest(
                "Jalur pendaftaran yang Anda pilih bukan Jalur RPL (Rekognisi Pembelajaran Lampau)"
                    .to_string(),
            ));
        }

        let permohonan = self.repo.get_or_create_permohonan(pendaftar_id).await?;

        let detail = self
            .repo
            .get_permohonan_detail_response(permohonan.id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data permohonan RPL tidak ditemukan".to_string()))?;

        Ok(detail)
    }

    pub async fn submit_permohonan(
        &self,
        auth_user: &AuthUser,
        req: SubmitRplPermohonanRequest,
    ) -> Result<RplPermohonanDetailResponse, AppError> {
        let pendaftar = self
            .repo
            .find_pendaftar_by_user_id(auth_user.user_id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Anda belum terdaftar dalam sistem PMB".to_string())
            })?;

        let (pendaftar_id, jalur_id, prodi_id, _no_reg) = pendaftar;

        // Validasi apakah jalur pendaftaran memiliki langkah RPL
        let has_rpl = self.repo.check_jalur_has_rpl_step(jalur_id).await?;
        if !has_rpl {
            return Err(AppError::BadRequest(
                "Jalur pendaftaran yang Anda pilih bukan Jalur RPL (Rekognisi Pembelajaran Lampau)"
                    .to_string(),
            ));
        }

        if req.mata_kuliah_list.is_empty() {
            return Err(AppError::BadRequest(
                "Minimal satu mata kuliah harus diajukan untuk rekognisi RPL".to_string(),
            ));
        }

        let permohonan = self.repo.get_or_create_permohonan(pendaftar_id).await?;

        if permohonan.status == "SELESAI_DINILAI" || permohonan.status == "DALAM_PENILAIAN" {
            return Err(AppError::BadRequest(
                "Permohonan RPL sedang dalam proses penilaian atau sudah selesai dinilai dan tidak dapat diubah lagi".to_string(),
            ));
        }

        // Simpan mata kuliah diajukan dengan validasi kurikulum prodi calon
        let total_sks_diajukan = self
            .repo
            .replace_mata_kuliah_diajukan(permohonan.id, prodi_id, &req.mata_kuliah_list)
            .await?;

        let status = if req.is_draft { "DRAFT" } else { "DIAJUKAN" };

        self.repo
            .update_permohonan_content(
                permohonan.id,
                &req.tipe_rpl,
                &req.riwayat_pendidikan,
                &req.pengalaman_kerja,
                &req.berkas_pendukung,
                status,
                total_sks_diajukan,
            )
            .await?;

        // Integrasi Langkah Pendaftaran: jika diajukan, tandai langkah RPL sebagai SELESAI
        if status == "DIAJUKAN" {
            let data_langkah = serde_json::json!({
                "permohonan_id": permohonan.id,
                "total_sks_diajukan": total_sks_diajukan,
                "tipe_rpl": req.tipe_rpl,
            });
            self.repo
                .upsert_rpl_step_state(pendaftar_id, jalur_id, "SELESAI", &data_langkah)
                .await?;
        }

        let detail = self
            .repo
            .get_permohonan_detail_response(permohonan.id)
            .await?
            .ok_or_else(|| {
                AppError::NotFound(
                    "Data permohonan RPL tidak ditemukan setelah disimpan".to_string(),
                )
            })?;

        Ok(detail)
    }

    // =========================================================================
    // 3. DAFTAR & DETAIL PERMOHONAN (ADMIN & ASESOR DENGAN ISOLASI OTORISASI)
    // =========================================================================

    pub async fn list_permohonan(
        &self,
        auth_user: &AuthUser,
        prodi_id: Option<Uuid>,
        status: Option<&str>,
    ) -> Result<Vec<RplItemRekapDto>, AppError> {
        if auth_user.role == "asesor_rpl" {
            // Asesor hanya dapat melihat permohonan yang ditugaskan kepadanya secara ketat
            self.repo
                .list_permohonan_asesor(auth_user.user_id, status)
                .await
        } else if auth_user.is_admin() {
            // Admin PMB & Super Admin melihat semua permohonan
            self.repo.list_permohonan_admin(prodi_id, status).await
        } else {
            Err(AppError::Forbidden(
                "Anda tidak memiliki hak akses untuk melihat daftar permohonan RPL".to_string(),
            ))
        }
    }

    pub async fn get_permohonan_detail(
        &self,
        auth_user: &AuthUser,
        permohonan_id: Uuid,
    ) -> Result<RplPermohonanDetailResponse, AppError> {
        let detail = self
            .repo
            .get_permohonan_detail_response(permohonan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data permohonan RPL tidak ditemukan".to_string()))?;

        // Validasi Otorisasi:
        if auth_user.role == "asesor_rpl" {
            // Asesor hanya boleh melihat permohonan jika asesor_id cocok dengan user_id miliknya
            if detail.asesor_id != Some(auth_user.user_id) {
                return Err(AppError::Forbidden(
                    "Akses ditolak: Anda tidak ditugaskan sebagai asesor untuk permohonan RPL ini."
                        .to_string(),
                ));
            }
        } else if !auth_user.is_admin() {
            // Calon mahasiswa hanya boleh melihat permohonan miliknya sendiri
            let pendaftar = self
                .repo
                .find_pendaftar_by_user_id(auth_user.user_id)
                .await?;
            if let Some((p_id, ..)) = pendaftar {
                if p_id != detail.pendaftar_id {
                    return Err(AppError::Forbidden(
                        "Anda tidak berhak mengakses permohonan RPL milik pendaftar lain"
                            .to_string(),
                    ));
                }
            } else {
                return Err(AppError::Forbidden("Akses ditolak".to_string()));
            }
        }

        Ok(detail)
    }

    // =========================================================================
    // 4. PENUGASAN ASESOR (ADMIN ONLY)
    // =========================================================================

    pub async fn assign_asesor(
        &self,
        auth_user: &AuthUser,
        permohonan_id: Uuid,
        req: AssignAsesorRequest,
    ) -> Result<RplPermohonanDetailResponse, AppError> {
        if !auth_user.is_admin() {
            return Err(AppError::Forbidden(
                "Hanya admin PMB yang berhak menugaskan asesor RPL".to_string(),
            ));
        }

        let permohonan = self
            .repo
            .get_permohonan_by_id(permohonan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Permohonan RPL tidak ditemukan".to_string()))?;

        if permohonan.status == "DRAFT" {
            return Err(AppError::BadRequest(
                "Permohonan RPL masih berstatus DRAFT dan belum diajukan oleh calon mahasiswa"
                    .to_string(),
            ));
        }

        // Validasi keberadaan user asesor
        let asesor_row =
            sqlx::query_as::<_, (Uuid, String)>("SELECT id, role FROM users WHERE id = $1")
                .bind(req.asesor_id)
                .fetch_optional(self.repo.pool())
                .await?;

        let (_uid, role) = asesor_row
            .ok_or_else(|| AppError::NotFound("User asesor tidak ditemukan".to_string()))?;

        if role != "asesor_rpl" && role != "admin_pmb" && role != "super_admin" {
            return Err(AppError::BadRequest(
                "User yang dipilih tidak memiliki wewenang sebagai asesor RPL".to_string(),
            ));
        }

        self.repo
            .assign_asesor(
                permohonan_id,
                req.asesor_id,
                auth_user.user_id,
                req.catatan_admin.as_deref(),
            )
            .await?;

        self.get_permohonan_detail(auth_user, permohonan_id).await
    }

    // =========================================================================
    // 5. PENILAIAN PER MATA KULIAH & HASIL KONVERSI (ASESOR / ADMIN)
    // =========================================================================

    pub async fn submit_penilaian(
        &self,
        auth_user: &AuthUser,
        permohonan_id: Uuid,
        req: SubmitPenilaianRplRequest,
    ) -> Result<RplPermohonanDetailResponse, AppError> {
        if !auth_user.is_asesor() {
            return Err(AppError::Forbidden(
                "Hanya asesor RPL atau admin PMB yang dapat melakukan penilaian mata kuliah"
                    .to_string(),
            ));
        }

        let permohonan = self
            .repo
            .get_permohonan_by_id(permohonan_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Permohonan RPL tidak ditemukan".to_string()))?;

        if permohonan.status == "SELESAI_DINILAI" {
            return Err(AppError::BadRequest(
                "Penilaian permohonan RPL ini sudah difinalisasi dan telah dikunci".to_string(),
            ));
        }

        // Jika user adalah asesor_rpl biasa, pastikan dia ditugaskan untuk permohonan ini
        if auth_user.role == "asesor_rpl" && permohonan.asesor_id != Some(auth_user.user_id) {
            return Err(AppError::Forbidden(
                "Akses ditolak: Anda tidak ditugaskan untuk menilai permohonan RPL ini."
                    .to_string(),
            ));
        }

        // Update nilai per mata kuliah
        for item in &req.items {
            let (bobot, nilai_transfer) = if item.status_kelayakan == "DIAKUI" {
                (
                    item.nilai_transfer.as_deref().map(hitung_bobot_nilai),
                    item.nilai_transfer.as_deref(),
                )
            } else {
                (None, None)
            };

            self.repo
                .update_penilaian_mata_kuliah(
                    permohonan_id,
                    item.mata_kuliah_id,
                    &item.status_kelayakan,
                    nilai_transfer,
                    bobot,
                    item.catatan_asesor.as_deref(),
                    auth_user.user_id,
                )
                .await?;
        }

        // Ambil daftar mata kuliah setelah diupdate untuk menghitung konversi SKS & IPK
        let items_updated = self
            .repo
            .list_mata_kuliah_diajukan_detail(permohonan_id)
            .await?;
        let (_sks_diajukan, sks_diakui, ipk_konversi, persentase) =
            hitung_rekap_konversi_sks(&items_updated);

        // Jika finalisasi, ubah status menjadi SELESAI_DINILAI dan update langkah pendaftaran
        if req.finalisasi {
            // Validasi bahwa tidak ada lagi mata kuliah dengan status MENUNGGU
            let unassessed: Vec<_> = items_updated
                .iter()
                .filter(|i| i.status_kelayakan == "MENUNGGU")
                .collect();
            if !unassessed.is_empty() {
                return Err(AppError::BadRequest(format!(
                    "Semua mata kuliah harus dievaluasi (DIAKUI atau DITOLAK) sebelum difinalisasi. Masih ada {} mata kuliah berstatus MENUNGGU.",
                    unassessed.len()
                )));
            }

            self.repo
                .finalize_penilaian(
                    permohonan_id,
                    sks_diakui,
                    ipk_konversi,
                    persentase,
                    req.catatan_asesor.as_deref(),
                )
                .await?;

            // Ambil data jalur pendaftar untuk memperbarui state langkah
            let pendaftar_info =
                sqlx::query_as::<_, (Uuid,)>("SELECT jalur_id FROM pendaftar WHERE id = $1")
                    .bind(permohonan.pendaftar_id)
                    .fetch_optional(self.repo.pool())
                    .await?;

            if let Some((jalur_id,)) = pendaftar_info {
                let data_langkah = serde_json::json!({
                    "permohonan_id": permohonan_id,
                    "total_sks_diakui": sks_diakui,
                    "ipk_konversi": ipk_konversi,
                    "persentase_rekognisi": persentase,
                });
                self.repo
                    .upsert_rpl_step_state(
                        permohonan.pendaftar_id,
                        jalur_id,
                        "TERVERIFIKASI",
                        &data_langkah,
                    )
                    .await?;
            }
        } else {
            // Simpan draf penilaian: update progress angka konversi dan status DALAM_PENILAIAN
            self.repo
                .save_draft_penilaian(
                    permohonan_id,
                    sks_diakui,
                    ipk_konversi,
                    persentase,
                    req.catatan_asesor.as_deref(),
                )
                .await?;
        }

        self.get_permohonan_detail(auth_user, permohonan_id).await
    }

    // =========================================================================
    // 6. LAPORAN & EKSPOR CSV
    // =========================================================================

    pub async fn get_laporan_rpl(
        &self,
        auth_user: &AuthUser,
        permohonan_id: Uuid,
    ) -> Result<LaporanRplResponse, AppError> {
        // Cek otorisasi lewat get_permohonan_detail
        self.get_permohonan_detail(auth_user, permohonan_id).await?;
        self.repo.get_data_laporan_rpl(permohonan_id).await
    }

    pub async fn export_laporan_csv(
        &self,
        auth_user: &AuthUser,
        permohonan_id: Uuid,
    ) -> Result<String, AppError> {
        let laporan = self.get_laporan_rpl(auth_user, permohonan_id).await?;
        Ok(to_csv_laporan_rpl(&laporan))
    }
}
