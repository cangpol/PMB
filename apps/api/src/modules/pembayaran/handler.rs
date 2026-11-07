use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::header,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{AuthUser, ValidatedJson},
    modules::{
        pembayaran::{
            dto::{
                AdminTransaksiItem, CekVoucherRequest, CekVoucherResponse, ChargePaymentRequest,
                FilterTransaksiKeuanganRequest, KonfirmasiBayarRequest, ListTransaksiAdminResponse,
                MidtransWebhookPayload, MockWebhookPayload, PembayaranDetailResponse,
                PilihMetodeRequest, RekonsiliasiResponse, RingkasanKeuanganResponse,
                TagihanWithTransaksiResponse, TransaksiDetailResponse,
            },
            repository::PembayaranRepository,
            service::PembayaranService,
        },
        pendaftaran::repository::PendaftaranRepository,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        cek_voucher_handler,
        get_my_tagihan_handler,
        buat_tagihan_formulir_handler,
        charge_payment_handler,
        midtrans_webhook_handler,
        mock_webhook_handler,
        simulasi_va_bayar_handler,
        admin_konfirmasi_bayar_handler,
        admin_konfirmasi_manual_handler,
        admin_rekonsiliasi_handler,
        admin_list_pembayaran_handler,
        admin_ekspor_transaksi_handler
    ),
    components(schemas(
        CekVoucherRequest,
        CekVoucherResponse,
        PilihMetodeRequest,
        ChargePaymentRequest,
        KonfirmasiBayarRequest,
        PembayaranDetailResponse,
        TransaksiDetailResponse,
        TagihanWithTransaksiResponse,
        MidtransWebhookPayload,
        MockWebhookPayload,
        FilterTransaksiKeuanganRequest,
        RingkasanKeuanganResponse,
        AdminTransaksiItem,
        ListTransaksiAdminResponse,
        RekonsiliasiResponse,
        ApiErrorResponse
    ))
)]
pub struct PembayaranApiDoc;

pub fn pembayaran_router() -> Router<AppState> {
    Router::new()
        .route("/cek-voucher", post(cek_voucher_handler))
        .route("/my-tagihan", get(get_my_tagihan_handler))
        .route("/buat-tagihan", post(buat_tagihan_formulir_handler))
        .route("/charge", post(charge_payment_handler))
        .route("/webhook/midtrans", post(midtrans_webhook_handler))
        .route("/webhook/mock", post(mock_webhook_handler))
        .route("/simulasi-va-bayar/{id}", post(simulasi_va_bayar_handler))
        .route("/admin/konfirmasi", post(admin_konfirmasi_bayar_handler))
        .route(
            "/admin/konfirmasi-manual",
            post(admin_konfirmasi_manual_handler),
        )
        .route("/admin/rekonsiliasi/{id}", post(admin_rekonsiliasi_handler))
        .route("/admin/list", get(admin_list_pembayaran_handler))
        .route("/admin/ekspor", get(admin_ekspor_transaksi_handler))
        .merge(super::bukti::bukti_router())
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/cek-voucher",
    tag = "Pembayaran",
    request_body = CekVoucherRequest,
    responses(
        (status = 200, description = "Hasil pengecekan kode voucher", body = CekVoucherResponse),
        (status = 404, description = "Voucher tidak ditemukan", body = ApiErrorResponse),
        (status = 400, description = "Voucher tidak valid / habis / kedaluwarsa", body = ApiErrorResponse)
    )
)]
pub async fn cek_voucher_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(mut req): ValidatedJson<CekVoucherRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = PembayaranRepository::new(state.db.clone());
    // Pratinjau memakai biaya & batasan jalur/prodi milik calon, sama seperti saat
    // tagihan diterbitkan, agar hasil pratinjau tidak berbeda dengan tagihan.
    let pendaftar = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(auth_user.user_id)
        .await?;
    let (jalur, prodi) = match &pendaftar {
        Some(p) => {
            req.nominal_asli = repo.get_biaya_formulir_jalur(p.jalur_id).await?;
            (Some(p.jalur_id), Some(p.prodi_pilihan_1))
        }
        None => (None, None),
    };
    let service = PembayaranService::new(repo, state.payment_gateway.clone());
    let res = service.cek_voucher(req, jalur, prodi).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/my-tagihan",
    tag = "Pembayaran",
    responses(
        (status = 200, description = "Tagihan aktif pendaftar", body = Option<TagihanWithTransaksiResponse>),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_my_tagihan_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| {
            AppError::NotFound("Belum ada formulir pendaftaran untuk akun ini".to_string())
        })?;

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    let res = service.get_my_active_tagihan(pendaftar.id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/buat-tagihan",
    tag = "Pembayaran",
    request_body = PilihMetodeRequest,
    responses(
        (status = 200, description = "Tagihan berhasil diterbitkan", body = TagihanWithTransaksiResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn buat_tagihan_formulir_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<PilihMetodeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| {
            AppError::NotFound(
                "Silakan isi tahap awal formulir pendaftaran terlebih dahulu".to_string(),
            )
        })?;

    if pendaftar.status_pendaftaran == crate::modules::pendaftaran::alur::status::DRAFT {
        return Err(AppError::Conflict(
            "Kirim formulir pendaftaran terlebih dahulu sebelum membayar biaya formulir."
                .to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );

    let res = service
        .buat_atau_ambil_tagihan_formulir(
            pendaftar.id,
            pendaftar.prodi_pilihan_1,
            pendaftar.jalur_id,
            pendaftar.gelombang_id,
            req.kode_voucher,
        )
        .await?;

    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/charge",
    tag = "Pembayaran",
    request_body = ChargePaymentRequest,
    responses(
        (status = 200, description = "Transaksi gateway berhasil dibuat (VA / QRIS)", body = TransaksiDetailResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn charge_payment_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<ChargePaymentRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = PembayaranRepository::new(state.db.clone());
    let tagihan = repo
        .find_tagihan_by_id(req.tagihan_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tagihan pembayaran tidak ditemukan".to_string()))?;

    // Proteksi IDOR: pastikan tagihan milik pendaftar user aktif (kecuali admin/keuangan)
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
        let pendaftar = pendaftar_repo
            .find_by_user_id(auth_user.user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;

        if tagihan.pendaftar_id != pendaftar.id {
            return Err(AppError::Forbidden(
                "Anda tidak memiliki hak akses untuk memproses tagihan pendaftar lain".to_string(),
            ));
        }
    }

    // Ambil data user
    let user_row: (String, String, Option<String>) =
        sqlx::query_as("SELECT nama_lengkap, email, no_hp FROM users WHERE id = $1")
            .bind(auth_user.user_id)
            .fetch_one(&state.db)
            .await?;

    let service = PembayaranService::new(repo, state.payment_gateway.clone());

    let res = service
        .charge_tagihan(
            req.tagihan_id,
            &req.metode_pembayaran,
            &user_row.0,
            &user_row.1,
            user_row.2.as_deref().unwrap_or("08123456789"),
        )
        .await?;

    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/webhook/midtrans",
    tag = "Pembayaran",
    request_body = MidtransWebhookPayload,
    responses(
        (status = 200, description = "Webhook Midtrans berhasil diproses")
    )
)]
pub async fn midtrans_webhook_handler(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<MidtransWebhookPayload>,
) -> Result<impl IntoResponse, AppError> {
    // Proteksi rate limit pada endpoint notifikasi webhook
    state
        .rate_limiter
        .check_rate_limit(&format!("webhook:midtrans:{}", payload.order_id), 120, 60)
        .await?;

    let header_sig = headers
        .get("x-signature-key")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );

    let (settled, message) = service.handle_midtrans_webhook(payload, header_sig).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "settled": settled,
        "message": message
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/webhook/mock",
    tag = "Pembayaran",
    request_body = MockWebhookPayload,
    responses(
        (status = 200, description = "Webhook mock dev berhasil diproses")
    )
)]
pub async fn mock_webhook_handler(
    State(state): State<AppState>,
    Json(payload): Json<MockWebhookPayload>,
) -> Result<impl IntoResponse, AppError> {
    if !mode_simulasi_diizinkan(&state) {
        return Err(AppError::Forbidden(
            "Mock webhook dinonaktifkan pada provider gateway aktif".to_string(),
        ));
    }

    // Proteksi rate limit pada endpoint notifikasi mock webhook
    state
        .rate_limiter
        .check_rate_limit(&format!("webhook:mock:{}", payload.order_id), 120, 60)
        .await?;

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );

    let (settled, message) = service.handle_mock_webhook(payload).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "settled": settled,
        "message": message
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/simulasi-va-bayar/{id}",
    tag = "Pembayaran",
    params(
        ("id" = Uuid, Path, description = "ID Tagihan atau Pembayaran yang akan disimulasikan lunas")
    ),
    responses(
        (status = 200, description = "Simulasi pembayaran lunas berhasil"),
        (status = 403, description = "Akses ditolak atau bukan mode mock", body = ApiErrorResponse),
        (status = 404, description = "Tagihan tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn simulasi_va_bayar_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !mode_simulasi_diizinkan(&state) {
        return Err(AppError::Forbidden(
            "Simulasi pembayaran hanya diizinkan pada mode Mock Gateway (lingkungan dev/pengujian)"
                .to_string(),
        ));
    }

    let repo = PembayaranRepository::new(state.db.clone());
    let tagihan = repo
        .find_tagihan_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Tagihan pembayaran tidak ditemukan".to_string()))?;

    // Otorisasi: pemilik tagihan atau staf berwenang
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
        let pendaftar = pendaftar_repo
            .find_by_user_id(auth_user.user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;

        if tagihan.pendaftar_id != pendaftar.id {
            return Err(AppError::Forbidden(
                "Anda tidak berhak mensimulasikan pembayaran tagihan ini".to_string(),
            ));
        }
    }

    let service = PembayaranService::new(repo, state.payment_gateway.clone());
    service.simulasi_va_bayar(id).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Simulasi pembayaran lunas berhasil dicatat. Status pendaftaran telah maju."
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/admin/konfirmasi",
    tag = "Pembayaran",
    request_body = KonfirmasiBayarRequest,
    responses(
        (status = 200, description = "Konfirmasi pembayaran berhasil diproses"),
        (status = 403, description = "Akses ditolak (bukan admin)", body = ApiErrorResponse)
    )
)]
pub async fn admin_konfirmasi_bayar_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<KonfirmasiBayarRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat memverifikasi pembayaran".to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    service
        .manual_settle_tagihan(auth_user.user_id, req.pembayaran_id, req.catatan)
        .await?;

    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Status pembayaran berhasil diverifikasi dan kemajuan pendaftar telah dimutakhirkan"
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/admin/konfirmasi-manual",
    tag = "Pembayaran",
    request_body = KonfirmasiBayarRequest,
    responses(
        (status = 200, description = "Pelunasan tagihan manual berhasil diproses"),
        (status = 403, description = "Akses ditolak (bukan admin)", body = ApiErrorResponse)
    )
)]
pub async fn admin_konfirmasi_manual_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<KonfirmasiBayarRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat memverifikasi pembayaran".to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    service
        .manual_settle_tagihan(auth_user.user_id, req.pembayaran_id, req.catatan)
        .await?;

    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Pelunasan tagihan manual berhasil dicatat. Status pendaftar telah maju."
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/admin/rekonsiliasi/{id}",
    tag = "Pembayaran",
    params(
        ("id" = Uuid, Path, description = "ID Transaksi pembayaran yang akan direkonsiliasi")
    ),
    responses(
        (status = 200, description = "Hasil rekonsiliasi gateway", body = RekonsiliasiResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_rekonsiliasi_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat melakukan rekonsiliasi gateway".to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    let res = service.rekonsiliasi_transaksi(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/admin/list",
    tag = "Pembayaran",
    params(
        ("q" = Option<String>, Query, description = "Kata kunci pencarian"),
        ("status" = Option<String>, Query, description = "Filter status pembayaran"),
        ("metode" = Option<String>, Query, description = "Filter metode pembayaran"),
        ("page" = Option<i64>, Query, description = "Halaman"),
        ("limit" = Option<i64>, Query, description = "Jumlah data per halaman")
    ),
    responses(
        (status = 200, description = "Daftar seluruh transaksi pembayaran", body = ListTransaksiAdminResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_pembayaran_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(filter): Query<FilterTransaksiKeuanganRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat melihat daftar transaksi".to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    let res = service.list_transaksi_keuangan(&filter).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/admin/ekspor",
    tag = "Pembayaran",
    params(
        ("q" = Option<String>, Query, description = "Kata kunci pencarian"),
        ("status" = Option<String>, Query, description = "Filter status pembayaran"),
        ("metode" = Option<String>, Query, description = "Filter metode pembayaran")
    ),
    responses(
        (status = 200, description = "File CSV rekonsiliasi keuangan transaksi PMB")
    )
)]
pub async fn admin_ekspor_transaksi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(filter): Query<FilterTransaksiKeuanganRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["keuangan", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat mengekspor laporan transaksi".to_string(),
        ));
    }

    let service = PembayaranService::new(
        PembayaranRepository::new(state.db.clone()),
        state.payment_gateway.clone(),
    );
    let csv = service.ekspor_transaksi_csv(&filter).await?;

    let filename = format!(
        "laporan_keuangan_pmb_{}.csv",
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );

    Ok(Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(csv)
        .unwrap())
}

/// Simulasi/mock webhook hanya boleh aktif pada provider MOCK **dan** di luar production,
/// agar deploy production yang belum memakai gateway nyata tidak bisa "melunasi" tagihan gratis.
fn mode_simulasi_diizinkan(state: &AppState) -> bool {
    state
        .payment_gateway
        .provider_name()
        .eq_ignore_ascii_case("mock")
        && !state.config.app_env.eq_ignore_ascii_case("production")
}
