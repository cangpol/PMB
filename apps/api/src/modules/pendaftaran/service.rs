use chrono::{DateTime, NaiveDate, Utc};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::{
        email_queue::repository::EmailQueueRepository,
        pendaftaran::{
            alur::{self, status},
            dto::{
                BerkasCalonItem, BerkasCalonRingkasan, BerkasDetailItem, BerkasResponse,
                CreateDefinisiBerkasRequest, CreateDefinisiFieldRequest,
                CreateDefinisiLangkahRequest, DashboardSummaryResponse, HasilSahkanCalon,
                KonfirmasiUploadRequest, LangkahProgressItem, PendaftarDetailResponse,
                PendaftaranOfflineRequest, PendaftaranOfflineResponse, PilihProdiRequest,
                PresignUploadRequest, RingkasanBerkasDashboard, RingkasanBiayaItem,
                RingkasanCbtDashboard, SahkanSemuaBerkasRequest, SahkanSemuaBerkasResponse,
                SubmitAkademikRequest, SubmitBiodataRequest, SubmitDinamisRequest,
                UpdateDefinisiBerkasRequest, UpdateDefinisiFieldRequest,
                UpdateDefinisiLangkahRequest, VerifikasiBerkasRequest,
            },
            model::{DefinisiBerkas, DefinisiField, DefinisiLangkah, Pendaftar},
            pdf,
            repository::PendaftaranRepository,
            validator::DynamicFormValidator,
        },
    },
    security::{
        password::hash_password,
        storage::{PresignedDownloadResponse, PresignedUploadResponse, StorageService},
    },
};

#[derive(Clone)]
pub struct PendaftaranService {
    repo: PendaftaranRepository,
    storage: StorageService,
}

impl PendaftaranService {
    pub fn new(repo: PendaftaranRepository, storage: StorageService) -> Self {
        Self { repo, storage }
    }

    // ==========================================
    // 1. MESIN FORM DINAMIS (CALON MAHASISWA)
    // ==========================================

    pub async fn get_fields(&self, jalur_id: Option<Uuid>) -> Result<Vec<DefinisiField>, AppError> {
        self.repo.list_fields(jalur_id).await
    }

    pub async fn get_berkas_syarat(&self, user_id: Uuid) -> Result<Vec<BerkasCalonItem>, AppError> {
        let pendaftar = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
            AppError::BadRequest("Silakan isi formulir pendaftaran terlebih dahulu".to_string())
        })?;

        self.repo
            .get_calon_berkas_list(pendaftar.id, pendaftar.jalur_id, &prodi_pilihan(&pendaftar))
            .await
    }

    pub async fn submit_formulir_dinamis(
        &self,
        user_id: Uuid,
        req: SubmitDinamisRequest,
    ) -> Result<PendaftarDetailResponse, AppError> {
        let existing = self.repo.find_by_user_id(user_id).await?;

        // Formulir terkunci setelah dikirim (status bukan DRAFT)
        if let Some(ref ex) = existing {
            alur::pastikan_status(
                &ex.status_pendaftaran,
                &[status::DRAFT],
                "Formulir sudah dikirim dan terkunci. Hubungi panitia PMB bila ada data yang perlu diperbaiki.",
            )?;
        }

        let wajib_dipilih =
            |nama: &str| AppError::Validation(vec![format!("{nama}: wajib dipilih")]);
        let jalur_id = req
            .jalur_id
            .or_else(|| existing.as_ref().map(|p| p.jalur_id))
            .ok_or_else(|| wajib_dipilih("jalur_id"))?;

        let gelombang_id = req
            .gelombang_id
            .or_else(|| existing.as_ref().map(|p| p.gelombang_id))
            .ok_or_else(|| wajib_dipilih("gelombang_id"))?;

        let prodi_1 = req
            .prodi_pilihan_1
            .or_else(|| existing.as_ref().map(|p| p.prodi_pilihan_1))
            .ok_or_else(|| wajib_dipilih("prodi_pilihan_1"))?;

        let prodi_2 = req
            .prodi_pilihan_2
            .or_else(|| existing.as_ref().and_then(|p| p.prodi_pilihan_2));

        if let Some(p2) = prodi_2 {
            if p2 == prodi_1 {
                return Err(AppError::BadRequest(
                    "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama".to_string(),
                ));
            }
        }

        // 1. Ambil definisi field aktif
        let fields = self.repo.list_fields(Some(jalur_id)).await?;

        // 2. Validasi Server menggunakan DynamicFormValidator
        let val_res = DynamicFormValidator::validate(&fields, &req.data);
        if !val_res.is_valid {
            let error_msgs: Vec<String> = val_res
                .errors
                .iter()
                .map(|e| format!("{}: {}", e.field, e.message))
                .collect();
            return Err(AppError::Validation(error_msgs));
        }

        // 3. Tentukan nomor pendaftaran
        let nomor_pendaftaran = match existing {
            Some(ref p) => p.nomor_pendaftaran.clone(),
            None => {
                let seq = self.repo.get_next_sequence().await?;
                format!("PMB-2026-{:04}", seq)
            }
        };

        // 4. Petakan isian formulir dinamis ke kolom identitas pendaftar
        let k = KolomIdentitas::dari_formulir(&req.data, existing.as_ref());

        let p = self
            .repo
            .upsert_formulir_dinamis(
                user_id,
                &nomor_pendaftaran,
                jalur_id,
                gelombang_id,
                prodi_1,
                prodi_2,
                &req.data,
                &k.nik,
                &k.tempat_lahir,
                k.tgl_lahir,
                k.jenis_kelamin,
                &k.agama,
                &k.alamat_lengkap,
                &k.nama_ortu,
                &k.no_hp_ortu,
                &k.asal_sekolah,
                &k.jurusan_sekolah,
                k.nilai_rapor_avg,
            )
            .await?;

        // 5. Simpan pilihan sesi CBT (tanggal seleksi). Kuota dikunci saat formulir dikirim.
        if let Some(sesi_id) = req.sesi_ujian_id {
            validasi_sesi_pilihan(self.repo.pool(), sesi_id, gelombang_id, jalur_id).await?;
            sqlx::query(
                "UPDATE pendaftar SET sesi_ujian_id = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(sesi_id)
            .bind(p.id)
            .execute(self.repo.pool())
            .await?;
        }

        // 6. Update state langkah 'biodata' menjadi SELESAI
        let langkah_list = self.repo.list_definisi_langkah(Some(jalur_id)).await?;
        if let Some(step_bio) = langkah_list.iter().find(|l| l.kode_langkah == "biodata") {
            let _ = self
                .repo
                .upsert_state_langkah(
                    p.id,
                    step_bio.id,
                    "SELESAI",
                    &serde_json::json!({"terakhir_simpan": chrono::Utc::now()}),
                )
                .await;
        }

        self.get_my_pendaftaran(user_id).await
    }

    // ==========================================
    // 2. UNGGAH BERKAS MINIO PRESIGNED URL
    // ==========================================

    pub async fn presign_upload(
        &self,
        user_id: Uuid,
        req: PresignUploadRequest,
    ) -> Result<PresignedUploadResponse, AppError> {
        let pendaftar = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
            AppError::BadRequest("Silakan isi formulir biodata terlebih dahulu".to_string())
        })?;
        pastikan_boleh_unggah_berkas(&pendaftar)?;

        let def_berkas = self
            .definisi_berkas_milik(&pendaftar, req.definisi_berkas_id)
            .await?;

        // Validasi ukuran berkas
        let max_bytes = (def_berkas.ukuran_maks_kb as i64) * 1024;
        if req.file_size_bytes > max_bytes {
            return Err(AppError::BadRequest(format!(
                "Ukuran berkas melebihi batas maksimal {} KB",
                def_berkas.ukuran_maks_kb
            )));
        }

        // Validasi tipe & ekstensi file
        validasi_format_berkas(&def_berkas.tipe_file, &req.file_name, &req.mime_type)?;

        let clean_filename = req
            .file_name
            .replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '_', "_");
        let file_key = format!(
            "berkas/{}/{}_{}_{}",
            pendaftar.id,
            def_berkas.kode_berkas,
            Uuid::new_v4(),
            clean_filename
        );

        let presigned = self.storage.generate_presigned_put_url(&file_key, 900);
        Ok(presigned)
    }

    pub async fn konfirmasi_upload(
        &self,
        user_id: Uuid,
        req: KonfirmasiUploadRequest,
    ) -> Result<BerkasCalonItem, AppError> {
        let pendaftar =
            self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
                AppError::BadRequest("Data pendaftar tidak ditemukan".to_string())
            })?;
        pastikan_boleh_unggah_berkas(&pendaftar)?;

        let def_berkas = self
            .definisi_berkas_milik(&pendaftar, req.definisi_berkas_id)
            .await?;

        // 1. Validasi kepemilikan file_key (IDOR Protection)
        let expected_prefix = format!("berkas/{}/", pendaftar.id);
        if !req.file_key.starts_with(&expected_prefix) {
            return Err(AppError::Forbidden(
                "Kunci berkas tidak valid untuk akun pendaftar ini".to_string(),
            ));
        }

        // 2. Validasi batas ukuran berkas
        let max_bytes = (def_berkas.ukuran_maks_kb as i64) * 1024;
        if req.file_size_bytes <= 0 || req.file_size_bytes > max_bytes {
            return Err(AppError::BadRequest(format!(
                "Ukuran berkas tidak valid atau melebihi batas maksimal {} KB",
                def_berkas.ukuran_maks_kb
            )));
        }

        // 3. Validasi tipe & ekstensi file
        validasi_format_berkas(&def_berkas.tipe_file, &req.file_name, &req.mime_type)?;

        let b = self
            .repo
            .save_berkas_dinamis(
                pendaftar.id,
                def_berkas.id,
                &def_berkas.kode_berkas,
                &req.file_key,
                &req.file_name,
                &req.mime_type,
                req.file_size_bytes,
            )
            .await?;

        // Cek kelengkapan berkas wajib (berkas terbaru per jenis)
        let ringkasan = self.ringkasan_berkas(&pendaftar).await?;
        let semua_wajib_lengkap = ringkasan.lengkap;

        // Semua berkas wajib terunggah & tidak ada yang masih berstatus ditolak
        // -> masuk antrean verifikasi admin.
        if ringkasan.lengkap && !ringkasan.ada_ditolak {
            let _ = alur::transisi_status(
                self.repo.pool(),
                pendaftar.id,
                &[status::PEMBAYARAN_DISETUJUI, status::BERKAS_REVISION],
                status::MENUNGGU_VERIFIKASI_BERKAS,
                "",
            )
            .await;
        }

        if semua_wajib_lengkap {
            let langkah_list = self
                .repo
                .list_definisi_langkah(Some(pendaftar.jalur_id))
                .await?;
            if let Some(step_berkas) = langkah_list.iter().find(|l| l.kode_langkah == "berkas") {
                let _ = self
                    .repo
                    .upsert_state_langkah(
                        pendaftar.id,
                        step_berkas.id,
                        "SELESAI",
                        &serde_json::json!({"selesai_upload_wajib": true}),
                    )
                    .await;
            }
        }

        Ok(BerkasCalonItem {
            id: Some(b.id),
            definisi_berkas_id: def_berkas.id,
            kode_berkas: def_berkas.kode_berkas,
            nama: def_berkas.nama,
            deskripsi: def_berkas.deskripsi,
            wajib: def_berkas.wajib,
            tipe_file: def_berkas.tipe_file,
            ukuran_maks_kb: def_berkas.ukuran_maks_kb,
            urutan: def_berkas.urutan,
            file_key: Some(b.file_key),
            file_name: Some(b.file_name),
            mime_type: Some(b.mime_type),
            file_size_bytes: Some(b.file_size_bytes),
            status_verifikasi: b.status_verifikasi,
            catatan: b.catatan,
            uploaded_at: Some(b.uploaded_at),
        })
    }

    pub async fn presign_download(
        &self,
        user_id: Uuid,
        can_access_all: bool,
        berkas_id: Uuid,
    ) -> Result<PresignedDownloadResponse, AppError> {
        let berkas = self
            .repo
            .get_berkas_by_id(berkas_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Dokumen berkas tidak ditemukan".to_string()))?;

        // Jika bukan staf berwenang (admin / asesor), pastikan pemilik berkas cocok dengan user_id
        if !can_access_all {
            let pendaftar = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
                AppError::Forbidden("Anda tidak berhak mengakses dokumen berkas ini".to_string())
            })?;
            if berkas.pendaftar_id != pendaftar.id {
                return Err(AppError::Forbidden(
                    "Anda tidak diizinkan mengakses berkas pendaftar lain".to_string(),
                ));
            }
        }

        let presigned = self
            .storage
            .generate_presigned_get_url(&berkas.file_key, 900);
        Ok(presigned)
    }

    // ==========================================
    // 3. STATE LANGKAH & ALUR PENDAFTARAN
    // ==========================================

    pub async fn get_langkah_progress(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<LangkahProgressItem>, AppError> {
        let pendaftar = self.repo.find_by_user_id(user_id).await?;
        let jalur_id = pendaftar.as_ref().map(|p| p.jalur_id);

        let definisi_langkah = self.repo.list_definisi_langkah(jalur_id).await?;
        let state_list = match pendaftar {
            Some(ref p) => self.repo.get_state_langkah(p.id).await?,
            None => Vec::new(),
        };

        let mut progress_items = Vec::new();
        let mut previous_completed = true;

        for step in definisi_langkah {
            let current_state = state_list.iter().find(|s| s.langkah_id == step.id);
            let status = match current_state {
                Some(s) => s.status.clone(),
                None => {
                    if step.urutan == 1 {
                        "SEDANG_DIISI".to_string()
                    } else {
                        "BELUM_MULAI".to_string()
                    }
                }
            };

            let is_finished = status == "SELESAI" || status == "TERVERIFIKASI";
            let can_access = previous_completed || is_finished;

            progress_items.push(LangkahProgressItem {
                id: step.id,
                kode_langkah: step.kode_langkah,
                judul_langkah: step.judul_langkah,
                deskripsi: step.deskripsi,
                tipe_langkah: step.tipe_langkah,
                urutan: step.urutan,
                wajib: step.wajib,
                status,
                bisa_diakses: can_access,
                syarat_keterangan: None,
            });

            if step.wajib {
                previous_completed = previous_completed && is_finished;
            }
        }

        Ok(progress_items)
    }

    // ==========================================
    // 4. ADMIN FORM BUILDER (CRUD FIELD, BERKAS, LANGKAH)
    // ==========================================

    pub async fn admin_list_fields(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiField>, AppError> {
        self.repo.list_fields(jalur_id).await
    }

    pub async fn admin_create_field(
        &self,
        req: CreateDefinisiFieldRequest,
    ) -> Result<DefinisiField, AppError> {
        let opsi = req.opsi.unwrap_or_else(|| serde_json::json!([]));
        let aturan = req.aturan_validasi.unwrap_or_else(|| serde_json::json!({}));
        let urutan = req.urutan.unwrap_or(99);
        let kelompok = req.kelompok.unwrap_or_else(|| "DATA_PRIBADI".to_string());

        self.repo
            .create_field(
                req.jalur_id,
                &req.kode_field,
                &req.label,
                &req.tipe_field,
                req.placeholder.as_deref(),
                req.wajib,
                &opsi,
                &aturan,
                urutan,
                &kelompok,
            )
            .await
    }

    pub async fn admin_update_field(
        &self,
        id: Uuid,
        req: UpdateDefinisiFieldRequest,
    ) -> Result<DefinisiField, AppError> {
        let opsi = req.opsi.unwrap_or_else(|| serde_json::json!([]));
        let aturan = req.aturan_validasi.unwrap_or_else(|| serde_json::json!({}));

        self.repo
            .update_field(
                id,
                req.jalur_id,
                &req.label,
                &req.tipe_field,
                req.placeholder.as_deref(),
                req.wajib,
                &opsi,
                &aturan,
                req.urutan,
                &req.kelompok,
                req.is_active,
            )
            .await
    }

    pub async fn admin_delete_field(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_field(id).await
    }

    pub async fn admin_reorder_fields(&self, field_ids: Vec<Uuid>) -> Result<(), AppError> {
        self.repo.reorder_fields(&field_ids).await
    }

    pub async fn admin_list_definisi_berkas(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiBerkas>, AppError> {
        self.repo.list_definisi_berkas(jalur_id).await
    }

    pub async fn admin_create_definisi_berkas(
        &self,
        req: CreateDefinisiBerkasRequest,
    ) -> Result<DefinisiBerkas, AppError> {
        let tipe_file = req
            .tipe_file
            .unwrap_or_else(|| "image/jpeg,image/png,application/pdf".to_string());
        let ukuran_maks_kb = req.ukuran_maks_kb.unwrap_or(2048);
        let urutan = req.urutan.unwrap_or(99);

        let b = self
            .repo
            .create_definisi_berkas(
                req.jalur_id,
                &req.kode_berkas,
                &req.nama,
                req.deskripsi.as_deref(),
                req.wajib,
                &tipe_file,
                ukuran_maks_kb,
                urutan,
            )
            .await?;
        self.repo
            .set_prodi_definisi_berkas(b.id, req.prodi_id)
            .await
    }

    pub async fn admin_update_definisi_berkas(
        &self,
        id: Uuid,
        req: UpdateDefinisiBerkasRequest,
    ) -> Result<DefinisiBerkas, AppError> {
        self.repo
            .update_definisi_berkas(
                id,
                req.jalur_id,
                &req.nama,
                req.deskripsi.as_deref(),
                req.wajib,
                &req.tipe_file,
                req.ukuran_maks_kb,
                req.urutan,
                req.is_active,
            )
            .await?;
        self.repo.set_prodi_definisi_berkas(id, req.prodi_id).await
    }

    pub async fn admin_delete_definisi_berkas(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_definisi_berkas(id).await
    }

    pub async fn admin_list_definisi_langkah(
        &self,
        jalur_id: Option<Uuid>,
    ) -> Result<Vec<DefinisiLangkah>, AppError> {
        self.repo.list_definisi_langkah(jalur_id).await
    }

    pub async fn admin_create_definisi_langkah(
        &self,
        req: CreateDefinisiLangkahRequest,
    ) -> Result<DefinisiLangkah, AppError> {
        let urutan = req.urutan.unwrap_or(99);
        let syarat = req.syarat_lanjut.unwrap_or_else(|| serde_json::json!({}));

        self.repo
            .create_definisi_langkah(
                req.jalur_id,
                &req.kode_langkah,
                &req.judul_langkah,
                req.deskripsi.as_deref(),
                &req.tipe_langkah,
                urutan,
                req.wajib,
                &syarat,
            )
            .await
    }

    pub async fn admin_update_definisi_langkah(
        &self,
        id: Uuid,
        req: UpdateDefinisiLangkahRequest,
    ) -> Result<DefinisiLangkah, AppError> {
        let syarat = req.syarat_lanjut.unwrap_or_else(|| serde_json::json!({}));

        self.repo
            .update_definisi_langkah(
                id,
                req.jalur_id,
                &req.judul_langkah,
                req.deskripsi.as_deref(),
                &req.tipe_langkah,
                req.urutan,
                req.wajib,
                &syarat,
                req.is_active,
            )
            .await
    }

    pub async fn admin_delete_definisi_langkah(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_definisi_langkah(id).await
    }

    // ==========================================
    // 5. ADMIN VERIFIKASI BERKAS PENDAFTAR
    // ==========================================

    pub async fn admin_list_berkas(
        &self,
        status: Option<String>,
        search: Option<String>,
        pendaftar_id: Option<Uuid>,
    ) -> Result<Vec<BerkasDetailItem>, AppError> {
        self.repo
            .list_all_berkas_admin(status.as_deref(), search.as_deref(), pendaftar_id)
            .await
    }

    pub async fn verifikasi_berkas_admin(
        &self,
        admin_id: Uuid,
        req: VerifikasiBerkasRequest,
    ) -> Result<(), AppError> {
        let status_baru = req.status_verifikasi.trim().to_uppercase();
        if !matches!(status_baru.as_str(), "VALID" | "INVALID") {
            return Err(AppError::BadRequest(
                "Status verifikasi harus VALID atau INVALID".to_string(),
            ));
        }
        let catatan = req
            .catatan
            .as_deref()
            .map(str::trim)
            .filter(|c| !c.is_empty());
        if status_baru == "INVALID" && catatan.is_none() {
            return Err(AppError::Validation(vec![
                "catatan: alasan penolakan wajib diisi".to_string(),
            ]));
        }

        let pendaftar_id = self
            .repo
            .update_verifikasi_berkas(req.berkas_id, &status_baru, catatan, Some(admin_id))
            .await?;
        self.evaluasi_verifikasi_berkas(pendaftar_id).await
    }

    pub async fn admin_list_berkas_per_calon(
        &self,
        status: Option<String>,
        search: Option<String>,
    ) -> Result<Vec<BerkasCalonRingkasan>, AppError> {
        self.repo
            .list_berkas_per_calon(status.as_deref(), search.as_deref())
            .await
    }

    /// Sahkan semua berkas yang menunggu milik tiap calon, lalu jalankan evaluasi
    /// status yang sama dengan pemeriksaan satuan (semua wajib sah -> status maju).
    pub async fn sahkan_semua_berkas_admin(
        &self,
        admin_id: Uuid,
        req: SahkanSemuaBerkasRequest,
    ) -> Result<SahkanSemuaBerkasResponse, AppError> {
        let mut ids = req.pendaftar_ids;
        ids.sort();
        ids.dedup();
        if ids.is_empty() || ids.len() > 100 {
            return Err(AppError::BadRequest(
                "Pilih 1 sampai 100 calon untuk disahkan sekaligus".to_string(),
            ));
        }

        let mut hasil = Vec::with_capacity(ids.len());
        let mut total = 0;
        for pid in ids {
            let Some(p) = self.repo.find_by_id(pid).await? else {
                continue;
            };
            let disahkan = self
                .repo
                .sahkan_semua_berkas_menunggu(pid, admin_id)
                .await?;
            if disahkan > 0 {
                self.evaluasi_verifikasi_berkas(pid).await?;
            }
            // Baca ulang: evaluasi dapat memajukan status calon
            let terkini = self.repo.find_by_id(pid).await?.unwrap_or(p);
            let ringkas = self.ringkasan_berkas(&terkini).await?;
            let nama: String = sqlx::query_scalar("SELECT nama_lengkap FROM users WHERE id = $1")
                .bind(terkini.user_id)
                .fetch_one(self.repo.pool())
                .await?;
            total += disahkan;
            hasil.push(HasilSahkanCalon {
                pendaftar_id: pid,
                nama_lengkap: nama,
                berkas_disahkan: disahkan,
                lengkap: ringkas.lengkap,
                status_pendaftaran: terkini.status_pendaftaran,
            });
        }
        Ok(SahkanSemuaBerkasResponse {
            calon_diproses: hasil.len() as i64,
            berkas_disahkan: total,
            hasil,
        })
    }

    // ==========================================
    // 6. METODE LEGACY UNTUK KOMPATIBILITAS
    // ==========================================

    pub async fn submit_biodata(
        &self,
        user_id: Uuid,
        req: SubmitBiodataRequest,
    ) -> Result<PendaftarDetailResponse, AppError> {
        let existing = self.repo.find_by_user_id(user_id).await?;
        if let Some(ref ex) = existing {
            alur::pastikan_status(
                &ex.status_pendaftaran,
                &[status::DRAFT],
                "Formulir sudah dikirim dan terkunci.",
            )?;
        }
        let nomor_pendaftaran = match existing {
            Some(ref p) => p.nomor_pendaftaran.clone(),
            None => {
                let seq = self.repo.get_next_sequence().await?;
                format!("PMB-2026-{:04}", seq)
            }
        };

        self.repo
            .upsert_biodata(
                user_id,
                &nomor_pendaftaran,
                req.jalur_id,
                req.gelombang_id,
                &req.nik,
                &req.tempat_lahir,
                req.tgl_lahir,
                jenis_kelamin_wajib(&req.jenis_kelamin)?,
                &req.agama,
                &req.alamat_lengkap,
                &req.nama_ortu,
                &req.no_hp_ortu,
            )
            .await?;

        self.get_my_pendaftaran(user_id).await
    }

    pub async fn submit_akademik(
        &self,
        user_id: Uuid,
        req: SubmitAkademikRequest,
    ) -> Result<PendaftarDetailResponse, AppError> {
        let pendaftar = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
            AppError::BadRequest("Silakan isi formulir biodata terlebih dahulu".to_string())
        })?;
        alur::pastikan_status(
            &pendaftar.status_pendaftaran,
            &[status::DRAFT],
            "Formulir sudah dikirim dan terkunci.",
        )?;

        if let Some(p2) = req.prodi_pilihan_2 {
            if p2 == req.prodi_pilihan_1 {
                return Err(AppError::BadRequest(
                    "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama".to_string(),
                ));
            }
        }

        self.repo
            .update_akademik(
                pendaftar.id,
                &req.asal_sekolah,
                &req.jurusan_sekolah,
                req.nilai_rapor_avg,
                req.prodi_pilihan_1,
                req.prodi_pilihan_2,
            )
            .await?;

        self.get_my_pendaftaran(user_id).await
    }

    pub async fn upload_berkas(
        &self,
        user_id: Uuid,
        jenis_berkas: &str,
        file_name: &str,
        mime_type: &str,
        file_size_bytes: i64,
    ) -> Result<BerkasResponse, AppError> {
        let pendaftar = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
            AppError::BadRequest("Silakan isi formulir biodata terlebih dahulu".to_string())
        })?;
        pastikan_boleh_unggah_berkas(&pendaftar)?;

        if file_size_bytes > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest(
                "Ukuran berkas melebihi batas maksimal 5 MB".to_string(),
            ));
        }

        let file_key = format!("berkas/{}/{}_{}", pendaftar.id, jenis_berkas, file_name);
        let berkas = self
            .repo
            .save_berkas(
                pendaftar.id,
                jenis_berkas,
                &file_key,
                file_name,
                mime_type,
                file_size_bytes,
            )
            .await?;

        Ok(BerkasResponse {
            id: berkas.id,
            pendaftar_id: berkas.pendaftar_id,
            jenis_berkas: berkas.jenis_berkas,
            file_key: berkas.file_key,
            file_name: berkas.file_name,
            mime_type: berkas.mime_type,
            file_size_bytes: berkas.file_size_bytes,
            status_verifikasi: berkas.status_verifikasi,
            catatan: berkas.catatan,
            uploaded_at: berkas.uploaded_at,
        })
    }

    /// Kirim formulir: kunci formulir, pesan kursi sesi CBT yang dipilih, status -> SUBMITTED.
    /// Berkas tidak lagi disyaratkan di sini karena diunggah setelah pembayaran disetujui.
    pub async fn finalisasi(&self, user_id: Uuid) -> Result<bool, AppError> {
        let pendaftar =
            self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
                AppError::BadRequest("Data pendaftaran tidak ditemukan".to_string())
            })?;

        alur::pastikan_status(
            &pendaftar.status_pendaftaran,
            &[status::DRAFT],
            "Formulir sudah dikirim sebelumnya.",
        )?;

        if pendaftar
            .data_formulir
            .as_object()
            .is_none_or(|o| o.is_empty())
        {
            return Err(AppError::BadRequest(
                "Lengkapi dan simpan formulir sebelum mengirim.".to_string(),
            ));
        }

        let butuh_cbt = jalur_butuh_cbt(self.repo.pool(), pendaftar.jalur_id).await?;
        let mut tx = self.repo.pool().begin().await?;

        if butuh_cbt {
            let sesi_id: Option<Uuid> =
                sqlx::query_scalar("SELECT sesi_ujian_id FROM pendaftar WHERE id = $1 FOR UPDATE")
                    .bind(pendaftar.id)
                    .fetch_one(&mut *tx)
                    .await?;
            let sesi_id = sesi_id.ok_or_else(|| {
                AppError::Validation(vec![
                    "sesi_ujian_id: pilih jadwal seleksi (sesi CBT)".to_string(),
                ])
            })?;

            // Kunci baris sesi agar kuota tidak terlampaui oleh pendaftar bersamaan
            let kuota: Option<(i32, i64)> = sqlx::query_as(
                "SELECT s.kuota,
                        (SELECT COUNT(*) FROM peserta_sesi ps WHERE ps.sesi_id = s.id)
                 FROM sesi_ujian s WHERE s.id = $1 FOR UPDATE OF s",
            )
            .bind(sesi_id)
            .fetch_optional(&mut *tx)
            .await?;
            let (kuota, terisi) = kuota.ok_or_else(|| {
                AppError::BadRequest("Sesi CBT yang dipilih tidak ditemukan".to_string())
            })?;
            validasi_sesi_pilihan(
                &mut *tx,
                sesi_id,
                pendaftar.gelombang_id,
                pendaftar.jalur_id,
            )
            .await?;
            if terisi >= kuota as i64 {
                return Err(AppError::Conflict(
                    "Kuota sesi CBT yang dipilih sudah penuh. Silakan pilih jadwal lain."
                        .to_string(),
                ));
            }

            sqlx::query(
                "INSERT INTO peserta_sesi (sesi_id, pendaftar_id, nomor_peserta)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (sesi_id, pendaftar_id) DO NOTHING",
            )
            .bind(sesi_id)
            .bind(pendaftar.id)
            .bind(&pendaftar.nomor_pendaftaran)
            .execute(&mut *tx)
            .await?;
        }

        alur::transisi_status(
            &mut *tx,
            pendaftar.id,
            &[status::DRAFT],
            status::SUBMITTED,
            "Formulir sudah dikirim sebelumnya.",
        )
        .await?;
        tx.commit().await?;

        // Biaya formulir Rp 0: langsung lunas & lanjut ke unggah berkas (tanpa transfer/bukti)
        let gratis = crate::modules::pembayaran::repository::PembayaranRepository::new(
            self.repo.pool().clone(),
        )
        .lunasi_formulir_gratis(pendaftar.id, pendaftar.jalur_id)
        .await?;
        if gratis {
            alur::kirim_notifikasi(
                self.repo.pool(),
                pendaftar.id,
                "Formulir PMB Terkirim - Lanjutkan Unggah Berkas",
                &format!(
                    "Formulir pendaftaran Anda (No. {}) telah terkirim. Jalur Anda tidak dikenakan biaya formulir. Langkah berikutnya: unggah berkas persyaratan di portal PMB.",
                    pendaftar.nomor_pendaftaran
                ),
                "NOTIFIKASI_LANGKAH",
            )
            .await;
            return Ok(true);
        }

        alur::kirim_notifikasi(
            self.repo.pool(),
            pendaftar.id,
            "Formulir PMB Terkirim - Lanjutkan Pembayaran",
            &format!(
                "Formulir pendaftaran Anda (No. {}) telah terkirim. Langkah berikutnya: bayar biaya formulir melalui VA Mandiri atau QRIS, lalu unggah bukti pembayaran di portal PMB.",
                pendaftar.nomor_pendaftaran
            ),
            "NOTIFIKASI_LANGKAH",
        )
        .await;
        Ok(false)
    }

    // ==========================================
    // ALUR PMB v2: STEPPER, GERBANG BERKAS
    // ==========================================

    /// Stepper 9 langkah untuk portal calon (satu sumber kebenaran untuk UI).
    pub async fn get_alur(&self, user_id: Uuid) -> Result<alur::AlurResponse, AppError> {
        let Some(p) = self.repo.find_by_user_id(user_id).await? else {
            return Ok(alur::bangun_alur(&alur::KonteksAlur::default()));
        };
        // Perbaikan otomatis tahap bayar formulir: tagihan sudah lunas atau jalurnya
        // gratis, tetapi status tertinggal -> majukan, lalu baca ulang (sekali, tanpa rekursi).
        let p = if matches!(
            p.status_pendaftaran.as_str(),
            status::SUBMITTED | status::MENUNGGU_VERIFIKASI_BAYAR | status::PEMBAYARAN_DITOLAK
        ) {
            let bayar = crate::modules::pembayaran::repository::PembayaranRepository::new(
                self.repo.pool().clone(),
            );
            // Best-effort: kegagalan perbaikan tidak boleh membuat portal calon error
            let hasil = async {
                if !bayar.sinkron_formulir_lunas(p.id).await?
                    && p.status_pendaftaran == status::SUBMITTED
                {
                    bayar.lunasi_formulir_gratis(p.id, p.jalur_id).await?;
                }
                Ok::<(), AppError>(())
            }
            .await;
            if let Err(e) = hasil {
                tracing::warn!(
                    "Perbaikan otomatis tahap bayar pendaftar {} gagal: {e}",
                    p.id
                );
            }
            self.repo.find_by_user_id(user_id).await?.unwrap_or(p)
        } else {
            p
        };
        // Hasil seleksi yang sudah boleh dilihat (tanggal pengumuman lewat) -> status LULUS/dll
        if alur::sinkron_status_kelulusan(self.repo.pool(), Some(p.id), None).await? > 0 {
            return Box::pin(self.get_alur(user_id)).await;
        }
        let pool = self.repo.pool();

        let alasan_tolak = |jenis: &'static str| async move {
            sqlx::query_scalar::<_, Option<String>>(
                "SELECT catatan FROM bukti_pembayaran
                 WHERE pendaftar_id = $1 AND jenis_tagihan = $2
                 ORDER BY created_at DESC LIMIT 1",
            )
            .bind(p.id)
            .bind(jenis)
            .fetch_optional(pool)
            .await
        };

        let alasan_tolak_bayar = if p.status_pendaftaran == status::PEMBAYARAN_DITOLAK {
            alasan_tolak("FORMULIR").await?.flatten()
        } else {
            None
        };

        let alasan_tolak_bayar_daftar_ulang = if p.status_pendaftaran == status::LULUS {
            let terakhir: Option<(String, Option<String>)> = sqlx::query_as(
                "SELECT status, catatan FROM bukti_pembayaran
                 WHERE pendaftar_id = $1 AND jenis_tagihan = 'DAFTAR_ULANG_UKT'
                 ORDER BY created_at DESC LIMIT 1",
            )
            .bind(p.id)
            .fetch_optional(pool)
            .await?;
            terakhir
                .filter(|(st, _)| st == "DITOLAK")
                .map(|(_, c)| c.unwrap_or_else(|| "-".to_string()))
        } else {
            None
        };

        let sesi: Option<(chrono::DateTime<chrono::Utc>, String)> = sqlx::query_as(
            "SELECT s.jadwal_mulai, s.mode FROM pendaftar p
             JOIN sesi_ujian s ON s.id = p.sesi_ujian_id WHERE p.id = $1",
        )
        .bind(p.id)
        .fetch_optional(pool)
        .await?;

        let nim: Option<String> =
            sqlx::query_scalar("SELECT nim_resmi FROM hasil_kelulusan WHERE pendaftar_id = $1")
                .bind(p.id)
                .fetch_optional(pool)
                .await?
                .flatten();

        let cbt_lulus: Option<bool> = sqlx::query_scalar(
            "SELECT is_lulus FROM hasil_ujian WHERE pendaftar_id = $1
             ORDER BY waktu_submit DESC LIMIT 1",
        )
        .bind(p.id)
        .fetch_optional(pool)
        .await?;

        let jalur_rpl = crate::modules::rpl::repository::RplRepository::new(pool.clone())
            .check_jalur_has_rpl_step(p.jalur_id)
            .await?;

        let wib = chrono::FixedOffset::east_opt(7 * 3600).expect("offset WIB valid");
        let mut hasil = alur::bangun_alur(&alur::KonteksAlur {
            status_pendaftaran: Some(p.status_pendaftaran.clone()),
            nomor_pendaftaran: Some(p.nomor_pendaftaran.clone()),
            alasan_tolak_bayar,
            alasan_tolak_bayar_daftar_ulang,
            jadwal_ujian: sesi.as_ref().map(|(m, _)| {
                m.with_timezone(&wib)
                    .format("%d-%m-%Y %H:%M WIB")
                    .to_string()
            }),
            mode_ujian: sesi.map(|(_, mode)| mode),
            nim,
            cbt_lulus,
        });
        hasil.jalur_rpl = jalur_rpl;
        Ok(hasil)
    }

    /// Definisi berkas harus berlaku untuk pendaftar ini (jalur & prodi pilihannya).
    async fn definisi_berkas_milik(
        &self,
        pendaftar: &Pendaftar,
        definisi_berkas_id: Uuid,
    ) -> Result<DefinisiBerkas, AppError> {
        self.repo
            .list_definisi_berkas_pendaftar(pendaftar.jalur_id, &prodi_pilihan(pendaftar))
            .await?
            .into_iter()
            .find(|d| d.id == definisi_berkas_id)
            .ok_or_else(|| {
                AppError::NotFound(
                    "Jenis berkas tidak ditemukan atau tidak berlaku untuk pendaftaran Anda"
                        .to_string(),
                )
            })
    }

    /// Ringkasan berkas wajib berdasarkan unggahan terbaru per jenis berkas.
    async fn ringkasan_berkas(&self, pendaftar: &Pendaftar) -> Result<RingkasanBerkas, AppError> {
        let items = self
            .repo
            .get_calon_berkas_list(pendaftar.id, pendaftar.jalur_id, &prodi_pilihan(pendaftar))
            .await?;
        Ok(RingkasanBerkas::dari_items(&items))
    }

    /// Setelah admin memverifikasi satu berkas, majukan status pendaftar:
    /// ada berkas ditolak -> BERKAS_REVISION; semua wajib valid -> BERKAS_VERIFIED
    /// (atau langsung MENUNGGU_PENGUMUMAN bila jalurnya tanpa CBT).
    async fn evaluasi_verifikasi_berkas(&self, pendaftar_id: Uuid) -> Result<(), AppError> {
        let Some(p) = self.repo.find_by_id(pendaftar_id).await? else {
            return Ok(());
        };
        let tahap_berkas = [
            status::PEMBAYARAN_DISETUJUI,
            status::MENUNGGU_VERIFIKASI_BERKAS,
            status::BERKAS_REVISION,
        ];
        if !tahap_berkas.contains(&p.status_pendaftaran.as_str()) {
            return Ok(());
        }

        let r = self.ringkasan_berkas(&p).await?;
        let pool = self.repo.pool();

        if r.ada_ditolak {
            if p.status_pendaftaran != status::BERKAS_REVISION {
                alur::transisi_status(pool, p.id, &tahap_berkas, status::BERKAS_REVISION, "")
                    .await?;
                alur::kirim_notifikasi(
                    pool,
                    p.id,
                    "Berkas PMB Perlu Diperbaiki",
                    "Ada berkas pendaftaran yang perlu diperbaiki. Silakan cek catatan admin di portal PMB dan unggah ulang berkas tersebut.",
                    "BERKAS_REVISI",
                )
                .await;
            }
        } else if r.lengkap && r.semua_valid {
            let butuh_cbt = jalur_butuh_cbt(pool, p.jalur_id).await?;
            let ke = if butuh_cbt {
                status::BERKAS_VERIFIED
            } else {
                status::MENUNGGU_PENGUMUMAN
            };
            alur::transisi_status(pool, p.id, &tahap_berkas, ke, "").await?;
            let pesan = if butuh_cbt {
                "Seluruh berkas Anda telah terverifikasi. Kartu peserta sudah dapat diunduh dan Anda dapat mengikuti ujian CBT sesuai jadwal yang dipilih."
            } else {
                "Seluruh berkas Anda telah terverifikasi. Silakan menunggu pengumuman hasil seleksi sesuai jadwal."
            };
            alur::kirim_notifikasi(
                pool,
                p.id,
                "Berkas PMB Terverifikasi",
                pesan,
                "BERKAS_VALID",
            )
            .await;
        }
        Ok(())
    }

    pub async fn get_my_pendaftaran(
        &self,
        user_id: Uuid,
    ) -> Result<PendaftarDetailResponse, AppError> {
        let p = self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
            AppError::NotFound("Belum ada data pendaftaran untuk akun ini".to_string())
        })?;

        let berkas_list = self.repo.get_berkas_by_pendaftar(p.id).await?;
        let berkas_resp = berkas_list
            .into_iter()
            .map(|b| BerkasResponse {
                id: b.id,
                pendaftar_id: b.pendaftar_id,
                jenis_berkas: b.jenis_berkas,
                file_key: b.file_key,
                file_name: b.file_name,
                mime_type: b.mime_type,
                file_size_bytes: b.file_size_bytes,
                status_verifikasi: b.status_verifikasi,
                catatan: b.catatan,
                uploaded_at: b.uploaded_at,
            })
            .collect();

        let user_info: Option<(String, String, String)> =
            sqlx::query_as("SELECT nama_lengkap, email, no_hp FROM users WHERE id = $1")
                .bind(p.user_id)
                .fetch_optional(self.repo.pool())
                .await
                .unwrap_or(None);

        let (nama_lengkap, email, no_hp) = user_info.unwrap_or_else(|| {
            (
                "Calon Mahasiswa".to_string(),
                "".to_string(),
                "".to_string(),
            )
        });

        let nama_jalur = self
            .repo
            .get_jalur_nama(p.jalur_id)
            .await
            .unwrap_or_else(|_| "Jalur Pendaftaran".to_string());
        let nama_gelombang = self
            .repo
            .get_gelombang_nama(p.gelombang_id)
            .await
            .unwrap_or_else(|_| "Gelombang Aktif".to_string());
        let nama_prodi_1 = self
            .repo
            .get_prodi_nama(p.prodi_pilihan_1)
            .await
            .unwrap_or_else(|_| "Pilihan 1".to_string());
        let nama_prodi_2 = match p.prodi_pilihan_2 {
            Some(p2) => self.repo.get_prodi_nama(p2).await.ok(),
            None => None,
        };

        Ok(PendaftarDetailResponse {
            id: p.id,
            user_id: p.user_id,
            nama_lengkap,
            email,
            no_hp,
            nomor_pendaftaran: p.nomor_pendaftaran,
            jalur_id: p.jalur_id,
            nama_jalur,
            gelombang_id: p.gelombang_id,
            nama_gelombang,
            status_pendaftaran: p.status_pendaftaran,
            nik: p.nik,
            tempat_lahir: p.tempat_lahir,
            tgl_lahir: p.tgl_lahir,
            jenis_kelamin: p.jenis_kelamin,
            agama: p.agama,
            alamat_lengkap: p.alamat_lengkap,
            nama_ortu: p.nama_ortu,
            no_hp_ortu: p.no_hp_ortu,
            asal_sekolah: p.asal_sekolah,
            jurusan_sekolah: p.jurusan_sekolah,
            nilai_rapor_avg: p.nilai_rapor_avg,
            prodi_pilihan_1: p.prodi_pilihan_1,
            nama_prodi_1,
            prodi_pilihan_2: p.prodi_pilihan_2,
            nama_prodi_2,
            data_formulir: p.data_formulir,
            catatan_verifikator: p.catatan_verifikator,
            berkas: berkas_resp,
            created_at: p.created_at,
        })
    }

    pub async fn verifikasi_berkas(&self, req: VerifikasiBerkasRequest) -> Result<(), AppError> {
        self.repo
            .update_verifikasi_berkas(
                req.berkas_id,
                &req.status_verifikasi,
                req.catatan.as_deref(),
                None,
            )
            .await
            .map(|_| ())
    }

    pub async fn list_all(&self) -> Result<Vec<Pendaftar>, AppError> {
        self.repo.list_all_pendaftar().await
    }

    // ==========================================
    // 5. ALUR PENDAFTARAN LENGKAP & WIZARD
    // ==========================================

    pub async fn pilih_prodi_dan_jalur(
        &self,
        user_id: Uuid,
        req: PilihProdiRequest,
    ) -> Result<PendaftarDetailResponse, AppError> {
        // 1. Validasi pilihan prodi tidak sama
        if let Some(p2) = req.prodi_pilihan_2 {
            if p2 == req.prodi_pilihan_1 {
                return Err(AppError::BadRequest(
                    "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama".to_string(),
                ));
            }
        }

        // 2. Validasi status gelombang aktif
        let gelombang_aktif = self.repo.check_gelombang_active(req.gelombang_id).await?;
        if !gelombang_aktif {
            return Err(AppError::BadRequest(
                "Gelombang pendaftaran yang dipilih sedang tidak aktif atau sudah ditutup"
                    .to_string(),
            ));
        }

        // 3. Validasi kuota prodi pilihan 1
        let kuota_tersedia = self
            .repo
            .check_prodi_kuota(req.prodi_pilihan_1, req.gelombang_id)
            .await?;
        if !kuota_tersedia {
            return Err(AppError::BadRequest(
                "Kuota untuk Program Studi pilihan 1 pada gelombang ini telah terpenuhi"
                    .to_string(),
            ));
        }

        // 4. Cek existing pendaftaran untuk user_id
        let existing = self.repo.find_by_user_id(user_id).await?;
        let nomor_pendaftaran = if let Some(ref ex) = existing {
            if ex.status_pendaftaran != "DRAFT" {
                return Err(AppError::BadRequest(format!(
                    "Pendaftaran Anda telah berstatus {} dan tidak dapat diubah kembali ke pemilihan prodi",
                    ex.status_pendaftaran
                )));
            }
            ex.nomor_pendaftaran.clone()
        } else {
            let seq = self.repo.get_next_sequence().await?;
            format!("PMB-2026-{:04}", seq)
        };

        // 5. Upsert draft pendaftaran
        let pendaftar = self
            .repo
            .pilih_prodi_draft(
                user_id,
                &nomor_pendaftaran,
                req.jalur_id,
                req.gelombang_id,
                req.prodi_pilihan_1,
                req.prodi_pilihan_2,
            )
            .await?;

        // 6. Update state_langkah_pendaftar jika ada definisi_langkah dengan tipe_langkah = 'pilih_prodi'
        let langkah_list = self.repo.list_definisi_langkah(Some(req.jalur_id)).await?;
        if let Some(langkah_pilih) = langkah_list
            .iter()
            .find(|l| l.tipe_langkah == "pilih_prodi")
        {
            self.repo
                .upsert_state_langkah(
                    pendaftar.id,
                    langkah_pilih.id,
                    "SELESAI",
                    &serde_json::json!({
                        "jalur_id": req.jalur_id,
                        "gelombang_id": req.gelombang_id,
                        "prodi_1": req.prodi_pilihan_1,
                        "prodi_2": req.prodi_pilihan_2,
                    }),
                )
                .await?;
        }

        // 7. Enqueue email notifikasi
        let user_row: Option<(String, String)> =
            sqlx::query_as("SELECT email, nama_lengkap FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_optional(self.repo.pool())
                .await
                .ok()
                .flatten();

        if let Some((to_email, to_name)) = user_row {
            let email_repo = EmailQueueRepository::new(self.repo.pool().clone());
            let _ = email_repo
                .enqueue(
                    &to_email,
                    &to_name,
                    "Konfirmasi Pemilihan Jalur & Program Studi PMB",
                    &format!(
                        "Halo {}, Anda telah berhasil memilih jalur dan program studi PMB dengan Nomor Pendaftaran: {}. Silakan lanjutkan ke pengisian biodata dan unggah berkas persyaratan.",
                        to_name, nomor_pendaftaran
                    ),
                    &format!(
                        "<p>Halo <strong>{}</strong>,</p><p>Anda telah berhasil memilih jalur dan program studi PMB dengan Nomor Pendaftaran: <strong>{}</strong>.</p><p>Silakan lanjutkan ke pengisian biodata dan unggah berkas persyaratan melalui portal PMB.</p>",
                        to_name, nomor_pendaftaran
                    ),
                    "NOTIFIKASI_LANGKAH",
                    Some(pendaftar.id),
                )
                .await;
        }

        self.get_my_pendaftaran(user_id).await
    }

    pub async fn pendaftaran_offline_admin(
        &self,
        admin_id: Uuid,
        req: PendaftaranOfflineRequest,
    ) -> Result<PendaftaranOfflineResponse, AppError> {
        let mut req = req;
        req.jenis_kelamin = jenis_kelamin_wajib(&req.jenis_kelamin)?.to_string();
        // 1. Validasi prodi 1 != prodi 2
        if let Some(p2) = req.prodi_pilihan_2 {
            if p2 == req.prodi_pilihan_1 {
                return Err(AppError::BadRequest(
                    "Pilihan Program Studi 1 dan Pilihan 2 tidak boleh sama".to_string(),
                ));
            }
        }

        // 2. Validasi gelombang aktif
        let gelombang_aktif = self.repo.check_gelombang_active(req.gelombang_id).await?;
        if !gelombang_aktif {
            return Err(AppError::BadRequest(
                "Gelombang pendaftaran yang dipilih sedang tidak aktif atau sudah ditutup"
                    .to_string(),
            ));
        }

        // 3. Validasi kuota prodi pilihan 1
        let kuota_tersedia = self
            .repo
            .check_prodi_kuota(req.prodi_pilihan_1, req.gelombang_id)
            .await?;
        if !kuota_tersedia {
            return Err(AppError::BadRequest(
                "Kuota untuk Program Studi pilihan 1 pada gelombang ini telah terpenuhi"
                    .to_string(),
            ));
        }

        // 4. Cari atau buat user calon mahasiswa berdasarkan email
        let existing_user: Option<(Uuid,)> =
            sqlx::query_as("SELECT id FROM users WHERE email = $1")
                .bind(&req.email)
                .fetch_optional(self.repo.pool())
                .await?;

        let (calon_user_id, temp_password) = match existing_user {
            Some((uid,)) => {
                // Cek apakah calon ini sudah terdaftar di pendaftar
                if let Some(ex_pend) = self.repo.find_by_user_id(uid).await? {
                    return Err(AppError::BadRequest(format!(
                        "Calon mahasiswa dengan email '{}' sudah terdaftar dengan Nomor: {}",
                        req.email, ex_pend.nomor_pendaftaran
                    )));
                }
                (uid, None)
            }
            None => {
                let suffix = if req.nik.len() >= 4 {
                    &req.nik[req.nik.len() - 4..]
                } else {
                    "2026"
                };
                let generated_pwd = format!("Pmb{}!", suffix);
                let hashed = hash_password(&generated_pwd).map_err(AppError::Internal)?;
                let new_uid = Uuid::new_v4();

                sqlx::query(
                    "INSERT INTO users (id, email, password_hash, nama_lengkap, no_hp, role, is_active, is_email_verified)
                     VALUES ($1, $2, $3, $4, $5, 'calon_mahasiswa', true, true)",
                )
                .bind(new_uid)
                .bind(&req.email)
                .bind(&hashed)
                .bind(&req.nama_lengkap)
                .bind(&req.no_hp)
                .execute(self.repo.pool())
                .await?;

                (new_uid, Some(generated_pwd))
            }
        };

        // 5. Generate nomor pendaftaran
        let seq = self.repo.get_next_sequence().await?;
        let nomor_pendaftaran = format!("PMB-2026-{:04}", seq);

        // 6. Buat record pendaftar offline
        let pendaftar = self
            .repo
            .create_pendaftaran_offline(calon_user_id, &nomor_pendaftaran, &req)
            .await?;

        // 7. Jika lunas loket, buat pembayaran TUNAI_LOKET
        let nomor_tagihan = if req.lunas_loket {
            let nominal: i64 =
                sqlx::query_scalar("SELECT biaya_formulir FROM jalur_masuk WHERE id = $1")
                    .bind(req.jalur_id)
                    .fetch_optional(self.repo.pool())
                    .await?
                    .unwrap_or(250_000);
            let no_tag = self
                .repo
                .create_pembayaran_loket(pendaftar.id, admin_id, nominal)
                .await?;
            Some(no_tag)
        } else {
            None
        };

        // 8. Tandai langkah pendaftaran jika ada langkah
        let langkah_list = self.repo.list_definisi_langkah(Some(req.jalur_id)).await?;
        for langkah in langkah_list {
            if langkah.tipe_langkah == "pilih_prodi" || langkah.tipe_langkah == "biodata" {
                let _ = self
                    .repo
                    .upsert_state_langkah(
                        pendaftar.id,
                        langkah.id,
                        "SELESAI",
                        &serde_json::json!({ "mode": "loket_offline", "admin_id": admin_id }),
                    )
                    .await;
            } else if req.lunas_loket && langkah.tipe_langkah == "pembayaran" {
                let _ = self
                    .repo
                    .upsert_state_langkah(
                        pendaftar.id,
                        langkah.id,
                        "SELESAI",
                        &serde_json::json!({ "metode": "TUNAI_LOKET", "admin_id": admin_id }),
                    )
                    .await;
            }
        }

        // 9. Log audit
        let _ = crate::security::record_audit_log(
            self.repo.pool(),
            Some(admin_id),
            "PENDAFTARAN_OFFLINE",
            "pendaftar",
            Some(pendaftar.id),
            None,
            Some(serde_json::json!({
                "nomor_pendaftaran": nomor_pendaftaran,
                "email": req.email,
                "nama_lengkap": req.nama_lengkap,
                "lunas_loket": req.lunas_loket,
            })),
        )
        .await;

        // 10. Enqueue email kredensial akun jika user baru dibuat
        let email_repo = EmailQueueRepository::new(self.repo.pool().clone());
        let (email_text, email_html) = if let Some(ref pwd) = temp_password {
            (
                format!(
                    "Halo {},\n\nAkun PMB Anda telah didaftarkan melalui loket pendaftaran offline dengan Nomor Pendaftaran: {}.\nEmail: {}\nPassword Sementara: {}\nSilakan login ke portal PMB untuk memantau status seleksi dan mengunduh Kartu Peserta Ujian.",
                    req.nama_lengkap, nomor_pendaftaran, req.email, pwd
                ),
                format!(
                    "<p>Halo <strong>{}</strong>,</p><p>Akun PMB Anda telah didaftarkan melalui loket pendaftaran offline dengan Nomor Pendaftaran: <strong>{}</strong>.</p><p>Email: <code>{}</code><br/>Password Sementara: <code>{}</code></p><p>Silakan login ke portal PMB untuk memantau status seleksi dan mengunduh Kartu Peserta Ujian.</p>",
                    req.nama_lengkap, nomor_pendaftaran, req.email, pwd
                ),
            )
        } else {
            (
                format!(
                    "Halo {},\n\nPendaftaran PMB Anda telah berhasil diproses melalui loket offline dengan Nomor Pendaftaran: {}.\nSilakan login ke portal PMB untuk memeriksa dokumen dan status seleksi.",
                    req.nama_lengkap, nomor_pendaftaran
                ),
                format!(
                    "<p>Halo <strong>{}</strong>,</p><p>Pendaftaran PMB Anda telah berhasil diproses melalui loket offline dengan Nomor Pendaftaran: <strong>{}</strong>.</p><p>Silakan login ke portal PMB untuk memeriksa dokumen dan status seleksi.</p>",
                    req.nama_lengkap, nomor_pendaftaran
                ),
            )
        };

        let _ = email_repo
            .enqueue(
                &req.email,
                &req.nama_lengkap,
                "Informasi Pendaftaran PMB Loket Offline",
                &email_text,
                &email_html,
                "KREDENSIAL_OFFLINE",
                Some(pendaftar.id),
            )
            .await;

        let cetak_bukti_url = format!("/api/pendaftaran/{}/cetak/bukti-pendaftaran", pendaftar.id);
        let cetak_kartu_url = format!("/api/pendaftaran/{}/cetak/kartu-peserta", pendaftar.id);

        Ok(PendaftaranOfflineResponse {
            pendaftar_id: pendaftar.id,
            nomor_pendaftaran,
            user_id: calon_user_id,
            email: req.email,
            temporary_password: temp_password,
            status_pendaftaran: pendaftar.status_pendaftaran,
            is_lunas_loket: req.lunas_loket,
            nomor_tagihan,
            cetak_bukti_url,
            cetak_kartu_url,
        })
    }

    pub async fn get_dashboard_summary(
        &self,
        user_id: Uuid,
    ) -> Result<DashboardSummaryResponse, AppError> {
        let mut res = self.repo.get_dashboard_summary(user_id).await?;
        let Some(p) = self.repo.find_by_user_id(user_id).await? else {
            return Ok(res);
        };
        let pool = self.repo.pool();
        let rank = alur::peringkat(&p.status_pendaftaran);

        // Berkas: relevan setelah pembayaran formulir disetujui
        if rank >= 3 {
            let items = self
                .repo
                .get_calon_berkas_list(p.id, p.jalur_id, &prodi_pilihan(&p))
                .await?;
            res.berkas = Some(ringkas_berkas_dashboard(&items));
        }

        // CBT: jadwal sesi pilihan + hasil pengerjaan terakhir
        if jalur_butuh_cbt(pool, p.jalur_id).await? {
            let riwayat = crate::modules::cbt::repository::CbtRepository::new(pool.clone())
                .list_riwayat_pendaftar(p.id)
                .await?;
            let sesi: Option<BarisSesiDashboard> = sqlx::query_as(
                "SELECT s.nama_sesi, s.mode, s.ruang, s.jadwal_mulai, s.jadwal_selesai,
                            pu.passing_grade
                     FROM pendaftar p
                     JOIN sesi_ujian s ON s.id = p.sesi_ujian_id
                     JOIN paket_ujian pu ON pu.id = s.paket_id
                     WHERE p.id = $1",
            )
            .bind(p.id)
            .fetch_optional(pool)
            .await?;
            let terakhir = riwayat.first();
            let hasil_flag: Option<(bool, bool)> = sqlx::query_as(
                "SELECT is_lulus, disetujui_admin FROM hasil_ujian WHERE pendaftar_id = $1
                 ORDER BY waktu_submit DESC LIMIT 1",
            )
            .bind(p.id)
            .fetch_optional(pool)
            .await?;
            res.cbt = Some(RingkasanCbtDashboard {
                nama_sesi: sesi.as_ref().map(|s| s.0.clone()),
                mode: sesi.as_ref().map(|s| s.1.clone()),
                ruang: sesi.as_ref().map(|s| s.2.clone()),
                jadwal_mulai: sesi.as_ref().map(|s| s.3),
                jadwal_selesai: sesi.as_ref().map(|s| s.4),
                status_ujian: terakhir.map(|r| r.status_ujian.clone()),
                nilai_terakhir: terakhir.and_then(|r| r.nilai_akhir),
                passing_grade: sesi
                    .as_ref()
                    .map(|s| s.5)
                    .or(terakhir.map(|r| r.passing_grade)),
                waktu_selesai_terakhir: terakhir.and_then(|r| r.waktu_selesai),
                jumlah_pengerjaan: riwayat.iter().filter(|r| r.waktu_mulai.is_some()).count()
                    as i32,
                memenuhi_passing_grade: hasil_flag.map(|h| h.0),
                disetujui_admin: hasil_flag.map(|h| h.1).unwrap_or(false),
            });
        }

        res.biaya = self
            .ringkasan_biaya(&p, res.pengumuman_status.as_deref())
            .await?;
        Ok(res)
    }

    /// Biaya formulir (tagihan atau tarif jalur) dan biaya daftar ulang (setelah LULUS).
    async fn ringkasan_biaya(
        &self,
        p: &Pendaftar,
        pengumuman: Option<&str>,
    ) -> Result<Vec<RingkasanBiayaItem>, AppError> {
        let pool = self.repo.pool();
        let tagihan = |jenis: &'static str| async move {
            sqlx::query_as::<_, BarisTagihanDashboard>(
                "SELECT t.nomor_tagihan, t.nominal_akhir, t.status, t.tgl_jatuh_tempo,
                        (SELECT b.status FROM bukti_pembayaran b
                         WHERE b.tagihan_id = t.id ORDER BY b.created_at DESC LIMIT 1)
                 FROM tagihan t
                 WHERE t.pendaftar_id = $1 AND t.jenis_tagihan = $2
                 ORDER BY t.tgl_terbit DESC LIMIT 1",
            )
            .bind(p.id)
            .bind(jenis)
            .fetch_optional(pool)
            .await
        };

        let mut biaya = Vec::new();

        let formulir = tagihan("FORMULIR").await?;
        biaya.push(match formulir {
            Some((no, nominal, st, jt, bukti)) => RingkasanBiayaItem {
                jenis: "FORMULIR".to_string(),
                label: "Biaya formulir pendaftaran".to_string(),
                nominal,
                status: status_biaya(Some(&st), bukti.as_deref()).to_string(),
                nomor_tagihan: Some(no),
                tgl_jatuh_tempo: Some(jt),
            },
            None => {
                let nominal: Option<i64> =
                    sqlx::query_scalar("SELECT biaya_formulir FROM jalur_masuk WHERE id = $1")
                        .bind(p.jalur_id)
                        .fetch_optional(pool)
                        .await?;
                // Tanpa tagihan online tetapi tahap bayar sudah lewat (mis. loket offline) = lunas
                let sudah_bayar = alur::peringkat(&p.status_pendaftaran) >= 3;
                RingkasanBiayaItem {
                    jenis: "FORMULIR".to_string(),
                    label: "Biaya formulir pendaftaran".to_string(),
                    nominal: nominal.unwrap_or(0),
                    status: if sudah_bayar {
                        "LUNAS".to_string()
                    } else {
                        status_biaya(None, None).to_string()
                    },
                    nomor_tagihan: None,
                    tgl_jatuh_tempo: None,
                }
            }
        });

        if pengumuman == Some("LULUS") {
            let du = tagihan("DAFTAR_ULANG_UKT").await?;
            let item = match du {
                Some((no, nominal, st, jt, bukti)) => Some(RingkasanBiayaItem {
                    jenis: "DAFTAR_ULANG".to_string(),
                    label: "Biaya daftar ulang".to_string(),
                    nominal,
                    status: status_biaya(Some(&st), bukti.as_deref()).to_string(),
                    nomor_tagihan: Some(no),
                    tgl_jatuh_tempo: Some(jt),
                }),
                None => {
                    let prodi: Option<Option<Uuid>> = sqlx::query_scalar(
                        "SELECT prodi_diterima_id FROM hasil_kelulusan WHERE pendaftar_id = $1",
                    )
                    .bind(p.id)
                    .fetch_optional(pool)
                    .await?;
                    match prodi.flatten() {
                        Some(prodi_id) => {
                            let rincian =
                                crate::modules::kelulusan::service::rincian_biaya_daftar_ulang(
                                    pool,
                                    prodi_id,
                                    p.jalur_id,
                                    p.gelombang_id,
                                )
                                .await
                                .unwrap_or_default();
                            Some(RingkasanBiayaItem {
                                jenis: "DAFTAR_ULANG".to_string(),
                                label: "Biaya daftar ulang".to_string(),
                                nominal: rincian.iter().map(|r| r.nominal).sum(),
                                status: status_biaya(None, None).to_string(),
                                nomor_tagihan: None,
                                tgl_jatuh_tempo: None,
                            })
                        }
                        None => None,
                    }
                }
            };
            biaya.extend(item);
        }

        Ok(biaya)
    }

    pub async fn generate_bukti_pdf(
        &self,
        user_id: Uuid,
        can_access_all: bool,
        pendaftar_id: Uuid,
    ) -> Result<Vec<u8>, AppError> {
        let pendaftar =
            self.repo.find_by_id(pendaftar_id).await?.ok_or_else(|| {
                AppError::NotFound("Data pendaftaran tidak ditemukan".to_string())
            })?;

        if !can_access_all {
            if pendaftar.user_id != user_id {
                return Err(AppError::Forbidden(
                    "Anda tidak berhak mengakses dokumen pendaftaran ini".to_string(),
                ));
            }
            if pendaftar.status_pendaftaran == "DRAFT" && pendaftar.channel != "offline" {
                return Err(AppError::BadRequest(
                    "Bukti Pendaftaran baru dapat diunduh setelah berkas pendaftaran Anda diajukan (bukan draf)".to_string(),
                ));
            }
        }

        let data = self.repo.get_pendaftar_pdf_data(pendaftar_id).await?;
        let qr_payload = format!(
            "VERIFIED-PMB|NO:{}|NIK:{}|STATUS:{}",
            data.nomor_pendaftaran, data.nik, data.status_pendaftaran
        );

        Ok(pdf::generate_bukti_pendaftaran_pdf(&data, &qr_payload))
    }

    pub async fn generate_kartu_pdf(
        &self,
        user_id: Uuid,
        can_access_all: bool,
        pendaftar_id: Uuid,
    ) -> Result<Vec<u8>, AppError> {
        let pendaftar =
            self.repo.find_by_id(pendaftar_id).await?.ok_or_else(|| {
                AppError::NotFound("Data pendaftaran tidak ditemukan".to_string())
            })?;

        if !can_access_all {
            if pendaftar.user_id != user_id {
                return Err(AppError::Forbidden(
                    "Anda tidak berhak mengakses dokumen ujian ini".to_string(),
                ));
            }
            if pendaftar.channel != "offline" && alur::peringkat(&pendaftar.status_pendaftaran) < 5
            {
                return Err(AppError::Forbidden(
                    "Kartu Peserta Ujian dapat dicetak setelah seluruh berkas diverifikasi admin PMB"
                        .to_string(),
                ));
            }
        }

        let data = self.repo.get_pendaftar_pdf_data(pendaftar_id).await?;
        let jadwal = self.repo.get_jadwal_ujian_pdf(pendaftar_id).await?;

        let qr_payload = format!(
            "KARTU-UJIAN-PMB|NO:{}|NAMA:{}|TGL:{}",
            data.nomor_pendaftaran, data.nama_lengkap, data.tanggal_cetak
        );

        Ok(pdf::generate_kartu_peserta_pdf(
            &data,
            jadwal.as_ref(),
            &qr_payload,
        ))
    }
}

// ==========================================
// HELPER ALUR PMB v2
// ==========================================

/// (nomor_tagihan, nominal_akhir, status, tgl_jatuh_tempo, status bukti terakhir)
/// Kolom identitas `pendaftar` (dipakai PDF, verifikasi, dan laporan) yang
/// diturunkan dari isian formulir dinamis. Nilai yang tidak diisi diambil dari
/// data tersimpan sebelumnya, atau dibiarkan kosong; tidak pernah dikarang.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct KolomIdentitas {
    pub nik: String,
    pub tempat_lahir: String,
    pub tgl_lahir: NaiveDate,
    pub jenis_kelamin: &'static str,
    pub agama: String,
    pub alamat_lengkap: String,
    pub nama_ortu: String,
    pub no_hp_ortu: String,
    pub asal_sekolah: String,
    pub jurusan_sekolah: String,
    pub nilai_rapor_avg: f64,
}

/// Tanggal pengganti untuk draf yang belum mengisi tanggal lahir.
pub(crate) fn tgl_lahir_kosong() -> NaiveDate {
    NaiveDate::from_ymd_opt(1900, 1, 1).expect("tanggal valid")
}

/// "Laki-laki"/"Pria"/"L" -> L, "Perempuan"/"Wanita"/"P" -> P (kolom CHECK L/P).
pub(crate) fn normalisasi_jenis_kelamin(v: &str) -> Option<&'static str> {
    match v.trim().to_lowercase().as_str() {
        "l" | "laki-laki" | "laki laki" | "lakilaki" | "pria" | "male" => Some("L"),
        "p" | "perempuan" | "wanita" | "female" => Some("P"),
        _ => None,
    }
}

/// Jenis kelamin dari input langsung (API lama / loket offline): 422 bila tidak dikenal.
fn jenis_kelamin_wajib(v: &str) -> Result<&'static str, AppError> {
    normalisasi_jenis_kelamin(v).ok_or_else(|| {
        AppError::Validation(vec![
            "jenis_kelamin: gunakan L/Laki-laki atau P/Perempuan".to_string(),
        ])
    })
}

/// Potong teks agar muat di kolom VARCHAR(maks) tanpa memotong karakter UTF-8.
fn potong(v: &str, maks: usize) -> String {
    v.trim().chars().take(maks).collect()
}

impl KolomIdentitas {
    pub(crate) fn dari_formulir(data: &serde_json::Value, lama: Option<&Pendaftar>) -> Self {
        let teks = |kunci: &[&str]| -> Option<String> {
            kunci.iter().find_map(|k| {
                data.get(*k).and_then(|v| match v {
                    serde_json::Value::String(s) if !s.trim().is_empty() => Some(s.clone()),
                    serde_json::Value::Number(n) => Some(n.to_string()),
                    _ => None,
                })
            })
        };
        let atau = |baru: Option<String>, lama: Option<&String>, maks: usize| {
            potong(
                baru.as_deref().or(lama.map(String::as_str)).unwrap_or(""),
                maks,
            )
        };

        let tgl_lahir = teks(&["tgl_lahir"])
            .and_then(|s| NaiveDate::parse_from_str(s.trim(), "%Y-%m-%d").ok())
            .or(lama.map(|p| p.tgl_lahir))
            .unwrap_or_else(tgl_lahir_kosong);

        let jenis_kelamin = teks(&["jenis_kelamin"])
            .and_then(|s| normalisasi_jenis_kelamin(&s))
            .or_else(|| lama.and_then(|p| normalisasi_jenis_kelamin(&p.jenis_kelamin)))
            .unwrap_or("L");

        let nilai_rapor_avg = ["nilai_rata_rata_rapor", "nilai_rapor_avg"]
            .iter()
            .find_map(|k| {
                data.get(*k).and_then(|v| {
                    v.as_f64().or_else(|| {
                        v.as_str()
                            .and_then(|s| s.trim().replace(',', ".").parse().ok())
                    })
                })
            })
            .or(lama.map(|p| p.nilai_rapor_avg))
            .unwrap_or(0.0);

        Self {
            nik: atau(teks(&["nik"]), lama.map(|p| &p.nik), 16),
            tempat_lahir: atau(teks(&["tempat_lahir"]), lama.map(|p| &p.tempat_lahir), 100),
            tgl_lahir,
            jenis_kelamin,
            agama: atau(teks(&["agama"]), lama.map(|p| &p.agama), 50),
            alamat_lengkap: atau(
                teks(&["alamat_ktp", "alamat_lengkap"]),
                lama.map(|p| &p.alamat_lengkap),
                2000,
            ),
            nama_ortu: atau(
                teks(&["nama_ayah", "nama_ibu", "nama_ortu"]),
                lama.map(|p| &p.nama_ortu),
                255,
            ),
            no_hp_ortu: atau(teks(&["no_hp_ortu"]), lama.map(|p| &p.no_hp_ortu), 50),
            asal_sekolah: atau(teks(&["asal_sekolah"]), lama.map(|p| &p.asal_sekolah), 255),
            jurusan_sekolah: atau(
                teks(&["jurusan_sekolah"]),
                lama.map(|p| &p.jurusan_sekolah),
                100,
            ),
            nilai_rapor_avg,
        }
    }
}

/// (nama_sesi, mode, ruang, jadwal_mulai, jadwal_selesai, passing_grade)
type BarisSesiDashboard = (String, String, String, DateTime<Utc>, DateTime<Utc>, f64);

type BarisTagihanDashboard = (String, i64, String, DateTime<Utc>, Option<String>);

/// Status satu pos biaya untuk dashboard calon.
pub(crate) fn status_biaya(tagihan: Option<&str>, bukti_terakhir: Option<&str>) -> &'static str {
    match (tagihan, bukti_terakhir) {
        (None, _) => "BELUM_TERBIT",
        (Some("LUNAS"), _) => "LUNAS",
        (Some("KEDALUWARSA"), _) => "KEDALUWARSA",
        (Some("BATAL"), _) => "BATAL",
        (Some(_), Some("PENDING")) => "MENUNGGU_VERIFIKASI",
        (Some(_), Some("DITOLAK")) => "DITOLAK",
        (Some(_), _) => "MENUNGGU_PEMBAYARAN",
    }
}

/// Hitung berkas wajib per status untuk dashboard calon.
pub(crate) fn ringkas_berkas_dashboard(items: &[BerkasCalonItem]) -> RingkasanBerkasDashboard {
    let mut r = RingkasanBerkasDashboard::default();
    for i in items.iter().filter(|i| i.wajib) {
        r.total_wajib += 1;
        if i.id.is_none() {
            continue;
        }
        r.wajib_terunggah += 1;
        match i.status_verifikasi.as_str() {
            "VALID" | "DITERIMA" => r.valid += 1,
            "INVALID" | "DITOLAK" => r.ditolak += 1,
            _ => r.menunggu_verifikasi += 1,
        }
    }
    r
}

fn prodi_pilihan(p: &Pendaftar) -> Vec<Uuid> {
    std::iter::once(p.prodi_pilihan_1)
        .chain(p.prodi_pilihan_2)
        .collect()
}

fn pastikan_boleh_unggah_berkas(p: &Pendaftar) -> Result<(), AppError> {
    alur::pastikan_status(
        &p.status_pendaftaran,
        status::BOLEH_UNGGAH_BERKAS,
        "Unggah berkas dibuka setelah pembayaran formulir disetujui admin PMB.",
    )
}

/// Jalur dengan tipe seleksi CBT / CAMPURAN mewajibkan calon memilih dan mengikuti sesi CBT.
pub(crate) async fn jalur_butuh_cbt(pool: &sqlx::PgPool, jalur_id: Uuid) -> Result<bool, AppError> {
    let tipe: Option<String> =
        sqlx::query_scalar("SELECT tipe_seleksi FROM jalur_masuk WHERE id = $1")
            .bind(jalur_id)
            .fetch_optional(pool)
            .await?;
    Ok(matches!(
        tipe.as_deref(),
        Some("CBT") | Some("CAMPURAN") | None
    ))
}

/// Sesi boleh dipilih calon: dibuka untuk pendaftaran, belum dimulai, tidak dibatalkan,
/// dan cakupan gelombang/jalurnya cocok (NULL = semua).
async fn validasi_sesi_pilihan<'e, E: sqlx::PgExecutor<'e>>(
    exec: E,
    sesi_id: Uuid,
    gelombang_id: Uuid,
    jalur_id: Uuid,
) -> Result<(), AppError> {
    let ok: Option<bool> = sqlx::query_scalar(
        "SELECT (is_dibuka_pendaftaran
                 AND jadwal_selesai > NOW()
                 AND status NOT IN ('DIBATALKAN', 'SELESAI')
                 AND (gelombang_id IS NULL OR gelombang_id = $2)
                 AND (jalur_id IS NULL OR jalur_id = $3))
         FROM sesi_ujian WHERE id = $1",
    )
    .bind(sesi_id)
    .bind(gelombang_id)
    .bind(jalur_id)
    .fetch_optional(exec)
    .await?;

    match ok {
        Some(true) => Ok(()),
        Some(false) => Err(AppError::BadRequest(
            "Sesi CBT yang dipilih sudah ditutup atau tidak berlaku untuk jalur/gelombang Anda"
                .to_string(),
        )),
        None => Err(AppError::BadRequest(
            "Sesi CBT yang dipilih tidak ditemukan".to_string(),
        )),
    }
}

/// Ringkasan status berkas wajib (berdasarkan unggahan terbaru per jenis berkas).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RingkasanBerkas {
    /// Semua berkas wajib sudah diunggah.
    pub lengkap: bool,
    /// Ada berkas (wajib/opsional) yang unggahan terbarunya ditolak.
    pub ada_ditolak: bool,
    /// Semua berkas wajib berstatus valid.
    pub semua_valid: bool,
}

impl RingkasanBerkas {
    pub fn dari_items(items: &[crate::modules::pendaftaran::dto::BerkasCalonItem]) -> Self {
        let ditolak = |s: &str| matches!(s, "INVALID" | "DITOLAK");
        let valid = |s: &str| matches!(s, "VALID" | "DITERIMA");
        let wajib: Vec<_> = items.iter().filter(|i| i.wajib).collect();
        Self {
            lengkap: wajib.iter().all(|i| i.id.is_some()),
            ada_ditolak: items
                .iter()
                .any(|i| i.id.is_some() && ditolak(&i.status_verifikasi)),
            semua_valid: wajib.iter().all(|i| valid(&i.status_verifikasi)),
        }
    }
}

/// Ekstensi sah untuk tiap tipe MIME berkas PMB.
fn ekstensi_mime(mime: &str) -> &'static [&'static str] {
    match mime {
        "application/pdf" => &["pdf"],
        "image/jpeg" => &["jpg", "jpeg"],
        "image/png" => &["png"],
        "image/webp" => &["webp"],
        _ => &[],
    }
}

/// Berkas sah bila tipe MIME-nya diizinkan definisi berkas DAN ekstensi nama file
/// cocok dengan tipe itu. `tipe_file` boleh berisi MIME ("application/pdf") atau
/// ekstensi ("pdf").
pub(crate) fn validasi_format_berkas(
    tipe_file: &str,
    file_name: &str,
    mime_type: &str,
) -> Result<(), AppError> {
    const MIME_DIKENAL: [&str; 4] = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    let diizinkan: Vec<&str> = tipe_file
        .split(',')
        .map(|t| t.trim().trim_start_matches('.').to_lowercase())
        .filter(|t| !t.is_empty())
        .filter_map(|t| {
            MIME_DIKENAL
                .iter()
                .find(|m| **m == t || ekstensi_mime(m).contains(&t.as_str()))
                .copied()
        })
        .collect();
    let label = diizinkan
        .iter()
        .map(|m| ekstensi_mime(m)[0].to_uppercase())
        .collect::<Vec<_>>()
        .join(", ");
    let mime = mime_type.trim().to_lowercase();
    let ext = file_name
        .rsplit_once('.')
        .map(|(_, e)| e.to_lowercase())
        .unwrap_or_default();
    if !diizinkan.contains(&mime.as_str()) || !ekstensi_mime(&mime).contains(&ext.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Ekstensi berkas yang Anda masukkan salah, silakan ulangi kembali. Format yang diterima: {label}"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn berkas(wajib: bool, diunggah: bool, status: &str) -> BerkasCalonItem {
        BerkasCalonItem {
            id: diunggah.then(Uuid::new_v4),
            definisi_berkas_id: Uuid::new_v4(),
            kode_berkas: "X".to_string(),
            nama: "X".to_string(),
            deskripsi: None,
            wajib,
            tipe_file: "pdf".to_string(),
            ukuran_maks_kb: 1024,
            urutan: 1,
            file_key: None,
            file_name: None,
            mime_type: None,
            file_size_bytes: None,
            status_verifikasi: status.to_string(),
            catatan: None,
            uploaded_at: None,
        }
    }

    #[test]
    fn ringkas_berkas_hanya_menghitung_berkas_wajib() {
        let r = ringkas_berkas_dashboard(&[
            berkas(true, true, "VALID"),
            berkas(true, true, "INVALID"),
            berkas(true, true, "PENDING"),
            berkas(true, false, "BELUM_UNGGAH"),
            berkas(false, true, "VALID"),
        ]);
        assert_eq!(r.total_wajib, 4);
        assert_eq!(r.wajib_terunggah, 3);
        assert_eq!(r.valid, 1);
        assert_eq!(r.ditolak, 1);
        assert_eq!(r.menunggu_verifikasi, 1);
    }

    #[test]
    fn jenis_kelamin_dinormalisasi_ke_kode_kolom() {
        assert_eq!(normalisasi_jenis_kelamin("Laki-laki"), Some("L"));
        assert_eq!(normalisasi_jenis_kelamin(" perempuan "), Some("P"));
        assert_eq!(normalisasi_jenis_kelamin("P"), Some("P"));
        assert_eq!(normalisasi_jenis_kelamin("lainnya"), None);
    }

    #[test]
    fn kolom_identitas_dari_formulir_tanpa_data_karangan() {
        let data = serde_json::json!({
            "nik": "3372011234567890",
            "tempat_lahir": "Klaten",
            "tgl_lahir": "2008-03-14",
            "jenis_kelamin": "Perempuan",
            "agama": "Islam",
            "alamat_ktp": "Jl. Melati 12",
            "nama_ayah": "Budi",
            "no_hp_ortu": "081298765432",
            "asal_sekolah": "SMAN 1 Klaten",
            "jurusan_sekolah": "IPA",
            "nilai_rata_rata_rapor": "87,5"
        });
        let k = KolomIdentitas::dari_formulir(&data, None);
        assert_eq!(k.jenis_kelamin, "P");
        assert_eq!(k.tgl_lahir, NaiveDate::from_ymd_opt(2008, 3, 14).unwrap());
        assert_eq!(k.nama_ortu, "Budi");
        assert_eq!(k.nilai_rapor_avg, 87.5);

        // Formulir kosong: tidak ada nilai karangan seperti NIK 0000... atau kota tertentu
        let kosong = KolomIdentitas::dari_formulir(&serde_json::json!({}), None);
        assert_eq!(kosong.nik, "");
        assert_eq!(kosong.tempat_lahir, "");
        assert_eq!(kosong.alamat_lengkap, "");
        assert_eq!(kosong.tgl_lahir, tgl_lahir_kosong());
    }

    #[test]
    fn kolom_identitas_dipotong_sesuai_panjang_kolom() {
        let data = serde_json::json!({ "nik": "12345678901234567890", "agama": "x".repeat(80) });
        let k = KolomIdentitas::dari_formulir(&data, None);
        assert_eq!(k.nik.chars().count(), 16);
        assert_eq!(k.agama.chars().count(), 50);
    }

    #[test]
    fn status_biaya_mengikuti_tagihan_lalu_bukti() {
        assert_eq!(status_biaya(None, None), "BELUM_TERBIT");
        assert_eq!(
            status_biaya(Some("MENUNGGU_PEMBAYARAN"), None),
            "MENUNGGU_PEMBAYARAN"
        );
        assert_eq!(
            status_biaya(Some("MENUNGGU_PEMBAYARAN"), Some("PENDING")),
            "MENUNGGU_VERIFIKASI"
        );
        assert_eq!(
            status_biaya(Some("MENUNGGU_PEMBAYARAN"), Some("DITOLAK")),
            "DITOLAK"
        );
        // Tagihan lunas menang atas status bukti apa pun
        assert_eq!(status_biaya(Some("LUNAS"), Some("PENDING")), "LUNAS");
        assert_eq!(status_biaya(Some("KEDALUWARSA"), None), "KEDALUWARSA");
    }

    #[test]
    fn format_berkas_wajib_cocok_ekstensi_dan_mime() {
        let semua = "image/jpeg,image/png,application/pdf";
        assert!(validasi_format_berkas(semua, "rapor.PDF", "application/pdf").is_ok());
        assert!(validasi_format_berkas(semua, "foto.jpeg", "image/jpeg").is_ok());
        assert!(validasi_format_berkas("pdf", "a.pdf", "application/pdf").is_ok());
        // ekstensi tidak cocok dengan MIME yang diklaim
        assert!(validasi_format_berkas(semua, "virus.exe", "application/pdf").is_err());
        assert!(validasi_format_berkas(semua, "foto.png", "application/pdf").is_err());
        assert!(validasi_format_berkas(semua, "tanpa_ekstensi", "image/png").is_err());
        // MIME tidak diizinkan untuk berkas ini
        assert!(validasi_format_berkas("application/pdf", "foto.png", "image/png").is_err());
        assert!(validasi_format_berkas(semua, "a.docx", "application/msword").is_err());
    }
}
