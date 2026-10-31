use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, modules::kelulusan::model::HasilKelulusan};

#[derive(Clone)]
pub struct KelulusanRepository {
    pool: PgPool,
}

impl KelulusanRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_pendaftar_id(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<HasilKelulusan>, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "SELECT id, pendaftar_id, status_kelulusan, prodi_diterima_id, skor_akhir,
                    nim_resmi, nomor_surat_loa, tanggal_sk, is_published, created_at, updated_at
             FROM hasil_kelulusan WHERE pendaftar_id = $1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(h)
    }

    pub async fn count_nim_by_prodi(&self, prodi_id: Uuid) -> Result<i64, AppError> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COALESCE(COUNT(*), 0) FROM hasil_kelulusan
             WHERE prodi_diterima_id = $1 AND nim_resmi IS NOT NULL",
        )
        .bind(prodi_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn upsert_kelulusan(
        &self,
        pendaftar_id: Uuid,
        status: &str,
        prodi_id: Option<Uuid>,
        skor: f64,
        nim: Option<&str>,
        nomor_loa: Option<&str>,
        tanggal_sk: Option<chrono::NaiveDate>,
    ) -> Result<HasilKelulusan, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "INSERT INTO hasil_kelulusan (
                pendaftar_id, status_kelulusan, prodi_diterima_id, skor_akhir,
                nim_resmi, nomor_surat_loa, tanggal_sk, is_published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            ON CONFLICT (pendaftar_id) DO UPDATE SET
                status_kelulusan = EXCLUDED.status_kelulusan,
                prodi_diterima_id = EXCLUDED.prodi_diterima_id,
                skor_akhir = EXCLUDED.skor_akhir,
                nim_resmi = EXCLUDED.nim_resmi,
                nomor_surat_loa = EXCLUDED.nomor_surat_loa,
                tanggal_sk = EXCLUDED.tanggal_sk,
                is_published = TRUE,
                updated_at = NOW()
            RETURNING id, pendaftar_id, status_kelulusan, prodi_diterima_id, skor_akhir,
                      nim_resmi, nomor_surat_loa, tanggal_sk, is_published, created_at, updated_at",
        )
        .bind(pendaftar_id)
        .bind(status)
        .bind(prodi_id)
        .bind(skor)
        .bind(nim)
        .bind(nomor_loa)
        .bind(tanggal_sk)
        .fetch_one(&self.pool)
        .await?;

        Ok(h)
    }

    pub async fn list_all(&self) -> Result<Vec<HasilKelulusan>, AppError> {
        let list = sqlx::query_as::<_, HasilKelulusan>(
            "SELECT id, pendaftar_id, status_kelulusan, prodi_diterima_id, skor_akhir,
                    nim_resmi, nomor_surat_loa, tanggal_sk, is_published, created_at, updated_at
             FROM hasil_kelulusan ORDER BY skor_akhir DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }
}
