# Multi-Stage Build untuk Backend Rust Axum API
# Sistem Penerimaan Mahasiswa Baru (PMB) Universitas Pignatelli Triputra

# 1. Tahap Kompilasi (Builder)
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /usr/src/app

# Pasang dependensi sistem yang diperlukan untuk kompilasi
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Salin manifest dan source code
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
COPY .sqlx ./.sqlx

# Build rilis dengan SQLX Offline Mode
ENV SQLX_OFFLINE=true
RUN cargo build --release

# 2. Tahap Eksekusi (Runtime Minimalis)
FROM debian:bookworm-slim AS runner

WORKDIR /app

# Pasang sertifikat SSL & curl untuk healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Buat pengguna non-root demi keamanan
RUN groupadd -g 1001 pmb && useradd -u 1001 -g pmb -s /bin/sh pmb

# Salin binari hasil kompilasi dari builder
COPY --from=builder /usr/src/app/target/release/api /app/api
COPY --from=builder /usr/src/app/target/release/seed /app/seed
COPY --from=builder /usr/src/app/migrations /app/migrations

# Berikan hak akses
RUN chown -R pmb:pmb /app
USER pmb

# Konfigurasi Environment Default
ENV PORT=8080
ENV API_HOST=0.0.0.0
ENV RUST_LOG=info

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/api"]

