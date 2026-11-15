//! Unggah dan unduh berkas dari disk server lewat URL bertoken (`StorageService`).

use axum::{
    Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, put},
};

use crate::{
    error::AppError,
    security::storage::{GalatToken, MAKS_BYTES_BAWAAN, StorageService},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/upload/{token}",
            put(unggah_handler).layer(DefaultBodyLimit::max(MAKS_BYTES_BAWAAN as usize + 1024)),
        )
        .route("/download/{token}", get(unduh_handler))
        .route("/media/{*path}", get(media_handler))
}

fn ekstensi(key: &str) -> String {
    key.rsplit_once('.')
        .map(|(_, e)| e.to_lowercase())
        .unwrap_or_default()
}

fn tipe_konten(ext: &str) -> &'static str {
    match ext {
        "pdf" => "application/pdf",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    }
}

/// Isi berkas harus benar-benar berformat sesuai ekstensinya (bukan sekadar diganti nama).
fn isi_sesuai(ext: &str, b: &[u8]) -> bool {
    match ext {
        "pdf" => b.starts_with(b"%PDF"),
        "png" => b.starts_with(&[0x89, b'P', b'N', b'G']),
        "jpg" | "jpeg" => b.starts_with(&[0xFF, 0xD8, 0xFF]),
        "webp" => b.len() > 12 && &b[0..4] == b"RIFF" && &b[8..12] == b"WEBP",
        "gif" => b.starts_with(b"GIF8"),
        "avif" => b.len() > 12 && &b[4..8] == b"ftyp",
        _ => false,
    }
}

fn galat_token(g: GalatToken) -> AppError {
    match g {
        GalatToken::Kedaluwarsa => AppError::Forbidden(
            "Tautan berkas sudah kedaluwarsa. Muat ulang halaman lalu coba lagi.".into(),
        ),
        GalatToken::Tidak => AppError::Forbidden("Tautan berkas tidak valid".into()),
    }
}

async fn unggah_handler(
    State(state): State<AppState>,
    Path(token): Path<String>,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let st = StorageService::dari_config(&state.config);
    let isi = st.verifikasi_token(&token, "PUT").map_err(galat_token)?;
    let path = st
        .path_aman(&isi.key)
        .ok_or_else(|| AppError::BadRequest("Kunci berkas tidak valid".into()))?;
    if body.is_empty() {
        return Err(AppError::BadRequest("Berkas kosong".into()));
    }
    if body.len() as u64 > isi.maks_bytes {
        return Err(AppError::BadRequest(format!(
            "Ukuran berkas melebihi batas {} KB",
            isi.maks_bytes / 1024
        )));
    }
    if !isi_sesuai(&ekstensi(&isi.key), &body) {
        return Err(AppError::BadRequest(
            "Isi berkas tidak sesuai dengan ekstensinya".into(),
        ));
    }
    if let Some(dir) = path.parent() {
        tokio::fs::create_dir_all(dir)
            .await
            .map_err(|e| AppError::Internal(format!("gagal membuat folder berkas: {e}")))?;
    }
    // Tulis ke berkas sementara lalu ganti nama agar unduhan tidak pernah membaca berkas setengah jadi
    let sementara = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4().simple()));
    tokio::fs::write(&sementara, &body)
        .await
        .map_err(|e| AppError::Internal(format!("gagal menyimpan berkas: {e}")))?;
    if let Err(e) = tokio::fs::rename(&sementara, &path).await {
        let _ = tokio::fs::remove_file(&sementara).await;
        return Err(AppError::Internal(format!("gagal menyimpan berkas: {e}")));
    }
    Ok(StatusCode::OK)
}

async fn kirim(st: &StorageService, key: &str, publik: bool) -> Result<Response, AppError> {
    let path = st
        .path_aman(key)
        .ok_or_else(|| AppError::BadRequest("Kunci berkas tidak valid".into()))?;
    let data = tokio::fs::read(&path)
        .await
        .map_err(|_| AppError::NotFound("Berkas tidak ditemukan".into()))?;
    let ext = ekstensi(key);
    let nama: String = key
        .rsplit('/')
        .next()
        .unwrap_or("berkas")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
        .collect();
    let mut h = HeaderMap::new();
    h.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(tipe_konten(&ext)),
    );
    h.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("inline; filename=\"{nama}\""))
            .unwrap_or_else(|_| HeaderValue::from_static("inline")),
    );
    h.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static(if publik {
            "public, max-age=86400"
        } else {
            "private, no-store"
        }),
    );
    // Berkas unggahan tidak boleh menjalankan skrip apa pun
    h.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(
            "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        ),
    );
    Ok((h, data).into_response())
}

async fn unduh_handler(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Response, AppError> {
    let st = StorageService::dari_config(&state.config);
    let isi = st.verifikasi_token(&token, "GET").map_err(galat_token)?;
    kirim(&st, &isi.key, false).await
}

/// Media CMS (gambar berita/banner) dapat dibuka siapa saja, tetapi hanya di bawah `cms/media/`.
async fn media_handler(
    State(state): State<AppState>,
    Path(path): Path<String>,
) -> Result<Response, AppError> {
    let st = StorageService::dari_config(&state.config);
    kirim(&st, &format!("cms/media/{path}"), true).await
}

/// Nama lengkap pemilik akun, dipakai untuk menamai berkas unggahan.
pub async fn nama_pengguna(db: &sqlx::PgPool, user_id: uuid::Uuid) -> String {
    sqlx::query_scalar::<_, String>("SELECT nama_lengkap FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(db)
        .await
        .ok()
        .flatten()
        .unwrap_or_default()
}

/// Ekstensi huruf kecil dari nama berkas asli ("" bila tidak ada).
pub fn ekstensi_nama(nama: &str) -> String {
    nama.rsplit_once('.')
        .map(|(_, e)| e.to_lowercase())
        .unwrap_or_default()
}
