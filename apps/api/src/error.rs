use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApiErrorResponse {
    pub kode: String,
    pub pesan: String,
    pub detail: Vec<String>,
}

#[derive(Debug)]
pub enum AppError {
    Validation(Vec<String>),
    BadRequest(String),
    Unauthorized(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    TooManyRequests(String),
    /// Calon belum memverifikasi email dengan kode (403, kode EMAIL_BELUM_TERVERIFIKASI)
    EmailBelumTerverifikasi,
    Internal(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Validation(v) => write!(f, "Validasi gagal: {}", v.join("; ")),
            Self::BadRequest(msg) => write!(f, "Bad Request: {msg}"),
            Self::Unauthorized(msg) => write!(f, "Unauthorized: {msg}"),
            Self::Forbidden(msg) => write!(f, "Forbidden: {msg}"),
            Self::NotFound(msg) => write!(f, "Not Found: {msg}"),
            Self::Conflict(msg) => write!(f, "Conflict: {msg}"),
            Self::TooManyRequests(msg) => write!(f, "Too Many Requests: {msg}"),
            Self::EmailBelumTerverifikasi => write!(f, "Forbidden: email belum terverifikasi"),
            Self::Internal(msg) => write!(f, "Internal Server Error: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, kode, pesan, detail) = match self {
            Self::Validation(errs) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "VALIDASI_GAGAL".to_string(),
                "Terdapat kesalahan validasi pada data yang dikirimkan".to_string(),
                errs,
            ),
            Self::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "PERMINTAAN_TIDAK_VALID".to_string(),
                msg,
                vec![],
            ),
            Self::Unauthorized(msg) => (
                StatusCode::UNAUTHORIZED,
                "TIDAK_TERAUTENTIKASI".to_string(),
                msg,
                vec![],
            ),
            Self::Forbidden(msg) => (
                StatusCode::FORBIDDEN,
                "AKSES_DITOLAK".to_string(),
                msg,
                vec![],
            ),
            Self::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                "DATA_TIDAK_DITEMUKAN".to_string(),
                msg,
                vec![],
            ),
            Self::Conflict(msg) => (
                StatusCode::CONFLICT,
                "KONFLIK_DATA".to_string(),
                msg,
                vec![],
            ),
            Self::TooManyRequests(msg) => (
                StatusCode::TOO_MANY_REQUESTS,
                "TERLALU_BANYAK_PERMINTAAN".to_string(),
                msg,
                vec![],
            ),
            Self::EmailBelumTerverifikasi => (
                StatusCode::FORBIDDEN,
                "EMAIL_BELUM_TERVERIFIKASI".to_string(),
                "Verifikasi email Anda terlebih dahulu dengan kode yang dikirim ke email."
                    .to_string(),
                vec![],
            ),
            Self::Internal(msg) => {
                tracing::error!("Internal server error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "KESALAHAN_SERVER".to_string(),
                    "Terjadi kesalahan pada sistem server internal".to_string(),
                    vec![],
                )
            }
        };

        let body = Json(ApiErrorResponse {
            kode,
            pesan,
            detail,
        });

        (status, body).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => {
                Self::NotFound("Data yang diminta tidak ditemukan".to_string())
            }
            sqlx::Error::Database(db_err) => {
                if db_err.is_unique_violation() {
                    Self::Conflict(
                        "Data dengan identitas unik ini sudah terdaftar di sistem".to_string(),
                    )
                } else if db_err.code().as_deref() == Some("23503") {
                    Self::Conflict(
                        "Data tidak dapat dihapus atau diubah karena masih terhubung dengan data lain di sistem".to_string(),
                    )
                } else {
                    Self::Internal(db_err.to_string())
                }
            }
            _ => Self::Internal(err.to_string()),
        }
    }
}
