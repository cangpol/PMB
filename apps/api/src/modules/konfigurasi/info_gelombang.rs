//! Informasi gelombang untuk halaman depan (deskripsi dan batas daftar ulang). Diedit admin dan langsung tampil di beranda & halaman jadwal seleksi.

use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{error::AppError, extractors::RequireAdmin, state::AppState};

#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct InfoGelombang {
    pub deskripsi: Option<String>,
    pub info_daftar_ulang: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct InfoGelombangBaris {
    pub id: Uuid,
    pub deskripsi: Option<String>,
    pub info_daftar_ulang: Option<String>,
}

impl InfoGelombangBaris {
    pub fn ke_info(self) -> (Uuid, InfoGelombang) {
        (
            self.id,
            InfoGelombang {
                deskripsi: self.deskripsi,
                info_daftar_ulang: self.info_daftar_ulang,
            },
        )
    }
}

pub async fn info_banyak(
    pool: &PgPool,
    ids: &[Uuid],
) -> Result<Vec<(Uuid, InfoGelombang)>, AppError> {
    let baris = sqlx::query_as::<_, InfoGelombangBaris>(
        "SELECT id, deskripsi, info_daftar_ulang FROM gelombang WHERE id = ANY($1)",
    )
    .bind(ids)
    .fetch_all(pool)
    .await?;
    Ok(baris.into_iter().map(InfoGelombangBaris::ke_info).collect())
}

fn bersih(v: &Option<String>, maks: usize, nama: &str) -> Result<Option<String>, AppError> {
    let t = v.as_deref().map(str::trim).filter(|t| !t.is_empty());
    if let Some(t) = t {
        if t.chars().count() > maks {
            return Err(AppError::BadRequest(format!(
                "{nama} maksimal {maks} karakter"
            )));
        }
    }
    Ok(t.map(str::to_string))
}

/// Rapikan & periksa isian admin.
pub fn periksa(req: &InfoGelombang) -> Result<InfoGelombang, AppError> {
    Ok(InfoGelombang {
        deskripsi: bersih(&req.deskripsi, 600, "Deskripsi")?,
        info_daftar_ulang: bersih(&req.info_daftar_ulang, 255, "Batas daftar ulang")?,
    })
}

pub async fn get_info_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let info = info_banyak(&state.db, &[id])
        .await?
        .into_iter()
        .next()
        .map(|(_, i)| i)
        .ok_or_else(|| AppError::NotFound("Gelombang tidak ditemukan".to_string()))?;
    Ok(Json(info))
}

pub async fn simpan_info_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<InfoGelombang>,
) -> Result<impl IntoResponse, AppError> {
    let info = periksa(&req)?;
    let n =
        sqlx::query("UPDATE gelombang SET deskripsi = $2, info_daftar_ulang = $3 WHERE id = $1")
            .bind(id)
            .bind(&info.deskripsi)
            .bind(&info.info_daftar_ulang)
            .execute(&state.db)
            .await?
            .rows_affected();
    if n == 0 {
        return Err(AppError::NotFound("Gelombang tidak ditemukan".to_string()));
    }
    Ok(Json(info))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn periksa_merapikan_dan_membatasi() {
        let ok = periksa(&InfoGelombang {
            deskripsi: Some("  Awal  ".into()),
            info_daftar_ulang: Some("   ".into()),
        })
        .unwrap();
        assert_eq!(ok.deskripsi.as_deref(), Some("Awal"));
        assert_eq!(ok.info_daftar_ulang, None);
        let panjang = InfoGelombang {
            deskripsi: Some("x".repeat(601)),
            ..Default::default()
        };
        assert!(periksa(&panjang).is_err());
    }
}
