use axum::{
    Json, Router,
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
};
use serde::Deserialize;
use utoipa::OpenApi;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::{ApiErrorResponse, AppError},
    extractors::auth::AuthUser,
    modules::cms::{
        dto::{
            CmsBannerResponse, CmsFaqResponse, CmsPageResponse, CmsPostResponse,
            CreateCmsBannerRequest, CreateCmsFaqRequest, CreateCmsPageRequest,
            CreateCmsPostRequest, PresignMediaUploadRequest, UpdateCmsBannerRequest,
            UpdateCmsFaqRequest, UpdateCmsPageRequest, UpdateCmsPostRequest, UploadMediaResponse,
        },
        repository::CmsRepository,
        service::CmsService,
    },
    security::storage::StorageService,
    state::AppState,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        list_posts_handler,
        get_post_handler,
        list_banners_handler,
        list_faqs_handler,
        get_page_handler,
        admin_list_posts_handler,
        admin_get_post_handler,
        admin_create_post_handler,
        admin_update_post_handler,
        admin_delete_post_handler,
        admin_list_banners_handler,
        admin_get_banner_handler,
        admin_create_banner_handler,
        admin_update_banner_handler,
        admin_delete_banner_handler,
        admin_list_faqs_handler,
        admin_get_faq_handler,
        admin_create_faq_handler,
        admin_update_faq_handler,
        admin_delete_faq_handler,
        admin_list_pages_handler,
        admin_get_page_handler,
        admin_create_page_handler,
        admin_update_page_handler,
        admin_delete_page_handler,
        admin_upload_presign_handler,
    ),
    components(schemas(
        CmsPostResponse,
        CreateCmsPostRequest,
        UpdateCmsPostRequest,
        CmsBannerResponse,
        CreateCmsBannerRequest,
        UpdateCmsBannerRequest,
        CmsFaqResponse,
        CreateCmsFaqRequest,
        UpdateCmsFaqRequest,
        CmsPageResponse,
        CreateCmsPageRequest,
        UpdateCmsPageRequest,
        PresignMediaUploadRequest,
        UploadMediaResponse,
        ApiErrorResponse
    ))
)]
pub struct CmsApiDoc;

pub fn cms_router() -> Router<AppState> {
    Router::new()
        // Publik
        .route("/posts", get(list_posts_handler))
        .route("/posts/{slug}", get(get_post_handler))
        .route("/banners", get(list_banners_handler))
        .route("/faqs", get(list_faqs_handler))
        .route("/pages/{slug}", get(get_page_handler))
        // Admin CMS
        .route(
            "/admin/posts",
            get(admin_list_posts_handler).post(admin_create_post_handler),
        )
        .route(
            "/admin/posts/{id}",
            get(admin_get_post_handler)
                .put(admin_update_post_handler)
                .delete(admin_delete_post_handler),
        )
        .route(
            "/admin/banners",
            get(admin_list_banners_handler).post(admin_create_banner_handler),
        )
        .route(
            "/admin/banners/{id}",
            get(admin_get_banner_handler)
                .put(admin_update_banner_handler)
                .delete(admin_delete_banner_handler),
        )
        .route(
            "/admin/faqs",
            get(admin_list_faqs_handler).post(admin_create_faq_handler),
        )
        .route(
            "/admin/faqs/{id}",
            get(admin_get_faq_handler)
                .put(admin_update_faq_handler)
                .delete(admin_delete_faq_handler),
        )
        .route(
            "/admin/pages",
            get(admin_list_pages_handler).post(admin_create_page_handler),
        )
        .route(
            "/admin/pages/{id}",
            get(admin_get_page_handler)
                .put(admin_update_page_handler)
                .delete(admin_delete_page_handler),
        )
        .route("/admin/upload-presign", post(admin_upload_presign_handler))
}

fn get_cms_service(state: &AppState) -> CmsService {
    let storage = StorageService::new(
        state.config.s3_endpoint.clone(),
        state.config.s3_access_key.clone(),
        state.config.s3_secret_key.clone(),
        state.config.s3_bucket.clone(),
    );
    CmsService::new(CmsRepository::new(state.db.clone()), storage)
}

#[derive(Debug, Deserialize)]
pub struct KategoriQuery {
    pub kategori: Option<String>,
}

// =============================================================================
// HANDLERS PUBLIK
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/cms/posts",
    tag = "CMS Publik",
    params(
        ("kategori" = Option<String>, Query, description = "Filter kategori artikel / berita")
    ),
    responses(
        (status = 200, description = "Daftar artikel terpublikasi", body = Vec<CmsPostResponse>)
    )
)]
pub async fn list_posts_handler(
    State(state): State<AppState>,
    Query(q): Query<KategoriQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = get_cms_service(&state);
    let res = service.list_published_posts(q.kategori.as_deref()).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/posts/{slug}",
    tag = "CMS Publik",
    params(
        ("slug" = String, Path, description = "Slug artikel / pengumuman")
    ),
    responses(
        (status = 200, description = "Detail artikel publik", body = CmsPostResponse),
        (status = 404, description = "Artikel tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_post_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = get_cms_service(&state);
    let res = service.get_published_post_by_slug(&slug).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/banners",
    tag = "CMS Publik",
    responses(
        (status = 200, description = "Daftar banner slider beranda aktif", body = Vec<CmsBannerResponse>)
    )
)]
pub async fn list_banners_handler(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = get_cms_service(&state);
    let res = service.list_active_banners().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/faqs",
    tag = "CMS Publik",
    params(
        ("kategori" = Option<String>, Query, description = "Filter kategori FAQ")
    ),
    responses(
        (status = 200, description = "Daftar pertanyaan umum aktif", body = Vec<CmsFaqResponse>)
    )
)]
pub async fn list_faqs_handler(
    State(state): State<AppState>,
    Query(q): Query<KategoriQuery>,
) -> Result<impl IntoResponse, AppError> {
    let service = get_cms_service(&state);
    let res = service.list_active_faqs(q.kategori.as_deref()).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/pages/{slug}",
    tag = "CMS Publik",
    params(
        ("slug" = String, Path, description = "Slug halaman statis")
    ),
    responses(
        (status = 200, description = "Konten halaman statis", body = CmsPageResponse),
        (status = 404, description = "Halaman tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn get_page_handler(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let service = get_cms_service(&state);
    let res = service.get_published_page_by_slug(&slug).await?;
    Ok(Json(res))
}

// =============================================================================
// HANDLERS ADMIN CMS
// =============================================================================

fn ensure_admin(auth: &AuthUser) -> Result<(), AppError> {
    if !auth.is_admin() {
        return Err(AppError::Forbidden(
            "Hanya administrator yang diizinkan mengelola konten CMS".to_string(),
        ));
    }
    Ok(())
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/posts",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Daftar semua artikel untuk admin", body = Vec<CmsPostResponse>),
        (status = 403, description = "Akses ditolak", body = ApiErrorResponse)
    )
)]
pub async fn admin_list_posts_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(q): Query<KategoriQuery>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.list_all_posts_admin(q.kategori.as_deref()).await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/posts/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Detail artikel untuk admin", body = CmsPostResponse),
        (status = 404, description = "Artikel tidak ditemukan", body = ApiErrorResponse)
    )
)]
pub async fn admin_get_post_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.get_post_by_id_admin(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cms/admin/posts",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = CreateCmsPostRequest,
    responses(
        (status = 200, description = "Artikel baru berhasil dibuat", body = CmsPostResponse),
        (status = 400, description = "Validasi data gagal", body = ApiErrorResponse)
    )
)]
pub async fn admin_create_post_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCmsPostRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service
        .create_post(payload, &auth_user.nama_lengkap)
        .await?;
    Ok(Json(res))
}

#[utoipa::path(
    put,
    path = "/api/cms/admin/posts/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = UpdateCmsPostRequest,
    responses(
        (status = 200, description = "Artikel berhasil diperbarui", body = CmsPostResponse)
    )
)]
pub async fn admin_update_post_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCmsPostRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.update_post(id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    delete,
    path = "/api/cms/admin/posts/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Artikel berhasil dihapus")
    )
)]
pub async fn admin_delete_post_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    service.delete_post(id).await?;
    Ok(Json(
        serde_json::json!({ "message": "Artikel berhasil dihapus" }),
    ))
}

// BANNERS

#[utoipa::path(
    get,
    path = "/api/cms/admin/banners",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Daftar banner admin", body = Vec<CmsBannerResponse>)
    )
)]
pub async fn admin_list_banners_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.list_all_banners_admin().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/banners/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Detail banner admin", body = CmsBannerResponse)
    )
)]
pub async fn admin_get_banner_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.get_banner_by_id_admin(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cms/admin/banners",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = CreateCmsBannerRequest,
    responses(
        (status = 200, description = "Banner baru berhasil dibuat", body = CmsBannerResponse)
    )
)]
pub async fn admin_create_banner_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCmsBannerRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.create_banner(payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    put,
    path = "/api/cms/admin/banners/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = UpdateCmsBannerRequest,
    responses(
        (status = 200, description = "Banner berhasil diperbarui", body = CmsBannerResponse)
    )
)]
pub async fn admin_update_banner_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCmsBannerRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.update_banner(id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    delete,
    path = "/api/cms/admin/banners/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Banner berhasil dihapus")
    )
)]
pub async fn admin_delete_banner_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    service.delete_banner(id).await?;
    Ok(Json(
        serde_json::json!({ "message": "Banner berhasil dihapus" }),
    ))
}

// FAQS

#[utoipa::path(
    get,
    path = "/api/cms/admin/faqs",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Daftar FAQ admin", body = Vec<CmsFaqResponse>)
    )
)]
pub async fn admin_list_faqs_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.list_all_faqs_admin().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/faqs/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Detail FAQ admin", body = CmsFaqResponse)
    )
)]
pub async fn admin_get_faq_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.get_faq_by_id_admin(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cms/admin/faqs",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = CreateCmsFaqRequest,
    responses(
        (status = 200, description = "FAQ baru berhasil dibuat", body = CmsFaqResponse)
    )
)]
pub async fn admin_create_faq_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCmsFaqRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.create_faq(payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    put,
    path = "/api/cms/admin/faqs/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = UpdateCmsFaqRequest,
    responses(
        (status = 200, description = "FAQ berhasil diperbarui", body = CmsFaqResponse)
    )
)]
pub async fn admin_update_faq_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCmsFaqRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.update_faq(id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    delete,
    path = "/api/cms/admin/faqs/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "FAQ berhasil dihapus")
    )
)]
pub async fn admin_delete_faq_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    service.delete_faq(id).await?;
    Ok(Json(
        serde_json::json!({ "message": "FAQ berhasil dihapus" }),
    ))
}

// PAGES

#[utoipa::path(
    get,
    path = "/api/cms/admin/pages",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Daftar halaman statis admin", body = Vec<CmsPageResponse>)
    )
)]
pub async fn admin_list_pages_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.list_all_pages_admin().await?;
    Ok(Json(res))
}

#[utoipa::path(
    get,
    path = "/api/cms/admin/pages/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Detail halaman statis admin", body = CmsPageResponse)
    )
)]
pub async fn admin_get_page_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    let res = service.get_page_by_id_admin(id).await?;
    Ok(Json(res))
}

#[utoipa::path(
    post,
    path = "/api/cms/admin/pages",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = CreateCmsPageRequest,
    responses(
        (status = 200, description = "Halaman statis berhasil dibuat", body = CmsPageResponse)
    )
)]
pub async fn admin_create_page_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateCmsPageRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.create_page(payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    put,
    path = "/api/cms/admin/pages/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = UpdateCmsPageRequest,
    responses(
        (status = 200, description = "Halaman statis berhasil diperbarui", body = CmsPageResponse)
    )
)]
pub async fn admin_update_page_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCmsPageRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let res = service.update_page(id, payload).await?;
    Ok(Json(res))
}

#[utoipa::path(
    delete,
    path = "/api/cms/admin/pages/{id}",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    responses(
        (status = 200, description = "Halaman statis berhasil dihapus")
    )
)]
pub async fn admin_delete_page_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    let service = get_cms_service(&state);
    service.delete_page(id).await?;
    Ok(Json(
        serde_json::json!({ "message": "Halaman statis berhasil dihapus" }),
    ))
}

// UPLOAD MEDIA PRESIGN

#[utoipa::path(
    post,
    path = "/api/cms/admin/upload-presign",
    tag = "CMS Admin",
    security(("bearer_auth" = [])),
    request_body = PresignMediaUploadRequest,
    responses(
        (status = 200, description = "Presigned PUT URL berhasil dibuat untuk unggah media", body = UploadMediaResponse)
    )
)]
pub async fn admin_upload_presign_handler(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<PresignMediaUploadRequest>,
) -> Result<impl IntoResponse, AppError> {
    ensure_admin(&auth_user)?;
    payload
        .validate()
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let service = get_cms_service(&state);
    let presigned = service.generate_media_upload_url(&payload.file_name)?;
    let public_url = service.get_public_media_url(&presigned.file_key);

    Ok(Json(UploadMediaResponse {
        url: public_url,
        file_key: presigned.file_key,
        upload_url: presigned.upload_url,
        file_name: payload.file_name,
    }))
}
