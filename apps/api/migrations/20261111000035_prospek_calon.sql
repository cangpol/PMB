-- Calon peminat yang mengisi formulir minat (pop up halaman depan) sebelum membuat akun PMB.
CREATE TABLE IF NOT EXISTS prospek_calon (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(100) NOT NULL,
    no_hp VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    asal_sekolah VARCHAR(150) NOT NULL,
    prodi_id UUID REFERENCES program_studi(id) ON DELETE SET NULL,
    prodi_minat VARCHAR(150) NOT NULL,
    sumber VARCHAR(30) NOT NULL DEFAULT 'POPUP_BERANDA',
    status VARCHAR(20) NOT NULL DEFAULT 'BARU'
        CHECK (status IN ('BARU', 'DIHUBUNGI', 'SUDAH_DAFTAR')),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prospek_calon_status_waktu ON prospek_calon (status, created_at DESC);
