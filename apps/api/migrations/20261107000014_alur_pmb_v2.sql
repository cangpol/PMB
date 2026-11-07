-- =========================================================================
-- Migrasi: Alur PMB v2
--   formulir (+ pilih sesi CBT) -> bayar formulir (VA Mandiri / QRIS statis)
--   -> upload bukti -> approval admin -> upload berkas -> verifikasi berkas
--   -> CBT (online/luring per sesi) -> pengumuman -> bayar daftar ulang
--   -> upload bukti -> approval admin -> registrasi ulang -> NIM
-- Versi: 20261107000014
-- =========================================================================

-- 1. Status pendaftar: tambah status alur v2 (nilai lama tetap dipertahankan)
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS pendaftar_status_pendaftaran_check;
ALTER TABLE pendaftar ADD CONSTRAINT pendaftar_status_pendaftaran_check
    CHECK (status_pendaftaran IN (
        'DRAFT',
        'SUBMITTED',
        'MENUNGGU_VERIFIKASI_BAYAR',
        'PEMBAYARAN_DITOLAK',
        'PEMBAYARAN_DISETUJUI',
        'MENUNGGU_VERIFIKASI_BERKAS',
        'BERKAS_REVISION',
        'BERKAS_VERIFIED',
        'MENUNGGU_UJIAN',            -- lama, tidak dipakai lagi oleh alur v2
        'MENUNGGU_PENGUMUMAN',
        'LULUS',
        'CADANGAN',
        'TIDAK_LULUS',
        'MENUNGGU_VERIFIKASI_DAFTAR_ULANG',
        'DAFTAR_ULANG_LUNAS',
        'TERDAFTAR'
    ));

-- Data lama: pendaftar yang formulirnya sudah lunas dianggap pembayarannya disetujui
UPDATE pendaftar p
SET status_pendaftaran = 'PEMBAYARAN_DISETUJUI', updated_at = NOW()
WHERE p.status_pendaftaran IN ('SUBMITTED', 'MENUNGGU_UJIAN')
  AND EXISTS (
      SELECT 1 FROM tagihan t
      WHERE t.pendaftar_id = p.id AND t.jenis_tagihan = 'FORMULIR' AND t.status = 'LUNAS'
  );

-- 2. Sesi CBT yang dipilih calon saat mengisi formulir
ALTER TABLE pendaftar
    ADD COLUMN IF NOT EXISTS sesi_ujian_id UUID REFERENCES sesi_ujian(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pendaftar_sesi_ujian ON pendaftar(sesi_ujian_id);

-- 3. Sesi ujian: mode ONLINE/LURING, cakupan gelombang/jalur, dibuka untuk dipilih calon
ALTER TABLE sesi_ujian
    ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN IF NOT EXISTS gelombang_id UUID REFERENCES gelombang(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS jalur_id UUID REFERENCES jalur_masuk(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_dibuka_pendaftaran BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sesi_ujian DROP CONSTRAINT IF EXISTS sesi_ujian_mode_check;
ALTER TABLE sesi_ujian ADD CONSTRAINT sesi_ujian_mode_check CHECK (mode IN ('ONLINE', 'LURING'));
CREATE INDEX IF NOT EXISTS idx_sesi_ujian_pilihan
    ON sesi_ujian(is_dibuka_pendaftaran, jadwal_mulai);

-- 4. Batas daftar ulang per gelombang (dipakai di surat penerimaan & tagihan daftar ulang)
ALTER TABLE gelombang ADD COLUMN IF NOT EXISTS tgl_batas_daftar_ulang DATE;

-- 5. Berkas khusus prodi (mis. bebas buta warna untuk Fisioterapi)
ALTER TABLE definisi_berkas
    ADD COLUMN IF NOT EXISTS prodi_id UUID REFERENCES program_studi(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_definisi_berkas_prodi ON definisi_berkas(prodi_id);

-- Berkas lama tidak dihapus (masih direferensikan berkas_pendaftar), cukup dinonaktifkan
UPDATE definisi_berkas SET is_active = FALSE, updated_at = NOW()
WHERE jalur_id IS NULL AND prodi_id IS NULL
  AND kode_berkas IN ('PASFOTO', 'KTP_KK', 'IJAZAH_SKL', 'RAPOR_SEMESTER', 'SERTIFIKAT_PRESTASI');

INSERT INTO definisi_berkas (kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan, prodi_id)
SELECT v.kode, v.nama, v.deskripsi, v.wajib, v.tipe, v.maks_kb, v.urutan, NULL
FROM (VALUES
    ('RAPOR_X_XI', 'Rapor Kelas X - XI', 'Scan rapor kelas X dan XI (semester 1-4) dalam satu file PDF.', TRUE, 'application/pdf', 5120, 1),
    ('PASFOTO_WARNA', 'Pas Foto Berwarna', 'Pas foto berwarna terbaru, pakaian rapi, wajah tampak jelas.', TRUE, 'image/jpeg,image/png', 2048, 2),
    ('SURAT_REKOMENDASI_SEKOLAH', 'Surat Rekomendasi Sekolah', 'Surat rekomendasi dari kepala sekolah / guru BK.', TRUE, 'image/jpeg,image/png,application/pdf', 3072, 3),
    ('SERTIFIKAT', 'Sertifikat Prestasi (bila ada)', 'Sertifikat prestasi akademik / non-akademik. Opsional.', FALSE, 'image/jpeg,image/png,application/pdf', 5120, 4)
) AS v(kode, nama, deskripsi, wajib, tipe, maks_kb, urutan)
WHERE NOT EXISTS (
    SELECT 1 FROM definisi_berkas d WHERE d.kode_berkas = v.kode AND d.jalur_id IS NULL AND d.prodi_id IS NULL
);

INSERT INTO definisi_berkas (kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan, prodi_id)
SELECT 'SURAT_BEBAS_BUTA_WARNA', 'Surat Keterangan Bebas Buta Warna',
       'Wajib untuk calon Fisioterapi. Diterbitkan dokter / fasilitas kesehatan.',
       TRUE, 'image/jpeg,image/png,application/pdf', 3072, 5, ps.id
FROM program_studi ps
WHERE ps.kode_prodi = 'FIS'
  AND NOT EXISTS (SELECT 1 FROM definisi_berkas d WHERE d.kode_berkas = 'SURAT_BEBAS_BUTA_WARNA' AND d.prodi_id = ps.id);

INSERT INTO definisi_berkas (kode_berkas, nama, deskripsi, wajib, tipe_file, ukuran_maks_kb, urutan, prodi_id)
SELECT 'SURAT_KETERANGAN_SEHAT', 'Surat Keterangan Sehat',
       'Wajib untuk calon D3 Keperawatan. Diterbitkan dokter / fasilitas kesehatan.',
       TRUE, 'image/jpeg,image/png,application/pdf', 3072, 6, ps.id
FROM program_studi ps
WHERE ps.kode_prodi = 'KEP'
  AND NOT EXISTS (SELECT 1 FROM definisi_berkas d WHERE d.kode_berkas = 'SURAT_KETERANGAN_SEHAT' AND d.prodi_id = ps.id);

-- 6. Urutan langkah default: formulir -> pembayaran -> berkas -> ujian -> pengumuman
UPDATE definisi_langkah SET urutan = 1, updated_at = NOW() WHERE jalur_id IS NULL AND tipe_langkah = 'pilih_prodi';
UPDATE definisi_langkah SET urutan = 2, updated_at = NOW() WHERE jalur_id IS NULL AND tipe_langkah = 'biodata';
UPDATE definisi_langkah SET urutan = 3, updated_at = NOW(),
       judul_langkah = 'Pembayaran Biaya Formulir',
       deskripsi = 'Transfer ke VA Mandiri / QRIS kampus, unggah bukti, tunggu persetujuan admin PMB.',
       syarat_lanjut = '{"butuh_langkah": ["biodata"]}'::jsonb
 WHERE jalur_id IS NULL AND tipe_langkah = 'pembayaran';
UPDATE definisi_langkah SET urutan = 4, updated_at = NOW(),
       syarat_lanjut = '{"butuh_langkah": ["pembayaran"]}'::jsonb
 WHERE jalur_id IS NULL AND tipe_langkah = 'berkas';
UPDATE definisi_langkah SET urutan = 5, updated_at = NOW(),
       syarat_lanjut = '{"butuh_langkah": ["berkas"], "butuh_berkas_terverifikasi": true}'::jsonb
 WHERE jalur_id IS NULL AND tipe_langkah = 'ujian';
UPDATE definisi_langkah SET urutan = 6, updated_at = NOW() WHERE jalur_id IS NULL AND tipe_langkah = 'verifikasi';

-- 7. Rekening / QRIS statis kampus untuk pembayaran manual
CREATE TABLE IF NOT EXISTS rekening_pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('VA_MANDIRI', 'QRIS')),
    nama_bank VARCHAR(100) NOT NULL DEFAULT 'Bank Mandiri',
    nomor VARCHAR(100),                 -- nomor VA (untuk VA_MANDIRI)
    atas_nama VARCHAR(255) NOT NULL,
    qris_image_key VARCHAR(500),        -- object key gambar QRIS di storage (untuk QRIS)
    instruksi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rekening_isi CHECK (
        (jenis = 'VA_MANDIRI' AND nomor IS NOT NULL) OR (jenis = 'QRIS')
    )
);
CREATE INDEX IF NOT EXISTS idx_rekening_pembayaran_aktif ON rekening_pembayaran(is_active, jenis);

-- 8. Bukti pembayaran generik (formulir & daftar ulang) - generalisasi tabel bukti daftar ulang
ALTER TABLE IF EXISTS bukti_bayar_daftar_ulang RENAME TO bukti_pembayaran;
ALTER INDEX IF EXISTS idx_bukti_bayar_du_pendaftar RENAME TO idx_bukti_pembayaran_pendaftar;
ALTER INDEX IF EXISTS idx_bukti_bayar_du_status RENAME TO idx_bukti_pembayaran_status;

ALTER TABLE bukti_pembayaran
    ADD COLUMN IF NOT EXISTS jenis_tagihan VARCHAR(30) NOT NULL DEFAULT 'DAFTAR_ULANG_UKT',
    ADD COLUMN IF NOT EXISTS metode VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nominal_dibayar BIGINT,
    ADD COLUMN IF NOT EXISTS tgl_bayar DATE;
ALTER TABLE bukti_pembayaran ALTER COLUMN jenis_tagihan DROP DEFAULT;

ALTER TABLE bukti_pembayaran DROP CONSTRAINT IF EXISTS bukti_pembayaran_metode_check;
ALTER TABLE bukti_pembayaran ADD CONSTRAINT bukti_pembayaran_metode_check
    CHECK (metode IS NULL OR metode IN ('VA_MANDIRI', 'QRIS'));
ALTER TABLE bukti_pembayaran DROP CONSTRAINT IF EXISTS bukti_pembayaran_nominal_check;
ALTER TABLE bukti_pembayaran ADD CONSTRAINT bukti_pembayaran_nominal_check
    CHECK (nominal_dibayar IS NULL OR nominal_dibayar > 0);

CREATE INDEX IF NOT EXISTS idx_bukti_pembayaran_jenis ON bukti_pembayaran(jenis_tagihan, status);
-- Hanya boleh satu bukti PENDING per tagihan (cegah antrean ganda)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bukti_pembayaran_pending_per_tagihan
    ON bukti_pembayaran(tagihan_id) WHERE status = 'PENDING' AND tagihan_id IS NOT NULL;

-- 9. Transaksi pembayaran dari bukti yang disetujui admin
ALTER TABLE transaksi_pembayaran DROP CONSTRAINT IF EXISTS transaksi_pembayaran_gateway_provider_check;
ALTER TABLE transaksi_pembayaran ADD CONSTRAINT transaksi_pembayaran_gateway_provider_check
    CHECK (gateway_provider IN ('MOCK', 'MIDTRANS', 'XENDIT', 'MANUAL_LOKET', 'MANUAL'));

-- 10. Audit kelulusan tingkat sidang tidak terikat pada satu pendaftar
ALTER TABLE audit_kelulusan ALTER COLUMN pendaftar_id DROP NOT NULL;

-- 11. Backfill: status pendaftar mengikuti hasil kelulusan yang sudah dipublikasikan
UPDATE pendaftar p
SET status_pendaftaran = CASE
        WHEN h.status_daftar_ulang = 'TERDAFTAR_SEBAGAI_MAHASISWA' THEN 'TERDAFTAR'
        WHEN h.status_daftar_ulang IN ('LUNAS', 'BERKAS_LENGKAP') THEN 'DAFTAR_ULANG_LUNAS'
        WHEN h.status_kelulusan LIKE 'LULUS%' THEN 'LULUS'
        WHEN h.status_kelulusan = 'CADANGAN' THEN 'CADANGAN'
        ELSE 'TIDAK_LULUS'
    END,
    updated_at = NOW()
FROM hasil_kelulusan h
WHERE h.pendaftar_id = p.id AND h.is_published = TRUE;
