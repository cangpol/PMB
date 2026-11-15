-- Potongan jalur bertingkat menurut rata-rata rapor:
--   rapor >= ambang  -> potongan_tetap
--   rapor <  ambang  -> potongan_di_bawah_ambang
-- Bila potongan_di_bawah_ambang kosong, calon di bawah ambang tidak memenuhi syarat (perilaku lama).
ALTER TABLE jalur_masuk
    ADD COLUMN IF NOT EXISTS potongan_ambang_rapor DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS potongan_di_bawah_ambang INT;
ALTER TABLE jalur_masuk DROP CONSTRAINT IF EXISTS chk_jalur_potongan_bawah;
ALTER TABLE jalur_masuk ADD CONSTRAINT chk_jalur_potongan_bawah
    CHECK (potongan_di_bawah_ambang IS NULL OR potongan_di_bawah_ambang BETWEEN 0 AND 100);

-- READY Early: ambang rapor 80 (>= 80 potongan 100%). Batas minimal dipindah menjadi ambang
-- agar potongan untuk nilai di bawah 80 dapat diatur admin; selama belum diatur, di bawah 80 ditolak.
UPDATE jalur_masuk
SET potongan_ambang_rapor = 80, rapor_minimal = NULL
WHERE kode_jalur = 'READY-EARLY' AND potongan_ambang_rapor IS NULL;
