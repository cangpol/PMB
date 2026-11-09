//! Penomoran pendaftaran calon mahasiswa.
//!
//! * Nomor sementara (saat mendaftar): `W` + tahun 2 digit + urut 4 digit + `-` + kode prodi 1 +
//!   kode prodi 2, contoh `W270001-3132`. Tanpa pilihan prodi 2 kodenya `00` (non prodi).
//! * Nomor asli (formulir sudah dibayar, termasuk jalur beasiswa/gratis): tanpa `W`, contoh
//!   `270031-3132`. Nomor sementara disimpan di `pendaftar.nomor_sementara` sebagai riwayat.
//! * Tahun diambil dari tahun masuk gelombang (awal tahun akademik gelombang itu).
//!
//! Nomor urut memakai pencacah atomik (`nim_counter_umum`) terpisah untuk nomor sementara dan
//! nomor asli di tiap tahun, jadi tidak bentrok walau dua calon mendaftar bersamaan.

use sqlx::PgConnection;
use uuid::Uuid;

use crate::error::AppError;

/// Kode prodi pada nomor bila tidak ada pilihan prodi 2 ("non prodi").
pub const KODE_NON_PRODI: &str = "00";
/// Cadangan bila prodi belum punya kode (jangan sampai pendaftaran gagal); dicatat di log.
const KODE_BELUM_DIATUR: &str = "99";

/// Kode prodi 2 digit bawaan menurut `kode_prodi`, dipakai bila kolom `kode_angka` masih kosong.
pub fn kode_angka_bawaan(kode_prodi: &str) -> Option<&'static str> {
    Some(match kode_prodi {
        "MNJ" => "11",
        "AKT" => "12",
        "IF" => "21",
        "SI" => "22",
        "SE" => "23",
        "BIG" => "31",
        "PAR" => "32",
        "K3" => "41",
        "FIS" => "42",
        "KEP" => "43",
        _ => return None,
    })
}

/// Bentuk nomor sementara, mis. `W270001-3132`.
pub fn format_sementara(tahun: i32, urut: i64, kode1: &str, kode2: &str) -> String {
    format!("W{:02}{:04}-{kode1}{kode2}", tahun % 100, urut)
}

/// Bentuk nomor asli, mis. `270031-3132`.
pub fn format_resmi(tahun: i32, urut: i64, kode1: &str, kode2: &str) -> String {
    format!("{:02}{:04}-{kode1}{kode2}", tahun % 100, urut)
}

/// Apakah nomor ini masih nomor sementara (diawali W)?
pub fn nomor_sementara(nomor: &str) -> bool {
    nomor.starts_with('W')
}

/// Ganti bagian kode prodi (setelah `-`) pada nomor, mis. `W270001-3132` -> `W270001-2100`.
pub fn ganti_sufiks(nomor: &str, kode1: &str, kode2: &str) -> String {
    let awal = nomor.split('-').next().unwrap_or(nomor);
    format!("{awal}-{kode1}{kode2}")
}

/// Tahun masuk gelombang: tahun mulai tahun akademiknya; bila gelombang belum terhubung ke
/// tahun akademik, tahun berakhirnya gelombang.
pub async fn tahun_masuk(conn: &mut PgConnection, gelombang_id: Uuid) -> Result<i32, AppError> {
    let tahun: Option<i32> = sqlx::query_scalar(
        "SELECT COALESCE(EXTRACT(YEAR FROM ta.tgl_mulai), EXTRACT(YEAR FROM g.tgl_selesai))::int
         FROM gelombang g
         LEFT JOIN tahun_akademik ta ON ta.id = g.tahun_akademik_id
         WHERE g.id = $1",
    )
    .bind(gelombang_id)
    .fetch_optional(&mut *conn)
    .await?
    .flatten();
    tahun.ok_or_else(|| AppError::NotFound("Gelombang pendaftaran tidak ditemukan".to_string()))
}

/// Tahun masuk untuk pratinjau: gelombang aktif terbaru, atau tahun berjalan bila tidak ada.
pub async fn tahun_masuk_aktif(conn: &mut PgConnection) -> Result<i32, AppError> {
    let tahun: Option<i32> = sqlx::query_scalar(
        "SELECT COALESCE(EXTRACT(YEAR FROM ta.tgl_mulai), EXTRACT(YEAR FROM g.tgl_selesai))::int
         FROM gelombang g
         LEFT JOIN tahun_akademik ta ON ta.id = g.tahun_akademik_id
         WHERE g.is_active = TRUE
         ORDER BY g.tgl_mulai DESC LIMIT 1",
    )
    .fetch_optional(&mut *conn)
    .await?
    .flatten();
    Ok(tahun.unwrap_or_else(|| {
        use chrono::Datelike;
        chrono::Utc::now().year()
    }))
}

/// Kode 2 digit sebuah prodi (kolom `kode_angka`, atau bawaan menurut `kode_prodi`).
pub async fn kode_prodi(conn: &mut PgConnection, prodi_id: Uuid) -> Result<String, AppError> {
    let baris: Option<(Option<String>, String)> =
        sqlx::query_as("SELECT kode_angka, kode_prodi FROM program_studi WHERE id = $1")
            .bind(prodi_id)
            .fetch_optional(&mut *conn)
            .await?;
    let Some((kode_angka, kode_prodi)) = baris else {
        return Err(AppError::NotFound(
            "Program studi tidak ditemukan".to_string(),
        ));
    };
    if let Some(k) = kode_angka.filter(|k| !k.trim().is_empty()) {
        return Ok(k);
    }
    if let Some(k) = kode_angka_bawaan(&kode_prodi) {
        return Ok(k.to_string());
    }
    tracing::warn!(
        "Prodi {kode_prodi} belum punya kode angka 2 digit; nomor pendaftaran memakai {KODE_BELUM_DIATUR}"
    );
    Ok(KODE_BELUM_DIATUR.to_string())
}

/// Pasangan kode prodi pilihan 1 dan 2 (`00` bila tidak ada pilihan 2).
pub async fn kode_pasangan(
    conn: &mut PgConnection,
    prodi_1: Uuid,
    prodi_2: Option<Uuid>,
) -> Result<(String, String), AppError> {
    let k1 = kode_prodi(conn, prodi_1).await?;
    let k2 = match prodi_2 {
        Some(id) => kode_prodi(conn, id).await?,
        None => KODE_NON_PRODI.to_string(),
    };
    Ok((k1, k2))
}

async fn urut_berikutnya(conn: &mut PgConnection, kunci: &str) -> Result<i64, AppError> {
    Ok(sqlx::query_scalar(
        "INSERT INTO nim_counter_umum (kunci, last_number) VALUES ($1, 1)
         ON CONFLICT (kunci) DO UPDATE
         SET last_number = nim_counter_umum.last_number + 1, updated_at = NOW()
         RETURNING last_number::bigint",
    )
    .bind(kunci)
    .fetch_one(&mut *conn)
    .await?)
}

/// Terbitkan nomor sementara baru untuk calon yang baru mendaftar.
pub async fn buat_sementara(
    conn: &mut PgConnection,
    gelombang_id: Uuid,
    prodi_1: Uuid,
    prodi_2: Option<Uuid>,
) -> Result<String, AppError> {
    let tahun = tahun_masuk(conn, gelombang_id).await?;
    let (k1, k2) = kode_pasangan(conn, prodi_1, prodi_2).await?;
    let urut = urut_berikutnya(conn, &format!("NOMOR_SEMENTARA:{:02}", tahun % 100)).await?;
    Ok(format_sementara(tahun, urut, &k1, &k2))
}

/// Nomor untuk pendaftaran berstatus DRAFT. Calon baru mendapat nomor sementara; calon yang
/// sudah punya nomor sementara dan mengubah pilihan prodi mendapat kode prodi baru pada nomor
/// yang sama (tahun dan nomor urut tetap). Nomor asli tidak pernah diubah.
pub async fn nomor_draft(
    conn: &mut PgConnection,
    ada: Option<(Uuid, String)>,
    gelombang_id: Uuid,
    prodi_1: Uuid,
    prodi_2: Option<Uuid>,
) -> Result<String, AppError> {
    let Some((id, nomor)) = ada else {
        return buat_sementara(conn, gelombang_id, prodi_1, prodi_2).await;
    };
    if !nomor_sementara(&nomor) {
        return Ok(nomor);
    }
    let (k1, k2) = kode_pasangan(conn, prodi_1, prodi_2).await?;
    let baru = ganti_sufiks(&nomor, &k1, &k2);
    if baru != nomor {
        sqlx::query(
            "UPDATE pendaftar SET nomor_pendaftaran = $2, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .bind(&baru)
        .execute(&mut *conn)
        .await?;
    }
    Ok(baru)
}

/// Nomor sementara tanpa pilihan prodi (jalur lama `submit_biodata`): kode prodi `0000`.
pub async fn buat_sementara_tanpa_prodi(
    conn: &mut PgConnection,
    gelombang_id: Uuid,
) -> Result<String, AppError> {
    let tahun = tahun_masuk(conn, gelombang_id).await?;
    let urut = urut_berikutnya(conn, &format!("NOMOR_SEMENTARA:{:02}", tahun % 100)).await?;
    Ok(format_sementara(
        tahun,
        urut,
        KODE_NON_PRODI,
        KODE_NON_PRODI,
    ))
}

/// Terbitkan nomor asli setelah formulir dibayar. Idempoten: bila nomor asli sudah terbit tidak
/// ada yang berubah (mengembalikan `None`). Nomor sebelumnya (W...) disimpan di
/// `nomor_sementara`, dan nomor peserta CBT ikut diperbarui.
pub async fn terbitkan_resmi(
    conn: &mut PgConnection,
    pendaftar_id: Uuid,
) -> Result<Option<String>, AppError> {
    let baris: Option<(String, Option<String>, Uuid, Uuid, Option<Uuid>)> = sqlx::query_as(
        "SELECT nomor_pendaftaran, nomor_sementara, gelombang_id, prodi_pilihan_1, prodi_pilihan_2
         FROM pendaftar WHERE id = $1 FOR UPDATE",
    )
    .bind(pendaftar_id)
    .fetch_optional(&mut *conn)
    .await?;
    let Some((lama, riwayat, gelombang_id, p1, p2)) = baris else {
        return Ok(None);
    };
    if riwayat.is_some() {
        return Ok(None);
    }
    let tahun = tahun_masuk(conn, gelombang_id).await?;
    let (k1, k2) = kode_pasangan(conn, p1, p2).await?;
    let urut = urut_berikutnya(conn, &format!("NOMOR_RESMI:{:02}", tahun % 100)).await?;
    let resmi = format_resmi(tahun, urut, &k1, &k2);

    sqlx::query(
        "UPDATE pendaftar SET nomor_sementara = nomor_pendaftaran, nomor_pendaftaran = $2,
                updated_at = NOW() WHERE id = $1",
    )
    .bind(pendaftar_id)
    .bind(&resmi)
    .execute(&mut *conn)
    .await?;
    sqlx::query(
        "UPDATE peserta_sesi SET nomor_peserta = $2 WHERE pendaftar_id = $1 AND nomor_peserta = $3",
    )
    .bind(pendaftar_id)
    .bind(&resmi)
    .bind(&lama)
    .execute(&mut *conn)
    .await?;
    Ok(Some(resmi))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_sementara_dan_resmi() {
        assert_eq!(format_sementara(2027, 1, "31", "32"), "W270001-3132");
        assert_eq!(
            format_sementara(2027, 1, "31", KODE_NON_PRODI),
            "W270001-3100"
        );
        assert_eq!(format_resmi(2027, 31, "31", "32"), "270031-3132");
        assert_eq!(format_resmi(2030, 12345, "11", "00"), "3012345-1100");
    }

    #[test]
    fn kode_bawaan_sesuai_ketentuan() {
        for (kode, angka) in [
            ("MNJ", "11"),
            ("AKT", "12"),
            ("IF", "21"),
            ("SI", "22"),
            ("SE", "23"),
            ("BIG", "31"),
            ("PAR", "32"),
            ("K3", "41"),
            ("FIS", "42"),
            ("KEP", "43"),
        ] {
            assert_eq!(kode_angka_bawaan(kode), Some(angka), "{kode}");
        }
        assert_eq!(kode_angka_bawaan("XYZ"), None);
    }

    #[test]
    fn ganti_sufiks_dan_deteksi_sementara() {
        assert_eq!(
            ganti_sufiks("W270001-3132", "21", KODE_NON_PRODI),
            "W270001-2100"
        );
        assert!(nomor_sementara("W270001-3132"));
        assert!(!nomor_sementara("270031-3132"));
        assert!(!nomor_sementara("PMB-2026-0001"));
    }
}
