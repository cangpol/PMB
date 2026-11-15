-- READY Legacy Scholarship: hubungan calon dengan alumni UPITRA menentukan potongan
-- (anak alumni 50%, saudara alumni 25%). Ditetapkan admin saat seleksi berkas.
ALTER TABLE pendaftar ADD COLUMN IF NOT EXISTS hubungan_alumni VARCHAR(10);
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS chk_pendaftar_hubungan_alumni;
ALTER TABLE pendaftar ADD CONSTRAINT chk_pendaftar_hubungan_alumni
    CHECK (hubungan_alumni IS NULL OR hubungan_alumni IN ('ANAK', 'SAUDARA'));

UPDATE jalur_masuk
SET potongan_maks = NULL,
    kriteria_seleksi = 'Seleksi berkas Kartu Keluarga (KK) dan ijazah alumni UPITRA. Anak alumni: potongan 50%; saudara alumni: potongan 25% biaya DPP dan SKS.'
WHERE kode_jalur = 'READY-LEGACY';
