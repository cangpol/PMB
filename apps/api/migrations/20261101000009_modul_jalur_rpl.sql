-- ==============================================================================
-- Migrasi: 20261101000009_modul_jalur_rpl.sql
-- Modul Jalur RPL (Rekognisi Pembelajaran Lampau)
-- ==============================================================================

-- 1. Perbarui check constraint pada definisi_langkah agar mendukung tipe_langkah 'rpl'
ALTER TABLE definisi_langkah DROP CONSTRAINT IF EXISTS definisi_langkah_tipe_langkah_check;
ALTER TABLE definisi_langkah ADD CONSTRAINT definisi_langkah_tipe_langkah_check 
    CHECK (tipe_langkah IN ('biodata', 'pilih_prodi', 'berkas', 'pembayaran', 'ujian', 'verifikasi', 'rpl'));

-- 2. Master Mata Kuliah Kurikulum Prodi untuk Rekognisi RPL
CREATE TABLE IF NOT EXISTS mata_kuliah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prodi_id UUID NOT NULL REFERENCES program_studi(id) ON DELETE CASCADE,
    kode_mk VARCHAR(30) NOT NULL,
    nama_mk VARCHAR(150) NOT NULL,
    sks INT NOT NULL CHECK (sks > 0),
    semester INT NOT NULL DEFAULT 1 CHECK (semester >= 1 AND semester <= 8),
    silabus_ringkas TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prodi_kode_mk UNIQUE (prodi_id, kode_mk)
);

CREATE INDEX IF NOT EXISTS idx_mata_kuliah_prodi ON mata_kuliah(prodi_id);

-- 3. Permohonan Asesmen RPL Calon Mahasiswa
CREATE TABLE IF NOT EXISTS rpl_permohonan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE UNIQUE,
    tipe_rpl VARCHAR(20) NOT NULL DEFAULT 'TIPE_A', -- 'TIPE_A' (Perolehan SKS/Pengalaman Kerja), 'TIPE_B' (Transfer SKS/Alih Jenjang)
    riwayat_pendidikan JSONB NOT NULL DEFAULT '[]'::jsonb,
    pengalaman_kerja JSONB NOT NULL DEFAULT '[]'::jsonb,
    berkas_pendukung JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'DIAJUKAN', 'DALAM_PENILAIAN', 'SELESAI_DINILAI', 'DISETUJUI')),
    asesor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    catatan_asesor TEXT,
    catatan_admin TEXT,
    total_sks_diajukan INT NOT NULL DEFAULT 0,
    total_sks_diakui INT NOT NULL DEFAULT 0,
    ipk_konversi NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    persentase_rekognisi NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    submitted_at TIMESTAMPTZ,
    assessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpl_permohonan_pendaftar ON rpl_permohonan(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_rpl_permohonan_asesor ON rpl_permohonan(asesor_id);
CREATE INDEX IF NOT EXISTS idx_rpl_permohonan_status ON rpl_permohonan(status);

-- 4. Mata Kuliah yang Diajukan dalam Permohonan RPL
CREATE TABLE IF NOT EXISTS rpl_mata_kuliah_diajukan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permohonan_id UUID NOT NULL REFERENCES rpl_permohonan(id) ON DELETE CASCADE,
    mata_kuliah_id UUID NOT NULL REFERENCES mata_kuliah(id) ON DELETE CASCADE,
    keterangan_pemohon TEXT,
    status_kelayakan VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU'
        CHECK (status_kelayakan IN ('MENUNGGU', 'DIAKUI', 'DITOLAK')),
    nilai_transfer VARCHAR(5), -- Misal: 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'
    bobot_nilai NUMERIC(3, 2), -- Misal: 4.0, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0
    catatan_asesor TEXT,
    assessed_at TIMESTAMPTZ,
    assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permohonan_mk UNIQUE (permohonan_id, mata_kuliah_id)
);

CREATE INDEX IF NOT EXISTS idx_rpl_diajukan_permohonan ON rpl_mata_kuliah_diajukan(permohonan_id);

-- 5. Seeding Mata Kuliah Kurikulum RPL Awal untuk Program Studi
INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF101', 'Algoritma & Pemrograman Dasar', 3, 1, 'Konsep algoritma, struktur kontrol logika, fungsi, dan dasar pemrograman modern'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF201', 'Struktur Data & Analisis Algoritma', 3, 2, 'Array, linked list, stack, queue, pohon (tree), graf, dan kompleksitas Big-O'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF301', 'Sistem Manajemen Basis Data', 3, 3, 'Perancangan ERD, normalisasi, kueri SQL relasional, transaksi ACID, dan NoSQL'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF401', 'Rekayasa Perangkat Lunak', 3, 4, 'SDLC, Agile Scrum, arsitektur software, pengujian mutu, dan desain sistem modular'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF501', 'Jaringan Komputer & Keamanan Siber', 3, 5, 'Protokol TCP/IP, routing, switching, kriptografi dasar, dan arsitektur firewall'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'IF601', 'Pengembangan Aplikasi Web Terdistribusi', 3, 6, 'Frontend SPA modern, arsitektur REST API, microservices, dan containerisasi'
FROM program_studi WHERE kode_prodi = 'IF-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'AKT101', 'Pengantar Akuntansi & Bisnis', 3, 1, 'Siklus akuntansi jasa dan dagang, jurnal penyesuaian, dan laporan keuangan dasar'
FROM program_studi WHERE kode_prodi = 'AKT-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'AKT201', 'Akuntansi Keuangan Menengah', 3, 3, 'Standar PSAK, pengakuan aset lancar, liabilitas jangka panjang, dan ekuitas'
FROM program_studi WHERE kode_prodi = 'AKT-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT id, 'MNJ101', 'Dasar-Dasar Manajemen Pemasaran', 3, 1, 'Bauran pemasaran 4P, analisis perilaku konsumen, dan riset pasar industri'
FROM program_studi WHERE kode_prodi = 'MNJ-01'
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

-- 6. Daftarkan Langkah Alur RPL Otomatis ke Definisi Langkah untuk Jalur RPL
INSERT INTO definisi_langkah (jalur_id, kode_langkah, judul_langkah, deskripsi, tipe_langkah, urutan, wajib, syarat_lanjut)
SELECT id, 'LANGKAH_RPL', 'Asesmen & Portofolio RPL', 'Pengisian riwayat pengalaman, pengunggahan dokumen portofolio, dan pengajuan konversi SKS mata kuliah', 'rpl', 3, TRUE, '{"butuh_pembayaran_lunas": true}'::jsonb
FROM jalur_masuk WHERE kode_jalur = 'JALUR-RPL'
ON CONFLICT DO NOTHING;

