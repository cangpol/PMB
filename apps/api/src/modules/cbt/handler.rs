use axum::{
    Json, Router,
    extract::{Multipart, Path, Query, State},
    response::{
        IntoResponse,
        sse::{Event, KeepAlive, Sse},
    },
    routing::{get, post},
};
use std::convert::Infallible;
use tokio_stream::StreamExt;
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{AuthUser, ValidatedJson},
    modules::{
        cbt::{
            dto::{
                AssignPesertaRequest, AutosaveJawabanRequest, AutosaveJawabanResponse,
                CreatePaketRequest, CreateSesiRequest, CreateSoalRequest, ErrorBarisImport,
                ImportSoalResultResponse, LiveMonitorStreamResponse, LivePesertaStatusItem,
                MulaiUjianCbtResponse, PresensiCheckInRequest, PresensiCheckInResponse,
                SesiCalonInfoResponse, SoalCbtPesertaResponse, SoalOpsiDto, SubmitUjianResponse,
            },
            model::{BankSoal, PaketUjian, SesiUjian},
            repository::CbtRepository,
            service::CbtService,
        },
        pendaftaran::repository::PendaftaranRepository,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_my_sesi_handler,
        mulai_ujian_handler,
        autosave_jawaban_handler,
        submit_ujian_handler,
        check_in_presensi_handler,
        list_bank_soal_handler,
        create_bank_soal_handler,
        list_paket_handler,
        create_paket_handler,
        list_sesi_handler,
        create_sesi_handler,
        assign_peserta_handler,
        get_sesi_snapshot_handler
    ),
    components(schemas(
        SoalOpsiDto,
        SoalCbtPesertaResponse,
        SesiCalonInfoResponse,
        MulaiUjianCbtResponse,
        AutosaveJawabanRequest,
        AutosaveJawabanResponse,
        SubmitUjianResponse,
        PresensiCheckInRequest,
        PresensiCheckInResponse,
        LivePesertaStatusItem,
        LiveMonitorStreamResponse,
        ErrorBarisImport,
        ImportSoalResultResponse,
        CreateSoalRequest,
        CreatePaketRequest,
        CreateSesiRequest,
        AssignPesertaRequest,
        BankSoal,
        PaketUjian,
        SesiUjian,
        ApiErrorResponse
    ))
)]
pub struct CbtApiDoc;

pub fn cbt_router() -> Router<AppState> {
    Router::new()
        // Jalur Calon Mahasiswa
        .route("/my-sesi", get(get_my_sesi_handler))
        .route("/mulai", post(mulai_ujian_handler))
        .route("/autosave", post(autosave_jawaban_handler))
        .route("/submit", post(submit_ujian_handler))
        // Jalur Presensi & Pengawas
        .route("/admin/presensi/check-in", post(check_in_presensi_handler))
        .route(
            "/admin/sesi/{id}/live-stream",
            get(live_stream_sesi_handler),
        )
        .route("/admin/sesi/{id}/snapshot", get(get_sesi_snapshot_handler))
        .route("/admin/sesi/{id}/peserta", get(get_sesi_snapshot_handler))
        // Jalur Bank Soal & Pengaturan CBT
        .route(
            "/admin/bank-soal",
            get(list_bank_soal_handler).post(create_bank_soal_handler),
        )
        .route("/admin/bank-soal/import", post(import_bank_soal_handler))
        .route(
            "/admin/paket",
            get(list_paket_handler).post(create_paket_handler),
        )
        .route(
            "/admin/sesi",
            get(list_sesi_handler).post(create_sesi_handler),
        )
        .route("/admin/sesi/{id}/assign", post(assign_peserta_handler))
}

// =========================================================================
// 1. ENDPOINTS CALON MAHASISWA
// =========================================================================

#[utoipa::path(
    get,
    path = "/api/cbt/my-sesi",
    tag = "CBT Calon",
    responses(
        (status = 200, description = "Informasi sesi ujian calon & status presensi", body = SesiCalonInfoResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_my_sesi_handler(
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

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.get_my_sesi_info(pendaftar.id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cbt/mulai",
    tag = "CBT Calon",
    responses(
        (status = 200, description = "Sesi ujian dimulai atau dipulihkan", body = MulaiUjianCbtResponse),
        (status = 403, description = "Belum presensi / presensi terkunci", body = ApiErrorResponse),
        (status = 400, description = "Ujian sudah selesai", body = ApiErrorResponse)
    )
)]
pub async fn mulai_ujian_handler(
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

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.mulai_ujian_calon(pendaftar.id, None, None).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cbt/autosave",
    tag = "CBT Calon",
    request_body = AutosaveJawabanRequest,
    responses(
        (status = 200, description = "Jawaban berhasil diautosave", body = AutosaveJawabanResponse),
        (status = 400, description = "Sesi tidak valid / sudah selesai", body = ApiErrorResponse)
    )
)]
pub async fn autosave_jawaban_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<AutosaveJawabanRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.autosave_jawaban(pendaftar.id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cbt/submit",
    tag = "CBT Calon",
    responses(
        (status = 200, description = "Ujian berhasil disubmit dan dinilai otomatis", body = SubmitUjianResponse),
        (status = 400, description = "Tidak ada sesi aktif", body = ApiErrorResponse)
    )
)]
pub async fn submit_ujian_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.submit_ujian_calon(pendaftar.id).await?;
    Ok(Json(res))
}

// =========================================================================
// 2. ENDPOINTS PENGAWAS: PRESENSI & MONITOR REAL-TIME (SSE)
// =========================================================================

#[utoipa::path(
    post,
    path = "/api/cbt/admin/presensi/check-in",
    tag = "CBT Pengawas",
    request_body = PresensiCheckInRequest,
    responses(
        (status = 200, description = "Presensi calon berhasil dicatat", body = PresensiCheckInResponse),
        (status = 403, description = "Akses ditolak (bukan pengawas)", body = ApiErrorResponse),
        (status = 404, description = "Peserta tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn check_in_presensi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<PresensiCheckInRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["pengawas_ujian", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya pengawas ujian atau admin yang dapat mencatat presensi".to_string(),
        ));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.check_in_presensi(auth_user.user_id, req).await?;
    Ok(Json(res))
}

pub async fn live_stream_sesi_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>>, AppError> {
    if !auth_user.has_any_role(&["pengawas_ujian", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya pengawas ujian atau admin yang dapat memonitor sesi live".to_string(),
        ));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let stream = tokio_stream::wrappers::IntervalStream::new(tokio::time::interval(
        std::time::Duration::from_secs(3),
    ))
    .then(move |_| {
        let s = service.clone();
        async move {
            let snapshot = s.get_live_monitor_data(id).await.ok();
            Ok::<_, Infallible>(
                Event::default()
                    .json_data(&snapshot)
                    .unwrap_or_else(|_| Event::default().data("{}")),
            )
        }
    });

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

#[utoipa::path(
    get,
    path = "/api/cbt/admin/sesi/{id}/snapshot",
    tag = "CBT Pengawas",
    params(
        ("id" = Uuid, Path, description = "ID Sesi Ujian")
    ),
    responses(
        (status = 200, description = "Rekap data monitor dan presensi sesi ujian", body = LiveMonitorStreamResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse),
        (status = 404, description = "Sesi tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_sesi_snapshot_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["pengawas_ujian", "admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya pengawas ujian atau admin yang dapat melihat rekap sesi".to_string(),
        ));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let snapshot = service.get_live_monitor_data(id).await?;
    Ok(Json(snapshot))
}

// =========================================================================
// 3. ENDPOINTS ADMIN: BANK SOAL, PAKET, & SESI
// =========================================================================

#[derive(serde::Deserialize)]
pub struct FilterSoalQuery {
    pub kategori: Option<String>,
    pub kesulitan: Option<String>,
    pub q: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/api/cbt/admin/bank-soal",
    tag = "CBT Admin",
    params(
        ("kategori" = Option<String>, Query, description = "Kategori soal"),
        ("kesulitan" = Option<String>, Query, description = "Tingkat kesulitan"),
        ("q" = Option<String>, Query, description = "Pencarian pertanyaan"),
        ("page" = Option<i64>, Query, description = "Nomor halaman"),
        ("limit" = Option<i64>, Query, description = "Jumlah per halaman")
    ),
    responses(
        (status = 200, description = "Daftar butir bank soal")
    )
)]
pub async fn list_bank_soal_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(filter): Query<FilterSoalQuery>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin", "pengawas_ujian"]) {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat mengelola bank soal".to_string(),
        ));
    }

    let page = filter.page.unwrap_or(1).max(1);
    let limit = filter.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let repo = CbtRepository::new(state.db.clone());
    let (items, total) = repo
        .list_soal(
            filter.kategori.as_deref(),
            filter.kesulitan.as_deref(),
            filter.q.as_deref(),
            limit,
            offset,
        )
        .await?;

    Ok(Json(serde_json::json!({
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    })))
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/bank-soal",
    tag = "CBT Admin",
    request_body = CreateSoalRequest,
    responses(
        (status = 200, description = "Soal baru berhasil dibuat", body = BankSoal),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn create_bank_soal_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateSoalRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat membuat butir soal".to_string(),
        ));
    }

    let repo = CbtRepository::new(state.db.clone());
    let created = repo.create_soal(&req).await?;
    Ok(Json(created))
}

pub async fn import_bank_soal_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat mengimpor bank soal".to_string(),
        ));
    }

    let mut file_bytes = Vec::new();
    let mut file_name = String::new();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        if field.name() == Some("file") {
            file_name = field.file_name().unwrap_or("soal.xlsx").to_string();
            file_bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(e.to_string()))?
                .to_vec();
            break;
        }
    }

    if file_bytes.is_empty() {
        return Err(AppError::BadRequest(
            "Berkas spreadsheet (.xlsx / .csv) tidak ditemukan dalam upload".to_string(),
        ));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.import_soal_excel(&file_bytes, &file_name).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cbt/admin/paket",
    tag = "CBT Admin",
    responses(
        (status = 200, description = "Daftar paket ujian", body = Vec<PaketUjian>)
    )
)]
pub async fn list_paket_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin", "pengawas_ujian"]) {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }

    let repo = CbtRepository::new(state.db.clone());
    let items = repo.list_paket().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/paket",
    tag = "CBT Admin",
    request_body = CreatePaketRequest,
    responses(
        (status = 200, description = "Paket ujian berhasil dibuat", body = PaketUjian)
    )
)]
pub async fn create_paket_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreatePaketRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let created = service.create_paket(req).await?;
    Ok(Json(created))
}

#[utoipa::path(
    get,
    path = "/api/cbt/admin/sesi",
    tag = "CBT Admin",
    responses(
        (status = 200, description = "Daftar sesi ujian", body = Vec<SesiUjian>)
    )
)]
pub async fn list_sesi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin", "pengawas_ujian"]) {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }

    let repo = CbtRepository::new(state.db.clone());
    let items = repo.list_sesi().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/sesi",
    tag = "CBT Admin",
    request_body = CreateSesiRequest,
    responses(
        (status = 200, description = "Sesi ujian berhasil dibuat", body = SesiUjian)
    )
)]
pub async fn create_sesi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateSesiRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let created = service.create_sesi(req).await?;
    Ok(Json(created))
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/sesi/{id}/assign",
    tag = "CBT Admin",
    params(
        ("id" = Uuid, Path, description = "ID Sesi Ujian")
    ),
    request_body = AssignPesertaRequest,
    responses(
        (status = 200, description = "Peserta berhasil dialokasikan ke sesi")
    )
)]
pub async fn assign_peserta_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<AssignPesertaRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin", "pengawas_ujian"]) {
        return Err(AppError::Forbidden("Akses ditolak".to_string()));
    }

    let repo = CbtRepository::new(state.db.clone());
    let assigned = repo.assign_peserta_to_sesi(id, &req.pendaftar_ids).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "assigned_count": assigned,
        "pesan": format!("{} peserta berhasil dialokasikan ke sesi ujian", assigned)
    })))
}
