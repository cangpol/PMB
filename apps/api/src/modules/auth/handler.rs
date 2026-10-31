use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, StatusCode, header::SET_COOKIE},
    response::IntoResponse,
    routing::{get, post, put},
};
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{AuthUser, RequireAdmin, RequireSuperAdmin, ValidatedJson},
    modules::auth::{
        dto::{
            AuthResponse, ChangePasswordRequest, ForgotPasswordRequest, GenericMessageResponse,
            LoginRequest, RegisterRequest, ResetPasswordRequest, UpdateUserRoleRequest,
            UserListItemResponse, VerifyEmailRequest,
        },
        repository::UserRepository,
        service::AuthService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        register_handler,
        login_handler,
        logout_handler,
        me_handler,
        verify_email_handler,
        forgot_password_handler,
        reset_password_handler,
        change_password_handler,
        admin_list_users_handler,
        admin_update_role_handler
    ),
    components(schemas(
        RegisterRequest,
        LoginRequest,
        AuthResponse,
        VerifyEmailRequest,
        ForgotPasswordRequest,
        ResetPasswordRequest,
        ChangePasswordRequest,
        UpdateUserRoleRequest,
        UserListItemResponse,
        GenericMessageResponse,
        ApiErrorResponse
    ))
)]
pub struct AuthApiDoc;

pub fn auth_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register_handler))
        .route("/login", post(login_handler))
        .route("/logout", post(logout_handler))
        .route("/me", get(me_handler))
        .route("/verify-email", post(verify_email_handler))
        .route("/forgot-password", post(forgot_password_handler))
        .route("/reset-password", post(reset_password_handler))
        .route("/change-password", post(change_password_handler))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/users", get(admin_list_users_handler))
        .route("/users/{id}/role", put(admin_update_role_handler))
}

#[utoipa::path(
    post,
    path = "/api/auth/register",
    tag = "Auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Registrasi calon mahasiswa berhasil", body = AuthResponse),
        (status = 409, description = "Email sudah terdaftar", body = ApiErrorResponse),
        (status = 422, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn register_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<RegisterRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .rate_limiter
        .check_rate_limit(&format!("reg:{}", req.email.to_lowercase()), 3, 60)
        .await?;

    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    let (res, session_id) = service.register(req).await?;

    let cookie_val = format!(
        "pmb_session={}; HttpOnly; SameSite={}; Path=/; Max-Age=86400{}",
        session_id,
        state.config.cookie_same_site,
        if state.config.cookie_secure {
            "; Secure"
        } else {
            ""
        }
    );

    let mut headers = HeaderMap::new();
    if let Ok(val) = HeaderValue::from_str(&cookie_val) {
        headers.insert(SET_COOKIE, val);
    }

    Ok((StatusCode::CREATED, headers, Json(res)))
}

#[utoipa::path(
    post,
    path = "/api/auth/login",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login berhasil", body = AuthResponse),
        (status = 401, description = "Email atau password salah", body = ApiErrorResponse),
        (status = 403, description = "Akun dinonaktifkan atau terkunci sementara", body = ApiErrorResponse),
        (status = 422, description = "Format input tidak valid", body = ApiErrorResponse),
        (status = 429, description = "Terlalu banyak percobaan login", body = ApiErrorResponse)
    )
)]
pub async fn login_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .rate_limiter
        .check_rate_limit(&format!("login:{}", req.email.to_lowercase()), 5, 60)
        .await?;

    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    let (res, session_id) = service.login(req).await?;

    let cookie_val = format!(
        "pmb_session={}; HttpOnly; SameSite={}; Path=/; Max-Age=86400{}",
        session_id,
        state.config.cookie_same_site,
        if state.config.cookie_secure {
            "; Secure"
        } else {
            ""
        }
    );

    let mut headers = HeaderMap::new();
    if let Ok(val) = HeaderValue::from_str(&cookie_val) {
        headers.insert(SET_COOKIE, val);
    }

    Ok((StatusCode::OK, headers, Json(res)))
}

#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "Auth",
    responses(
        (status = 200, description = "Logout berhasil", body = GenericMessageResponse)
    )
)]
pub async fn logout_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    let cookie_str = headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok());

    if let Some(cookie) = cookie_str {
        for part in cookie.split(';') {
            let mut kv = part.trim().split('=');
            if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                if k == "pmb_session" {
                    state.session_store.destroy_session(v).await;
                }
            }
        }
    }

    let mut res_headers = HeaderMap::new();
    res_headers.insert(
        SET_COOKIE,
        HeaderValue::from_static("pmb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"),
    );

    Ok((
        StatusCode::OK,
        res_headers,
        Json(GenericMessageResponse {
            status: "ok".to_string(),
            pesan: "Logout berhasil".to_string(),
        }),
    ))
}

#[utoipa::path(
    get,
    path = "/api/auth/me",
    tag = "Auth",
    responses(
        (status = 200, description = "Profil user yang sedang aktif", body = AuthResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn me_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let user_repo = UserRepository::new(state.db.clone());
    let user = user_repo
        .find_by_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pengguna tidak ditemukan".to_string()))?;

    let res = AuthResponse {
        user_id: user.id,
        email: user.email,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        no_hp: user.no_hp,
        is_email_verified: user.is_email_verified,
    };

    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/auth/verify-email",
    tag = "Auth",
    request_body = VerifyEmailRequest,
    responses(
        (status = 200, description = "Email berhasil diverifikasi", body = GenericMessageResponse),
        (status = 400, description = "Token verifikasi tidak valid atau kedaluwarsa", body = ApiErrorResponse)
    )
)]
pub async fn verify_email_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<VerifyEmailRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .rate_limiter
        .check_rate_limit("verify_email_attempts", 10, 60)
        .await?;

    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    service.verify_email(req).await?;

    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Email berhasil diverifikasi. Akun Anda telah aktif sepenuhnya.".to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/auth/forgot-password",
    tag = "Auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Instruksi reset password dikirim jika email terdaftar", body = GenericMessageResponse)
    )
)]
pub async fn forgot_password_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ForgotPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .rate_limiter
        .check_rate_limit(&format!("pwd_reset:{}", req.email.to_lowercase()), 3, 60)
        .await?;

    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    service.forgot_password(req).await?;

    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Jika email Anda terdaftar di sistem kami, instruksi reset password telah dikirim ke email tersebut.".to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/auth/reset-password",
    tag = "Auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password berhasil direset", body = GenericMessageResponse),
        (status = 400, description = "Token reset tidak valid atau kedaluwarsa", body = ApiErrorResponse)
    )
)]
pub async fn reset_password_handler(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ResetPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    service.reset_password(req).await?;

    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan:
            "Kata sandi Anda berhasil diperbarui. Silakan login kembali dengan password baru Anda."
                .to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/auth/change-password",
    tag = "Auth",
    request_body = ChangePasswordRequest,
    responses(
        (status = 200, description = "Password berhasil diubah", body = GenericMessageResponse),
        (status = 400, description = "Password lama salah", body = ApiErrorResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn change_password_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ChangePasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    state
        .rate_limiter
        .check_rate_limit(&format!("chg_pwd:{}", auth_user.user_id), 5, 60)
        .await?;

    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    service.change_password(auth_user.user_id, req).await?;

    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Kata sandi berhasil diperbarui.".to_string(),
    }))
}

#[utoipa::path(
    get,
    path = "/api/admin/users",
    tag = "Admin",
    responses(
        (status = 200, description = "Daftar seluruh pengguna sistem PMB", body = Vec<UserListItemResponse>),
        (status = 401, description = "Belum login", body = ApiErrorResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_users_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    let users = service.list_users().await?;
    Ok(Json(users))
}

#[utoipa::path(
    put,
    path = "/api/admin/users/{id}/role",
    tag = "Admin",
    params(
        ("id" = Uuid, Path, description = "ID Pengguna yang akan diubah perannya")
    ),
    request_body = UpdateUserRoleRequest,
    responses(
        (status = 200, description = "Peran pengguna berhasil diperbarui", body = UserListItemResponse),
        (status = 400, description = "Peran tidak valid", body = ApiErrorResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse),
        (status = 403, description = "Hanya Super Admin yang berwenang mengubah peran", body = ApiErrorResponse)
    )
)]
pub async fn admin_update_role_handler(
    super_admin: RequireSuperAdmin,
    State(state): State<AppState>,
    Path(target_user_id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateUserRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = AuthService::new(
        UserRepository::new(state.db.clone()),
        state.session_store.clone(),
        state.mail_sender.clone(),
    );

    let updated = service
        .update_user_role(&super_admin.email, target_user_id, req)
        .await?;

    Ok(Json(updated))
}
