# Panduan Deployment Produksi & Pemulihan Bencana (Disaster Recovery)
## Sistem Penerimaan Mahasiswa Baru (PMB) &mdash; Universitas Pignatelli Triputra (UPITRA)

Dokumen ini memuat prosedur resmi pemasangan, konfigurasi keamanan, pemantauan, serta tata cara pemulihan bencana (*Disaster Recovery*) untuk sistem PMB Universitas Pignatelli Triputra di lingkungan produksi.

---

## 1. Persyaratan Sistem & Arsitektur Server

### Spesifikasi Minimum Infrastruktur
- **Sistem Operasi**: Linux Ubuntu 22.04 LTS / Debian 12 (Bookworm) 64-bit
- **CPU**: 4 vCPU (Disarankan AMD EPYC / Intel Xeon generasi terbaru)
- **RAM**: 8 GB ECC RAM (Minimal 4 GB untuk beban operasional standar)
- **Penyimpanan**: SSD/NVMe 50 GB ke atas (Direkomendasikan konfigurasi RAID-1)
- **Jaringan**: IP Publik Statis, Bandwidth minimum 50 Mbps, domain aktif `pmb.upitra.ac.id` dengan sertifikat SSL/TLS.
- **Perangkat Lunak**:
  - Docker Engine v26.0+
  - Docker Compose v2.26+
  - `curl`, `gzip`, `openssl`, `git`

### Arsitektur Jaringan Kontainer
```
[ Internet / Calon Mahasiswa / Admin ]
                │
         HTTPS (Port 443) / HTTP (Port 80 -> 301 Redirect)
                ▼
      ┌──────────────────┐
      │  Reverse Proxy   │ (Nginx 1.27 Alpine, SSL Termination, Gzip, Security Headers)
      └─────────┬────────┘
                │
       [ Jaringan Internal Terisolasi (pmb-internal) ]
         ├──► Web SPA (React Vite / Nginx:80)
         ├──► Backend API (Rust Axum:8080)
         │       ├──► PostgreSQL 16 (pmb_prod_db:5432)
         │       ├──► Redis 7 Alpine (Auth Cache & Rate Limiting:6379)
         │       └──► MinIO S3 (Penyimpanan Berkas:9000)
         └──► DB-Backup Daemon (Automated Daily Cron at 02:00 WIB)
```

---

## 2. Persiapan Keamanan & Variabel Lingkungan

### 2.1 Konfigurasi Berkas `.env`
Salin template konfigurasi resmi dan amankan hak akses berkas:
```bash
cp .env.example .env
chmod 600 .env
```

Isi seluruh nilai rahasia di dalam berkas `.env` dengan kredensial produksi:
```ini
# Status Lingkungan
APP_ENV=production
API_HOST=0.0.0.0
PORT=8080
CORS_ORIGIN=https://pmb.upitra.ac.id

# Database PostgreSQL
POSTGRES_DB=pmb_prod_db
POSTGRES_USER=pmb_prod_user
POSTGRES_PASSWORD=<KATA_SANDI_ACAK_MINIMAL_32_KARAKTER>

# Redis In-Memory Cache & Session
REDIS_PASSWORD=<KATA_SANDI_ACAK_MINIMAL_32_KARAKTER>

# Enkripsi & Token Sesi
SESSION_SECRET=<STRING_ACAK_MINIMAL_64_KARAKTER_HEX_ATAU_BASE64>

# MinIO S3 Object Storage
S3_ACCESS_KEY=<KUNCI_AKSES_S3_PRODUKSI>
S3_SECRET_KEY=<KUNCI_RAHASIA_S3_PRODUKSI>
S3_BUCKET=pmb-berkas-prod

# Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=Mid-server-ProdKey...
MIDTRANS_CLIENT_KEY=Mid-client-ProdKey...
MIDTRANS_IS_PRODUCTION=true
```

> [!WARNING]
> Jangan pernah menggunakan kredensial bawaan (*default*) seperti `minioadmin`, `pmb_password`, atau token sesi contoh pada peladen produksi!

### 2.2 Pemasangan Sertifikat SSL/TLS
Letakkan berkas sertifikat SSL valid pada direktori `docker/ssl/live/`:
- `docker/ssl/live/upitra.crt` (Sertifikat Fullchain)
- `docker/ssl/live/upitra.key` (Kunci Privat SSL)

Atur hak akses kunci privat:
```bash
chmod 600 docker/ssl/live/upitra.key
```

---

## 3. Langkah Peluncuran (*Deployment*)

1. **Unduh Repositori Kode Sumber**:
   ```bash
   git clone https://github.com/upitra/pmb-core.git /opt/pmb-upitra
   cd /opt/pmb-upitra
   ```

2. **Kompilasi & Luncurkan Seluruh Layanan**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. **Verifikasi Status Kontainer**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
   Pastikan seluruh kontainer berstatus `Up (healthy)` atau `Up`.

4. **Verifikasi Endpoint Pemeriksaan Kesehatan (Health Probes)**:
   ```bash
   # Uji Liveness (Menilai apakah proses HTTP aktif)
   curl -I https://pmb.upitra.ac.id/api/health/live

   # Uji Readiness (Menilai koneksi database & pool thread siap)
   curl -i https://pmb.upitra.ac.id/api/health/ready
   ```
   Kedua probe harus mengembalikan status `HTTP/2 200 OK` dengan payload JSON `{"status":"ok"}`.

---

## 4. Prosedur Pencadangan & Pemulihan (*Backup & Disaster Recovery*)

### 4.1 Pencadangan Terjadwal Otomatis
Layanan kontainer `pmb-prod-db-backup` secara otomatis mengeksekusi skrip `scripts/backup_postgres.sh` setiap hari pada pukul **02:00 WIB**.
- File backup dikompresi menggunakan format `gzip` (`pmb_backup_YYYYMMDD_HHMMSS.sql.gz`).
- Masa retensi otomatis (*data retention*) adalah **14 hari**. Backup lama yang melebihi masa retensi akan dihapus otomatis untuk menghemat ruang disk.

### 4.2 Pencadangan Manual
Untuk memicu pencadangan seketika sebelum melakukan update aplikasi atau perubahan skema:
```bash
docker exec -t pmb-prod-db-backup /usr/local/bin/backup_postgres.sh
```

### 4.3 Prosedur Pemulihan (*Restore*)
Jika terjadi kegagalan sistem atau kehilangan integritas data, lakukan pemulihan dengan langkah berikut:

1. **Hentikan layanan backend API agar tidak ada transaksi baru**:
   ```bash
   docker compose -f docker-compose.prod.yml stop api web
   ```

2. **Pilih berkas arsip backup yang akan dipulihkan**:
   ```bash
   docker exec -it pmb-prod-db-backup ls -lh /backups
   ```

3. **Jalankan skrip pemulihan**:
   ```bash
   docker exec -it pmb-prod-db-backup /bin/sh -c \
     "/usr/local/bin/restore_postgres.sh /backups/pmb_backup_20261101_020000.sql.gz"
   ```

4. **Nyalakan kembali seluruh layanan**:
   ```bash
   docker compose -f docker-compose.prod.yml start api web
   ```

5. **Verifikasi integritas data**:
   Periksa dashboard admin dan verifikasi bahwa data pendaftar dan transaksi telah pulih seutuhnya.

---

## 5. Pemeliharaan & Pembaruan Aplikasi (*Rolling Upgrade*)

Saat merilis pembaruan versi tanpa *downtime* signifikan:
```bash
# 1. Ambil kode terbaru
git pull origin main

# 2. Build ulang image kontainer API & Web
docker compose -f docker-compose.prod.yml build api web

# 3. Jalankan kontainer baru
docker compose -f docker-compose.prod.yml up -d --no-deps api web

# 4. Bersihkan image usang
docker image prune -f
```

