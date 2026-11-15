-- Samakan alamat sekretariat dengan alamat kampus UPITRA (Jl. Duwet No. 1, Karangasem, Laweyan).
-- Hanya mengganti bila masih berisi nilai awal; alamat yang sudah diubah admin tidak ditimpa.
UPDATE pengaturan_pmb
SET nilai = 'Jl. Duwet No. 1, Karangasem, Laweyan, Kota Surakarta, Jawa Tengah 57145',
    updated_at = NOW()
WHERE kunci = 'KONTAK_ALAMAT'
  AND nilai = 'Jl. K.S. Tubun No. 2, Manahan, Banjarsari, Kota Surakarta, Jawa Tengah 57139';
