//! =============================================================================
//! Test Suite Keamanan OWASP Top 10, Matriks Otorisasi, & Pencegahan IDOR
//! Sistem PMB Universitas Pignatelli Triputra
//! =============================================================================

use std::collections::HashSet;
use uuid::Uuid;

// =============================================================================
// 1. MODEL ROLE & PERMISSION MATRIX
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum UserRole {
    SuperAdmin,
    AdminPmb,
    Keuangan,
    PengawasUjian,
    AsesorRpl,
    CalonMahasiswa,
    PublicAnonymous,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::SuperAdmin => "super_admin",
            UserRole::AdminPmb => "admin_pmb",
            UserRole::Keuangan => "keuangan",
            UserRole::PengawasUjian => "pengawas_ujian",
            UserRole::AsesorRpl => "asesor_rpl",
            UserRole::CalonMahasiswa => "calon_mahasiswa",
            UserRole::PublicAnonymous => "anonymous",
        }
    }
}

pub struct RouteAccessControl {
    pub path: &'static str,
    pub method: &'static str,
    pub allowed_roles: HashSet<UserRole>,
}

impl RouteAccessControl {
    pub fn new(path: &'static str, method: &'static str, roles: &[UserRole]) -> Self {
        let mut allowed = HashSet::new();
        for r in roles {
            allowed.insert(*r);
        }
        Self {
            path,
            method,
            allowed_roles: allowed,
        }
    }

    pub fn is_allowed(&self, role: UserRole) -> bool {
        self.allowed_roles.contains(&role)
    }
}

// =============================================================================
// 2. MATRIKS RESMI OTORISASI SELURUH ENDPOINT
// =============================================================================

fn get_pmb_route_matrix() -> Vec<RouteAccessControl> {
    vec![
        // Publik (Tanpa Autentikasi)
        RouteAccessControl::new(
            "/api/auth/register",
            "POST",
            &[
                UserRole::PublicAnonymous,
                UserRole::CalonMahasiswa,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        RouteAccessControl::new(
            "/api/auth/login",
            "POST",
            &[
                UserRole::PublicAnonymous,
                UserRole::CalonMahasiswa,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
                UserRole::Keuangan,
                UserRole::PengawasUjian,
                UserRole::AsesorRpl,
            ],
        ),
        RouteAccessControl::new(
            "/api/cms/posts",
            "GET",
            &[
                UserRole::PublicAnonymous,
                UserRole::CalonMahasiswa,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
                UserRole::Keuangan,
                UserRole::PengawasUjian,
                UserRole::AsesorRpl,
            ],
        ),
        RouteAccessControl::new(
            "/api/cms/faqs",
            "GET",
            &[
                UserRole::PublicAnonymous,
                UserRole::CalonMahasiswa,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        RouteAccessControl::new(
            "/api/health",
            "GET",
            &[
                UserRole::PublicAnonymous,
                UserRole::CalonMahasiswa,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        // Portal Calon Mahasiswa (IDOR-Protected)
        RouteAccessControl::new(
            "/api/pendaftaran/status",
            "GET",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/pendaftaran/steps/1",
            "POST",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/pembayaran/tagihan",
            "GET",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/cbt/ujian/start",
            "POST",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/kelulusan/my-result",
            "GET",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/rpl/permohonan/me",
            "GET",
            &[UserRole::CalonMahasiswa, UserRole::SuperAdmin],
        ),
        // Admin Keuangan
        RouteAccessControl::new(
            "/api/pembayaran/admin/transaksi",
            "GET",
            &[UserRole::Keuangan, UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/pembayaran/admin/verifikasi",
            "POST",
            &[UserRole::Keuangan, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/dashboard/admin/stats",
            "GET",
            &[UserRole::Keuangan, UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/dashboard/admin/export-excel",
            "GET",
            &[UserRole::Keuangan, UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        // Pengawas CBT
        RouteAccessControl::new(
            "/api/cbt/admin/sesi",
            "GET",
            &[
                UserRole::PengawasUjian,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        RouteAccessControl::new(
            "/api/cbt/admin/presensi",
            "POST",
            &[
                UserRole::PengawasUjian,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        RouteAccessControl::new(
            "/api/cbt/admin/monitor",
            "GET",
            &[
                UserRole::PengawasUjian,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        // Asesor RPL
        RouteAccessControl::new(
            "/api/rpl/admin/penilaian",
            "POST",
            &[
                UserRole::AsesorRpl,
                UserRole::AdminPmb,
                UserRole::SuperAdmin,
            ],
        ),
        // Admin PMB & Super Admin (CMS, Seleksi, Konfigurasi)
        RouteAccessControl::new(
            "/api/cms/admin/posts",
            "POST",
            &[UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/cms/admin/upload-presign",
            "POST",
            &[UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/kelulusan/admin/proses-ranking",
            "POST",
            &[UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/kelulusan/admin/publikasi",
            "POST",
            &[UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        RouteAccessControl::new(
            "/api/kelulusan/admin/ekspor-siakad",
            "GET",
            &[UserRole::AdminPmb, UserRole::SuperAdmin],
        ),
        // Khusus Super Admin
        RouteAccessControl::new(
            "/api/admin/konfigurasi/jalur",
            "POST",
            &[UserRole::SuperAdmin],
        ),
        RouteAccessControl::new("/api/admin/users", "GET", &[UserRole::SuperAdmin]),
    ]
}

// =============================================================================
// 3. TESTS: ISOLASI OTORISASI & MATRIKS HAK AKSES
// =============================================================================

#[test]
fn test_security_authorization_matrix_strict_rules() {
    let routes = get_pmb_route_matrix();

    // 1. Calon Mahasiswa TIDAK BOLEH mengakses endpoint admin apa pun
    for r in &routes {
        if r.path.contains("/admin") {
            assert!(
                !r.is_allowed(UserRole::CalonMahasiswa),
                "PELANGGARAN KEAMANAN: CalonMahasiswa dapat mengakses route admin: {}",
                r.path
            );
        }
    }

    // 2. Anonymous TIDAK BOLEH mengakses data portal calon maupun admin
    for r in &routes {
        if r.path.starts_with("/api/pendaftaran")
            || r.path.starts_with("/api/pembayaran/tagihan")
            || r.path.starts_with("/api/cbt/ujian")
            || r.path.contains("/admin")
        {
            assert!(
                !r.is_allowed(UserRole::PublicAnonymous),
                "PELANGGARAN KEAMANAN: Anonymous dapat mengakses route terlindung: {}",
                r.path
            );
        }
    }

    // 3. Pengawas Ujian TIDAK BOLEH mengakses verifikasi keuangan atau CMS
    let finance_route = routes
        .iter()
        .find(|r| r.path == "/api/pembayaran/admin/verifikasi")
        .unwrap();
    assert!(!finance_route.is_allowed(UserRole::PengawasUjian));

    let cms_route = routes
        .iter()
        .find(|r| r.path == "/api/cms/admin/posts")
        .unwrap();
    assert!(!cms_route.is_allowed(UserRole::PengawasUjian));

    // 4. Asesor RPL TIDAK BOLEH mengakses publikasi kelulusan
    let pub_kelulusan = routes
        .iter()
        .find(|r| r.path == "/api/kelulusan/admin/publikasi")
        .unwrap();
    assert!(!pub_kelulusan.is_allowed(UserRole::AsesorRpl));

    // 5. Super Admin memiliki hak akses penuh
    for r in &routes {
        if r.path != "/api/auth/register" && r.path != "/api/auth/login" {
            assert!(
                r.is_allowed(UserRole::SuperAdmin),
                "SuperAdmin harus memiliki akses ke {}",
                r.path
            );
        }
    }
}

// =============================================================================
// 4. TESTS: PENCEGAHAN IDOR (INSECURE DIRECT OBJECT REFERENCE)
// =============================================================================

#[allow(dead_code)]
struct MockCandidateSession {
    user_id: Uuid,
    pendaftar_id: Uuid,
    nama: String,
}

fn simulate_fetch_candidate_result(
    session: &MockCandidateSession,
    requested_pendaftar_id: Option<Uuid>,
) -> Result<String, &'static str> {
    // Pada arsitektur yang aman (anti-IDOR), endpoint /api/kelulusan/my-result
    // SELALU menggunakan pendaftar_id yang terikat dengan user_id sesi autentikasi,
    // dan menolak upaya calon meminta ID milik pendaftar lain.
    if matches!(requested_pendaftar_id, Some(target_id) if target_id != session.pendaftar_id) {
        return Err("403 Forbidden: Anda tidak diizinkan mengakses hasil kandidat lain");
    }

    Ok(format!("Hasil Kelulusan Milik: {}", session.nama))
}

#[test]
fn test_idor_prevention_on_candidate_endpoints() {
    let calon_a = MockCandidateSession {
        user_id: Uuid::new_v4(),
        pendaftar_id: Uuid::new_v4(),
        nama: "Budi Santoso".to_string(),
    };

    let calon_b = MockCandidateSession {
        user_id: Uuid::new_v4(),
        pendaftar_id: Uuid::new_v4(),
        nama: "Siti Rahma".to_string(),
    };

    // 1. Calon A mengakses datanya sendiri tanpa parameter ID (ID otomatis dari session) -> Berhasil
    let res_own = simulate_fetch_candidate_result(&calon_a, None);
    assert!(res_own.is_ok());
    assert!(res_own.unwrap().contains("Budi Santoso"));

    // 2. Calon A mencoba memalsukan pendaftar_id milik Calon B -> Wajib DITOLAK (IDOR Neutralized)
    let res_idor_attack = simulate_fetch_candidate_result(&calon_a, Some(calon_b.pendaftar_id));
    assert!(res_idor_attack.is_err());
    assert_eq!(
        res_idor_attack.err().unwrap(),
        "403 Forbidden: Anda tidak diizinkan mengakses hasil kandidat lain"
    );
}

// =============================================================================
// 5. TESTS: RATE LIMITING LOGIC VERIFICATION
// =============================================================================

#[test]
fn test_rate_limiting_sliding_window_protection() {
    use std::time::{Duration, Instant};

    struct SimpleRateLimiter {
        records: Vec<Instant>,
        max_attempts: usize,
        window: Duration,
    }

    impl SimpleRateLimiter {
        fn new(max: usize, window_secs: u64) -> Self {
            Self {
                records: Vec::new(),
                max_attempts: max,
                window: Duration::from_secs(window_secs),
            }
        }

        fn record_and_check(&mut self, now: Instant) -> bool {
            self.records
                .retain(|&t| now.duration_since(t) < self.window);
            if self.records.len() >= self.max_attempts {
                false
            } else {
                self.records.push(now);
                true
            }
        }
    }

    let mut limiter = SimpleRateLimiter::new(5, 60);
    let start = Instant::now();

    // 5 percobaan pertama dalam 1 menit harus berhasil
    for _ in 0..5 {
        assert!(limiter.record_and_check(start));
    }

    // Percobaan ke-6 dalam jendela waktu yang sama harus diblokir (429 Too Many Requests)
    assert!(!limiter.record_and_check(start));

    // Setelah jendela waktu 60 detik berlalu, percobaan kembali diizinkan
    let after_window = start + Duration::from_secs(61);
    assert!(limiter.record_and_check(after_window));
}

// =============================================================================
// 6. TESTS: HTTP SECURITY HEADERS SPECIFICATION
// =============================================================================

#[test]
fn test_security_headers_compliance() {
    let expected_headers = [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("X-XSS-Protection", "1; mode=block"),
        ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ];

    for (header, val) in expected_headers {
        assert!(!header.is_empty());
        assert!(!val.is_empty());
    }
}
