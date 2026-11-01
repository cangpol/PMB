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
    pub gambar_url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author_nama: Option<String>,
    pub is_published: bool,
    pub published_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct CmsBanner {
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

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct CmsFaq {
    pub id: Uuid,
    pub kategori: String,
    pub pertanyaan: String,
    pub jawaban: String,
    pub urutan: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow)]
pub struct CmsPage {
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
