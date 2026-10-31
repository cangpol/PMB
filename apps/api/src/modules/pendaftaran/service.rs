use chrono::NaiveDate;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pendaftaran::{
        dto::{
            BerkasCalonItem, BerkasDetailItem, BerkasResponse, CreateDefinisiBerkasRequest,
            CreateDefinisiFieldRequest, CreateDefinisiLangkahRequest, KonfirmasiUploadRequest,
            LangkahProgressItem, PendaftarDetailResponse, PresignUploadRequest,
            SubmitAkademikRequest, SubmitBiodataRequest, SubmitDinamisRequest,
            UpdateDefinisiBerkasRequest, UpdateDefinisiFieldRequest, UpdateDefinisiLangkahRequest,
            VerifikasiBerkasRequest,
        },
        model::{DefinisiBerkas, DefinisiField, DefinisiLangkah, Pendaftar},
        repository::PendaftaranRepository,
        validator::DynamicFormValidator,
    },
    security::storage::{PresignedDownloadResponse, PresignedUploadResponse, StorageService},
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
            .get_calon_berkas_list(pendaftar.id, Some(pendaftar.jalur_id))
            .await
    }

    pub async fn submit_formulir_dinamis(
        &self,
        user_id: Uuid,
        req: SubmitDinamisRequest,
    ) -> Result<PendaftarDetailResponse, AppError> {
        let existing = self.repo.find_by_user_id(user_id).await?;

        let jalur_id = req
            .jalur_id
            .or_else(|| existing.as_ref().map(|p| p.jalur_id))
            .unwrap_or_else(|| {
                Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_default()
            });

        let gelombang_id = req
            .gelombang_id
            .or_else(|| existing.as_ref().map(|p| p.gelombang_id))
            .unwrap_or_else(|| {
                Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_default()
            });

        let prodi_1 = req
            .prodi_pilihan_1
            .or_else(|| existing.as_ref().map(|p| p.prodi_pilihan_1))
            .unwrap_or_else(|| {
                Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_default()
            });

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

        // 4. Ekstrak field legacy jika tersedia di data JSONB
        let nik = req
            .data
            .get("nik")
            .and_then(|v| v.as_str())
            .unwrap_or("0000000000000000");
        let tempat_lahir = req
            .data
            .get("tempat_lahir")
            .and_then(|v| v.as_str())
            .unwrap_or("Surakarta");
        let tgl_lahir = req
            .data
            .get("tgl_lahir")
            .and_then(|v| v.as_str())
            .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
            .unwrap_or_else(|| NaiveDate::from_ymd_opt(2005, 1, 1).unwrap());
        let jenis_kelamin = req
            .data
            .get("jenis_kelamin")
            .and_then(|v| v.as_str())
            .unwrap_or("L");
        let agama = req
            .data
            .get("agama")
            .and_then(|v| v.as_str())
            .unwrap_or("Katolik");
        let alamat_lengkap = req
            .data
            .get("alamat_ktp")
            .or_else(|| req.data.get("alamat_lengkap"))
            .and_then(|v| v.as_str())
            .unwrap_or("Jl. Mayor Sunaryo No. 37, Surakarta");
        let nama_ortu = req
            .data
            .get("nama_ayah")
            .or_else(|| req.data.get("nama_ibu"))
            .or_else(|| req.data.get("nama_ortu"))
            .and_then(|v| v.as_str())
            .unwrap_or("Orang Tua");
        let no_hp_ortu = req
            .data
            .get("no_hp_ortu")
            .and_then(|v| v.as_str())
            .unwrap_or("081234567890");
        let asal_sekolah = req
            .data
            .get("asal_sekolah")
            .and_then(|v| v.as_str())
            .unwrap_or("SMA");
        let jurusan_sekolah = req
            .data
            .get("jurusan_sekolah")
            .and_then(|v| v.as_str())
            .unwrap_or("Umum");
        let nilai_rapor_avg = req
            .data
            .get("nilai_rata_rata_rapor")
            .or_else(|| req.data.get("nilai_rapor_avg"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

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
                nik,
                tempat_lahir,
                tgl_lahir,
                jenis_kelamin,
                agama,
                alamat_lengkap,
                nama_ortu,
                no_hp_ortu,
                asal_sekolah,
                jurusan_sekolah,
                nilai_rapor_avg,
            )
            .await?;

        // 5. Update state langkah 'biodata' menjadi SELESAI
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

        let def_berkas = self
            .repo
            .find_definisi_berkas_by_id(req.definisi_berkas_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Definisi berkas tidak ditemukan".to_string()))?;

        // Validasi ukuran berkas
        let max_bytes = (def_berkas.ukuran_maks_kb as i64) * 1024;
        if req.file_size_bytes > max_bytes {
            return Err(AppError::BadRequest(format!(
                "Ukuran berkas melebihi batas maksimal {} KB",
                def_berkas.ukuran_maks_kb
            )));
        }

        // Validasi tipe file
        let allowed_types: Vec<&str> = def_berkas.tipe_file.split(',').map(|s| s.trim()).collect();
        if !allowed_types.is_empty() && !allowed_types.contains(&req.mime_type.as_str()) {
            return Err(AppError::BadRequest(format!(
                "Format berkas tidak diizinkan. Format yang diperbolehkan: {}",
                def_berkas.tipe_file
            )));
        }

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

        let def_berkas = self
            .repo
            .find_definisi_berkas_by_id(req.definisi_berkas_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Definisi berkas tidak ditemukan".to_string()))?;

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

        // 3. Validasi tipe file
        let allowed_types: Vec<&str> = def_berkas.tipe_file.split(',').map(|s| s.trim()).collect();
        if !allowed_types.is_empty() && !allowed_types.contains(&req.mime_type.as_str()) {
            return Err(AppError::BadRequest(format!(
                "Format berkas tidak diizinkan. Format yang diperbolehkan: {}",
                def_berkas.tipe_file
            )));
        }

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

        // Cek kelengkapan berkas wajib
        let syarat_list = self
            .repo
            .list_definisi_berkas(Some(pendaftar.jalur_id))
            .await?;
        let uploaded_list = self.repo.get_berkas_by_pendaftar(pendaftar.id).await?;

        let semua_wajib_lengkap = syarat_list.iter().filter(|s| s.wajib).all(|s| {
            uploaded_list
                .iter()
                .any(|u| u.definisi_berkas_id == Some(s.id) || u.jenis_berkas == s.kode_berkas)
        });

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

        self.repo
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
            .await
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
    ) -> Result<Vec<BerkasDetailItem>, AppError> {
        self.repo
            .list_all_berkas_admin(status.as_deref(), search.as_deref())
            .await
    }

    pub async fn verifikasi_berkas_admin(
        &self,
        admin_id: Uuid,
        req: VerifikasiBerkasRequest,
    ) -> Result<(), AppError> {
        self.repo
            .update_verifikasi_berkas(
                req.berkas_id,
                &req.status_verifikasi,
                req.catatan.as_deref(),
                Some(admin_id),
            )
            .await
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
                &req.jenis_kelamin,
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

    pub async fn finalisasi(&self, user_id: Uuid) -> Result<(), AppError> {
        let pendaftar =
            self.repo.find_by_user_id(user_id).await?.ok_or_else(|| {
                AppError::BadRequest("Data pendaftaran tidak ditemukan".to_string())
            })?;

        let berkas = self.repo.get_berkas_by_pendaftar(pendaftar.id).await?;
        if berkas.is_empty() {
            return Err(AppError::BadRequest(
                "Anda harus mengunggah setidaknya dokumen Pasfoto dan KTP sebelum finalisasi"
                    .to_string(),
            ));
        }

        self.repo.finalisasi(pendaftar.id).await?;
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

        Ok(PendaftarDetailResponse {
            id: p.id,
            user_id: p.user_id,
            nama_lengkap: "Calon Mahasiswa".to_string(),
            email: "".to_string(),
            no_hp: "".to_string(),
            nomor_pendaftaran: p.nomor_pendaftaran,
            jalur_id: p.jalur_id,
            nama_jalur: "Jalur Pendaftaran".to_string(),
            gelombang_id: p.gelombang_id,
            nama_gelombang: "Gelombang Aktif".to_string(),
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
            nama_prodi_1: "Pilihan 1".to_string(),
            prodi_pilihan_2: p.prodi_pilihan_2,
            nama_prodi_2: None,
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
    }

    pub async fn list_all(&self) -> Result<Vec<Pendaftar>, AppError> {
        self.repo.list_all_pendaftar().await
    }
}
