use std::sync::Arc;

use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::auth::{
        dto::{
            AturPeranMassalRequest, AturPeranMassalResponse, AuthResponse, ChangePasswordRequest,
            ForgotPasswordRequest, LoginRequest, PeranDilewati, RegisterRequest,
            ResetPasswordRequest, UpdateUserRoleRequest, UserListItemResponse, VerifyEmailRequest,
        },
        repository::UserRepository,
    },
    security::{MailSender, SessionStore, SessionUser, hash_password, verify_password},
};

#[derive(Clone)]
pub struct AuthService {
    user_repo: UserRepository,
    session_store: SessionStore,
    mail_sender: Arc<dyn MailSender>,
    kirim_kode_verifikasi: bool,
}

impl AuthService {
    pub fn new(
        user_repo: UserRepository,
        session_store: SessionStore,
        mail_sender: Arc<dyn MailSender>,
    ) -> Self {
        Self {
            user_repo,
            session_store,
            mail_sender,
            kirim_kode_verifikasi: false,
        }
    }

    /// Aktifkan pengiriman kode verifikasi email saat registrasi.
    pub fn dengan_kode_verifikasi(mut self, aktif: bool) -> Self {
        self.kirim_kode_verifikasi = aktif;
        self
    }

    pub async fn register(&self, req: RegisterRequest) -> Result<(AuthResponse, String), AppError> {
        let existing = self.user_repo.find_by_email(&req.email).await?;
        if existing.is_some() {
            return Err(AppError::Conflict(
                "Email sudah terdaftar. Silakan gunakan email lain atau login".to_string(),
            ));
        }

        let sumber = req
            .sumber_informasi
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty());
        if let Some(s) = sumber {
            if !crate::modules::auth::dto::SUMBER_INFORMASI
                .iter()
                .any(|(kode, _)| *kode == s)
            {
                return Err(AppError::BadRequest(
                    "Sumber informasi tidak valid".to_string(),
                ));
            }
        }

        let hashed = hash_password(&req.password).map_err(AppError::Internal)?;

        let user = self
            .user_repo
            .create_user(
                &req.email,
                &hashed,
                "calon_mahasiswa",
                &req.nama_lengkap,
                &req.no_hp,
            )
            .await?;

        if let Some(s) = sumber {
            let lain = if s == "LAINNYA" {
                req.sumber_informasi_lainnya
                    .as_deref()
                    .map(str::trim)
                    .filter(|t| !t.is_empty())
            } else {
                None
            };
            sqlx::query(
                "UPDATE users SET sumber_informasi = $2, sumber_informasi_lainnya = $3 WHERE id = $1",
            )
            .bind(user.id)
            .bind(s)
            .bind(lain)
            .execute(self.user_repo.pool())
            .await?;
        }

        // Kirim kode verifikasi 6 digit. Pendaftaran tetap berhasil bila email gagal
        // terkirim; calon dapat meminta kode baru di halaman verifikasi.
        // Hanya bila verifikasi email diaktifkan (WAJIB_VERIFIKASI_EMAIL=true).
        if !self.kirim_kode_verifikasi {
            tracing::debug!("Verifikasi email nonaktif; kode tidak dikirim");
        } else if let Err(e) = crate::modules::auth::kode_verifikasi::terbitkan_dan_kirim(
            self.user_repo.pool(),
            self.mail_sender.as_ref(),
            user.id,
            &user.email,
            &user.nama_lengkap,
        )
        .await
        {
            tracing::warn!("Gagal mengirim kode verifikasi ke {}: {}", user.email, e);
        }

        let session_user = SessionUser {
            user_id: user.id,
            email: user.email.clone(),
            role: user.role.clone(),
            nama_lengkap: user.nama_lengkap.clone(),
        };

        let session_id = self.session_store.create_session(session_user).await;

        let res = AuthResponse {
            user_id: user.id,
            email: user.email,
            role: user.role,
            nama_lengkap: user.nama_lengkap,
            no_hp: user.no_hp,
            is_email_verified: user.is_email_verified,
        };

        Ok((res, session_id))
    }

    pub async fn verify_email(
        &self,
        user_id: Uuid,
        req: VerifyEmailRequest,
    ) -> Result<(), AppError> {
        crate::modules::auth::kode_verifikasi::verifikasi(self.user_repo.pool(), user_id, &req.kode)
            .await
    }

    pub async fn kirim_ulang_kode_verifikasi(&self, user_id: Uuid) -> Result<(), AppError> {
        crate::modules::auth::kode_verifikasi::kirim_ulang(
            self.user_repo.pool(),
            self.mail_sender.as_ref(),
            user_id,
        )
        .await
    }

    pub async fn login(&self, req: LoginRequest) -> Result<(AuthResponse, String), AppError> {
        let user = match self.user_repo.find_by_email(&req.email).await? {
            Some(u) => u,
            None => {
                // Mitigasi Timing Attack: jalankan verifikasi password dummy agar waktu respons identik
                let dummy_hash =
                    "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0MTIzNDU2$O3Q3e1H0G8m3c5J4v9X2w1Y=";
                let _ = verify_password(&req.password, dummy_hash);
                return Err(AppError::Unauthorized(
                    "Email atau password tidak sesuai".to_string(),
                ));
            }
        };

        // 1. Cek penguncian sementara akun (Account Lockout)
        if let Some(locked_until) = user.locked_until {
            if locked_until > Utc::now() {
                let remaining = (locked_until - Utc::now()).num_minutes() + 1;
                tracing::warn!(
                    "AUDIT: Upaya login ke akun terkunci {} diblokir (sisa waktu: {} menit)",
                    user.email,
                    remaining
                );
                return Err(AppError::Forbidden(format!(
                    "Akun Anda terkunci sementara karena 5 kali percobaan login gagal. Silakan coba lagi dalam {} menit.",
                    remaining
                )));
            }
        }

        if !user.is_active {
            return Err(AppError::Forbidden(
                "Akun Anda telah dinonaktifkan. Hubungi panitia PMB".to_string(),
            ));
        }

        // 2. Verifikasi Password
        if !verify_password(&req.password, &user.password_hash) {
            let next_attempts = user.failed_login_attempts + 1;
            let locked_until = if next_attempts >= 5 {
                Some(Utc::now() + Duration::minutes(15))
            } else {
                None
            };

            let _ = self
                .user_repo
                .record_login_failure(user.id, next_attempts, locked_until)
                .await;

            tracing::warn!(
                "AUDIT: Percobaan login gagal untuk user {} (gagal ke-{})",
                user.email,
                next_attempts
            );

            if next_attempts >= 5 {
                return Err(AppError::Forbidden(
                    "Akun Anda terkunci sementara selama 15 menit karena 5 kali kesalahan login berturut-turut."
                        .to_string(),
                ));
            }

            return Err(AppError::Unauthorized(
                "Email atau password tidak sesuai".to_string(),
            ));
        }

        // 3. Reset kegagalan login jika password valid
        if user.failed_login_attempts > 0 || user.locked_until.is_some() {
            let _ = self.user_repo.reset_login_failures(user.id).await;
        }

        // 4. Audit log login sukses
        tracing::info!(
            "AUDIT: User {} ({}) berhasil login dengan peran {}",
            user.nama_lengkap,
            user.email,
            user.role
        );

        let session_user = SessionUser {
            user_id: user.id,
            email: user.email.clone(),
            role: user.role.clone(),
            nama_lengkap: user.nama_lengkap.clone(),
        };

        let session_id = self.session_store.create_session(session_user).await;

        let res = AuthResponse {
            user_id: user.id,
            email: user.email,
            role: user.role,
            nama_lengkap: user.nama_lengkap,
            no_hp: user.no_hp,
            is_email_verified: user.is_email_verified,
        };

        Ok((res, session_id))
    }

    pub async fn logout(&self, session_id: &str) {
        self.session_store.destroy_session(session_id).await;
    }

    pub async fn forgot_password(&self, req: ForgotPasswordRequest) -> Result<(), AppError> {
        let user_opt = self.user_repo.find_by_email(&req.email).await?;

        if let Some(user) = user_opt {
            let token_raw = Uuid::new_v4().to_string();
            let expires_at = Utc::now() + Duration::hours(1);

            let _ = self
                .user_repo
                .create_verification_token(user.id, &token_raw, "RESET_PASSWORD", expires_at)
                .await;

            let email_subject = "Instruksi Reset Password PMB Universitas Pignatelli Triputra";
            let email_body = format!(
                "Halo {},\n\nKami menerima permintaan untuk mereset kata sandi akun PMB Anda.\n\
                Gunakan token berikut untuk melanjutkan reset password:\n\n{}\n\n\
                Token ini berlaku selama 1 jam. Jika Anda tidak melakukan permintaan ini, abaikan email ini.\n\n\
                Salam hangat,\nPanitia PMB Universitas Pignatelli Triputra",
                user.nama_lengkap, token_raw
            );

            if let Err(e) = self
                .mail_sender
                .send_email(&user.email, email_subject, &email_body)
                .await
            {
                tracing::warn!(
                    "Gagal mengirim email reset password ke {}: {}",
                    user.email,
                    e
                );
            }

            tracing::info!(
                "AUDIT: Permintaan reset password untuk email: {}",
                user.email
            );
        }

        Ok(())
    }

    pub async fn reset_password(&self, req: ResetPasswordRequest) -> Result<(), AppError> {
        let token = self
            .user_repo
            .find_active_token(&req.token, "RESET_PASSWORD")
            .await?
            .ok_or_else(|| {
                AppError::BadRequest(
                    "Token reset password tidak valid, telah kedaluwarsa, atau sudah digunakan"
                        .to_string(),
                )
            })?;

        let hashed = hash_password(&req.new_password).map_err(AppError::Internal)?;

        self.user_repo
            .update_password(token.user_id, &hashed)
            .await?;
        self.user_repo.mark_token_used(token.id).await?;

        // Keamanan: Cabut seluruh sesi aktif lama pengguna pasca reset kata sandi
        self.session_store
            .destroy_sessions_by_user_id(&token.user_id)
            .await;

        tracing::info!(
            "AUDIT: Reset password berhasil untuk user_id: {}",
            token.user_id
        );

        Ok(())
    }

    pub async fn change_password(
        &self,
        user_id: Uuid,
        req: ChangePasswordRequest,
    ) -> Result<(), AppError> {
        let user = self
            .user_repo
            .find_by_id(user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Pengguna tidak ditemukan".to_string()))?;

        if !verify_password(&req.old_password, &user.password_hash) {
            return Err(AppError::BadRequest(
                "Password lama yang Anda masukkan tidak sesuai".to_string(),
            ));
        }

        let hashed = hash_password(&req.new_password).map_err(AppError::Internal)?;

        self.user_repo.update_password(user.id, &hashed).await?;

        tracing::info!("AUDIT: Ganti password berhasil untuk user: {}", user.email);

        Ok(())
    }

    pub async fn list_users(
        &self,
        cari: Option<&str>,
        role: Option<&str>,
    ) -> Result<Vec<UserListItemResponse>, AppError> {
        let users = self.user_repo.list_users(cari, role).await?;
        let res = users
            .into_iter()
            .map(|u| UserListItemResponse {
                id: u.id,
                email: u.email,
                role: u.role,
                nama_lengkap: u.nama_lengkap,
                no_hp: u.no_hp,
                is_active: u.is_active,
                is_email_verified: u.is_email_verified,
                created_at: u.created_at,
            })
            .collect();
        Ok(res)
    }

    pub async fn update_user_role(
        &self,
        operator_email: &str,
        target_user_id: Uuid,
        req: UpdateUserRoleRequest,
    ) -> Result<UserListItemResponse, AppError> {
        let valid_roles = [
            "super_admin",
            "admin_pmb",
            "keuangan",
            "pengawas_ujian",
            "asesor_rpl",
            "calon_mahasiswa",
        ];

        if !valid_roles.contains(&req.role.as_str()) {
            return Err(AppError::BadRequest(format!(
                "Peran '{}' tidak valid. Pilihan: {:?}",
                req.role, valid_roles
            )));
        }

        let updated = self
            .user_repo
            .update_user_role(target_user_id, &req.role)
            .await?;

        // Keamanan: Segera cabut seluruh sesi aktif lama pengguna agar peran baru langsung berlaku
        self.session_store
            .destroy_sessions_by_user_id(&target_user_id)
            .await;

        tracing::info!(
            "AUDIT: Operator {} memperbarui peran pengguna {} ({}) menjadi {}",
            operator_email,
            updated.email,
            updated.id,
            updated.role
        );

        Ok(UserListItemResponse {
            id: updated.id,
            email: updated.email,
            role: updated.role,
            nama_lengkap: updated.nama_lengkap,
            no_hp: updated.no_hp,
            is_active: updated.is_active,
            is_email_verified: updated.is_email_verified,
            created_at: updated.created_at,
        })
    }

    /// Peran yang boleh diberikan Super Admin lewat penetapan massal.
    /// `super_admin` sengaja tidak termasuk agar tidak bisa diberikan massal.
    pub const PERAN_MASSAL: [&'static str; 5] = [
        "admin_pmb",
        "keuangan",
        "calon_mahasiswa",
        "pengawas_ujian",
        "asesor_rpl",
    ];

    pub async fn atur_peran_massal(
        &self,
        operator_id: Uuid,
        operator_email: &str,
        req: AturPeranMassalRequest,
    ) -> Result<AturPeranMassalResponse, AppError> {
        if !Self::PERAN_MASSAL.contains(&req.role.as_str()) {
            return Err(AppError::BadRequest(format!(
                "Peran '{}' tidak dapat ditetapkan massal. Pilihan: {:?}",
                req.role,
                Self::PERAN_MASSAL
            )));
        }
        let mut ids = req.user_ids;
        ids.sort();
        ids.dedup();

        let diubah = self
            .user_repo
            .update_role_massal(&ids, &req.role, operator_id)
            .await?;

        // Cabut sesi lama agar peran baru langsung berlaku
        for u in &diubah {
            self.session_store.destroy_sessions_by_user_id(&u.id).await;
        }

        let dilewati = ids
            .iter()
            .filter(|id| !diubah.iter().any(|u| &u.id == *id))
            .map(|id| PeranDilewati {
                id: *id,
                alasan: if *id == operator_id {
                    "Akun Anda sendiri tidak dapat diubah".to_string()
                } else {
                    "Pengguna tidak ditemukan atau berperan Super Admin".to_string()
                },
            })
            .collect();

        tracing::info!(
            "AUDIT: Operator {} menetapkan peran {} untuk {} pengguna",
            operator_email,
            req.role,
            diubah.len()
        );

        Ok(AturPeranMassalResponse {
            role: req.role,
            diubah: diubah
                .into_iter()
                .map(|u| UserListItemResponse {
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    nama_lengkap: u.nama_lengkap,
                    no_hp: u.no_hp,
                    is_active: u.is_active,
                    is_email_verified: u.is_email_verified,
                    created_at: u.created_at,
                })
                .collect(),
            dilewati,
        })
    }
}
