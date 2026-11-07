use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub host: String,
    pub database_url: String,
    pub redis_url: String,
    pub session_secret: String,
    pub cookie_secure: bool,
    pub cookie_same_site: String,
    pub app_env: String,
    pub cors_origin: Vec<String>,
    pub s3_endpoint: String,
    pub s3_access_key: String,
    pub s3_secret_key: String,
    pub s3_bucket: String,
    pub payment_gateway_provider: String,
    pub midtrans_server_key: String,
    pub midtrans_client_key: String,
    pub midtrans_is_production: bool,
    pub mock_payment_secret: String,
    /// Pengiriman email nyata via SMTP. None = email hanya ditulis ke log (pengembangan).
    pub smtp: Option<SmtpConfig>,
    /// Wajibkan calon memverifikasi email dengan kode 6 digit (env WAJIB_VERIFIKASI_EMAIL=true).
    /// Default nonaktif.
    pub wajib_verifikasi_email: bool,
    /// Sesi tak dipakai selama ini (detik) -> berakhir. Env SESSION_IDLE_SECS.
    pub session_idle_secs: u64,
    /// Umur maksimum sesi sejak login (detik). Env SESSION_ABSOLUTE_SECS.
    pub session_absolute_secs: u64,
}

/// Konfigurasi server SMTP (mis. Gmail Workspace, Mailgun, Brevo, SMTP kampus).
#[derive(Clone)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    /// Alamat pengirim, mis. "PMB Universitas Pignatelli Triputra <pmb@kampus.ac.id>"
    pub from: String,
    /// true = TLS langsung (port 465); false = STARTTLS (port 587)
    pub tls_langsung: bool,
}

// Jangan pernah mencetak kata sandi SMTP ke log
impl std::fmt::Debug for SmtpConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SmtpConfig")
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username)
            .field("from", &self.from)
            .field("tls_langsung", &self.tls_langsung)
            .finish_non_exhaustive()
    }
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .unwrap_or(8080);

        let host = env::var("API_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/pmb_db".to_string());

        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let session_secret = env::var("SESSION_SECRET").unwrap_or_else(|_| {
            "pmb_pignatelli_triputra_super_secret_session_key_2026".to_string()
        });

        let cookie_secure = env::var("COOKIE_SECURE")
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(false);

        let cookie_same_site = env::var("COOKIE_SAME_SITE").unwrap_or_else(|_| "Lax".to_string());

        let app_env = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        let cors_origin = env::var("CORS_ORIGIN")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let s3_endpoint =
            env::var("S3_ENDPOINT").unwrap_or_else(|_| "http://localhost:9000".to_string());
        let s3_access_key = env::var("S3_ACCESS_KEY").unwrap_or_else(|_| "minioadmin".to_string());
        let s3_secret_key = env::var("S3_SECRET_KEY").unwrap_or_else(|_| "minioadmin".to_string());
        let s3_bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "pmb-berkas".to_string());

        let payment_gateway_provider =
            env::var("PAYMENT_GATEWAY_PROVIDER").unwrap_or_else(|_| "mock".to_string());
        let midtrans_server_key =
            env::var("MIDTRANS_SERVER_KEY").unwrap_or_else(|_| "".to_string());
        let midtrans_client_key =
            env::var("MIDTRANS_CLIENT_KEY").unwrap_or_else(|_| "".to_string());
        let midtrans_is_production = env::var("MIDTRANS_IS_PRODUCTION")
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(false);
        let mock_payment_secret = env::var("MOCK_PAYMENT_SECRET")
            .unwrap_or_else(|_| "mock-secret-key-pignatelli".to_string());

        let smtp = match (
            env::var("SMTP_HOST").ok().filter(|v| !v.trim().is_empty()),
            env::var("SMTP_FROM").ok().filter(|v| !v.trim().is_empty()),
        ) {
            (Some(host), Some(from)) => {
                let port = env::var("SMTP_PORT")
                    .ok()
                    .and_then(|v| v.parse::<u16>().ok())
                    .unwrap_or(587);
                Some(SmtpConfig {
                    host,
                    port,
                    username: env::var("SMTP_USERNAME").unwrap_or_default(),
                    password: env::var("SMTP_PASSWORD").unwrap_or_default(),
                    from,
                    tls_langsung: env::var("SMTP_TLS")
                        .map(|v| v.eq_ignore_ascii_case("tls") || v.eq_ignore_ascii_case("ssl"))
                        .unwrap_or(port == 465),
                })
            }
            _ => None,
        };

        let wajib_verifikasi_email = env::var("WAJIB_VERIFIKASI_EMAIL")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false);

        let session_idle_secs = env::var("SESSION_IDLE_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(crate::security::session::BATAS_DIAM_DETIK);
        let session_absolute_secs = env::var("SESSION_ABSOLUTE_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(crate::security::session::BATAS_MUTLAK_DETIK);

        Self {
            port,
            host,
            database_url,
            redis_url,
            session_secret,
            cookie_secure,
            cookie_same_site,
            app_env,
            cors_origin,
            s3_endpoint,
            s3_access_key,
            s3_secret_key,
            s3_bucket,
            payment_gateway_provider,
            midtrans_server_key,
            midtrans_client_key,
            midtrans_is_production,
            mock_payment_secret,
            smtp,
            wajib_verifikasi_email,
            session_idle_secs,
            session_absolute_secs,
        }
    }
}
