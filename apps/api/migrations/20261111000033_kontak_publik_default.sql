-- Data kontak sekretariat yang tampil di website publik (diatur admin di Pengaturan PMB).
-- Nilai awal sama dengan yang selama ini tampil; tidak menimpa data yang sudah diubah admin.
INSERT INTO pengaturan_pmb (kunci, nilai, deskripsi) VALUES
 ('KONTAK_EMAIL', 'pmb@upitra.ac.id', 'Email resmi admisi'),
 ('KONTAK_WHATSAPP', '+62 812-3456-7890', 'Nomor WhatsApp hotline PMB'),
 ('JAM_LAYANAN', 'Senin - Jumat: 08.00 - 16.00 WIB', 'Jam operasional sekretariat PMB'),
 ('KONTAK_ALAMAT', 'Jl. K.S. Tubun No. 2, Manahan, Banjarsari, Kota Surakarta, Jawa Tengah 57139', 'Alamat sekretariat PMB')
ON CONFLICT (kunci) DO NOTHING;
