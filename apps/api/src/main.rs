use axum::{
    Router,
    http::{Method, header},
    routing::get,
};
use sqlx::postgres::PgPoolOptions;
use std::{env, net::SocketAddr};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use api::{
    config::AppConfig,
    modules::{
        auth::{admin_router, auth_router, handler::me_handler},
        cbt::cbt_router,
        cms::cms_router,
        dashboard::dashboard_router,
        health::{health_check_handler, liveness_handler, readiness_handler},
        kelulusan::kelulusan_router,
        konfigurasi::konfigurasi_router,
        master::master_router,
        pembayaran::pembayaran_router,
        pendaftaran::pendaftaran_router,
        rpl::rpl_router,
    },
    openapi::ApiDoc,
    security::SessionStore,
    state::AppState,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Cek argumen CLI (ekspor OpenAPI spec ke file JSON)
    let args: Vec<String> = env::args().collect();
    if args.len() >= 3 && args[1] == "--export-openapi" {
        let path = &args[2];
        let openapi_json = ApiDoc::openapi().to_pretty_json()?;
        std::fs::write(path, openapi_json)?;
        println!("OpenAPI spec berhasil diekspor ke: {}", path);
        return Ok(());
    }

    // 2. Setup Tracing & Logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 3. Muat Konfigurasi
    let config = AppConfig::from_env();
    tracing::info!(
        "Memulai Sistem PMB Universitas Pignatelli Triputra [Env: {}]",
        config.app_env
    );

    // 4. Inisialisasi Database Pool & Migrasi Skema Otomatis
    let db_pool = match PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(std::time::Duration::from_secs(15))
        .connect(&config.database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("Koneksi PostgreSQL berhasil");
            if let Err(e) = sqlx::migrate!("./migrations").run(&pool).await {
                tracing::warn!("Peringatan migrasi skema database otomatis: {}", e);
            } else {
                tracing::info!("Migrasi skema database SQLx berhasil diverifikasi/diterapkan.");
            }
            pool
        }
        Err(err) => {
            tracing::warn!(
                "Gagal terhubung ke PostgreSQL ({}). Menggunakan pool lokal fallback jika tersedia",
                err
            );
            PgPoolOptions::new()
                .connect_lazy(&config.database_url)
                .map_err(|e| format!("Pool lazy init: {e}"))?
        }
    };

    // 5. Inisialisasi Session Store
    let session_store = SessionStore::new();

    // 6. Siapkan Shared AppState
    let state = AppState::new(db_pool, session_store, config.clone());

    // 6b. Jalankan Background Worker Antrean Email
    tokio::spawn(api::modules::email_queue::start_email_worker(
        state.db.clone(),
        state.mail_sender.clone(),
    ));

    // 7. Setup CORS Ketat & Keamanan Asal Permintaan
    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::COOKIE,
            header::ACCEPT,
            header::HeaderName::from_static("x-signature-key"),
        ]);

    let origins: Vec<header::HeaderValue> = config
        .cors_origin
        .iter()
        .filter_map(|s| s.parse::<header::HeaderValue>().ok())
        .collect();

    let cors = if !origins.is_empty() {
        cors.allow_origin(origins).allow_credentials(true)
    } else {
        cors.allow_origin(Any).allow_credentials(false)
    };

    // 8. Komposisi Router Modular Monolith
    let api_router = Router::new()
        .nest("/auth", auth_router())
        .nest("/admin", admin_router())
        .nest("/admin/konfigurasi", konfigurasi_router())
        .nest("/master", master_router())
        .nest("/pendaftaran", pendaftaran_router())
        .nest("/pembayaran", pembayaran_router())
        .nest("/cbt", cbt_router())
        .nest("/kelulusan", kelulusan_router())
        .nest("/rpl", rpl_router())
        .nest("/cms", cms_router())
        .nest("/dashboard", dashboard_router())
        .route("/me", get(me_handler))
        .route("/health", get(health_check_handler))
        .route("/health/live", get(liveness_handler))
        .route("/health/ready", get(readiness_handler));

    let app = Router::new()
        .route("/health", get(health_check_handler))
        .route("/health/live", get(liveness_handler))
        .route("/health/ready", get(readiness_handler))
        .route(
            "/api/docs",
            get(|| async { axum::response::Redirect::temporary("/swagger-ui/") }),
        )
        .nest("/api", api_router)
        .merge(SwaggerUi::new("/swagger-ui").url("/api/openapi.json", ApiDoc::openapi()))
        .layer(axum::middleware::from_fn(security_headers_middleware))
        .layer(cors)
        .with_state(state);

    // 9. Jalankan Listener
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server API PMB aktif di http://{}", addr);
    tracing::info!(
        "Dokumentasi Swagger UI: http://{}/api/docs (dan http://{}/swagger-ui)",
        addr,
        addr
    );

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Middleware HTTP Security Headers (OWASP Top 10 Best Practices)
async fn security_headers_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        header::HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::X_FRAME_OPTIONS,
        header::HeaderValue::from_static("DENY"),
    );
    headers.insert(
        header::HeaderName::from_static("x-xss-protection"),
        header::HeaderValue::from_static("1; mode=block"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        header::HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        header::HeaderName::from_static("permissions-policy"),
        header::HeaderValue::from_static("geolocation=(), camera=(), microphone=()"),
    );
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        header::HeaderValue::from_static(
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https: http:;",
        ),
    );
    response
}
