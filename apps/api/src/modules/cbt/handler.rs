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
                AksiHasilCbtResponse, AssignPesertaRequest, AutosaveJawabanRequest,
                AutosaveJawabanResponse, CreatePaketRequest, CreateSesiRequest, CreateSoalRequest,
                ErrorBarisImport, HasilCbtAdminItem, HasilCbtAdminResponse, HasilCbtQuery,
                ImportSoalResultResponse, LaporPelanggaranRequest, LiveMonitorStreamResponse,
                LivePesertaStatusItem, MulaiUjianCbtResponse, PresensiCheckInRequest,
                PresensiCheckInResponse, RiwayatCbtItem, SesiCalonInfoResponse,
                SetujuiHasilCbtRequest, SoalCbtPesertaResponse, SoalOpsiDto, SubmitUjianResponse,
                UjianUlangCbtRequest,
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
        get_riwayat_handler,
        lanjut_setelah_cbt_handler,
        list_hasil_admin_handler,
        setujui_hasil_handler,
        ujian_ulang_handler,
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
        RiwayatCbtItem,
        HasilCbtAdminItem,
        HasilCbtAdminResponse,
        SetujuiHasilCbtRequest,
        UjianUlangCbtRequest,
        AksiHasilCbtResponse,
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
        .route("/riwayat", get(get_riwayat_handler))
        .route("/sesi-tersedia", get(get_sesi_tersedia_handler))
        .route("/mulai", post(mulai_ujian_handler))
        .route("/autosave", post(autosave_jawaban_handler))
        .route("/submit", post(submit_ujian_handler))
        .route("/lanjut", post(lanjut_setelah_cbt_handler))
        .route("/pelanggaran", post(lapor_pelanggaran_handler))
        // Jalur Presensi & Pengawas
        .route("/admin/presensi/check-in", post(check_in_presensi_handler))
        .route(
            "/admin/sesi/{id}/live-stream",
            get(live_stream_sesi_handler),
        )
        .route("/admin/hasil", get(list_hasil_admin_handler))
        .route("/admin/hasil/{id}/setujui", post(setujui_hasil_handler))
        .route("/admin/hasil/{id}/ujian-ulang", post(ujian_ulang_handler))
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

    let boleh_ujian = crate::modules::pendaftaran::alur::status::BOLEH_UJIAN
        .contains(&pendaftar.status_pendaftaran.as_str());
    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.get_my_sesi_info(pendaftar.id, boleh_ujian).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cbt/riwayat",
    tag = "CBT Calon",
    responses(
        (status = 200, description = "Riwayat pengerjaan CBT calon, terbaru di atas", body = [RiwayatCbtItem]),
        (status = 401, description = "Belum login", body = ApiErrorResponse)
    )
)]
pub async fn get_riwayat_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(auth_user.user_id)
        .await?;
    let Some(pendaftar) = pendaftar else {
        return Ok(Json(Vec::new()));
    };
    let repo = CbtRepository::new(state.db.clone());
    Ok(Json(repo.list_riwayat_pendaftar(pendaftar.id).await?))
}

#[derive(Debug, serde::Deserialize)]
pub struct SesiTersediaQuery {
    pub gelombang_id: Option<Uuid>,
    pub jalur_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    path = "/api/cbt/sesi-tersedia",
    tag = "CBT Calon",
    params(
        ("gelombang_id" = Option<Uuid>, Query, description = "Filter gelombang calon"),
        ("jalur_id" = Option<Uuid>, Query, description = "Filter jalur calon")
    ),
    responses(
        (status = 200, description = "Sesi CBT yang dapat dipilih sebagai jadwal seleksi", body = [crate::modules::cbt::dto::SesiTersediaItem])
    )
)]
pub async fn get_sesi_tersedia_handler(
    _auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<SesiTersediaQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    Ok(Json(
        service
            .list_sesi_tersedia(q.gelombang_id, q.jalur_id)
            .await?,
    ))
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

    // Gerbang alur: CBT hanya setelah seluruh berkas diverifikasi admin
    crate::modules::pendaftaran::alur::pastikan_status(
        &pendaftar.status_pendaftaran,
        crate::modules::pendaftaran::alur::status::BOLEH_UJIAN,
        "Ujian CBT dapat diikuti setelah seluruh berkas pendaftaran Anda diverifikasi admin PMB.",
    )?;

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

pub async fn lapor_pelanggaran_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<LaporPelanggaranRequest>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar_repo = PendaftaranRepository::new(state.db.clone());
    let pendaftar = pendaftar_repo
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;

    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    let res = service.lapor_pelanggaran(pendaftar.id, req, None).await?;
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

#[utoipa::path(
    post,
    path = "/api/cbt/lanjut",
    tag = "CBT Calon",
    responses(
        (status = 200, description = "Tahap berikutnya (pengumuman) dibuka", body = AksiHasilCbtResponse),
        (status = 409, description = "Belum memenuhi passing grade / belum selesai ujian", body = ApiErrorResponse)
    )
)]
pub async fn lanjut_setelah_cbt_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let pendaftar = PendaftaranRepository::new(state.db.clone())
        .find_by_user_id(auth_user.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Data pendaftar tidak ditemukan".to_string()))?;
    CbtRepository::new(state.db.clone())
        .lanjut_setelah_cbt(pendaftar.id)
        .await?;
    Ok(Json(AksiHasilCbtResponse {
        pesan: "Tahap berikutnya telah dibuka: menunggu pengumuman hasil seleksi.".to_string(),
    }))
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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

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
    crate::modules::fitur::pastikan_pengawas_boleh(&state.db, &auth_user).await?;

    let repo = CbtRepository::new(state.db.clone());
    let assigned = repo.assign_peserta_to_sesi(id, &req.pendaftar_ids).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "assigned_count": assigned,
        "pesan": format!("{} peserta berhasil dialokasikan ke sesi ujian", assigned)
    })))
}

#[utoipa::path(
    get,
    path = "/api/cbt/admin/hasil",
    tag = "CBT Pengawas",
    params(HasilCbtQuery),
    responses(
        (status = 200, description = "Rekap hasil pengerjaan CBT semua sesi", body = HasilCbtAdminResponse),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn list_hasil_admin_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Query(q): Query<HasilCbtQuery>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat melihat rekap hasil CBT".to_string(),
        ));
    }
    let service = CbtService::new(CbtRepository::new(state.db.clone()));
    Ok(Json(service.hasil_admin(q.q.as_deref(), q.sesi_id).await?))
}

fn wajib_admin(u: &AuthUser) -> Result<(), AppError> {
    if !u.has_any_role(&["admin_pmb", "super_admin"]) {
        return Err(AppError::Forbidden(
            "Hanya admin PMB yang dapat mengubah hasil CBT".to_string(),
        ));
    }
    Ok(())
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/hasil/{id}/setujui",
    tag = "CBT Pengawas",
    params(("id" = Uuid, Path, description = "ID peserta sesi")),
    request_body = SetujuiHasilCbtRequest,
    responses(
        (status = 200, description = "Hasil CBT disetujui admin", body = AksiHasilCbtResponse),
        (status = 409, description = "Tidak dapat disetujui", body = ApiErrorResponse)
    )
)]
pub async fn setujui_hasil_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SetujuiHasilCbtRequest>,
) -> Result<impl IntoResponse, AppError> {
    wajib_admin(&auth_user)?;
    let repo = CbtRepository::new(state.db.clone());
    let (pendaftar_id, nilai, sebelumnya_lulus) = repo
        .setujui_hasil(id, auth_user.user_id, req.alasan.as_deref())
        .await?;
    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
        "CBT_SETUJUI_HASIL",
        "hasil_ujian",
        Some(pendaftar_id),
        Some(serde_json::json!({ "nilai_akhir": nilai, "is_lulus": sebelumnya_lulus })),
        Some(serde_json::json!({ "is_lulus": true, "alasan": req.alasan })),
    )
    .await;
    Ok(Json(AksiHasilCbtResponse {
        pesan: if sebelumnya_lulus {
            "Hasil CBT yang lulus ditandai disetujui admin.".to_string()
        } else {
            "Hasil CBT disetujui. Peserta dapat melanjutkan proses seleksi.".to_string()
        },
    }))
}

#[utoipa::path(
    post,
    path = "/api/cbt/admin/hasil/{id}/ujian-ulang",
    tag = "CBT Pengawas",
    params(("id" = Uuid, Path, description = "ID peserta sesi")),
    request_body = UjianUlangCbtRequest,
    responses(
        (status = 200, description = "Peserta diizinkan mengulang CBT", body = AksiHasilCbtResponse),
        (status = 400, description = "Jadwal sesi tujuan sudah berakhir", body = ApiErrorResponse),
        (status = 409, description = "Tidak dapat diulang", body = ApiErrorResponse)
    )
)]
pub async fn ujian_ulang_handler(
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<UjianUlangCbtRequest>,
) -> Result<impl IntoResponse, AppError> {
    wajib_admin(&auth_user)?;
    let repo = CbtRepository::new(state.db.clone());
    let (pendaftar_id, lama) = repo.izinkan_ujian_ulang(id, req.sesi_id).await?;
    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
        "CBT_UJIAN_ULANG",
        "peserta_sesi",
        Some(pendaftar_id),
        Some(lama),
        Some(serde_json::json!({ "alasan": req.alasan, "sesi_baru": req.sesi_id })),
    )
    .await;
    Ok(Json(AksiHasilCbtResponse {
        pesan: "Peserta diizinkan mengikuti ujian CBT kembali.".to_string(),
    }))
}
