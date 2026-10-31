-- Migrasi 3: Modul Konfigurasi PMB Administrator
-- Tanggal: 2026-10-31

-- 1. Tabel Tahun Akademik
CREATE TABLE IF NOT EXISTS tahun_akademik (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tahun_akademik_dates CHECK (tgl_mulai < tgl_selesai)
);

CREATE INDEX IF NOT EXISTS idx_tahun_akademik_kode ON tahun_akademik(kode);

-- 2. Tabel Fakultas
CREATE TABLE IF NOT EXISTS fakultas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_fakultas VARCHAR(10) NOT NULL UNIQUE,
    nama_fakultas VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fakultas_kode ON fakultas(kode_fakultas);

-- 3. Perluas Tabel Gelombang
ALTER TABLE gelombang ADD COLUMN IF NOT EXISTS tahun_akademik_id UUID REFERENCES tahun_akademik(id) ON DELETE SET NULL;
ALTER TABLE gelombang ADD COLUMN IF NOT EXISTS nomor_gelombang INT NOT NULL DEFAULT 1;
ALTER TABLE gelombang ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'DIBUKA' 
    CHECK (status IN ('DRAFT', 'DIBUKA', 'DITUTUP', 'SELESAI'));
ALTER TABLE gelombang ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Check constraint untuk tanggal gelombang
ALTER TABLE gelombang DROP CONSTRAINT IF EXISTS chk_gelombang_dates;
ALTER TABLE gelombang ADD CONSTRAINT chk_gelombang_dates CHECK (tgl_mulai < tgl_selesai);
ALTER TABLE gelombang DROP CONSTRAINT IF EXISTS chk_gelombang_kuota;
ALTER TABLE gelombang ADD CONSTRAINT chk_gelombang_kuota CHECK (kuota >= 0);

CREATE INDEX IF NOT EXISTS idx_gelombang_tahun ON gelombang(tahun_akademik_id);
CREATE INDEX IF NOT EXISTS idx_gelombang_status ON gelombang(status);

-- 4. Perluas Program Studi (Hubungkan ke Fakultas & Constraint Kuota)
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS fakultas_id UUID REFERENCES fakultas(id) ON DELETE SET NULL;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE program_studi DROP CONSTRAINT IF EXISTS chk_prodi_kuota;
ALTER TABLE program_studi ADD CONSTRAINT chk_prodi_kuota CHECK (kuota >= 0);

CREATE INDEX IF NOT EXISTS idx_prodi_fakultas ON program_studi(fakultas_id);

-- 5. Tabel Kuota Program Studi per Gelombang
CREATE TABLE IF NOT EXISTS kuota_prodi_gelombang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prodi_id UUID NOT NULL REFERENCES program_studi(id) ON DELETE CASCADE,
    gelombang_id UUID NOT NULL REFERENCES gelombang(id) ON DELETE CASCADE,
    kuota INT NOT NULL DEFAULT 30 CHECK (kuota >= 0),
    kuota_terisi INT NOT NULL DEFAULT 0 CHECK (kuota_terisi >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prodi_gelombang UNIQUE (prodi_id, gelombang_id)
);

CREATE INDEX IF NOT EXISTS idx_kuota_pg_prodi ON kuota_prodi_gelombang(prodi_id);
CREATE INDEX IF NOT EXISTS idx_kuota_pg_gelombang ON kuota_prodi_gelombang(gelombang_id);

-- 6. Perluas Jalur Masuk
ALTER TABLE jalur_masuk ADD COLUMN IF NOT EXISTS tipe_seleksi VARCHAR(30) NOT NULL DEFAULT 'CBT'
    CHECK (tipe_seleksi IN ('CBT', 'BERKAS', 'CAMPURAN', 'RPL'));
ALTER TABLE jalur_masuk ADD COLUMN IF NOT EXISTS syarat TEXT;
ALTER TABLE jalur_masuk ADD COLUMN IF NOT EXISTS kuota_maksimal INT;
ALTER TABLE jalur_masuk ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. Tabel Komponen Biaya PMB
CREATE TABLE IF NOT EXISTS komponen_biaya (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_komponen VARCHAR(50) NOT NULL UNIQUE,
    nama_komponen VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_komponen_biaya_kode ON komponen_biaya(kode_komponen);

-- 8. Tabel Matriks Biaya (Per Prodi, Jalur, Gelombang, dan Komponen)
CREATE TABLE IF NOT EXISTS matriks_biaya (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prodi_id UUID NOT NULL REFERENCES program_studi(id) ON DELETE CASCADE,
    jalur_id UUID NOT NULL REFERENCES jalur_masuk(id) ON DELETE CASCADE,
    gelombang_id UUID NOT NULL REFERENCES gelombang(id) ON DELETE CASCADE,
    komponen_id UUID NOT NULL REFERENCES komponen_biaya(id) ON DELETE CASCADE,
    nominal BIGINT NOT NULL CHECK (nominal >= 0),
    bisa_dicicil BOOLEAN NOT NULL DEFAULT FALSE,
    maksimal_cicilan INT NOT NULL DEFAULT 1 CHECK (maksimal_cicilan >= 1),
    nominal_cicilan_pertama BIGINT CHECK (nominal_cicilan_pertama >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_matriks_biaya UNIQUE (prodi_id, jalur_id, gelombang_id, komponen_id)
);

CREATE INDEX IF NOT EXISTS idx_matriks_prodi_jalur_gelombang 
    ON matriks_biaya(prodi_id, jalur_id, gelombang_id);

-- 9. Perluas Tabel Vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS batas_jalur_id UUID REFERENCES jalur_masuk(id) ON DELETE SET NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS batas_prodi_id UUID REFERENCES program_studi(id) ON DELETE SET NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS deskripsi VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Constraint integritas kuota pemakaian voucher
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS chk_vouchers_kuota;
ALTER TABLE vouchers ADD CONSTRAINT chk_vouchers_kuota CHECK (kuota >= 0 AND kuota_terpakai <= kuota);

CREATE INDEX IF NOT EXISTS idx_vouchers_kode ON vouchers(kode_voucher);

-- 10. Tabel Pengaturan PMB
CREATE TABLE IF NOT EXISTS pengaturan_pmb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kunci VARCHAR(100) NOT NULL UNIQUE,
    nilai TEXT NOT NULL,
    deskripsi VARCHAR(255),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pengaturan_pmb_kunci ON pengaturan_pmb(kunci);

