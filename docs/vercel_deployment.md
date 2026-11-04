# Deployment Frontend di Vercel

Vercel hanya menyajikan **frontend** (Vite/React). Backend Rust (Axum) + PostgreSQL + MinIO/S3
harus berjalan di server terpisah (Render, Railway, Fly.io, atau VPS lewat `docker-compose.prod.yml`).

1. Vercel -> Project Settings -> **Root Directory**: `apps/web`.
2. Environment Variables (Production):
   - `BACKEND_URL` = URL publik backend, tanpa `/` di akhir, mis. `https://api-pmb.example.com`
3. Di backend pastikan: `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=Lax`, dan `CORS` mengizinkan domain Vercel.
4. Redeploy. Seluruh `/api/*` diteruskan oleh `apps/web/api/[...path].ts` ke `BACKEND_URL`
   (browser tetap satu origin sehingga cookie sesi berfungsi).
5. Jalankan seed akun demo di backend: `cargo run --bin seed`.

Gejala 404/503 saat login = `BACKEND_URL` belum diisi atau backend belum aktif.
