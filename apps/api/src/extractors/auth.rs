use std::ops::Deref;

use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use uuid::Uuid;

use crate::{error::AppError, security::SessionUser, state::AppState};

#[derive(Clone, Debug)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub role: String,
    pub nama_lengkap: String,
}

impl AuthUser {
    pub fn is_super_admin(&self) -> bool {
        self.role == "super_admin"
    }

    pub fn is_admin(&self) -> bool {
        self.role == "admin_pmb" || self.role == "super_admin"
    }

    pub fn is_keuangan(&self) -> bool {
        self.role == "keuangan" || self.role == "super_admin"
    }

    pub fn is_pengawas(&self) -> bool {
        self.role == "pengawas_ujian" || self.role == "super_admin" || self.role == "admin_pmb"
    }

    pub fn is_asesor(&self) -> bool {
        self.role == "asesor_rpl" || self.role == "super_admin" || self.role == "admin_pmb"
    }

    pub fn is_calon(&self) -> bool {
        self.role == "calon_mahasiswa" || self.role == "super_admin"
    }
}

impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let cookie_header = parts
            .headers
            .get(axum::http::header::COOKIE)
            .and_then(|v| v.to_str().ok());

        let session_id = cookie_header.and_then(|cookies| {
            for item in cookies.split(';') {
                let mut parts = item.trim().split('=');
                if let (Some(name), Some(val)) = (parts.next(), parts.next()) {
                    if name == "pmb_session" {
                        return Some(val.to_string());
                    }
                }
            }
            None
        });

        let session_id = match session_id {
            Some(id) if !id.is_empty() => id,
            _ => {
                return Err(AppError::Unauthorized(
                    "Anda harus login untuk mengakses endpoint ini".to_string(),
                ));
            }
        };

        let user = match app_state.session_store.get_session(&session_id).await {
            Some(u) => u,
            None => {
                return Err(AppError::Unauthorized(
                    "Sesi Anda telah kedaluwarsa atau tidak valid. Silakan login kembali"
                        .to_string(),
                ));
            }
        };

        Ok(AuthUser {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            nama_lengkap: user.nama_lengkap,
        })
    }
}

impl From<SessionUser> for AuthUser {
    fn from(u: SessionUser) -> Self {
        Self {
            user_id: u.user_id,
            email: u.email,
            role: u.role,
            nama_lengkap: u.nama_lengkap,
        }
    }
}

/// Extractor: Memastikan pengguna memiliki peran `super_admin`
#[derive(Clone, Debug)]
pub struct RequireSuperAdmin(pub AuthUser);

impl Deref for RequireSuperAdmin {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequireSuperAdmin
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_super_admin() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Hanya Super Administrator yang berwenang mengakses endpoint ini"
                    .to_string(),
            ));
        }
        Ok(RequireSuperAdmin(user))
    }
}

/// Extractor: Memastikan pengguna memiliki peran `admin_pmb` atau `super_admin`
#[derive(Clone, Debug)]
pub struct RequireAdmin(pub AuthUser);

impl Deref for RequireAdmin {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequireAdmin
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_admin() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Anda tidak memiliki izin peran Administrator PMB".to_string(),
            ));
        }
        Ok(RequireAdmin(user))
    }
}

/// Extractor: Memastikan pengguna memiliki peran `keuangan` atau `super_admin`
#[derive(Clone, Debug)]
pub struct RequireKeuangan(pub AuthUser);

impl Deref for RequireKeuangan {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequireKeuangan
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_keuangan() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Anda tidak memiliki izin peran Staf Keuangan".to_string(),
            ));
        }
        Ok(RequireKeuangan(user))
    }
}

/// Extractor: Memastikan pengguna memiliki peran `pengawas_ujian` atau admin
#[derive(Clone, Debug)]
pub struct RequirePengawas(pub AuthUser);

impl Deref for RequirePengawas {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequirePengawas
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_pengawas() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Anda tidak memiliki izin peran Pengawas Ujian".to_string(),
            ));
        }
        Ok(RequirePengawas(user))
    }
}

/// Extractor: Memastikan pengguna memiliki peran `asesor_rpl` atau admin
#[derive(Clone, Debug)]
pub struct RequireAsesor(pub AuthUser);

impl Deref for RequireAsesor {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequireAsesor
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_asesor() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Anda tidak memiliki izin peran Asesor RPL".to_string(),
            ));
        }
        Ok(RequireAsesor(user))
    }
}

/// Extractor: Memastikan pengguna memiliki peran `calon_mahasiswa` atau `super_admin`
#[derive(Clone, Debug)]
pub struct RequireCalon(pub AuthUser);

impl Deref for RequireCalon {
    type Target = AuthUser;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<S> FromRequestParts<S> for RequireCalon
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if !user.is_calon() {
            return Err(AppError::Forbidden(
                "Akses ditolak: Fitur ini khusus untuk calon mahasiswa".to_string(),
            ));
        }
        Ok(RequireCalon(user))
    }
}
