# Sistem Penerimaan Mahasiswa Baru (PMB)
## Universitas Pignatelli Triputra (UPITRA)

Sistem Penerimaan Mahasiswa Baru (PMB) modern, aman, dan berkinerja tinggi untuk **Universitas Pignatelli Triputra**. Dirancang dengan arsitektur monolit modular di Rust (Axum) berorientasi *contract-first* (OpenAPI 3.1) dan SPA reaktif di React 19 + TypeScript + Vite, siap untuk produksi dengan Docker Compose dan orkestrasi reverse proxy berkeamanan tinggi.

---

## 1. Arsitektur & Teknologi

```
[ Klien / Publik / Calon / Admin ]
               │
        HTTPS (Port 443)
               ▼
┌──────────────────────────────┐
│  Reverse Proxy Nginx Alpine  │ (Gzip, Rate Limit, CSP, HSTS, SSL Termination)
└──────────────┬───────────────┘
               │
    [ Docker Bridge Network ]
    ├──► Frontend Web (React 19 + TypeScript + Vite + Tailwind CSS v4)
    ├──► Backend API (Rust 2024 / Axum 0.8 / Tokio Async Runtime)
    │       ├──► PostgreSQL 16 (SQLx with Compile-Time Query Safety & Migrations)
    │       ├──► Redis 7 Alpine (Server-Side Session Store & Sliding-Window Limiter)
    │       └──► MinIO S3 (Presigned Uploads & Secure Object Storage)
    └──► DB-Backup Daemon (Automated Daily Cron at 02:00 WIB, 14-Day Retention)
```

### Backend (`apps/api`)
- **Bahasa & Runtime:** Rust (2024 edition), Tokio Asynchronous Multi-threaded Runtime.
- **Web Framework:** Axum 0.8 dengan Tower-HTTP (Compression, Trace, Strict Security Headers).
- **Database & Cache:** PostgreSQL 16 (SQLx pool dengan validasi skema saat kompilasi), Redis 7 (manajemen sesi & rate limiter).
- **Keamanan:** Password hashing Argon2id, cookie httpOnly SameSite=Lax, sliding-window rate limiting, role-based access control (RBAC), audit logging mutasi admin.
- **Dokumentasi API:** utoipa (OpenAPI 3.1) terpadu di `/api/docs` dan `/swagger-ui`.

### Frontend (`apps/web`)
- **Library & Build Tool:** React 19, TypeScript strict mode, Vite 8.
- **Routing & State:** React Router v7, TanStack Query v5.
- **Form & Validasi:** React Hook Form + Zod.
- **Styling & Ikon:** Tailwind CSS v4, Lucide React, Motion.
- **Tipografi:** Heading serif elegan (`Cormorant Garamond`), body sans modern (`Plus Jakarta Sans`) via `@fontsource` (self-hosted).
- **Design System Eksklusif:** Hanya menggunakan token Royal Blue (`biru-950` hingga `biru-50`) dan `putih`. Nol warna di luar token.

---

## 2. Struktur Monorepo

```text
.
├── .env.example                 # Kamus & template lengkap variabel lingkungan
├── docker-compose.yml           # Orkestrasi Docker lokal development
├── docker-compose.prod.yml      # Orkestrasi Docker produksi dengan SSL & backup cron
├── docker/                      # Konfigurasi reverse proxy Nginx & SSL
├── docs/                        # Dokumentasi resmi
│   ├── deployment_guide.md      # Panduan instalasi server produksi & disaster recovery
│   └── admin_manual.md          # Panduan operasional per peran admin (RBAC)
├── scripts/                     # Skrip pemeliharaan & pengujian
│   ├── backup_postgres.sh/.ps1  # Skrip backup otomatis PostgreSQL
│   ├── restore_postgres.sh/.ps1 # Skrip pemulihan darurat database
│   ├── load_test.cjs            # Benchmark uji beban HTTP
│   └── benchmark_server.cjs     # Standalone benchmark test runner
├── apps/
│   ├── api/                     # Backend Rust (Axum)
│   │   ├── migrations/          # Migrasi skema database SQLx
│   │   ├── src/                 # Modul: auth, pendaftaran, cbt, kelulusan, rpl, cms, dashboard
│   │   └── tests/               # 87 automated unit, integration, & security tests
│   └── web/                     # Frontend React (Vite + TypeScript)
│       ├── e2e/                 # Playwright end-to-end test suite
│       ├── src/                 # Halaman publik, portal calon, admin CMS & analitik
│       └── playwright.config.ts # Konfigurasi pengujian E2E headless Chromium
```

---

## 3. Prasyarat Sistem

1. **Rust Toolchain:** Versi 1.85+ (`rustup default stable`).
2. **Node.js & npm:** Node.js v20+ dan npm v10+.
3. **Docker & Docker Compose:** Versi 26.0+ (untuk deployment lokal/produksi).

---

## 4. Panduan Menjalankan Lingkungan Lokal

### 1. Penyiapan Variabel Lingkungan
```bash
cp .env.example .env
```

### 2. Jalankan Dependensi Penunjang
```bash
docker compose up -d postgres redis minio
```

### 3. Seeding Data Awal
```bash
cargo run --manifest-path apps/api/Cargo.toml --bin seed
```

### 4. Jalankan Peladen Pengembangan
```bash
# Terminal 1: Backend API
cargo run --manifest-path apps/api/Cargo.toml --bin api

# Terminal 2: Frontend SPA
npm --prefix apps/web run dev
```
Akses antarmuka web di `http://localhost:3000` dan dokumentasi Swagger di `http://localhost:8080/api/docs`.

---

## 5. Menjalankan Seluruh Gerbang Kualitas & Pengujian

### 5.1 Backend Rust (Unit, Integration, & Security Matrix)
```bash
# Format & Linting
cargo fmt --manifest-path apps/api/Cargo.toml -- --check
cargo clippy --manifest-path apps/api/Cargo.toml -- -D warnings

# Seluruh 87 Automated Tests
cargo test --manifest-path apps/api/Cargo.toml --tests
```

### 5.2 Frontend React (Typecheck, Lint, Unit Test, & E2E)
```bash
# Verifikasi Type & Lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run format:check

# Unit Tests (Vitest)
npm --prefix apps/web run test

# End-to-End Tests (Playwright Chromium Headless)
npm --prefix apps/web run build
npm --prefix apps/web run test:e2e
```

### 5.3 Uji Beban (Load Testing)
```bash
node scripts/load_test.cjs
```

---

## 6. Deployment Produksi & Pemulihan Bencana

Silakan merujuk ke dokumen teknis:
- **Panduan Deployment & Disaster Recovery:** [docs/deployment_guide.md](docs/deployment_guide.md)
- **Buku Petunjuk Operasional Administrator:** [docs/admin_manual.md](docs/admin_manual.md)
