# Sistem Penerimaan Mahasiswa Baru (PMB)
## Universitas Pignatelli Triputra

Sistem Penerimaan Mahasiswa Baru (PMB) terintegrasi berbasis web dan API berkinerja tinggi untuk Universitas Pignatelli Triputra. Dibangun dengan arsitektur monolit modular di Rust (Axum), SPA responsif di React + TypeScript + Vite, serta infrastruktur kontainerisasi Docker Compose.

---

## 1. Arsitektur & Teknologi (Tech Stack)

### Backend (`apps/api`)
- **Bahasa & Runtime:** Rust (2024 edition), Tokio Asynchronous Runtime.
- **Web Framework:** Axum 0.8 dengan Tower-HTTP (CORS, Trace, Compression).
- **Database & Cache:** PostgreSQL 16 (via SQLx dengan compile-time query validation & migrasi otomatis), Redis 7 (manajemen sesi server-side & rate limiting).
- **Keamanan:** Password hashing Argon2, cookie session httpOnly (SameSite=Lax), sliding-window rate limiting, role-based access control (RBAC), audit logging mutasi admin.
- **Dokumentasi API:** utoipa (OpenAPI 3.1) & Swagger UI di `/api/docs`.
- **Penyimpanan Berkas:** MinIO (S3-compatible object storage) dengan akses via presigned short-lived URL.

### Frontend (`apps/web`)
- **Library & Build Tool:** React 19, TypeScript strict mode, Vite 8.
- **Routing & State:** React Router v7, TanStack Query v5.
- **Form & Validasi:** React Hook Form + Zod.
- **Styling & Ikon:** Tailwind CSS v4, Lucide React, Motion.
- **Tipografi:** Heading serif elegan (`Cormorant Garamond`), body sans modern (`Plus Jakarta Sans`) via `@fontsource` (self-hosted).
- **Desain Warna Eksklusif:** Hanya token biru (`biru-950` hingga `biru-50`) dan putih (`#FFFFFF`). Tidak menggunakan warna merah, hijau, kuning, atau abu-abu netral.

---

## 2. Struktur Direktori Monorepo

```text
.
├── .editorconfig                # Standar pemformatan lintas editor
├── .env.example                 # Template konfigurasi variabel lingkungan
├── .github/workflows/ci.yml     # Pipeline otomatisasi CI GitHub Actions
├── .gitignore                   # Konfigurasi pengabaian Git
├── docker-compose.yml           # Orkestrasi Postgres 16, Redis 7, MinIO, API, Web
├── README.md                    # Panduan dokumentasi proyek
├── apps/
│   ├── api/                     # Backend Rust (Axum)
│   │   ├── Dockerfile           # Multi-stage build API
│   │   ├── migrations/          # Berkas migrasi skema SQLx
│   │   ├── src/
│   │   │   ├── bin/seed.rs      # Script seeding database dev idempoten
│   │   │   ├── modules/         # Modular domain: auth, master, pendaftaran,
│   │   │   │                    # pembayaran, ujian, kelulusan, cms, dashboard, health
│   │   │   ├── security/        # Argon2, rate limiter, audit log, session store
│   │   │   ├── error.rs         # Tipe penanganan error terpusat
│   │   │   ├── openapi.rs       # Definisi spesifikasi OpenAPI
│   │   │   └── main.rs          # Entrypoint server Axum
│   │   └── tests/               # Unit & integration test logika bisnis murni
│   └── web/                     # Frontend React (Vite + TypeScript)
│       ├── Dockerfile           # Multi-stage build Nginx SPA
│       ├── nginx.conf           # Konfigurasi reverse proxy & SPA fallback
│       ├── src/
│       │   ├── assets/          # Logo & aset grafis resmi
│       │   ├── components/      # Button, Card, StatusBadge, Skeleton, EmptyState, ErrorState
│       │   ├── pages/
│       │   │   ├── public/      # Beranda, Program Studi, Biaya/Jalur, Pengumuman, Login, Register
│       │   │   ├── portal/      # Dashboard Calon, Formulir, Berkas, Tagihan, CBT, Kelulusan
│       │   │   └── admin/       # Dashboard Admin, Verifikasi Berkas, Keuangan, Pleno Kelulusan, Master Data
│       │   └── types/api.d.ts   # Kontrak TypeScript hasil generasi OpenAPI
```

---

## 3. Prasyarat Sistem (Prerequisites)

Pastikan perangkat Anda telah terpasang:
1. **Docker & Docker Compose** (Docker Desktop atau Docker Engine Linux).
2. **Rust Toolchain:** Versi 1.85 atau lebih baru (`rustup default stable`).
3. **Node.js & npm:** Node.js v20+ dan npm v10+.

---

## 4. Panduan Menjalankan dari Nol (Step-by-Step)

### Langkah 1: Kloning Repositori & Penyiapan Variabel Lingkungan
Salin berkas template environment:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi kredensial bila diperlukan (nilai bawaan pada `.env.example` sudah siap untuk lingkungan pengembangan lokal).

---

### Langkah 2: Jalankan Layanan Infrastruktur (Database, Redis, MinIO)
Jalankan dependensi penunjang menggunakan Docker Compose:
```bash
docker compose up -d postgres redis minio
```
Periksa status kontainer hingga sehat (*healthy*):
```bash
docker compose ps
```

---

### Langkah 3: Seeding Database Awal (Idempoten)
Jalankan script seed database pengembang untuk mengisi akun admin, akun calon mahasiswa, master data program studi, jalur masuk, gelombang, kode voucher, dan bank soal CBT:
```bash
cd apps/api
cargo run --bin seed
```
> **Catatan:** Script seed dirancang **idempoten** (`ON CONFLICT DO NOTHING / UPDATE`). Anda dapat menjalankannya berulang kali tanpa risiko duplikasi data.

**Kredensial Akun Default:**
- **Administrator PMB:**
  - Email: `admin@pignatelli.ac.id`
  - Kata Sandi: `AdminUPT2026!`
- **Calon Mahasiswa:**
  - Email: `calon@pignatelli.ac.id`
  - Kata Sandi: `CalonUPT2026!`

---

### Langkah 4: Menjalankan Backend API
Dari direktori `apps/api`:
```bash
cargo run --bin api
```
- Server API aktif di: `http://localhost:8080`
- Dokumentasi Swagger UI interaktif: `http://localhost:8080/api/docs` (atau `http://localhost:8080/swagger-ui`)
- Healthcheck endpoint: `http://localhost:8080/api/health`

---

### Langkah 5: Menjalankan Frontend Web
Buka terminal baru, masuk ke direktori `apps/web`:
```bash
cd apps/web
npm install
npm run dev
```
- Aplikasi Web aktif di: `http://localhost:3000`
- Halaman beranda memuat widget live pemantau `/api/health` yang menampilkan status koneksi server, database, dan cache Redis.

---

### Alternatif: Menjalankan Seluruh Sistem via Docker Compose
Anda juga dapat menjalankan seluruh sistem (Postgres, Redis, MinIO, API Axum, dan Web Nginx) secara terorkestrasi penuh:
```bash
docker compose up -d --build
```
Akses aplikasi web di `http://localhost:3000`.

---

## 5. Gerbang Kualitas (Quality Gates)

Seluruh pengujian gerbang kualitas wajib lulus sebelum perubahan dapat diintegrasikan:

### Backend Rust (`apps/api`)
```bash
cd apps/api

# 1. Pengecekan format kode
cargo fmt --check

# 2. Pengecekan linter & pencegahan peringatan
cargo clippy --all-targets -- -D warnings

# 3. Eksekusi pengujian logika bisnis (biaya, voucher, passing score, NIM, LoA, CBT, Argon2)
cargo test
```

### Frontend React (`apps/web`)
```bash
cd apps/web

# 1. Pengecekan linter kode
npm run lint

# 2. Pengecekan tipe statis TypeScript
npm run typecheck

# 3. Eksekusi pengujian komponen & unit test
npm run test

# 4. Pembangunan bundel produksi (Vite Build)
npm run build
```

### Sinkronisasi Kontrak API (Contract-First)
Tipe TypeScript frontend digenerasikan langsung dari spesifikasi OpenAPI backend:
```bash
cd apps/web
npm run gen:api
```

---

## 6. Lisensi & Hak Cipta
Hak Cipta © 2026 Universitas Pignatelli Triputra. Seluruh hak cipta dilindungi undang-undang.

