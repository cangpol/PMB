-- =========================================================================
-- Alur seleksi & beasiswa per jalur READY
--   PENUH         : rapor -> CBT -> wawancara (READY Admission)
--   LANGSUNG_LULUS: persetujuan admin pada seleksi berkas/rapor meluluskan CBT & wawancara
--   TANPA_CBT     : persetujuan admin melewati CBT, wawancara tetap (READY Creator)
-- =========================================================================
ALTER TABLE jalur_masuk
    ADD COLUMN IF NOT EXISTS alur_seleksi VARCHAR(20) NOT NULL DEFAULT 'PENUH',
    ADD COLUMN IF NOT EXISTS rapor_minimal DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS potongan_tetap INT,
    ADD COLUMN IF NOT EXISTS potongan_maks INT,
    ADD COLUMN IF NOT EXISTS kriteria_seleksi TEXT,
    ADD COLUMN IF NOT EXISTS benefit_tambahan TEXT;
ALTER TABLE jalur_masuk DROP CONSTRAINT IF EXISTS chk_jalur_alur_seleksi;
ALTER TABLE jalur_masuk ADD CONSTRAINT chk_jalur_alur_seleksi
    CHECK (alur_seleksi IN ('PENUH', 'LANGSUNG_LULUS', 'TANPA_CBT'));

ALTER TABLE pendaftar
    ADD COLUMN IF NOT EXISTS cbt_dilewati BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS potongan_persen INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tingkat_prestasi VARCHAR(20),
    ADD COLUMN IF NOT EXISTS jumlah_follower BIGINT;
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS chk_pendaftar_potongan;
ALTER TABLE pendaftar ADD CONSTRAINT chk_pendaftar_potongan CHECK (potongan_persen BETWEEN 0 AND 100);

UPDATE jalur_masuk SET alur_seleksi = 'LANGSUNG_LULUS', rapor_minimal = 80, potongan_tetap = 100,
    biaya_formulir = 0,
    kriteria_seleksi = 'Seleksi rapor kelas 11 semester 4 dengan rata-rata keseluruhan minimal 80. Formulir gratis dan potongan 100% biaya DPP dan SKS.'
WHERE kode_jalur = 'READY-EARLY';

UPDATE jalur_masuk SET alur_seleksi = 'LANGSUNG_LULUS', rapor_minimal = 75, potongan_tetap = 75,
    kriteria_seleksi = 'Nilai rapor semester 1-4 rata-rata minimal 75 dan Surat Rekomendasi Sekolah. Potongan 75% biaya DPP dan SKS.'
WHERE kode_jalur = 'READY-PARTNER';

UPDATE jalur_masuk SET alur_seleksi = 'LANGSUNG_LULUS',
    kriteria_seleksi = 'Nilai rapor + sertifikat prestasi. Rapor > 88: potongan 100%; 83-87,9: 75%; 78-82,9: 50%; 75-77,9: 25%. Atau sertifikat prestasi: Internasional 100%, Nasional 75%, Provinsi 50%, Kota/Kabupaten 25% (diambil yang terbesar). Potongan berlaku untuk DPP dan SKS.',
    benefit_tambahan = 'Berkesempatan menjadi Duta UPITRA'
WHERE kode_jalur = 'READY-ACHIEVEMENT';

UPDATE jalur_masuk SET alur_seleksi = 'PENUH',
    kriteria_seleksi = 'Seleksi rapor, CBT online, lalu wawancara.'
WHERE kode_jalur = 'READY-ADMISSION';

UPDATE jalur_masuk SET alur_seleksi = 'LANGSUNG_LULUS',
    kriteria_seleksi = 'Seleksi berkas Kartu Keluarga (KK) dan ijazah alumni UPITRA.'
WHERE kode_jalur = 'READY-LEGACY';

UPDATE jalur_masuk SET alur_seleksi = 'LANGSUNG_LULUS', rapor_minimal = 75, potongan_maks = 75,
    kriteria_seleksi = 'Nilai rapor semester 1-4 rata-rata minimal 75 dan Surat Rekomendasi Sekolah/Gereja/Organisasi lain. Beasiswa up to 75%.',
    benefit_tambahan = 'Dapat mengikuti Student Leadership Camp Forum'
WHERE kode_jalur = 'READY-FUTURE-LEADER';

UPDATE jalur_masuk SET alur_seleksi = 'TANPA_CBT', potongan_tetap = 50,
    kriteria_seleksi = 'Berkas portofolio dan seleksi wawancara. Follower minimal 10K (khusus content creator) mendapat potongan 50% biaya DPP dan SKS.',
    benefit_tambahan = 'Berkesempatan mengikuti Portfolio Development'
WHERE kode_jalur = 'READY-CREATOR';

-- Berkas khusus jalur (rapor X-XI tetap berlaku umum). Surat rekomendasi umum dinonaktifkan:
-- hanya dibutuhkan jalur Partner dan Future Leader.
UPDATE definisi_berkas SET is_active = FALSE, updated_at = NOW()
WHERE kode_berkas = 'SURAT_REKOMENDASI_SEKOLAH' AND jalur_id IS NULL;

INSERT INTO definisi_berkas (jalur_id, kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan)
SELECT j.id, v.kode, v.nama, v.deskripsi, v.wajib, 'image/jpeg,image/png,application/pdf', 5120, v.urutan
FROM (VALUES
    ('READY-PARTNER', 'SURAT_REKOMENDASI_SEKOLAH', 'Surat Rekomendasi Sekolah', 'Surat rekomendasi dari sekolah mitra.', TRUE, 10),
    ('READY-FUTURE-LEADER', 'SURAT_REKOMENDASI_LEADER', 'Surat Rekomendasi Sekolah/Gereja/Organisasi', 'Surat rekomendasi dari sekolah, gereja, atau organisasi lain.', TRUE, 10),
    ('READY-ACHIEVEMENT', 'SERTIFIKAT_PRESTASI', 'Sertifikat Prestasi', 'Sertifikat prestasi (internasional, nasional, provinsi, atau kota/kabupaten).', TRUE, 10),
    ('READY-LEGACY', 'KARTU_KELUARGA', 'Kartu Keluarga (KK)', 'Kartu Keluarga yang menunjukkan hubungan dengan alumni UPITRA.', TRUE, 10),
    ('READY-LEGACY', 'IJAZAH_ALUMNI', 'Ijazah Alumni UPITRA', 'Ijazah alumni UPITRA (orang tua/saudara/kerabat).', TRUE, 11),
    ('READY-CREATOR', 'PORTOFOLIO', 'Berkas Portofolio', 'Portofolio karya konten atau talenta digital.', TRUE, 10),
    ('READY-CREATOR', 'BUKTI_FOLLOWER', 'Bukti Jumlah Follower', 'Tangkapan layar akun yang menunjukkan jumlah follower (min. 10K untuk content creator).', FALSE, 11)
) AS v(kode_jalur, kode, nama, deskripsi, wajib, urutan)
JOIN jalur_masuk j ON j.kode_jalur = v.kode_jalur
WHERE NOT EXISTS (
    SELECT 1 FROM definisi_berkas d WHERE d.kode_berkas = v.kode AND d.jalur_id = j.id
);
