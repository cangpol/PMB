-- Informasi gelombang yang tampil di halaman depan (dapat diedit admin)
ALTER TABLE gelombang
    ADD COLUMN IF NOT EXISTS deskripsi TEXT,
    ADD COLUMN IF NOT EXISTS info_ujian_cbt VARCHAR(255),
    ADD COLUMN IF NOT EXISTS info_pengumuman VARCHAR(255),
    ADD COLUMN IF NOT EXISTS info_daftar_ulang VARCHAR(255),
    ADD COLUMN IF NOT EXISTS benefit JSONB NOT NULL DEFAULT '[]'::jsonb;
