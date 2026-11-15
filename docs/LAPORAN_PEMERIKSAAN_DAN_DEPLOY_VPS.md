# Laporan Pemeriksaan, Keamanan, dan Panduan Deploy VPS
Sistem PMB Universitas Pignatelli Triputra — diperiksa 12 November 2026

Dokumen ini memuat (1) hasil pemeriksaan error, (2) hasil pemeriksaan keamanan beserta perbaikan yang sudah dilakukan, (3) temuan yang masih terbuka, (4) langkah deploy ke VPS, dan (5) saran pengembangan.

## 1. Hasil pemeriksaan error

| Pemeriksaan | Hasil |
|---|---|
| `cargo test` (backend) | 112 lulus, 0 gagal (9 tes database ditandai ignore; saat dijalankan dengan `DATABASE_URL` lulus) |
| `cargo clippy` | 0 error, 1 peringatan gaya (tipe kompleks / if yang bisa digabung), tidak berdampak |
| `vitest` (frontend) | semua lulus |
| `tsc -b` dan `vite build` | bersih |
| `npm audit --omit=dev` | 0 kerentanan |
| `cargo audit` | belum dijalankan (alat belum terpasang). Jalankan `cargo install cargo-audit && cargo audit` sebelum rilis |
| ESLint | belum ada berkas konfigurasi `eslint.config.*`, jadi lint tidak berjalan |
| Tes E2E Playwright | tidak dijalankan pada pemeriksaan ini |
| Tampilan di browser | belum diuji manual |

Tidak ada error baru yang ditemukan pada tes otomatis. Masalah yang ditemukan bersifat konfigurasi dan keamanan, lihat bagian berikut.

## 2. Pemeriksaan keamanan

### Yang sudah baik
- Semua endpoint di dokumen API (198 endpoint) diuji tanpa login. Yang terbuka hanya endpoint publik yang memang seharusnya terbuka: login, register, lupa password, konten CMS, data master, cek kelulusan, kontak, prospek, health, dan webhook pembayaran.
- Pemeriksaan kode menunjukkan semua handler lain memakai pemeriksaan peran (`RequireAdmin`, `RequireSuperAdmin`, `AuthUser`, dan sejenisnya).
- Webhook Midtrans memverifikasi tanda tangan. Webhook mock dimatikan otomatis saat `APP_ENV=production`.
- Password memakai Argon2. Ada penguncian akun 15 menit setelah 5 kali gagal login, dan pencegahan timing attack saat login.
- Header keamanan lengkap (HSTS di Nginx produksi, CSP, X-Frame-Options, nosniff). Respons API tidak disimpan di cache.
- Validasi unggahan berkas memeriksa ekstensi dan tipe MIME di browser, dan kini juga isi berkas (magic bytes) di server. Akses berkas memakai URL bertoken berumur pendek.
- Kontainer API berjalan sebagai pengguna non-root. Database, Redis, dan MinIO berada di jaringan internal tanpa port yang dibuka ke publik.
- Berkas `.env` masuk `.gitignore`; yang ter-commit hanya `.env.example`.

### Perbaikan yang sudah dilakukan hari ini
1. **Unggah berkas tidak akan berfungsi di VPS (kritis).** URL unggah ditandatangani dengan alamat internal `minio:9000` yang tidak bisa dijangkau browser. Solusinya: berkas kini disimpan di disk server aplikasi (`UPLOAD_DIR`, volume `upload-data`) dan diakses lewat URL bertoken `/api/files/...` pada domain yang sama. MinIO dihapus dari compose. Lihat bagian 5.
2. **Cookie sesi tanpa flag `Secure` di produksi.** `docker-compose.prod.yml` tidak mengatur `COOKIE_SECURE`, sehingga bawaannya `false`. Sekarang diset `true`.
3. **API tidak bisa keluar ke internet.** API hanya ada di jaringan `internal: true`, sehingga pengiriman email (SMTP) dan Midtrans akan gagal. API kini juga tergabung di `pmb-public` (tanpa port yang dipublikasikan). Variabel SMTP, `PAYMENT_GATEWAY_PROVIDER`, dan `WAJIB_VERIFIKASI_EMAIL` juga sebelumnya tidak diteruskan ke kontainer dan sekarang sudah diteruskan.
4. **Server menolak start dengan konfigurasi produksi berbahaya.** Saat `APP_ENV=production`, server berhenti bila `COOKIE_SECURE` bukan `true`, kunci MinIO masih `minioadmin`, atau kredensial database masih bawaan. Server hanya memberi peringatan di log bila payment masih `mock`, `SESSION_SECRET` bawaan, atau `CORS_ORIGIN` masih memuat localhost.
5. **Memori rate limiter bisa dibanjiri.** Setiap email/kunci baru disimpan selamanya. Kini kunci lama dibuang otomatis.
6. **Cek kelulusan publik dan formulir prospek bisa disalahgunakan.** Ditambahkan batas per nomor pendaftaran (20/menit), batas global cek kelulusan (600/menit), dan batas global formulir prospek (300/jam). Sudah dicoba: permintaan ke-21 mendapat HTTP 429.
7. **Manajemen pengguna oleh Super Admin** (sesi sebelumnya) mencatat semua aksi ke audit log, dan melindungi akun sendiri serta akun Super Admin.

### Temuan yang masih terbuka (urut prioritas)

**Tinggi**
- **Akun demo dan `seed`.** Image API berisi binari `seed` yang membuat akun demo dengan password diketahui (`Pignatelli2026!`) dan jalur contoh. **Jangan jalankan `seed` di produksi.** Belum ada cara aman untuk membuat Super Admin pertama di produksi; saran: tambah perintah CLI `buat-superadmin` (bisa saya kerjakan). Sementara itu, buat dengan SQL memakai hash Argon2.
- **Pembayaran masih mode `mock` secara bawaan.** Selama Midtrans belum diisi, pembayaran otomatis tidak nyata. Alur bukti transfer manual tetap berjalan.
- **Backup masih satu server.** Skrip backup kini mencadangkan database dan folder berkas unggahan (arsip `pmb_uploads_*.tar.gz`), tetapi tersimpan di volume VPS yang sama. Belum ada salinan di luar server; bila disk VPS rusak, semuanya hilang.
- **Sesi dan rate limiter tersimpan di memori API.** Akibatnya: (a) setiap restart/deploy memaksa semua pengguna login ulang, (b) hanya boleh satu instance API. Dokumen deployment menyebut Redis dipakai untuk ini, padahal kodenya belum memakainya.

**Sedang**
- **Nama lengkap tampil di cek kelulusan publik.** Siapa pun yang menebak nomor pendaftaran bisa melihat nama dan status kelulusan. Saran: samarkan nama (mis. "Budi S****") atau minta tanggal lahir sebagai pembuktian kedua. Ini keputusan kebijakan kampus, jadi belum saya ubah.
- **Penguncian akun bisa dipakai untuk menyerang.** Lockout dihitung per email, sehingga orang lain bisa mengunci akun siapa pun selama 15 menit dengan 5 percobaan salah. Tambahkan batas per alamat IP di Nginx (`limit_req`) dan pertimbangkan CAPTCHA pada login/registrasi.
- **Tidak ada batas laju per IP di mana pun.** API tidak membaca alamat klien. Batasi lewat Nginx (`limit_req_zone`) untuk `/api/auth/` dan endpoint publik.
- **CSP masih memakai `'unsafe-inline'` untuk script.** Melemahkan perlindungan XSS. Perketat bertahap bila memungkinkan.
- **Tidak ada autentikasi dua faktor** untuk Super Admin dan Admin PMB.

**Rendah**
- `apps/api/openapi.json` sudah usang (tidak memuat endpoint baru, termasuk manajemen pengguna). Ekspor ulang dengan binari API.
- Belum ada ESLint, `cargo audit`, dan pemindaian dependensi di CI.
- Satu peringatan clippy.
- Data hasil uji (prospek "Uji Coba Popup", "Uji Konsultasi") masih ada di database dev, bukan produksi.

## 3. Panduan deploy ke VPS

Arsitektur sudah disiapkan di `docker-compose.prod.yml` (Nginx + SSL, API Rust, web, PostgreSQL 16, Redis, MinIO, backup harian). Panduan lengkap lama ada di `docs/deployment_guide.md`; berikut urutan praktisnya dengan perubahan hari ini.

**Spesifikasi VPS:** minimal 2 vCPU, 4 GB RAM, SSD 40 GB (disarankan 4 vCPU / 8 GB saat puncak pendaftaran), Ubuntu 22.04/24.04.

1. **Persiapan server**
   - Buat user non-root dengan sudo, login SSH memakai kunci, matikan login password dan login root.
   - Firewall: `ufw allow 22,80,443/tcp` lalu `ufw enable`. Jangan buka 5432, 6379, 9000.
   - Pasang Docker Engine dan Docker Compose v2, `fail2ban`, dan `unattended-upgrades`.
2. **Domain dan SSL**
   - Arahkan DNS `pmb.upitra.ac.id` ke IP VPS.
   - Terbitkan sertifikat (mis. certbot standalone atau sertifikat dari kampus), lalu letakkan sebagai `docker/ssl/live/upitra.crt` dan `docker/ssl/live/upitra.key` (nama ini yang dibaca `docker/nginx/nginx.conf`). Siapkan pembaruan otomatis.
3. **Ambil kode**
   - `git clone` repositori ke `/opt/pmb`. Commit dulu perubahan lokal (saat ini banyak yang belum di-commit sejak 1799f87) agar server memakai versi yang sama dengan yang diuji.
4. **Buat `.env` produksi** (`chmod 600`, jangan di-commit). Hasilkan rahasia dengan `openssl rand -base64 32`.
   - Wajib: `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, dan `SESSION_SECRET` (acak, minimal 32 karakter; juga dipakai menandatangani tautan berkas, jadi server menolak start bila bawaan).
   - `CORS_ORIGIN=https://pmb.upitra.ac.id`. Folder berkas (`UPLOAD_DIR=/app/uploads`) sudah diatur di compose dan disimpan di volume `upload-data`.
   - Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`. Tanpa ini, email verifikasi dan notifikasi tidak terkirim.
   - Pembayaran: isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, dan set `PAYMENT_GATEWAY_PROVIDER` sesuai penyedia, atau biarkan `mock` bila hanya memakai bukti transfer manual.
5. **Jalankan**
   - `docker compose -f docker-compose.prod.yml up -d --build`
   - Migrasi database berjalan otomatis saat API start. Cek `docker compose -f docker-compose.prod.yml logs api` dan pastikan tidak ada pesan "KONFIGURASI PRODUKSI TIDAK AMAN".
6. **Data awal**
   - Buat Super Admin pertama (lihat temuan "seed" di atas). Jangan pakai `seed`.
   - Isi master data lewat halaman admin: tahun akademik, fakultas/prodi, jalur masuk, gelombang, rekening pembayaran, pengaturan PMB/kontak, dan **Rincian Biaya Kuliah**. Data biaya di laptop dev pernah hilang; di produksi data ini harus dibackup.
7. **Uji asap sebelum diumumkan**
   - `https://pmb.upitra.ac.id/health` mengembalikan OK.
   - Daftar akun calon, terima email verifikasi, unggah satu berkas (menguji penyimpanan `upload-data`), ajukan pembayaran, verifikasi sebagai admin, lalu unduh LoA.
   - Cek di browser bahwa cookie sesi bertanda `Secure` dan `HttpOnly`.
8. **Backup dan pemantauan**
   - Salin hasil backup (`pmb_backup_*.sql.gz` dan `pmb_uploads_*.tar.gz`) ke luar server setiap hari (mis. `rclone` ke penyimpanan cloud atau server lain). Uji pemulihan (`scripts/restore_postgres.sh`) minimal sekali sebelum launching.
   - Pasang pemantauan uptime pada `/health` dan notifikasi saat disk di atas 80%.
9. **Update berikutnya**
   - `git pull && docker compose -f docker-compose.prod.yml up -d --build`. Lakukan di luar jam ramai karena semua pengguna akan login ulang (sesi di memori).
   - Rollback: `git checkout <commit lama>` lalu build ulang; backup database sebelum setiap update yang memuat migrasi.

## 4. Saran pengembangan (urutan manfaat)
1. Perintah CLI `buat-superadmin` dan pemisahan `seed` demo dari data produksi.
2. Salinan backup di luar server; uji pemulihan terjadwal.
3. Pindahkan sesi dan rate limiter ke Redis (Redis sudah tersedia di compose) supaya deploy tidak memutus sesi dan bisa memakai lebih dari satu instance.
4. Batas laju per IP di Nginx dan CAPTCHA pada login, registrasi, dan formulir publik.
5. Samarkan data pribadi pada cek kelulusan publik (keputusan kebijakan).
6. 2FA untuk akun admin; log audit yang bisa dilihat di halaman admin.
7. CI: `cargo test`, `clippy`, `cargo audit`, `npm audit`, `vitest`, `tsc`, dan E2E Playwright pada setiap push.
8. Perketat CSP (hilangkan `unsafe-inline`), tambahkan ESLint, dan ekspor ulang `openapi.json`.
9. Uji beban sebelum puncak pendaftaran (`scripts/load_test.cjs` sudah ada) dan tinjau ukuran pool koneksi database (kini maksimal 10).

## 5. Penyimpanan berkas (perubahan 12 November 2026)

- Berkas calon (berkas pendaftaran, bukti bayar, daftar ulang, portofolio RPL) disimpan di folder `UPLOAD_DIR` pada server aplikasi, dipisah per folder: `berkas/`, `bukti/`, `daftar_ulang/`, `rpl/`. Media berita/banner di `cms/media/`.
- **Nama file:** `nama-calon_jenis_YYYYMMDD-HHMMSS_kode.ext` (waktu WIB), contoh `budi-santoso_ktp_20261112-153045_a1b2c3d4.pdf`. `kode` adalah 8 karakter pertama ID pendaftar; dipakai server untuk memastikan berkas milik pendaftar yang sama.
- **Database** hanya menyimpan nama file itu (kolom `file_key`), tanpa folder atau alamat server. Nilai lama yang masih berisi folder tetap dapat dibaca.
- **Akses:** API memberi URL bertoken berumur pendek (`/api/files/upload/...`, `/api/files/download/...`) pada domain yang sama, sehingga tidak ada lagi masalah alamat seperti `minio:9000`. Token ditandatangani dengan `SESSION_SECRET` dan memuat metode, nama berkas, batas ukuran, dan masa berlaku. Media CMS dapat dibuka publik hanya di bawah `cms/media/`.
- **Pemeriksaan di server:** batas ukuran, isi berkas harus sesuai ekstensi (PDF/JPG/PNG/WEBP), kunci berkas tidak boleh keluar dari folder (anti path traversal), dan berkas harus sudah ada di disk sebelum dikonfirmasi.
- **Docker:** MinIO dihapus dari `docker-compose.yml` dan `docker-compose.prod.yml`. Folder berkas berada di volume `upload-data`; tanpa volume ini berkas hilang saat kontainer dibuat ulang. Variabel `S3_*` tidak dipakai lagi.
- **Konsekuensi:** hanya satu instance API yang boleh menulis ke folder ini (sama seperti keterbatasan sesi di memori). Berkas yang sudah ada di MinIO lama tidak otomatis dipindahkan; pindahkan manual ke folder yang sesuai bila diperlukan.
