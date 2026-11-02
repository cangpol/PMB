-- Migrasi 11: Revisi Fakultas dan Program Studi (Struktur Resmi UPITRA)
-- Tanggal: 2026-11-02
-- Menambahkan kolom metadata kurikulum, akreditasi, dan biaya pada fakultas dan program studi
-- Struktur final: 4 Fakultas dan 10 Program Studi (9 S1, 1 D3)

-- ============================================================================
-- 1. Perluas Tabel Fakultas
-- ============================================================================
ALTER TABLE fakultas ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE fakultas ADD COLUMN IF NOT EXISTS deskripsi_singkat TEXT;
ALTER TABLE fakultas ADD COLUMN IF NOT EXISTS urutan_tampil INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fakultas_slug ON fakultas(slug);
CREATE INDEX IF NOT EXISTS idx_fakultas_urutan ON fakultas(urutan_tampil);

-- ============================================================================
-- 2. Perluas Tabel Program Studi
-- ============================================================================
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS kode_singkat VARCHAR(20);
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS gelar VARCHAR(100);
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS lama_studi_semester INT DEFAULT 8;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS akreditasi VARCHAR(255);
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS deskripsi_singkat TEXT;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS tentang_prodi TEXT;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS kompetensi_lulusan TEXT[] DEFAULT '{}';
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS prospek_karier TEXT[] DEFAULT '{}';
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS fasilitas TEXT[] DEFAULT '{}';
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS passing_grade DOUBLE PRECISION;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS daya_tampung INT;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS biaya_ukt_min BIGINT;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS biaya_ukt_maks BIGINT;
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS urutan_tampil INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_program_studi_slug ON program_studi(slug);
CREATE INDEX IF NOT EXISTS idx_program_studi_urutan ON program_studi(urutan_tampil);

-- ============================================================================
-- 3. Sinkronisasi Data 4 Fakultas Resmi
-- ============================================================================
-- 1) Fakultas Sains & Teknologi (FST)
INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
VALUES (
    'FST',
    'Fakultas Sains & Teknologi',
    'sains-teknologi',
    'Pengembangan kompetensi rekayasa perangkat lunak, sistem informasi industri, dan komputasi cerdas.',
    '[DRAF - verifikasi kampus] Fakultas Sains & Teknologi Universitas Pignatelli Triputra menyelenggarakan pendidikan terapan di bidang sains komputer dan informatika.',
    1,
    TRUE
)
ON CONFLICT (kode_fakultas) DO UPDATE SET
    nama_fakultas = EXCLUDED.nama_fakultas,
    slug = EXCLUDED.slug,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    urutan_tampil = EXCLUDED.urutan_tampil;

-- 2) Fakultas Ekonomika Bisnis (FEB)
INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
VALUES (
    'FEB',
    'Fakultas Ekonomika Bisnis',
    'ekonomika-bisnis',
    'Pusat keunggulan ilmu manajemen bisnis, tata kelola korporasi, dan audit akuntansi profesional.',
    '[DRAF - verifikasi kampus] Fakultas Ekonomika Bisnis menghasilkan praktisi bisnis dan akuntan berintegritas tinggi dengan wawasan rantai nilai industri.',
    2,
    TRUE
)
ON CONFLICT (kode_fakultas) DO UPDATE SET
    nama_fakultas = EXCLUDED.nama_fakultas,
    slug = EXCLUDED.slug,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    urutan_tampil = EXCLUDED.urutan_tampil;

-- 3) Fakultas Sosial Humaniora (FSH)
INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
VALUES (
    'FSH',
    'Fakultas Sosial Humaniora',
    'sosial-humaniora',
    'Pendidikan pariwisata strategis, komunikasi lintas budaya, dan literasi bahasa Inggris terapan.',
    '[DRAF - verifikasi kampus] Fakultas Sosial Humaniora berfokus pada hospitalitas pariwisata dan komunikasi bisnis internasional.',
    3,
    TRUE
)
ON CONFLICT (kode_fakultas) DO UPDATE SET
    nama_fakultas = EXCLUDED.nama_fakultas,
    slug = EXCLUDED.slug,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    urutan_tampil = EXCLUDED.urutan_tampil;

-- 4) Fakultas Kesehatan (FKES)
INSERT INTO fakultas (kode_fakultas, nama_fakultas, slug, deskripsi_singkat, deskripsi, urutan_tampil, is_active)
VALUES (
    'FKES',
    'Fakultas Kesehatan',
    'kesehatan',
    'Pendidikan tenaga kesehatan profesional berfokus pada keselamatan kerja, fisioterapi, dan keperawatan.',
    '[DRAF - verifikasi kampus] Fakultas Kesehatan membekali calon praktisi kesehatan dengan standar keselamatan kerja industri dan pelayanan medis terpadu.',
    4,
    TRUE
)
ON CONFLICT (kode_fakultas) DO UPDATE SET
    nama_fakultas = EXCLUDED.nama_fakultas,
    slug = EXCLUDED.slug,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    urutan_tampil = EXCLUDED.urutan_tampil;

-- ============================================================================
-- 4. Sinkronisasi Data 10 Program Studi Resmi
-- ============================================================================
-- Hapus / perbarui prodi lama non-resmi agar tidak ada konflik
-- Jika ada prodi lama "Akuntansi Bisnis" / "Akuntansi Bisnis Digital", perbarui menjadi "Akuntansi"
UPDATE program_studi
SET
    kode_prodi = 'AKT',
    kode_singkat = 'AKT',
    nama_prodi = 'Akuntansi',
    jenjang = 'S1',
    slug = 's1-akuntansi',
    fakultas = 'Fakultas Ekonomika Bisnis',
    kode_fakultas = 'FEB',
    fakultas_id = (SELECT id FROM fakultas WHERE kode_fakultas = 'FEB'),
    gelar = 'S.Ak.',
    lama_studi_semester = 8,
    deskripsi_singkat = '[DRAF - verifikasi kampus] Mempelajari akuntansi keuangan, audit, sistem informasi akuntansi, dan perpajakan korporasi.',
    tentang_prodi = '[DRAF - verifikasi kampus] Program Studi S1 Akuntansi membekali mahasiswa dengan keahlian pelaporan keuangan terstandar, audit forensik, dan perpajakan modern.',
    kompetensi_lulusan = ARRAY['Pelaporan Keuangan Korporat', 'Audit Finansial & Forensik', 'Analisis Perpajakan', 'Sistem Informasi Akuntansi'],
    prospek_karier = ARRAY['Auditor Internal/Eksternal', 'Akuntan Manajemen', 'Konsultan Pajak', 'Financial Analyst'],
    fasilitas = ARRAY['Laboratorium Akuntansi Komputasi', 'Studio Simulasi Audit & Pajak'],
    daya_tampung = 60,
    biaya_ukt_min = 6000000,
    biaya_ukt_maks = 6000000,
    urutan_tampil = 5,
    is_active = TRUE
WHERE kode_prodi = 'AKT-01' OR kode_prodi = 'AKT' OR nama_prodi ILIKE '%Akuntansi%';

-- Pindahkan referensi pendaftar dari prodi contoh (IF-02, SI-01) ke prodi resmi (IF, SI)
UPDATE pendaftar SET prodi_pilihan_1 = (SELECT id FROM program_studi WHERE kode_prodi = 'IF') WHERE prodi_pilihan_1 IN (SELECT id FROM program_studi WHERE kode_prodi = 'IF-02');
UPDATE pendaftar SET prodi_pilihan_2 = (SELECT id FROM program_studi WHERE kode_prodi = 'IF') WHERE prodi_pilihan_2 IN (SELECT id FROM program_studi WHERE kode_prodi = 'IF-02');
UPDATE pendaftar SET prodi_pilihan_1 = (SELECT id FROM program_studi WHERE kode_prodi = 'SI') WHERE prodi_pilihan_1 IN (SELECT id FROM program_studi WHERE kode_prodi = 'SI-01');
UPDATE pendaftar SET prodi_pilihan_2 = (SELECT id FROM program_studi WHERE kode_prodi = 'SI') WHERE prodi_pilihan_2 IN (SELECT id FROM program_studi WHERE kode_prodi = 'SI-01');

-- Hapus kuota dan data prodi contoh lama agar tepat tersisa 10 program studi resmi
DELETE FROM kuota_prodi_gelombang WHERE prodi_id IN (SELECT id FROM program_studi WHERE kode_prodi IN ('IF-02', 'SI-01', 'MNJ-01'));
DELETE FROM program_studi WHERE kode_prodi IN ('IF-02', 'SI-01', 'MNJ-01');

-- ============================================================================
-- Masukkan / Perbarui 10 Program Studi
-- ============================================================================

-- 1. S1 Informatika (FST) - Nilai daya tampung dan biaya DIPERTAHANKAN (100 / Rp 7.000.000)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'IF', 'IF', 'Informatika', 'S1', 's1-informatika', 'Fakultas Sains & Teknologi', 'FST',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FST'),
    'S.Kom.', 8, 'Baik Sekali (BAN-PT)',
    '[DRAF - verifikasi kampus] Fokus pada rekayasa perangkat lunak, kecerdasan buatan, komputasi awan, dan arsitektur sistem terdistribusi.',
    '[DRAF - verifikasi kampus] Program Studi S1 Informatika menghasilkan lulusan yang kompeten dalam merancang, membangun, dan mengelola solusi perangkat lunak skala enterprise.',
    ARRAY['Rekayasa Perangkat Lunak', 'Kecerdasan Buatan & Data Science', 'Cloud Computing & DevOps', 'Keamanan Siber'],
    ARRAY['Full-Stack Developer', 'AI / ML Engineer', 'Cloud Architect', 'Cybersecurity Specialist'],
    ARRAY['Laboratorium Komputasi & Jaringan', 'Studio Riset Kecerdasan Buatan', 'Server Pembelajaran Cloud'],
    75.0, 75.0, 100, 100, 7000000, 7000000, 7000000, 1, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    kode_singkat = EXCLUDED.kode_singkat,
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    gelar = EXCLUDED.gelar,
    lama_studi_semester = EXCLUDED.lama_studi_semester,
    akreditasi = EXCLUDED.akreditasi,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    tentang_prodi = EXCLUDED.tentang_prodi,
    kompetensi_lulusan = EXCLUDED.kompetensi_lulusan,
    prospek_karier = EXCLUDED.prospek_karier,
    fasilitas = EXCLUDED.fasilitas,
    daya_tampung = 100,
    biaya_ukt_min = 7000000,
    biaya_ukt_maks = 7000000,
    urutan_tampil = 1;

-- 2. S1 Sistem Informasi (FST) - Nilai daya tampung dan biaya DIPERTAHANKAN (80 / Rp 6.500.000)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'SI', 'SI', 'Sistem Informasi', 'S1', 's1-sistem-informasi', 'Fakultas Sains & Teknologi', 'FST',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FST'),
    'S.Kom.', 8, 'Baik Sekali (BAN-PT)',
    '[DRAF - verifikasi kampus] Integrasi proses bisnis dengan teknologi informasi enterprise, tata kelola data, dan sistem informasi manajemen.',
    '[DRAF - verifikasi kampus] Program Studi S1 Sistem Informasi menjembatani kebutuhan proses bisnis industri dengan solusi teknologi informasi yang terstruktur.',
    ARRAY['Analisis Sistem Bisnis', 'Tata Kelola TI Enterprise', 'Manajemen Basis Data & BI', 'Manajemen Proyek Perangkat Lunak'],
    ARRAY['IT Business Analyst', 'ERP / CRM Consultant', 'Database Administrator', 'IT Project Manager'],
    ARRAY['Laboratorium Enterprise Architecture', 'Studio Analisis Data & BI'],
    70.0, 70.0, 80, 80, 6500000, 6500000, 6500000, 2, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    kode_singkat = EXCLUDED.kode_singkat,
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    gelar = EXCLUDED.gelar,
    lama_studi_semester = EXCLUDED.lama_studi_semester,
    akreditasi = EXCLUDED.akreditasi,
    deskripsi_singkat = EXCLUDED.deskripsi_singkat,
    tentang_prodi = EXCLUDED.tentang_prodi,
    kompetensi_lulusan = EXCLUDED.kompetensi_lulusan,
    prospek_karier = EXCLUDED.prospek_karier,
    fasilitas = EXCLUDED.fasilitas,
    daya_tampung = 80,
    biaya_ukt_min = 6500000,
    biaya_ukt_maks = 6500000,
    urutan_tampil = 2;

-- 3. S1 Software Engineering (FST) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'SE', 'SE', 'Software Engineering', 'S1', 's1-software-engineering', 'Fakultas Sains & Teknologi', 'FST',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FST'),
    'S.Kom.', 8, NULL,
    '[DRAF - verifikasi kampus] Disiplin rekayasa perangkat lunak terapan, pengujian kualitas (QA), dan metodologi continuous deployment industri.',
    '[DRAF - verifikasi kampus] Program Studi S1 Software Engineering mendalami metodologi pengembangan perangkat lunak modern dari tahap perancangan arsitektur hingga deployment.',
    ARRAY['Software Architecture', 'Quality Assurance & Automated Testing', 'CI/CD & DevOps Pipeline', 'Mobile Application Development'],
    ARRAY['Software QA Engineer', 'DevOps Specialist', 'Mobile App Developer', 'Systems Engineer'],
    ARRAY['Laboratorium Rekayasa Perangkat Lunak', 'Studio Testing & QA Otomatis'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 3, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 3;

-- 4. S1 Manajemen (FEB) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'MNJ', 'MNJ', 'Manajemen', 'S1', 's1-manajemen', 'Fakultas Ekonomika Bisnis', 'FEB',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FEB'),
    'S.M.', 8, NULL,
    '[DRAF - verifikasi kampus] Manajemen operasional bisnis, rantai pasok, kepemimpinan organisasi, dan strategi pemasaran modern.',
    '[DRAF - verifikasi kampus] Program Studi S1 Manajemen membentuk calon pemimpin bisnis yang memiliki kecakapan analitis dan manajerial pada berbagai sektor industri.',
    ARRAY['Manajemen Strategis', 'Manajemen Operasional & Rantai Pasok', 'Pemasaran Digital', 'Manajemen Keuangan Korporasi'],
    ARRAY['Operations Specialist', 'Marketing Strategist', 'Supply Chain Analyst', 'Business Development Officer'],
    ARRAY['Laboratorium Manajemen Simulasi Bisnis', 'Studio Inkubasi Bisnis'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 4, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 4;

-- 5. S1 Akuntansi (FEB) - Nilai daya tampung dan biaya DIPERTAHANKAN (60 / Rp 6.000.000)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'AKT', 'AKT', 'Akuntansi', 'S1', 's1-akuntansi', 'Fakultas Ekonomika Bisnis', 'FEB',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FEB'),
    'S.Ak.', 8, 'Baik (BAN-PT)',
    '[DRAF - verifikasi kampus] Tata kelola pelaporan keuangan, audit profesional, sistem informasi akuntansi, dan perencanaan pajak.',
    '[DRAF - verifikasi kampus] Program Studi S1 Akuntansi menghasilkan sarjana akuntansi yang memiliki kompetensi teknis pencatatan, pemeriksaan keuangan, dan konsultasi perpajakan.',
    ARRAY['Akuntansi Keuangan & Pelaporan', 'Audit & Assurance', 'Perpajakan', 'Analisis Data Akuntansi'],
    ARRAY['Auditor', 'Akuntan Keuangan', 'Konsultan Pajak', 'Budget Analyst'],
    ARRAY['Laboratorium Akuntansi & Simulasi Perpajakan', 'Pojok Analisis Finansial'],
    70.0, 70.0, 60, 60, 6000000, 6000000, 6000000, 5, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    daya_tampung = 60,
    biaya_ukt_min = 6000000,
    biaya_ukt_maks = 6000000,
    urutan_tampil = 5;

-- 6. S1 Pariwisata (FSH) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'PAR', 'PAR', 'Pariwisata', 'S1', 's1-pariwisata', 'Fakultas Sosial Humaniora', 'FSH',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FSH'),
    'S.Par.', 8, NULL,
    '[DRAF - verifikasi kampus] Manajemen destinasi wisata, industri perhotelan dan hospitalitas, event management, dan pariwisata berkelanjutan.',
    '[DRAF - verifikasi kampus] Program Studi S1 Pariwisata menyiapkan profesional dan wirausahawan bidang hospitalitas dan pengelolaan destinasi wisata modern.',
    ARRAY['Pengelolaan Destinasi Wisata', 'Manajemen Perhotelan & Resor', 'Penyelenggaraan MICE (Event)', 'Kewirausahaan Pariwisata'],
    ARRAY['Tourism Destination Planner', 'Hospitality & Resort Manager', 'Event & MICE Specialist', 'Travel Consultant'],
    ARRAY['Laboratorium Simulasi Front Office & Hospitality', 'Studio Perencanaan Destinasi'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 6, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 6;

-- 7. S1 Bahasa Inggris (FSH) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'BIG', 'BIG', 'Bahasa Inggris', 'S1', 's1-bahasa-inggris', 'Fakultas Sosial Humaniora', 'FSH',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FSH'),
    'S.Li.', 8, NULL,
    '[DRAF - verifikasi kampus] Linguistik terapan, komunikasi bisnis internasional, penerjemahan dokumen korporat, dan pengajaran bahasa.',
    '[DRAF - verifikasi kampus] Program Studi S1 Bahasa Inggris menekankan penguasaan komunikasi bahasa Inggris praktis di dunia bisnis, diplomasi, dan media.',
    ARRAY['Komunikasi Bisnis Internasional', 'Penerjemahan & Lokalisasi', 'Linguistik Terapan Korporasi', 'Public Speaking & Media Relations'],
    ARRAY['Corporate Communications Officer', 'Penerjemah Profesional', 'Copywriter / Content Creator', 'Pengajar Bahasa Inggris Industri'],
    ARRAY['Laboratorium Bahasa & Multimedia', 'Studio Praktik Penerjemahan Simultan'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 7, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 7;

-- 8. S1 Keselamatan dan Kesehatan Kerja (K3) (FKES) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'K3', 'K3', 'Keselamatan dan Kesehatan Kerja (K3)', 'S1', 's1-k3', 'Fakultas Kesehatan', 'FKES',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FKES'),
    'S.K.K.K.', 8, NULL,
    '[DRAF - verifikasi kampus] Manajemen risiko kecelakaan kerja, higiene industri, ergonomi, audit keselamatan dan regulasi SMK3.',
    '[DRAF - verifikasi kampus] Program Studi S1 K3 mendidik ahli keselamatan kerja yang mampu merancang dan menegakkan sistem keselamatan lingkungan kerja industri.',
    ARRAY['Identifikasi Bahaya & Penilaian Risiko (HIRADC)', 'Audit SMK3 & ISO 45001', 'Higiene Industri & Toksikologi', 'Ergonomi Kerja'],
    ARRAY['HSE (Health, Safety, Environment) Officer', 'Auditor SMK3', 'Industrial Hygiene Specialist', 'Konsultan K3 Lingkungan Kerja'],
    ARRAY['Laboratorium Pengukuran Higiene Industri', 'Studio Simulasi Ergonomi & Tanggap Darurat'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 8, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 8;

-- 9. S1 Fisioterapi (FKES) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'FIS', 'FIS', 'Fisioterapi', 'S1', 's1-fisioterapi', 'Fakultas Kesehatan', 'FKES',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FKES'),
    'S.Ftr.', 8, NULL,
    '[DRAF - verifikasi kampus] Pemulihan gerak dan fungsi tubuh, fisioterapi muskuloskeletal, olahraga, rehabilitasi medik dan neurologi.',
    '[DRAF - verifikasi kampus] Program Studi S1 Fisioterapi membina tenaga profesional dalam diagnosis fungsional dan terapi rehabilitasi gerak tubuh manusia.',
    ARRAY['Fisioterapi Muskuloskeletal & Olahraga', 'Rehabilitasi Neurologi & Pediatri', 'Ergonomi Fungsional', 'Elektroterapi & Manual Therapy'],
    ARRAY['Fisioterapis Rumah Sakit / Klinik', 'Fisioterapis Klub Olahraga', 'Konsultan Rehabilitasi Fisik', 'Praktisi Wellness & Kebugaran'],
    ARRAY['Laboratorium Kinesioterapi & Elektroterapi', 'Studio Rehabilitasi Medik'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 9, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 9;

-- 10. D3 Keperawatan (FKES) - Jenjang D3 Vokasi (6 semester) - Daya tampung & biaya = NULL (Segera diumumkan)
INSERT INTO program_studi (
    kode_prodi, kode_singkat, nama_prodi, jenjang, slug, fakultas, kode_fakultas, fakultas_id,
    gelar, lama_studi_semester, akreditasi, deskripsi_singkat, tentang_prodi,
    kompetensi_lulusan, prospek_karier, fasilitas, passing_score, passing_grade,
    kuota, daya_tampung, ukt_nominal, biaya_ukt_min, biaya_ukt_maks, urutan_tampil, is_active
) VALUES (
    'KEP', 'KEP', 'Keperawatan', 'D3', 'd3-keperawatan', 'Fakultas Kesehatan', 'FKES',
    (SELECT id FROM fakultas WHERE kode_fakultas = 'FKES'),
    'A.Md.Kep.', 6, NULL,
    '[DRAF - verifikasi kampus] Asuhan keperawatan terapan, kegawatdaruratan, keperawatan medikal bedah, dan etika profesi keperawatan.',
    '[DRAF - verifikasi kampus] Program Vokasi D3 Keperawatan melatih perawat terampil siap kerja dengan etos pengabdian dan kemahiran asuhan keperawatan klinis.',
    ARRAY['Asuhan Keperawatan Dasar & Lanjutan', 'Tindakan Keperawatan Gawat Darurat', 'Prosedur Medikal Bedah', 'Dokumentasi & Etika Klinis'],
    ARRAY['Perawat Pelaksana Rumah Sakit', 'Perawat Klinik / Puskesmas', 'Perawat Kesehatan Kerja (K3) Perusahaan', 'Home Care Nurse'],
    ARRAY['Laboratorium Keperawatan Medikal Bedah', 'Studio Simulasi Gawat Darurat & Resusitasi'],
    65.0, NULL, 0, NULL, 0, NULL, NULL, 10, TRUE
)
ON CONFLICT (kode_prodi) DO UPDATE SET
    nama_prodi = EXCLUDED.nama_prodi,
    slug = EXCLUDED.slug,
    fakultas = EXCLUDED.fakultas,
    kode_fakultas = EXCLUDED.kode_fakultas,
    fakultas_id = EXCLUDED.fakultas_id,
    urutan_tampil = 10;

-- ============================================================================
-- Pastikan relasi prodi ke fakultas_id terisi dengan benar untuk semua prodi
-- ============================================================================
UPDATE program_studi
SET fakultas_id = f.id
FROM fakultas f
WHERE program_studi.kode_fakultas = f.kode_fakultas
  AND (program_studi.fakultas_id IS NULL OR program_studi.fakultas_id != f.id);
