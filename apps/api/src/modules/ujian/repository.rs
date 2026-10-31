use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::ujian::model::{PesertaUjian, SoalUjian, UjianCbt},
};

#[derive(Clone)]
pub struct UjianRepository {
    pool: PgPool,
}

impl UjianRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_active_ujian(&self) -> Result<Option<UjianCbt>, AppError> {
        let u = sqlx::query_as::<_, UjianCbt>(
            "SELECT id, judul, deskripsi, durasi_menit, passing_grade, is_active, created_at
             FROM ujian_cbt WHERE is_active = TRUE LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(u)
    }

    pub async fn get_soal_by_ujian(&self, ujian_id: Uuid) -> Result<Vec<SoalUjian>, AppError> {
        let list = sqlx::query_as::<_, SoalUjian>(
            "SELECT id, ujian_id, nomor_urut, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, kunci_jawaban, bobot
             FROM soal_ujian WHERE ujian_id = $1 ORDER BY nomor_urut ASC"
        )
        .bind(ujian_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn get_peserta_by_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<PesertaUjian>, AppError> {
        let p = sqlx::query_as::<_, PesertaUjian>(
            "SELECT id, pendaftar_id, ujian_id, waktu_mulai, waktu_selesai, total_skor, is_lulus, jawaban_json, created_at
             FROM peserta_ujian WHERE pendaftar_id = $1 ORDER BY created_at DESC LIMIT 1"
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn find_peserta_by_id(&self, id: Uuid) -> Result<Option<PesertaUjian>, AppError> {
        let p = sqlx::query_as::<_, PesertaUjian>(
            "SELECT id, pendaftar_id, ujian_id, waktu_mulai, waktu_selesai, total_skor, is_lulus, jawaban_json, created_at
             FROM peserta_ujian WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn create_peserta_mulai(
        &self,
        pendaftar_id: Uuid,
        ujian_id: Uuid,
    ) -> Result<PesertaUjian, AppError> {
        let p = sqlx::query_as::<_, PesertaUjian>(
            "INSERT INTO peserta_ujian (pendaftar_id, ujian_id, waktu_mulai)
             VALUES ($1, $2, NOW())
             RETURNING id, pendaftar_id, ujian_id, waktu_mulai, waktu_selesai, total_skor, is_lulus, jawaban_json, created_at"
        )
        .bind(pendaftar_id)
        .bind(ujian_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn update_hasil_ujian(
        &self,
        peserta_id: Uuid,
        total_skor: f64,
        is_lulus: bool,
        jawaban_json: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE peserta_ujian
             SET waktu_selesai = NOW(),
                 total_skor = $1,
                 is_lulus = $2,
                 jawaban_json = $3
             WHERE id = $4",
        )
        .bind(total_skor)
        .bind(is_lulus)
        .bind(jawaban_json)
        .bind(peserta_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
