-- Rumus penomoran NIM yang dapat diatur Admin/Super Admin.
CREATE TABLE IF NOT EXISTS pengaturan_nim (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    template VARCHAR(100) NOT NULL,
    lingkup_urut VARCHAR(20) NOT NULL DEFAULT 'PER_PRODI_TAHUN'
        CHECK (lingkup_urut IN ('PER_PRODI_TAHUN', 'PER_TAHUN', 'GLOBAL')),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bawaan = rumus lama: 2 digit tahun + kode jenjang + 2 digit akhir kode prodi + urut 4 digit
INSERT INTO pengaturan_nim (id, template, lingkup_urut)
VALUES (1, '{TAHUN2}{KODE_JENJANG}{KODE_PRODI:2}{URUT:4}', 'PER_PRODI_TAHUN')
ON CONFLICT (id) DO NOTHING;

-- Pencacah nomor urut serbaguna; kunci bergantung pada lingkup:
--   PER_PRODI_TAHUN -> "<tahun>:<prodi_id>", PER_TAHUN -> "<tahun>", GLOBAL -> "ALL"
CREATE TABLE IF NOT EXISTS nim_counter_umum (
    kunci VARCHAR(80) PRIMARY KEY,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lanjutkan dari pencacah lama agar nomor urut tidak mulai dari awal
INSERT INTO nim_counter_umum (kunci, last_number)
SELECT tahun::text || ':' || prodi_id::text, last_number FROM nim_counter
ON CONFLICT (kunci) DO NOTHING;
