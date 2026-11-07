-- =========================================================================
-- Migrasi: Kurikulum RPL & langkah RPL untuk kode prodi/jalur yang berlaku
-- Versi: 20261107000015
--
-- Migrasi 20261101000009 mengisi mata kuliah dengan kode prodi lama
-- ('IF-01', 'AKT-01', 'MNJ-01') yang sudah diganti, dan mendaftarkan langkah
-- RPL sebelum jalur RPL dibuat oleh seed. Akibatnya kurikulum kosong dan jalur
-- RPL tidak dikenali. File ini idempoten: seed menjalankannya ulang setelah
-- membuat prodi & jalur, sehingga database baru maupun lama sama-sama terisi.
-- =========================================================================

INSERT INTO mata_kuliah (prodi_id, kode_mk, nama_mk, sks, semester, silabus_ringkas)
SELECT ps.id, mk.kode_mk, mk.nama_mk, mk.sks, mk.semester, mk.silabus
FROM (VALUES
    ('IF',  'IF101',  'Algoritma & Pemrograman Dasar', 3, 1, 'Konsep algoritma, struktur kontrol, fungsi, dan dasar pemrograman'),
    ('IF',  'IF201',  'Struktur Data', 3, 2, 'Array, linked list, stack, queue, pohon, graf, dan kompleksitas algoritma'),
    ('IF',  'IF301',  'Sistem Basis Data', 3, 3, 'Perancangan ERD, normalisasi, SQL relasional, dan transaksi'),
    ('IF',  'IF401',  'Jaringan Komputer', 3, 4, 'Protokol TCP/IP, routing, switching, dan dasar keamanan jaringan'),
    ('IF',  'IF501',  'Pemrograman Web', 3, 5, 'Frontend, REST API, dan deployment aplikasi web'),
    ('SI',  'SI101',  'Pengantar Sistem Informasi', 3, 1, 'Komponen, jenis, dan peran sistem informasi dalam organisasi'),
    ('SI',  'SI201',  'Analisis & Perancangan Sistem', 3, 3, 'Analisis kebutuhan, pemodelan proses bisnis, dan UML'),
    ('SI',  'SI301',  'Manajemen Proyek Sistem Informasi', 3, 5, 'Perencanaan, penjadwalan, anggaran, dan pengendalian proyek TI'),
    ('SI',  'SI401',  'Enterprise Resource Planning', 3, 6, 'Konsep dan implementasi ERP pada proses bisnis'),
    ('SE',  'SE101',  'Dasar Pemrograman', 3, 1, 'Logika pemrograman, tipe data, dan struktur kontrol'),
    ('SE',  'SE201',  'Rekayasa Kebutuhan Perangkat Lunak', 3, 3, 'Elisitasi, spesifikasi, dan validasi kebutuhan'),
    ('SE',  'SE301',  'Pengujian Perangkat Lunak', 3, 4, 'Unit test, integration test, dan otomasi pengujian'),
    ('SE',  'SE401',  'Arsitektur Perangkat Lunak', 3, 5, 'Pola arsitektur, desain modular, dan layanan terdistribusi'),
    ('MNJ', 'MNJ101', 'Pengantar Manajemen', 3, 1, 'Fungsi perencanaan, pengorganisasian, kepemimpinan, dan pengendalian'),
    ('MNJ', 'MNJ201', 'Manajemen Pemasaran', 3, 2, 'Bauran pemasaran, perilaku konsumen, dan riset pasar'),
    ('MNJ', 'MNJ301', 'Manajemen Sumber Daya Manusia', 3, 3, 'Rekrutmen, pelatihan, penilaian kinerja, dan kompensasi'),
    ('MNJ', 'MNJ401', 'Manajemen Keuangan', 3, 4, 'Analisis laporan keuangan, penganggaran modal, dan struktur modal'),
    ('AKT', 'AKT101', 'Pengantar Akuntansi', 3, 1, 'Siklus akuntansi, jurnal penyesuaian, dan laporan keuangan dasar'),
    ('AKT', 'AKT201', 'Akuntansi Keuangan Menengah', 3, 3, 'Standar PSAK, aset, liabilitas, dan ekuitas'),
    ('AKT', 'AKT301', 'Perpajakan', 3, 4, 'PPh, PPN, dan kepatuhan pajak badan maupun orang pribadi'),
    ('AKT', 'AKT401', 'Auditing', 3, 5, 'Standar audit, pengendalian internal, dan prosedur pemeriksaan'),
    ('PAR', 'PAR101', 'Pengantar Pariwisata', 3, 1, 'Konsep, sistem, dan industri pariwisata'),
    ('PAR', 'PAR201', 'Manajemen Perhotelan', 3, 3, 'Operasional kantor depan, tata graha, dan layanan tamu'),
    ('PAR', 'PAR301', 'Manajemen Perjalanan Wisata', 3, 4, 'Perencanaan paket wisata dan operasional biro perjalanan'),
    ('PAR', 'PAR401', 'Pemasaran Destinasi', 3, 5, 'Branding destinasi dan pemasaran digital pariwisata'),
    ('BIG', 'BIG101', 'English Grammar', 3, 1, 'Struktur kalimat, tenses, dan tata bahasa Inggris'),
    ('BIG', 'BIG201', 'Academic Writing', 3, 3, 'Penulisan esai dan karya ilmiah berbahasa Inggris'),
    ('BIG', 'BIG301', 'Translation', 3, 4, 'Teori dan praktik penerjemahan Inggris–Indonesia'),
    ('BIG', 'BIG401', 'English for Specific Purposes', 3, 5, 'Bahasa Inggris untuk bisnis, pariwisata, dan profesi'),
    ('K3',  'K3101',  'Dasar Keselamatan dan Kesehatan Kerja', 3, 1, 'Konsep K3, regulasi, dan budaya keselamatan'),
    ('K3',  'K3201',  'Identifikasi Bahaya & Penilaian Risiko', 3, 3, 'HIRARC, JSA, dan pengendalian risiko'),
    ('K3',  'K3301',  'Higiene Industri', 3, 4, 'Faktor fisik, kimia, biologi, dan ergonomi di tempat kerja'),
    ('K3',  'K3401',  'Sistem Manajemen K3', 3, 5, 'SMK3, ISO 45001, dan audit K3'),
    ('FIS', 'FIS101', 'Anatomi Fungsional', 3, 1, 'Anatomi sistem muskuloskeletal dan saraf'),
    ('FIS', 'FIS201', 'Kinesiologi', 3, 2, 'Analisis gerak tubuh manusia'),
    ('FIS', 'FIS301', 'Fisioterapi Muskuloskeletal', 3, 4, 'Asesmen dan intervensi gangguan muskuloskeletal'),
    ('FIS', 'FIS401', 'Fisioterapi Neuromuskular', 3, 5, 'Asesmen dan intervensi gangguan neuromuskular'),
    ('KEP', 'KEP101', 'Konsep Dasar Keperawatan', 3, 1, 'Falsafah, paradigma, dan proses keperawatan'),
    ('KEP', 'KEP201', 'Keperawatan Medikal Bedah', 3, 3, 'Asuhan keperawatan pada gangguan sistem tubuh dewasa'),
    ('KEP', 'KEP301', 'Keperawatan Maternitas', 3, 4, 'Asuhan keperawatan ibu hamil, bersalin, dan nifas'),
    ('KEP', 'KEP401', 'Keperawatan Gawat Darurat', 3, 5, 'Triase, bantuan hidup dasar, dan penanganan kegawatan')
) AS mk(kode_prodi, kode_mk, nama_mk, sks, semester, silabus)
JOIN program_studi ps ON ps.kode_prodi = mk.kode_prodi
ON CONFLICT (prodi_id, kode_mk) DO NOTHING;

-- Langkah RPL untuk setiap jalur bertipe seleksi RPL yang belum memilikinya
INSERT INTO definisi_langkah (jalur_id, kode_langkah, judul_langkah, deskripsi, tipe_langkah, urutan, wajib, syarat_lanjut)
SELECT j.id, 'LANGKAH_RPL', 'Asesmen & Portofolio RPL',
       'Pengisian riwayat pendidikan & pengalaman kerja, unggah portofolio, dan pengajuan konversi SKS mata kuliah',
       'rpl', 3, TRUE, '{}'::jsonb
FROM jalur_masuk j
WHERE (j.tipe_seleksi = 'RPL' OR j.kode_jalur = 'JALUR-RPL')
  AND NOT EXISTS (
      SELECT 1 FROM definisi_langkah d WHERE d.jalur_id = j.id AND d.tipe_langkah = 'rpl'
  );
