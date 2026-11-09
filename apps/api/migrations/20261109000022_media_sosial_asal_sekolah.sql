-- =========================================================================
-- Migrasi: Media sosial digabung jadi satu sumber informasi + asal sekolah saat registrasi
-- Versi: 20261109000022
-- =========================================================================

-- 1. Asal sekolah calon (provinsi -> kabupaten/kota -> sekolah), diisi saat registrasi akun
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS provinsi_asal_sekolah VARCHAR(100),
    ADD COLUMN IF NOT EXISTS kabupaten_asal_sekolah VARCHAR(100),
    ADD COLUMN IF NOT EXISTS asal_sekolah VARCHAR(255);

-- 2. Instagram/TikTok/Facebook/YouTube kini satu sumber "MEDIA_SOSIAL";
--    nama platformnya disimpan di kolom keterangan (sumber_informasi_lainnya).
UPDATE users
SET sumber_informasi_lainnya = CASE sumber_informasi
        WHEN 'INSTAGRAM' THEN 'Instagram'
        WHEN 'TIKTOK' THEN 'TikTok'
        WHEN 'FACEBOOK' THEN 'Facebook'
        ELSE 'YouTube'
    END,
    sumber_informasi = 'MEDIA_SOSIAL'
WHERE sumber_informasi IN ('INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'YOUTUBE');
