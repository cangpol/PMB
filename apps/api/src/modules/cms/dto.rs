use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

// =============================================================================
// POST (BERITA & PENGUMUMAN)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CmsPostResponse {
    pub id: Uuid,
    pub slug: String,
    pub judul: String,
    pub kategori: String,
    pub ringkasan: String,
    pub konten: String,
    pub gambar_url: Option<String>,
    pub tags: Vec<String>,
    pub author_nama: String,
    pub is_published: bool,
    pub published_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct CreateCmsPostRequest {
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    pub kategori: String,
    #[validate(length(
        min = 5,
        max = 1000,
        message = "Ringkasan minimal 5 karakter (maks 1000)"
    ))]
    pub ringkasan: String,
    #[validate(length(
        min = 10,
        max = 500000,
        message = "Konten minimal 10 karakter (maks 500.000 karakter)"
    ))]
    pub konten: String,
    pub gambar_url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct UpdateCmsPostRequest {
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    pub kategori: String,
    #[validate(length(
        min = 5,
        max = 1000,
        message = "Ringkasan minimal 5 karakter (maks 1000)"
    ))]
    pub ringkasan: String,
    #[validate(length(
        min = 10,
        max = 500000,
        message = "Konten minimal 10 karakter (maks 500.000 karakter)"
    ))]
    pub konten: String,
    pub gambar_url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_published: bool,
}

// =============================================================================
// BANNER SLIDER
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CmsBannerResponse {
    pub id: Uuid,
    pub judul: String,
    pub subjudul: Option<String>,
    pub gambar_url: String,
    pub link_url: Option<String>,
    pub urutan: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct CreateCmsBannerRequest {
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul banner minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    pub subjudul: Option<String>,
    #[validate(length(min = 3, message = "URL gambar banner wajib diisi"))]
    pub gambar_url: String,
    pub link_url: Option<String>,
    pub urutan: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct UpdateCmsBannerRequest {
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul banner minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    pub subjudul: Option<String>,
    #[validate(length(min = 3, message = "URL gambar banner wajib diisi"))]
    pub gambar_url: String,
    pub link_url: Option<String>,
    pub urutan: i32,
    pub is_active: bool,
}

// =============================================================================
// FAQ DINAMIS
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CmsFaqResponse {
    pub id: Uuid,
    pub kategori: String,
    pub pertanyaan: String,
    pub jawaban: String,
    pub urutan: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct CreateCmsFaqRequest {
    pub kategori: String,
    #[validate(length(min = 5, message = "Pertanyaan minimal 5 karakter"))]
    pub pertanyaan: String,
    #[validate(length(min = 5, max = 20000, message = "Jawaban minimal 5 karakter"))]
    pub jawaban: String,
    pub urutan: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct UpdateCmsFaqRequest {
    pub kategori: String,
    #[validate(length(min = 5, message = "Pertanyaan minimal 5 karakter"))]
    pub pertanyaan: String,
    #[validate(length(min = 5, max = 20000, message = "Jawaban minimal 5 karakter"))]
    pub jawaban: String,
    pub urutan: i32,
    pub is_active: bool,
}

// =============================================================================
// HALAMAN STATIS / KEBIJAKAN
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CmsPageResponse {
    pub id: Uuid,
    pub slug: String,
    pub judul: String,
    pub konten: String,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct CreateCmsPageRequest {
    #[validate(length(min = 2, message = "Slug minimal 2 karakter"))]
    pub slug: String,
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul halaman minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    #[validate(length(
        min = 10,
        max = 500000,
        message = "Konten halaman minimal 10 karakter (maks 500.000 karakter)"
    ))]
    pub konten: String,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct UpdateCmsPageRequest {
    #[validate(length(
        min = 3,
        max = 200,
        message = "Judul halaman minimal 3 karakter (3-200 karakter)"
    ))]
    pub judul: String,
    #[validate(length(
        min = 10,
        max = 500000,
        message = "Konten halaman minimal 10 karakter (maks 500.000 karakter)"
    ))]
    pub konten: String,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub is_published: bool,
}

// =============================================================================
// UPLOAD MEDIA & GAMBAR
// =============================================================================

#[derive(Debug, Clone, Deserialize, Validate, ToSchema)]
pub struct PresignMediaUploadRequest {
    #[validate(length(
        min = 1,
        max = 200,
        message = "Nama file wajib diisi (maks 200 karakter)"
    ))]
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UploadMediaResponse {
    pub url: String,
    pub file_key: String,
    pub upload_url: String,
    pub file_name: String,
}
