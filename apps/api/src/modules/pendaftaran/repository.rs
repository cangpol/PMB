use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::pendaftaran::model::{BerkasPendaftar, Pendaftar},
};

#[derive(Clone)]
pub struct PendaftaranRepository {
    pool: PgPool,
}

impl PendaftaranRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Option<Pendaftar>, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    catatan_verifikator, created_at, updated_at
             FROM pendaftar WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Pendaftar>, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    catatan_verifikator, created_at, updated_at
             FROM pendaftar WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn get_next_sequence(&self) -> Result<i64, AppError> {
        let row: (i64,) = sqlx::query_as("SELECT COALESCE(COUNT(*), 0) + 1 FROM pendaftar")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    pub async fn upsert_biodata(
        &self,
        user_id: Uuid,
        nomor_pendaftaran: &str,
        jalur_id: Uuid,
        gelombang_id: Uuid,
        nik: &str,
        tempat_lahir: &str,
        tgl_lahir: chrono::NaiveDate,
        jenis_kelamin: &str,
        agama: &str,
        alamat_lengkap: &str,
        nama_ortu: &str,
        no_hp_ortu: &str,
    ) -> Result<Pendaftar, AppError> {
        // Dummy placeholder prodi for draft if not selected yet
        let default_prodi: (Uuid,) = sqlx::query_as("SELECT id FROM program_studi LIMIT 1")
            .fetch_one(&self.pool)
            .await?;

        let p = sqlx::query_as::<_, Pendaftar>(
            "INSERT INTO pendaftar (
                user_id, nomor_pendaftaran, jalur_id, gelombang_id,
                nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, status_pendaftaran
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Belum Diisi', 'Belum Diisi', 0.0, $13, 'DRAFT')
            ON CONFLICT (user_id) DO UPDATE SET
                jalur_id = EXCLUDED.jalur_id,
                gelombang_id = EXCLUDED.gelombang_id,
                nik = EXCLUDED.nik,
                tempat_lahir = EXCLUDED.tempat_lahir,
                tgl_lahir = EXCLUDED.tgl_lahir,
                jenis_kelamin = EXCLUDED.jenis_kelamin,
                agama = EXCLUDED.agama,
                alamat_lengkap = EXCLUDED.alamat_lengkap,
                nama_ortu = EXCLUDED.nama_ortu,
                no_hp_ortu = EXCLUDED.no_hp_ortu,
                updated_at = NOW()
            RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                      nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                      asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                      catatan_verifikator, created_at, updated_at"
        )
        .bind(user_id)
        .bind(nomor_pendaftaran)
        .bind(jalur_id)
        .bind(gelombang_id)
        .bind(nik)
        .bind(tempat_lahir)
        .bind(tgl_lahir)
        .bind(jenis_kelamin)
        .bind(agama)
        .bind(alamat_lengkap)
        .bind(nama_ortu)
        .bind(no_hp_ortu)
        .bind(default_prodi.0)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn update_akademik(
        &self,
        pendaftar_id: Uuid,
        asal_sekolah: &str,
        jurusan_sekolah: &str,
        nilai_rapor_avg: f64,
        prodi_1: Uuid,
        prodi_2: Option<Uuid>,
    ) -> Result<Pendaftar, AppError> {
        let p = sqlx::query_as::<_, Pendaftar>(
            "UPDATE pendaftar
             SET asal_sekolah = $1,
                 jurusan_sekolah = $2,
                 nilai_rapor_avg = $3,
                 prodi_pilihan_1 = $4,
                 prodi_pilihan_2 = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                       nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                       asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                       catatan_verifikator, created_at, updated_at"
        )
        .bind(asal_sekolah)
        .bind(jurusan_sekolah)
        .bind(nilai_rapor_avg)
        .bind(prodi_1)
        .bind(prodi_2)
        .bind(pendaftar_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn save_berkas(
        &self,
        pendaftar_id: Uuid,
        jenis_berkas: &str,
        file_key: &str,
        file_name: &str,
        mime_type: &str,
        file_size_bytes: i64,
    ) -> Result<BerkasPendaftar, AppError> {
        let b = sqlx::query_as::<_, BerkasPendaftar>(
            "INSERT INTO berkas_pendaftar (
                pendaftar_id, jenis_berkas, file_key, file_name, mime_type, file_size_bytes, status_verifikasi
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
            RETURNING id, pendaftar_id, jenis_berkas, file_key, file_name, mime_type, file_size_bytes,
                      status_verifikasi, catatan, uploaded_at, verified_at"
        )
        .bind(pendaftar_id)
        .bind(jenis_berkas)
        .bind(file_key)
        .bind(file_name)
        .bind(mime_type)
        .bind(file_size_bytes)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    pub async fn get_berkas_by_pendaftar(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<BerkasPendaftar>, AppError> {
        let list = sqlx::query_as::<_, BerkasPendaftar>(
            "SELECT id, pendaftar_id, jenis_berkas, file_key, file_name, mime_type, file_size_bytes,
                    status_verifikasi, catatan, uploaded_at, verified_at
             FROM berkas_pendaftar WHERE pendaftar_id = $1 ORDER BY uploaded_at DESC"
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    pub async fn finalisasi(&self, pendaftar_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE pendaftar SET status_pendaftaran = 'SUBMITTED', updated_at = NOW() WHERE id = $1"
        )
        .bind(pendaftar_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_verifikasi_berkas(
        &self,
        berkas_id: Uuid,
        status: &str,
        catatan: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE berkas_pendaftar
             SET status_verifikasi = $1, catatan = $2, verified_at = NOW()
             WHERE id = $3",
        )
        .bind(status)
        .bind(catatan)
        .bind(berkas_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_all_pendaftar(&self) -> Result<Vec<Pendaftar>, AppError> {
        let list = sqlx::query_as::<_, Pendaftar>(
            "SELECT id, user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran,
                    nik, tempat_lahir, tgl_lahir, jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu,
                    asal_sekolah, jurusan_sekolah, nilai_rapor_avg, prodi_pilihan_1, prodi_pilihan_2,
                    catatan_verifikator, created_at, updated_at
             FROM pendaftar ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }
}
