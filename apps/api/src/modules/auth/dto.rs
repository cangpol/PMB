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

    /// Dari mana calon mengetahui PMB UPITRA (kode dari `SUMBER_INFORMASI`)
    #[serde(default)]
    #[validate(length(max = 40))]
    pub sumber_informasi: Option<String>,

    /// Keterangan tambahan jika sumber = LAINNYA
    #[serde(default)]
    #[validate(length(max = 150))]
    pub sumber_informasi_lainnya: Option<String>,
}

/// Daftar sumber informasi yang valid (kode, label)
pub const SUMBER_INFORMASI: [(&str, &str); 14] = [
    ("INSTAGRAM", "Instagram"),
    ("TIKTOK", "TikTok"),
    ("FACEBOOK", "Facebook"),
    ("YOUTUBE", "YouTube"),
    ("WEBSITE_UPITRA", "Website UPITRA"),
    ("GOOGLE", "Pencarian Google"),
    ("WHATSAPP", "WhatsApp / Broadcast"),
    ("SOSIALISASI_SEKOLAH", "Sosialisasi di Sekolah"),
    ("TEMAN_KELUARGA", "Teman / Keluarga"),
    ("ALUMNI_MAHASISWA", "Alumni / Mahasiswa UPITRA"),
    ("BROSUR_SPANDUK", "Brosur / Spanduk / Baliho"),
    ("PAMERAN_EDUFAIR", "Pameran Pendidikan / Edufair"),
    ("IKLAN_MEDIA", "Iklan Media (Radio/TV/Koran)"),
    ("LAINNYA", "Lainnya"),
];

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
    /// Kode 6 digit yang dikirim ke email calon
    #[validate(length(min = 6, max = 12, message = "Kode verifikasi harus 6 digit"))]
    pub kode: String,
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

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct AturPeranMassalRequest {
    /// Pengguna yang dicentang (1-200).
    #[validate(length(min = 1, max = 200, message = "Pilih 1 sampai 200 pengguna"))]
    pub user_ids: Vec<Uuid>,
    /// admin_pmb | keuangan | calon_mahasiswa | pengawas_ujian | asesor_rpl
    #[validate(length(min = 1, message = "Peran baru tidak boleh kosong"))]
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PeranDilewati {
    pub id: Uuid,
    pub alasan: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AturPeranMassalResponse {
    pub role: String,
    pub diubah: Vec<UserListItemResponse>,
    pub dilewati: Vec<PeranDilewati>,
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
