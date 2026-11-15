//! Manajemen akun pengguna oleh Super Admin: buat, ubah data, aktif/nonaktif,
//! reset password, dan hapus. Perubahan peran tetap di `handler.rs`.

use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::{post, put},
};
use rand::{Rng, distributions::Alphanumeric};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    extractors::{RequireSuperAdmin, ValidatedJson},
    modules::auth::{dto::UserListItemResponse, model::User, repository::UserRepository},
    security::{hash_password, record_audit_log},
    state::AppState,
};

const PERAN_VALID: [&str; 6] = [
    "super_admin",
    "admin_pmb",
    "keuangan",
    "pengawas_ujian",
    "asesor_rpl",
    "calon_mahasiswa",
];

#[derive(Debug, Deserialize, Validate)]
pub struct BuatPenggunaRequest {
    #[validate(email(message = "Format email tidak valid"))]
    pub email: String,
    #[validate(length(min = 3, message = "Nama lengkap minimal 3 karakter"))]
    pub nama_lengkap: String,
    #[validate(length(min = 10, max = 20, message = "Nomor HP harus 10-20 karakter"))]
    pub no_hp: String,
    pub role: String,
    /// Kosong = sistem membuatkan password sementara.
    #[serde(default)]
    #[validate(length(min = 8, message = "Password minimal 8 karakter"))]
    pub password: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UbahPenggunaRequest {
    #[validate(email(message = "Format email tidak valid"))]
    pub email: String,
    #[validate(length(min = 3, message = "Nama lengkap minimal 3 karakter"))]
    pub nama_lengkap: String,
    #[validate(length(min = 10, max = 20, message = "Nomor HP harus 10-20 karakter"))]
    pub no_hp: String,
}

#[derive(Debug, Deserialize)]
pub struct StatusPenggunaRequest {
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PenggunaDenganPassword {
    pub pengguna: UserListItemResponse,
    /// Hanya ditampilkan sekali, tidak disimpan dalam bentuk asli.
    pub password_sementara: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", post(buat_pengguna_handler))
        .route(
            "/users/{id}",
            put(ubah_pengguna_handler).delete(hapus_pengguna_handler),
        )
        .route("/users/{id}/status", put(ubah_status_handler))
        .route("/users/{id}/reset-password", post(reset_password_handler))
}

fn ke_item(u: User) -> UserListItemResponse {
    UserListItemResponse {
        id: u.id,
        email: u.email,
        role: u.role,
        nama_lengkap: u.nama_lengkap,
        no_hp: u.no_hp,
        is_active: u.is_active,
        is_email_verified: u.is_email_verified,
        created_at: u.created_at,
    }
}

fn password_acak() -> String {
    let isi: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(12)
        .map(char::from)
        .collect();
    // Pastikan lolos aturan umum: ada huruf besar, kecil, dan angka.
    format!("Pm{isi}7")
}

async fn ambil(repo: &UserRepository, id: Uuid) -> Result<User, AppError> {
    repo.find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Pengguna tidak ditemukan".into()))
}

/// Akun Super Admin lain dan akun sendiri dilindungi dari aksi destruktif.
fn lindungi(operator: Uuid, target: &User, aksi: &str) -> Result<(), AppError> {
    if target.id == operator {
        return Err(AppError::BadRequest(format!(
            "Akun Anda sendiri tidak dapat {aksi}"
        )));
    }
    if target.role == "super_admin" {
        return Err(AppError::Forbidden(format!(
            "Akun Super Admin tidak dapat {aksi}"
        )));
    }
    Ok(())
}

pub async fn buat_pengguna_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<BuatPenggunaRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !PERAN_VALID.contains(&req.role.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Peran '{}' tidak valid",
            req.role
        )));
    }
    if req.role == "super_admin" {
        return Err(AppError::Forbidden(
            "Akun Super Admin tidak dapat dibuat dari halaman ini".into(),
        ));
    }
    let repo = UserRepository::new(state.db.clone());
    let email = req.email.trim().to_lowercase();
    if repo.find_by_email(&email).await?.is_some() {
        return Err(AppError::Conflict("Email sudah terdaftar".into()));
    }
    let password = req.password.clone().unwrap_or_else(password_acak);
    let hash = hash_password(&password).map_err(AppError::Internal)?;
    let user = repo
        .create_user(
            &email,
            &hash,
            &req.role,
            req.nama_lengkap.trim(),
            req.no_hp.trim(),
        )
        .await?;
    // Akun dibuat admin dianggap terverifikasi.
    repo.verify_user_email(user.id).await?;
    let user = ambil(&repo, user.id).await?;

    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        "BUAT_PENGGUNA",
        "users",
        Some(user.id),
        None,
        Some(serde_json::json!({ "email": user.email, "role": user.role })),
    )
    .await;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(PenggunaDenganPassword {
            pengguna: ke_item(user),
            password_sementara: if req.password.is_some() {
                String::new()
            } else {
                password
            },
        }),
    ))
}

pub async fn ubah_pengguna_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UbahPenggunaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = UserRepository::new(state.db.clone());
    let lama = ambil(&repo, id).await?;
    let email = req.email.trim().to_lowercase();
    if email != lama.email {
        if lama.role == "super_admin" && lama.id != admin.user_id {
            return Err(AppError::Forbidden(
                "Email Super Admin lain tidak dapat diubah".into(),
            ));
        }
        if repo.find_by_email(&email).await?.is_some() {
            return Err(AppError::Conflict("Email sudah dipakai akun lain".into()));
        }
    }
    let baru = sqlx::query_as::<_, User>(
        "UPDATE users SET email = $1, nama_lengkap = $2, no_hp = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, email, password_hash, role, nama_lengkap, no_hp, is_active,
                   is_email_verified, failed_login_attempts, locked_until, created_at, updated_at",
    )
    .bind(&email)
    .bind(req.nama_lengkap.trim())
    .bind(req.no_hp.trim())
    .bind(id)
    .fetch_one(&state.db)
    .await?;
    if email != lama.email {
        state.session_store.destroy_sessions_by_user_id(&id).await;
    }
    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        "UBAH_PENGGUNA",
        "users",
        Some(id),
        Some(serde_json::json!({ "email": lama.email, "nama": lama.nama_lengkap })),
        Some(serde_json::json!({ "email": baru.email, "nama": baru.nama_lengkap })),
    )
    .await;
    Ok(Json(ke_item(baru)))
}

pub async fn ubah_status_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<StatusPenggunaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = UserRepository::new(state.db.clone());
    let target = ambil(&repo, id).await?;
    lindungi(admin.user_id, &target, "dinonaktifkan")?;
    let baru = sqlx::query_as::<_, User>(
        "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, email, password_hash, role, nama_lengkap, no_hp, is_active,
                   is_email_verified, failed_login_attempts, locked_until, created_at, updated_at",
    )
    .bind(req.is_active)
    .bind(id)
    .fetch_one(&state.db)
    .await?;
    if !req.is_active {
        state.session_store.destroy_sessions_by_user_id(&id).await;
    }
    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        if req.is_active {
            "AKTIFKAN_PENGGUNA"
        } else {
            "NONAKTIFKAN_PENGGUNA"
        },
        "users",
        Some(id),
        None,
        Some(serde_json::json!({ "email": baru.email })),
    )
    .await;
    Ok(Json(ke_item(baru)))
}

pub async fn reset_password_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let repo = UserRepository::new(state.db.clone());
    let target = ambil(&repo, id).await?;
    lindungi(admin.user_id, &target, "direset passwordnya dari sini")?;
    let password = password_acak();
    let hash = hash_password(&password).map_err(AppError::Internal)?;
    sqlx::query(
        "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL,
                updated_at = NOW() WHERE id = $2",
    )
    .bind(&hash)
    .bind(id)
    .execute(&state.db)
    .await?;
    state.session_store.destroy_sessions_by_user_id(&id).await;
    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        "RESET_PASSWORD_PENGGUNA",
        "users",
        Some(id),
        None,
        Some(serde_json::json!({ "email": target.email })),
    )
    .await;
    let target = ambil(&repo, id).await?;
    Ok(Json(PenggunaDenganPassword {
        pengguna: ke_item(target),
        password_sementara: password,
    }))
}

pub async fn hapus_pengguna_handler(
    admin: RequireSuperAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let repo = UserRepository::new(state.db.clone());
    let target = ambil(&repo, id).await?;
    lindungi(admin.user_id, &target, "dihapus")?;
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| match AppError::from(e) {
            AppError::Conflict(_) => AppError::Conflict(
                "Akun ini sudah memiliki data pendaftaran atau riwayat kerja sehingga tidak dapat dihapus. Nonaktifkan saja akunnya."
                    .into(),
            ),
            lain => lain,
        })?;
    state.session_store.destroy_sessions_by_user_id(&id).await;
    let _ = record_audit_log(
        &state.db,
        Some(admin.user_id),
        "HAPUS_PENGGUNA",
        "users",
        Some(id),
        Some(serde_json::json!({ "email": target.email, "role": target.role })),
        None,
    )
    .await;
    Ok(Json(serde_json::json!({ "status": "ok" })))
}
