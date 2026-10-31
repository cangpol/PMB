-- Migrasi 2: Modul Autentikasi Lanjutan & Role-Based Access Control (RBAC)
-- Tanggal: 2026-10-31

-- 1. Tabel Peran Resmi (RBAC)
CREATE TABLE IF NOT EXISTS peran (
    id VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 6 Peran Resmi PMB Universitas Pignatelli Triputra
INSERT INTO peran (id, nama, deskripsi) VALUES
    ('super_admin', 'Super Administrator', 'Akses penuh ke konfigurasi sistem, audit log, dan hak akses'),
    ('admin_pmb', 'Administrator PMB', 'Verifikasi berkas, seleksi kelulusan, penetapan kuota dan gelombang'),
    ('keuangan', 'Staf Keuangan', 'Verifikasi bukti pembayaran formulir pendaftaran dan UKT'),
    ('pengawas_ujian', 'Pengawas Ujian CBT', 'Monitoring dan pengawasan sesi ujian Computer-Based Test online'),
    ('asesor_rpl', 'Asesor RPL', 'Penilaian portofolio dan asesmen Rekognisi Pembelajaran Lampau'),
    ('calon_mahasiswa', 'Calon Mahasiswa', 'Pendaftaran akun, pengisian biodata, pembayaran, dan tes online')
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    deskripsi = EXCLUDED.deskripsi;

-- 2. Perluas Tabel Pengguna (users) untuk Keamanan & Verifikasi
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Perbarui Check Constraint Role pada Users agar Mendukung Seluruh Peran Baru
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'admin_pmb', 'keuangan', 'pengawas_ujian', 'asesor_rpl', 'calon_mahasiswa', 'penguji'));

-- 3. Tabel Sesi Server-Side (PostgreSQL Persistence & Audit)
CREATE TABLE IF NOT EXISTS sesi (
    id VARCHAR(128) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesi_user_id ON sesi(user_id);
CREATE INDEX IF NOT EXISTS idx_sesi_expires_at ON sesi(expires_at);

-- 4. Tabel Token Verifikasi (Verifikasi Email & Reset Password)
CREATE TABLE IF NOT EXISTS token_verifikasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    tipe VARCHAR(50) NOT NULL CHECK (tipe IN ('VERIFIKASI_EMAIL', 'RESET_PASSWORD')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_verifikasi_user ON token_verifikasi(user_id);
CREATE INDEX IF NOT EXISTS idx_token_verifikasi_hash ON token_verifikasi(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_verifikasi_tipe ON token_verifikasi(tipe);

-- 5. View Pengguna (Sinonim Bahasa Indonesia untuk Integrasi Modul Lain)
CREATE OR REPLACE VIEW pengguna AS
SELECT 
    id,
    email,
    password_hash,
    role AS peran,
    nama_lengkap,
    no_hp,
    is_active,
    is_email_verified,
    failed_login_attempts,
    locked_until,
    created_at,
    updated_at
FROM users;

