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
    modules::pendaftaran::{
        dto::{
            BerkasResponse, PendaftarDetailResponse, PresignedUrlResponse, SubmitAkademikRequest,
            SubmitBiodataRequest, UploadBerkasRequest, VerifikasiBerkasRequest,
        },
        repository::PendaftaranRepository,
        service::PendaftaranService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        get_my_pendaftaran_handler,
        submit_biodata_handler,
        submit_akademik_handler,
        upload_berkas_handler,
        get_presigned_url_handler,
        finalisasi_handler,
        admin_verifikasi_berkas_handler,
        admin_list_pendaftar_handler
    ),
    components(schemas(
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

pub fn pendaftaran_router() -> Router<AppState> {
    Router::new()
        .route("/my", get(get_my_pendaftaran_handler))
        .route("/submit-biodata", post(submit_biodata_handler))
        .route("/submit-akademik", post(submit_akademik_handler))
        .route("/upload-berkas", post(upload_berkas_handler))
        .route("/berkas/{id}/presigned-url", get(get_presigned_url_handler))
        .route("/finalisasi", post(finalisasi_handler))
        .route(
            "/admin/verifikasi-berkas",
            post(admin_verifikasi_berkas_handler),
        )
        .route("/admin/list", get(admin_list_pendaftar_handler))
}

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
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
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
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
    let res = service.submit_biodata(auth_user.user_id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/submit-akademik",
    tag = "Pendaftaran",
    request_body = SubmitAkademikRequest,
    responses(
        (status = 200, description = "Data akademik & pilihan prodi berhasil disimpan", body = PendaftarDetailResponse),
        (status = 400, description = "Pilihan prodi tidak valid", body = ApiErrorResponse)
    )
)]
pub async fn submit_akademik_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SubmitAkademikRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
    let res = service.submit_akademik(auth_user.user_id, req).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/upload-berkas",
    tag = "Pendaftaran",
    request_body = UploadBerkasRequest,
    responses(
        (status = 200, description = "Berkas berhasil divalidasi dan dicatat", body = BerkasResponse),
        (status = 400, description = "Format atau ukuran berkas tidak valid", body = ApiErrorResponse),
        (status = 422, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn upload_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<UploadBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
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
    _auth_user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let expires = 900u64; // 15 menit
    let token = uuid::Uuid::new_v4();
    let presigned_url = format!(
        "{}/berkas/download/{}?token={}&expires_in={}",
        state.config.s3_endpoint, id, token, expires
    );

    Ok(Json(PresignedUrlResponse {
        berkas_id: id,
        presigned_url,
        expires_in_seconds: expires,
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
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
    service.finalisasi(auth_user.user_id).await?;
    Ok(Json(serde_json::json!({
        "status": "ok",
        "pesan": "Formulir pendaftaran berhasil difinalisasi. Berkas Anda akan diverifikasi oleh panitia PMB."
    })))
}

#[utoipa::path(
    post,
    path = "/api/pendaftaran/admin/verifikasi-berkas",
    tag = "Pendaftaran Admin",
    request_body = VerifikasiBerkasRequest,
    responses(
        (status = 200, description = "Status verifikasi berkas berhasil diperbarui"),
        (status = 403, description = "Hanya admin PMB yang berhak memverifikasi", body = ApiErrorResponse)
    )
)]
pub async fn admin_verifikasi_berkas_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<VerifikasiBerkasRequest>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya panitia PMB yang dapat memverifikasi berkas".to_string(),
        ));
    }
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
    let payload = serde_json::to_value(&req).ok();
    let berkas_id = req.berkas_id;
    service.verifikasi_berkas(req).await?;

    let _ = crate::security::record_audit_log(
        &state.db,
        Some(auth_user.user_id),
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

#[utoipa::path(
    get,
    path = "/api/pendaftaran/admin/list",
    tag = "Pendaftaran Admin",
    responses(
        (status = 200, description = "Daftar seluruh pendaftar PMB", body = Vec<PendaftarDetailResponse>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_pendaftar_handler(
    auth_user: AuthUser,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    if !auth_user.is_admin() {
        return Err(AppError::Forbidden("Akses khusus panitia PMB".to_string()));
    }
    let service = PendaftaranService::new(PendaftaranRepository::new(state.db.clone()));
    let list = service.list_all().await?;
    let resp: Vec<PendaftarDetailResponse> = list
        .into_iter()
        .map(|p| PendaftarDetailResponse {
            id: p.id,
            user_id: p.user_id,
            nama_lengkap: "Pendaftar".to_string(),
            email: "".to_string(),
            no_hp: "".to_string(),
            nomor_pendaftaran: p.nomor_pendaftaran,
            jalur_id: p.jalur_id,
            nama_jalur: "Jalur Pendaftaran".to_string(),
            gelombang_id: p.gelombang_id,
            nama_gelombang: "Gelombang Aktif".to_string(),
            status_pendaftaran: p.status_pendaftaran,
            nik: p.nik,
            tempat_lahir: p.tempat_lahir,
            tgl_lahir: p.tgl_lahir,
            jenis_kelamin: p.jenis_kelamin,
            agama: p.agama,
            alamat_lengkap: p.alamat_lengkap,
            nama_ortu: p.nama_ortu,
            no_hp_ortu: p.no_hp_ortu,
            asal_sekolah: p.asal_sekolah,
            jurusan_sekolah: p.jurusan_sekolah,
            nilai_rapor_avg: p.nilai_rapor_avg,
            prodi_pilihan_1: p.prodi_pilihan_1,
            nama_prodi_1: "Pilihan 1".to_string(),
            prodi_pilihan_2: p.prodi_pilihan_2,
            nama_prodi_2: None,
            catatan_verifikator: p.catatan_verifikator,
            berkas: vec![],
            created_at: p.created_at,
        })
        .collect();
    Ok(Json(resp))
}
