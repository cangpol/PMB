use axum::{
    Json, Router,
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post, put},
};
use serde::Deserialize;
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{AuthUser, RequireAdmin, ValidatedJson},
    modules::pendaftaran::{
        dto::{
            BerkasCalonItem, BerkasDetailItem, BerkasResponse, CreateDefinisiBerkasRequest,
            CreateDefinisiFieldRequest, CreateDefinisiLangkahRequest, KonfirmasiUploadRequest,
            LangkahProgressItem, PendaftarDetailResponse, PresignUploadRequest,
            PresignedUrlResponse, ReorderFieldsRequest, SubmitAkademikRequest,
            SubmitBiodataRequest, SubmitDinamisRequest, UpdateDefinisiBerkasRequest,
            UpdateDefinisiFieldRequest, UpdateDefinisiLangkahRequest, UploadBerkasRequest,
            VerifikasiBerkasRequest,
        },
        model::{DefinisiBerkas, DefinisiField, DefinisiLangkah},
        repository::PendaftaranRepository,
        service::PendaftaranService,
    },
    security::storage::{PresignedDownloadResponse, PresignedUploadResponse, StorageService},
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_my_pendaftaran_handler,
        get_fields_handler,
        submit_formulir_dinamis_handler,
        get_berkas_syarat_handler,
        presign_upload_berkas_handler,
        konfirmasi_upload_berkas_handler,
        presign_download_berkas_handler,
        get_langkah_progress_handler,
        admin_list_fields_handler,
        admin_create_field_handler,
        admin_update_field_handler,
        admin_delete_field_handler,
        admin_reorder_fields_handler,
        admin_list_definisi_berkas_handler,
        admin_create_definisi_berkas_handler,
        admin_update_definisi_berkas_handler,
        admin_delete_definisi_berkas_handler,
        admin_list_definisi_langkah_handler,
        admin_create_definisi_langkah_handler,
        admin_update_definisi_langkah_handler,
        admin_delete_definisi_langkah_handler,
        admin_list_berkas_handler,
        admin_verifikasi_berkas_handler,
        submit_biodata_handler,
        submit_akademik_handler,
        upload_berkas_handler,
        get_presigned_url_handler,
        finalisasi_handler,
        admin_list_pendaftar_handler
    ),
    components(schemas(
        SubmitDinamisRequest,
        PresignUploadRequest,
        KonfirmasiUploadRequest,
        BerkasCalonItem,
        BerkasDetailItem,
        LangkahProgressItem,
        CreateDefinisiFieldRequest,
        UpdateDefinisiFieldRequest,
        ReorderFieldsRequest,
        CreateDefinisiBerkasRequest,
        UpdateDefinisiBerkasRequest,
        CreateDefinisiLangkahRequest,
        UpdateDefinisiLangkahRequest,
        DefinisiField,
        DefinisiBerkas,
        DefinisiLangkah,
        PresignedUploadResponse,
        PresignedDownloadResponse,
        SubmitBiodataRequest,
        SubmitAkademikRequest,
        UploadBerkasRequest,
        PresignedUrlResponse,
        VerifikasiBerkasRequest,
        BerkasResponse,
        PendaftarDetailResponse,
        ApiErrorResponse
    ))
)]
pub struct PendaftaranApiDoc;

fn make_service(state: &AppState) -> PendaftaranService {
    let storage = StorageService::new(
        state.config.s3_endpoint.clone(),
        state.config.s3_access_key.clone(),
        state.config.s3_secret_key.clone(),
        state.config.s3_bucket.clone(),
    );
    PendaftaranService::new(PendaftaranRepository::new(state.db.clone()), storage)
}

#[derive(Debug, Deserialize)]
pub struct FieldFilterQuery {
    pub jalur_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct BerkasFilterQuery {
    pub status: Option<String>,
    pub search: Option<String>,
}

pub fn pendaftaran_router() -> Router<AppState> {
    Router::new()
        // Calon Mahasiswa - Dynamic Engine
        .route("/fields", get(get_fields_handler))
        .route("/submit-dinamis", post(submit_formulir_dinamis_handler))
        .route("/berkas/syarat", get(get_berkas_syarat_handler))
        .route(
            "/berkas/presign-upload",
            post(presign_upload_berkas_handler),
        )
        .route("/berkas/konfirmasi", post(konfirmasi_upload_berkas_handler))
        .route(
            "/berkas/{id}/presign-download",
            get(presign_download_berkas_handler),
        )
        .route("/langkah", get(get_langkah_progress_handler))
        // Admin Form Builder (Fields)
        .route(
            "/admin/form-builder/fields",
            get(admin_list_fields_handler).post(admin_create_field_handler),
        )
        .route(
            "/admin/form-builder/fields/{id}",
            put(admin_update_field_handler).delete(admin_delete_field_handler),
        )
        .route(
            "/admin/form-builder/fields/reorder",
            post(admin_reorder_fields_handler),
        )
        // Admin Form Builder (Berkas)
        .route(
            "/admin/form-builder/berkas",
            get(admin_list_definisi_berkas_handler).post(admin_create_definisi_berkas_handler),
        )
        .route(
            "/admin/form-builder/berkas/{id}",
            put(admin_update_definisi_berkas_handler).delete(admin_delete_definisi_berkas_handler),
        )
        // Admin Form Builder (Langkah)
        .route(
            "/admin/form-builder/langkah",
            get(admin_list_definisi_langkah_handler).post(admin_create_definisi_langkah_handler),
        )
        .route(
            "/admin/form-builder/langkah/{id}",
            put(admin_update_definisi_langkah_handler)
                .delete(admin_delete_definisi_langkah_handler),
        )
        // Admin Verifikasi Berkas
        .route("/admin/berkas-list", get(admin_list_berkas_handler))
        .route(
            "/admin/verifikasi-berkas",
            post(admin_verifikasi_berkas_handler),
        )
        // Legacy Compatibility Routes
        .route("/my", get(get_my_pendaftaran_handler))
        .route("/submit-biodata", post(submit_biodata_handler))
        .route("/submit-akademik", post(submit_akademik_handler))
        .route("/upload-berkas", post(upload_berkas_handler))
        .route("/berkas/{id}/presigned-url", get(get_presigned_url_handler))
        .route("/finalisasi", post(finalisasi_handler))
        .route("/admin/list", get(admin_list_pendaftar_handler))
}

// ==========================================
// 1. HANDLER CALON MAHASISWA
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/fields",
    tag = "Pendaftaran",
    params(
        ("jalur_id" = Option<Uuid>, Query, description = "Filter berdasarkan Jalur Pendaftaran")
    ),
    responses(
        (status = 200, description = "Daftar definisi field form aktif", body = Vec<DefinisiField>)
    )
)]
pub async fn get_fields_handler(
    State(state): State<AppState>,
    Query(query): Query<FieldFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let fields = service.get_fields(query.jalur_id).await?;
    Ok(Json(fields))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/submit-dinamis",
    tag = "Pendaftaran",
    request_body = SubmitDinamisRequest,
    responses(
        (status = 200, description = "Formulir biodata berhasil disimpan", body = PendaftarDetailResponse),
        (status = 422, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn submit_formulir_dinamis_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<SubmitDinamisRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service
        .submit_formulir_dinamis(auth_user.user_id, req)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/berkas/syarat",
    tag = "Pendaftaran",
    responses(
        (status = 200, description = "Daftar syarat berkas dan status unggah", body = Vec<BerkasCalonItem>)
    )
)]
pub async fn get_berkas_syarat_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let items = service.get_berkas_syarat(auth_user.user_id).await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/berkas/presign-upload",
    tag = "Pendaftaran",
    request_body = PresignUploadRequest,
    responses(
        (status = 200, description = "URL Presigned PUT berhasil dihasilkan", body = PresignedUploadResponse),
        (status = 400, description = "Ukuran atau tipe file tidak diizinkan", body = ApiErrorResponse)
    )
)]
pub async fn presign_upload_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<PresignUploadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service.presign_upload(auth_user.user_id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/berkas/konfirmasi",
    tag = "Pendaftaran",
    request_body = KonfirmasiUploadRequest,
    responses(
        (status = 200, description = "Konfirmasi unggahan berkas berhasil dicatat", body = BerkasCalonItem)
    )
)]
pub async fn konfirmasi_upload_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<KonfirmasiUploadRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let item = service.konfirmasi_upload(auth_user.user_id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/berkas/{id}/presign-download",
    tag = "Pendaftaran",
    params(
        ("id" = Uuid, Path, description = "ID Dokumen Berkas")
    ),
    responses(
        (status = 200, description = "URL Presigned GET berumur pendek berhasil dihasilkan", body = PresignedDownloadResponse),
        (status = 403, description = "Akses berkas ditolak", body = ApiErrorResponse)
    )
)]
pub async fn presign_download_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let can_access_all = auth_user.is_admin() || auth_user.is_asesor();
    let res = service
        .presign_download(auth_user.user_id, can_access_all, id)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/langkah",
    tag = "Pendaftaran",
    responses(
        (status = 200, description = "Progress alur langkah pendaftaran calon", body = Vec<LangkahProgressItem>)
    )
)]
pub async fn get_langkah_progress_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let steps = service.get_langkah_progress(auth_user.user_id).await?;
    Ok(Json(steps))
}

// ==========================================
// 2. HANDLER ADMIN FORM BUILDER (FIELDS)
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/form-builder/fields",
    tag = "Pendaftaran Admin",
    params(
        ("jalur_id" = Option<Uuid>, Query, description = "Filter per Jalur")
    ),
    responses(
        (status = 200, description = "Daftar definisi field untuk admin", body = Vec<DefinisiField>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_fields_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(query): Query<FieldFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let fields = service.admin_list_fields(query.jalur_id).await?;
    Ok(Json(fields))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/form-builder/fields",
    tag = "Pendaftaran Admin",
    request_body = CreateDefinisiFieldRequest,
    responses(
        (status = 200, description = "Definisi field baru berhasil dibuat", body = DefinisiField),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_create_field_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateDefinisiFieldRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let field = service.admin_create_field(req).await?;
    Ok(Json(field))
}

#[utoipa::path(
    put,
    path = "/api/pendaftaran/admin/form-builder/fields/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Field")
    ),
    request_body = UpdateDefinisiFieldRequest,
    responses(
        (status = 200, description = "Definisi field berhasil diperbarui", body = DefinisiField),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_update_field_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateDefinisiFieldRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let field = service.admin_update_field(id, req).await?;
    Ok(Json(field))
}

#[utoipa::path(
    delete,
    path = "/api/pendaftaran/admin/form-builder/fields/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Field")
    ),
    responses(
        (status = 200, description = "Definisi field berhasil dihapus"),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_delete_field_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    service.admin_delete_field(id).await?;
    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Field berhasil dihapus"}),
    ))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/form-builder/fields/reorder",
    tag = "Pendaftaran Admin",
    request_body = ReorderFieldsRequest,
    responses(
        (status = 200, description = "Urutan field berhasil diperbarui"),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_reorder_fields_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Json(req): Json<ReorderFieldsRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    service.admin_reorder_fields(req.field_ids).await?;
    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Urutan field berhasil diperbarui"}),
    ))
}

// ==========================================
// 3. HANDLER ADMIN FORM BUILDER (BERKAS)
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/form-builder/berkas",
    tag = "Pendaftaran Admin",
    params(
        ("jalur_id" = Option<Uuid>, Query, description = "Filter per Jalur")
    ),
    responses(
        (status = 200, description = "Daftar definisi berkas persyaratan", body = Vec<DefinisiBerkas>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_definisi_berkas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(query): Query<FieldFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let berkas = service.admin_list_definisi_berkas(query.jalur_id).await?;
    Ok(Json(berkas))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/form-builder/berkas",
    tag = "Pendaftaran Admin",
    request_body = CreateDefinisiBerkasRequest,
    responses(
        (status = 200, description = "Definisi berkas baru berhasil dibuat", body = DefinisiBerkas),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_create_definisi_berkas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateDefinisiBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let berkas = service.admin_create_definisi_berkas(req).await?;
    Ok(Json(berkas))
}

#[utoipa::path(
    put,
    path = "/api/pendaftaran/admin/form-builder/berkas/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Berkas")
    ),
    request_body = UpdateDefinisiBerkasRequest,
    responses(
        (status = 200, description = "Definisi berkas berhasil diperbarui", body = DefinisiBerkas),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_update_definisi_berkas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateDefinisiBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let berkas = service.admin_update_definisi_berkas(id, req).await?;
    Ok(Json(berkas))
}

#[utoipa::path(
    delete,
    path = "/api/pendaftaran/admin/form-builder/berkas/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Berkas")
    ),
    responses(
        (status = 200, description = "Definisi berkas berhasil dihapus"),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_delete_definisi_berkas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    service.admin_delete_definisi_berkas(id).await?;
    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Definisi berkas berhasil dihapus"}),
    ))
}

// ==========================================
// 4. HANDLER ADMIN FORM BUILDER (LANGKAH)
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/form-builder/langkah",
    tag = "Pendaftaran Admin",
    params(
        ("jalur_id" = Option<Uuid>, Query, description = "Filter per Jalur")
    ),
    responses(
        (status = 200, description = "Daftar definisi alur langkah pendaftaran", body = Vec<DefinisiLangkah>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_definisi_langkah_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(query): Query<FieldFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let langkah = service.admin_list_definisi_langkah(query.jalur_id).await?;
    Ok(Json(langkah))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/form-builder/langkah",
    tag = "Pendaftaran Admin",
    request_body = CreateDefinisiLangkahRequest,
    responses(
        (status = 200, description = "Definisi langkah baru berhasil dibuat", body = DefinisiLangkah),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_create_definisi_langkah_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateDefinisiLangkahRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let langkah = service.admin_create_definisi_langkah(req).await?;
    Ok(Json(langkah))
}

#[utoipa::path(
    put,
    path = "/api/pendaftaran/admin/form-builder/langkah/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Langkah")
    ),
    request_body = UpdateDefinisiLangkahRequest,
    responses(
        (status = 200, description = "Definisi langkah berhasil diperbarui", body = DefinisiLangkah),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_update_definisi_langkah_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateDefinisiLangkahRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let langkah = service.admin_update_definisi_langkah(id, req).await?;
    Ok(Json(langkah))
}

#[utoipa::path(
    delete,
    path = "/api/pendaftaran/admin/form-builder/langkah/{id}",
    tag = "Pendaftaran Admin",
    params(
        ("id" = Uuid, Path, description = "ID Definisi Langkah")
    ),
    responses(
        (status = 200, description = "Definisi langkah berhasil dihapus"),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_delete_definisi_langkah_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    service.admin_delete_definisi_langkah(id).await?;
    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Definisi langkah berhasil dihapus"}),
    ))
}

// ==========================================
// 5. HANDLER ADMIN VERIFIKASI BERKAS
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/berkas-list",
    tag = "Pendaftaran Admin",
    params(
        ("status" = Option<String>, Query, description = "Filter status (PENDING, VALID, INVALID, DITERIMA, DITOLAK)"),
        ("search" = Option<String>, Query, description = "Pencarian nama / nomor pendaftaran")
    ),
    responses(
        (status = 200, description = "Daftar seluruh berkas pendaftar untuk verifikasi", body = Vec<BerkasDetailItem>),
        (status = 403, description = "Hanya admin PMB yang berhak mengakses", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_berkas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Query(query): Query<BerkasFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let list = service
        .admin_list_berkas(query.status, query.search)
        .await?;
    Ok(Json(list))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/verifikasi-berkas",
    tag = "Pendaftaran Admin",
    request_body = VerifikasiBerkasRequest,
    responses(
        (status = 200, description = "Status verifikasi berkas berhasil dicatat"),
        (status = 403, description = "Hanya admin PMB yang berhak memverifikasi", body = ApiErrorResponse)
    )
)]
pub async fn admin_verifikasi_berkas_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Json(req): Json<VerifikasiBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let payload = serde_json::to_value(&req).ok();
    let berkas_id = req.berkas_id;
    service.verifikasi_berkas_admin(admin.user_id, req).await?;

    let _ = crate::security::record_audit_log(
        &state.db,
        Some(admin.user_id),
        "VERIFIKASI_BERKAS",
        "berkas_pendaftar",
        Some(berkas_id),
        None,
        payload,
    )
    .await;

    Ok(Json(
        serde_json::json!({"status": "ok", "pesan": "Verifikasi berkas berhasil dicatat"}),
    ))
}

// ==========================================
// 6. HANDLER LEGACY UNTUK KOMPATIBILITAS
// ==========================================

#[utoipa::path(
    get,
    path = "/api/pendaftaran/my",
    tag = "Pendaftaran",
    responses(
        (status = 200, description = "Detail formulir pendaftaran pendaftar aktif", body = PendaftarDetailResponse),
        (status = 401, description = "Belum login", body = ApiErrorResponse),
        (status = 404, description = "Belum ada formulir pendaftaran", body = ApiErrorResponse)
    )
)]
pub async fn get_my_pendaftaran_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service.get_my_pendaftaran(auth_user.user_id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/submit-biodata",
    tag = "Pendaftaran",
    request_body = SubmitBiodataRequest,
    responses(
        (status = 200, description = "Biodata berhasil disimpan", body = PendaftarDetailResponse),
        (status = 422, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn submit_biodata_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SubmitBiodataRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service.submit_biodata(auth_user.user_id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/submit-akademik",
    tag = "Pendaftaran",
    request_body = SubmitAkademikRequest,
    responses(
        (status = 200, description = "Data akademik berhasil disimpan", body = PendaftarDetailResponse),
        (status = 422, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn submit_akademik_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SubmitAkademikRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service.submit_akademik(auth_user.user_id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/upload-berkas",
    tag = "Pendaftaran",
    request_body = UploadBerkasRequest,
    responses(
        (status = 200, description = "Berkas berhasil diunggah", body = BerkasResponse),
        (status = 400, description = "Format atau ukuran berkas tidak valid", body = ApiErrorResponse)
    )
)]
pub async fn upload_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<UploadBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let res = service
        .upload_berkas(
            auth_user.user_id,
            &req.jenis_berkas,
            &req.file_name,
            &req.mime_type,
            req.file_size_bytes,
        )
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/berkas/{id}/presigned-url",
    tag = "Pendaftaran",
    params(
        ("id" = Uuid, Path, description = "ID Dokumen Berkas")
    ),
    responses(
        (status = 200, description = "URL akses berkas berumur pendek", body = PresignedUrlResponse),
        (status = 404, description = "Berkas tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_presigned_url_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let can_access_all = auth_user.is_admin() || auth_user.is_asesor();
    let presigned = service
        .presign_download(auth_user.user_id, can_access_all, id)
        .await?;

    Ok(Json(PresignedUrlResponse {
        berkas_id: id,
        presigned_url: presigned.download_url,
        expires_in_seconds: presigned.expires_in_seconds,
    }))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/finalisasi",
    tag = "Pendaftaran",
    responses(
        (status = 200, description = "Finalisasi pendaftaran berhasil"),
        (status = 400, description = "Berkas wajib belum diunggah", body = ApiErrorResponse)
    )
)]
pub async fn finalisasi_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    service.finalisasi(auth_user.user_id).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Formulir pendaftaran berhasil difinalisasi. Berkas Anda akan diverifikasi oleh panitia PMB."
    })))
}

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/list",
    tag = "Pendaftaran Admin",
    responses(
        (status = 200, description = "Daftar seluruh pendaftar PMB", body = Vec<PendaftarDetailResponse>),
        (status = 403, description = "Hanya admin PMB yang berhak mengakses", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_pendaftar_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = make_service(&state);
    let list = service.list_all().await?;
    Ok(Json(list))
}
