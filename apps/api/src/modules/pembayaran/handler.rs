use axum::{
    Json, Router,
    extract::{Path, State},
    response::IntoResponse,
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
                CekVoucherRequest, CekVoucherResponse, KonfirmasiBayarRequest,
                PembayaranDetailResponse, PilihMetodeRequest,
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
        simulasi_va_bayar_handler,
        admin_konfirmasi_bayar_handler,
        admin_list_pembayaran_handler
    ),
    components(schemas(
        CekVoucherRequest,
        CekVoucherResponse,
        PilihMetodeRequest,
        KonfirmasiBayarRequest,
        PembayaranDetailResponse,
        ApiErrorResponse
    ))
)]
pub struct PembayaranApiDoc;

pub fn pembayaran_router() -> Router<AppState> {
    Router::new()
        .route("/cek-voucher", post(cek_voucher_handler))
        .route("/my-tagihan", get(get_my_tagihan_handler))
        .route("/buat-tagihan", post(buat_tagihan_formulir_handler))
        .route("/simulasi-va-bayar/{id}", post(simulasi_va_bayar_handler))
        .route("/admin/konfirmasi", post(admin_konfirmasi_bayar_handler))
        .route("/admin/list", get(admin_list_pembayaran_handler))
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
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CekVoucherRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    let res = service.cek_voucher(req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/my-tagihan",
    tag = "Pembayaran",
    responses(
        (status = 200, description = "Daftar tagihan pendaftar aktif", body = Vec<PembayaranDetailResponse>),
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

    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    let res = service.list_tagihan_pendaftar(pendaftar.id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/buat-tagihan",
    tag = "Pembayaran",
    request_body = PilihMetodeRequest,
    responses(
        (status = 200, description = "Tagihan pendaftaran berhasil diterbitkan", body = PembayaranDetailResponse),
        (status = 400, description = "Permintaan tidak valid", body = ApiErrorResponse)
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
            AppError::BadRequest("Silakan isi formulir biodata terlebih dahulu".to_string())
        })?;

    let biaya_asli = 250_000; // Standar biaya formulir pendaftaran PMB
    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    let res = service
        .buat_tagihan_formulir(pendaftar.id, biaya_asli, req)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/simulasi-va-bayar/{id}",
    tag = "Pembayaran",
    params(
        ("id" = Uuid, Path, description = "ID Pembayaran")
    ),
    responses(
        (status = 200, description = "Simulasi pelunasan Virtual Account berhasil"),
        (status = 404, description = "Tagihan tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn simulasi_va_bayar_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    service.simulasi_va_bayar(id).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Pembayaran Virtual Account berhasil dilunasi secara otomatis"
    })))
}

#[utoipa::path(
    post,
    path = "/api/pembayaran/admin/konfirmasi",
    tag = "Pembayaran Admin",
    request_body = KonfirmasiBayarRequest,
    responses(
        (status = 200, description = "Konfirmasi pembayaran berhasil diproses"),
        (status = 403, description = "Akses khusus staf keuangan", body = ApiErrorResponse)
    )
)]
pub async fn admin_konfirmasi_bayar_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<KonfirmasiBayarRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Hanya staf bagian keuangan yang dapat memverifikasi pembayaran".to_string(),
        ));
    }
    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    let payload = serde_json::to_value(&req).ok();
    let p_id = req.pembayaran_id;
    service.konfirmasi_keuangan(auth_user.user_id, req).await?;

    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
        "KONFIRMASI_PEMBAYARAN",
        "pembayaran",
        Some(p_id),
        None,
        payload,
    )
    .await;

    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Status pembayaran berhasil diverifikasi"}),
    ))
}

#[utoipa::path(
    get,
    path = "/api/pembayaran/admin/list",
    tag = "Pembayaran Admin",
    responses(
        (status = 200, description = "Daftar seluruh transaksi pembayaran", body = Vec<PembayaranDetailResponse>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_pembayaran_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_keuangan() && !auth_user.is_admin() {
        return Err(AppError::Forbidden(
            "Akses khusus staf keuangan dan admin PMB".to_string(),
        ));
    }
    let service = PembayaranService::new(PembayaranRepository::new(state.db.clone()));
    let list = service.list_all().await?;
    Ok(Json(list))
}
