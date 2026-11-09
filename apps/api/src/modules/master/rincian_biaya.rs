//! Rincian Biaya Kuliah per program studi: Admisi, Semester 1, Semester 2 - Semester 8
//! (per semester) dan total pembayaran hingga lulus. Total tidak disimpan, selalu dihitung.

use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{error::AppError, extractors::RequireAdmin, state::AppState};

const BATAS_NOMINAL: i64 = 1_000_000_000_000;

pub const MAKS_SEMESTER: usize = 8;

/// Total hingga lulus = admisi + biaya semester 1 sampai `jumlah_semester` (maks. 8).
pub fn total_hingga_lulus(admisi: i64, semester: &[i64], jumlah_semester: i32) -> i64 {
    let n = usize::try_from(jumlah_semester)
        .unwrap_or(0)
        .min(MAKS_SEMESTER);
    admisi + semester.iter().take(n).sum::<i64>()
}

#[derive(Debug, FromRow)]
struct Baris {
    prodi_id: Uuid,
    kode_prodi: String,
    nama_prodi: String,
    jenjang: String,
    fakultas: String,
    slug: Option<String>,
    admisi: i64,
    semester_1: i64,
    semester_2: i64,
    semester_3: i64,
    semester_4: i64,
    semester_5: i64,
    semester_6: i64,
    semester_7: i64,
    semester_8: i64,
    jumlah_semester: i32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RincianBiayaKuliah {
    pub prodi_id: Uuid,
    pub kode_prodi: String,
    pub nama_prodi: String,
    pub jenjang: String,
    pub fakultas: String,
    pub slug: Option<String>,
    pub admisi: i64,
    /// Biaya semester 1 sampai 8 (semester di atas `jumlah_semester` tidak dipakai)
    pub semester: Vec<i64>,
    pub jumlah_semester: i32,
    pub total_hingga_lulus: i64,
}

impl From<Baris> for RincianBiayaKuliah {
    fn from(b: Baris) -> Self {
        let semester = vec![
            b.semester_1,
            b.semester_2,
            b.semester_3,
            b.semester_4,
            b.semester_5,
            b.semester_6,
            b.semester_7,
            b.semester_8,
        ];
        RincianBiayaKuliah {
            total_hingga_lulus: total_hingga_lulus(b.admisi, &semester, b.jumlah_semester),
            prodi_id: b.prodi_id,
            kode_prodi: b.kode_prodi,
            nama_prodi: b.nama_prodi,
            jenjang: b.jenjang,
            fakultas: b.fakultas,
            slug: b.slug,
            admisi: b.admisi,
            semester,
            jumlah_semester: b.jumlah_semester,
        }
    }
}

const SELECT_RINCIAN: &str = "SELECT ps.id AS prodi_id, ps.kode_prodi, ps.nama_prodi, ps.jenjang,
        ps.fakultas, ps.slug,
        COALESCE(r.admisi, 0) AS admisi, COALESCE(r.semester_1, 0) AS semester_1,
        COALESCE(r.semester_2, 0) AS semester_2, COALESCE(r.semester_3, 0) AS semester_3,
        COALESCE(r.semester_4, 0) AS semester_4, COALESCE(r.semester_5, 0) AS semester_5,
        COALESCE(r.semester_6, 0) AS semester_6, COALESCE(r.semester_7, 0) AS semester_7,
        COALESCE(r.semester_8, 0) AS semester_8,
        COALESCE(r.jumlah_semester, CASE WHEN ps.jenjang = 'D3' THEN 6 ELSE 8 END) AS jumlah_semester
     FROM program_studi ps
     LEFT JOIN rincian_biaya_kuliah r ON r.prodi_id = ps.id
     WHERE ps.is_active = TRUE";

async fn daftar(pool: &sqlx::PgPool) -> Result<Vec<RincianBiayaKuliah>, AppError> {
    let sql = format!("{SELECT_RINCIAN} ORDER BY ps.fakultas, ps.jenjang DESC, ps.nama_prodi");
    let rows: Vec<Baris> = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .fetch_all(pool)
        .await?;
    Ok(rows.into_iter().map(Into::into).collect())
}

#[utoipa::path(
    get,
    path = "/api/master/rincian-biaya-kuliah",
    tag = "Master",
    responses((status = 200, description = "Rincian biaya kuliah semua program studi aktif", body = Vec<RincianBiayaKuliah>))
)]
pub async fn list_rincian_biaya_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(daftar(&state.db).await?))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimpanRincianBiayaRequest {
    pub admisi: i64,
    /// Tepat 8 angka: biaya semester 1 sampai 8
    pub semester: Vec<i64>,
    pub jumlah_semester: Option<i32>,
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/rincian-biaya-kuliah/{prodi_id}",
    tag = "Konfigurasi Admin",
    params(("prodi_id" = Uuid, Path, description = "ID program studi")),
    request_body = SimpanRincianBiayaRequest,
    responses((status = 200, description = "Rincian biaya tersimpan", body = RincianBiayaKuliah))
)]
pub async fn simpan_rincian_biaya_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(prodi_id): Path<Uuid>,
    Json(req): Json<SimpanRincianBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.semester.len() != MAKS_SEMESTER {
        return Err(AppError::BadRequest(format!(
            "Biaya semester harus berisi tepat {MAKS_SEMESTER} angka"
        )));
    }
    if std::iter::once(&req.admisi)
        .chain(req.semester.iter())
        .any(|n| !(0..=BATAS_NOMINAL).contains(n))
    {
        return Err(AppError::BadRequest(format!(
            "Setiap biaya harus antara 0 dan {BATAS_NOMINAL}"
        )));
    }
    if let Some(j) = req.jumlah_semester
        && !(2..=14).contains(&j)
    {
        return Err(AppError::BadRequest(
            "Jumlah semester harus antara 2 dan 14".into(),
        ));
    }

    let ada: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM program_studi WHERE id = $1)")
        .bind(prodi_id)
        .fetch_one(&state.db)
        .await?;
    if !ada {
        return Err(AppError::NotFound("Program studi tidak ditemukan".into()));
    }

    sqlx::query(
        "INSERT INTO rincian_biaya_kuliah (prodi_id, admisi, semester_1, semester_2, semester_3,
                semester_4, semester_5, semester_6, semester_7, semester_8, jumlah_semester)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 COALESCE($11, (SELECT CASE WHEN jenjang = 'D3' THEN 6 ELSE 8 END
                                FROM program_studi WHERE id = $1)))
         ON CONFLICT (prodi_id) DO UPDATE
            SET admisi = EXCLUDED.admisi, semester_1 = EXCLUDED.semester_1,
                semester_2 = EXCLUDED.semester_2, semester_3 = EXCLUDED.semester_3,
                semester_4 = EXCLUDED.semester_4, semester_5 = EXCLUDED.semester_5,
                semester_6 = EXCLUDED.semester_6, semester_7 = EXCLUDED.semester_7,
                semester_8 = EXCLUDED.semester_8,
                jumlah_semester = COALESCE($11, rincian_biaya_kuliah.jumlah_semester),
                updated_at = NOW()",
    )
    .bind(prodi_id)
    .bind(req.admisi)
    .bind(req.semester[0])
    .bind(req.semester[1])
    .bind(req.semester[2])
    .bind(req.semester[3])
    .bind(req.semester[4])
    .bind(req.semester[5])
    .bind(req.semester[6])
    .bind(req.semester[7])
    .bind(req.jumlah_semester)
    .execute(&state.db)
    .await?;

    let sql = format!("{SELECT_RINCIAN} AND ps.id = $1");
    let baris: Baris = sqlx::query_as(sqlx::AssertSqlSafe(sql))
        .bind(prodi_id)
        .fetch_one(&state.db)
        .await?;
    Ok(Json(RincianBiayaKuliah::from(baris)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn total_s1_delapan_semester() {
        let smt = [
            7_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000, 6_000_000,
        ];
        assert_eq!(total_hingga_lulus(5_000_000, &smt, 8), 54_000_000);
    }

    #[test]
    fn total_d3_hanya_enam_semester_pertama() {
        let smt = [4, 3, 3, 3, 3, 3, 999, 999];
        assert_eq!(total_hingga_lulus(1, &smt, 6), 20);
    }

    #[test]
    fn jumlah_semester_di_luar_batas_aman() {
        assert_eq!(total_hingga_lulus(1, &[2, 3], 0), 1);
        assert_eq!(total_hingga_lulus(1, &[2, 3], 99), 6);
        assert_eq!(total_hingga_lulus(1, &[2, 3], -3), 1);
    }
}
