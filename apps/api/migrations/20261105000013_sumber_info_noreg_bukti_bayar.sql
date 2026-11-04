-- =========================================================================
-- Migrasi: Sumber informasi PMB, Nomor Registrasi Daftar Ulang, Bukti Bayar
-- Versi: 20261105000013
-- =========================================================================

-- 1. Sumber informasi PMB (diisi saat registrasi akun, bahan evaluasi marketing)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS sumber_informasi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS sumber_informasi_lainnya VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_users_sumber_informasi ON users(sumber_informasi);

-- 2. Nomor registrasi daftar ulang (unik per calon yang lulus)
ALTER TABLE hasil_kelulusan
    ADD COLUMN IF NOT EXISTS nomor_registrasi VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hasil_kelulusan_nomor_registrasi
    ON hasil_kelulusan(nomor_registrasi) WHERE nomor_registrasi IS NOT NULL;

-- 3. Bukti bayar daftar ulang (diunggah calon, disetujui admin keuangan)
CREATE TABLE IF NOT EXISTS bukti_bayar_daftar_ulang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    tagihan_id UUID REFERENCES tagihan(id) ON DELETE SET NULL,
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'DISETUJUI', 'DITOLAK')),
    catatan TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bukti_bayar_du_pendaftar ON bukti_bayar_daftar_ulang(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_bukti_bayar_du_status ON bukti_bayar_daftar_ulang(status);
