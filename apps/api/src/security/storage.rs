//! Penyimpanan berkas pada disk server aplikasi (folder `UPLOAD_DIR`).
//!
//! Klien tidak pernah menyentuh disk langsung. API memberi URL bertoken berumur pendek
//! (`/api/files/upload/{token}` dan `/api/files/download/{token}`) pada domain yang sama,
//! sehingga tidak ada masalah alamat internal, CORS, maupun CSP.
//! Token ditandatangani HMAC-SHA256 dan memuat metode, kunci berkas, batas ukuran, dan masa berlaku.

use std::path::{Path, PathBuf};

use chrono::{FixedOffset, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use utoipa::ToSchema;

use crate::config::AppConfig;

type HmacSha256 = Hmac<Sha256>;

/// Batas ukuran unggahan bila pemanggil tidak menentukan sendiri (25 MB).
pub const MAKS_BYTES_BAWAAN: u64 = 25 * 1024 * 1024;

#[derive(Clone, Debug)]
pub struct StorageService {
    root: PathBuf,
    secret: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignedUploadResponse {
    pub upload_url: String,
    pub file_key: String,
    pub expires_in_seconds: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PresignedDownloadResponse {
    pub download_url: String,
    pub file_key: String,
    pub expires_in_seconds: u64,
}

/// Isi token yang sudah diverifikasi.
#[derive(Debug, PartialEq, Eq)]
pub struct IsiToken {
    pub key: String,
    pub maks_bytes: u64,
}

#[derive(Debug, PartialEq, Eq)]
pub enum GalatToken {
    Tidak,
    Kedaluwarsa,
}

impl StorageService {
    pub fn new(root: impl Into<PathBuf>, secret: &str) -> Self {
        Self {
            root: root.into(),
            secret: secret.as_bytes().to_vec(),
        }
    }

    pub fn dari_config(c: &AppConfig) -> Self {
        Self::new(&c.upload_dir, &c.session_secret)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// Pastikan folder penyimpanan ada dan dapat ditulis.
    pub async fn siapkan(&self) -> Result<(), String> {
        tokio::fs::create_dir_all(&self.root)
            .await
            .map_err(|e| format!("tidak dapat membuat folder {}: {e}", self.root.display()))?;
        let uji = self.root.join(".tulis-uji");
        tokio::fs::write(&uji, b"ok")
            .await
            .map_err(|e| format!("folder {} tidak dapat ditulis: {e}", self.root.display()))?;
        let _ = tokio::fs::remove_file(uji).await;
        Ok(())
    }

    // ------------------------------------------------------------------
    // Penamaan berkas
    // ------------------------------------------------------------------

    /// Nama berkas calon: `nama-calon_jenis_YYYYMMDD-HHMMSS_kode.ext` (waktu WIB).
    /// `kode` = 8 karakter pertama ID pendaftar; dipakai untuk menjamin kepemilikan.
    pub fn nama_berkas(nama_calon: &str, jenis: &str, ext: &str, pemilik: uuid::Uuid) -> String {
        let wib = FixedOffset::east_opt(7 * 3600).expect("offset WIB valid");
        let waktu = Utc::now().with_timezone(&wib).format("%Y%m%d-%H%M%S");
        let nama = slug(nama_calon, 40);
        let nama = if nama.is_empty() {
            "calon".into()
        } else {
            nama
        };
        let jenis = slug(jenis, 30);
        let jenis = if jenis.is_empty() {
            "berkas".into()
        } else {
            jenis
        };
        let kode = &pemilik.simple().to_string()[..8];
        format!("{nama}_{jenis}_{waktu}_{kode}.{}", ext.to_lowercase())
    }

    /// Apakah nama berkas ini diterbitkan untuk pendaftar tersebut.
    pub fn milik(nama: &str, pemilik: uuid::Uuid) -> bool {
        if nama.is_empty() || nama.contains('/') || nama.contains('\\') || nama.contains("..") {
            return false;
        }
        let kode = &pemilik.simple().to_string()[..8];
        nama.contains(&format!("_{kode}."))
    }

    /// Kunci lengkap di disk dari nilai yang tersimpan di database.
    /// Nilai lama yang sudah berisi folder dipakai apa adanya.
    pub fn kunci(folder: &str, nilai_db: &str) -> String {
        if nilai_db.contains('/') {
            nilai_db.trim_start_matches('/').to_string()
        } else {
            format!("{folder}/{nilai_db}")
        }
    }

    // ------------------------------------------------------------------
    // URL bertoken
    // ------------------------------------------------------------------

    pub fn generate_presigned_put_url(
        &self,
        object_key: &str,
        expires_seconds: u64,
    ) -> PresignedUploadResponse {
        self.generate_presigned_put_url_maks(object_key, expires_seconds, MAKS_BYTES_BAWAAN)
    }

    pub fn generate_presigned_put_url_maks(
        &self,
        object_key: &str,
        expires_seconds: u64,
        maks_bytes: u64,
    ) -> PresignedUploadResponse {
        let key = object_key.trim_start_matches('/');
        let token = self.buat_token("PUT", key, maks_bytes, expires_seconds);
        PresignedUploadResponse {
            upload_url: format!("/api/files/upload/{token}"),
            file_key: key.to_string(),
            expires_in_seconds: expires_seconds,
        }
    }

    pub fn generate_presigned_get_url(
        &self,
        object_key: &str,
        expires_seconds: u64,
    ) -> PresignedDownloadResponse {
        let key = object_key.trim_start_matches('/');
        let token = self.buat_token("GET", key, 0, expires_seconds);
        PresignedDownloadResponse {
            download_url: format!("/api/files/download/{token}"),
            file_key: key.to_string(),
            expires_in_seconds: expires_seconds,
        }
    }

    /// URL publik untuk media CMS (gambar berita/banner) di bawah `cms/media/`.
    pub fn url_media_publik(key: &str) -> String {
        let sisa = key.trim_start_matches('/');
        let sisa = sisa.strip_prefix("cms/media/").unwrap_or(sisa);
        format!("/api/files/media/{sisa}")
    }

    fn tanda_tangan(&self, exp: u64, metode: &str, maks: u64, key: &str) -> Vec<u8> {
        let mut mac =
            HmacSha256::new_from_slice(&self.secret).expect("HMAC menerima kunci apa pun");
        mac.update(format!("{exp}|{metode}|{maks}|{key}").as_bytes());
        mac.finalize().into_bytes().to_vec()
    }

    fn buat_token(&self, metode: &str, key: &str, maks: u64, detik: u64) -> String {
        let exp = Utc::now().timestamp().max(0) as u64 + detik;
        let sig = hex::encode(self.tanda_tangan(exp, metode, maks, key));
        format!(
            "{exp}.{metode}.{maks}.{}.{sig}",
            hex::encode(key.as_bytes())
        )
    }

    /// Verifikasi token untuk `metode` ("PUT"/"GET"). Perbandingan tanda tangan waktu-konstan.
    pub fn verifikasi_token(&self, token: &str, metode: &str) -> Result<IsiToken, GalatToken> {
        let bagian: Vec<&str> = token.split('.').collect();
        if bagian.len() != 5 || bagian[1] != metode {
            return Err(GalatToken::Tidak);
        }
        let exp: u64 = bagian[0].parse().map_err(|_| GalatToken::Tidak)?;
        let maks: u64 = bagian[2].parse().map_err(|_| GalatToken::Tidak)?;
        let key_bytes = hex::decode(bagian[3]).map_err(|_| GalatToken::Tidak)?;
        let key = String::from_utf8(key_bytes).map_err(|_| GalatToken::Tidak)?;
        let sig = hex::decode(bagian[4]).map_err(|_| GalatToken::Tidak)?;

        let mut mac =
            HmacSha256::new_from_slice(&self.secret).expect("HMAC menerima kunci apa pun");
        mac.update(format!("{exp}|{metode}|{maks}|{key}").as_bytes());
        mac.verify_slice(&sig).map_err(|_| GalatToken::Tidak)?;

        if (Utc::now().timestamp().max(0) as u64) > exp {
            return Err(GalatToken::Kedaluwarsa);
        }
        Ok(IsiToken {
            key,
            maks_bytes: maks,
        })
    }

    /// Ukuran berkas di disk (byte); `None` bila belum ada.
    pub async fn ukuran(&self, key: &str) -> Option<u64> {
        let p = self.path_aman(key)?;
        tokio::fs::metadata(p).await.ok().map(|m| m.len())
    }

    /// Lokasi berkas di disk; `None` bila kunci mencoba keluar dari folder penyimpanan.
    pub fn path_aman(&self, key: &str) -> Option<PathBuf> {
        if key.is_empty()
            || key.starts_with('/')
            || key.contains('\\')
            || key.contains('\0')
            || key
                .split('/')
                .any(|p| p.is_empty() || p == "." || p == "..")
        {
            return None;
        }
        Some(self.root.join(key))
    }
}

/// Ubah teks menjadi potongan nama berkas: huruf kecil a-z/0-9 dipisah tanda hubung.
fn slug(teks: &str, maks: usize) -> String {
    let mut hasil = String::new();
    let mut strip = false;
    for c in teks.chars() {
        if c.is_ascii_alphanumeric() {
            if strip && !hasil.is_empty() {
                hasil.push('-');
            }
            strip = false;
            hasil.push(c.to_ascii_lowercase());
        } else {
            strip = true;
        }
    }
    hasil
        .chars()
        .take(maks)
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn svc() -> StorageService {
        StorageService::new("/tmp/pmb-uji", "rahasia-uji-yang-cukup-panjang-123456")
    }

    #[test]
    fn nama_berkas_memuat_nama_jenis_tanggal_dan_kode() {
        let id = Uuid::parse_str("a1b2c3d4-0000-0000-0000-000000000000").unwrap();
        let n = StorageService::nama_berkas("Budi Santoso, S.Pd.", "KTP", "PDF", id);
        assert!(n.starts_with("budi-santoso-s-pd_ktp_"), "{n}");
        assert!(n.ends_with("_a1b2c3d4.pdf"), "{n}");
        // YYYYMMDD-HHMMSS di tengah
        let tgl = n.split('_').nth(2).unwrap();
        assert_eq!(tgl.len(), 15);
        assert!(StorageService::milik(&n, id));
        assert!(!StorageService::milik(&n, Uuid::new_v4()));
        assert!(!StorageService::milik("../x_a1b2c3d4.pdf", id));
    }

    #[test]
    fn nama_kosong_atau_non_latin_tetap_valid() {
        let id = Uuid::new_v4();
        let n = StorageService::nama_berkas("井上", "", "png", id);
        assert!(n.starts_with("calon_berkas_"), "{n}");
    }

    #[test]
    fn token_roundtrip_dan_tolak_manipulasi() {
        let s = svc();
        let u = s.generate_presigned_put_url_maks("berkas/a.pdf", 60, 1000);
        let token = u.upload_url.trim_start_matches("/api/files/upload/");
        let isi = s.verifikasi_token(token, "PUT").unwrap();
        assert_eq!(
            isi,
            IsiToken {
                key: "berkas/a.pdf".into(),
                maks_bytes: 1000
            }
        );
        // metode salah
        assert_eq!(s.verifikasi_token(token, "GET"), Err(GalatToken::Tidak));
        // batas ukuran diubah
        let rusak = token.replacen(".1000.", ".9999999.", 1);
        assert_eq!(s.verifikasi_token(&rusak, "PUT"), Err(GalatToken::Tidak));
        // rahasia berbeda
        let lain = StorageService::new("/tmp/x", "rahasia-lain-yang-juga-panjang-9999999");
        assert_eq!(lain.verifikasi_token(token, "PUT"), Err(GalatToken::Tidak));
    }

    #[test]
    fn token_kedaluwarsa_ditolak() {
        let s = svc();
        let exp = Utc::now().timestamp() as u64 - 5;
        let sig = hex::encode(s.tanda_tangan(exp, "GET", 0, "berkas/a.pdf"));
        let t = format!("{exp}.GET.0.{}.{sig}", hex::encode("berkas/a.pdf"));
        assert_eq!(s.verifikasi_token(&t, "GET"), Err(GalatToken::Kedaluwarsa));
    }

    #[test]
    fn path_traversal_ditolak() {
        let s = svc();
        for k in ["../etc/passwd", "a/../../b", "/abs", "a//b", "a\\b", ""] {
            assert!(s.path_aman(k).is_none(), "{k}");
        }
        assert!(s.path_aman("berkas/ok.pdf").is_some());
    }

    #[test]
    fn kunci_mendukung_nilai_lama_berfolder() {
        assert_eq!(StorageService::kunci("berkas", "a.pdf"), "berkas/a.pdf");
        assert_eq!(
            StorageService::kunci("berkas", "berkas/x/y.pdf"),
            "berkas/x/y.pdf"
        );
    }
}
