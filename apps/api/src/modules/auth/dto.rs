use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct RegisterRequest {
    #[validate(email(message = "Format email tidak valid"))]
    pub email: String,

    #[validate(length(min = 8, message = "Password minimal 8 karakter"))]
    pub password: String,

    #[validate(length(min = 3, message = "Nama lengkap minimal 3 karakter"))]
    pub nama_lengkap: String,

    #[validate(length(
        min = 10,
        max = 20,
        message = "Nomor HP harus antara 10-20 karakter numerik"
    ))]
    pub no_hp: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct LoginRequest {
    #[validate(email(message = "Format email tidak valid"))]
    pub email: String,

    #[validate(length(min = 1, message = "Password tidak boleh kosong"))]
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
    pub nama_lengkap: String,
    pub no_hp: String,
    pub is_email_verified: bool,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct VerifyEmailRequest {
    #[validate(length(min = 1, message = "Token verifikasi tidak boleh kosong"))]
    pub token: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ForgotPasswordRequest {
    #[validate(email(message = "Format email tidak valid"))]
    pub email: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ResetPasswordRequest {
    #[validate(length(min = 1, message = "Token reset password tidak boleh kosong"))]
    pub token: String,

    #[validate(length(min = 8, message = "Password baru minimal 8 karakter"))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 1, message = "Password lama tidak boleh kosong"))]
    pub old_password: String,

    #[validate(length(min = 8, message = "Password baru minimal 8 karakter"))]
    pub new_password: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateUserRoleRequest {
    #[validate(length(min = 1, message = "Peran baru tidak boleh kosong"))]
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserListItemResponse {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub nama_lengkap: String,
    pub no_hp: String,
    pub is_active: bool,
    pub is_email_verified: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct GenericMessageResponse {
    pub status: String,
    pub pesan: String,
}
