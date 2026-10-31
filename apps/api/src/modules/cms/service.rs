use crate::{
    error::AppError,
    modules::cms::{dto::CmsPostResponse, repository::CmsRepository},
};

#[derive(Clone)]
pub struct CmsService {
    repo: CmsRepository,
}

impl CmsService {
    pub fn new(repo: CmsRepository) -> Self {
        Self { repo }
    }

    pub async fn get_posts(&self) -> Result<Vec<CmsPostResponse>, AppError> {
        let posts = self.repo.list_published().await?;
        Ok(posts
            .into_iter()
            .map(|p| CmsPostResponse {
                id: p.id,
                slug: p.slug,
                judul: p.judul,
                kategori: p.kategori,
                ringkasan: p.ringkasan,
                konten: p.konten,
                published_at: p.published_at,
            })
            .collect())
    }

    pub async fn get_post_by_slug(&self, slug: &str) -> Result<CmsPostResponse, AppError> {
        let p = self.repo.find_by_slug(slug).await?.ok_or_else(|| {
            AppError::NotFound("Artikel / pengumuman tidak ditemukan".to_string())
        })?;

        Ok(CmsPostResponse {
            id: p.id,
            slug: p.slug,
            judul: p.judul,
            kategori: p.kategori,
            ringkasan: p.ringkasan,
            konten: p.konten,
            published_at: p.published_at,
        })
    }
}
