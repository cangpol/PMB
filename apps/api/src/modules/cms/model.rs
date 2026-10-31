use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct CmsPost {
    pub id: Uuid,
    pub slug: String,
    pub judul: String,
    pub kategori: String,
    pub ringkasan: String,
    pub konten: String,
    pub is_published: bool,
    pub published_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
