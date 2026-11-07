use axum::{
    Json, Router,
    extract::{Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use utoipa::OpenApi;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::AuthUser,
    modules::dashboard::{
        dto::{
            AdminDashboardResponse, AntreanItem, AntreanVerifikasiResponse, CalonDashboardResponse,
            DashboardFilterQuery, DistribusiJalurStat, DistribusiProdiStat,
            ExecutiveDashboardResponse, FunnelStat, ProdiStat, StatusPendaftaranStat, StepperStep,
            TrenHarianStat,
        },
        service::DashboardService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_calon_dashboard_handler,
        get_admin_dashboard_handler,
        get_antrean_verifikasi_handler,
        get_executive_dashboard_handler,
        export_excel_dashboard_handler,
    ),
    components(schemas(
        CalonDashboardResponse,
        StepperStep,
        AdminDashboardResponse,
        AntreanVerifikasiResponse,
        AntreanItem,
        ProdiStat,
        FunnelStat,
        DashboardFilterQuery,
        ExecutiveDashboardResponse,
        TrenHarianStat,
        DistribusiProdiStat,
        DistribusiJalurStat,
        StatusPendaftaranStat,
        ApiErrorResponse
    ))
)]
pub struct DashboardApiDoc;

pub fn dashboard_router() -> Router<AppState> {
    Router::new()
        .route("/calon", get(get_calon_dashboard_handler))
        .route("/admin", get(get_admin_dashboard_handler))
        .route("/admin/antrean", get(get_antrean_verifikasi_handler))
        .route("/admin/stats", get(get_executive_dashboard_handler))
        .route("/admin/sumber-informasi", get(get_sumber_informasi_handler))
        .route("/admin/export-excel", get(export_excel_dashboard_handler))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/calon",
    tag = "Dashboard Calon",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Ringkasan progres dan status tahapan calon mahasiswa", body = CalonDashboardResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_calon_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = DashboardService::new(state.db.clone());
    let res = service.get_calon_dashboard(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/admin",
    tag = "Dashboard Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Statistik ringkas PMB", body = AdminDashboardResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn get_admin_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() && !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Akses khusus panitia PMB dan pimpinan".to_string(),
        ));
    }
    let service = DashboardService::new(state.db.clone());
    let res = service.get_admin_dashboard().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/admin/stats",
    tag = "Dashboard Admin",
    security(("bearer_auth" = [])),
    params(
        DashboardFilterQuery
    ),
    responses(
        (status = 200, description = "Analitik eksekutif lengkap dengan filter periode, tren harian, distribusi prodi & jalur", body = ExecutiveDashboardResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn get_executive_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(filter): Query<DashboardFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() && !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Akses khusus administrator dan pimpinan".to_string(),
        ));
    }
    let service = DashboardService::new(state.db.clone());
    let res = service.get_executive_dashboard(&filter).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/admin/export-excel",
    tag = "Dashboard Admin",
    security(("bearer_auth" = [])),
    params(
        DashboardFilterQuery
    ),
    responses(
        (status = 200, description = "File spreadsheet CSV laporan eksekutif siap buka di Microsoft Excel", content_type = "text/csv"),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn export_excel_dashboard_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(filter): Query<DashboardFilterQuery>,
) -> Result<Response, AppError> {
    if !auth_user.is_admin() && !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Akses khusus administrator dan pimpinan".to_string(),
        ));
    }
    let service = DashboardService::new(state.db.clone());
    let csv_bytes = service.export_excel_dashboard(&filter).await?;

    let filename = format!(
        "laporan-eksekutif-pmb-{}.csv",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    );

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(axum::body::Body::from(csv_bytes))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(response)
}

#[derive(Debug, serde::Serialize)]
pub struct SumberInformasiItem {
    pub kode: String,
    pub label: String,
    pub jumlah: i64,
    pub persen: f64,
}

/// Rekap "dari mana calon tahu PMB UPITRA" untuk evaluasi strategi promosi.
pub async fn get_sumber_informasi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() && !auth_user.is_keuangan() {
        return Err(AppError::Forbidden(
            "Akses khusus panitia PMB dan pimpinan".to_string(),
        ));
    }
    let rows: Vec<(Option<String>, i64)> = sqlx::query_as(
        "SELECT sumber_informasi, COUNT(*) FROM users
         WHERE role = 'calon_mahasiswa' GROUP BY sumber_informasi",
    )
    .fetch_all(&state.db)
    .await?;
    let total: i64 = rows.iter().map(|r| r.1).sum();
    let hitung = |kode: Option<&str>| -> i64 {
        rows.iter()
            .filter(|r| r.0.as_deref() == kode)
            .map(|r| r.1)
            .sum()
    };
    let mut items: Vec<SumberInformasiItem> = crate::modules::auth::dto::SUMBER_INFORMASI
        .iter()
        .map(|(kode, label)| SumberInformasiItem {
            kode: kode.to_string(),
            label: label.to_string(),
            jumlah: hitung(Some(kode)),
            persen: 0.0,
        })
        .collect();
    items.push(SumberInformasiItem {
        kode: "BELUM_DIISI".to_string(),
        label: "Belum diisi".to_string(),
        jumlah: hitung(None),
        persen: 0.0,
    });
    for it in items.iter_mut() {
        it.persen = if total > 0 {
            ((it.jumlah as f64 / total as f64) * 1000.0).round() / 10.0
        } else {
            0.0
        };
    }
    items.sort_by_key(|a| std::cmp::Reverse(a.jumlah));
    Ok(Json(serde_json::json!({ "total": total, "items": items })))
}

#[utoipa::path(
    get,
    path = "/api/dashboard/admin/antrean",
    tag = "Dashboard Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Jumlah berkas/bukti yang menunggu diperiksa panitia", body = AntreanVerifikasiResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse),
        (status = 403, description = "Bukan staf PMB", body = ApiErrorResponse)
    )
)]
pub async fn get_antrean_verifikasi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if auth_user.role == "calon_mahasiswa" {
        return Err(AppError::Forbidden("Akses khusus panitia PMB".to_string()));
    }
    // Tiap peran hanya melihat antrean yang menjadi wewenangnya
    let service = DashboardService::new(state.db.clone());
    let res = service
        .get_antrean_verifikasi(
            auth_user.is_admin(),
            auth_user.is_admin() || auth_user.is_keuangan(),
            auth_user.is_admin(),
            auth_user.is_admin(),
        )
        .await?;
    Ok(Json(res))
}
