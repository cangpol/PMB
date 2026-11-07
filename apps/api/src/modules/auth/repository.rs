use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::auth::model::{User, VerificationToken},
};

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, role, nama_lengkap, no_hp, is_active, 
                    is_email_verified, failed_login_attempts, locked_until, created_at, updated_at 
             FROM users WHERE LOWER(email) = LOWER($1)",
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, role, nama_lengkap, no_hp, is_active, 
                    is_email_verified, failed_login_attempts, locked_until, created_at, updated_at 
             FROM users WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn create_user(
        &self,
        email: &str,
        password_hash: &str,
        role: &str,
        nama_lengkap: &str,
        no_hp: &str,
    ) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (email, password_hash, role, nama_lengkap, no_hp)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, password_hash, role, nama_lengkap, no_hp, is_active, 
                       is_email_verified, failed_login_attempts, locked_until, created_at, updated_at",
        )
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .bind(nama_lengkap)
        .bind(no_hp)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn verify_user_email(&self, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE users SET is_email_verified = TRUE, updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn update_password(
        &self,
        user_id: Uuid,
        password_hash: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE users 
             SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() 
             WHERE id = $2",
        )
        .bind(password_hash)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn record_login_failure(
        &self,
        user_id: Uuid,
        attempts: i32,
        locked_until: Option<DateTime<Utc>>,
    ) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE users 
             SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() 
             WHERE id = $3",
        )
        .bind(attempts)
        .bind(locked_until)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn reset_login_failures(&self, user_id: Uuid) -> Result<(), AppError> {
        sqlx::query(
            "UPDATE users 
             SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() 
             WHERE id = $1",
        )
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_verification_token(
        &self,
        user_id: Uuid,
        token_hash: &str,
        tipe: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<VerificationToken, AppError> {
        let token = sqlx::query_as::<_, VerificationToken>(
            "INSERT INTO token_verifikasi (user_id, token_hash, tipe, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, token_hash, tipe, expires_at, used_at, created_at",
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(tipe)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(token)
    }

    pub async fn find_active_token(
        &self,
        token_hash: &str,
        tipe: &str,
    ) -> Result<Option<VerificationToken>, AppError> {
        let token = sqlx::query_as::<_, VerificationToken>(
            "SELECT id, user_id, token_hash, tipe, expires_at, used_at, created_at 
             FROM token_verifikasi 
             WHERE token_hash = $1 AND tipe = $2 AND used_at IS NULL AND expires_at > NOW()",
        )
        .bind(token_hash)
        .bind(tipe)
        .fetch_optional(&self.pool)
        .await?;

        Ok(token)
    }

    pub async fn mark_token_used(&self, token_id: Uuid) -> Result<(), AppError> {
        sqlx::query("UPDATE token_verifikasi SET used_at = NOW() WHERE id = $1")
            .bind(token_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn list_users(
        &self,
        cari: Option<&str>,
        role: Option<&str>,
    ) -> Result<Vec<User>, AppError> {
        let pola = cari
            .map(|c| c.trim())
            .filter(|c| !c.is_empty())
            .map(|c| format!("%{}%", c.replace('%', "\\%").replace('_', "\\_")));
        let users = sqlx::query_as::<_, User>(
            "SELECT id, email, password_hash, role, nama_lengkap, no_hp, is_active,
                    is_email_verified, failed_login_attempts, locked_until, created_at, updated_at
             FROM users
             WHERE ($1::text IS NULL OR email ILIKE $1 OR nama_lengkap ILIKE $1)
               AND ($2::text IS NULL OR role = $2)
             ORDER BY created_at DESC LIMIT 200",
        )
        .bind(pola)
        .bind(role.filter(|r| !r.is_empty()))
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn update_user_role(&self, user_id: Uuid, new_role: &str) -> Result<User, AppError> {
        let user = sqlx::query_as::<_, User>(
            "UPDATE users 
             SET role = $1, updated_at = NOW() 
             WHERE id = $2
             RETURNING id, email, password_hash, role, nama_lengkap, no_hp, is_active, 
                       is_email_verified, failed_login_attempts, locked_until, created_at, updated_at",
        )
        .bind(new_role)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    /// Ubah peran banyak pengguna sekaligus. Super admin dan akun operator tidak pernah diubah.
    pub async fn update_role_massal(
        &self,
        user_ids: &[Uuid],
        new_role: &str,
        operator_id: Uuid,
    ) -> Result<Vec<User>, AppError> {
        let users = sqlx::query_as::<_, User>(
            "UPDATE users
             SET role = $1, updated_at = NOW()
             WHERE id = ANY($2) AND id <> $3 AND role <> 'super_admin'
             RETURNING id, email, password_hash, role, nama_lengkap, no_hp, is_active,
                       is_email_verified, failed_login_attempts, locked_until, created_at, updated_at",
        )
        .bind(new_role)
        .bind(user_ids)
        .bind(operator_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(users)
    }
}
