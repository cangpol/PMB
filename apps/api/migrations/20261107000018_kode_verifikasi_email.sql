-- =========================================================================
-- Migrasi: Verifikasi email dengan kode 6 digit
-- Versi: 20261107000018
--
-- Kode disimpan sebagai hash (SHA-256 dari id token + kode), tidak pernah
-- dalam bentuk asli. `percobaan` membatasi tebakan kode per token.
-- =========================================================================

ALTER TABLE token_verifikasi ADD COLUMN IF NOT EXISTS percobaan INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_token_verifikasi_aktif
    ON token_verifikasi(user_id, tipe, created_at DESC)
    WHERE used_at IS NULL;
