use chrono::Utc;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::rpl::{
        dto::{
            CreateMataKuliahRequest, LaporanRplItemCourse, LaporanRplResponse,
            MatakuliahDiajukanInput, RplItemRekapDto, RplPermohonanDetailResponse,
            UpdateMataKuliahRequest,
        },
        model::{
            BerkasRplItem, MataKuliah, PengalamanKerjaItem, RiwayatPendidikanItem,
            RplMataKuliahDiajukanDetail, RplPermohonan,
        },
    },
};

#[derive(Clone)]
pub struct RplRepository {
    pool: PgPool,
}

impl RplRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // =========================================================================
    // 1. MASTER MATA KULIAH KURIKULUM
    // =========================================================================

    pub async fn create_mata_kuliah(
        &self,
        req: CreateMataKuliahRequest,
    ) -> Result<MataKuliah, AppError> {
        let mk = sqlx::query_as::<_, MataKuliah>(
            "INSERT INTO mata_kuliah (
                prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            RETURNING id, prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas, is_active, created_at, updated_at",
        )
        .bind(req.prodi_id)
        .bind(req.kode_mk)
        .bind(req.nama_mk)
        .bind(req.sks)
        .bind(req.semester)
        .bind(req.silabus_ringkas)
        .fetch_one(&self.pool)
        .await?;

        Ok(mk)
    }

    pub async fn update_mata_kuliah(
        &self,
        id: Uuid,
        req: UpdateMataKuliahRequest,
    ) -> Result<MataKuliah, AppError> {
        let mk = sqlx::query_as::<_, MataKuliah>(
            "UPDATE mata_kuliah
             SET nama_mk = $1, sks = $2, semester = $3, silabus_ringkas = $4, is_active = $5, updated_at = NOW()
             WHERE id = $6
             RETURNING id, prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas, is_active, created_at, updated_at",
        )
        .bind(req.nama_mk)
        .bind(req.sks)
        .bind(req.semester)
        .bind(req.silabus_ringkas)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(mk)
    }

    pub async fn list_mata_kuliah_by_prodi(
        &self,
        prodi_id: Uuid,
    ) -> Result<Vec<MataKuliah>, AppError> {
        let list = sqlx::query_as::<_, MataKuliah>(
            "SELECT id, prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas, is_active, created_at, updated_at
             FROM mata_kuliah
             WHERE prodi_id = $1 AND is_active = TRUE
             ORDER BY semester ASC, kode_mk ASC",
        )
        .bind(prodi_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    pub async fn list_all_mata_kuliah(&self) -> Result<Vec<MataKuliah>, AppError> {
        let list = sqlx::query_as::<_, MataKuliah>(
            "SELECT id, prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas, is_active, created_at, updated_at
             FROM mata_kuliah
             ORDER BY prodi_id ASC, semester ASC, kode_mk ASC",
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(list)
    }

    // =========================================================================
    // 2. PERMOHONAN RPL CALON MAHASISWA
    // =========================================================================

    pub async fn get_or_create_permohonan(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<RplPermohonan, AppError> {
        let existing = sqlx::query_as::<_, RplPermohonan>(
            "SELECT id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                    status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                    total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                    submitted_at, assessed_at, created_at, updated_at
             FROM rpl_permohonan WHERE pendaftar_id = $1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(p) = existing {
            return Ok(p);
        }

        let p = sqlx::query_as::<_, RplPermohonan>(
            "INSERT INTO rpl_permohonan (
                pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung, status
            ) VALUES ($1, 'TIPE_A', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'DRAFT')
            RETURNING id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                      status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                      total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                      submitted_at, assessed_at, created_at, updated_at",
        )
        .bind(pendaftar_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn get_permohonan_by_id(&self, id: Uuid) -> Result<Option<RplPermohonan>, AppError> {
        let p = sqlx::query_as::<_, RplPermohonan>(
            "SELECT id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                    status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                    total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                    submitted_at, assessed_at, created_at, updated_at
             FROM rpl_permohonan WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn get_permohonan_by_pendaftar_id(
        &self,
        pendaftar_id: Uuid,
    ) -> Result<Option<RplPermohonan>, AppError> {
        let p = sqlx::query_as::<_, RplPermohonan>(
            "SELECT id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                    status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                    total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                    submitted_at, assessed_at, created_at, updated_at
             FROM rpl_permohonan WHERE pendaftar_id = $1",
        )
        .bind(pendaftar_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn find_pendaftar_by_user_id(
        &self,
        user_id: Uuid,
    ) -> Result<Option<(Uuid, Uuid, Uuid, String)>, AppError> {
        let row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String)>(
            "SELECT id, jalur_id, prodi_pilihan_1, nomor_pendaftaran
             FROM pendaftar
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row)
    }

    pub async fn check_jalur_has_rpl_step(&self, jalur_id: Uuid) -> Result<bool, AppError> {
        let row = sqlx::query_as::<_, (i64,)>(
            // Jalur RPL dikenali dari tipe seleksinya, atau dari langkah RPL yang dikonfigurasi admin
            "SELECT (SELECT COUNT(*) FROM jalur_masuk WHERE id = $1 AND tipe_seleksi = 'RPL')
                  + (SELECT COUNT(*) FROM definisi_langkah WHERE jalur_id = $1 AND tipe_langkah = 'rpl')",
        )
        .bind(jalur_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0 > 0)
    }

    pub async fn get_permohonan_detail_response(
        &self,
        permohonan_id: Uuid,
    ) -> Result<Option<RplPermohonanDetailResponse>, AppError> {
        let row = sqlx::query(
            "SELECT 
                r.id,
                r.pendaftar_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                prd.id as prodi_id,
                prd.nama_prodi,
                prd.jenjang,
                r.tipe_rpl,
                r.status,
                r.riwayat_pendidikan,
                r.pengalaman_kerja,
                r.berkas_pendukung,
                r.total_sks_diajukan,
                r.total_sks_diakui,
                r.ipk_konversi::float8 as ipk_konversi,
                r.persentase_rekognisi::float8 as persentase_rekognisi,
                r.asesor_id,
                uas.nama_lengkap as asesor_nama,
                r.catatan_asesor,
                r.catatan_admin,
                r.submitted_at,
                r.assessed_at
             FROM rpl_permohonan r
             JOIN pendaftar p ON p.id = r.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN program_studi prd ON prd.id = p.prodi_pilihan_1
             LEFT JOIN users uas ON uas.id = r.asesor_id
             WHERE r.id = $1",
        )
        .bind(permohonan_id)
        .fetch_optional(&self.pool)
        .await?;

        let r = match row {
            Some(row) => row,
            None => return Ok(None),
        };

        let edu_val: serde_json::Value = r.get("riwayat_pendidikan");
        let riwayat_pendidikan: Vec<RiwayatPendidikanItem> =
            serde_json::from_value(edu_val).unwrap_or_default();

        let work_val: serde_json::Value = r.get("pengalaman_kerja");
        let pengalaman_kerja: Vec<PengalamanKerjaItem> =
            serde_json::from_value(work_val).unwrap_or_default();

        let doc_val: serde_json::Value = r.get("berkas_pendukung");
        let berkas_pendukung: Vec<BerkasRplItem> =
            serde_json::from_value(doc_val).unwrap_or_default();

        let mata_kuliah_list = self.list_mata_kuliah_diajukan_detail(permohonan_id).await?;

        Ok(Some(RplPermohonanDetailResponse {
            id: r.get("id"),
            pendaftar_id: r.get("pendaftar_id"),
            nomor_pendaftaran: r.get("nomor_pendaftaran"),
            nama_lengkap: r.get("nama_lengkap"),
            prodi_id: r.get("prodi_id"),
            prodi_nama: r.get("nama_prodi"),
            jenjang: r.get("jenjang"),
            tipe_rpl: r.get("tipe_rpl"),
            status: r.get("status"),
            riwayat_pendidikan,
            pengalaman_kerja,
            berkas_pendukung,
            mata_kuliah_list,
            total_sks_diajukan: r.get("total_sks_diajukan"),
            total_sks_diakui: r.get("total_sks_diakui"),
            ipk_konversi: r.get("ipk_konversi"),
            persentase_rekognisi: r.get("persentase_rekognisi"),
            asesor_id: r.get("asesor_id"),
            asesor_nama: r.get("asesor_nama"),
            catatan_asesor: r.get("catatan_asesor"),
            catatan_admin: r.get("catatan_admin"),
            submitted_at: r.get("submitted_at"),
            assessed_at: r.get("assessed_at"),
        }))
    }

    pub async fn upsert_rpl_step_state(
        &self,
        pendaftar_id: Uuid,
        jalur_id: Uuid,
        status: &str,
        data: &serde_json::Value,
    ) -> Result<(), AppError> {
        let langkah_row = sqlx::query_as::<_, (Uuid,)>(
            "SELECT id FROM definisi_langkah WHERE jalur_id = $1 AND tipe_langkah = 'rpl' LIMIT 1",
        )
        .bind(jalur_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some((langkah_id,)) = langkah_row {
            sqlx::query(
                "INSERT INTO state_langkah_pendaftar (pendaftar_id, langkah_id, status, data_tambahan, selesai_at)
                 VALUES ($1, $2, $3, $4, CASE WHEN $3 IN ('SELESAI', 'TERVERIFIKASI') THEN NOW() ELSE NULL END)
                 ON CONFLICT (pendaftar_id, langkah_id) DO UPDATE SET
                     status = EXCLUDED.status,
                     data_tambahan = EXCLUDED.data_tambahan,
                     selesai_at = CASE WHEN EXCLUDED.status IN ('SELESAI', 'TERVERIFIKASI') THEN NOW() ELSE state_langkah_pendaftar.selesai_at END,
                     updated_at = NOW()",
            )
            .bind(pendaftar_id)
            .bind(langkah_id)
            .bind(status)
            .bind(data)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub async fn update_permohonan_content(
        &self,
        id: Uuid,
        tipe_rpl: &str,
        riwayat_pendidikan: &[RiwayatPendidikanItem],
        pengalaman_kerja: &[PengalamanKerjaItem],
        berkas_pendukung: &[BerkasRplItem],
        status: &str,
        total_sks_diajukan: i32,
    ) -> Result<RplPermohonan, AppError> {
        let edu_json = serde_json::to_value(riwayat_pendidikan)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let work_json = serde_json::to_value(pengalaman_kerja)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let doc_json = serde_json::to_value(berkas_pendukung)
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let is_submitted = status == "DIAJUKAN";
        let submitted_at = if is_submitted { Some(Utc::now()) } else { None };

        let p = sqlx::query_as::<_, RplPermohonan>(
            "UPDATE rpl_permohonan
             SET tipe_rpl = $1, riwayat_pendidikan = $2, pengalaman_kerja = $3, berkas_pendukung = $4,
                 status = $5, total_sks_diajukan = $6,
                 submitted_at = COALESCE(submitted_at, $7), updated_at = NOW()
             WHERE id = $8
             RETURNING id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                       status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                       total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                       submitted_at, assessed_at, created_at, updated_at",
        )
        .bind(tipe_rpl)
        .bind(edu_json)
        .bind(work_json)
        .bind(doc_json)
        .bind(status)
        .bind(total_sks_diajukan)
        .bind(submitted_at)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn assign_asesor(
        &self,
        permohonan_id: Uuid,
        asesor_id: Uuid,
        assigned_by: Uuid,
        catatan_admin: Option<&str>,
    ) -> Result<RplPermohonan, AppError> {
        let p = sqlx::query_as::<_, RplPermohonan>(
            "UPDATE rpl_permohonan
             SET asesor_id = $1, assigned_by = $2, assigned_at = NOW(),
                 catatan_admin = $3,
                 status = CASE WHEN status = 'DIAJUKAN' THEN 'DALAM_PENILAIAN' ELSE status END,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                       status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                       total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                       submitted_at, assessed_at, created_at, updated_at",
        )
        .bind(asesor_id)
        .bind(assigned_by)
        .bind(catatan_admin)
        .bind(permohonan_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    pub async fn list_permohonan_admin(
        &self,
        prodi_id: Option<Uuid>,
        status: Option<&str>,
    ) -> Result<Vec<RplItemRekapDto>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                r.id,
                r.pendaftar_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                prd.nama_prodi,
                prd.jenjang,
                r.tipe_rpl,
                r.status,
                r.total_sks_diajukan,
                r.total_sks_diakui,
                r.ipk_konversi::float8 as ipk_konversi,
                r.persentase_rekognisi::float8 as persentase_rekognisi,
                r.asesor_id,
                uas.nama_lengkap as asesor_nama,
                r.submitted_at,
                r.assessed_at
             FROM rpl_permohonan r
             JOIN pendaftar p ON p.id = r.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN program_studi prd ON prd.id = p.prodi_pilihan_1
             LEFT JOIN users uas ON uas.id = r.asesor_id
             WHERE ($1::uuid IS NULL OR p.prodi_pilihan_1 = $1)
               AND ($2::text IS NULL OR r.status = $2)
             ORDER BY r.updated_at DESC",
        )
        .bind(prodi_id)
        .bind(status)
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for r in rows {
            list.push(RplItemRekapDto {
                id: r.get("id"),
                pendaftar_id: r.get("pendaftar_id"),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                prodi_nama: r.get("nama_prodi"),
                jenjang: r.get("jenjang"),
                tipe_rpl: r.get("tipe_rpl"),
                status: r.get("status"),
                total_sks_diajukan: r.get("total_sks_diajukan"),
                total_sks_diakui: r.get("total_sks_diakui"),
                ipk_konversi: r.get("ipk_konversi"),
                persentase_rekognisi: r.get("persentase_rekognisi"),
                asesor_id: r.get("asesor_id"),
                asesor_nama: r.get("asesor_nama"),
                submitted_at: r.get("submitted_at"),
                assessed_at: r.get("assessed_at"),
            });
        }

        Ok(list)
    }

    pub async fn list_permohonan_asesor(
        &self,
        asesor_id: Uuid,
        status: Option<&str>,
    ) -> Result<Vec<RplItemRekapDto>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                r.id,
                r.pendaftar_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                prd.nama_prodi,
                prd.jenjang,
                r.tipe_rpl,
                r.status,
                r.total_sks_diajukan,
                r.total_sks_diakui,
                r.ipk_konversi::float8 as ipk_konversi,
                r.persentase_rekognisi::float8 as persentase_rekognisi,
                r.asesor_id,
                uas.nama_lengkap as asesor_nama,
                r.submitted_at,
                r.assessed_at
             FROM rpl_permohonan r
             JOIN pendaftar p ON p.id = r.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN program_studi prd ON prd.id = p.prodi_pilihan_1
             JOIN users uas ON uas.id = r.asesor_id
             WHERE r.asesor_id = $1
               AND ($2::text IS NULL OR r.status = $2)
             ORDER BY r.updated_at DESC",
        )
        .bind(asesor_id)
        .bind(status)
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for r in rows {
            list.push(RplItemRekapDto {
                id: r.get("id"),
                pendaftar_id: r.get("pendaftar_id"),
                nomor_pendaftaran: r.get("nomor_pendaftaran"),
                nama_lengkap: r.get("nama_lengkap"),
                prodi_nama: r.get("nama_prodi"),
                jenjang: r.get("jenjang"),
                tipe_rpl: r.get("tipe_rpl"),
                status: r.get("status"),
                total_sks_diajukan: r.get("total_sks_diajukan"),
                total_sks_diakui: r.get("total_sks_diakui"),
                ipk_konversi: r.get("ipk_konversi"),
                persentase_rekognisi: r.get("persentase_rekognisi"),
                asesor_id: r.get("asesor_id"),
                asesor_nama: r.get("asesor_nama"),
                submitted_at: r.get("submitted_at"),
                assessed_at: r.get("assessed_at"),
            });
        }

        Ok(list)
    }

    // =========================================================================
    // 3. MATA KULIAH DIAJUKAN & PENILAIAN ASESOR
    // =========================================================================

    pub async fn replace_mata_kuliah_diajukan(
        &self,
        permohonan_id: Uuid,
        prodi_id: Uuid,
        items: &[MatakuliahDiajukanInput],
    ) -> Result<i32, AppError> {
        let mut tx = self.pool.begin().await?;

        // Deduplikasi mata_kuliah_id
        let mut seen = std::collections::HashSet::new();
        let mut unique_items = Vec::new();
        for item in items {
            if seen.insert(item.mata_kuliah_id) {
                unique_items.push(item);
            }
        }

        // Validasi bahwa setiap mata kuliah yang diajukan aktif dan milik program studi pilihan pendaftar
        for item in &unique_items {
            let row = sqlx::query_as::<_, (i32,)>(
                "SELECT sks FROM mata_kuliah WHERE id = $1 AND prodi_id = $2 AND is_active = TRUE",
            )
            .bind(item.mata_kuliah_id)
            .bind(prodi_id)
            .fetch_optional(&mut *tx)
            .await?;

            if row.is_none() {
                return Err(AppError::BadRequest(
                    "Satu atau lebih mata kuliah yang diajukan tidak valid, tidak aktif, atau tidak sesuai dengan kurikulum program studi pilihan Anda.".to_string(),
                ));
            }
        }

        sqlx::query("DELETE FROM rpl_mata_kuliah_diajukan WHERE permohonan_id = $1")
            .bind(permohonan_id)
            .execute(&mut *tx)
            .await?;

        let mut total_sks = 0;
        for item in &unique_items {
            let row = sqlx::query_as::<_, (i32,)>("SELECT sks FROM mata_kuliah WHERE id = $1")
                .bind(item.mata_kuliah_id)
                .fetch_one(&mut *tx)
                .await?;

            total_sks += row.0;
            sqlx::query(
                "INSERT INTO rpl_mata_kuliah_diajukan (
                    permohonan_id, mata_kuliah_id, keterangan_pemohon, status_kelayakan
                ) VALUES ($1, $2, $3, 'MENUNGGU')",
            )
            .bind(permohonan_id)
            .bind(item.mata_kuliah_id)
            .bind(&item.keterangan_pemohon)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(total_sks)
    }

    pub async fn list_mata_kuliah_diajukan_detail(
        &self,
        permohonan_id: Uuid,
    ) -> Result<Vec<RplMataKuliahDiajukanDetail>, AppError> {
        let rows = sqlx::query(
            "SELECT 
                d.id,
                d.permohonan_id,
                d.mata_kuliah_id,
                mk.kode_mk,
                mk.nama_mk,
                mk.sks,
                mk.semester,
                mk.silabus_ringkas,
                d.keterangan_pemohon,
                d.status_kelayakan,
                d.nilai_transfer,
                d.bobot_nilai::float8 as bobot_nilai,
                d.catatan_asesor,
                d.assessed_at,
                uas.nama_lengkap as assessed_by_nama
             FROM rpl_mata_kuliah_diajukan d
             JOIN mata_kuliah mk ON mk.id = d.mata_kuliah_id
             LEFT JOIN users uas ON uas.id = d.assessed_by
             WHERE d.permohonan_id = $1
             ORDER BY mk.semester ASC, mk.kode_mk ASC",
        )
        .bind(permohonan_id)
        .fetch_all(&self.pool)
        .await?;

        let mut list = Vec::new();
        for r in rows {
            list.push(RplMataKuliahDiajukanDetail {
                id: r.get("id"),
                permohonan_id: r.get("permohonan_id"),
                mata_kuliah_id: r.get("mata_kuliah_id"),
                kode_mk: r.get("kode_mk"),
                nama_mk: r.get("nama_mk"),
                sks: r.get("sks"),
                semester: r.get("semester"),
                silabus_ringkas: r.get("silabus_ringkas"),
                keterangan_pemohon: r.get("keterangan_pemohon"),
                status_kelayakan: r.get("status_kelayakan"),
                nilai_transfer: r.get("nilai_transfer"),
                bobot_nilai: r.get("bobot_nilai"),
                catatan_asesor: r.get("catatan_asesor"),
                assessed_at: r.get("assessed_at"),
                assessed_by_nama: r.get("assessed_by_nama"),
            });
        }

        Ok(list)
    }

    pub async fn update_penilaian_mata_kuliah(
        &self,
        permohonan_id: Uuid,
        mata_kuliah_id: Uuid,
        status_kelayakan: &str,
        nilai_transfer: Option<&str>,
        bobot_nilai: Option<f64>,
        catatan_asesor: Option<&str>,
        assessed_by: Uuid,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE rpl_mata_kuliah_diajukan
             SET status_kelayakan = $1, nilai_transfer = $2, bobot_nilai = $3,
                 catatan_asesor = $4, assessed_by = $5, assessed_at = NOW(), updated_at = NOW()
             WHERE permohonan_id = $6 AND mata_kuliah_id = $7",
        )
        .bind(status_kelayakan)
        .bind(nilai_transfer)
        .bind(bobot_nilai)
        .bind(catatan_asesor)
        .bind(assessed_by)
        .bind(permohonan_id)
        .bind(mata_kuliah_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn save_draft_penilaian(
        &self,
        permohonan_id: Uuid,
        total_sks_diakui: i32,
        ipk_konversi: f64,
        persentase_rekognisi: f64,
        catatan_asesor: Option<&str>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE rpl_permohonan
             SET total_sks_diakui = $1, ipk_konversi = $2, persentase_rekognisi = $3,
                 catatan_asesor = COALESCE($4, catatan_asesor),
                 status = CASE WHEN status = 'DIAJUKAN' THEN 'DALAM_PENILAIAN' ELSE status END,
                 updated_at = NOW()
             WHERE id = $5 AND status != 'SELESAI_DINILAI'",
        )
        .bind(total_sks_diakui)
        .bind(ipk_konversi)
        .bind(persentase_rekognisi)
        .bind(catatan_asesor)
        .bind(permohonan_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn finalize_penilaian(
        &self,
        permohonan_id: Uuid,
        total_sks_diakui: i32,
        ipk_konversi: f64,
        persentase_rekognisi: f64,
        catatan_asesor: Option<&str>,
    ) -> Result<RplPermohonan, AppError> {
        let p = sqlx::query_as::<_, RplPermohonan>(
            "UPDATE rpl_permohonan
             SET total_sks_diakui = $1, ipk_konversi = $2, persentase_rekognisi = $3,
                 catatan_asesor = COALESCE($4, catatan_asesor),
                 status = 'SELESAI_DINILAI', assessed_at = NOW(), updated_at = NOW()
             WHERE id = $5
             RETURNING id, pendaftar_id, tipe_rpl, riwayat_pendidikan, pengalaman_kerja, berkas_pendukung,
                       status, asesor_id, assigned_at, assigned_by, catatan_asesor, catatan_admin,
                       total_sks_diajukan, total_sks_diakui, ipk_konversi::float8, persentase_rekognisi::float8,
                       submitted_at, assessed_at, created_at, updated_at",
        )
        .bind(total_sks_diakui)
        .bind(ipk_konversi)
        .bind(persentase_rekognisi)
        .bind(catatan_asesor)
        .bind(permohonan_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(p)
    }

    // =========================================================================
    // 4. DATA LAPORAN & BERITA ACARA KONVERSI RPL
    // =========================================================================

    pub async fn get_data_laporan_rpl(
        &self,
        permohonan_id: Uuid,
    ) -> Result<LaporanRplResponse, AppError> {
        let row = sqlx::query(
            "SELECT 
                r.id as permohonan_id,
                p.nomor_pendaftaran,
                u.nama_lengkap,
                p.nik,
                prd.nama_prodi,
                prd.jenjang,
                prd.fakultas,
                r.tipe_rpl,
                r.total_sks_diajukan,
                r.total_sks_diakui,
                r.ipk_konversi::float8 as ipk_konversi,
                r.persentase_rekognisi::float8 as persentase_rekognisi,
                COALESCE(uas.nama_lengkap, 'Asesor PMB UPT') as asesor_nama,
                COALESCE(r.catatan_asesor, '-') as catatan_rekomendasi,
                r.assessed_at,
                r.created_at
             FROM rpl_permohonan r
             JOIN pendaftar p ON p.id = r.pendaftar_id
             JOIN users u ON u.id = p.user_id
             JOIN program_studi prd ON prd.id = p.prodi_pilihan_1
             LEFT JOIN users uas ON uas.id = r.asesor_id
             WHERE r.id = $1",
        )
        .bind(permohonan_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Data permohonan RPL tidak ditemukan".to_string()))?;

        let mk_rows = self.list_mata_kuliah_diajukan_detail(permohonan_id).await?;
        let mut daftar_mk = Vec::new();
        for (i, m) in mk_rows.into_iter().enumerate() {
            daftar_mk.push(LaporanRplItemCourse {
                no: (i + 1) as i32,
                kode_mk: m.kode_mk,
                nama_mk: m.nama_mk,
                sks: m.sks,
                semester: m.semester,
                status_kelayakan: m.status_kelayakan,
                nilai_transfer: m.nilai_transfer.unwrap_or_else(|| "-".to_string()),
                bobot_nilai: m.bobot_nilai.unwrap_or(0.0),
                catatan_asesor: m.catatan_asesor.unwrap_or_else(|| "-".to_string()),
            });
        }

        let no_pendaftaran: String = row.get("nomor_pendaftaran");
        let nomor_ba = format!("BA-RPL/UPT/2026/{}", no_pendaftaran.replace("PMB-", ""));
        let tanggal_ba = row
            .get::<Option<chrono::DateTime<Utc>>, _>("assessed_at")
            .unwrap_or_else(Utc::now)
            .format("%d %B %Y")
            .to_string();

        Ok(LaporanRplResponse {
            nomor_berita_acara: nomor_ba,
            tanggal_berita_acara: tanggal_ba,
            permohonan_id,
            nomor_pendaftaran: no_pendaftaran,
            nama_lengkap: row.get("nama_lengkap"),
            nik: row.get("nik"),
            prodi_nama: row.get("nama_prodi"),
            jenjang: row.get("jenjang"),
            fakultas: row.get("fakultas"),
            tipe_rpl: row.get("tipe_rpl"),
            total_sks_diajukan: row.get("total_sks_diajukan"),
            total_sks_diakui: row.get("total_sks_diakui"),
            ipk_konversi: row.get("ipk_konversi"),
            persentase_rekognisi: row.get("persentase_rekognisi"),
            asesor_nama: row.get("asesor_nama"),
            catatan_rekomendasi: row.get("catatan_rekomendasi"),
            daftar_mata_kuliah: daftar_mk,
        })
    }
}
