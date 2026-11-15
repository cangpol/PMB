-- Arsip biaya kuliah dibuat manual oleh admin (tombol "Arsipkan"), bukan otomatis saat biaya diubah.
ALTER TABLE rincian_biaya_versi ADD COLUMN IF NOT EXISTS keterangan VARCHAR(150);
-- Arsip otomatis dari versi sebelumnya (jika ada) diberi keterangan agar dapat dikenali.
UPDATE rincian_biaya_versi SET keterangan = 'Arsip otomatis' WHERE keterangan IS NULL;
