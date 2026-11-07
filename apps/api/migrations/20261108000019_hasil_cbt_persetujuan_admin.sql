-- Persetujuan manual admin atas hasil CBT peserta yang belum memenuhi passing grade.
ALTER TABLE hasil_ujian
    ADD COLUMN IF NOT EXISTS disetujui_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS disetujui_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS disetujui_alasan TEXT,
    ADD COLUMN IF NOT EXISTS disetujui_pada TIMESTAMPTZ;
