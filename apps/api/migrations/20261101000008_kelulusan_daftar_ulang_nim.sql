-- =========================================================================
-- Migrasi: Modul Kelulusan, Daftar Ulang, dan Penerbitan NIM Otomatis
-- Versi: 20261101000008
-- =========================================================================

-- 1. TABEL KONFIGURASI RUMUS PENILAIAN PER JALUR
CREATE TABLE IF NOT EXISTS rumus_penilaian_jalur (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jalur_id UUID NOT NULL UNIQUE REFERENCES jalur_masuk(id) ON DELETE CASCADE,
    bobot_cbt DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    bobot_rapor DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    bobot_prestasi DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    bobot_wawancara DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    default_passing_score DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rumus_jalur_id ON rumus_penilaian_jalur(jalur_id);

-- 2. TABEL SIDANG KELULUSAN / PLENO PMB (Approval Workflow)
CREATE TABLE IF NOT EXISTS sidang_kelulusan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gelombang_id UUID REFERENCES gelombang(id) ON DELETE SET NULL,
    nama_sidang VARCHAR(255) NOT NULL,
    nomor_sk VARCHAR(100),
    tanggal_sidang DATE NOT NULL DEFAULT CURRENT_DATE,
    tgl_pengumuman TIMESTAMPTZ NOT NULL,
    status_sidang VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status_sidang IN ('DRAFT', 'DISETUJUI', 'DIPUBLIKASIKAN', 'DIBATALKAN')),
    total_peserta INT NOT NULL DEFAULT 0,
    total_lulus INT NOT NULL DEFAULT 0,
    total_cadangan INT NOT NULL DEFAULT 0,
    total_tidak_lulus INT NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    catatan_sidang TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sidang_status ON sidang_kelulusan(status_sidang);
CREATE INDEX IF NOT EXISTS idx_sidang_gelombang ON sidang_kelulusan(gelombang_id);

-- 3. PERBARUI TABEL HASIL KELULUSAN (Jika belum ada kolom tambahan)
ALTER TABLE hasil_kelulusan
ADD COLUMN IF NOT EXISTS sidang_id UUID REFERENCES sidang_kelulusan(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pilihan_ke INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS ranking INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS skor_cbt DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS nilai_rapor DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS nilai_prestasi DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS catatan_sidang TEXT,
ADD COLUMN IF NOT EXISTS status_daftar_ulang VARCHAR(30) NOT NULL DEFAULT 'BELUM_DAFTAR_ULANG';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'hasil_kelulusan_status_daftar_ulang_check'
    ) THEN
        ALTER TABLE hasil_kelulusan 
        ADD CONSTRAINT hasil_kelulusan_status_daftar_ulang_check 
        CHECK (status_daftar_ulang IN ('BELUM_DAFTAR_ULANG', 'TAGIHAN_TERBIT', 'LUNAS', 'BERKAS_LENGKAP', 'TERDAFTAR_SEBAGAI_MAHASISWA'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kelulusan_sidang ON hasil_kelulusan(sidang_id);
CREATE INDEX IF NOT EXISTS idx_kelulusan_ranking ON hasil_kelulusan(ranking);
CREATE INDEX IF NOT EXISTS idx_kelulusan_daftar_ulang ON hasil_kelulusan(status_daftar_ulang);

-- 4. TABEL AUDIT LOG KEPUTUSAN KELULUSAN
CREATE TABLE IF NOT EXISTS audit_kelulusan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    sidang_id UUID REFERENCES sidang_kelulusan(id) ON DELETE SET NULL,
    status_lama VARCHAR(50),
    status_baru VARCHAR(50) NOT NULL,
    prodi_lama_id UUID REFERENCES program_studi(id),
    prodi_baru_id UUID REFERENCES program_studi(id),
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(255) NOT NULL,
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_kelulusan_pendaftar ON audit_kelulusan(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_audit_kelulusan_sidang ON audit_kelulusan(sidang_id);

-- 5. TABEL NIM COUNTER (Penguncian Transaksional Anti-Duplikasi Konkuren)
CREATE TABLE IF NOT EXISTS nim_counter (
    tahun INT NOT NULL,
    prodi_id UUID NOT NULL REFERENCES program_studi(id) ON DELETE CASCADE,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tahun, prodi_id)
);

-- 6. TABEL BERKAS DAFTAR ULANG MAHASISWA BARU
CREATE TABLE IF NOT EXISTS berkas_daftar_ulang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    jenis_berkas VARCHAR(50) NOT NULL, -- 'SURAT_PERNYATAAN_MABA', 'SURAT_BEBAS_NARKOBA', 'AKTA_KELAHIRAN', 'IJAZAH_LEGALISIR'
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status_verifikasi IN ('PENDING', 'VALID', 'INVALID')),
    catatan TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_berkas_daftar_ulang_pendaftar ON berkas_daftar_ulang(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_berkas_daftar_ulang_status ON berkas_daftar_ulang(status_verifikasi);

-- 7. DEFAULT RUMUS PENILAIAN JALUR
INSERT INTO rumus_penilaian_jalur (jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara, default_passing_score, keterangan)
SELECT id, 50.0, 30.0, 20.0, 0.0, 65.0, 'Rumus standar seleksi PMB'
FROM jalur_masuk
ON CONFLICT (jalur_id) DO NOTHING;

