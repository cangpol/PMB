-- =========================================================================
-- Migrasi: Log pelanggaran CBT (anti-kecurangan)
-- Versi: 20261105000012
-- =========================================================================

CREATE TABLE IF NOT EXISTS pelanggaran_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    peserta_sesi_id UUID NOT NULL REFERENCES peserta_sesi(id) ON DELETE CASCADE,
    jenis VARCHAR(40) NOT NULL,
    detail VARCHAR(255),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pelanggaran_peserta ON pelanggaran_ujian(peserta_sesi_id);
