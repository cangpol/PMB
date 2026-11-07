//! Gerbang: calon mahasiswa wajib memverifikasi email sebelum memakai fitur PMB.

use axum::{
    extract::{FromRequestParts, Request, State},
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::{error::AppError, extractors::AuthUser, state::AppState};

/// Tolak permintaan calon yang emailnya belum terverifikasi. Permintaan tanpa sesi
/// (mis. webhook, endpoint publik) dan peran selain calon diteruskan apa adanya;
/// handler tetap memeriksa autentikasi & hak aksesnya sendiri.
pub async fn wajib_email_terverifikasi(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Response {
    // Verifikasi email sedang dinonaktifkan: teruskan semua permintaan
    if !state.config.wajib_verifikasi_email {
        return next.run(req).await;
    }
    let (mut parts, body) = req.into_parts();
    if let Ok(user) = AuthUser::from_request_parts(&mut parts, &state).await {
        if user.role == "calon_mahasiswa" {
            let terverifikasi: Result<Option<bool>, sqlx::Error> =
                sqlx::query_scalar("SELECT is_email_verified FROM users WHERE id = $1")
                    .bind(user.user_id)
                    .fetch_optional(&state.db)
                    .await;
            match terverifikasi {
                Ok(Some(true)) => {}
                Ok(_) => return AppError::EmailBelumTerverifikasi.into_response(),
                Err(e) => return AppError::from(e).into_response(),
            }
        }
    }
    next.run(Request::from_parts(parts, body)).await
}
