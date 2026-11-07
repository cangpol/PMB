use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::master::model::{FakultasModel, Gelombang, JalurMasuk, ProgramStudi},
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
            r#"
            SELECT id, kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
                   gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi, kompetensi_lulusan,
                   prospek_karier, fasilitas, passing_score, passing_grade, kuota, daya_tampung, ukt_nominal,
                   biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active, created_at
            FROM program_studi
            WHERE is_active = TRUE
            ORDER BY urutan_tampil ASC, nama_prodi ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(prodis)
    }

    pub async fn get_prodi_by_id(&self, id: Uuid) -> Result<Option<ProgramStudi>, AppError> {
        let prodi = sqlx::query_as::<_, ProgramStudi>(
            r#"
            SELECT id, kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
                   gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi, kompetensi_lulusan,
                   prospek_karier, fasilitas, passing_score, passing_grade, kuota, daya_tampung, ukt_nominal,
                   biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active, created_at
            FROM program_studi
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(prodi)
    }

    pub async fn get_prodi_by_slug(&self, slug: &str) -> Result<Option<ProgramStudi>, AppError> {
        let prodi = sqlx::query_as::<_, ProgramStudi>(
            r#"
            SELECT id, kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
                   gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi, kompetensi_lulusan,
                   prospek_karier, fasilitas, passing_score, passing_grade, kuota, daya_tampung, ukt_nominal,
                   biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active, created_at
            FROM program_studi
            WHERE slug = $1 OR kode_prodi = $1
            "#,
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;
        Ok(prodi)
    }

    pub async fn get_all_fakultas(&self) -> Result<Vec<FakultasModel>, AppError> {
        let fakultas = sqlx::query_as::<_, FakultasModel>(
            r#"
            SELECT id, kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active, created_at
            FROM fakultas
            WHERE is_active = TRUE
            ORDER BY urutan_tampil ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(fakultas)
    }

    pub async fn get_all_jalur(&self) -> Result<Vec<JalurMasuk>, AppError> {
        let jalurs = sqlx::query_as::<_, JalurMasuk>(
            "SELECT id, kode_jalur, nama_jalur, deskripsi, biaya_formulir, is_active, tipe_seleksi, created_at
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
