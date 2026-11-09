-- =========================================================================
-- Migrasi: Nomor pendaftaran sementara/asli dan kode prodi 2 digit
-- Versi: 20261109000023
--
--  * Nomor sementara (saat mendaftar)   : W + TAHUN2 + URUT4 + "-" + kode prodi 1 + kode prodi 2
--                                         contoh W270001-3132 (prodi 2 kosong = 00)
--  * Nomor asli (formulir sudah dibayar): TAHUN2 + URUT4 + "-" + kode prodi 1 + kode prodi 2
--                                         contoh 270031-3132
--  * NIM (diterima di prodi pertama)    : TAHUN2 + kode prodi + URUT4, contoh 27310001
-- =========================================================================

-- 1. Kode prodi 2 digit untuk nomor pendaftaran & NIM
ALTER TABLE program_studi ADD COLUMN IF NOT EXISTS kode_angka VARCHAR(2);
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_studi_kode_angka
    ON program_studi(kode_angka) WHERE kode_angka IS NOT NULL;

UPDATE program_studi SET kode_angka = CASE kode_prodi
        WHEN 'MNJ' THEN '11'
        WHEN 'AKT' THEN '12'
        WHEN 'IF'  THEN '21'
        WHEN 'SI'  THEN '22'
        WHEN 'SE'  THEN '23'
        WHEN 'BIG' THEN '31'
        WHEN 'PAR' THEN '32'
        WHEN 'K3'  THEN '41'
        WHEN 'FIS' THEN '42'
        WHEN 'KEP' THEN '43'
    END
WHERE kode_angka IS NULL AND kode_prodi IN
    ('MNJ', 'AKT', 'IF', 'SI', 'SE', 'BIG', 'PAR', 'K3', 'FIS', 'KEP');

-- 2. Nomor sementara disimpan setelah nomor asli terbit (riwayat; nomor_pendaftaran
--    selalu berisi nomor yang berlaku saat ini)
ALTER TABLE pendaftar ADD COLUMN IF NOT EXISTS nomor_sementara VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pendaftar_nomor_sementara
    ON pendaftar(nomor_sementara) WHERE nomor_sementara IS NOT NULL;

-- 3. Rumus NIM baru: tahun masuk + kode prodi + nomor urut (27310001)
UPDATE pengaturan_nim
SET template = '{TAHUN2}{KODE_ANGKA}{URUT:4}', lingkup_urut = 'PER_PRODI_TAHUN', updated_at = NOW()
WHERE id = 1;
