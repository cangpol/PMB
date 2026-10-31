use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
};

pub fn hash_password(password: &str) -> Result<String, String> {
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes())
        .map(|hash| hash.to_string())
        .map_err(|e| format!("Gagal melakukan hash password: {e}"))
}

pub fn verify_password(password: &str, password_hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(password_hash) {
        Ok(hash) => hash,
        Err(_) => return false,
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let raw_pwd = "PignatelliTriputra2026!";
        let hashed = hash_password(raw_pwd).expect("Harus berhasil hash");
        assert!(verify_password(raw_pwd, &hashed));
        assert!(!verify_password("PasswordSalah123", &hashed));
    }
}
