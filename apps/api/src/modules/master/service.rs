use uuid::Uuid;

use crate::{
    error::AppError,
    modules::master::{
        dto::{FakultasWithProdiResponse, GelombangResponse, JalurResponse, ProdiResponse},
        model::ProgramStudi,
        repository::MasterRepository,
    },
};

#[derive(Clone)]
pub struct MasterService {
    repo: MasterRepository,
}

impl MasterService {
    pub fn new(repo: MasterRepository) -> Self {
        Self { repo }
    }

    fn map_prodi(p: ProgramStudi) -> ProdiResponse {
        let slug = p.slug.unwrap_or_else(|| {
            format!(
                "{}-{}",
                p.jenjang.to_lowercase(),
                p.kode_prodi.to_lowercase()
            )
        });
        ProdiResponse {
            id: p.id,
            kode_prodi: p.kode_prodi,
            kode_singkat: p.kode_singkat,
            nama_prodi: p.nama_prodi,
            jenjang: p.jenjang,
            slug,
            fakultas: p.fakultas,
            kode_fakultas: p.kode_fakultas,
            fakultas_id: p.fakultas_id,
            gelar: p.gelar,
            lama_studi_semester: p.lama_studi_semester,
            akreditasi: p.akreditasi,
            deskripsi_singkat: p.deskripsi_singkat,
            tentang_prodi: p.tentang_prodi,
            kompetensi_lulusan: p.kompetensi_lulusan.unwrap_or_default(),
            prospek_karier: p.prospek_karier.unwrap_or_default(),
            fasilitas: p.fasilitas.unwrap_or_default(),
            passing_score: p.passing_score,
            passing_grade: p.passing_grade,
            kuota: p.kuota,
            daya_tampung: p.daya_tampung,
            ukt_nominal: p.ukt_nominal,
            biaya_ukt_min: p.biaya_ukt_min,
            biaya_ukt_maks: p.biaya_ukt_maks,
            urutan_tampil: p.urutan_tampil,
            is_active: p.is_active,
        }
    }

    pub async fn list_prodi(&self) -> Result<Vec<ProdiResponse>, AppError> {
        let prodis = self.repo.get_all_prodi().await?;
        Ok(prodis.into_iter().map(Self::map_prodi).collect())
    }

    pub async fn get_prodi(&self, id: Uuid) -> Result<ProdiResponse, AppError> {
        let p = self
            .repo
            .get_prodi_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Program studi tidak ditemukan".to_string()))?;
        Ok(Self::map_prodi(p))
    }

    pub async fn get_prodi_by_slug(&self, slug: &str) -> Result<ProdiResponse, AppError> {
        let p = self.repo.get_prodi_by_slug(slug).await?.ok_or_else(|| {
            AppError::NotFound(format!(
                "Program studi dengan slug '{}' tidak ditemukan",
                slug
            ))
        })?;
        Ok(Self::map_prodi(p))
    }

    pub async fn list_fakultas_with_prodi(
        &self,
    ) -> Result<Vec<FakultasWithProdiResponse>, AppError> {
        let fakultas_list = self.repo.get_all_fakultas().await?;
        let prodi_list = self.repo.get_all_prodi().await?;

        let mapped_prodis: Vec<ProdiResponse> =
            prodi_list.into_iter().map(Self::map_prodi).collect();

        let result = fakultas_list
            .into_iter()
            .map(|f| {
                let prodis: Vec<ProdiResponse> = mapped_prodis
                    .iter()
                    .filter(|p| {
                        if let Some(fid) = p.fakultas_id {
                            fid == f.id
                        } else {
                            p.kode_fakultas == f.kode_fakultas
                        }
                    })
                    .cloned()
                    .collect();
                let prodi_count = prodis.len() as i64;
                let slug = f.slug.unwrap_or_else(|| f.kode_fakultas.to_lowercase());

                FakultasWithProdiResponse {
                    id: f.id,
                    kode_fakultas: f.kode_fakultas,
                    nama_fakultas: f.nama_fakultas,
                    slug,
                    deskripsi_singkat: f.deskripsi_singkat,
                    urutan_tampil: f.urutan_tampil,
                    prodi_count,
                    prodi_list: prodis,
                }
            })
            .collect();

        Ok(result)
    }

    pub async fn list_jalur(&self) -> Result<Vec<JalurResponse>, AppError> {
        let jalurs = self.repo.get_all_jalur().await?;
        Ok(jalurs
            .into_iter()
            .map(|j| JalurResponse {
                id: j.id,
                kode_jalur: j.kode_jalur,
                nama_jalur: j.nama_jalur,
                deskripsi: j.deskripsi,
                biaya_formulir: j.biaya_formulir,
                is_active: j.is_active,
            })
            .collect())
    }

    pub async fn list_gelombang(&self) -> Result<Vec<GelombangResponse>, AppError> {
        let gelombangs = self.repo.get_all_gelombang().await?;
        Ok(gelombangs
            .into_iter()
            .map(|g| GelombangResponse {
                id: g.id,
                nama_gelombang: g.nama_gelombang,
                tgl_mulai: g.tgl_mulai,
                tgl_selesai: g.tgl_selesai,
                kuota: g.kuota,
                is_active: g.is_active,
            })
            .collect())
    }
}
