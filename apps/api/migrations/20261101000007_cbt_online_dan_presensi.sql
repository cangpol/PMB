-- =========================================================================
-- Migrasi: Modul CBT PMB Online dan Presensi
-- Versi: 20261101000007
-- =========================================================================

-- 1. TABEL BANK SOAL
CREATE TABLE IF NOT EXISTS bank_soal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori VARCHAR(100) NOT NULL, -- 'Penalaran Umum', 'Matematika Dasar', 'Bahasa Inggris', 'Kemampuan Skolastik'
    tingkat_kesulitan VARCHAR(20) NOT NULL DEFAULT 'SEDANG', -- 'MUDAH', 'SEDANG', 'SULIT'
    pertanyaan TEXT NOT NULL,
    gambar_url VARCHAR(500),
    opsi_jawaban JSONB NOT NULL, -- Array of objects: [{"label":"A","teks":"..."},{"label":"B","teks":"..."},...]
    kunci_jawaban VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    bobot DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    pembahasan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_soal_kategori ON bank_soal(kategori);
CREATE INDEX IF NOT EXISTS idx_bank_soal_kesulitan ON bank_soal(tingkat_kesulitan);
CREATE INDEX IF NOT EXISTS idx_bank_soal_active ON bank_soal(is_active);

-- 2. TABEL PAKET UJIAN
CREATE TABLE IF NOT EXISTS paket_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_paket VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    durasi_menit INT NOT NULL DEFAULT 60,
    passing_grade DOUBLE PRECISION NOT NULL DEFAULT 65.0,
    total_soal INT NOT NULL DEFAULT 0,
    acak_soal BOOLEAN NOT NULL DEFAULT true,
    acak_opsi BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL RELASI PAKET DAN BANK SOAL
CREATE TABLE IF NOT EXISTS paket_ujian_soal (
    paket_id UUID NOT NULL REFERENCES paket_ujian(id) ON DELETE CASCADE,
    soal_id UUID NOT NULL REFERENCES bank_soal(id) ON DELETE CASCADE,
    urutan INT NOT NULL DEFAULT 1,
    PRIMARY KEY (paket_id, soal_id)
);

CREATE INDEX IF NOT EXISTS idx_paket_soal_paket ON paket_ujian_soal(paket_id);
CREATE INDEX IF NOT EXISTS idx_paket_soal_soal ON paket_ujian_soal(soal_id);

-- 4. TABEL SESI UJIAN (Jadwal, Ruang, Kuota)
CREATE TABLE IF NOT EXISTS sesi_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paket_id UUID NOT NULL REFERENCES paket_ujian(id) ON DELETE RESTRICT,
    nama_sesi VARCHAR(255) NOT NULL,
    jadwal_mulai TIMESTAMPTZ NOT NULL,
    jadwal_selesai TIMESTAMPTZ NOT NULL,
    ruang VARCHAR(100) NOT NULL DEFAULT 'Lab Komputer CBT / Online',
    kuota INT NOT NULL DEFAULT 100,
    status VARCHAR(20) NOT NULL DEFAULT 'TERJADWAL', -- 'TERJADWAL', 'BERLANGSUNG', 'SELESAI', 'DIBATALKAN'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesi_ujian_paket ON sesi_ujian(paket_id);
CREATE INDEX IF NOT EXISTS idx_sesi_ujian_jadwal ON sesi_ujian(jadwal_mulai, jadwal_selesai);
CREATE INDEX IF NOT EXISTS idx_sesi_ujian_status ON sesi_ujian(status);

-- 5. TABEL PESERTA SESI (Presensi & Eksekusi Ujian)
CREATE TABLE IF NOT EXISTS peserta_sesi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesi_id UUID NOT NULL REFERENCES sesi_ujian(id) ON DELETE CASCADE,
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    nomor_peserta VARCHAR(50) NOT NULL,
    status_presensi VARCHAR(20) NOT NULL DEFAULT 'BELUM_HADIR', -- 'BELUM_HADIR', 'HADIR', 'TERLAMBAT', 'TIDAK_HADIR'
    waktu_presensi TIMESTAMPTZ,
    metode_presensi VARCHAR(20), -- 'QR_SCAN', 'MANUAL_PENGAWAS'
    pengawas_id UUID REFERENCES users(id),
    status_ujian VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU', -- 'MENUNGGU', 'SEDANG_MENGERJAKAN', 'SELESAI', 'WAKTU_HABIS'
    waktu_mulai TIMESTAMPTZ,
    batas_waktu TIMESTAMPTZ, -- Dihitung di SERVER: waktu_mulai + durasi_menit
    waktu_selesai TIMESTAMPTZ,
    seed_acak BIGINT NOT NULL DEFAULT 1,
    urutan_soal_ids JSONB, -- Array ID soal yang diacak khusus untuk peserta ini
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sesi_id, pendaftar_id)
);

CREATE INDEX IF NOT EXISTS idx_peserta_sesi_pendaftar ON peserta_sesi(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_peserta_sesi_sesi ON peserta_sesi(sesi_id);
CREATE INDEX IF NOT EXISTS idx_peserta_sesi_nomor ON peserta_sesi(nomor_peserta);
CREATE INDEX IF NOT EXISTS idx_peserta_sesi_presensi ON peserta_sesi(status_presensi);

-- Constraint anti-kecurangan: Satu peserta hanya boleh memiliki 1 sesi yang sedang aktif
CREATE UNIQUE INDEX IF NOT EXISTS idx_peserta_single_active_session 
ON peserta_sesi(pendaftar_id) 
WHERE status_ujian = 'SEDANG_MENGERJAKAN';

-- 6. TABEL JAWABAN PESERTA (Autosave & Flag Ragu-Ragu)
CREATE TABLE IF NOT EXISTS jawaban_peserta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    peserta_sesi_id UUID NOT NULL REFERENCES peserta_sesi(id) ON DELETE CASCADE,
    soal_id UUID NOT NULL REFERENCES bank_soal(id) ON DELETE CASCADE,
    pilihan_jawaban VARCHAR(10), -- 'A', 'B', 'C', 'D', 'E'
    ragu_ragu BOOLEAN NOT NULL DEFAULT false,
    is_benar BOOLEAN,
    skor_diperoleh DOUBLE PRECISION DEFAULT 0.0,
    waktu_dijawab TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(peserta_sesi_id, soal_id)
);

CREATE INDEX IF NOT EXISTS idx_jawaban_peserta_sesi ON jawaban_peserta(peserta_sesi_id);
CREATE INDEX IF NOT EXISTS idx_jawaban_peserta_soal ON jawaban_peserta(soal_id);

-- 7. TABEL HASIL UJIAN & PENILAIAN OTOMATIS
CREATE TABLE IF NOT EXISTS hasil_ujian (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    peserta_sesi_id UUID NOT NULL UNIQUE REFERENCES peserta_sesi(id) ON DELETE CASCADE,
    pendaftar_id UUID NOT NULL REFERENCES pendaftar(id) ON DELETE CASCADE,
    total_soal INT NOT NULL,
    total_dijawab INT NOT NULL,
    jumlah_benar INT NOT NULL,
    jumlah_salah INT NOT NULL,
    jumlah_kosong INT NOT NULL,
    nilai_akhir DOUBLE PRECISION NOT NULL, -- 0.00 - 100.00
    is_lulus BOOLEAN NOT NULL,
    kategori_nilai JSONB, -- Rekap nilai per kategori: {"Penalaran Umum": 80.0, "Bahasa Inggris": 75.0}
    waktu_submit TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hasil_ujian_pendaftar ON hasil_ujian(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_hasil_ujian_lulus ON hasil_ujian(is_lulus);

-- =========================================================================
-- SEED DATA AWAL: Bank Soal & Paket Ujian Saringan Masuk PMB 2026
-- =========================================================================

-- Masukkan Paket Ujian Standar
INSERT INTO paket_ujian (id, nama_paket, deskripsi, durasi_menit, passing_grade, total_soal, acak_soal, acak_opsi)
VALUES (
    '33333333-3333-3333-3333-333333333331',
    'Paket Tes Potensi Skolastik & Literasi PMB 2026',
    'Ujian Saringan Masuk PMB Universitas Pignatelli Triputra mengukur penalaran analitik, kuantitatif, dan literasi bahasa.',
    60,
    65.0,
    4,
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Masukkan 4 Soal Baku
INSERT INTO bank_soal (id, kategori, tingkat_kesulitan, pertanyaan, opsi_jawaban, kunci_jawaban, bobot, pembahasan)
VALUES 
(
    '44444444-4444-4444-4444-444444444441',
    'Matematika Dasar',
    'MUDAH',
    'Jika 3x + 7 = 22, maka nilai dari 2x - 3 adalah...',
    '[
        {"label": "A", "teks": "5"},
        {"label": "B", "teks": "7"},
        {"label": "C", "teks": "9"},
        {"label": "D", "teks": "11"}
    ]'::jsonb,
    'B',
    1.0,
    '3x = 15 => x = 5. Maka 2(5) - 3 = 10 - 3 = 7.'
),
(
    '44444444-4444-4444-4444-444444444442',
    'Penalaran Umum',
    'SEDANG',
    'Semua mahasiswa Universitas Pignatelli Triputra memiliki kartu identitas. Sebagian peserta magang adalah mahasiswa. Kesimpulan yang tepat adalah...',
    '[
        {"label": "A", "teks": "Semua peserta magang memiliki kartu identitas"},
        {"label": "B", "teks": "Sebagian peserta magang memiliki kartu identitas"},
        {"label": "C", "teks": "Semua mahasiswa adalah peserta magang"},
        {"label": "D", "teks": "Tidak ada peserta magang yang memiliki kartu identitas"}
    ]'::jsonb,
    'B',
    1.0,
    'Karena sebagian peserta magang adalah mahasiswa, dan seluruh mahasiswa memiliki kartu identitas, maka sebagian peserta magang tersebut pasti memiliki kartu identitas.'
),
(
    '44444444-4444-4444-4444-444444444443',
    'Kemampuan Skolastik',
    'SEDANG',
    'Manakah dari struktur data berikut yang menerapkan prinsip First-In, First-Out (FIFO)?',
    '[
        {"label": "A", "teks": "Stack (Tumpukan)"},
        {"label": "B", "teks": "Queue (Antrean)"},
        {"label": "C", "teks": "Binary Search Tree"},
        {"label": "D", "teks": "Hash Map"}
    ]'::jsonb,
    'B',
    1.0,
    'Queue (Antrean) memproses elemen yang pertama kali masuk untuk pertama kali keluar (FIFO).'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Bahasa Inggris',
    'SEDANG',
    'Choose the most appropriate word: "The university decided to _____ the scholarship quota due to the high number of qualified applicants."',
    '[
        {"label": "A", "teks": "expand"},
        {"label": "B", "teks": "prevent"},
        {"label": "C", "teks": "diminish"},
        {"label": "D", "teks": "withdraw"}
    ]'::jsonb,
    'A',
    1.0,
    'Kata "expand" (memperluas/menambah kuota) adalah pilihan yang paling logis dan gramatikal.'
)
ON CONFLICT (id) DO NOTHING;

-- Sambungkan ke Paket Ujian
INSERT INTO paket_ujian_soal (paket_id, soal_id, urutan)
VALUES 
('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444441', 1),
('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444442', 2),
('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444443', 3),
('33333333-3333-3333-3333-333333333331', '44444444-4444-4444-4444-444444444444', 4)
ON CONFLICT DO NOTHING;

-- Update total_soal di paket_ujian
UPDATE paket_ujian 
SET total_soal = (SELECT COUNT(*) FROM paket_ujian_soal WHERE paket_id = paket_ujian.id)
WHERE id = '33333333-3333-3333-3333-333333333331';

