-- Migrasi PMB: Alur Pendaftaran Lengkap & Notifikasi Antrean Email Asinkron
-- Universitas Pignatelli Triputra

-- 1. Tambah kolom channel pada tabel pendaftar (online / offline)
ALTER TABLE pendaftar 
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'online';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pendaftar_channel_check'
    ) THEN
        ALTER TABLE pendaftar 
        ADD CONSTRAINT pendaftar_channel_check CHECK (channel IN ('online', 'offline'));
    END IF;
END $$;

-- 2. Perbarui batasan metode pembayaran pada tabel pembayaran untuk mendukung TUNAI_LOKET (loket offline)
ALTER TABLE pembayaran DROP CONSTRAINT IF EXISTS pembayaran_metode_pembayaran_check;
ALTER TABLE pembayaran 
ADD CONSTRAINT pembayaran_metode_pembayaran_check 
CHECK (metode_pembayaran IN ('VIRTUAL_ACCOUNT', 'TRANSFER_MANUAL', 'TUNAI_LOKET'));

-- 3. Tabel antrean_email untuk pemrosesan notifikasi email asinkron
CREATE TABLE IF NOT EXISTS antrean_email (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT NOT NULL,
    tipe_notifikasi VARCHAR(50) NOT NULL, -- PENDAFTARAN_DRAFT, PENDAFTARAN_SUBMIT, PEMBAYARAN_LUNAS, VERIFIKASI_BERKAS, KELULUSAN
    pendaftar_id UUID REFERENCES pendaftar(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_antrean_email_status ON antrean_email(status, created_at);
CREATE INDEX IF NOT EXISTS idx_antrean_email_pendaftar ON antrean_email(pendaftar_id);

