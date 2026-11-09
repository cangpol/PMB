//! Tahap pendaftaran di dalam gelombang (mis. Gelombang 1 Tahap 1 dan Tahap 2).
//!
//! Setiap tahap punya rentang tanggal sendiri. Tahap yang sudah lewat tetap ditampilkan tetapi
//! tidak dapat dipilih (pendaftaran dilanjutkan pada tahap berikutnya); tahap yang belum mulai
//! juga belum dapat dipilih. Gelombang tanpa tahap memakai tanggal gelombang seperti semula.

use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::{Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{error::AppError, extractors::RequireAdmin, state::AppState};

pub const TAHAP_MAKS: usize = 6;

pub const BELUM_DIBUKA: &str = "BELUM_DIBUKA";
pub const DIBUKA: &str = "DIBUKA";
pub const BERAKHIR: &str = "BERAKHIR";

#[derive(Debug, Clone, FromRow)]
pub struct TahapGelombang {
    pub id: Uuid,
    pub gelombang_id: Uuid,
    pub nomor_tahap: i32,
    pub nama: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
}

/// Tahap beserta status terhadap hari ini (dihitung server menurut WIB).
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TahapResponse {
    pub id: Uuid,
    pub nomor_tahap: i32,
    pub nama: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
    /// `BELUM_DIBUKA`, `DIBUKA`, atau `BERAKHIR`
    pub status: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct TahapInput {
    pub nama: String,
    pub tgl_mulai: NaiveDate,
    pub tgl_selesai: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SimpanTahapRequest {
    pub tahap: Vec<TahapInput>,
}

/// Tanggal hari ini menurut WIB (UTC+7).
pub fn hari_ini_wib() -> NaiveDate {
    (Utc::now() + Duration::hours(7)).date_naive()
}

pub fn status_tahap(hari_ini: NaiveDate, mulai: NaiveDate, selesai: NaiveDate) -> &'static str {
    if hari_ini < mulai {
        BELUM_DIBUKA
    } else if hari_ini > selesai {
        BERAKHIR
    } else {
        DIBUKA
    }
}

impl TahapGelombang {
    pub fn ke_response(&self, hari_ini: NaiveDate) -> TahapResponse {
        TahapResponse {
            id: self.id,
            nomor_tahap: self.nomor_tahap,
            nama: self.nama.clone(),
            tgl_mulai: self.tgl_mulai,
            tgl_selesai: self.tgl_selesai,
            status: status_tahap(hari_ini, self.tgl_mulai, self.tgl_selesai).to_string(),
        }
    }
}

fn tgl(d: NaiveDate) -> String {
    d.format("%d/%m/%Y").to_string()
}

/// Pilih tahap untuk pendaftaran. `diminta` = tahap yang dipilih calon; bila kosong dipakai tahap
/// yang sedang dibuka. Mengembalikan pesan galat siap tampil bila tahap tidak dapat dipakai.
/// `daftar` harus terurut menurut nomor tahap.
pub fn pilih_tahap(
    hari_ini: NaiveDate,
    daftar: &[TahapGelombang],
    diminta: Option<Uuid>,
) -> Result<Uuid, String> {
    let status = |t: &TahapGelombang| status_tahap(hari_ini, t.tgl_mulai, t.tgl_selesai);
    // Tahap berikutnya yang akan dibuka (untuk petunjuk di pesan galat)
    let berikutnya = daftar.iter().find(|t| status(t) == BELUM_DIBUKA);
    let sedang_dibuka = daftar.iter().find(|t| status(t) == DIBUKA);
    let petunjuk = |prefix: &str| match (sedang_dibuka, berikutnya) {
        (Some(d), _) => format!(
            "{prefix} Silakan pilih {} yang sedang dibuka ({} - {}).",
            d.nama,
            tgl(d.tgl_mulai),
            tgl(d.tgl_selesai)
        ),
        (None, Some(n)) => format!(
            "{prefix} Pendaftaran dilanjutkan pada {} yang dibuka {} - {}.",
            n.nama,
            tgl(n.tgl_mulai),
            tgl(n.tgl_selesai)
        ),
        (None, None) => prefix.to_string(),
    };

    match diminta {
        Some(id) => {
            let t = daftar.iter().find(|t| t.id == id).ok_or_else(|| {
                "Tahap pendaftaran tidak ditemukan pada gelombang ini".to_string()
            })?;
            match status(t) {
                DIBUKA => Ok(t.id),
                BERAKHIR => Err(petunjuk(&format!(
                    "{} sudah ditutup pada {}.",
                    t.nama,
                    tgl(t.tgl_selesai)
                ))),
                _ => Err(format!(
                    "{} baru dibuka pada {} - {}.",
                    t.nama,
                    tgl(t.tgl_mulai),
                    tgl(t.tgl_selesai)
                )),
            }
        }
        None => {
            if let Some(t) = daftar.iter().find(|t| status(t) == DIBUKA) {
                return Ok(t.id);
            }
            match berikutnya {
                Some(n) => Err(format!(
                    "Belum ada tahap pendaftaran yang dibuka. {} dibuka {} - {}.",
                    n.nama,
                    tgl(n.tgl_mulai),
                    tgl(n.tgl_selesai)
                )),
                None => {
                    Err("Seluruh tahap pendaftaran pada gelombang ini sudah berakhir".to_string())
                }
            }
        }
    }
}

/// Periksa daftar tahap yang akan disimpan admin: jumlah, nama, urutan tanggal tanpa tumpang
/// tindih, dan berada di dalam rentang gelombang.
pub fn validasi_tahap(
    tahap: &[TahapInput],
    gelombang_mulai: NaiveDate,
    gelombang_selesai: NaiveDate,
) -> Result<(), String> {
    if tahap.len() > TAHAP_MAKS {
        return Err(format!("Maksimal {TAHAP_MAKS} tahap per gelombang"));
    }
    for (i, t) in tahap.iter().enumerate() {
        let no = i + 1;
        let nama = t.nama.trim();
        if nama.is_empty() || nama.chars().count() > 100 {
            return Err(format!(
                "Nama tahap {no} wajib diisi (maksimal 100 karakter)"
            ));
        }
        if t.tgl_mulai > t.tgl_selesai {
            return Err(format!(
                "Tahap {no}: tanggal mulai harus sebelum tanggal selesai"
            ));
        }
        if t.tgl_mulai < gelombang_mulai || t.tgl_selesai > gelombang_selesai {
            return Err(format!(
                "Tahap {no} harus berada dalam periode gelombang ({} - {}). Ubah tanggal gelombang bila perlu",
                tgl(gelombang_mulai),
                tgl(gelombang_selesai)
            ));
        }
        if i > 0 && t.tgl_mulai <= tahap[i - 1].tgl_selesai {
            return Err(format!(
                "Tahap {no} harus dimulai setelah tahap {} berakhir (tidak boleh tumpang tindih)",
                no - 1
            ));
        }
    }
    Ok(())
}

pub async fn daftar_tahap(
    pool: &PgPool,
    gelombang_id: Uuid,
) -> Result<Vec<TahapGelombang>, AppError> {
    Ok(sqlx::query_as::<_, TahapGelombang>(
        "SELECT id, gelombang_id, nomor_tahap, nama, tgl_mulai, tgl_selesai
         FROM tahap_gelombang WHERE gelombang_id = $1 ORDER BY nomor_tahap",
    )
    .bind(gelombang_id)
    .fetch_all(pool)
    .await?)
}

pub async fn daftar_tahap_banyak(
    pool: &PgPool,
    gelombang_ids: &[Uuid],
) -> Result<Vec<TahapGelombang>, AppError> {
    Ok(sqlx::query_as::<_, TahapGelombang>(
        "SELECT id, gelombang_id, nomor_tahap, nama, tgl_mulai, tgl_selesai
         FROM tahap_gelombang WHERE gelombang_id = ANY($1) ORDER BY gelombang_id, nomor_tahap",
    )
    .bind(gelombang_ids)
    .fetch_all(pool)
    .await?)
}

/// Pastikan gelombang menerima pendaftaran dan tentukan tahapnya.
/// * Gelombang tanpa tahap: harus berstatus DIBUKA dan hari ini dalam tanggal gelombang
///   (perilaku lama); hasilnya `None`.
/// * Gelombang bertahap: status DIBUKA dan tahap yang dipilih (atau yang sedang dibuka)
///   harus berada dalam rentang tanggalnya; hasilnya `Some(id tahap)`.
pub async fn pastikan_tahap(
    pool: &PgPool,
    gelombang_id: Uuid,
    diminta: Option<Uuid>,
) -> Result<Option<Uuid>, AppError> {
    let dasar: Option<(bool, bool)> = sqlx::query_as(
        "SELECT (status = 'DIBUKA'),
                (CURRENT_DATE >= tgl_mulai AND CURRENT_DATE <= tgl_selesai)
         FROM gelombang WHERE id = $1",
    )
    .bind(gelombang_id)
    .fetch_optional(pool)
    .await?;
    let tutup = || {
        AppError::BadRequest(
            "Gelombang pendaftaran yang dipilih sedang tidak aktif atau sudah ditutup".to_string(),
        )
    };
    let Some((dibuka, dalam_tanggal)) = dasar else {
        return Err(tutup());
    };
    let daftar = daftar_tahap(pool, gelombang_id).await?;
    if daftar.is_empty() {
        if !(dibuka && dalam_tanggal) {
            return Err(tutup());
        }
        return Ok(None);
    }
    if !dibuka {
        return Err(tutup());
    }
    pilih_tahap(hari_ini_wib(), &daftar, diminta)
        .map(Some)
        .map_err(AppError::BadRequest)
}

/// Catat tahap tempat calon mendaftar.
pub async fn simpan_ke_pendaftar(
    pool: &PgPool,
    pendaftar_id: Uuid,
    tahap_id: Option<Uuid>,
) -> Result<(), AppError> {
    sqlx::query("UPDATE pendaftar SET tahap_gelombang_id = $2 WHERE id = $1")
        .bind(pendaftar_id)
        .bind(tahap_id)
        .execute(pool)
        .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Endpoint admin: /api/admin/konfigurasi/gelombang/{id}/tahap
// ---------------------------------------------------------------------------

#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/gelombang/{id}/tahap",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID gelombang")),
    responses((status = 200, description = "Tahap pendaftaran gelombang", body = Vec<TahapResponse>))
)]
pub async fn list_tahap_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let hari_ini = hari_ini_wib();
    let daftar = daftar_tahap(&state.db, id).await?;
    Ok(Json(
        daftar
            .iter()
            .map(|t| t.ke_response(hari_ini))
            .collect::<Vec<_>>(),
    ))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/gelombang/{id}/tahap",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID gelombang")),
    request_body = SimpanTahapRequest,
    responses((status = 200, description = "Tahap tersimpan (menggantikan daftar lama)", body = Vec<TahapResponse>))
)]
pub async fn simpan_tahap_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<SimpanTahapRequest>,
) -> Result<impl IntoResponse, AppError> {
    let rentang: Option<(NaiveDate, NaiveDate)> = sqlx::query_as(
        "SELECT (tgl_mulai AT TIME ZONE 'Asia/Jakarta')::date,
                (tgl_selesai AT TIME ZONE 'Asia/Jakarta')::date
         FROM gelombang WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;
    let Some((g_mulai, g_selesai)) = rentang else {
        return Err(AppError::NotFound("Gelombang tidak ditemukan".to_string()));
    };
    validasi_tahap(&req.tahap, g_mulai, g_selesai).map_err(AppError::BadRequest)?;

    let mut tx = state.db.begin().await?;
    let n = req.tahap.len() as i32;
    // Tahap yang dihapus: pendaftar yang terkait otomatis kehilangan rujukan tahap (SET NULL)
    sqlx::query("DELETE FROM tahap_gelombang WHERE gelombang_id = $1 AND nomor_tahap > $2")
        .bind(id)
        .bind(n)
        .execute(&mut *tx)
        .await?;
    for (i, t) in req.tahap.iter().enumerate() {
        sqlx::query(
            "INSERT INTO tahap_gelombang (gelombang_id, nomor_tahap, nama, tgl_mulai, tgl_selesai)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (gelombang_id, nomor_tahap) DO UPDATE
             SET nama = EXCLUDED.nama, tgl_mulai = EXCLUDED.tgl_mulai,
                 tgl_selesai = EXCLUDED.tgl_selesai, updated_at = NOW()",
        )
        .bind(id)
        .bind(i as i32 + 1)
        .bind(t.nama.trim())
        .bind(t.tgl_mulai)
        .bind(t.tgl_selesai)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    let hari_ini = hari_ini_wib();
    let daftar = daftar_tahap(&state.db, id).await?;
    Ok(Json(
        daftar
            .iter()
            .map(|t| t.ke_response(hari_ini))
            .collect::<Vec<_>>(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    fn tahap(no: i32, mulai: &str, selesai: &str) -> TahapGelombang {
        TahapGelombang {
            id: Uuid::new_v4(),
            gelombang_id: Uuid::nil(),
            nomor_tahap: no,
            nama: format!("Tahap {no}"),
            tgl_mulai: d(mulai),
            tgl_selesai: d(selesai),
        }
    }

    fn dua_tahap() -> Vec<TahapGelombang> {
        vec![
            tahap(1, "2026-11-01", "2026-11-30"),
            tahap(2, "2026-12-01", "2026-12-31"),
        ]
    }

    #[test]
    fn status_menurut_tanggal() {
        let (m, s) = (d("2026-11-01"), d("2026-11-30"));
        assert_eq!(status_tahap(d("2026-10-31"), m, s), BELUM_DIBUKA);
        assert_eq!(status_tahap(d("2026-11-01"), m, s), DIBUKA);
        assert_eq!(status_tahap(d("2026-11-30"), m, s), DIBUKA);
        assert_eq!(status_tahap(d("2026-12-01"), m, s), BERAKHIR);
    }

    #[test]
    fn tahap_1_dipakai_selama_dibuka_lalu_beralih_ke_tahap_2() {
        let t = dua_tahap();
        assert_eq!(pilih_tahap(d("2026-11-15"), &t, None), Ok(t[0].id));
        // Tahap 1 lewat: otomatis tahap 2 yang dibuka
        assert_eq!(pilih_tahap(d("2026-12-02"), &t, None), Ok(t[1].id));
    }

    #[test]
    fn tahap_1_yang_sudah_lewat_ditolak_dengan_petunjuk_tahap_2() {
        let mut t = dua_tahap();
        t[1].tgl_mulai = d("2026-12-05"); // tahap 2 belum dibuka pada 2 Des
        let err = pilih_tahap(d("2026-12-02"), &t, Some(t[0].id)).unwrap_err();
        assert!(
            err.contains("Tahap 1 sudah ditutup pada 30/11/2026"),
            "{err}"
        );
        assert!(
            err.contains("Tahap 2") && err.contains("05/12/2026"),
            "{err}"
        );
    }

    #[test]
    fn tahap_1_lewat_dan_tahap_2_dibuka_diarahkan_ke_tahap_2() {
        let t = dua_tahap();
        let err = pilih_tahap(d("2026-12-02"), &t, Some(t[0].id)).unwrap_err();
        assert!(
            err.contains("Tahap 1 sudah ditutup pada 30/11/2026"),
            "{err}"
        );
        assert!(
            err.contains("Silakan pilih Tahap 2 yang sedang dibuka"),
            "{err}"
        );
    }

    #[test]
    fn tahap_belum_dibuka_dan_tidak_ada_tahap_terbuka() {
        let t = dua_tahap();
        let err = pilih_tahap(d("2026-11-15"), &t, Some(t[1].id)).unwrap_err();
        assert!(err.contains("baru dibuka pada 01/12/2026"), "{err}");
        let err = pilih_tahap(d("2026-10-01"), &t, None).unwrap_err();
        assert!(
            err.contains("Belum ada tahap") && err.contains("Tahap 1"),
            "{err}"
        );
        assert!(
            pilih_tahap(d("2027-01-15"), &t, None)
                .unwrap_err()
                .contains("sudah berakhir")
        );
        assert!(pilih_tahap(d("2026-11-15"), &t, Some(Uuid::new_v4())).is_err());
    }

    fn masuk(nama: &str, m: &str, s: &str) -> TahapInput {
        TahapInput {
            nama: nama.into(),
            tgl_mulai: d(m),
            tgl_selesai: d(s),
        }
    }

    #[test]
    fn validasi_tahap_admin() {
        let (gm, gs) = (d("2026-11-01"), d("2026-12-31"));
        let ok = [
            masuk("Tahap 1", "2026-11-01", "2026-11-30"),
            masuk("Tahap 2", "2026-12-01", "2026-12-31"),
        ];
        assert!(validasi_tahap(&ok, gm, gs).is_ok());
        assert!(validasi_tahap(&[], gm, gs).is_ok(), "boleh dikosongkan");
        let tumpang = [
            masuk("A", "2026-11-01", "2026-11-30"),
            masuk("B", "2026-11-30", "2026-12-31"),
        ];
        assert!(
            validasi_tahap(&tumpang, gm, gs)
                .unwrap_err()
                .contains("tumpang tindih")
        );
        let luar = [masuk("A", "2026-10-15", "2026-11-30")];
        assert!(
            validasi_tahap(&luar, gm, gs)
                .unwrap_err()
                .contains("periode gelombang")
        );
        let terbalik = [masuk("A", "2026-11-20", "2026-11-10")];
        assert!(validasi_tahap(&terbalik, gm, gs).is_err());
        assert!(validasi_tahap(&[masuk("  ", "2026-11-01", "2026-11-02")], gm, gs).is_err());
        let banyak: Vec<_> = (0..7)
            .map(|_| masuk("X", "2026-11-01", "2026-11-02"))
            .collect();
        assert!(validasi_tahap(&banyak, gm, gs).is_err());
    }
}
