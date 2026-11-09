-- =========================================================================
-- Migrasi: Tahap pendaftaran di dalam gelombang
-- Versi: 20261109000025
--
-- Satu gelombang dapat dibagi menjadi beberapa tahap (mis. Gelombang 1 Tahap 1 dan Tahap 2)
-- dengan rentang tanggal sendiri. Tahap yang sudah lewat tetap tampil tetapi tidak dapat
-- dipilih; pendaftaran dilanjutkan pada tahap berikutnya. Gelombang tanpa tahap berperilaku
-- seperti sebelumnya (memakai tanggal gelombang).
-- =========================================================================

CREATE TABLE IF NOT EXISTS tahap_gelombang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gelombang_id UUID NOT NULL REFERENCES gelombang(id) ON DELETE CASCADE,
    nomor_tahap INT NOT NULL CHECK (nomor_tahap > 0),
    nama VARCHAR(100) NOT NULL,
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tahap_gelombang_tanggal CHECK (tgl_mulai <= tgl_selesai),
    CONSTRAINT uq_tahap_gelombang_nomor UNIQUE (gelombang_id, nomor_tahap)
);

CREATE INDEX IF NOT EXISTS idx_tahap_gelombang_gelombang ON tahap_gelombang(gelombang_id);

-- Tahap tempat calon mendaftar (kosong untuk gelombang tanpa tahap / data lama)
ALTER TABLE pendaftar
    ADD COLUMN IF NOT EXISTS tahap_gelombang_id UUID REFERENCES tahap_gelombang(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pendaftar_tahap_gelombang ON pendaftar(tahap_gelombang_id);
