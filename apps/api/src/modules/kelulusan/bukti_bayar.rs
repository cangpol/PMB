//! Nomor registrasi daftar ulang.
//!
//! Unggah & verifikasi bukti bayar daftar ulang kini ditangani modul generik
//! `pembayaran::bukti` (dipakai bersama pembayaran formulir).

use chrono::Utc;
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

// ---------------------------------------------------------------------------
// Nomor registrasi daftar ulang
// ---------------------------------------------------------------------------

/// Mengembalikan nomor registrasi calon; dibuat sekali (idempoten) dengan format
/// `REG-<tahun>-<6 karakter>` tanpa karakter ambigu (0/O, 1/I).
pub async fn ensure_nomor_registrasi(
    pool: &PgPool,
    pendaftar_id: Uuid,
) -> Result<String, AppError> {
    if let Some((Some(nr),)) = sqlx::query_as::<_, (Option<String>,)>(
        "SELECT nomor_registrasi FROM hasil_kelulusan WHERE pendaftar_id = $1",
    )
    .bind(pendaftar_id)
    .fetch_optional(pool)
    .await?
    {
        return Ok(nr);
    }

    const ALFABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    use chrono::Datelike;
    let tahun = Utc::now().year();
    for _ in 0..10 {
        let kode: String = {
            let mut rng = rand::thread_rng();
            (0..6)
                .map(|_| ALFABET[rng.gen_range(0..ALFABET.len())] as char)
                .collect()
        };
        let kandidat = format!("REG-{}-{}", tahun, kode);
        // WHERE nomor_registrasi IS NULL menjaga agar tidak menimpa pada akses paralel
        let res = sqlx::query(
            "UPDATE hasil_kelulusan SET nomor_registrasi = $1, updated_at = NOW()
             WHERE pendaftar_id = $2 AND nomor_registrasi IS NULL",
        )
        .bind(&kandidat)
        .bind(pendaftar_id)
        .execute(pool)
        .await;
        match res {
            Ok(r) if r.rows_affected() == 1 => return Ok(kandidat),
            Ok(_) => {
                // Sudah diisi proses lain
                let (nr,): (Option<String>,) = sqlx::query_as(
                    "SELECT nomor_registrasi FROM hasil_kelulusan WHERE pendaftar_id = $1",
                )
                .bind(pendaftar_id)
                .fetch_one(pool)
                .await?;
                if let Some(nr) = nr {
                    return Ok(nr);
                }
            }
            Err(_) => continue, // bentrok unik: coba kode lain
        }
    }
    Err(AppError::Internal(
        "Gagal membuat nomor registrasi, coba lagi".to_string(),
    ))
}
