use chrono::Utc;
use uuid::Uuid;

use crate::{
    error::AppError,
    extractors::AuthUser,
    modules::konfigurasi::{
        dto::{
            BiayaItemDetail, CreateFakultasRequest, CreateGelombangRequest,
            CreateJalurKonfigurasiRequest, CreateKomponenBiayaRequest, CreateMatriksBiayaRequest,
            CreateProdiKonfigurasiRequest, CreateTahunAkademikRequest, CreateVoucherRequest,
            FakultasResponse, GelombangDetailResponse, HitungBiayaRequest, HitungBiayaResponse,
            JalurDetailResponse, KomponenBiayaResponse, KuotaProdiGelombangResponse,
            MatriksBiayaResponse, PengaturanResponse, ProdiDetailResponse,
            SetKuotaProdiGelombangRequest, TahunAkademikResponse, UpdateGelombangRequest,
            UpdateJalurKonfigurasiRequest, UpdateMatriksBiayaRequest, UpdatePengaturanRequest,
            UpdateProdiKonfigurasiRequest, UpdateTahunAkademikRequest, UpdateVoucherRequest,
            VoucherDetailResponse,
        },
        model::MatriksBiaya,
        repository::KonfigurasiRepository,
    },
};

#[derive(Clone)]
pub struct KonfigurasiService {
    repo: KonfigurasiRepository,
}

impl KonfigurasiService {
    pub fn new(repo: KonfigurasiRepository) -> Self {
        Self { repo }
    }

    // ================= TAHUN AKADEMIK =================
    pub async fn list_tahun_akademik(&self) -> Result<Vec<TahunAkademikResponse>, AppError> {
        let items = self.repo.list_tahun_akademik().await?;
        let res = items
            .into_iter()
            .map(|t| TahunAkademikResponse {
                id: t.id,
                kode: t.kode,
                nama: t.nama,
                tgl_mulai: t.tgl_mulai,
                tgl_selesai: t.tgl_selesai,
                is_active: t.is_active,
                created_at: t.created_at,
                updated_at: t.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_tahun_akademik(
        &self,
        operator: &AuthUser,
        req: CreateTahunAkademikRequest,
    ) -> Result<TahunAkademikResponse, AppError> {
        if req.tgl_mulai >= req.tgl_selesai {
            return Err(AppError::BadRequest(
                "Tanggal mulai tahun akademik harus lebih awal dari tanggal selesai".to_string(),
            ));
        }

        let item = self.repo.create_tahun_akademik(&req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "tahun_akademik",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(TahunAkademikResponse {
            id: item.id,
            kode: item.kode,
            nama: item.nama,
            tgl_mulai: item.tgl_mulai,
            tgl_selesai: item.tgl_selesai,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_tahun_akademik(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateTahunAkademikRequest,
    ) -> Result<TahunAkademikResponse, AppError> {
        if req.tgl_mulai >= req.tgl_selesai {
            return Err(AppError::BadRequest(
                "Tanggal mulai tahun akademik harus lebih awal dari tanggal selesai".to_string(),
            ));
        }

        let item = self.repo.update_tahun_akademik(id, &req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "tahun_akademik",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(TahunAkademikResponse {
            id: item.id,
            kode: item.kode,
            nama: item.nama,
            tgl_mulai: item.tgl_mulai,
            tgl_selesai: item.tgl_selesai,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_tahun_akademik(
        &self,
        operator: &AuthUser,
        id: Uuid,
    ) -> Result<(), AppError> {
        self.repo.delete_tahun_akademik(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "tahun_akademik",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= FAKULTAS =================
    pub async fn list_fakultas(&self) -> Result<Vec<FakultasResponse>, AppError> {
        let items = self.repo.list_fakultas().await?;
        let res = items
            .into_iter()
            .map(|f| FakultasResponse {
                id: f.id,
                kode_fakultas: f.kode_fakultas,
                nama_fakultas: f.nama_fakultas,
                deskripsi: f.deskripsi,
                is_active: f.is_active,
                created_at: f.created_at,
                updated_at: f.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_fakultas(
        &self,
        operator: &AuthUser,
        req: CreateFakultasRequest,
    ) -> Result<FakultasResponse, AppError> {
        let item = self.repo.create_fakultas(&req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "fakultas",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(FakultasResponse {
            id: item.id,
            kode_fakultas: item.kode_fakultas,
            nama_fakultas: item.nama_fakultas,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_fakultas(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: CreateFakultasRequest,
    ) -> Result<FakultasResponse, AppError> {
        let item = self.repo.update_fakultas(id, &req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "fakultas",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(FakultasResponse {
            id: item.id,
            kode_fakultas: item.kode_fakultas,
            nama_fakultas: item.nama_fakultas,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_fakultas(&self, operator: &AuthUser, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_fakultas(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "fakultas",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= GELOMBANG =================
    pub async fn list_gelombang(&self) -> Result<Vec<GelombangDetailResponse>, AppError> {
        self.repo.list_gelombang().await
    }

    pub async fn create_gelombang(
        &self,
        operator: &AuthUser,
        req: CreateGelombangRequest,
    ) -> Result<GelombangDetailResponse, AppError> {
        if req.tgl_mulai >= req.tgl_selesai {
            return Err(AppError::BadRequest(
                "Tanggal mulai gelombang harus lebih awal dari tanggal selesai".to_string(),
            ));
        }

        if req.kuota < 0 {
            return Err(AppError::BadRequest(
                "Kuota gelombang tidak boleh bernilai negatif".to_string(),
            ));
        }

        // Validasi: tanggal gelombang tidak boleh tumpang tindih dalam tahun akademik yang sama
        let overlapping = self
            .repo
            .check_gelombang_overlapping(
                req.tahun_akademik_id,
                None,
                req.tgl_mulai,
                req.tgl_selesai,
            )
            .await?;

        if overlapping {
            return Err(AppError::Conflict(
                "Jadwal gelombang berbenturan (tumpang tindih) dengan gelombang lain pada periode tahun akademik ini"
                    .to_string(),
            ));
        }

        let item = self.repo.create_gelombang(&req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "gelombang",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(GelombangDetailResponse {
            id: item.id,
            nama_gelombang: item.nama_gelombang,
            tahun_akademik_id: item.tahun_akademik_id,
            tahun_akademik_nama: None,
            nomor_gelombang: item.nomor_gelombang,
            status: item.status,
            tgl_mulai: item.tgl_mulai,
            tgl_selesai: item.tgl_selesai,
            kuota: item.kuota,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_gelombang(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateGelombangRequest,
    ) -> Result<GelombangDetailResponse, AppError> {
        if req.tgl_mulai >= req.tgl_selesai {
            return Err(AppError::BadRequest(
                "Tanggal mulai gelombang harus lebih awal dari tanggal selesai".to_string(),
            ));
        }

        if req.kuota < 0 {
            return Err(AppError::BadRequest(
                "Kuota gelombang tidak boleh bernilai negatif".to_string(),
            ));
        }

        let overlapping = self
            .repo
            .check_gelombang_overlapping(
                req.tahun_akademik_id,
                Some(id),
                req.tgl_mulai,
                req.tgl_selesai,
            )
            .await?;

        if overlapping {
            return Err(AppError::Conflict(
                "Jadwal gelombang berbenturan (tumpang tindih) dengan gelombang lain pada periode tahun akademik ini"
                    .to_string(),
            ));
        }

        let item = self.repo.update_gelombang(id, &req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "gelombang",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(GelombangDetailResponse {
            id: item.id,
            nama_gelombang: item.nama_gelombang,
            tahun_akademik_id: item.tahun_akademik_id,
            tahun_akademik_nama: None,
            nomor_gelombang: item.nomor_gelombang,
            status: item.status,
            tgl_mulai: item.tgl_mulai,
            tgl_selesai: item.tgl_selesai,
            kuota: item.kuota,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_gelombang(&self, operator: &AuthUser, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_gelombang(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "gelombang",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= PROGRAM STUDI & KUOTA =================
    pub async fn list_prodi(&self) -> Result<Vec<ProdiDetailResponse>, AppError> {
        let items = self.repo.list_prodi().await?;
        let res = items
            .into_iter()
            .map(|p| ProdiDetailResponse {
                id: p.id,
                kode_prodi: p.kode_prodi,
                nama_prodi: p.nama_prodi,
                jenjang: p.jenjang,
                fakultas: p.fakultas,
                kode_fakultas: p.kode_fakultas,
                fakultas_id: p.fakultas_id,
                passing_score: p.passing_score,
                kuota: p.kuota,
                ukt_nominal: p.ukt_nominal,
                is_active: p.is_active,
                created_at: p.created_at,
                updated_at: p.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_prodi(
        &self,
        operator: &AuthUser,
        req: CreateProdiKonfigurasiRequest,
    ) -> Result<ProdiDetailResponse, AppError> {
        if req.kuota < 0 {
            return Err(AppError::BadRequest(
                "Kuota prodi tidak boleh bernilai negatif".to_string(),
            ));
        }

        let item = self.repo.create_prodi(&req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "program_studi",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(ProdiDetailResponse {
            id: item.id,
            kode_prodi: item.kode_prodi,
            nama_prodi: item.nama_prodi,
            jenjang: item.jenjang,
            fakultas: item.fakultas,
            kode_fakultas: item.kode_fakultas,
            fakultas_id: item.fakultas_id,
            passing_score: item.passing_score,
            kuota: item.kuota,
            ukt_nominal: item.ukt_nominal,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_prodi(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateProdiKonfigurasiRequest,
    ) -> Result<ProdiDetailResponse, AppError> {
        if req.kuota < 0 {
            return Err(AppError::BadRequest(
                "Kuota prodi tidak boleh bernilai negatif".to_string(),
            ));
        }

        let item = self.repo.update_prodi(id, &req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "program_studi",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(ProdiDetailResponse {
            id: item.id,
            kode_prodi: item.kode_prodi,
            nama_prodi: item.nama_prodi,
            jenjang: item.jenjang,
            fakultas: item.fakultas,
            kode_fakultas: item.kode_fakultas,
            fakultas_id: item.fakultas_id,
            passing_score: item.passing_score,
            kuota: item.kuota,
            ukt_nominal: item.ukt_nominal,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_prodi(&self, operator: &AuthUser, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_prodi(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "program_studi",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    pub async fn list_kuota_prodi_gelombang(
        &self,
    ) -> Result<Vec<KuotaProdiGelombangResponse>, AppError> {
        self.repo.list_kuota_prodi_gelombang().await
    }

    pub async fn set_kuota_prodi_gelombang(
        &self,
        operator: &AuthUser,
        req: SetKuotaProdiGelombangRequest,
    ) -> Result<KuotaProdiGelombangResponse, AppError> {
        if req.kuota < 0 {
            return Err(AppError::BadRequest(
                "Kuota gelombang prodi tidak boleh negatif".to_string(),
            ));
        }

        let item = self.repo.set_kuota_prodi_gelombang(&req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "SET_KUOTA",
                "kuota_prodi_gelombang",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(item)
    }

    // ================= JALUR MASUK =================
    pub async fn list_jalur(&self) -> Result<Vec<JalurDetailResponse>, AppError> {
        let items = self.repo.list_jalur().await?;
        let res = items
            .into_iter()
            .map(|j| JalurDetailResponse {
                id: j.id,
                kode_jalur: j.kode_jalur,
                nama_jalur: j.nama_jalur,
                deskripsi: j.deskripsi,
                biaya_formulir: j.biaya_formulir,
                tipe_seleksi: j.tipe_seleksi,
                syarat: j.syarat,
                kuota_maksimal: j.kuota_maksimal,
                is_active: j.is_active,
                created_at: j.created_at,
                updated_at: j.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_jalur(
        &self,
        operator: &AuthUser,
        req: CreateJalurKonfigurasiRequest,
    ) -> Result<JalurDetailResponse, AppError> {
        let item = self.repo.create_jalur(&req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "jalur_masuk",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(JalurDetailResponse {
            id: item.id,
            kode_jalur: item.kode_jalur,
            nama_jalur: item.nama_jalur,
            deskripsi: item.deskripsi,
            biaya_formulir: item.biaya_formulir,
            tipe_seleksi: item.tipe_seleksi,
            syarat: item.syarat,
            kuota_maksimal: item.kuota_maksimal,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_jalur(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateJalurKonfigurasiRequest,
    ) -> Result<JalurDetailResponse, AppError> {
        let item = self.repo.update_jalur(id, &req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "jalur_masuk",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(JalurDetailResponse {
            id: item.id,
            kode_jalur: item.kode_jalur,
            nama_jalur: item.nama_jalur,
            deskripsi: item.deskripsi,
            biaya_formulir: item.biaya_formulir,
            tipe_seleksi: item.tipe_seleksi,
            syarat: item.syarat,
            kuota_maksimal: item.kuota_maksimal,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_jalur(&self, operator: &AuthUser, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_jalur(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "jalur_masuk",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= KOMPONEN BIAYA =================
    pub async fn list_komponen_biaya(&self) -> Result<Vec<KomponenBiayaResponse>, AppError> {
        let items = self.repo.list_komponen_biaya().await?;
        let res = items
            .into_iter()
            .map(|k| KomponenBiayaResponse {
                id: k.id,
                kode_komponen: k.kode_komponen,
                nama_komponen: k.nama_komponen,
                deskripsi: k.deskripsi,
                is_active: k.is_active,
                created_at: k.created_at,
                updated_at: k.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_komponen_biaya(
        &self,
        operator: &AuthUser,
        req: CreateKomponenBiayaRequest,
    ) -> Result<KomponenBiayaResponse, AppError> {
        let item = self.repo.create_komponen_biaya(&req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "komponen_biaya",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(KomponenBiayaResponse {
            id: item.id,
            kode_komponen: item.kode_komponen,
            nama_komponen: item.nama_komponen,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_komponen_biaya(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: CreateKomponenBiayaRequest,
    ) -> Result<KomponenBiayaResponse, AppError> {
        let item = self.repo.update_komponen_biaya(id, &req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "komponen_biaya",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(KomponenBiayaResponse {
            id: item.id,
            kode_komponen: item.kode_komponen,
            nama_komponen: item.nama_komponen,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_komponen_biaya(
        &self,
        operator: &AuthUser,
        id: Uuid,
    ) -> Result<(), AppError> {
        self.repo.delete_komponen_biaya(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "komponen_biaya",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= MATRIKS BIAYA =================
    pub async fn list_matriks_biaya(&self) -> Result<Vec<MatriksBiayaResponse>, AppError> {
        self.repo.list_matriks_biaya().await
    }

    pub async fn create_matriks_biaya(
        &self,
        operator: &AuthUser,
        req: CreateMatriksBiayaRequest,
    ) -> Result<MatriksBiaya, AppError> {
        let item = self.repo.create_matriks_biaya(&req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "matriks_biaya",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(item)
    }

    pub async fn update_matriks_biaya(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateMatriksBiayaRequest,
    ) -> Result<MatriksBiaya, AppError> {
        let item = self.repo.update_matriks_biaya(id, &req).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "matriks_biaya",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;
        Ok(item)
    }

    pub async fn delete_matriks_biaya(
        &self,
        operator: &AuthUser,
        id: Uuid,
    ) -> Result<(), AppError> {
        self.repo.delete_matriks_biaya(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "matriks_biaya",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    pub async fn hitung_biaya(
        &self,
        req: HitungBiayaRequest,
    ) -> Result<HitungBiayaResponse, AppError> {
        let items = self
            .repo
            .find_matriks_by_prodi_jalur_gelombang(req.prodi_id, req.jalur_id, req.gelombang_id)
            .await?;

        let mut total_asli: i64 = 0;
        let mut bisa_dicicil = false;
        let mut maksimal_cicilan_maks: i32 = 1;
        let mut rincian = Vec::new();

        for item in &items {
            total_asli += item.nominal;
            if item.bisa_dicicil {
                bisa_dicicil = true;
                maksimal_cicilan_maks = maksimal_cicilan_maks.max(item.maksimal_cicilan);
            }
            rincian.push(BiayaItemDetail {
                komponen_id: item.komponen_id,
                nama_komponen: item.nama_komponen.clone(),
                kode_komponen: item.kode_komponen.clone(),
                nominal: item.nominal,
                bisa_dicicil: item.bisa_dicicil,
                maksimal_cicilan: item.maksimal_cicilan,
                cicilan_pertama: item.nominal_cicilan_pertama,
            });
        }

        // Hitung diskon voucher jika ada
        let mut diskon: i64 = 0;
        let mut voucher_valid = false;
        let mut voucher_pesan: Option<String> = None;

        if let Some(kode) = req.voucher_kode {
            if let Some(vc) = self.repo.find_voucher_by_kode(&kode).await? {
                if !vc.is_active {
                    voucher_pesan = Some("Kode voucher tidak aktif".to_string());
                } else if vc.tgl_kadaluarsa <= Utc::now() {
                    voucher_pesan = Some("Kode voucher telah kedaluwarsa".to_string());
                } else if vc.kuota_terpakai >= vc.kuota {
                    voucher_pesan = Some("Kuota voucher telah habis terpakai".to_string());
                } else if let Some(b_jalur) = vc.batas_jalur_id {
                    if b_jalur != req.jalur_id {
                        voucher_pesan = Some(
                            "Voucher ini tidak berlaku untuk jalur pendaftaran Anda".to_string(),
                        );
                    }
                } else if let Some(b_prodi) = vc.batas_prodi_id {
                    if b_prodi != req.prodi_id {
                        voucher_pesan = Some(
                            "Voucher ini tidak berlaku untuk program studi pilihan Anda"
                                .to_string(),
                        );
                    }
                }

                if voucher_pesan.is_none() {
                    voucher_valid = true;
                    diskon = match vc.tipe_diskon.as_str() {
                        "PERCENT" => (total_asli * vc.nilai_diskon) / 100,
                        "NOMINAL" => vc.nilai_diskon.min(total_asli),
                        _ => 0,
                    };
                    voucher_pesan = Some(format!(
                        "Voucher {} berhasil diterapkan (Diskon: Rp {:?})",
                        vc.kode_voucher, diskon
                    ));
                }
            } else {
                voucher_pesan = Some("Kode voucher tidak ditemukan".to_string());
            }
        }

        let total_akhir = (total_asli - diskon).max(0);

        // Perhitungan skema cicilan
        let cicilan_pertama = if bisa_dicicil && maksimal_cicilan_maks > 1 {
            (total_akhir * 40) / 100 // 40% uang muka default
        } else {
            total_akhir
        };

        let cicilan_berikutnya = if bisa_dicicil && maksimal_cicilan_maks > 1 {
            let sisa = total_akhir - cicilan_pertama;
            let termin_sisa = (maksimal_cicilan_maks - 1) as i64;
            sisa / termin_sisa
        } else {
            0
        };

        Ok(HitungBiayaResponse {
            total_nominal_asli: total_asli,
            diskon_voucher: diskon,
            total_akhir,
            voucher_valid,
            voucher_pesan,
            bisa_dicicil,
            maksimal_cicilan_maks,
            estimasi_cicilan_pertama: cicilan_pertama,
            estimasi_cicilan_berikutnya: cicilan_berikutnya,
            rincian_komponen: rincian,
        })
    }

    // ================= VOUCHER =================
    pub async fn list_vouchers(&self) -> Result<Vec<VoucherDetailResponse>, AppError> {
        let items = self.repo.list_vouchers().await?;
        let res = items
            .into_iter()
            .map(|v| VoucherDetailResponse {
                id: v.id,
                kode_voucher: v.kode_voucher,
                tipe_diskon: v.tipe_diskon,
                nilai_diskon: v.nilai_diskon,
                kuota: v.kuota,
                kuota_terpakai: v.kuota_terpakai,
                tgl_kadaluarsa: v.tgl_kadaluarsa,
                batas_jalur_id: v.batas_jalur_id,
                batas_prodi_id: v.batas_prodi_id,
                deskripsi: v.deskripsi,
                is_active: v.is_active,
                created_at: v.created_at,
                updated_at: v.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn create_voucher(
        &self,
        operator: &AuthUser,
        req: CreateVoucherRequest,
    ) -> Result<VoucherDetailResponse, AppError> {
        let kode_upper = req.kode_voucher.trim().to_uppercase();
        if self.repo.find_voucher_by_kode(&kode_upper).await?.is_some() {
            return Err(AppError::Conflict(format!(
                "Kode voucher '{}' sudah terdaftar",
                kode_upper
            )));
        }

        if req.tipe_diskon == "PERCENT" && (req.nilai_diskon < 1 || req.nilai_diskon > 100) {
            return Err(AppError::BadRequest(
                "Nilai diskon persen harus antara 1% sampai 100%".to_string(),
            ));
        }

        let item = self.repo.create_voucher(&req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "CREATE",
                "voucher",
                &item.id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(VoucherDetailResponse {
            id: item.id,
            kode_voucher: item.kode_voucher,
            tipe_diskon: item.tipe_diskon,
            nilai_diskon: item.nilai_diskon,
            kuota: item.kuota,
            kuota_terpakai: item.kuota_terpakai,
            tgl_kadaluarsa: item.tgl_kadaluarsa,
            batas_jalur_id: item.batas_jalur_id,
            batas_prodi_id: item.batas_prodi_id,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn update_voucher(
        &self,
        operator: &AuthUser,
        id: Uuid,
        req: UpdateVoucherRequest,
    ) -> Result<VoucherDetailResponse, AppError> {
        if req.tipe_diskon == "PERCENT" && (req.nilai_diskon < 1 || req.nilai_diskon > 100) {
            return Err(AppError::BadRequest(
                "Nilai diskon persen harus antara 1% sampai 100%".to_string(),
            ));
        }

        let item = self.repo.update_voucher(id, &req).await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "voucher",
                &id.to_string(),
                &serde_json::to_string(&item).unwrap_or_default(),
            )
            .await;

        Ok(VoucherDetailResponse {
            id: item.id,
            kode_voucher: item.kode_voucher,
            tipe_diskon: item.tipe_diskon,
            nilai_diskon: item.nilai_diskon,
            kuota: item.kuota,
            kuota_terpakai: item.kuota_terpakai,
            tgl_kadaluarsa: item.tgl_kadaluarsa,
            batas_jalur_id: item.batas_jalur_id,
            batas_prodi_id: item.batas_prodi_id,
            deskripsi: item.deskripsi,
            is_active: item.is_active,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    pub async fn delete_voucher(&self, operator: &AuthUser, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_voucher(id).await?;
        self.repo
            .record_audit(
                Some(operator.user_id),
                "DELETE",
                "voucher",
                &id.to_string(),
                "{}",
            )
            .await;
        Ok(())
    }

    // ================= PENGATURAN PMB =================
    pub async fn list_pengaturan(&self) -> Result<Vec<PengaturanResponse>, AppError> {
        let items = self.repo.list_pengaturan().await?;
        let res = items
            .into_iter()
            .map(|p| PengaturanResponse {
                id: p.id,
                kunci: p.kunci,
                nilai: p.nilai,
                deskripsi: p.deskripsi,
                updated_at: p.updated_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn update_pengaturan(
        &self,
        operator: &AuthUser,
        req: UpdatePengaturanRequest,
    ) -> Result<PengaturanResponse, AppError> {
        let item = self
            .repo
            .upsert_pengaturan(
                &req.kunci,
                &req.nilai,
                req.deskripsi.as_deref(),
                Some(operator.user_id),
            )
            .await?;

        self.repo
            .record_audit(
                Some(operator.user_id),
                "UPDATE",
                "pengaturan_pmb",
                &item.kunci,
                &item.nilai,
            )
            .await;

        Ok(PengaturanResponse {
            id: item.id,
            kunci: item.kunci,
            nilai: item.nilai,
            deskripsi: item.deskripsi,
            updated_at: item.updated_at,
        })
    }
}
