use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::master::model::{Gelombang, JalurMasuk, ProgramStudi},
};

#[derive(Clone)]
pub struct MasterRepository {
    pool: PgPool,
}

impl MasterRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_all_prodi(&self) -> Result<Vec<ProgramStudi>, AppError> {
        let prodis = sqlx::query_as::<_, ProgramStudi>(
            "SELECT id, kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, passing_score, kuota, ukt_nominal, is_active, created_at 
             FROM program_studi WHERE is_active = TRUE ORDER BY nama_prodi ASC"
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(prodis)
    }

    pub async fn get_prodi_by_id(&self, id: Uuid) -> Result<Option<ProgramStudi>, AppError> {
        let prodi = sqlx::query_as::<_, ProgramStudi>(
            "SELECT id, kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, passing_score, kuota, ukt_nominal, is_active, created_at 
             FROM program_studi WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(prodi)
    }

    pub async fn get_all_jalur(&self) -> Result<Vec<JalurMasuk>, AppError> {
        let jalurs = sqlx::query_as::<_, JalurMasuk>(
            "SELECT id, kode_jalur, nama_jalur, deskripsi, biaya_formulir, is_active, created_at 
             FROM jalur_masuk WHERE is_active = TRUE ORDER BY biaya_formulir ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(jalurs)
    }

    pub async fn get_all_gelombang(&self) -> Result<Vec<Gelombang>, AppError> {
        let gelombangs = sqlx::query_as::<_, Gelombang>(
            "SELECT id, nama_gelombang, tgl_mulai, tgl_selesai, kuota, is_active, created_at 
             FROM gelombang WHERE is_active = TRUE ORDER BY tgl_mulai ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(gelombangs)
    }
}
