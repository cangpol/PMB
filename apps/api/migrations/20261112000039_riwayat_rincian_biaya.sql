-- Riwayat Rincian Biaya Kuliah: setiap kali admin mengubah biaya, kondisi tabel sebelum perubahan
-- diarsipkan sebagai satu versi (maksimal satu versi per hari). Versi yang berakhir dalam 1 tahun
-- terakhir dapat diunduh publik di halaman Biaya.
CREATE TABLE IF NOT EXISTS rincian_biaya_versi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    berlaku_dari TIMESTAMPTZ NOT NULL,
    berlaku_sampai TIMESTAMPTZ NOT NULL,
    dibuat_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rincian_biaya_versi_sampai ON rincian_biaya_versi (berlaku_sampai DESC);

-- Nama program studi disalin ke arsip agar riwayat tetap utuh walau program studi berubah.
CREATE TABLE IF NOT EXISTS rincian_biaya_versi_item (
    versi_id UUID NOT NULL REFERENCES rincian_biaya_versi(id) ON DELETE CASCADE,
    kode_prodi VARCHAR(50) NOT NULL,
    nama_prodi VARCHAR(255) NOT NULL,
    jenjang VARCHAR(10) NOT NULL,
    fakultas VARCHAR(255) NOT NULL,
    admisi BIGINT NOT NULL DEFAULT 0,
    semester_1 BIGINT NOT NULL DEFAULT 0,
    semester_2 BIGINT NOT NULL DEFAULT 0,
    semester_3 BIGINT NOT NULL DEFAULT 0,
    semester_4 BIGINT NOT NULL DEFAULT 0,
    semester_5 BIGINT NOT NULL DEFAULT 0,
    semester_6 BIGINT NOT NULL DEFAULT 0,
    semester_7 BIGINT NOT NULL DEFAULT 0,
    semester_8 BIGINT NOT NULL DEFAULT 0,
    jumlah_semester INT NOT NULL DEFAULT 8
);
CREATE INDEX IF NOT EXISTS idx_rincian_biaya_versi_item ON rincian_biaya_versi_item (versi_id);
