-- Data dummy calon mahasiswa pendaftar (idempoten). Password semua akun: sama dengan calon@triputra.id
-- Jalankan: psql -h localhost -U pmb_user -d pmb_db -f scripts/seed_calon_dummy.sql
BEGIN;
DELETE FROM users WHERE email LIKE 'dummy.calon%@contoh.id';  -- cascade ke pendaftar

WITH nama(i, nm, jk, kota, sekolah, jurusan, agama, status, nilai, prodi1, prodi2, jalur_i, gel_i) AS (
  VALUES
  (1,'Andreas Wijaya','L','Semarang','SMA Negeri 1 Semarang','IPA','Katolik','DRAFT',0,'IF','SI',0,0),
  (2,'Maria Clara Putri','P','Salatiga','SMA Kristen 1 Salatiga','IPS','Katolik','SUBMITTED',82.5,'SI','IF',0,0),
  (3,'Budi Hartono','L','Ungaran','SMK Negeri 2 Ungaran','TKJ','Islam','MENUNGGU_VERIFIKASI_BAYAR',78.0,'IF','SI',0,0),
  (4,'Siti Nurhaliza','P','Demak','SMA Negeri 1 Demak','IPA','Islam','PEMBAYARAN_DISETUJUI',85.2,'SI','IF',0,1),
  (5,'Yohanes Prasetyo','L','Magelang','SMA Pangudi Luhur Magelang','IPA','Katolik','MENUNGGU_VERIFIKASI_BERKAS',88.0,'IF','SI',1,1),
  (6,'Katarina Dewi','P','Yogyakarta','SMA Stella Duce 1','IPS','Katolik','BERKAS_REVISION',80.4,'SI','IF',0,1),
  (7,'Rizky Ramadhan','L','Kendal','SMA Negeri 1 Kendal','IPA','Islam','BERKAS_VERIFIED',83.7,'IF','SI',1,1),
  (8,'Agnes Monica Sari','P','Semarang','SMA Sedes Sapientiae','IPA','Katolik','MENUNGGU_UJIAN',90.1,'SI','IF',1,1),
  (9,'Dimas Anggara','L','Boyolali','SMA Negeri 1 Boyolali','IPA','Islam','MENUNGGU_PENGUMUMAN',86.3,'IF','SI',1,1),
  (10,'Fransiska Lestari','P','Solo','SMA Regina Pacis Surakarta','IPS','Katolik','LULUS',91.0,'SI','IF',0,0),
  (11,'Michael Tanujaya','L','Semarang','SMA Karangturi','IPA','Kristen','LULUS',89.5,'IF','SI',0,0),
  (12,'Putri Ayu Lestari','P','Kudus','SMA Negeri 2 Kudus','IPA','Islam','CADANGAN',75.8,'SI','IF',0,1),
  (13,'Gilang Saputra','L','Pekalongan','SMK Negeri 1 Pekalongan','RPL','Islam','TIDAK_LULUS',62.0,'IF','SI',1,1),
  (14,'Theresia Maharani','P','Semarang','SMA Theresiana 1','IPA','Katolik','MENUNGGU_VERIFIKASI_DAFTAR_ULANG',87.4,'SI','IF',0,0),
  (15,'Bayu Firmansyah','L','Tegal','SMA Negeri 1 Tegal','IPA','Islam','DAFTAR_ULANG_LUNAS',84.9,'IF','SI',0,0),
  (16,'Clara Natalia','P','Semarang','SMA Institut Indonesia','IPS','Katolik','TERDAFTAR',92.3,'SI','IF',0,0),
  (17,'Eko Nugroho','L','Purwokerto','SMA Negeri 1 Purwokerto','IPA','Islam','TERDAFTAR',88.8,'IF','SI',1,0),
  (18,'Intan Permata','P','Ambarawa','SMA Kristen Ambarawa','IPS','Kristen','PEMBAYARAN_DITOLAK',79.0,'SI','IF',0,1),
  (19,'Kevin Sutanto','L','Semarang','SMA Kristen Terang Bangsa','IPA','Buddha','SUBMITTED',81.6,'IF','SI',1,1),
  (20,'Ni Luh Ayu','P','Denpasar','SMA Negeri 1 Denpasar','IPA','Hindu','DRAFT',0,'SI','IF',0,0)
), 
 j AS (SELECT (SELECT id FROM jalur_masuk WHERE nama_jalur LIKE '%Reguler Prestasi%') j0, (SELECT id FROM jalur_masuk WHERE nama_jalur LIKE '%Mandiri%') j1),
 gel AS (SELECT (SELECT id FROM gelombang WHERE nama_gelombang LIKE '%Gelombang I (%') g0, (SELECT id FROM gelombang WHERE nama_gelombang LIKE '%Gelombang II (%') g1),
 ins_u AS (
  INSERT INTO users (email, password_hash, role, nama_lengkap, no_hp, is_email_verified, sumber_informasi, asal_sekolah)
  SELECT 'dummy.calon'||lpad(i::text,2,'0')||'@contoh.id',
         (SELECT password_hash FROM users WHERE email='calon@triputra.id'),
         'calon_mahasiswa', nm, '08123'||lpad((100000+i)::text,6,'0'), true,
         (ARRAY['INSTAGRAM','TEMAN','SEKOLAH','WEBSITE'])[1+i%4], sekolah
  FROM nama RETURNING id, email
 )
INSERT INTO pendaftar (user_id, nomor_pendaftaran, jalur_id, gelombang_id, status_pendaftaran, nik, tempat_lahir, tgl_lahir,
   jenis_kelamin, agama, alamat_lengkap, nama_ortu, no_hp_ortu, asal_sekolah, jurusan_sekolah, nilai_rapor_avg,
   prodi_pilihan_1, prodi_pilihan_2, created_at)
SELECT u.id, 'PMB-2026-D'||lpad(n.i::text,4,'0'),
   CASE n.jalur_i WHEN 0 THEN j.j0 ELSE j.j1 END, CASE n.gel_i WHEN 0 THEN gel.g0 ELSE gel.g1 END,
   n.status, '33740'||lpad((10000000000+n.i*7919)::text,11,'0'), n.kota,
   DATE '2007-01-15' + (n.i*37), n.jk, n.agama,
   'Jl. Contoh No. '||n.i||', '||n.kota, 'Orang Tua '||split_part(n.nm,' ',2), '08129'||lpad((100000+n.i)::text,6,'0'),
   n.sekolah, n.jurusan, n.nilai,
   (SELECT id FROM program_studi WHERE kode_prodi=n.prodi1), (SELECT id FROM program_studi WHERE kode_prodi=n.prodi2),
   NOW() - (21 - n.i) * INTERVAL '1 day'
FROM nama n JOIN ins_u u ON u.email='dummy.calon'||lpad(n.i::text,2,'0')||'@contoh.id', j, gel;
COMMIT;
