use uuid::Uuid;

use crate::{
    error::AppError,
    modules::master::{
        dto::{GelombangResponse, JalurResponse, ProdiResponse},
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

    pub async fn list_prodi(&self) -> Result<Vec<ProdiResponse>, AppError> {
        let prodis = self.repo.get_all_prodi().await?;
        Ok(prodis
            .into_iter()
            .map(|p| ProdiResponse {
                id: p.id,
                kode_prodi: p.kode_prodi,
                nama_prodi: p.nama_prodi,
                jenjang: p.jenjang,
                fakultas: p.fakultas,
                kode_fakultas: p.kode_fakultas,
                passing_score: p.passing_score,
                kuota: p.kuota,
                ukt_nominal: p.ukt_nominal,
                is_active: p.is_active,
            })
            .collect())
    }

    pub async fn get_prodi(&self, id: Uuid) -> Result<ProdiResponse, AppError> {
        let p = self
            .repo
            .get_prodi_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Program studi tidak ditemukan".to_string()))?;

        Ok(ProdiResponse {
            id: p.id,
            kode_prodi: p.kode_prodi,
            nama_prodi: p.nama_prodi,
            jenjang: p.jenjang,
            fakultas: p.fakultas,
            kode_fakultas: p.kode_fakultas,
            passing_score: p.passing_score,
            kuota: p.kuota,
            ukt_nominal: p.ukt_nominal,
            is_active: p.is_active,
        })
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
