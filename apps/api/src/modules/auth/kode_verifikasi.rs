//! Verifikasi email calon dengan kode acak 6 digit yang dikirim lewat email.
//!
//! Aturan keamanan:
//! - Kode dibangkitkan dari sumber acak kriptografis (OsRng), 000000–999999.
//! - Hanya hash yang disimpan: SHA-256(id_token || ":" || kode). Id token unik,
//!   sehingga dua pengguna dengan kode sama tidak menghasilkan hash yang sama.
//! - Berlaku 15 menit, maksimal 5 kali salah per kode; setelah itu harus minta kode baru.
//! - Kirim ulang paling cepat 60 detik sekali dan maksimal 5 kode per jam per akun.
//! - Kode baru membatalkan semua kode lama yang belum dipakai.

use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, security::MailSender};

pub const PANJANG_KODE: usize = 6;
pub const MASA_BERLAKU_MENIT: i64 = 15;
pub const MAKS_PERCOBAAN: i32 = 5;
pub const JEDA_KIRIM_ULANG_DETIK: i64 = 60;
pub const MAKS_KODE_PER_JAM: i64 = 5;
const TIPE: &str = "VERIFIKASI_EMAIL";

/// Kode 6 digit dari sumber acak kriptografis.
pub fn buat_kode() -> String {
    let n: u32 = rand::rngs::OsRng.gen_range(0..1_000_000);
    format!("{n:06}")
}

pub fn hash_kode(token_id: Uuid, kode: &str) -> String {
    let mut h = Sha256::new();
    h.update(token_id.as_bytes());
    h.update(b":");
    h.update(kode.as_bytes());
    format!("{:x}", h.finalize())
}

/// Bandingkan dua string dengan waktu konstan (mencegah serangan timing).
fn sama_waktu_konstan(a: &str, b: &str) -> bool {
    a.len() == b.len()
        && a.bytes()
            .zip(b.bytes())
            .fold(0u8, |acc, (x, y)| acc | (x ^ y))
            == 0
}

/// Format kode yang diterima: tepat 6 digit (spasi diabaikan).
pub fn normalisasi_kode(input: &str) -> Option<String> {
    let k: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    (k.len() == PANJANG_KODE && k.chars().all(|c| c.is_ascii_digit())).then_some(k)
}

fn isi_email(nama: &str, kode: &str) -> String {
    format!(
        "Halo {nama},\n\n\
         Kode verifikasi email akun PMB Universitas Pignatelli Triputra Anda:\n\n\
         {kode}\n\n\
         Masukkan kode ini di halaman verifikasi. Kode berlaku {MASA_BERLAKU_MENIT} menit.\n\n\
         JANGAN berikan kode ini kepada siapa pun, termasuk yang mengaku panitia PMB.\n\
         Bila Anda tidak merasa mendaftar, abaikan email ini.\n\n\
         Salam,\nPanitia PMB Universitas Pignatelli Triputra"
    )
}

/// Buat kode baru (membatalkan kode lama) lalu kirim ke email pengguna.
/// Mengembalikan galat bila email gagal terkirim, agar pengguna tahu harus kirim ulang.
pub async fn terbitkan_dan_kirim(
    pool: &PgPool,
    mail: &dyn MailSender,
    user_id: Uuid,
    email: &str,
    nama: &str,
) -> Result<(), AppError> {
    let kode = buat_kode();
    let token_id = Uuid::new_v4();
    let mut tx = pool.begin().await?;
    sqlx::query(
        "UPDATE token_verifikasi SET used_at = NOW()
         WHERE user_id = $1 AND tipe = $2 AND used_at IS NULL",
    )
    .bind(user_id)
    .bind(TIPE)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO token_verifikasi (id, user_id, token_hash, tipe, expires_at)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(token_id)
    .bind(user_id)
    .bind(hash_kode(token_id, &kode))
    .bind(TIPE)
    .bind(Utc::now() + Duration::minutes(MASA_BERLAKU_MENIT))
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    mail.send_email(
        email,
        &format!("{kode} adalah kode verifikasi PMB Anda"),
        &isi_email(nama, &kode),
    )
    .await
}

/// Kirim ulang kode dengan jeda & batas per jam.
pub async fn kirim_ulang(
    pool: &PgPool,
    mail: &dyn MailSender,
    user_id: Uuid,
) -> Result<(), AppError> {
    let (email, nama, terverifikasi): (String, String, bool) =
        sqlx::query_as("SELECT email, nama_lengkap, is_email_verified FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound("Akun tidak ditemukan".to_string()))?;
    if terverifikasi {
        return Err(AppError::BadRequest(
            "Email Anda sudah terverifikasi.".to_string(),
        ));
    }

    let (terakhir, jumlah_sejam): (Option<DateTime<Utc>>, i64) = sqlx::query_as(
        "SELECT MAX(created_at),
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')
         FROM token_verifikasi WHERE user_id = $1 AND tipe = $2",
    )
    .bind(user_id)
    .bind(TIPE)
    .fetch_one(pool)
    .await?;
    if let Some(t) = terakhir {
        let lewat = (Utc::now() - t).num_seconds();
        if lewat < JEDA_KIRIM_ULANG_DETIK {
            return Err(AppError::TooManyRequests(format!(
                "Tunggu {} detik sebelum meminta kode baru.",
                JEDA_KIRIM_ULANG_DETIK - lewat
            )));
        }
    }
    if jumlah_sejam >= MAKS_KODE_PER_JAM {
        return Err(AppError::TooManyRequests(
            "Batas permintaan kode tercapai. Coba lagi dalam 1 jam.".to_string(),
        ));
    }
    terbitkan_dan_kirim(pool, mail, user_id, &email, &nama).await
}

/// Periksa kode. Benar -> email terverifikasi. Salah -> hitung percobaan.
pub async fn verifikasi(pool: &PgPool, user_id: Uuid, input: &str) -> Result<(), AppError> {
    let kode = normalisasi_kode(input).ok_or_else(|| {
        AppError::BadRequest(format!("Kode verifikasi harus {PANJANG_KODE} digit angka."))
    })?;

    let sudah: Option<bool> =
        sqlx::query_scalar("SELECT is_email_verified FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(pool)
            .await?;
    if sudah == Some(true) {
        return Ok(());
    }

    let mut tx = pool.begin().await?;
    // Kunci baris token agar percobaan paralel tidak melewati batas
    let token: Option<(Uuid, String, DateTime<Utc>, i32)> = sqlx::query_as(
        "SELECT id, token_hash, expires_at, percobaan FROM token_verifikasi
         WHERE user_id = $1 AND tipe = $2 AND used_at IS NULL
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE",
    )
    .bind(user_id)
    .bind(TIPE)
    .fetch_optional(&mut *tx)
    .await?;

    let minta_baru = "Minta kode baru dengan tombol \"Kirim ulang kode\".";
    let Some((token_id, hash, kedaluwarsa, percobaan)) = token else {
        return Err(AppError::BadRequest(format!(
            "Tidak ada kode verifikasi yang aktif. {minta_baru}"
        )));
    };
    if kedaluwarsa <= Utc::now() {
        return Err(AppError::BadRequest(format!(
            "Kode verifikasi sudah kedaluwarsa. {minta_baru}"
        )));
    }
    if percobaan >= MAKS_PERCOBAAN {
        return Err(AppError::TooManyRequests(format!(
            "Terlalu banyak percobaan salah. {minta_baru}"
        )));
    }

    if !sama_waktu_konstan(&hash_kode(token_id, &kode), &hash) {
        sqlx::query("UPDATE token_verifikasi SET percobaan = percobaan + 1 WHERE id = $1")
            .bind(token_id)
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        let sisa = MAKS_PERCOBAAN - percobaan - 1;
        return Err(if sisa > 0 {
            AppError::BadRequest(format!("Kode verifikasi salah. Sisa percobaan: {sisa}."))
        } else {
            AppError::TooManyRequests(format!("Kode verifikasi salah. {minta_baru}"))
        });
    }

    sqlx::query("UPDATE token_verifikasi SET used_at = NOW() WHERE id = $1")
        .bind(token_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    tracing::info!("AUDIT: Email terverifikasi dengan kode untuk user_id: {user_id}");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kode_selalu_enam_digit() {
        for _ in 0..1000 {
            let k = buat_kode();
            assert_eq!(k.len(), 6);
            assert!(k.chars().all(|c| c.is_ascii_digit()));
        }
    }

    #[test]
    fn hash_terikat_pada_token() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        assert_eq!(hash_kode(a, "123456"), hash_kode(a, "123456"));
        assert_ne!(hash_kode(a, "123456"), hash_kode(b, "123456"));
        assert_ne!(hash_kode(a, "123456"), hash_kode(a, "123457"));
        // Kode asli tidak muncul di hash
        assert!(!hash_kode(a, "123456").contains("123456"));
    }

    #[test]
    fn normalisasi_menerima_spasi_menolak_selain_angka() {
        assert_eq!(normalisasi_kode(" 123 456 ").as_deref(), Some("123456"));
        assert_eq!(normalisasi_kode("12345"), None);
        assert_eq!(normalisasi_kode("12345a"), None);
        assert_eq!(normalisasi_kode("1234567"), None);
    }

    #[test]
    fn perbandingan_waktu_konstan() {
        assert!(sama_waktu_konstan("abc", "abc"));
        assert!(!sama_waktu_konstan("abc", "abd"));
        assert!(!sama_waktu_konstan("abc", "abcd"));
    }
}
