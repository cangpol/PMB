-- Migrasi Inisialisasi Skema PMB Universitas Pignatelli Triputra
-- Tanggal: 2026-10-31

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL PENGGUNA & RBAC
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('calon_mahasiswa', 'admin_pmb', 'keuangan', 'penguji', 'super_admin')),
    nama_lengkap VARCHAR(255) NOT NULL,
    no_hp VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. TABEL AUDIT LOG (Pencatatan Aksi Admin/Keuangan)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details_json TEXT NOT NULL,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 3. TABEL MASTER DATA (Program Studi, Jalur Masuk, Gelombang)
CREATE TABLE IF NOT EXISTS program_studi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_prodi VARCHAR(10) NOT NULL UNIQUE,
    nama_prodi VARCHAR(255) NOT NULL,
    jenjang VARCHAR(10) NOT NULL CHECK (jenjang IN ('S1', 'D3')),
    fakultas VARCHAR(255) NOT NULL,
    kode_fakultas VARCHAR(5) NOT NULL,
    passing_score DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    kuota INT NOT NULL DEFAULT 60,
    ukt_nominal BIGINT NOT NULL DEFAULT 6500000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jalur_masuk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_jalur VARCHAR(50) NOT NULL UNIQUE,
    nama_jalur VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    biaya_formulir BIGINT NOT NULL DEFAULT 250000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gelombang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_gelombang VARCHAR(255) NOT NULL,
    tgl_mulai TIMESTAMPTZ NOT NULL,
    tgl_selesai TIMESTAMPTZ NOT NULL,
    kuota INT NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL PENDAFTARAN MAHASISWA BARU
CREATE TABLE IF NOT EXISTS pendaftar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nomor_pendaftaran VARCHAR(50) NOT NULL UNIQUE,
    jalur_id UUID NOT NULL REFERENCES jalur_masuk(id),
    gelombang_id UUID NOT NULL REFERENCES gelombang(id),
    status_pendaftaran VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
        CHECK (status_pendaftaran IN ('DRAFT', 'SUBMITTED', 'BERKAS_VERIFIED', 'BERKAS_REVISION', 'LULUS', 'TIDAK_LULUS', 'CADANGAN', 'DAFTAR_ULANG_LUNAS')),
    nik VARCHAR(16) NOT NULL,
    tempat_lahir VARCHAR(100) NOT NULL,
    tgl_lahir DATE NOT NULL,
    jenis_kelamin VARCHAR(5) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    agama VARCHAR(50) NOT NULL,
    alamat_lengkap TEXT NOT NULL,
    nama_ortu VARCHAR(255) NOT NULL,
    no_hp_ortu VARCHAR(50) NOT NULL,
    asal_sekolah VARCHAR(255) NOT NULL,
    jurusan_sekolah VARCHAR(100) NOT NULL,
    nilai_rapor_avg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    prodi_pilihan_1 UUID NOT NULL REFERENCES program_studi(id),
    prodi_pilihan_2 UUID REFERENCES program_studi(id),
    catatan_verifikator TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pendaftar_nomor ON pendaftar(nomor_pendaftaran);
CREATE INDEX IF NOT EXISTS idx_pendaftar_user ON pendaftar(user_id);
CREATE INDEX IF NOT EXISTS idx_pendaftar_status ON pendaftar(status_pendaftaran);

-- 5. TABEL BERKAS PENDAFTAR
CREATE TABLE IF NOT EXISTS berkas_pendaftar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    jenis_berkas VARCHAR(50) NOT NULL
        CHECK (jenis_berkas IN ('PASFOTO', 'KTP_KARTU_PELAJAR', 'IJAZAH_SKL', 'KARTU_KELUARGA', 'RAPOR_PRESTASI')),
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status_verifikasi VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status_verifikasi IN ('PENDING', 'VALID', 'INVALID')),
    catatan TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_berkas_pendaftar_id ON berkas_pendaftar(pendaftar_id);

-- 6. TABEL VOUCHER & PEMBAYARAN
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_voucher VARCHAR(50) NOT NULL UNIQUE,
    tipe_diskon VARCHAR(20) NOT NULL CHECK (tipe_diskon IN ('PERCENT', 'NOMINAL')),
    nilai_diskon BIGINT NOT NULL,
    kuota INT NOT NULL DEFAULT 100,
    kuota_terpakai INT NOT NULL DEFAULT 0,
    tgl_kadaluarsa TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    nomor_tagihan VARCHAR(50) NOT NULL UNIQUE,
    jenis_tagihan VARCHAR(30) NOT NULL CHECK (jenis_tagihan IN ('FORMULIR', 'DAFTAR_ULANG')),
    nominal_asli BIGINT NOT NULL,
    diskon BIGINT NOT NULL DEFAULT 0,
    nominal_akhir BIGINT NOT NULL,
    voucher_id UUID REFERENCES vouchers(id),
    status_pembayaran VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status_pembayaran IN ('PENDING', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'KADALUARSA')),
    metode_pembayaran VARCHAR(30) NOT NULL CHECK (metode_pembayaran IN ('VIRTUAL_ACCOUNT', 'TRANSFER_MANUAL')),
    nomor_va VARCHAR(50),
    bukti_bayar_key VARCHAR(500),
    tgl_kadaluarsa TIMESTAMPTZ NOT NULL,
    tgl_bayar TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pembayaran_pendaftar ON pembayaran(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_status ON pembayaran(status_pembayaran);

-- 7. TABEL UJIAN CBT
CREATE TABLE IF NOT EXISTS ujian_cbt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    durasi_menit INT NOT NULL DEFAULT 60,
    passing_grade DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soal_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ujian_id UUID NOT NULL REFERENCES ujian_cbt(id) ON DELETE CASCADE,
    nomor_urut INT NOT NULL,
    pertanyaan TEXT NOT NULL,
    pilihan_a TEXT NOT NULL,
    pilihan_b TEXT NOT NULL,
    pilihan_c TEXT NOT NULL,
    pilihan_d TEXT NOT NULL,
    kunci_jawaban VARCHAR(5) NOT NULL CHECK (kunci_jawaban IN ('A', 'B', 'C', 'D')),
    bobot DOUBLE PRECISION NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS peserta_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    ujian_id UUID NOT NULL REFERENCES ujian_cbt(id),
    waktu_mulai TIMESTAMPTZ,
    waktu_selesai TIMESTAMPTZ,
    total_skor DOUBLE PRECISION,
    is_lulus BOOLEAN,
    jawaban_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peserta_ujian_pendaftar ON peserta_ujian(pendaftar_id);

-- 8. TABEL KELULUSAN & GENERATE NIM
CREATE TABLE IF NOT EXISTS hasil_kelulusan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL UNIQUE REFERENCES pendaftar(id) ON DELETE CASCADE,
    status_kelulusan VARCHAR(30) NOT NULL
        CHECK (status_kelulusan IN ('LULUS_PILIHAN_1', 'LULUS_PILIHAN_2', 'CADANGAN', 'TIDAK_LULUS')),
    prodi_diterima_id UUID REFERENCES program_studi(id),
    skor_akhir DOUBLE PRECISION NOT NULL,
    nim_resmi VARCHAR(20) UNIQUE,
    nomor_surat_loa VARCHAR(100) UNIQUE,
    tanggal_sk DATE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kelulusan_status ON hasil_kelulusan(status_kelulusan);

-- 9. TABEL CMS (Pengumuman, Informasi Beasiswa, FAQ)
CREATE TABLE IF NOT EXISTS cms_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(150) NOT NULL UNIQUE,
    judul VARCHAR(255) NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('PENGUMUMAN', 'BEASISWA', 'PANDUAN', 'FAQ')),
    ringkasan TEXT NOT NULL,
    konten TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_slug ON cms_posts(slug);
CREATE INDEX IF NOT EXISTS idx_cms_kategori ON cms_posts(kategori);

