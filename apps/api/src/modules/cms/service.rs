use uuid::Uuid;

use crate::{
    error::AppError,
    modules::cms::{
        dto::{
            CmsBannerResponse, CmsFaqResponse, CmsPageResponse, CmsPostResponse,
            CreateCmsBannerRequest, CreateCmsFaqRequest, CreateCmsPageRequest,
            CreateCmsPostRequest, UpdateCmsBannerRequest, UpdateCmsFaqRequest,
            UpdateCmsPageRequest, UpdateCmsPostRequest,
        },
        model::{CmsBanner, CmsFaq, CmsPage, CmsPost},
        repository::CmsRepository,
    },
    security::storage::{PresignedUploadResponse, StorageService},
};

// =============================================================================
// HTML SANITIZER & SECURITY ENGINE (ANTI-STORED XSS)
// =============================================================================

/// Sanitasi konten HTML (rich text) di server untuk menangkal Stored XSS.
/// Memakai `ammonia` (parser HTML5 sungguhan) — tag/atribut di luar whitelist dibuang,
/// event handler & skema `javascript:` dihapus, dan tautan `_blank` dipaksa `noopener noreferrer`.
pub fn sanitize_html(input: &str) -> String {
    use std::collections::{HashMap, HashSet};

    let tags: HashSet<&str> = [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "b",
        "strong",
        "i",
        "em",
        "u",
        "s",
        "strike",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "code",
        "pre",
        "img",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "hr",
        "br",
        "span",
        "div",
        "figure",
        "figcaption",
        "sub",
        "sup",
    ]
    .into_iter()
    .collect();

    let mut tag_attrs: HashMap<&str, HashSet<&str>> = HashMap::new();
    tag_attrs.insert("a", ["href", "title", "target"].into_iter().collect());
    tag_attrs.insert(
        "img",
        ["src", "alt", "title", "width", "height", "loading"]
            .into_iter()
            .collect(),
    );

    ammonia::Builder::default()
        .tags(tags)
        .tag_attributes(tag_attrs)
        .generic_attributes(["class"].into_iter().collect())
        .url_schemes(["http", "https", "mailto", "tel"].into_iter().collect())
        .link_rel(Some("noopener noreferrer"))
        .clean(input)
        .to_string()
}

pub fn slugify(text: &str) -> String {
    let mut result = String::new();
    let mut prev_dash = true;

    for c in text.to_lowercase().chars() {
        if c.is_alphanumeric() {
            result.push(c);
            prev_dash = false;
        } else if !prev_dash {
            result.push('-');
            prev_dash = true;
        }
    }

    let trimmed = result.trim_matches('-');
    if trimmed.is_empty() {
        format!("post-{}", &Uuid::new_v4().to_string()[..8])
    } else {
        trimmed.to_string()
    }
}

// =============================================================================
// CMS SERVICE IMPLEMENTATION
// =============================================================================

#[derive(Clone)]
pub struct CmsService {
    repo: CmsRepository,
    storage: StorageService,
}

impl CmsService {
    pub fn new(repo: CmsRepository, storage: StorageService) -> Self {
        Self { repo, storage }
    }

    // -------------------------------------------------------------------------
    // 1. POSTS (BERITA & PENGUMUMAN)
    // -------------------------------------------------------------------------

    pub async fn list_published_posts(
        &self,
        kategori: Option<&str>,
    ) -> Result<Vec<CmsPostResponse>, AppError> {
        let posts = self.repo.list_published_posts(kategori).await?;
        Ok(posts.into_iter().map(Self::map_post_response).collect())
    }

    pub async fn get_published_post_by_slug(
        &self,
        slug: &str,
    ) -> Result<CmsPostResponse, AppError> {
        let p = self
            .repo
            .find_published_post_by_slug(slug)
            .await?
            .ok_or_else(|| {
                AppError::NotFound("Artikel / pengumuman publik tidak ditemukan".to_string())
            })?;
        Ok(Self::map_post_response(p))
    }

    pub async fn list_all_posts_admin(
        &self,
        kategori: Option<&str>,
    ) -> Result<Vec<CmsPostResponse>, AppError> {
        let posts = self.repo.list_all_posts_admin(kategori).await?;
        Ok(posts.into_iter().map(Self::map_post_response).collect())
    }

    pub async fn get_post_by_id_admin(&self, id: Uuid) -> Result<CmsPostResponse, AppError> {
        let p = self.repo.find_post_by_id(id).await?.ok_or_else(|| {
            AppError::NotFound("Artikel / pengumuman tidak ditemukan".to_string())
        })?;
        Ok(Self::map_post_response(p))
    }

    pub async fn create_post(
        &self,
        req: CreateCmsPostRequest,
        author_nama: &str,
    ) -> Result<CmsPostResponse, AppError> {
        let mut base_slug = slugify(&req.judul);

        // Jika slug sudah terpakai, tambahkan suffix acak
        if self
            .repo
            .find_published_post_by_slug(&base_slug)
            .await?
            .is_some()
        {
            base_slug = format!("{}-{}", base_slug, &Uuid::new_v4().to_string()[..6]);
        }

        let clean_ringkasan = sanitize_html(&req.ringkasan);
        let clean_konten = sanitize_html(&req.konten);
        let tags = req.tags.unwrap_or_default();
        let is_published = req.is_published.unwrap_or(true);

        let post = self
            .repo
            .create_post(
                &base_slug,
                &req.judul,
                &req.kategori,
                &clean_ringkasan,
                &clean_konten,
                req.gambar_url.as_deref(),
                &tags,
                author_nama,
                is_published,
            )
            .await?;

        Ok(Self::map_post_response(post))
    }

    pub async fn update_post(
        &self,
        id: Uuid,
        req: UpdateCmsPostRequest,
    ) -> Result<CmsPostResponse, AppError> {
        let clean_ringkasan = sanitize_html(&req.ringkasan);
        let clean_konten = sanitize_html(&req.konten);
        let tags = req.tags.unwrap_or_default();

        let post = self
            .repo
            .update_post(
                id,
                &req.judul,
                &req.kategori,
                &clean_ringkasan,
                &clean_konten,
                req.gambar_url.as_deref(),
                &tags,
                req.is_published,
            )
            .await?;

        Ok(Self::map_post_response(post))
    }

    pub async fn delete_post(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_post(id).await
    }

    // -------------------------------------------------------------------------
    // 2. BANNERS (HERO HOMEPAGE SLIDER)
    // -------------------------------------------------------------------------

    pub async fn list_active_banners(&self) -> Result<Vec<CmsBannerResponse>, AppError> {
        let banners = self.repo.list_active_banners().await?;
        Ok(banners.into_iter().map(Self::map_banner_response).collect())
    }

    pub async fn list_all_banners_admin(&self) -> Result<Vec<CmsBannerResponse>, AppError> {
        let banners = self.repo.list_all_banners_admin().await?;
        Ok(banners.into_iter().map(Self::map_banner_response).collect())
    }

    pub async fn get_banner_by_id_admin(&self, id: Uuid) -> Result<CmsBannerResponse, AppError> {
        let b = self
            .repo
            .find_banner_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Banner tidak ditemukan".to_string()))?;
        Ok(Self::map_banner_response(b))
    }

    pub async fn create_banner(
        &self,
        req: CreateCmsBannerRequest,
    ) -> Result<CmsBannerResponse, AppError> {
        let urutan = req.urutan.unwrap_or(0);
        let is_active = req.is_active.unwrap_or(true);

        let banner = self
            .repo
            .create_banner(
                &req.judul,
                req.subjudul.as_deref(),
                &req.gambar_url,
                req.link_url.as_deref(),
                urutan,
                is_active,
            )
            .await?;

        Ok(Self::map_banner_response(banner))
    }

    pub async fn update_banner(
        &self,
        id: Uuid,
        req: UpdateCmsBannerRequest,
    ) -> Result<CmsBannerResponse, AppError> {
        let banner = self
            .repo
            .update_banner(
                id,
                &req.judul,
                req.subjudul.as_deref(),
                &req.gambar_url,
                req.link_url.as_deref(),
                req.urutan,
                req.is_active,
            )
            .await?;

        Ok(Self::map_banner_response(banner))
    }

    pub async fn delete_banner(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_banner(id).await
    }

    // -------------------------------------------------------------------------
    // 3. FAQS (TANYA JAWAB POPULER)
    // -------------------------------------------------------------------------

    pub async fn list_active_faqs(
        &self,
        kategori: Option<&str>,
    ) -> Result<Vec<CmsFaqResponse>, AppError> {
        let faqs = self.repo.list_active_faqs(kategori).await?;
        Ok(faqs.into_iter().map(Self::map_faq_response).collect())
    }

    pub async fn list_all_faqs_admin(&self) -> Result<Vec<CmsFaqResponse>, AppError> {
        let faqs = self.repo.list_all_faqs_admin().await?;
        Ok(faqs.into_iter().map(Self::map_faq_response).collect())
    }

    pub async fn get_faq_by_id_admin(&self, id: Uuid) -> Result<CmsFaqResponse, AppError> {
        let f = self
            .repo
            .find_faq_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("FAQ tidak ditemukan".to_string()))?;
        Ok(Self::map_faq_response(f))
    }

    pub async fn create_faq(&self, req: CreateCmsFaqRequest) -> Result<CmsFaqResponse, AppError> {
        let clean_jawaban = sanitize_html(&req.jawaban);
        let urutan = req.urutan.unwrap_or(0);
        let is_active = req.is_active.unwrap_or(true);

        let faq = self
            .repo
            .create_faq(
                &req.kategori,
                &req.pertanyaan,
                &clean_jawaban,
                urutan,
                is_active,
            )
            .await?;

        Ok(Self::map_faq_response(faq))
    }

    pub async fn update_faq(
        &self,
        id: Uuid,
        req: UpdateCmsFaqRequest,
    ) -> Result<CmsFaqResponse, AppError> {
        let clean_jawaban = sanitize_html(&req.jawaban);

        let faq = self
            .repo
            .update_faq(
                id,
                &req.kategori,
                &req.pertanyaan,
                &clean_jawaban,
                req.urutan,
                req.is_active,
            )
            .await?;

        Ok(Self::map_faq_response(faq))
    }

    pub async fn delete_faq(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_faq(id).await
    }

    // -------------------------------------------------------------------------
    // 4. PAGES (HALAMAN STATIS & KEBIJAKAN)
    // -------------------------------------------------------------------------

    pub async fn get_published_page_by_slug(
        &self,
        slug: &str,
    ) -> Result<CmsPageResponse, AppError> {
        let p = self
            .repo
            .find_published_page_by_slug(slug)
            .await?
            .ok_or_else(|| AppError::NotFound("Halaman statis tidak ditemukan".to_string()))?;
        Ok(Self::map_page_response(p))
    }

    pub async fn list_all_pages_admin(&self) -> Result<Vec<CmsPageResponse>, AppError> {
        let pages = self.repo.list_all_pages_admin().await?;
        Ok(pages.into_iter().map(Self::map_page_response).collect())
    }

    pub async fn get_page_by_id_admin(&self, id: Uuid) -> Result<CmsPageResponse, AppError> {
        let p = self
            .repo
            .find_page_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound("Halaman tidak ditemukan".to_string()))?;
        Ok(Self::map_page_response(p))
    }

    pub async fn create_page(
        &self,
        req: CreateCmsPageRequest,
    ) -> Result<CmsPageResponse, AppError> {
        let clean_slug = slugify(&req.slug);
        let clean_konten = sanitize_html(&req.konten);
        let is_published = req.is_published.unwrap_or(true);

        let page = self
            .repo
            .create_page(
                &clean_slug,
                &req.judul,
                &clean_konten,
                req.meta_title.as_deref(),
                req.meta_description.as_deref(),
                is_published,
            )
            .await?;

        Ok(Self::map_page_response(page))
    }

    pub async fn update_page(
        &self,
        id: Uuid,
        req: UpdateCmsPageRequest,
    ) -> Result<CmsPageResponse, AppError> {
        let clean_konten = sanitize_html(&req.konten);

        let page = self
            .repo
            .update_page(
                id,
                &req.judul,
                &clean_konten,
                req.meta_title.as_deref(),
                req.meta_description.as_deref(),
                req.is_published,
            )
            .await?;

        Ok(Self::map_page_response(page))
    }

    pub async fn delete_page(&self, id: Uuid) -> Result<(), AppError> {
        self.repo.delete_page(id).await
    }

    // -------------------------------------------------------------------------
    // 5. STORAGE & MEDIA UPLOAD
    // -------------------------------------------------------------------------

    pub fn generate_media_upload_url(
        &self,
        file_name: &str,
    ) -> Result<PresignedUploadResponse, AppError> {
        let ext = file_name
            .split('.')
            .next_back()
            .unwrap_or("png")
            .to_lowercase();

        const ALLOWED_EXT: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "avif", "pdf"];
        if !ALLOWED_EXT.contains(&ext.as_str()) {
            return Err(AppError::BadRequest(
                "Format file media tidak diizinkan. Hanya format gambar (jpg, jpeg, png, webp, gif, avif) dan dokumen (pdf) yang didukung.".to_string(),
            ));
        }

        let object_key = format!(
            "cms/media/{}_{}.{}",
            Uuid::new_v4(),
            slugify(file_name),
            ext
        );
        // Presigned upload URL valid selama 30 menit
        let res = self.storage.generate_presigned_put_url(&object_key, 1800);
        Ok(res)
    }

    pub fn get_public_media_url(&self, file_key: &str) -> String {
        format!(
            "{}/{}/{}",
            self.storage.endpoint,
            self.storage.bucket,
            file_key.trim_start_matches('/')
        )
    }

    // -------------------------------------------------------------------------
    // MAPPER HELPERS
    // -------------------------------------------------------------------------

    fn map_post_response(p: CmsPost) -> CmsPostResponse {
        CmsPostResponse {
            id: p.id,
            slug: p.slug,
            judul: p.judul,
            kategori: p.kategori,
            ringkasan: p.ringkasan,
            konten: p.konten,
            gambar_url: p.gambar_url,
            tags: p.tags.unwrap_or_default(),
            author_nama: p.author_nama.unwrap_or_else(|| "Humas PMB".to_string()),
            is_published: p.is_published,
            published_at: p.published_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }

    fn map_banner_response(b: CmsBanner) -> CmsBannerResponse {
        CmsBannerResponse {
            id: b.id,
            judul: b.judul,
            subjudul: b.subjudul,
            gambar_url: b.gambar_url,
            link_url: b.link_url,
            urutan: b.urutan,
            is_active: b.is_active,
            created_at: b.created_at,
            updated_at: b.updated_at,
        }
    }

    fn map_faq_response(f: CmsFaq) -> CmsFaqResponse {
        CmsFaqResponse {
            id: f.id,
            kategori: f.kategori,
            pertanyaan: f.pertanyaan,
            jawaban: f.jawaban,
            urutan: f.urutan,
            is_active: f.is_active,
            created_at: f.created_at,
            updated_at: f.updated_at,
        }
    }

    fn map_page_response(p: CmsPage) -> CmsPageResponse {
        CmsPageResponse {
            id: p.id,
            slug: p.slug,
            judul: p.judul,
            konten: p.konten,
            meta_title: p.meta_title,
            meta_description: p.meta_description,
            is_published: p.is_published,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitizer_removes_script_tags_and_content() {
        let dirty = "<p>Halo Dunia</p><script>alert('xss');</script><p>Kabar Baik</p>";
        let clean = sanitize_html(dirty);
        assert!(!clean.contains("script"));
        assert!(!clean.contains("alert"));
        assert_eq!(clean, "<p>Halo Dunia</p><p>Kabar Baik</p>");
    }

    #[test]
    fn test_sanitizer_nested_bypass_and_unicode() {
        let clean = sanitize_html(
            "<scr<script>ipt>alert(1)</script>Teks – café <img src=x onerror=alert(1)>",
        );
        assert!(!clean.contains("<script"));
        assert!(!clean.contains("onerror"));
        assert!(clean.contains("café"));
    }

    #[test]
    fn test_sanitizer_removes_onerror_and_inline_events() {
        let dirty = r#"<img src="foto.jpg" onerror="alert('hack')" alt="Foto Kampus" />"#;
        let clean = sanitize_html(dirty);
        assert!(!clean.contains("onerror"));
        assert!(!clean.contains("alert"));
        assert!(clean.contains("src=\"foto.jpg\""));
        assert!(clean.contains("alt=\"Foto Kampus\""));
    }

    #[test]
    fn test_sanitizer_disallows_javascript_urls() {
        let dirty = r#"<a href="javascript:alert('pwned')">Klik Di Sini</a>"#;
        let clean = sanitize_html(dirty);
        assert!(!clean.contains("javascript:"));
        assert!(!clean.contains("alert"));
        assert!(clean.contains("Klik Di Sini") && !clean.contains("href"));
    }

    #[test]
    fn test_sanitizer_enforces_noopener_for_target_blank() {
        let dirty = r#"<a href="https://upitra.ac.id" target="_blank">UPITRA</a>"#;
        let clean = sanitize_html(dirty);
        assert!(clean.contains("target=\"_blank\""));
        assert!(clean.contains("rel=\"noopener noreferrer\""));
    }

    #[test]
    fn test_slugify_accents_and_symbols() {
        assert_eq!(
            slugify("Pendaftaran Mahasiswa Baru 2026/2027 Dibuka!"),
            "pendaftaran-mahasiswa-baru-2026-2027-dibuka"
        );
        assert_eq!(
            slugify("   Fasilitas & Beasiswa Prestasi  "),
            "fasilitas-beasiswa-prestasi"
        );
    }
}
