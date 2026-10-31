use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CmsPostResponse {
    pub id: Uuid,
    pub slug: String,
    pub judul: String,
    pub kategori: String,
    pub ringkasan: String,
    pub konten: String,
    pub published_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateCmsPostRequest {
    #[validate(length(min = 3, message = "Judul minimal 3 karakter"))]
    pub judul: String,
    pub kategori: String,
    pub ringkasan: String,
    pub konten: String,
}
