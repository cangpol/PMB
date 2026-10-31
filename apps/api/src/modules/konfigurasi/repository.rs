use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::konfigurasi::{
        dto::{
            CreateFakultasRequest, CreateGelombangRequest, CreateJalurKonfigurasiRequest,
            CreateKomponenBiayaRequest, CreateMatriksBiayaRequest, CreateProdiKonfigurasiRequest,
            CreateTahunAkademikRequest, CreateVoucherRequest, GelombangDetailResponse,
            KuotaProdiGelombangResponse, MatriksBiayaResponse, SetKuotaProdiGelombangRequest,
            UpdateGelombangRequest, UpdateJalurKonfigurasiRequest, UpdateMatriksBiayaRequest,
            UpdateProdiKonfigurasiRequest, UpdateTahunAkademikRequest, UpdateVoucherRequest,
        },
        model::{
            Fakultas, GelombangDetail, JalurMasukDetail, KomponenBiaya, KuotaProdiGelombang,
            MatriksBiaya, PengaturanPmb, ProgramStudiDetail, TahunAkademik, VoucherDetail,
        },
    },
};

#[derive(Clone)]
pub struct KonfigurasiRepository {
    pool: PgPool,
}

impl KonfigurasiRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ================= AUDIT LOG =================
    pub async fn record_audit(
        &self,
        user_id: Option<Uuid>,
        action: &str,
        entity_type: &str,
        entity_id: &str,
        details_json: &str,
    ) {
        let _ = sqlx::query(
            "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(user_id)
        .bind(action)
        .bind(entity_type)
        .bind(entity_id)
        .bind(details_json)
        .execute(&self.pool)
        .await;
    }

    // ================= TAHUN AKADEMIK =================
    pub async fn list_tahun_akademik(&self) -> Result<Vec<TahunAkademik>, AppError> {
        let items = sqlx::query_as::<_, TahunAkademik>(
            "SELECT id, kode, nama, tgl_mulai, tgl_selesai, is_active, created_at, updated_at
             FROM tahun_akademik ORDER BY kode DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create_tahun_akademik(
        &self,
        req: &CreateTahunAkademikRequest,
    ) -> Result<TahunAkademik, AppError> {
        let item = sqlx::query_as::<_, TahunAkademik>(
            "INSERT INTO tahun_akademik (kode, nama, tgl_mulai, tgl_selesai, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, kode, nama, tgl_mulai, tgl_selesai, is_active, created_at, updated_at",
        )
        .bind(&req.kode)
        .bind(&req.nama)
        .bind(req.tgl_mulai)
        .bind(req.tgl_selesai)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_tahun_akademik(
        &self,
        id: Uuid,
        req: &UpdateTahunAkademikRequest,
    ) -> Result<TahunAkademik, AppError> {
        let item = sqlx::query_as::<_, TahunAkademik>(
            "UPDATE tahun_akademik
             SET kode = $1, nama = $2, tgl_mulai = $3, tgl_selesai = $4, is_active = $5, updated_at = NOW()
             WHERE id = $6
             RETURNING id, kode, nama, tgl_mulai, tgl_selesai, is_active, created_at, updated_at",
        )
        .bind(&req.kode)
        .bind(&req.nama)
        .bind(req.tgl_mulai)
        .bind(req.tgl_selesai)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_tahun_akademik(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM tahun_akademik WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= FAKULTAS =================
    pub async fn list_fakultas(&self) -> Result<Vec<Fakultas>, AppError> {
        let items = sqlx::query_as::<_, Fakultas>(
            "SELECT id, kode_fakultas, nama_fakultas, deskripsi, is_active, created_at, updated_at
             FROM fakultas ORDER BY kode_fakultas ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create_fakultas(&self, req: &CreateFakultasRequest) -> Result<Fakultas, AppError> {
        let item = sqlx::query_as::<_, Fakultas>(
            "INSERT INTO fakultas (kode_fakultas, nama_fakultas, deskripsi, is_active)
             VALUES ($1, $2, $3, $4)
             RETURNING id, kode_fakultas, nama_fakultas, deskripsi, is_active, created_at, updated_at",
        )
        .bind(&req.kode_fakultas)
        .bind(&req.nama_fakultas)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_fakultas(
        &self,
        id: Uuid,
        req: &CreateFakultasRequest,
    ) -> Result<Fakultas, AppError> {
        let item = sqlx::query_as::<_, Fakultas>(
            "UPDATE fakultas
             SET kode_fakultas = $1, nama_fakultas = $2, deskripsi = $3, is_active = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING id, kode_fakultas, nama_fakultas, deskripsi, is_active, created_at, updated_at",
        )
        .bind(&req.kode_fakultas)
        .bind(&req.nama_fakultas)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_fakultas(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM fakultas WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= GELOMBANG =================
    pub async fn list_gelombang(&self) -> Result<Vec<GelombangDetailResponse>, AppError> {
        let items = sqlx::query_as::<_, GelombangDetailResponse>(
            r#"SELECT g.id, g.nama_gelombang, g.tahun_akademik_id, ta.nama as tahun_akademik_nama,
                      g.nomor_gelombang, g.status, g.tgl_mulai, g.tgl_selesai, g.kuota, g.is_active,
                      g.created_at, g.updated_at
               FROM gelombang g
               LEFT JOIN tahun_akademik ta ON g.tahun_akademik_id = ta.id
               ORDER BY g.nomor_gelombang ASC, g.tgl_mulai ASC"#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn check_gelombang_overlapping(
        &self,
        tahun_akademik_id: Option<Uuid>,
        exclude_id: Option<Uuid>,
        tgl_mulai: DateTime<Utc>,
        tgl_selesai: DateTime<Utc>,
    ) -> Result<bool, AppError> {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM gelombang 
             WHERE ($1::uuid IS NULL OR tahun_akademik_id = $1)
               AND ($2::uuid IS NULL OR id != $2)
               AND tgl_mulai < $4 AND tgl_selesai > $3",
        )
        .bind(tahun_akademik_id)
        .bind(exclude_id)
        .bind(tgl_mulai)
        .bind(tgl_selesai)
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    pub async fn create_gelombang(
        &self,
        req: &CreateGelombangRequest,
    ) -> Result<GelombangDetail, AppError> {
        let item = sqlx::query_as::<_, GelombangDetail>(
            "INSERT INTO gelombang (nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active, created_at, updated_at",
        )
        .bind(&req.nama_gelombang)
        .bind(req.tahun_akademik_id)
        .bind(req.nomor_gelombang)
        .bind(&req.status)
        .bind(req.tgl_mulai)
        .bind(req.tgl_selesai)
        .bind(req.kuota)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_gelombang(
        &self,
        id: Uuid,
        req: &UpdateGelombangRequest,
    ) -> Result<GelombangDetail, AppError> {
        let item = sqlx::query_as::<_, GelombangDetail>(
            "UPDATE gelombang
             SET nama_gelombang = $1, tahun_akademik_id = $2, nomor_gelombang = $3, status = $4,
                 tgl_mulai = $5, tgl_selesai = $6, kuota = $7, is_active = $8, updated_at = NOW()
             WHERE id = $9
             RETURNING id, nama_gelombang, tahun_akademik_id, nomor_gelombang, status, tgl_mulai, tgl_selesai, kuota, is_active, created_at, updated_at",
        )
        .bind(&req.nama_gelombang)
        .bind(req.tahun_akademik_id)
        .bind(req.nomor_gelombang)
        .bind(&req.status)
        .bind(req.tgl_mulai)
        .bind(req.tgl_selesai)
        .bind(req.kuota)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_gelombang(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM gelombang WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= PROGRAM STUDI & KUOTA =================
    pub async fn list_prodi(&self) -> Result<Vec<ProgramStudiDetail>, AppError> {
        let items = sqlx::query_as::<_, ProgramStudiDetail>(
            "SELECT id, kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, fakultas_id,
                    passing_score, kuota, ukt_nominal, is_active, created_at, updated_at
             FROM program_studi ORDER BY jenjang DESC, kode_prodi ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create_prodi(
        &self,
        req: &CreateProdiKonfigurasiRequest,
    ) -> Result<ProgramStudiDetail, AppError> {
        let item = sqlx::query_as::<_, ProgramStudiDetail>(
            "INSERT INTO program_studi (kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, fakultas_id, passing_score, kuota, ukt_nominal, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, fakultas_id, passing_score, kuota, ukt_nominal, is_active, created_at, updated_at",
        )
        .bind(&req.kode_prodi)
        .bind(&req.nama_prodi)
        .bind(&req.jenjang)
        .bind(&req.fakultas)
        .bind(&req.kode_fakultas)
        .bind(req.fakultas_id)
        .bind(req.passing_score)
        .bind(req.kuota)
        .bind(req.ukt_nominal)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_prodi(
        &self,
        id: Uuid,
        req: &UpdateProdiKonfigurasiRequest,
    ) -> Result<ProgramStudiDetail, AppError> {
        let item = sqlx::query_as::<_, ProgramStudiDetail>(
            "UPDATE program_studi
             SET kode_prodi = $1, nama_prodi = $2, jenjang = $3, fakultas = $4, kode_fakultas = $5,
                 fakultas_id = $6, passing_score = $7, kuota = $8, ukt_nominal = $9, is_active = $10, updated_at = NOW()
             WHERE id = $11
             RETURNING id, kode_prodi, nama_prodi, jenjang, fakultas, kode_fakultas, fakultas_id, passing_score, kuota, ukt_nominal, is_active, created_at, updated_at",
        )
        .bind(&req.kode_prodi)
        .bind(&req.nama_prodi)
        .bind(&req.jenjang)
        .bind(&req.fakultas)
        .bind(&req.kode_fakultas)
        .bind(req.fakultas_id)
        .bind(req.passing_score)
        .bind(req.kuota)
        .bind(req.ukt_nominal)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_prodi(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM program_studi WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn list_kuota_prodi_gelombang(
        &self,
    ) -> Result<Vec<KuotaProdiGelombangResponse>, AppError> {
        let items = sqlx::query_as::<_, KuotaProdiGelombangResponse>(
            r#"SELECT k.id, k.prodi_id, p.nama_prodi, k.gelombang_id, g.nama_gelombang,
                      k.kuota, k.kuota_terisi, k.updated_at
               FROM kuota_prodi_gelombang k
               JOIN program_studi p ON k.prodi_id = p.id
               JOIN gelombang g ON k.gelombang_id = g.id
               ORDER BY g.nomor_gelombang ASC, p.kode_prodi ASC"#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn set_kuota_prodi_gelombang(
        &self,
        req: &SetKuotaProdiGelombangRequest,
    ) -> Result<KuotaProdiGelombangResponse, AppError> {
        let item = sqlx::query_as::<_, KuotaProdiGelombang>(
            r#"INSERT INTO kuota_prodi_gelombang (prodi_id, gelombang_id, kuota)
               VALUES ($1, $2, $3)
               ON CONFLICT (prodi_id, gelombang_id) 
               DO UPDATE SET kuota = EXCLUDED.kuota, updated_at = NOW()
               RETURNING id, prodi_id, gelombang_id, kuota, kuota_terisi, created_at, updated_at"#,
        )
        .bind(req.prodi_id)
        .bind(req.gelombang_id)
        .bind(req.kuota)
        .fetch_one(&self.pool)
        .await?;

        let prodi_nama =
            sqlx::query_scalar::<_, String>("SELECT nama_prodi FROM program_studi WHERE id = $1")
                .bind(req.prodi_id)
                .fetch_one(&self.pool)
                .await?;

        let gelombang_nama =
            sqlx::query_scalar::<_, String>("SELECT nama_gelombang FROM gelombang WHERE id = $1")
                .bind(req.gelombang_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(KuotaProdiGelombangResponse {
            id: item.id,
            prodi_id: item.prodi_id,
            nama_prodi: prodi_nama,
            gelombang_id: item.gelombang_id,
            nama_gelombang: gelombang_nama,
            kuota: item.kuota,
            kuota_terisi: item.kuota_terisi,
            updated_at: item.updated_at,
        })
    }

    // ================= JALUR MASUK =================
    pub async fn list_jalur(&self) -> Result<Vec<JalurMasukDetail>, AppError> {
        let items = sqlx::query_as::<_, JalurMasukDetail>(
            "SELECT id, kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, kuota_maksimal, is_active, created_at, updated_at
             FROM jalur_masuk ORDER BY kode_jalur ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create_jalur(
        &self,
        req: &CreateJalurKonfigurasiRequest,
    ) -> Result<JalurMasukDetail, AppError> {
        let item = sqlx::query_as::<_, JalurMasukDetail>(
            "INSERT INTO jalur_masuk (kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, kuota_maksimal, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, kuota_maksimal, is_active, created_at, updated_at",
        )
        .bind(&req.kode_jalur)
        .bind(&req.nama_jalur)
        .bind(&req.deskripsi)
        .bind(req.biaya_formulir)
        .bind(&req.tipe_seleksi)
        .bind(&req.syarat)
        .bind(req.kuota_maksimal)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_jalur(
        &self,
        id: Uuid,
        req: &UpdateJalurKonfigurasiRequest,
    ) -> Result<JalurMasukDetail, AppError> {
        let item = sqlx::query_as::<_, JalurMasukDetail>(
            "UPDATE jalur_masuk
             SET kode_jalur = $1, nama_jalur = $2, deskripsi = $3, biaya_formulir = $4,
                 tipe_seleksi = $5, syarat = $6, kuota_maksimal = $7, is_active = $8, updated_at = NOW()
             WHERE id = $9
             RETURNING id, kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, kuota_maksimal, is_active, created_at, updated_at",
        )
        .bind(&req.kode_jalur)
        .bind(&req.nama_jalur)
        .bind(&req.deskripsi)
        .bind(req.biaya_formulir)
        .bind(&req.tipe_seleksi)
        .bind(&req.syarat)
        .bind(req.kuota_maksimal)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_jalur(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM jalur_masuk WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= KOMPONEN BIAYA =================
    pub async fn list_komponen_biaya(&self) -> Result<Vec<KomponenBiaya>, AppError> {
        let items = sqlx::query_as::<_, KomponenBiaya>(
            "SELECT id, kode_komponen, nama_komponen, deskripsi, is_active, created_at, updated_at
             FROM komponen_biaya ORDER BY kode_komponen ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn create_komponen_biaya(
        &self,
        req: &CreateKomponenBiayaRequest,
    ) -> Result<KomponenBiaya, AppError> {
        let item = sqlx::query_as::<_, KomponenBiaya>(
            "INSERT INTO komponen_biaya (kode_komponen, nama_komponen, deskripsi, is_active)
             VALUES ($1, $2, $3, $4)
             RETURNING id, kode_komponen, nama_komponen, deskripsi, is_active, created_at, updated_at",
        )
        .bind(&req.kode_komponen)
        .bind(&req.nama_komponen)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_komponen_biaya(
        &self,
        id: Uuid,
        req: &CreateKomponenBiayaRequest,
    ) -> Result<KomponenBiaya, AppError> {
        let item = sqlx::query_as::<_, KomponenBiaya>(
            "UPDATE komponen_biaya
             SET kode_komponen = $1, nama_komponen = $2, deskripsi = $3, is_active = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING id, kode_komponen, nama_komponen, deskripsi, is_active, created_at, updated_at",
        )
        .bind(&req.kode_komponen)
        .bind(&req.nama_komponen)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_komponen_biaya(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM komponen_biaya WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= MATRIKS BIAYA =================
    pub async fn list_matriks_biaya(&self) -> Result<Vec<MatriksBiayaResponse>, AppError> {
        let items = sqlx::query_as::<_, MatriksBiayaResponse>(
            r#"SELECT m.id, m.prodi_id, p.nama_prodi, m.jalur_id, j.nama_jalur,
                      m.gelombang_id, g.nama_gelombang, m.komponen_id, k.nama_komponen, k.kode_komponen,
                      m.nominal, m.bisa_dicicil, m.maksimal_cicilan, m.nominal_cicilan_pertama, m.updated_at
               FROM matriks_biaya m
               JOIN program_studi p ON m.prodi_id = p.id
               JOIN jalur_masuk j ON m.jalur_id = j.id
               JOIN gelombang g ON m.gelombang_id = g.id
               JOIN komponen_biaya k ON m.komponen_id = k.id
               ORDER BY p.kode_prodi ASC, g.nomor_gelombang ASC, k.kode_komponen ASC"#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn find_matriks_by_prodi_jalur_gelombang(
        &self,
        prodi_id: Uuid,
        jalur_id: Uuid,
        gelombang_id: Uuid,
    ) -> Result<Vec<MatriksBiayaResponse>, AppError> {
        let items = sqlx::query_as::<_, MatriksBiayaResponse>(
            r#"SELECT m.id, m.prodi_id, p.nama_prodi, m.jalur_id, j.nama_jalur,
                      m.gelombang_id, g.nama_gelombang, m.komponen_id, k.nama_komponen, k.kode_komponen,
                      m.nominal, m.bisa_dicicil, m.maksimal_cicilan, m.nominal_cicilan_pertama, m.updated_at
               FROM matriks_biaya m
               JOIN program_studi p ON m.prodi_id = p.id
               JOIN jalur_masuk j ON m.jalur_id = j.id
               JOIN gelombang g ON m.gelombang_id = g.id
               JOIN komponen_biaya k ON m.komponen_id = k.id
               WHERE m.prodi_id = $1 AND m.jalur_id = $2 AND m.gelombang_id = $3
               ORDER BY k.kode_komponen ASC"#,
        )
        .bind(prodi_id)
        .bind(jalur_id)
        .bind(gelombang_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(items)
    }

    pub async fn create_matriks_biaya(
        &self,
        req: &CreateMatriksBiayaRequest,
    ) -> Result<MatriksBiaya, AppError> {
        let item = sqlx::query_as::<_, MatriksBiaya>(
            "INSERT INTO matriks_biaya (prodi_id, jalur_id, gelombang_id, komponen_id, nominal, bisa_dicicil, maksimal_cicilan, nominal_cicilan_pertama)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, prodi_id, jalur_id, gelombang_id, komponen_id, nominal, bisa_dicicil, maksimal_cicilan, nominal_cicilan_pertama, created_at, updated_at",
        )
        .bind(req.prodi_id)
        .bind(req.jalur_id)
        .bind(req.gelombang_id)
        .bind(req.komponen_id)
        .bind(req.nominal)
        .bind(req.bisa_dicicil)
        .bind(req.maksimal_cicilan)
        .bind(req.nominal_cicilan_pertama)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_matriks_biaya(
        &self,
        id: Uuid,
        req: &UpdateMatriksBiayaRequest,
    ) -> Result<MatriksBiaya, AppError> {
        let item = sqlx::query_as::<_, MatriksBiaya>(
            "UPDATE matriks_biaya
             SET nominal = $1, bisa_dicicil = $2, maksimal_cicilan = $3, nominal_cicilan_pertama = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING id, prodi_id, jalur_id, gelombang_id, komponen_id, nominal, bisa_dicicil, maksimal_cicilan, nominal_cicilan_pertama, created_at, updated_at",
        )
        .bind(req.nominal)
        .bind(req.bisa_dicicil)
        .bind(req.maksimal_cicilan)
        .bind(req.nominal_cicilan_pertama)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_matriks_biaya(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM matriks_biaya WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= VOUCHER =================
    pub async fn list_vouchers(&self) -> Result<Vec<VoucherDetail>, AppError> {
        let items = sqlx::query_as::<_, VoucherDetail>(
            "SELECT id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai,
                    tgl_kadaluarsa, batas_jalur_id, batas_prodi_id, deskripsi, is_active, created_at, updated_at
             FROM vouchers ORDER BY created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn find_voucher_by_kode(
        &self,
        kode: &str,
    ) -> Result<Option<VoucherDetail>, AppError> {
        let item = sqlx::query_as::<_, VoucherDetail>(
            "SELECT id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai,
                    tgl_kadaluarsa, batas_jalur_id, batas_prodi_id, deskripsi, is_active, created_at, updated_at
             FROM vouchers WHERE UPPER(kode_voucher) = UPPER($1)",
        )
        .bind(kode)
        .fetch_optional(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn claim_voucher_atomic(
        &self,
        id: Uuid,
        jalur_id: Option<Uuid>,
        prodi_id: Option<Uuid>,
    ) -> Result<bool, AppError> {
        let res = sqlx::query(
            "UPDATE vouchers 
             SET kuota_terpakai = kuota_terpakai + 1, updated_at = NOW()
             WHERE id = $1 AND kuota_terpakai < kuota AND is_active = TRUE AND tgl_kadaluarsa > NOW()
               AND ($2::uuid IS NULL OR batas_jalur_id IS NULL OR batas_jalur_id = $2)
               AND ($3::uuid IS NULL OR batas_prodi_id IS NULL OR batas_prodi_id = $3)",
        )
        .bind(id)
        .bind(jalur_id)
        .bind(prodi_id)
        .execute(&self.pool)
        .await?;

        Ok(res.rows_affected() > 0)
    }

    pub async fn create_voucher(
        &self,
        req: &CreateVoucherRequest,
    ) -> Result<VoucherDetail, AppError> {
        let kode_upper = req.kode_voucher.trim().to_uppercase();
        let item = sqlx::query_as::<_, VoucherDetail>(
            "INSERT INTO vouchers (kode_voucher, tipe_diskon, nilai_diskon, kuota, tgl_kadaluarsa, batas_jalur_id, batas_prodi_id, deskripsi, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai, tgl_kadaluarsa, batas_jalur_id, batas_prodi_id, deskripsi, is_active, created_at, updated_at",
        )
        .bind(kode_upper)
        .bind(&req.tipe_diskon)
        .bind(req.nilai_diskon)
        .bind(req.kuota)
        .bind(req.tgl_kadaluarsa)
        .bind(req.batas_jalur_id)
        .bind(req.batas_prodi_id)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn update_voucher(
        &self,
        id: Uuid,
        req: &UpdateVoucherRequest,
    ) -> Result<VoucherDetail, AppError> {
        let item = sqlx::query_as::<_, VoucherDetail>(
            "UPDATE vouchers
             SET tipe_diskon = $1, nilai_diskon = $2, kuota = $3, tgl_kadaluarsa = $4,
                 batas_jalur_id = $5, batas_prodi_id = $6, deskripsi = $7, is_active = $8, updated_at = NOW()
             WHERE id = $9
             RETURNING id, kode_voucher, tipe_diskon, nilai_diskon, kuota, kuota_terpakai, tgl_kadaluarsa, batas_jalur_id, batas_prodi_id, deskripsi, is_active, created_at, updated_at",
        )
        .bind(&req.tipe_diskon)
        .bind(req.nilai_diskon)
        .bind(req.kuota)
        .bind(req.tgl_kadaluarsa)
        .bind(req.batas_jalur_id)
        .bind(req.batas_prodi_id)
        .bind(&req.deskripsi)
        .bind(req.is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn delete_voucher(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM vouchers WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ================= PENGATURAN PMB =================
    pub async fn list_pengaturan(&self) -> Result<Vec<PengaturanPmb>, AppError> {
        let items = sqlx::query_as::<_, PengaturanPmb>(
            "SELECT id, kunci, nilai, deskripsi, updated_by, updated_at
             FROM pengaturan_pmb ORDER BY kunci ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    pub async fn get_pengaturan_by_kunci(
        &self,
        kunci: &str,
    ) -> Result<Option<PengaturanPmb>, AppError> {
        let item = sqlx::query_as::<_, PengaturanPmb>(
            "SELECT id, kunci, nilai, deskripsi, updated_by, updated_at
             FROM pengaturan_pmb WHERE kunci = $1",
        )
        .bind(kunci)
        .fetch_optional(&self.pool)
        .await?;
        Ok(item)
    }

    pub async fn upsert_pengaturan(
        &self,
        kunci: &str,
        nilai: &str,
        deskripsi: Option<&str>,
        updated_by: Option<Uuid>,
    ) -> Result<PengaturanPmb, AppError> {
        let item = sqlx::query_as::<_, PengaturanPmb>(
            "INSERT INTO pengaturan_pmb (kunci, nilai, deskripsi, updated_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (kunci) 
             DO UPDATE SET nilai = EXCLUDED.nilai, deskripsi = COALESCE(EXCLUDED.deskripsi, pengaturan_pmb.deskripsi),
                           updated_by = EXCLUDED.updated_by, updated_at = NOW()
             RETURNING id, kunci, nilai, deskripsi, updated_by, updated_at",
        )
        .bind(kunci)
        .bind(nilai)
        .bind(deskripsi)
        .bind(updated_by)
        .fetch_one(&self.pool)
        .await?;
        Ok(item)
    }
}
