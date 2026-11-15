-- Konsultasi online dari halaman Kontak disimpan di tabel prospek yang sama (dengan pesan),
-- sehingga admin melihat semuanya di satu tempat. Asal sekolah tidak diisi pada konsultasi.
ALTER TABLE prospek_calon ADD COLUMN IF NOT EXISTS pesan TEXT;
ALTER TABLE prospek_calon ALTER COLUMN asal_sekolah DROP NOT NULL;
