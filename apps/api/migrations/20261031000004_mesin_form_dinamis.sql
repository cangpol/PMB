-- Migrasi 4: Mesin Form Dinamis PMB (Custom Field, Berkas, Langkah, dan Presigned Storage)
-- Universitas Pignatelli Triputra
-- Tanggal: 2026-10-31

-- 1. TABEL DEFINISI FIELD (Custom Field Biodata Calon Mahasiswa)
CREATE TABLE IF NOT EXISTS definisi_field (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jalur_id UUID REFERENCES jalur_masuk(id) ON DELETE CASCADE, -- NULL = berlaku untuk semua jalur
    kode_field VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    tipe_field VARCHAR(50) NOT NULL CHECK (tipe_field IN ('teks', 'angka', 'tanggal', 'pilihan', 'pilihan_ganda', 'textarea', 'wilayah')),
    placeholder VARCHAR(255),
    wajib BOOLEAN NOT NULL DEFAULT FALSE,
    opsi JSONB DEFAULT '[]'::jsonb, -- Array string atau object opsi pilihan
    aturan_validasi JSONB DEFAULT '{}'::jsonb, -- min, max, regex, format: nik/email/phone
    urutan INT NOT NULL DEFAULT 1,
    kelompok VARCHAR(100) NOT NULL DEFAULT 'DATA_PRIBADI', -- DATA_PRIBADI, DATA_ORANG_TUA, DATA_SEKOLAH, DATA_TAMBAHAN
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_definisi_field_jalur ON definisi_field(jalur_id);
CREATE INDEX IF NOT EXISTS idx_definisi_field_kelompok ON definisi_field(kelompok);
CREATE INDEX IF NOT EXISTS idx_definisi_field_urutan ON definisi_field(urutan ASC);

-- 2. TABEL DEFINISI BERKAS (Custom Persyaratan Berkas per Jalur Pendaftaran)
CREATE TABLE IF NOT EXISTS definisi_berkas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jalur_id UUID REFERENCES jalur_masuk(id) ON DELETE CASCADE, -- NULL = berlaku untuk semua jalur
    kode_berkas VARCHAR(100) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    wajib BOOLEAN NOT NULL DEFAULT TRUE,
    tipe_file VARCHAR(255) NOT NULL DEFAULT 'image/jpeg,image/png,application/pdf',
    ukuran_maks_kb INT NOT NULL DEFAULT 2048 CHECK (ukuran_maks_kb > 0),
    urutan INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_definisi_berkas_jalur ON definisi_berkas(jalur_id);
CREATE INDEX IF NOT EXISTS idx_definisi_berkas_urutan ON definisi_berkas(urutan ASC);

-- 3. TABEL DEFINISI LANGKAH (Alur Pendaftaran per Jalur)
CREATE TABLE IF NOT EXISTS definisi_langkah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jalur_id UUID REFERENCES jalur_masuk(id) ON DELETE CASCADE, -- NULL = berlaku untuk semua jalur
    kode_langkah VARCHAR(50) NOT NULL,
    judul_langkah VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    tipe_langkah VARCHAR(50) NOT NULL CHECK (tipe_langkah IN ('biodata', 'pilih_prodi', 'berkas', 'pembayaran', 'ujian', 'verifikasi')),
    urutan INT NOT NULL DEFAULT 1,
    wajib BOOLEAN NOT NULL DEFAULT TRUE,
    syarat_lanjut JSONB DEFAULT '{}'::jsonb, -- Syarat dependensi (misal: butuh_pembayaran_lunas, butuh_berkas_lengkap)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_definisi_langkah_jalur ON definisi_langkah(jalur_id);
CREATE INDEX IF NOT EXISTS idx_definisi_langkah_urutan ON definisi_langkah(urutan ASC);

-- 4. TABEL STATE LANGKAH PENDAFTAR (Tracking Progress Alur Pendaftar)
CREATE TABLE IF NOT EXISTS state_langkah_pendaftar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    langkah_id UUID NOT NULL REFERENCES definisi_langkah(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'BELUM_MULAI'
        CHECK (status IN ('BELUM_MULAI', 'SEDANG_DIISI', 'SELESAI', 'TERVERIFIKASI')),
    data_tambahan JSONB DEFAULT '{}'::jsonb,
    selesai_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pendaftar_langkah UNIQUE (pendaftar_id, langkah_id)
);

CREATE INDEX IF NOT EXISTS idx_state_langkah_pendaftar ON state_langkah_pendaftar(pendaftar_id);

-- 5. PERLUASAN TABEL PENDAFTAR (Penyimpanan JSONB untuk Jawaban Dinamis)
ALTER TABLE pendaftar ADD COLUMN IF NOT EXISTS data_formulir JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_pendaftar_data_formulir ON pendaftar USING gin (data_formulir);

-- 6. PERLUASAN TABEL BERKAS PENDAFTAR (Hubungkan ke Definisi Berkas & Status Terkini)
ALTER TABLE berkas_pendaftar ADD COLUMN IF NOT EXISTS definisi_berkas_id UUID REFERENCES definisi_berkas(id) ON DELETE SET NULL;
ALTER TABLE berkas_pendaftar ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Relaksasi check constraint status_verifikasi agar mendukung status DITERIMA dan DITOLAK
ALTER TABLE berkas_pendaftar DROP CONSTRAINT IF EXISTS berkas_pendaftar_status_verifikasi_check;
ALTER TABLE berkas_pendaftar ADD CONSTRAINT berkas_pendaftar_status_verifikasi_check 
    CHECK (status_verifikasi IN ('PENDING', 'VALID', 'INVALID', 'DITERIMA', 'DITOLAK'));

-- Relaksasi jenis_berkas agar bisa menerima kode berkas dinamis
ALTER TABLE berkas_pendaftar DROP CONSTRAINT IF EXISTS berkas_pendaftar_jenis_berkas_check;

CREATE INDEX IF NOT EXISTS idx_berkas_definisi ON berkas_pendaftar(definisi_berkas_id);

-- 7. SEED DATA DEFAULT UNTUK DEFINISI FIELD
INSERT INTO definisi_field (kode_field, label, tipe_field, placeholder, wajib, opsi, aturan_validasi, urutan, kelompok)
VALUES
-- Data Pribadi
('nik', 'Nomor Induk Kependudukan (NIK)', 'teks', '16 digit angka sesuai KTP/KK', TRUE, '[]'::jsonb, '{"format": "nik", "min": 16, "max": 16}'::jsonb, 1, 'DATA_PRIBADI'),
('nama_lengkap', 'Nama Lengkap (Sesuai Ijazah)', 'teks', 'Masukkan nama lengkap', TRUE, '[]'::jsonb, '{"min": 3, "max": 255}'::jsonb, 2, 'DATA_PRIBADI'),
('tempat_lahir', 'Tempat Lahir', 'teks', 'Kota/Kabupaten kelahiran', TRUE, '[]'::jsonb, '{"min": 2, "max": 100}'::jsonb, 3, 'DATA_PRIBADI'),
('tgl_lahir', 'Tanggal Lahir', 'tanggal', 'YYYY-MM-DD', TRUE, '[]'::jsonb, '{}'::jsonb, 4, 'DATA_PRIBADI'),
('jenis_kelamin', 'Jenis Kelamin', 'pilihan', 'Pilih jenis kelamin', TRUE, '["Laki-laki", "Perempuan"]'::jsonb, '{}'::jsonb, 5, 'DATA_PRIBADI'),
('agama', 'Agama', 'pilihan', 'Pilih agama', TRUE, '["Katolik", "Kristen Protestan", "Islam", "Hindu", "Buddha", "Konghucu", "Lainnya"]'::jsonb, '{}'::jsonb, 6, 'DATA_PRIBADI'),
('no_hp', 'Nomor WhatsApp / HP', 'teks', '08xxxxxxxxxx', TRUE, '[]'::jsonb, '{"format": "phone", "min": 10, "max": 15}'::jsonb, 7, 'DATA_PRIBADI'),
('alamat_ktp', 'Alamat Lengkap KTP', 'textarea', 'Jalan, RT/RW, Dusun/Kelurahan', TRUE, '[]'::jsonb, '{"min": 10, "max": 500}'::jsonb, 8, 'DATA_PRIBADI'),
('domisili_wilayah', 'Wilayah Domisili Saat Ini', 'wilayah', 'Pilih Provinsi & Kabupaten/Kota', TRUE, '[]'::jsonb, '{}'::jsonb, 9, 'DATA_PRIBADI'),

-- Data Orang Tua / Wali
('nama_ayah', 'Nama Lengkap Ayah', 'teks', 'Nama ayah kandung', TRUE, '[]'::jsonb, '{"min": 2, "max": 255}'::jsonb, 10, 'DATA_ORANG_TUA'),
('pekerjaan_ayah', 'Pekerjaan Ayah', 'pilihan', 'Pilih pekerjaan ayah', FALSE, '["PNS / TNI / POLRI", "Karyawan Swasta", "Wiraswasta", "Petani / Nelayan", "Pensiunan", "Lainnya"]'::jsonb, '{}'::jsonb, 11, 'DATA_ORANG_TUA'),
('nama_ibu', 'Nama Lengkap Ibu', 'teks', 'Nama ibu kandung', TRUE, '[]'::jsonb, '{"min": 2, "max": 255}'::jsonb, 12, 'DATA_ORANG_TUA'),
('pekerjaan_ibu', 'Pekerjaan Ibu', 'pilihan', 'Pilih pekerjaan ibu', FALSE, '["Ibu Rumah Tangga", "PNS / TNI / POLRI", "Karyawan Swasta", "Wiraswasta", "Petani / Nelayan", "Pensiunan", "Lainnya"]'::jsonb, '{}'::jsonb, 13, 'DATA_ORANG_TUA'),
('no_hp_ortu', 'Nomor Kontak Orang Tua / Wali', 'teks', '08xxxxxxxxxx', TRUE, '[]'::jsonb, '{"format": "phone", "min": 10, "max": 15}'::jsonb, 14, 'DATA_ORANG_TUA'),
('penghasilan_ortu', 'Penghasilan Gabungan Orang Tua', 'pilihan', 'Pilih kisaran penghasilan', FALSE, '["< Rp 2.000.000", "Rp 2.000.000 - Rp 5.000.000", "Rp 5.000.000 - Rp 10.000.000", "> Rp 10.000.000"]'::jsonb, '{}'::jsonb, 15, 'DATA_ORANG_TUA'),

-- Data Pendidikan Asal
('asal_sekolah', 'Nama Sekolah Asal (SMA/SMK/MA)', 'teks', 'Contoh: SMA Katolik Santo Yosef Surakarta', TRUE, '[]'::jsonb, '{"min": 3, "max": 255}'::jsonb, 16, 'DATA_SEKOLAH'),
('jurusan_sekolah', 'Jurusan Sekolah Asal', 'teks', 'Contoh: IPA, IPS, Rekayasa Perangkat Lunak', TRUE, '[]'::jsonb, '{"min": 2, "max": 100}'::jsonb, 17, 'DATA_SEKOLAH'),
('tahun_lulus', 'Tahun Kelulusan', 'angka', 'Contoh: 2026', TRUE, '[]'::jsonb, '{"min": 2000, "max": 2030}'::jsonb, 18, 'DATA_SEKOLAH'),
('nilai_rata_rata_rapor', 'Nilai Rata-rata Rapor (Skala 0-100)', 'angka', 'Contoh: 85.5', TRUE, '[]'::jsonb, '{"min": 0, "max": 100}'::jsonb, 19, 'DATA_SEKOLAH'),
('minat_ekskul', 'Minat & Bakat Ekstrakurikuler', 'pilihan_ganda', 'Pilih satu atau lebih minat', FALSE, '["Teknologi & Robotik", "Olahraga (Basket/Futsal/Voli)", "Seni Musik & Tari", "Debat & Bahasa Asing", "Kepemimpinan / Organisasi", "Kewirausahaan"]'::jsonb, '{}'::jsonb, 20, 'DATA_SEKOLAH')
ON CONFLICT DO NOTHING;

-- 8. SEED DATA DEFAULT DEFINISI BERKAS
INSERT INTO definisi_berkas (kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan)
VALUES
('PASFOTO', 'Pasfoto Berwarna Formal (Latar Merah/Biru/Putih)', 'Format JPG/PNG, pakaian formal rapi, wajah tampak jelas.', TRUE, 'image/jpeg,image/png', 2048, 1),
('KTP_KK', 'KTP atau Kartu Keluarga (KK) Asli', 'Scan/Foto jelas KTP calon mahasiswa atau Kartu Keluarga.', TRUE, 'image/jpeg,image/png,application/pdf', 3072, 2),
('IJAZAH_SKL', 'Ijazah atau Surat Keterangan Lulus (SKL)', 'Legalisir ijazah atau surat keterangan aktif/lulus dari sekolah.', TRUE, 'image/jpeg,image/png,application/pdf', 5120, 3),
('RAPOR_SEMESTER', 'Buku Rapor Semester 1 - 5', 'Wajib untuk jalur prestasi rapor/nilai.', FALSE, 'application/pdf', 5120, 4),
('SERTIFIKAT_PRESTASI', 'Sertifikat Prestasi Kejuaraan / Sertifikat Kompetensi', 'Sertifikat akademik/non-akademik tingkat kota/provinsi/nasional.', FALSE, 'image/jpeg,image/png,application/pdf', 5120, 5)
ON CONFLICT DO NOTHING;

-- 9. SEED DATA DEFAULT DEFINISI LANGKAH
INSERT INTO definisi_langkah (kode_langkah, judul_langkah, deskripsi, tipe_langkah, urutan, wajib, syarat_lanjut)
VALUES
('pilih_prodi', 'Pilih Program Studi & Jalur', 'Menentukan program studi pilihan 1 dan 2 serta jalur penerimaan.', 'pilih_prodi', 1, TRUE, '{}'::jsonb),
('biodata', 'Pengisian Biodata Lengkap', 'Mengisi data diri, kontak, data orang tua, dan riwayat sekolah.', 'biodata', 2, TRUE, '{"butuh_langkah": ["pilih_prodi"]}'::jsonb),
('berkas', 'Unggah Dokumen Persyaratan', 'Mengunggah pasfoto, identitas diri, dan berkas akademik.', 'berkas', 3, TRUE, '{"butuh_langkah": ["biodata"]}'::jsonb),
('pembayaran', 'Pembayaran Biaya Formulir', 'Melunasi tagihan biaya pendaftaran PMB.', 'pembayaran', 4, TRUE, '{"butuh_langkah": ["berkas"]}'::jsonb),
('ujian', 'Ujian Seleksi Masuk / CBT', 'Mengerjakan tes potensi akademik & kemampuan dasar secara daring.', 'ujian', 5, FALSE, '{"butuh_pembayaran_lunas": true}'::jsonb),
('verifikasi', 'Verifikasi & Pengumuman Kelulusan', 'Panitia memverifikasi seluruh data dan menerbitkan pengumuman.', 'verifikasi', 6, TRUE, '{"butuh_langkah": ["pembayaran"]}'::jsonb)
ON CONFLICT DO NOTHING;

