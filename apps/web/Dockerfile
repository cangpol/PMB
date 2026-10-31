# Multi-Stage Build untuk Frontend React Vite (Web)
# Sistem Penerimaan Mahasiswa Baru (PMB) Universitas Pignatelli Triputra

# 1. Tahap Build
FROM node:20-alpine AS builder

WORKDIR /app

# Salin package manifest
COPY package.json package-lock.json ./

# Pasang dependensi
RUN npm ci

# Salin berkas kode sumber
COPY . .

# Build aplikasi frontend untuk produksi
RUN npm run build

# 2. Tahap Serving (Nginx Minimalis)
FROM nginx:alpine AS runner

# Salin konfigurasi Nginx kustom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin output hasil build Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

