use sqlx::PgPool;

use crate::{error::AppError, modules::cms::model::CmsPost};

#[derive(Clone)]
pub struct CmsRepository {
    pool: PgPool,
}

impl CmsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_published(&self) -> Result<Vec<CmsPost>, AppError> {
        let list = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, is_published, published_at, created_at
             FROM cms_posts WHERE is_published = TRUE ORDER BY published_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_by_slug(&self, slug: &str) -> Result<Option<CmsPost>, AppError> {
        let p = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, is_published, published_at, created_at
             FROM cms_posts WHERE slug = $1 AND is_published = TRUE"
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }
}
