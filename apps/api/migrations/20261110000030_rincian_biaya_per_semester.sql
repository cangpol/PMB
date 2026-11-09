-- Rincian biaya kuliah per semester (1..8): semester_2_8 dipecah menjadi semester_2 .. semester_8.
ALTER TABLE rincian_biaya_kuliah RENAME COLUMN semester_2_8 TO semester_2;
ALTER TABLE rincian_biaya_kuliah
    ADD COLUMN IF NOT EXISTS semester_3 BIGINT NOT NULL DEFAULT 0 CHECK (semester_3 >= 0),
    ADD COLUMN IF NOT EXISTS semester_4 BIGINT NOT NULL DEFAULT 0 CHECK (semester_4 >= 0),
    ADD COLUMN IF NOT EXISTS semester_5 BIGINT NOT NULL DEFAULT 0 CHECK (semester_5 >= 0),
    ADD COLUMN IF NOT EXISTS semester_6 BIGINT NOT NULL DEFAULT 0 CHECK (semester_6 >= 0),
    ADD COLUMN IF NOT EXISTS semester_7 BIGINT NOT NULL DEFAULT 0 CHECK (semester_7 >= 0),
    ADD COLUMN IF NOT EXISTS semester_8 BIGINT NOT NULL DEFAULT 0 CHECK (semester_8 >= 0);
-- Nilai lama (satu angka untuk semester 2 dst) disalin ke semester 3..8
UPDATE rincian_biaya_kuliah SET semester_3 = semester_2, semester_4 = semester_2,
    semester_5 = semester_2, semester_6 = semester_2, semester_7 = semester_2, semester_8 = semester_2
WHERE semester_3 = 0 AND semester_4 = 0 AND semester_5 = 0 AND semester_6 = 0
  AND semester_7 = 0 AND semester_8 = 0;
