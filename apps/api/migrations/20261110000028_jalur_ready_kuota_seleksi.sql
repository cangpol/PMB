-- =========================================================================
-- Migrasi: Jalur READY, kuota daftar ulang, notifikasi admin, 3 tahap seleksi
--   Seleksi Rapor -> CBT Online -> Interview
-- Versi: 20261110000028 (idempoten; seed menjalankannya ulang)
-- =========================================================================

-- 1. Tujuh jalur pendaftaran READY
INSERT INTO jalur_masuk (kode_jalur, nama_jalur, deskripsi, biaya_formulir, tipe_seleksi, syarat, kuota_maksimal, is_active)
VALUES
 ('READY-EARLY', 'READY Early', 'Dibuka sesuai gelombang. Kuota 70 calon yang sudah daftar ulang.', 250000, 'CBT', 'Mengikuti seleksi rapor, CBT online, dan interview.', 70, TRUE),
 ('READY-PARTNER', 'READY Partner Scholarship', 'Jalur Mitra Sekolah.', 250000, 'CBT', 'Berasal dari sekolah mitra UPITRA.', NULL, TRUE),
 ('READY-ACHIEVEMENT', 'READY Achievement', 'Jalur Prestasi Siswa.', 250000, 'CBT', 'Memiliki prestasi akademik atau non-akademik.', NULL, TRUE),
 ('READY-ADMISSION', 'READY Admission', 'Jalur Reguler.', 250000, 'CBT', 'Lulusan SMA/SMK/MA sederajat.', NULL, TRUE),
 ('READY-LEGACY', 'READY Legacy Scholarship', 'Jalur Alumni UPITRA.', 250000, 'CBT', 'Alumni atau keluarga alumni UPITRA.', NULL, TRUE),
 ('READY-FUTURE-LEADER', 'READY Future Leader', 'Jalur Aktivis Organisasi (Osis, OMK, dll).', 250000, 'CBT', 'Pengurus organisasi siswa atau kepemudaan.', NULL, TRUE),
 ('READY-CREATOR', 'READY Creator', 'Jalur Konten dan Talenta Digital.', 250000, 'CBT', 'Memiliki karya konten atau talenta digital.', NULL, TRUE)
ON CONFLICT (kode_jalur) DO UPDATE
    SET nama_jalur = EXCLUDED.nama_jalur, deskripsi = EXCLUDED.deskripsi,
        kuota_maksimal = EXCLUDED.kuota_maksimal;

-- Jalur contoh lama (selain RPL) tidak lagi ditawarkan; data pendaftar lama tetap utuh
UPDATE jalur_masuk SET is_active = FALSE, updated_at = NOW()
WHERE kode_jalur IN ('JALUR-RAPOR', 'JALUR-CBT', 'JALUR-BEASISWA') AND is_active = TRUE;

INSERT INTO rumus_penilaian_jalur (jalur_id, bobot_cbt, bobot_rapor, bobot_prestasi, bobot_wawancara, default_passing_score, keterangan)
SELECT id, 50.0, 30.0, 20.0, 0.0, 65.0, 'Rumus standar seleksi PMB'
FROM jalur_masuk WHERE kode_jalur LIKE 'READY-%'
ON CONFLICT (jalur_id) DO NOTHING;

-- 2. Status baru: menunggu dipindahkan admin ke jalur lain (kuota jalur penuh)
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS pendaftar_status_pendaftaran_check;
ALTER TABLE pendaftar ADD CONSTRAINT pendaftar_status_pendaftaran_check
    CHECK (status_pendaftaran IN (
        'DRAFT', 'SUBMITTED', 'MENUNGGU_VERIFIKASI_BAYAR', 'PEMBAYARAN_DITOLAK',
        'PEMBAYARAN_DISETUJUI', 'MENUNGGU_VERIFIKASI_BERKAS', 'BERKAS_REVISION',
        'BERKAS_VERIFIED', 'MENUNGGU_UJIAN', 'MENUNGGU_PENGUMUMAN', 'LULUS', 'CADANGAN',
        'TIDAK_LULUS', 'MENUNGGU_VERIFIKASI_DAFTAR_ULANG', 'DAFTAR_ULANG_LUNAS',
        'TERDAFTAR', 'MENUNGGU_PINDAH_JALUR'
    ));

-- 3. Hasil seleksi rapor & interview (CBT tetap di hasil_ujian)
ALTER TABLE pendaftar
    ADD COLUMN IF NOT EXISTS status_seleksi_rapor VARCHAR(15) NOT NULL DEFAULT 'MENUNGGU',
    ADD COLUMN IF NOT EXISTS nilai_seleksi_rapor DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS catatan_seleksi_rapor TEXT,
    ADD COLUMN IF NOT EXISTS status_seleksi_interview VARCHAR(15) NOT NULL DEFAULT 'MENUNGGU',
    ADD COLUMN IF NOT EXISTS nilai_seleksi_interview DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS catatan_seleksi_interview TEXT;
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS chk_seleksi_rapor;
ALTER TABLE pendaftar ADD CONSTRAINT chk_seleksi_rapor
    CHECK (status_seleksi_rapor IN ('MENUNGGU', 'LULUS', 'TIDAK_LULUS'));
ALTER TABLE pendaftar DROP CONSTRAINT IF EXISTS chk_seleksi_interview;
ALTER TABLE pendaftar ADD CONSTRAINT chk_seleksi_interview
    CHECK (status_seleksi_interview IN ('MENUNGGU', 'LULUS', 'TIDAK_LULUS'));

-- Pendaftar yang sudah melewati tahap tersebut sebelum aturan ini ada dianggap lulus (hanya sekali)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM _sqlx_migrations WHERE version = 20261110000028) THEN
        UPDATE pendaftar SET status_seleksi_rapor = 'LULUS', status_seleksi_interview = 'LULUS'
        WHERE status_pendaftaran IN ('BERKAS_VERIFIED', 'MENUNGGU_UJIAN', 'MENUNGGU_PENGUMUMAN',
            'LULUS', 'CADANGAN', 'MENUNGGU_VERIFIKASI_DAFTAR_ULANG', 'DAFTAR_ULANG_LUNAS', 'TERDAFTAR');
    END IF;
END $$;

-- 4. Notifikasi untuk admin (mis. calon tertolak karena kuota jalur penuh)
CREATE TABLE IF NOT EXISTS notifikasi_admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipe VARCHAR(40) NOT NULL,
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    pendaftar_id UUID REFERENCES pendaftar(id) ON DELETE CASCADE,
    sudah_dibaca BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifikasi_admin_belum ON notifikasi_admin(sudah_dibaca, created_at DESC);
