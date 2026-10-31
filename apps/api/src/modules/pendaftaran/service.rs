use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pendaftaran::{
        dto::{
            BerkasResponse, PendaftarDetailResponse, SubmitAkademikRequest, SubmitBiodataRequest,
            VerifikasiBerkasRequest,
        },
        repository::PendaftaranRepository,
    },
};

#[derive(Clone)]
pub struct PendaftaranService {
    repo: PendaftaranRepository,
}

impl PendaftaranService {
    pub fn new(repo: PendaftaranRepository) -> Self {
        Self { repo }
    }

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

        // Batasi ukuran maksimal 5MB
        if file_size_bytes > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest(
                "Ukuran berkas melebihi batas maksimal 5 MB".to_string(),
            ));
        }

        // Cek MIME type
        let valid_mimes = ["image/jpeg", "image/png", "application/pdf"];
        if !valid_mimes.contains(&mime_type) {
            return Err(AppError::BadRequest(
                "Tipe file tidak didukung. Format yang diperbolehkan: JPG, PNG, atau PDF"
                    .to_string(),
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
            )
            .await?;
        Ok(())
    }

    pub async fn list_all(
        &self,
    ) -> Result<Vec<crate::modules::pendaftaran::model::Pendaftar>, AppError> {
        self.repo.list_all_pendaftar().await
    }
}
