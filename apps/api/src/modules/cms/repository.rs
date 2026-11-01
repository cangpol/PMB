use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    modules::cms::model::{CmsBanner, CmsFaq, CmsPage, CmsPost},
};

#[derive(Clone)]
pub struct CmsRepository {
    pool: PgPool,
}

impl CmsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // =========================================================================
    // 1. POSTS (BERITA & PENGUMUMAN)
    // =========================================================================

    pub async fn list_published_posts(
        &self,
        kategori: Option<&str>,
    ) -> Result<Vec<CmsPost>, AppError> {
        let list = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                    is_published, published_at, created_at, updated_at
             FROM cms_posts
             WHERE is_published = TRUE
               AND ($1::text IS NULL OR kategori = $1)
             ORDER BY published_at DESC",
        )
        .bind(kategori)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_published_post_by_slug(
        &self,
        slug: &str,
    ) -> Result<Option<CmsPost>, AppError> {
        let p = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                    is_published, published_at, created_at, updated_at
             FROM cms_posts
             WHERE slug = $1 AND is_published = TRUE",
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn list_all_posts_admin(
        &self,
        kategori: Option<&str>,
    ) -> Result<Vec<CmsPost>, AppError> {
        let list = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                    is_published, published_at, created_at, updated_at
             FROM cms_posts
             WHERE ($1::text IS NULL OR kategori = $1)
             ORDER BY created_at DESC",
        )
        .bind(kategori)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_post_by_id(&self, id: Uuid) -> Result<Option<CmsPost>, AppError> {
        let p = sqlx::query_as::<_, CmsPost>(
            "SELECT id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                    is_published, published_at, created_at, updated_at
             FROM cms_posts
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn create_post(
        &self,
        slug: &str,
        judul: &str,
        kategori: &str,
        ringkasan: &str,
        konten: &str,
        gambar_url: Option<&str>,
        tags: &[String],
        author_nama: &str,
        is_published: bool,
    ) -> Result<CmsPost, AppError> {
        let p = sqlx::query_as::<_, CmsPost>(
            "INSERT INTO cms_posts (
                slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama, is_published,
                published_at, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                CASE WHEN $9 THEN NOW() ELSE NOW() END, NOW(), NOW()
            )
            RETURNING id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                      is_published, published_at, created_at, updated_at",
        )
        .bind(slug)
        .bind(judul)
        .bind(kategori)
        .bind(ringkasan)
        .bind(konten)
        .bind(gambar_url)
        .bind(tags)
        .bind(author_nama)
        .bind(is_published)
        .fetch_one(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn update_post(
        &self,
        id: Uuid,
        judul: &str,
        kategori: &str,
        ringkasan: &str,
        konten: &str,
        gambar_url: Option<&str>,
        tags: &[String],
        is_published: bool,
    ) -> Result<CmsPost, AppError> {
        let p = sqlx::query_as::<_, CmsPost>(
            "UPDATE cms_posts
             SET judul = $1, kategori = $2, ringkasan = $3, konten = $4,
                 gambar_url = $5, tags = $6, is_published = $7, updated_at = NOW()
             WHERE id = $8
             RETURNING id, slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama,
                       is_published, published_at, created_at, updated_at",
        )
        .bind(judul)
        .bind(kategori)
        .bind(ringkasan)
        .bind(konten)
        .bind(gambar_url)
        .bind(tags)
        .bind(is_published)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cms_posts WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // =========================================================================
    // 2. BANNERS (HERO HOMEPAGE SLIDER)
    // =========================================================================

    pub async fn list_active_banners(&self) -> Result<Vec<CmsBanner>, AppError> {
        let list = sqlx::query_as::<_, CmsBanner>(
            "SELECT id, judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at
             FROM cms_banners
             WHERE is_active = TRUE
             ORDER BY urutan ASC, created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn list_all_banners_admin(&self) -> Result<Vec<CmsBanner>, AppError> {
        let list = sqlx::query_as::<_, CmsBanner>(
            "SELECT id, judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at
             FROM cms_banners
             ORDER BY urutan ASC, created_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_banner_by_id(&self, id: Uuid) -> Result<Option<CmsBanner>, AppError> {
        let b = sqlx::query_as::<_, CmsBanner>(
            "SELECT id, judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at
             FROM cms_banners
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(b)
    }

    pub async fn create_banner(
        &self,
        judul: &str,
        subjudul: Option<&str>,
        gambar_url: &str,
        link_url: Option<&str>,
        urutan: i32,
        is_active: bool,
    ) -> Result<CmsBanner, AppError> {
        let b = sqlx::query_as::<_, CmsBanner>(
            "INSERT INTO cms_banners (judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at",
        )
        .bind(judul)
        .bind(subjudul)
        .bind(gambar_url)
        .bind(link_url)
        .bind(urutan)
        .bind(is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(b)
    }

    pub async fn update_banner(
        &self,
        id: Uuid,
        judul: &str,
        subjudul: Option<&str>,
        gambar_url: &str,
        link_url: Option<&str>,
        urutan: i32,
        is_active: bool,
    ) -> Result<CmsBanner, AppError> {
        let b = sqlx::query_as::<_, CmsBanner>(
            "UPDATE cms_banners
             SET judul = $1, subjudul = $2, gambar_url = $3, link_url = $4,
                 urutan = $5, is_active = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING id, judul, subjudul, gambar_url, link_url, urutan, is_active, created_at, updated_at",
        )
        .bind(judul)
        .bind(subjudul)
        .bind(gambar_url)
        .bind(link_url)
        .bind(urutan)
        .bind(is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(b)
    }

    pub async fn delete_banner(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cms_banners WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // =========================================================================
    // 3. FAQS (TANYA JAWAB POPULER)
    // =========================================================================

    pub async fn list_active_faqs(&self, kategori: Option<&str>) -> Result<Vec<CmsFaq>, AppError> {
        let list = sqlx::query_as::<_, CmsFaq>(
            "SELECT id, kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at
             FROM cms_faqs
             WHERE is_active = TRUE
               AND ($1::text IS NULL OR kategori = $1)
             ORDER BY urutan ASC, created_at ASC",
        )
        .bind(kategori)
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn list_all_faqs_admin(&self) -> Result<Vec<CmsFaq>, AppError> {
        let list = sqlx::query_as::<_, CmsFaq>(
            "SELECT id, kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at
             FROM cms_faqs
             ORDER BY kategori ASC, urutan ASC, created_at ASC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_faq_by_id(&self, id: Uuid) -> Result<Option<CmsFaq>, AppError> {
        let f = sqlx::query_as::<_, CmsFaq>(
            "SELECT id, kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at
             FROM cms_faqs
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(f)
    }

    pub async fn create_faq(
        &self,
        kategori: &str,
        pertanyaan: &str,
        jawaban: &str,
        urutan: i32,
        is_active: bool,
    ) -> Result<CmsFaq, AppError> {
        let f = sqlx::query_as::<_, CmsFaq>(
            "INSERT INTO cms_faqs (kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id, kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at",
        )
        .bind(kategori)
        .bind(pertanyaan)
        .bind(jawaban)
        .bind(urutan)
        .bind(is_active)
        .fetch_one(&self.pool)
        .await?;
        Ok(f)
    }

    pub async fn update_faq(
        &self,
        id: Uuid,
        kategori: &str,
        pertanyaan: &str,
        jawaban: &str,
        urutan: i32,
        is_active: bool,
    ) -> Result<CmsFaq, AppError> {
        let f = sqlx::query_as::<_, CmsFaq>(
            "UPDATE cms_faqs
             SET kategori = $1, pertanyaan = $2, jawaban = $3,
                 urutan = $4, is_active = $5, updated_at = NOW()
             WHERE id = $6
             RETURNING id, kategori, pertanyaan, jawaban, urutan, is_active, created_at, updated_at",
        )
        .bind(kategori)
        .bind(pertanyaan)
        .bind(jawaban)
        .bind(urutan)
        .bind(is_active)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(f)
    }

    pub async fn delete_faq(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cms_faqs WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // =========================================================================
    // 4. PAGES (HALAMAN STATIS & KEBIJAKAN)
    // =========================================================================

    pub async fn find_published_page_by_slug(
        &self,
        slug: &str,
    ) -> Result<Option<CmsPage>, AppError> {
        let p = sqlx::query_as::<_, CmsPage>(
            "SELECT id, slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at
             FROM cms_pages
             WHERE slug = $1 AND is_published = TRUE",
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn list_all_pages_admin(&self) -> Result<Vec<CmsPage>, AppError> {
        let list = sqlx::query_as::<_, CmsPage>(
            "SELECT id, slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at
             FROM cms_pages
             ORDER BY updated_at DESC",
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(list)
    }

    pub async fn find_page_by_id(&self, id: Uuid) -> Result<Option<CmsPage>, AppError> {
        let p = sqlx::query_as::<_, CmsPage>(
            "SELECT id, slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at
             FROM cms_pages
             WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn create_page(
        &self,
        slug: &str,
        judul: &str,
        konten: &str,
        meta_title: Option<&str>,
        meta_description: Option<&str>,
        is_published: bool,
    ) -> Result<CmsPage, AppError> {
        let p = sqlx::query_as::<_, CmsPage>(
            "INSERT INTO cms_pages (slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at",
        )
        .bind(slug)
        .bind(judul)
        .bind(konten)
        .bind(meta_title)
        .bind(meta_description)
        .bind(is_published)
        .fetch_one(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn update_page(
        &self,
        id: Uuid,
        judul: &str,
        konten: &str,
        meta_title: Option<&str>,
        meta_description: Option<&str>,
        is_published: bool,
    ) -> Result<CmsPage, AppError> {
        let p = sqlx::query_as::<_, CmsPage>(
            "UPDATE cms_pages
             SET judul = $1, konten = $2, meta_title = $3, meta_description = $4,
                 is_published = $5, updated_at = NOW()
             WHERE id = $6
             RETURNING id, slug, judul, konten, meta_title, meta_description, is_published, created_at, updated_at",
        )
        .bind(judul)
        .bind(konten)
        .bind(meta_title)
        .bind(meta_description)
        .bind(is_published)
        .bind(id)
        .fetch_one(&self.pool)
        .await?;
        Ok(p)
    }

    pub async fn delete_page(&self, id: Uuid) -> Result<(), AppError> {
        sqlx::query("DELETE FROM cms_pages WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
