-- Ujian potensi CBT, pengumuman hasil, dan benefit tidak lagi ditampilkan per gelombang
ALTER TABLE gelombang
    DROP COLUMN IF EXISTS info_ujian_cbt,
    DROP COLUMN IF EXISTS info_pengumuman,
    DROP COLUMN IF EXISTS benefit;
