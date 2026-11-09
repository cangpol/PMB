use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
};
use utoipa::OpenApi;
use uuid::Uuid;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::{RequireAdmin, ValidatedJson},
    modules::auth::dto::GenericMessageResponse,
    modules::konfigurasi::{
        dto::{
            BiayaItemDetail, CreateFakultasRequest, CreateGelombangRequest,
            CreateJalurKonfigurasiRequest, CreateKomponenBiayaRequest, CreateMatriksBiayaRequest,
            CreateProdiKonfigurasiRequest, CreateTahunAkademikRequest, CreateVoucherRequest,
            FakultasResponse, GelombangDetailResponse, HitungBiayaRequest, HitungBiayaResponse,
            JalurDetailResponse, KomponenBiayaResponse, KuotaProdiGelombangResponse,
            MatriksBiayaResponse, PengaturanResponse, ProdiDetailResponse,
            SetKuotaProdiGelombangRequest, TahunAkademikResponse, UpdateGelombangRequest,
            UpdateJalurKonfigurasiRequest, UpdateMatriksBiayaRequest, UpdatePengaturanRequest,
            UpdateProdiKonfigurasiRequest, UpdateTahunAkademikRequest, UpdateVoucherRequest,
            VoucherDetailResponse,
        },
        repository::KonfigurasiRepository,
        service::KonfigurasiService,
    },
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        list_tahun_akademik_handler,
        create_tahun_akademik_handler,
        update_tahun_akademik_handler,
        delete_tahun_akademik_handler,
        list_fakultas_handler,
        create_fakultas_handler,
        update_fakultas_handler,
        delete_fakultas_handler,
        list_gelombang_admin_handler,
        create_gelombang_handler,
        update_gelombang_handler,
        delete_gelombang_handler,
        list_prodi_admin_handler,
        create_prodi_handler,
        update_prodi_handler,
        delete_prodi_handler,
        list_kuota_prodi_gelombang_handler,
        set_kuota_prodi_gelombang_handler,
        list_jalur_admin_handler,
        create_jalur_handler,
        update_jalur_handler,
        crate::modules::konfigurasi::potongan_jalur::list_potongan_jalur_handler,
        crate::modules::konfigurasi::potongan_jalur::update_potongan_jalur_handler,
        delete_jalur_handler,
        list_komponen_biaya_handler,
        create_komponen_biaya_handler,
        update_komponen_biaya_handler,
        delete_komponen_biaya_handler,
        list_matriks_biaya_handler,
        create_matriks_biaya_handler,
        update_matriks_biaya_handler,
        delete_matriks_biaya_handler,
        hitung_biaya_simulasi_handler,
        list_vouchers_handler,
        create_voucher_handler,
        update_voucher_handler,
        delete_voucher_handler,
        list_pengaturan_handler,
        update_pengaturan_handler,
    ),
    components(schemas(
        TahunAkademikResponse,
        CreateTahunAkademikRequest,
        UpdateTahunAkademikRequest,
        FakultasResponse,
        CreateFakultasRequest,
        GelombangDetailResponse,
        CreateGelombangRequest,
        UpdateGelombangRequest,
        ProdiDetailResponse,
        CreateProdiKonfigurasiRequest,
        UpdateProdiKonfigurasiRequest,
        KuotaProdiGelombangResponse,
        SetKuotaProdiGelombangRequest,
        JalurDetailResponse,
        crate::modules::konfigurasi::potongan_jalur::PotonganJalurResponse,
        crate::modules::konfigurasi::potongan_jalur::UpdatePotonganJalurRequest,
        CreateJalurKonfigurasiRequest,
        UpdateJalurKonfigurasiRequest,
        KomponenBiayaResponse,
        CreateKomponenBiayaRequest,
        MatriksBiayaResponse,
        CreateMatriksBiayaRequest,
        UpdateMatriksBiayaRequest,
        HitungBiayaRequest,
        HitungBiayaResponse,
        BiayaItemDetail,
        VoucherDetailResponse,
        CreateVoucherRequest,
        UpdateVoucherRequest,
        PengaturanResponse,
        UpdatePengaturanRequest,
        GenericMessageResponse,
        ApiErrorResponse
    ))
)]
pub struct KonfigurasiApiDoc;

pub fn konfigurasi_router() -> Router<AppState> {
    Router::new()
        // 1. Tahun Akademik
        .route("/tahun-akademik", get(list_tahun_akademik_handler))
        .route("/tahun-akademik", post(create_tahun_akademik_handler))
        .route("/tahun-akademik/{id}", put(update_tahun_akademik_handler))
        .route(
            "/tahun-akademik/{id}",
            delete(delete_tahun_akademik_handler),
        )
        // 2. Fakultas
        .route("/fakultas", get(list_fakultas_handler))
        .route("/fakultas", post(create_fakultas_handler))
        .route("/fakultas/{id}", put(update_fakultas_handler))
        .route("/fakultas/{id}", delete(delete_fakultas_handler))
        // 3. Gelombang
        .route("/gelombang", get(list_gelombang_admin_handler))
        .route("/gelombang", post(create_gelombang_handler))
        .route("/gelombang/{id}", put(update_gelombang_handler))
        .route("/gelombang/{id}", delete(delete_gelombang_handler))
        .route(
            "/gelombang/{id}/info",
            get(crate::modules::konfigurasi::info_gelombang::get_info_handler)
                .put(crate::modules::konfigurasi::info_gelombang::simpan_info_handler),
        )
        .route(
            "/gelombang/{id}/tahap",
            get(crate::modules::pendaftaran::tahap::list_tahap_handler)
                .put(crate::modules::pendaftaran::tahap::simpan_tahap_handler),
        )
        // 4. Program Studi & Kuota
        .route("/prodi", get(list_prodi_admin_handler))
        .route("/prodi", post(create_prodi_handler))
        .route("/prodi/{id}", put(update_prodi_handler))
        .route("/prodi/{id}", delete(delete_prodi_handler))
        .route("/kuota-prodi", get(list_kuota_prodi_gelombang_handler))
        .route("/kuota-prodi", put(set_kuota_prodi_gelombang_handler))
        // 5. Jalur Masuk
        .route("/jalur", get(list_jalur_admin_handler))
        .route("/jalur", post(create_jalur_handler))
        .route("/jalur/{id}", put(update_jalur_handler))
        .route("/jalur/{id}", delete(delete_jalur_handler))
        .route(
            "/potongan-jalur",
            get(crate::modules::konfigurasi::potongan_jalur::list_potongan_jalur_handler),
        )
        .route(
            "/potongan-jalur/{id}",
            put(crate::modules::konfigurasi::potongan_jalur::update_potongan_jalur_handler),
        )
        // 6. Komponen Biaya
        .route("/komponen-biaya", get(list_komponen_biaya_handler))
        .route("/komponen-biaya", post(create_komponen_biaya_handler))
        .route("/komponen-biaya/{id}", put(update_komponen_biaya_handler))
        .route(
            "/komponen-biaya/{id}",
            delete(delete_komponen_biaya_handler),
        )
        // 7. Matriks Biaya & Kalkulator
        .route(
            "/rincian-biaya-kuliah/{prodi_id}",
            put(crate::modules::master::rincian_biaya::simpan_rincian_biaya_handler),
        )
        .route("/matriks-biaya", get(list_matriks_biaya_handler))
        .route("/matriks-biaya", post(create_matriks_biaya_handler))
        .route("/matriks-biaya/{id}", put(update_matriks_biaya_handler))
        .route("/matriks-biaya/{id}", delete(delete_matriks_biaya_handler))
        .route("/matriks-biaya/hitung", post(hitung_biaya_simulasi_handler))
        // 8. Voucher
        .route("/vouchers", get(list_vouchers_handler))
        .route("/vouchers", post(create_voucher_handler))
        .route("/vouchers/{id}", put(update_voucher_handler))
        .route("/vouchers/{id}", delete(delete_voucher_handler))
        // 9. Pengaturan PMB
        .route("/pengaturan", get(list_pengaturan_handler))
        .route("/pengaturan", put(update_pengaturan_handler))
}

// ================= 1. TAHUN AKADEMIK =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/tahun-akademik",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar tahun akademik", body = Vec<TahunAkademikResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_tahun_akademik_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_tahun_akademik().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/tahun-akademik",
    tag = "Konfigurasi Admin",
    request_body = CreateTahunAkademikRequest,
    responses(
        (status = 201, description = "Tahun akademik berhasil dibuat", body = TahunAkademikResponse),
        (status = 400, description = "Validasi gagal", body = ApiErrorResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_tahun_akademik_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateTahunAkademikRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_tahun_akademik(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/tahun-akademik/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Tahun Akademik")),
    request_body = UpdateTahunAkademikRequest,
    responses(
        (status = 200, description = "Tahun akademik berhasil diubah", body = TahunAkademikResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_tahun_akademik_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateTahunAkademikRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_tahun_akademik(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/tahun-akademik/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Tahun Akademik")),
    responses(
        (status = 200, description = "Tahun akademik berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_tahun_akademik_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_tahun_akademik(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Tahun akademik berhasil dihapus".to_string(),
    }))
}

// ================= 2. FAKULTAS =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/fakultas",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar fakultas", body = Vec<FakultasResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_fakultas_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_fakultas().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/fakultas",
    tag = "Konfigurasi Admin",
    request_body = CreateFakultasRequest,
    responses(
        (status = 201, description = "Fakultas berhasil dibuat", body = FakultasResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_fakultas_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateFakultasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_fakultas(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/fakultas/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Fakultas")),
    request_body = CreateFakultasRequest,
    responses(
        (status = 200, description = "Fakultas berhasil diubah", body = FakultasResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_fakultas_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<CreateFakultasRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_fakultas(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/fakultas/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Fakultas")),
    responses(
        (status = 200, description = "Fakultas berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_fakultas_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_fakultas(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Fakultas berhasil dihapus".to_string(),
    }))
}

// ================= 3. GELOMBANG =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/gelombang",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar seluruh gelombang", body = Vec<GelombangDetailResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_gelombang_admin_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_gelombang().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/gelombang",
    tag = "Konfigurasi Admin",
    request_body = CreateGelombangRequest,
    responses(
        (status = 201, description = "Gelombang berhasil dibuat", body = GelombangDetailResponse),
        (status = 400, description = "Tanggal tidak valid", body = ApiErrorResponse),
        (status = 409, description = "Jadwal gelombang tumpang tindih", body = ApiErrorResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_gelombang_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateGelombangRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_gelombang(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/gelombang/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Gelombang")),
    request_body = UpdateGelombangRequest,
    responses(
        (status = 200, description = "Gelombang berhasil diubah", body = GelombangDetailResponse),
        (status = 409, description = "Jadwal gelombang tumpang tindih", body = ApiErrorResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_gelombang_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateGelombangRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_gelombang(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/gelombang/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Gelombang")),
    responses(
        (status = 200, description = "Gelombang berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_gelombang_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_gelombang(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Gelombang berhasil dihapus".to_string(),
    }))
}

// ================= 4. PROGRAM STUDI & KUOTA =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/prodi",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar program studi lengkap", body = Vec<ProdiDetailResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_prodi_admin_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_prodi().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/prodi",
    tag = "Konfigurasi Admin",
    request_body = CreateProdiKonfigurasiRequest,
    responses(
        (status = 201, description = "Program studi berhasil dibuat", body = ProdiDetailResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_prodi_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateProdiKonfigurasiRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_prodi(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/prodi/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Program Studi")),
    request_body = UpdateProdiKonfigurasiRequest,
    responses(
        (status = 200, description = "Program studi berhasil diubah", body = ProdiDetailResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_prodi_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateProdiKonfigurasiRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_prodi(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/prodi/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Program Studi")),
    responses(
        (status = 200, description = "Program studi berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_prodi_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_prodi(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Program studi berhasil dihapus".to_string(),
    }))
}

#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/kuota-prodi",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar kuota prodi per gelombang", body = Vec<KuotaProdiGelombangResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_kuota_prodi_gelombang_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_kuota_prodi_gelombang().await?;
    Ok(Json(items))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/kuota-prodi",
    tag = "Konfigurasi Admin",
    request_body = SetKuotaProdiGelombangRequest,
    responses(
        (status = 200, description = "Kuota prodi per gelombang berhasil diperbarui", body = KuotaProdiGelombangResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn set_kuota_prodi_gelombang_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<SetKuotaProdiGelombangRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.set_kuota_prodi_gelombang(&admin.0, req).await?;
    Ok(Json(item))
}

// ================= 5. JALUR MASUK =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/jalur",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar jalur masuk", body = Vec<JalurDetailResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_jalur_admin_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_jalur().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/jalur",
    tag = "Konfigurasi Admin",
    request_body = CreateJalurKonfigurasiRequest,
    responses(
        (status = 201, description = "Jalur masuk berhasil dibuat", body = JalurDetailResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_jalur_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateJalurKonfigurasiRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_jalur(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/jalur/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Jalur Masuk")),
    request_body = UpdateJalurKonfigurasiRequest,
    responses(
        (status = 200, description = "Jalur masuk berhasil diubah", body = JalurDetailResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_jalur_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateJalurKonfigurasiRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_jalur(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/jalur/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Jalur Masuk")),
    responses(
        (status = 200, description = "Jalur masuk berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_jalur_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_jalur(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Jalur masuk berhasil dihapus".to_string(),
    }))
}

// ================= 6. KOMPONEN BIAYA =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/komponen-biaya",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar komponen biaya", body = Vec<KomponenBiayaResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_komponen_biaya_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_komponen_biaya().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/komponen-biaya",
    tag = "Konfigurasi Admin",
    request_body = CreateKomponenBiayaRequest,
    responses(
        (status = 201, description = "Komponen biaya berhasil dibuat", body = KomponenBiayaResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_komponen_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateKomponenBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_komponen_biaya(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/komponen-biaya/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Komponen Biaya")),
    request_body = CreateKomponenBiayaRequest,
    responses(
        (status = 200, description = "Komponen biaya berhasil diubah", body = KomponenBiayaResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_komponen_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<CreateKomponenBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_komponen_biaya(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/komponen-biaya/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Komponen Biaya")),
    responses(
        (status = 200, description = "Komponen biaya berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_komponen_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_komponen_biaya(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Komponen biaya berhasil dihapus".to_string(),
    }))
}

// ================= 7. MATRIKS BIAYA =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/matriks-biaya",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar matriks biaya", body = Vec<MatriksBiayaResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_matriks_biaya_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_matriks_biaya().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/matriks-biaya",
    tag = "Konfigurasi Admin",
    request_body = CreateMatriksBiayaRequest,
    responses(
        (status = 201, description = "Matriks biaya berhasil dibuat", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_matriks_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateMatriksBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.create_matriks_biaya(&admin.0, req).await?;
    Ok((
        StatusCode::CREATED,
        Json(GenericMessageResponse {
            status: "ok".to_string(),
            pesan: "Matriks biaya berhasil ditambahkan".to_string(),
        }),
    ))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/matriks-biaya/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Matriks Biaya")),
    request_body = UpdateMatriksBiayaRequest,
    responses(
        (status = 200, description = "Matriks biaya berhasil diubah", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_matriks_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateMatriksBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.update_matriks_biaya(&admin.0, id, req).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Matriks biaya berhasil diperbarui".to_string(),
    }))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/matriks-biaya/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Matriks Biaya")),
    responses(
        (status = 200, description = "Matriks biaya berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_matriks_biaya_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_matriks_biaya(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Matriks biaya berhasil dihapus".to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/matriks-biaya/hitung",
    tag = "Konfigurasi Admin",
    request_body = HitungBiayaRequest,
    responses(
        (status = 200, description = "Hasil kalkulasi matriks biaya dan cicilan", body = HitungBiayaResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn hitung_biaya_simulasi_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
    Json(req): Json<HitungBiayaRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let res = service.hitung_biaya(req).await?;
    Ok(Json(res))
}

// ================= 8. VOUCHER =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/vouchers",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar seluruh voucher", body = Vec<VoucherDetailResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_vouchers_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_vouchers().await?;
    Ok(Json(items))
}

#[utoipa::path(
    post,
    path = "/api/admin/konfigurasi/vouchers",
    tag = "Konfigurasi Admin",
    request_body = CreateVoucherRequest,
    responses(
        (status = 201, description = "Voucher berhasil dibuat", body = VoucherDetailResponse),
        (status = 409, description = "Kode voucher sudah ada", body = ApiErrorResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn create_voucher_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CreateVoucherRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.create_voucher(&admin.0, req).await?;
    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/vouchers/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Voucher")),
    request_body = UpdateVoucherRequest,
    responses(
        (status = 200, description = "Voucher berhasil diubah", body = VoucherDetailResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_voucher_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateVoucherRequest>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_voucher(&admin.0, id, req).await?;
    Ok(Json(item))
}

#[utoipa::path(
    delete,
    path = "/api/admin/konfigurasi/vouchers/{id}",
    tag = "Konfigurasi Admin",
    params(("id" = Uuid, Path, description = "ID Voucher")),
    responses(
        (status = 200, description = "Voucher berhasil dihapus", body = GenericMessageResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn delete_voucher_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    service.delete_voucher(&admin.0, id).await?;
    Ok(Json(GenericMessageResponse {
        status: "ok".to_string(),
        pesan: "Voucher berhasil dihapus".to_string(),
    }))
}

// ================= 9. PENGATURAN PMB =================
#[utoipa::path(
    get,
    path = "/api/admin/konfigurasi/pengaturan",
    tag = "Konfigurasi Admin",
    responses(
        (status = 200, description = "Daftar pengaturan sistem PMB", body = Vec<PengaturanResponse>),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn list_pengaturan_handler(
    _admin: RequireAdmin,
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let items = service.list_pengaturan().await?;
    Ok(Json(items))
}

#[utoipa::path(
    put,
    path = "/api/admin/konfigurasi/pengaturan",
    tag = "Konfigurasi Admin",
    request_body = UpdatePengaturanRequest,
    responses(
        (status = 200, description = "Pengaturan berhasil diperbarui", body = PengaturanResponse),
        (status = 403, description = "Akses ditolak - bukan admin", body = ApiErrorResponse)
    )
)]
pub async fn update_pengaturan_handler(
    admin: RequireAdmin,
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<UpdatePengaturanRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.kunci == crate::modules::fitur::KUNCI_PENGAWAS_CBT {
        return Err(AppError::Forbidden(
            "Sakelar fitur ini hanya dapat diubah Super Admin lewat menu Fitur Sistem".to_string(),
        ));
    }
    let service = KonfigurasiService::new(KonfigurasiRepository::new(state.db.clone()));
    let item = service.update_pengaturan(&admin.0, req).await?;
    Ok(Json(item))
}
