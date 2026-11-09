-- =========================================================================
-- Migrasi: Berkas khusus D3 Keperawatan & ujian CBT hanya online
-- Versi: 20261109000024
-- =========================================================================

-- 1. Surat keterangan bebas buta warna kini khusus D3 Keperawatan (sebelumnya Fisioterapi).
--    Definisi lama (Fisioterapi) dinonaktifkan, bukan dihapus, karena mungkin sudah
--    direferensikan unggahan calon.
UPDATE definisi_berkas d SET is_active = FALSE, updated_at = NOW()
FROM program_studi ps
WHERE d.prodi_id = ps.id AND ps.kode_prodi = 'FIS' AND d.kode_berkas = 'SURAT_BEBAS_BUTA_WARNA';

INSERT INTO definisi_berkas (kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan, prodi_id)
SELECT 'SURAT_BEBAS_BUTA_WARNA', 'Surat Keterangan Bebas Buta Warna',
       'Wajib untuk calon D3 Keperawatan. Diterbitkan dokter / fasilitas kesehatan.',
       TRUE, 'image/jpeg,image/png,application/pdf', 3072, 6, ps.id
FROM program_studi ps
WHERE ps.kode_prodi = 'KEP'
  AND NOT EXISTS (
      SELECT 1 FROM definisi_berkas d
      WHERE d.kode_berkas = 'SURAT_BEBAS_BUTA_WARNA' AND d.prodi_id = ps.id
  );

-- Pastikan keduanya aktif, wajib, dan berurutan untuk D3 Keperawatan
UPDATE definisi_berkas d
SET is_active = TRUE, wajib = TRUE,
    urutan = CASE d.kode_berkas WHEN 'SURAT_KETERANGAN_SEHAT' THEN 5 ELSE 6 END,
    updated_at = NOW()
FROM program_studi ps
WHERE d.prodi_id = ps.id AND ps.kode_prodi = 'KEP'
  AND d.kode_berkas IN ('SURAT_KETERANGAN_SEHAT', 'SURAT_BEBAS_BUTA_WARNA');

-- 2. Ujian CBT hanya online: sesi luring yang ada dijadikan online
UPDATE sesi_ujian SET mode = 'ONLINE', ruang = 'Online', updated_at = NOW() WHERE mode = 'LURING';
