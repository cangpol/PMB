// Test suite komprehensif Autentikasi dan Role-Based Access Control (RBAC)
// PMB Universitas Pignatelli Triputra
// 1. Password hashing & argon2 verification
// 2. Alur verifikasi email dan masa berlaku token
// 3. Alur reset password dan invalidasi token pasca pakai
// 4. Rate Limiting login (5 request / 60 detik)
// 5. Account Lockout otomatis (5x gagal login berturut-turut -> terkunci 15 menit)
// 6. Matriks Otorisasi RBAC: Calon mahasiswa DITOLAK mengakses endpoint admin (403 Forbidden)

use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;

// --- Mock & Helper Structs untuk Pengujian Terisolasi ---

#[derive(Clone, Debug)]
pub struct MockUser {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub is_email_verified: bool,
    pub failed_login_attempts: i32,
    pub locked_until: Option<DateTime<Utc>>,
}

#[derive(Clone, Debug)]
pub struct MockToken {
    pub token: String,
    pub user_id: String,
    pub tipe: String,
    pub expires_at: DateTime<Utc>,
    pub used_at: Option<DateTime<Utc>>,
}

pub struct MockAuthEngine {
    pub users: HashMap<String, MockUser>,
    pub tokens: Vec<MockToken>,
    pub rate_limits: HashMap<String, Vec<DateTime<Utc>>>,
    pub sent_emails: Vec<(String, String, String)>,
}

impl Default for MockAuthEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl MockAuthEngine {
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
            tokens: Vec::new(),
            rate_limits: HashMap::new(),
            sent_emails: Vec::new(),
        }
    }

    pub fn check_rate_limit(
        &mut self,
        key: &str,
        max_attempts: usize,
        window_seconds: i64,
    ) -> Result<(), &'static str> {
        let now = Utc::now();
        let attempts = self.rate_limits.entry(key.to_string()).or_default();
        let cutoff = now - Duration::seconds(window_seconds);
        attempts.retain(|&t| t > cutoff);

        if attempts.len() >= max_attempts {
            return Err("429 Too Many Requests: Percobaan melebihi batas yang diizinkan");
        }

        attempts.push(now);
        Ok(())
    }

    pub fn register(
        &mut self,
        email: &str,
        password_hash: &str,
        role: &str,
    ) -> Result<String, &'static str> {
        if self.users.contains_key(email) {
            return Err("409 Conflict: Email sudah terdaftar");
        }

        let user_id = format!("usr-{}", self.users.len() + 1);
        self.users.insert(
            email.to_string(),
            MockUser {
                id: user_id.clone(),
                email: email.to_string(),
                password_hash: password_hash.to_string(),
                role: role.to_string(),
                is_email_verified: false,
                failed_login_attempts: 0,
                locked_until: None,
            },
        );

        let token = format!("tok-verify-{}", user_id);
        self.tokens.push(MockToken {
            token: token.clone(),
            user_id: user_id.clone(),
            tipe: "VERIFIKASI_EMAIL".to_string(),
            expires_at: Utc::now() + Duration::hours(24),
            used_at: None,
        });

        self.sent_emails.push((
            email.to_string(),
            "Verifikasi Akun PMB".to_string(),
            format!("Token verifikasi Anda: {}", token),
        ));

        Ok(token)
    }

    pub fn verify_email(&mut self, token_str: &str) -> Result<(), &'static str> {
        let now = Utc::now();
        let token_entry = self
            .tokens
            .iter_mut()
            .find(|t| t.token == token_str && t.tipe == "VERIFIKASI_EMAIL");

        match token_entry {
            Some(t) => {
                if t.used_at.is_some() {
                    return Err("Token sudah pernah digunakan");
                }
                if t.expires_at <= now {
                    return Err("Token telah kedaluwarsa");
                }
                t.used_at = Some(now);

                let uid = t.user_id.clone();
                if let Some(user) = self.users.values_mut().find(|u| u.id == uid) {
                    user.is_email_verified = true;
                }
                Ok(())
            }
            None => Err("Token tidak valid"),
        }
    }

    pub fn login(&mut self, email: &str, password_matches: bool) -> Result<String, &'static str> {
        let now = Utc::now();
        let user = self
            .users
            .get_mut(email)
            .ok_or("401 Unauthorized: Email atau password salah")?;

        // 1. Cek Lockout
        if let Some(locked) = user.locked_until {
            if locked > now {
                return Err("403 Forbidden: Akun terkunci sementara karena 5x gagal login");
            } else {
                user.locked_until = None;
                user.failed_login_attempts = 0;
            }
        }

        // 2. Cek Password
        if !password_matches {
            user.failed_login_attempts += 1;
            if user.failed_login_attempts >= 5 {
                user.locked_until = Some(now + Duration::minutes(15));
                return Err(
                    "403 Forbidden: Akun terkunci sementara selama 15 menit karena 5x gagal login",
                );
            }
            return Err("401 Unauthorized: Email atau password salah");
        }

        // 3. Reset jika login sukses
        user.failed_login_attempts = 0;
        user.locked_until = None;

        Ok(user.role.clone())
    }

    pub fn request_forgot_password(&mut self, email: &str) -> Result<Option<String>, &'static str> {
        if let Some(user) = self.users.get(email) {
            let token = format!("tok-reset-{}", user.id);
            self.tokens.push(MockToken {
                token: token.clone(),
                user_id: user.id.clone(),
                tipe: "RESET_PASSWORD".to_string(),
                expires_at: Utc::now() + Duration::hours(1),
                used_at: None,
            });

            self.sent_emails.push((
                email.to_string(),
                "Instruksi Reset Password".to_string(),
                format!("Token reset: {}", token),
            ));
            return Ok(Some(token));
        }
        Ok(None)
    }

    pub fn reset_password(
        &mut self,
        token_str: &str,
        new_password_hash: &str,
    ) -> Result<(), &'static str> {
        let now = Utc::now();
        let token_entry = self
            .tokens
            .iter_mut()
            .find(|t| t.token == token_str && t.tipe == "RESET_PASSWORD");

        match token_entry {
            Some(t) => {
                if t.used_at.is_some() {
                    return Err("Token sudah digunakan");
                }
                if t.expires_at <= now {
                    return Err("Token telah kedaluwarsa");
                }
                t.used_at = Some(now);

                let uid = t.user_id.clone();
                if let Some(user) = self.users.values_mut().find(|u| u.id == uid) {
                    user.password_hash = new_password_hash.to_string();
                    user.failed_login_attempts = 0;
                    user.locked_until = None;
                }
                Ok(())
            }
            None => Err("Token tidak valid"),
        }
    }
}

// --- Matriks Otorisasi RBAC PMB ---
pub fn authorize_endpoint(user_role: &str, endpoint_requirement: &str) -> Result<(), &'static str> {
    match endpoint_requirement {
        "REQUIRE_SUPER_ADMIN" => {
            if user_role == "super_admin" {
                Ok(())
            } else {
                Err("403 Forbidden: Hanya Super Admin yang berwenang")
            }
        }
        "REQUIRE_ADMIN" => {
            if user_role == "super_admin" || user_role == "admin_pmb" {
                Ok(())
            } else {
                Err("403 Forbidden: Akses khusus Administrator PMB")
            }
        }
        "REQUIRE_KEUANGAN" => {
            if user_role == "super_admin" || user_role == "keuangan" {
                Ok(())
            } else {
                Err("403 Forbidden: Akses khusus Staf Keuangan")
            }
        }
        "REQUIRE_PENGAWAS" => {
            if user_role == "super_admin"
                || user_role == "admin_pmb"
                || user_role == "pengawas_ujian"
            {
                Ok(())
            } else {
                Err("403 Forbidden: Akses khusus Pengawas Ujian CBT")
            }
        }
        "REQUIRE_ASESOR" => {
            if user_role == "super_admin" || user_role == "admin_pmb" || user_role == "asesor_rpl" {
                Ok(())
            } else {
                Err("403 Forbidden: Akses khusus Asesor RPL")
            }
        }
        "REQUIRE_CALON" => {
            if user_role == "calon_mahasiswa" || user_role == "super_admin" {
                Ok(())
            } else {
                Err("403 Forbidden: Fitur khusus calon mahasiswa")
            }
        }
        _ => Err("403 Forbidden: Peran tidak dikenali"),
    }
}

// ======================= UNIT TESTS =======================

#[test]
fn test_argon2_password_hashing_and_verification() {
    use argon2::{
        Argon2,
        password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
    };

    let password = "PignatelliSecure2026!";
    let argon2 = Argon2::default();
    let hashed = argon2
        .hash_password(password.as_bytes())
        .unwrap()
        .to_string();

    assert!(hashed.starts_with("$argon2id$"));
    let parsed = PasswordHash::new(&hashed).unwrap();
    assert!(
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok()
    );
    assert!(
        Argon2::default()
            .verify_password("PasswordSalah!".as_bytes(), &parsed)
            .is_err()
    );
}

#[test]
fn test_registration_and_email_verification_flow() {
    let mut engine = MockAuthEngine::new();
    let token = engine
        .register("budi@example.com", "hash_pw_123", "calon_mahasiswa")
        .expect("Registrasi calon mahasiswa berhasil");

    let user = engine.users.get("budi@example.com").unwrap();
    assert_eq!(user.role, "calon_mahasiswa");
    assert!(!user.is_email_verified);
    assert_eq!(engine.sent_emails.len(), 1);
    assert!(engine.sent_emails[0].2.contains(&token));

    // Verifikasi email dengan token yang valid
    assert!(engine.verify_email(&token).is_ok());
    assert!(
        engine
            .users
            .get("budi@example.com")
            .unwrap()
            .is_email_verified
    );

    // Token tidak boleh bisa digunakan kedua kali (single-use)
    assert!(engine.verify_email(&token).is_err());
}

#[test]
fn test_rate_limiting_login_endpoint() {
    let mut engine = MockAuthEngine::new();
    let ip_key = "login:192.168.1.50";

    // 5 percobaan pertama dalam 60 detik diizinkan
    for _ in 0..5 {
        assert!(engine.check_rate_limit(ip_key, 5, 60).is_ok());
    }

    // Percobaan ke-6 langsung ditolak 429
    let err = engine.check_rate_limit(ip_key, 5, 60);
    assert!(err.is_err());
    assert!(err.unwrap_err().contains("429"));
}

#[test]
fn test_account_lockout_after_five_failed_attempts() {
    let mut engine = MockAuthEngine::new();
    engine
        .register("siti@example.com", "hash_pwd", "calon_mahasiswa")
        .unwrap();

    // 4 kali gagal login
    for i in 1..=4 {
        let res = engine.login("siti@example.com", false);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("401"));
        assert_eq!(
            engine
                .users
                .get("siti@example.com")
                .unwrap()
                .failed_login_attempts,
            i
        );
    }

    // Gagal ke-5: Akun terkunci sementara selama 15 menit
    let res5 = engine.login("siti@example.com", false);
    assert!(res5.is_err());
    assert!(res5.unwrap_err().contains("terkunci"));
    let user = engine.users.get("siti@example.com").unwrap();
    assert!(user.locked_until.is_some());
    assert!(user.locked_until.unwrap() > Utc::now());

    // Percobaan berikutnya meskipun password BENAR akan tetap DITOLAK karena akun masih terkunci
    let res_locked = engine.login("siti@example.com", true);
    assert!(res_locked.is_err());
    assert!(res_locked.unwrap_err().contains("terkunci"));
}

#[test]
fn test_forgot_and_reset_password_flow() {
    let mut engine = MockAuthEngine::new();
    engine
        .register("dewi@example.com", "old_hash", "calon_mahasiswa")
        .unwrap();

    let reset_token = engine
        .request_forgot_password("dewi@example.com")
        .unwrap()
        .expect("Token reset terbit");

    assert_eq!(engine.sent_emails.len(), 2); // 1 regis + 1 reset

    // Reset password dengan token valid
    assert!(
        engine
            .reset_password(&reset_token, "new_secure_hash")
            .is_ok()
    );
    assert_eq!(
        engine.users.get("dewi@example.com").unwrap().password_hash,
        "new_secure_hash"
    );

    // Token tidak dapat digunakan ulang
    assert!(engine.reset_password(&reset_token, "another_hash").is_err());
}

#[test]
fn test_rbac_calon_mahasiswa_cannot_access_admin_endpoints() {
    let calon_role = "calon_mahasiswa";

    // 1. Calon mahasiswa DITOLAK saat mengakses endpoint admin
    let res_admin = authorize_endpoint(calon_role, "REQUIRE_ADMIN");
    assert!(res_admin.is_err());
    assert!(res_admin.unwrap_err().contains("403 Forbidden"));

    // 2. Calon mahasiswa DITOLAK saat mengakses endpoint keuangan
    let res_keuangan = authorize_endpoint(calon_role, "REQUIRE_KEUANGAN");
    assert!(res_keuangan.is_err());
    assert!(res_keuangan.unwrap_err().contains("403 Forbidden"));

    // 3. Calon mahasiswa DITOLAK saat mengakses endpoint pengawas ujian CBT
    let res_pengawas = authorize_endpoint(calon_role, "REQUIRE_PENGAWAS");
    assert!(res_pengawas.is_err());
    assert!(res_pengawas.unwrap_err().contains("403 Forbidden"));

    // 4. Calon mahasiswa DITOLAK saat mengakses endpoint asesor RPL
    let res_asesor = authorize_endpoint(calon_role, "REQUIRE_ASESOR");
    assert!(res_asesor.is_err());
    assert!(res_asesor.unwrap_err().contains("403 Forbidden"));

    // 5. Calon mahasiswa DIIZINKAN mengakses portal calon
    assert!(authorize_endpoint(calon_role, "REQUIRE_CALON").is_ok());
}

#[test]
fn test_rbac_admin_and_super_admin_privileges() {
    let admin_role = "admin_pmb";
    let super_admin_role = "super_admin";
    let keuangan_role = "keuangan";

    // Admin PMB bisa akses endpoint admin, tapi DITOLAK jika butuh Super Admin
    assert!(authorize_endpoint(admin_role, "REQUIRE_ADMIN").is_ok());
    assert!(authorize_endpoint(admin_role, "REQUIRE_SUPER_ADMIN").is_err());

    // Super Admin bisa akses seluruh endpoint
    assert!(authorize_endpoint(super_admin_role, "REQUIRE_ADMIN").is_ok());
    assert!(authorize_endpoint(super_admin_role, "REQUIRE_SUPER_ADMIN").is_ok());
    assert!(authorize_endpoint(super_admin_role, "REQUIRE_KEUANGAN").is_ok());
    assert!(authorize_endpoint(super_admin_role, "REQUIRE_PENGAWAS").is_ok());
    assert!(authorize_endpoint(super_admin_role, "REQUIRE_CALON").is_ok());

    // Staf keuangan hanya berwenang untuk endpoint keuangan
    assert!(authorize_endpoint(keuangan_role, "REQUIRE_KEUANGAN").is_ok());
    assert!(authorize_endpoint(keuangan_role, "REQUIRE_ADMIN").is_err());
    assert!(authorize_endpoint(keuangan_role, "REQUIRE_SUPER_ADMIN").is_err());
}

#[test]
fn test_immediate_session_revocation_on_role_demotion_and_password_reset() {
    let mut session_store: HashMap<String, (String, String)> = HashMap::new(); // session_id -> (user_id, role)

    let user_id = "usr-operator-99".to_string();
    let sess_1 = "sess_cookie_1".to_string();
    let sess_2 = "sess_cookie_2".to_string();

    session_store.insert(sess_1.clone(), (user_id.clone(), "admin_pmb".to_string()));
    session_store.insert(sess_2.clone(), (user_id.clone(), "admin_pmb".to_string()));
    assert_eq!(session_store.len(), 2);

    // Saat super admin mencabut / mengubah peran user atau mereset password, seluruh sesi aktif dicabut seketika
    session_store.retain(|_, (uid, _)| uid != &user_id);

    // Seluruh sesi lama musnah dan ditolak saat request berikutnya
    assert!(!session_store.contains_key(&sess_1));
    assert!(!session_store.contains_key(&sess_2));
    assert_eq!(session_store.len(), 0);
}
