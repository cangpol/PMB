-- Rincian Biaya Kuliah per program studi:
-- Admisi, Semester 1, Semester 2 - Semester 8 (per semester), total hingga lulus dihitung aplikasi.
CREATE TABLE IF NOT EXISTS rincian_biaya_kuliah (
    prodi_id UUID PRIMARY KEY REFERENCES program_studi(id) ON DELETE CASCADE,
    admisi BIGINT NOT NULL DEFAULT 0 CHECK (admisi >= 0),
    semester_1 BIGINT NOT NULL DEFAULT 0 CHECK (semester_1 >= 0),
    semester_2_8 BIGINT NOT NULL DEFAULT 0 CHECK (semester_2_8 >= 0),
    jumlah_semester INT NOT NULL DEFAULT 8 CHECK (jumlah_semester BETWEEN 2 AND 14),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nilai awal (DRAF): semester mengikuti UKT yang sudah tercatat di prodi; admisi diisi admin.
INSERT INTO rincian_biaya_kuliah (prodi_id, admisi, semester_1, semester_2_8, jumlah_semester)
SELECT id, 0, COALESCE(biaya_ukt_min, 0), COALESCE(biaya_ukt_min, 0),
       CASE WHEN jenjang = 'D3' THEN 6 ELSE 8 END
FROM program_studi
ON CONFLICT (prodi_id) DO NOTHING;
