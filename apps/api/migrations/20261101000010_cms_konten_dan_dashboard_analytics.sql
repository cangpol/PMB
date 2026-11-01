-- =============================================================================
-- MIGRASI: CMS KONTEN DAN DASHBOARD ANALYTICS
-- =============================================================================

-- 1. TABEL BANNER SLIDER HOMEPAGE
CREATE TABLE IF NOT EXISTS cms_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    subjudul TEXT,
    gambar_url TEXT NOT NULL,
    link_url VARCHAR(255),
    urutan INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_banners_active ON cms_banners(is_active, urutan ASC);

-- 2. TABEL FAQ DINAMIS
CREATE TABLE IF NOT EXISTS cms_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('PENDAFTARAN', 'BIAYA_BEASISWA', 'UJIAN_CBT', 'DAFTAR_ULANG', 'UMUM')),
    pertanyaan TEXT NOT NULL,
    jawaban TEXT NOT NULL,
    urutan INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_faqs_kategori ON cms_faqs(kategori, urutan ASC);

-- 3. TABEL HALAMAN STATIS / KEBIJAKAN
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    judul VARCHAR(255) NOT NULL,
    konten TEXT NOT NULL,
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);

-- 4. PERLUASAN TABEL CMS_POSTS (BERITA & PENGUMUMAN)
ALTER TABLE cms_posts
    ADD COLUMN IF NOT EXISTS gambar_url TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS author_nama VARCHAR(100) DEFAULT 'Humas PMB UPITRA',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. SEEDING DATA AWAL CMS

-- Banners
INSERT INTO cms_banners (judul, subjudul, gambar_url, link_url, urutan, is_active)
VALUES 
    (
        'Penerimaan Mahasiswa Baru T.A. 2026/2027 Resmi Dibuka',
        'Raih beasiswa penuh dan kesempatan berkarir langsung di ekosistem Triputra Group.',
        '/assets/banner-pmb-2026.webp',
        '/register',
        1,
        TRUE
    ),
    (
        'Beasiswa Prestasi Triputra Future Leaders',
        'Bebas biaya kuliah 100% dan uang saku bulanan bagi siswa berprestasi nasional.',
        '/assets/banner-beasiswa-triputra.webp',
        '/jalur-masuk',
        2,
        TRUE
    ),
    (
        'Jalur Rekognisi Pembelajaran Lampau (RPL)',
        'Konversi pengalaman kerja dan alih kredit diploma menjadi gelar Sarjana dalam waktu lebih singkat.',
        '/assets/banner-jalur-rpl.webp',
        '/jalur-masuk',
        3,
        TRUE
    )
ON CONFLICT DO NOTHING;

-- FAQs
INSERT INTO cms_faqs (kategori, pertanyaan, jawaban, urutan, is_active)
VALUES 
    (
        'PENDAFTARAN',
        'Bagaimana langkah-langkah mendaftar PMB secara online?',
        'Pendaftaran dilakukan dalam 5 langkah praktis: (1) Buat akun di portal pendaftaran dengan email aktif dan NIK, (2) Bayar biaya formulir via Virtual Account / QRIS, (3) Lengkapi biodata dan unggah berkas syarat, (4) Ikuti tes potensi akademik CBT atau asesmen portofolio RPL, (5) Pantau pengumuman kelulusan dan lakukan registrasi ulang.',
        1,
        TRUE
    ),
    (
        'PENDAFTARAN',
        'Apakah siswa yang belum lulus sekolah/ijazah belum keluar bisa mendaftar?',
        'Bisa. Calon pendaftar yang sedang duduk di kelas 12 dapat menggunakan Surat Keterangan Aktif Sekolah atau Surat Keterangan Lulus (SKL) sementara serta transkrip nilai rapor semester 1-5.',
        2,
        TRUE
    ),
    (
        'BIAYA_BEASISWA',
        'Berapa biaya pendaftaran formulir dan apakah ada promo diskon?',
        'Biaya formulir pendaftaran standar adalah Rp 250.000. Tersedia potongan diskon khusus Rp 50.000 bagi pendaftar Gelombang 1 Early Bird menggunakan kode voucher resmi TRIPUTRA2026.',
        1,
        TRUE
    ),
    (
        'BIAYA_BEASISWA',
        'Bagaimana sistem Uang Kuliah Tunggal (UKT) di UPITRA?',
        'Sistem UKT di Universitas Pignatelli Triputra bersifat flat tanpa uang gedung tersembunyi. Biaya sudah mencakup SKS perkuliahan, praktikum laboratorium komputer, jas almamater, dan asuransi kesehatan mahasiswa per semester.',
        2,
        TRUE
    ),
    (
        'BIAYA_BEASISWA',
        'Apa saja syarat mendapatkan Beasiswa Triputra Group?',
        'Beasiswa diberikan melalui jalur Prestasi Akademik (nilai rapor rata-rata >= 85), jalur Prestasi Minat Bakat (juara kompetisi min. tingkat provinsi), dan jalur Kemitraan Karyawan/Keluarga Besar Triputra Group.',
        3,
        TRUE
    ),
    (
        'UJIAN_CBT',
        'Bagaimana teknis pelaksanaan ujian CBT online?',
        'Ujian CBT dapat dikerjakan secara fleksibel melalui portal PMB menggunakan laptop/komputer berlayar standar. Timer dihitung langsung secara terpusat oleh server dengan autosave jawaban otomatis.',
        1,
        TRUE
    ),
    (
        'UJIAN_CBT',
        'Materi apa saja yang diujikan dalam tes CBT PMB?',
        'Materi ujian terdiri dari 3 bagian: Tes Potensi Skolastik (TPS), Penalaran Logika & Numerik, serta Pemahaman Literasi Bahasa Indonesia dan Bahasa Inggris dasar.',
        2,
        TRUE
    ),
    (
        'DAFTAR_ULANG',
        'Kapan saya mendapatkan Nomor Induk Mahasiswa (NIM) resmi?',
        'NIM resmi diterbitkan secara otomatis oleh sistem saat calon mahasiswa telah melunasi tagihan registrasi daftar ulang dan seluruh berkas fisik/legalisir telah diverifikasi oleh tim admisi.',
        1,
        TRUE
    ),
    (
        'UMUM',
        'Di mana lokasi kampus Universitas Pignatelli Triputra?',
        'Kampus berlokasi strategis di Jl. Balapan No. 29, Klitren, Kec. Gondokusuman, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55222.',
        1,
        TRUE
    )
ON CONFLICT DO NOTHING;

-- Halaman Statis
INSERT INTO cms_pages (slug, judul, konten, meta_title, meta_description, is_published)
VALUES 
    (
        'syarat-ketentuan',
        'Syarat & Ketentuan Penerimaan Mahasiswa Baru',
        '<h2>1. Ketentuan Umum</h2><p>Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra dilaksanakan berdasarkan prinsip transparansi, objektivitas, akuntabilitas, dan non-diskriminatif. Setiap calon mahasiswa wajib mengisi data yang sah dan dapat dipertanggungjawabkan secara hukum.</p><h2>2. Keabsahan Dokumen</h2><p>Calon mahasiswa yang terbukti memalsukan dokumen atau memberikan data palsu akan didiskualifikasi secara otomatis dari proses seleksi tanpa pengembalian biaya formulir.</p><h2>3. Kebijakan Pembayaran</h2><p>Biaya formulir pendaftaran yang telah dibayarkan tidak dapat ditarik kembali (non-refundable). Biaya daftar ulang diatur sesuai dengan keputusan rektor mengenai penerimaan mahasiswa baru.</p>',
        'Syarat & Ketentuan PMB - Universitas Pignatelli Triputra',
        'Syarat dan ketentuan resmi pendaftaran mahasiswa baru Universitas Pignatelli Triputra.',
        TRUE
    ),
    (
        'kebijakan-privasi',
        'Kebijakan Privasi Perlindungan Data Pribadi',
        '<h2>1. Komitmen Perlindungan Data</h2><p>Universitas Pignatelli Triputra berkomitmen melindungi kerahasiaan dan keamanan data pribadi calon mahasiswa sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP).</p><h2>2. Penggunaan Data</h2><p>Data pribadi yang dikumpulkan melalui portal PMB hanya digunakan untuk keperluan verifikasi identitas, administrasi seleksi, penerbitan NIM resmi, serta pelaporan ke Pangkalan Data Pendidikan Tinggi (PDDikti) Kemendikbudristek.</p><h2>3. Keamanan Penyimpanan</h2><p>Seluruh berkas dokumen dan riwayat pendaftaran disimpan pada infrastruktur cloud terlindungi dengan enkripsi AES-256 dan protokol SSL/TLS.</p>',
        'Kebijakan Privasi Data PMB - Universitas Pignatelli Triputra',
        'Kebijakan privasi dan perlindungan data pribadi calon mahasiswa baru Universitas Pignatelli Triputra.',
        TRUE
    ),
    (
        'tentang-upitra',
        'Tentang Universitas Pignatelli Triputra',
        '<h2>Wajah Baru Pendidikan Unggul</h2><p>Universitas Pignatelli Triputra lahir dari kolaborasi visi Yayasan Santo Aloysius Gonzaga dan Triputra Group untuk menyelenggarakan pendidikan tinggi berkualitas kelas dunia yang berorientasi langsung pada integritas karakter dan kebutuhan industri modern.</p><h2>Kemitraan Strategis Triputra Group</h2><p>Mahasiswa UPITRA menikmati akses istimewa ke program magang terstruktur, beasiswa korporasi, serta jalur cepat rekrutmen profesional di berbagai lini bisnis Triputra Group yang mencakup agribisnis, manufaktur, logistik, pertambangan, dan teknologi informasi.</p>',
        'Tentang Kami - Universitas Pignatelli Triputra & Triputra Group',
        'Profil dan visi keunggulan Universitas Pignatelli Triputra bersama Triputra Group.',
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

-- Berita & Pengumuman Awal
INSERT INTO cms_posts (slug, judul, kategori, ringkasan, konten, gambar_url, tags, author_nama, is_published)
VALUES 
    (
        'pembukaan-pmb-gelombang-1-2026',
        'Pembukaan Resmi PMB Gelombang 1 T.A. 2026/2027',
        'PENGUMUMAN',
        'Universitas Pignatelli Triputra resmi membuka pendaftaran mahasiswa baru Gelombang 1 dengan promo potongan voucher dan prioritas penempatan kuota prodi.',
        '<p>Universitas Pignatelli Triputra secara resmi membuka Penerimaan Mahasiswa Baru Tahun Akademik 2026/2027 untuk jenjang Sarjana (S1) dan Diploma Tiga (D3). Calon mahasiswa dapat memilih 5 program studi unggulan yang dirancang relevan dengan transformasi digital dan industri manufaktur modern.</p><p>Pendaftaran Gelombang 1 dibuka mulai 1 Oktober hingga 31 Desember 2026. Manfaatkan kode voucher <strong>TRIPUTRA2026</strong> untuk mendapatkan potongan biaya pendaftaran sebesar Rp 50.000.</p>',
        '/assets/berita-pmb-gel1.webp',
        ARRAY['PMB 2026', 'Gelombang 1', 'Pendaftaran', 'Promo'],
        'Panitia PMB UPITRA',
        TRUE
    ),
    (
        'program-beasiswa-triputra-future-leaders-2026',
        'Program Beasiswa Penuh Triputra Future Leaders 2026',
        'BEASISWA',
        'Dapatkan beasiswa bebas biaya kuliah 100% dan uang saku bulanan dari Triputra Group untuk calon mahasiswa berprestasi.',
        '<p>Triputra Group melalui Universitas Pignatelli Triputra menyediakan beasiswa penuh bagi calon mahasiswa berprestasi di bidang akademik maupun talenta non-akademik. Program ini mencakup pembebasan biaya UKT 8 semester, uang saku pengembangan diri, dan mentoring karir berkala oleh jajaran pimpinan Triputra Group.</p><p>Seleksi beasiswa dilakukan melalui evaluasi nilai rapor, portofolio karya, dan wawancara panelis industri.</p>',
        '/assets/berita-beasiswa.webp',
        ARRAY['Beasiswa', 'Triputra Group', 'Prestasi', 'S1'],
        'Direktorat Kemahasiswaan',
        TRUE
    ),
    (
        'panduan-lengkap-ujian-cbt-online-pmb',
        'Panduan Teknis Pelaksanaan Ujian CBT PMB Online',
        'PANDUAN',
        'Simak panduan teknis persiapan perangkat, koneksi internet, dan tata tertib pengerjaan tes potensi akademik CBT online.',
        '<p>Tes Computer Based Test (CBT) PMB UPITRA dapat dikerjakan secara daring dari rumah masing-masing setelah berkas pendaftaran dinyatakan lengkap. Peserta diharapkan menggunakan peramban Google Chrome atau Mozilla Firefox versi terbaru dengan koneksi internet yang stabil.</p><p>Sistem dilengkapi autosave otomatis setiap kali memilih opsi jawaban dan timer terpusat yang menjamin keadilan bagi seluruh peserta.</p>',
        '/assets/berita-panduan-cbt.webp',
        ARRAY['Panduan', 'CBT', 'Ujian Online'],
        'Pusat Teknologi Informasi',
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

