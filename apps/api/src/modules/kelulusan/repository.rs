use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::kelulusan::{
        dto::{DrafKelulusanItemDto, EksporSiakadItemDto, MahasiswaDaftarUlangDto},
        model::{
            AuditKelulusan, BerkasDaftarUlang, HasilKelulusan, RumusPenilaianJalur, SidangKelulusan,
        },
    },
};

#[derive(Clone, Debug)]
pub struct CandidateToRank {
    pub pendaftar_id: Uuid,
    pub user_id: Uuid,
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_id: Uuid,
    pub jalur_nama: String,
    pub gelombang_id: Uuid,
    pub prodi_pilihan_1_id: Uuid,
    pub prodi_pilihan_1_nama: String,
    pub prodi_pilihan_2_id: Option<Uuid>,
    pub prodi_pilihan_2_nama: Option<String>,
    pub nilai_rapor_avg: f64,
    pub skor_cbt: f64,
    pub nilai_prestasi: f64,
    pub nilai_wawancara: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug)]
pub struct ProdiQuotaInfo {
    pub id: Uuid,
    pub nama: String,
    pub kode: String,
    pub jenjang: String,
    pub kuota: i32,
    pub passing_grade: f64,
    pub fakultas: String,
}

#[derive(Clone)]
pub struct KelulusanRepository {
    pool: PgPool,
}

impl KelulusanRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // =========================================================================
    // 1. RUMUS PENILAIAN PER JALUR
    // =========================================================================

    pub async fn get_rumus_by_jalur(
        &self,
        jalur_id: Uuid,
    ) -> Result<Option<RumusPenilaianJalur>, AppError> {
        let r = sqlx::query_as::<_, RumusPenilaianJalur>(
            "SELECT id, jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara,
                    default_passing_score, keterangan, created_at, updated_at
             FROM rumus_penilaian_jalur WHERE jalur_id = $1",
        )
        .bind(jalur_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(r)
    }

    pub async fn list_all_rumus(&self) -> Result<Vec<RumusPenilaianJalur>, AppError> {
        let list = sqlx::query_as::<_, RumusPenilaianJalur>(
            "SELECT id, jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara,
                    default_passing_score, keterangan, created_at, updated_at
             FROM rumus_penilaian_jalur ORDER BY created_at ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn upsert_rumus(
        &self,
        jalur_id: Uuid,
        bobot_cbt: f64,
        bobot_rapor: f64,
        bobot_prestasi: f64,
        bobot_wawancara: f64,
        default_passing_score: f64,
        keterangan: Option<&str>,
    ) -> Result<RumusPenilaianJalur, AppError> {
        let r = sqlx::query_as::<_, RumusPenilaianJalur>(
            "INSERT INTO rumus_penilaian_jalur (
                jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara,
                default_passing_score, keterangan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (jalur_id) DO UPDATE SET
                bobot_cbt = EXCLUDED.bobot_cbt,
                bobot_rapor = EXCLUDED.bobot_rapor,
                bobot_prestasi = EXCLUDED.bobot_prestasi,
                bobot_wawancara = EXCLUDED.bobot_wawancara,
                default_passing_score = EXCLUDED.default_passing_score,
                keterangan = EXCLUDED.keterangan,
                updated_at = NOW()
            RETURNING id, jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara,
                      default_passing_score, keterangan, created_at, updated_at",
        )
        .bind(jalur_id)
        .bind(bobot_cbt)
        .bind(bobot_rapor)
        .bind(bobot_prestasi)
        .bind(bobot_wawancara)
        .bind(default_passing_score)
        .bind(keterangan)
        .fetch_one(&self.pool)
        .await?;

        Ok(r)
    }

    // =========================================================================
    // 2. SIDANG KELULUSAN (APPROVAL WORKFLOW)
    // =========================================================================

    pub async fn create_sidang(
        &self,
        gelombang_id: Option<Uuid>,
        nama_sidang: &str,
        nomor_sk: Option<&str>,
        tgl_pengumuman: DateTime<Utc>,
    ) -> Result<SidangKelulusan, AppError> {
        let s = sqlx::query_as::<_, SidangKelulusan>(
            "INSERT INTO sidang_kelulusan (
                gelombang_id, nama_sidang, nomor_sk, tgl_pengumuman, status_sidang
            ) VALUES ($1, $2, $3, $4, 'DRAFT')
            RETURNING id, gelombang_id, nama_sidang, nomor_sk, tanggal_sidang,
                      tgl_pengumuman, status_sidang, total_peserta, total_lulus,
                      total_cadangan, total_tidak_lulus, approved_by, approved_at,
                      catatan_sidang, created_at, updated_at",
        )
        .bind(gelombang_id)
        .bind(nama_sidang)
        .bind(nomor_sk)
        .bind(tgl_pengumuman)
        .fetch_one(&self.pool)
        .await?;

        Ok(s)
    }

    pub async fn find_sidang_by_id(&self, id: Uuid) -> Result<Option<SidangKelulusan>, AppError> {
        let s = sqlx::query_as::<_, SidangKelulusan>(
            "SELECT id, gelombang_id, nama_sidang, nomor_sk, tanggal_sidang,
                    tgl_pengumuman, status_sidang, total_peserta, total_lulus,
                    total_cadangan, total_tidak_lulus, approved_by, approved_at,
                    catatan_sidang, created_at, updated_at
             FROM sidang_kelulusan WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(s)
    }

    pub async fn find_latest_sidang(&self) -> Result<Option<SidangKelulusan>, AppError> {
        let s = sqlx::query_as::<_, SidangKelulusan>(
            "SELECT id, gelombang_id, nama_sidang, nomor_sk, tanggal_sidang,
                    tgl_pengumuman, status_sidang, total_peserta, total_lulus,
                    total_cadangan, total_tidak_lulus, approved_by, approved_at,
                    catatan_sidang, created_at, updated_at
             FROM sidang_kelulusan ORDER BY created_at DESC LIMIT 1",
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(s)
    }

    pub async fn list_sidang(&self) -> Result<Vec<SidangKelulusan>, AppError> {
        let list = sqlx::query_as::<_, SidangKelulusan>(
            "SELECT id, gelombang_id, nama_sidang, nomor_sk, tanggal_sidang,
                    tgl_pengumuman, status_sidang, total_peserta, total_lulus,
                    total_cadangan, total_tidak_lulus, approved_by, approved_at,
                    catatan_sidang, created_at, updated_at
             FROM sidang_kelulusan ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn update_sidang_status(
        &self,
        id: Uuid,
        status: &str,
        approved_by: Option<Uuid>,
        approved_at: Option<DateTime<Utc>>,
        catatan: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE sidang_kelulusan
             SET status_sidang = $1, approved_by = $2, approved_at = $3, catatan_sidang = $4, updated_at = NOW()
             WHERE id = $5",
        )
        .bind(status)
        .bind(approved_by)
        .bind(approved_at)
        .bind(catatan)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn update_sidang_counts(
        &self,
        id: Uuid,
        total_peserta: i32,
        total_lulus: i32,
        total_cadangan: i32,
        total_tidak_lulus: i32,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE sidang_kelulusan
             SET total_peserta = $1, total_lulus = $2, total_cadangan = $3, total_tidak_lulus = $4, updated_at = NOW()
             WHERE id = $5",
        )
        .bind(total_peserta)
        .bind(total_lulus)
        .bind(total_cadangan)
        .bind(total_tidak_lulus)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // =========================================================================
    // 3. CANDIDATES FETCHING & PRODI QUOTAS
    // =========================================================================

    pub async fn get_prodi_quotas(&self) -> Result<Vec<ProdiQuotaInfo>, AppError> {
        let rows = sqlx::query(
            "SELECT id, nama_prodi as nama, kode_prodi as kode, jenjang, kuota, passing_grade, fakultas
             FROM program_studi WHERE is_active = TRUE ORDER BY kode_prodi ASC",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for r in rows {
            list.push(ProdiQuotaInfo {
                id: r.get("id"),
                nama: r.get("nama"),
                kode: r.get("kode"),
                jenjang: r.get("jenjang"),
                kuota: r.get("kuota"),
                passing_grade: r.get("passing_grade"),
                fakultas: r.get("fakultas"),
            });
        }
        Ok(list)
    }

    pub async fn fetch_candidates_to_rank(
        &self,
        gelombang_id: Option<Uuid>,
    ) -> Result<Vec<CandidateToRank>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                p.id as pendaftar_id,
                p.user_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                p.jalur_id,
                j.nama as jalur_nama,
                p.gelombang_id,
                p.prodi_pilihan_1 as prodi_pilihan_1_id,
                pr1.nama_prodi as prodi_pilihan_1_nama,
                p.prodi_pilihan_2 as prodi_pilihan_2_id,
                pr2.nama_prodi as prodi_pilihan_2_nama,
                COALESCE(p.nilai_rapor_avg, 0.0) as nilai_rapor_avg,
                COALESCE(hu.nilai_akhir, 0.0) as skor_cbt,
                COALESCE((p.data_formulir->>'nilai_prestasi')::double precision, 0.0) as nilai_prestasi,
                COALESCE((p.data_formulir->>'nilai_wawancara')::double precision, 0.0) as nilai_wawancara,
                p.created_at
             FROM pendaftar p
             JOIN users u ON u.id = p.user_id
             JOIN jalur_masuk j ON j.id = p.jalur_id
             JOIN program_studi pr1 ON pr1.id = p.prodi_pilihan_1
             LEFT JOIN program_studi pr2 ON pr2.id = p.prodi_pilihan_2
             LEFT JOIN LATERAL (
                 SELECT nilai_akhir FROM hasil_ujian 
                 WHERE pendaftar_id = p.id 
                 ORDER BY waktu_submit DESC LIMIT 1
             ) hu ON TRUE
             WHERE p.status_pendaftaran != 'DRAFT'
               AND ($1::uuid IS NULL OR p.gelombang_id = $1)
             ORDER BY p.created_at ASC",
        )
        .bind(gelombang_id)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for r in rows {
            result.push(CandidateToRank {
                pendaftar_id: r.get("pendaftar_id"),
                user_id: r.get("user_id"),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                jalur_id: r.get("jalur_id"),
                jalur_nama: r.get("jalur_nama"),
                gelombang_id: r.get("gelombang_id"),
                prodi_pilihan_1_id: r.get("prodi_pilihan_1_id"),
                prodi_pilihan_1_nama: r.get("prodi_pilihan_1_nama"),
                prodi_pilihan_2_id: r.get("prodi_pilihan_2_id"),
                prodi_pilihan_2_nama: r.get("prodi_pilihan_2_nama"),
                nilai_rapor_avg: r.get("nilai_rapor_avg"),
                skor_cbt: r.get("skor_cbt"),
                nilai_prestasi: r.get("nilai_prestasi"),
                nilai_wawancara: r.get("nilai_wawancara"),
                created_at: r.get("created_at"),
            });
        }

        Ok(result)
    }

    // =========================================================================
    // 4. HASIL KELULUSAN CRUD & DRAF
    // =========================================================================

    pub async fn save_hasil_kelulusan_item(
        &self,
        pendaftar_id: Uuid,
        sidang_id: Option<Uuid>,
        status_kelulusan: &str,
        prodi_diterima_id: Option<Uuid>,
        pilihan_ke: Option<i32>,
        ranking: i32,
        skor_cbt: f64,
        nilai_rapor: f64,
        nilai_prestasi: f64,
        skor_akhir: f64,
        nomor_loa: Option<&str>,
        tanggal_sk: Option<NaiveDate>,
        is_published: bool,
    ) -> Result<HasilKelulusan, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "INSERT INTO hasil_kelulusan (
                pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                nomor_surat_loa, tanggal_sk, is_published, status_daftar_ulang
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'BELUM_DAFTAR_ULANG')
            ON CONFLICT (pendaftar_id) DO UPDATE SET
                sidang_id = EXCLUDED.sidang_id,
                status_kelulusan = EXCLUDED.status_kelulusan,
                prodi_diterima_id = EXCLUDED.prodi_diterima_id,
                pilihan_ke = EXCLUDED.pilihan_ke,
                ranking = EXCLUDED.ranking,
                skor_cbt = EXCLUDED.skor_cbt,
                nilai_rapor = EXCLUDED.nilai_rapor,
                nilai_prestasi = EXCLUDED.nilai_prestasi,
                skor_akhir = EXCLUDED.skor_akhir,
                nomor_surat_loa = EXCLUDED.nomor_surat_loa,
                tanggal_sk = EXCLUDED.tanggal_sk,
                is_published = EXCLUDED.is_published,
                updated_at = NOW()
            RETURNING id, pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                      ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                      nim_resmi, nomor_surat_loa, tanggal_sk, is_published, catatan_sidang,
                      status_daftar_ulang, created_at, updated_at",
        )
        .bind(pendaftar_id)
        .bind(sidang_id)
        .bind(status_kelulusan)
        .bind(prodi_diterima_id)
        .bind(pilihan_ke)
        .bind(ranking)
        .bind(skor_cbt)
        .bind(nilai_rapor)
        .bind(nilai_prestasi)
        .bind(skor_akhir)
        .bind(nomor_loa)
        .bind(tanggal_sk)
        .bind(is_published)
        .fetch_one(&self.pool)
        .await?;

        Ok(h)
    }

    pub async fn find_by_pendaftar_id(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<HasilKelulusan>, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "SELECT id, pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                    ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                    nim_resmi, nomor_surat_loa, tanggal_sk, is_published, catatan_sidang,
                    status_daftar_ulang, created_at, updated_at
             FROM hasil_kelulusan WHERE pendaftar_id = $1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(h)
    }

    pub async fn list_draf_items_by_sidang(
        &self,
        sidang_id: Uuid,
    ) -> Result<Vec<DrafKelulusanItemDto>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                h.pendaftar_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                p.jalur_id,
                j.nama as jalur_nama,
                p.prodi_pilihan_1 as prodi_pilihan_1_id,
                pr1.nama_prodi as prodi_pilihan_1_nama,
                p.prodi_pilihan_2 as prodi_pilihan_2_id,
                pr2.nama_prodi as prodi_pilihan_2_nama,
                COALESCE(h.skor_cbt, 0.0) as skor_cbt,
                COALESCE(h.nilai_rapor, 0.0) as nilai_rapor,
                COALESCE(h.nilai_prestasi, 0.0) as nilai_prestasi,
                h.skor_akhir,
                COALESCE(h.ranking, 0) as ranking,
                h.status_kelulusan,
                h.prodi_diterima_id,
                prd.nama_prodi as prodi_diterima_nama,
                h.pilihan_ke,
                h.catatan_sidang as catatan
             FROM hasil_kelulusan h
             JOIN pendaftar p ON p.id = h.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN jalur_masuk j ON j.id = p.jalur_id
             JOIN program_studi pr1 ON pr1.id = p.prodi_pilihan_1
             LEFT JOIN program_studi pr2 ON pr2.id = p.prodi_pilihan_2
             LEFT JOIN program_studi prd ON prd.id = h.prodi_diterima_id
             WHERE h.sidang_id = $1
             ORDER BY h.ranking ASC, h.skor_akhir DESC",
        )
        .bind(sidang_id)
        .fetch_all(&self.pool)
        .await?;

        let mut items = Vec::new();
        for r in rows {
            items.push(DrafKelulusanItemDto {
                pendaftar_id: r.get("pendaftar_id"),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                jalur_id: r.get("jalur_id"),
                jalur_nama: r.get("jalur_nama"),
                prodi_pilihan_1_id: r.get("prodi_pilihan_1_id"),
                prodi_pilihan_1_nama: r.get("prodi_pilihan_1_nama"),
                prodi_pilihan_2_id: r.get("prodi_pilihan_2_id"),
                prodi_pilihan_2_nama: r.get("prodi_pilihan_2_nama"),
                skor_cbt: r.get("skor_cbt"),
                nilai_rapor: r.get("nilai_rapor"),
                nilai_prestasi: r.get("nilai_prestasi"),
                skor_akhir: r.get("skor_akhir"),
                ranking: r.get("ranking"),
                status_kelulusan: r.get("status_kelulusan"),
                prodi_diterima_id: r.get("prodi_diterima_id"),
                prodi_diterima_nama: r.get("prodi_diterima_nama"),
                pilihan_ke: r.get("pilihan_ke"),
                catatan: r.get("catatan"),
            });
        }

        Ok(items)
    }

    pub async fn update_kandidat_status(
        &self,
        pendaftar_id: Uuid,
        status_baru: &str,
        prodi_id: Option<Uuid>,
        catatan: Option<&str>,
    ) -> Result<HasilKelulusan, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "UPDATE hasil_kelulusan
             SET status_kelulusan = $1, prodi_diterima_id = $2, catatan_sidang = $3, updated_at = NOW()
             WHERE pendaftar_id = $4
             RETURNING id, pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                       ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                       nim_resmi, nomor_surat_loa, tanggal_sk, is_published, catatan_sidang,
                       status_daftar_ulang, created_at, updated_at",
        )
        .bind(status_baru)
        .bind(prodi_id)
        .bind(catatan)
        .bind(pendaftar_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(h)
    }

    pub async fn publish_sidang_results(&self, sidang_id: Uuid) -> Result<i64, AppError> {
        let res = sqlx::query(
            "UPDATE hasil_kelulusan
             SET is_published = TRUE, updated_at = NOW()
             WHERE sidang_id = $1",
        )
        .bind(sidang_id)
        .execute(&self.pool)
        .await?;

        Ok(res.rows_affected() as i64)
    }

    // =========================================================================
    // 5. AUDIT LOG KEPUTUSAN KELULUSAN
    // =========================================================================

    pub async fn insert_audit_log(
        &self,
        pendaftar_id: Uuid,
        sidang_id: Option<Uuid>,
        status_lama: Option<&str>,
        status_baru: &str,
        prodi_lama_id: Option<Uuid>,
        prodi_baru_id: Option<Uuid>,
        actor_id: Option<Uuid>,
        actor_name: &str,
        catatan: Option<&str>,
    ) -> Result<AuditKelulusan, AppError> {
        let a = sqlx::query_as::<_, AuditKelulusan>(
            "INSERT INTO audit_kelulusan (
                pendaftar_id, sidang_id, status_lama, status_baru,
                prodi_lama_id, prodi_baru_id, actor_id, actor_name, catatan
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, pendaftar_id, sidang_id, status_lama, status_baru,
                      prodi_lama_id, prodi_baru_id, actor_id, actor_name, catatan, created_at",
        )
        .bind(pendaftar_id)
        .bind(sidang_id)
        .bind(status_lama)
        .bind(status_baru)
        .bind(prodi_lama_id)
        .bind(prodi_baru_id)
        .bind(actor_id)
        .bind(actor_name)
        .bind(catatan)
        .fetch_one(&self.pool)
        .await?;

        Ok(a)
    }

    pub async fn list_audit_by_sidang(
        &self,
        sidang_id: Uuid,
    ) -> Result<Vec<AuditKelulusan>, AppError> {
        let list = sqlx::query_as::<_, AuditKelulusan>(
            "SELECT id, pendaftar_id, sidang_id, status_lama, status_baru,
                    prodi_lama_id, prodi_baru_id, actor_id, actor_name, catatan, created_at
             FROM audit_kelulusan WHERE sidang_id = $1 ORDER BY created_at DESC",
        )
        .bind(sidang_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    // =========================================================================
    // 6. ATOMIC NIM COUNTER (ROW-LEVEL LOCK CONCURRENCY SAFE)
    // =========================================================================

    pub async fn get_next_nim_counter(&self, tahun: i32, prodi_id: Uuid) -> Result<i32, AppError> {
        let row: (i32,) = sqlx::query_as(
            "INSERT INTO nim_counter (tahun, prodi_id, last_number, updated_at)
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT (tahun, prodi_id) DO UPDATE
             SET last_number = nim_counter.last_number + 1,
                 updated_at = NOW()
             RETURNING last_number",
        )
        .bind(tahun)
        .bind(prodi_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0)
    }

    pub async fn update_nim_resmi(
        &self,
        pendaftar_id: Uuid,
        nim_resmi: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE hasil_kelulusan
             SET nim_resmi = $1, status_daftar_ulang = 'TERDAFTAR_SEBAGAI_MAHASISWA', updated_at = NOW()
             WHERE pendaftar_id = $2",
        )
        .bind(nim_resmi)
        .bind(pendaftar_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // =========================================================================
    // 7. BERKAS DAFTAR ULANG
    // =========================================================================

    pub async fn insert_berkas_daftar_ulang(
        &self,
        pendaftar_id: Uuid,
        jenis_berkas: &str,
        file_key: &str,
        file_name: &str,
        mime_type: &str,
        file_size_bytes: i64,
    ) -> Result<BerkasDaftarUlang, AppError> {
        let b = sqlx::query_as::<_, BerkasDaftarUlang>(
            "INSERT INTO berkas_daftar_ulang (
                pendaftar_id, jenis_berkas, file_key, file_name, mime_type, file_size_bytes, status_verifikasi
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
            RETURNING id, pendaftar_id, jenis_berkas, file_key, file_name, mime_type,
                      file_size_bytes, status_verifikasi, catatan, uploaded_at, verified_by, verified_at",
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

    pub async fn list_berkas_daftar_ulang(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Vec<BerkasDaftarUlang>, AppError> {
        let list = sqlx::query_as::<_, BerkasDaftarUlang>(
            "SELECT id, pendaftar_id, jenis_berkas, file_key, file_name, mime_type,
                    file_size_bytes, status_verifikasi, catatan, uploaded_at, verified_by, verified_at
             FROM berkas_daftar_ulang WHERE pendaftar_id = $1 ORDER BY uploaded_at ASC",
        )
        .bind(pendaftar_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn verifikasi_berkas_daftar_ulang(
        &self,
        berkas_id: Uuid,
        status: &str,
        catatan: Option<&str>,
        verified_by: Uuid,
    ) -> Result<BerkasDaftarUlang, AppError> {
        let b = sqlx::query_as::<_, BerkasDaftarUlang>(
            "UPDATE berkas_daftar_ulang
             SET status_verifikasi = $1, catatan = $2, verified_by = $3, verified_at = NOW()
             WHERE id = $4
             RETURNING id, pendaftar_id, jenis_berkas, file_key, file_name, mime_type,
                       file_size_bytes, status_verifikasi, catatan, uploaded_at, verified_by, verified_at",
        )
        .bind(status)
        .bind(catatan)
        .bind(verified_by)
        .bind(berkas_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(b)
    }

    pub async fn update_status_daftar_ulang(
        &self,
        pendaftar_id: Uuid,
        status: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE hasil_kelulusan
             SET status_daftar_ulang = $1, updated_at = NOW()
             WHERE pendaftar_id = $2",
        )
        .bind(status)
        .bind(pendaftar_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn list_daftar_ulang_admin(&self) -> Result<Vec<MahasiswaDaftarUlangDto>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                p.id as pendaftar_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                COALESCE(prd.nama_prodi, '-') as prodi_diterima,
                COALESCE(prd.jenjang, '-') as jenjang,
                h.status_kelulusan,
                h.status_daftar_ulang,
                h.nim_resmi,
                h.nomor_surat_loa,
                COALESCE(t.status, 'BELUM_TERBIT') as status_ukt,
                COALESCE(SUM(CASE WHEN b.status_verifikasi = 'VALID' THEN 1 ELSE 0 END), 0)::int8 as total_berkas_valid,
                COALESCE(SUM(CASE WHEN b.status_verifikasi = 'PENDING' THEN 1 ELSE 0 END), 0)::int8 as total_berkas_pending
            FROM hasil_kelulusan h
            JOIN pendaftar p ON p.id = h.pendaftar_id
            JOIN users u ON u.id = p.user_id
            LEFT JOIN program_studi prd ON prd.id = h.prodi_diterima_id
            LEFT JOIN LATERAL (
                SELECT status FROM tagihan 
                WHERE pendaftar_id = p.id AND jenis_tagihan = 'DAFTAR_ULANG_UKT'
                ORDER BY tgl_terbit DESC LIMIT 1
            ) t ON true
            LEFT JOIN berkas_daftar_ulang b ON b.pendaftar_id = p.id
            WHERE h.status_kelulusan IN ('LULUS_PILIHAN_1', 'LULUS_PILIHAN_2')
            GROUP BY p.id, p.nomor_pendaftaran, u.nama_lengkap, prd.nama_prodi, prd.jenjang,
                     h.status_kelulusan, h.status_daftar_ulang, h.nim_resmi, h.nomor_surat_loa, t.status, h.updated_at
            ORDER BY h.updated_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for r in rows {
            list.push(MahasiswaDaftarUlangDto {
                pendaftar_id: r.get("pendaftar_id"),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                prodi_diterima: r.get("prodi_diterima"),
                jenjang: r.get("jenjang"),
                status_kelulusan: r.get("status_kelulusan"),
                status_daftar_ulang: r.get("status_daftar_ulang"),
                nim_resmi: r.get("nim_resmi"),
                nomor_loa: r.get("nomor_surat_loa"),
                status_ukt: r.get("status_ukt"),
                total_berkas_valid: r.get("total_berkas_valid"),
                total_berkas_pending: r.get("total_berkas_pending"),
            });
        }

        Ok(list)
    }

    // =========================================================================
    // 8. EKSPOR SIAKAD & QUERY PENDAFTAR LENGKAP
    // =========================================================================

    pub async fn get_data_ekspor_siakad(
        &self,
        sidang_id: Option<Uuid>,
    ) -> Result<Vec<EksporSiakadItemDto>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                h.nim_resmi,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                p.nik,
                p.tempat_lahir,
                p.tgl_lahir::text as tgl_lahir,
                p.jenis_kelamin,
                p.agama,
                p.alamat_lengkap as alamat,
                u.no_hp,
                u.email,
                COALESCE(p.nama_ortu, '-') as nama_ibu_kandung,
                COALESCE(p.data_formulir->>'nama_ayah', '-') as nama_ayah,
                prd.kode_prodi as kode_prodi,
                prd.nama_prodi as nama_prodi,
                prd.jenjang,
                j.nama as jalur_masuk,
                '2026' as tahun_masuk,
                h.skor_akhir,
                h.updated_at::text as tanggal_daftar_ulang
             FROM hasil_kelulusan h
             JOIN pendaftar p ON p.id = h.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN program_studi prd ON prd.id = h.prodi_diterima_id
             JOIN jalur_masuk j ON j.id = p.jalur_id
             WHERE h.status_kelulusan IN ('LULUS_PILIHAN_1', 'LULUS_PILIHAN_2')
               AND ($1::uuid IS NULL OR h.sidang_id = $1)
             ORDER BY h.nim_resmi ASC NULLS LAST, h.skor_akhir DESC",
        )
        .bind(sidang_id)
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for (i, r) in rows.into_iter().enumerate() {
            list.push(EksporSiakadItemDto {
                no: (i + 1) as i32,
                nim: r
                    .get::<Option<String>, _>("nim_resmi")
                    .unwrap_or_else(|| "-".to_string()),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                nik: r.get("nik"),
                tempat_lahir: r.get("tempat_lahir"),
                tgl_lahir: r.get("tgl_lahir"),
                jenis_kelamin: r.get("jenis_kelamin"),
                agama: r.get("agama"),
                alamat: r.get("alamat"),
                no_hp: r.get("no_hp"),
                email: r.get("email"),
                nama_ibu_kandung: r.get("nama_ibu_kandung"),
                nama_ayah: r.get("nama_ayah"),
                kode_prodi: r.get("kode_prodi"),
                nama_prodi: r.get("nama_prodi"),
                jenjang: r.get("jenjang"),
                jalur_masuk: r.get("jalur_masuk"),
                tahun_masuk: r.get("tahun_masuk"),
                skor_akhir: r.get("skor_akhir"),
                tanggal_daftar_ulang: Some(r.get("tanggal_daftar_ulang")),
            });
        }

        Ok(list)
    }

    // Backwards compatibility methods
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
        tanggal_sk: Option<NaiveDate>,
    ) -> Result<HasilKelulusan, AppError> {
        let h = sqlx::query_as::<_, HasilKelulusan>(
            "INSERT INTO hasil_kelulusan (
                pendaftar_id, status_kelulusan, prodi_diterima_id, skor_akhir,
                nim_resmi, nomor_surat_loa, tanggal_sk, is_published, status_daftar_ulang
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'BELUM_DAFTAR_ULANG')
            ON CONFLICT (pendaftar_id) DO UPDATE SET
                status_kelulusan = EXCLUDED.status_kelulusan,
                prodi_diterima_id = EXCLUDED.prodi_diterima_id,
                skor_akhir = EXCLUDED.skor_akhir,
                nim_resmi = EXCLUDED.nim_resmi,
                nomor_surat_loa = EXCLUDED.nomor_surat_loa,
                tanggal_sk = EXCLUDED.tanggal_sk,
                is_published = TRUE,
                updated_at = NOW()
            RETURNING id, pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                      ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                      nim_resmi, nomor_surat_loa, tanggal_sk, is_published, catatan_sidang,
                      status_daftar_ulang, created_at, updated_at",
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
            "SELECT id, pendaftar_id, sidang_id, status_kelulusan, prodi_diterima_id, pilihan_ke,
                    ranking, skor_cbt, nilai_rapor, nilai_prestasi, skor_akhir,
                    nim_resmi, nomor_surat_loa, tanggal_sk, is_published, catatan_sidang,
                    status_daftar_ulang, created_at, updated_at
             FROM hasil_kelulusan ORDER BY skor_akhir DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_publik_by_nomor_pendaftaran(
        &self,
        nomor_pendaftaran: &str,
    ) -> Result<Option<PublikKelulusanRow>, AppError> {
        let clean_nomor = nomor_pendaftaran.trim();
        let row = sqlx::query(
            r#"
            SELECT 
                p.nomor_pendaftaran,
                u.nama_lengkap,
                j.nama_jalur,
                g.nama_gelombang,
                COALESCE(h.status_kelulusan, 'BELUM_DIPUTUSKAN') AS status_kelulusan,
                prd.nama_prodi,
                prd.jenjang,
                prd.fakultas,
                COALESCE(h.is_published, FALSE) AS is_published,
                s.tgl_pengumuman
            FROM pendaftar p
            JOIN users u ON u.id = p.user_id
            JOIN jalur_masuk j ON j.id = p.jalur_id
            JOIN gelombang g ON g.id = p.gelombang_id
            LEFT JOIN hasil_kelulusan h ON h.pendaftar_id = p.id
            LEFT JOIN sidang_kelulusan s ON s.id = h.sidang_id
            LEFT JOIN program_studi prd ON prd.id = h.prodi_diterima_id
            WHERE LOWER(p.nomor_pendaftaran) = LOWER($1)
            "#,
        )
        .bind(clean_nomor)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            Ok(Some(PublikKelulusanRow {
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                jalur_nama: r.get("nama_jalur"),
                gelombang_nama: r.get("nama_gelombang"),
                status_kelulusan: r.get("status_kelulusan"),
                nama_prodi: r.get("nama_prodi"),
                jenjang: r.get("jenjang"),
                fakultas: r.get("fakultas"),
                is_published: r.get("is_published"),
                tgl_pengumuman: r.get("tgl_pengumuman"),
            }))
        } else {
            Ok(None)
        }
    }
}

#[derive(Debug, Clone)]
pub struct PublikKelulusanRow {
    pub nomor_pendaftaran: String,
    pub nama_lengkap: String,
    pub jalur_nama: String,
    pub gelombang_nama: String,
    pub status_kelulusan: String,
    pub nama_prodi: Option<String>,
    pub jenjang: Option<String>,
    pub fakultas: Option<String>,
    pub is_published: bool,
    pub tgl_pengumuman: Option<DateTime<Utc>>,
}
