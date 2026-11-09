-- Wilayah domisili saat ini: Negara, Provinsi, Kabupaten/Kota, Kecamatan (satu isian bertingkat).
UPDATE definisi_field
SET label = 'Wilayah Domisili Saat Ini',
    placeholder = 'Pilih Negara, Provinsi, Kabupaten/Kota & Kecamatan',
    wajib = TRUE, is_active = TRUE, updated_at = NOW()
WHERE kode_field = 'domisili_wilayah' AND tipe_field = 'wilayah';

INSERT INTO definisi_field (kode_field, label, tipe_field, placeholder, wajib, opsi, aturan_validasi, urutan, kelompok)
SELECT 'domisili_wilayah', 'Wilayah Domisili Saat Ini', 'wilayah',
       'Pilih Negara, Provinsi, Kabupaten/Kota & Kecamatan', TRUE, '[]'::jsonb, '{}'::jsonb, 9, 'DATA_PRIBADI'
WHERE NOT EXISTS (SELECT 1 FROM definisi_field WHERE kode_field = 'domisili_wilayah');
