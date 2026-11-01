#!/usr/bin/env bash
# ==============================================================================
# Skrip Backup Terjadwal Database PostgreSQL PMB UPITRA
# Mendukung eksekusi mandiri (cron) dan via container Docker.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="pmb_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-pmb_db}"
DB_USER="${POSTGRES_USER:-pmb_user}"

echo "[INFO] [$(date)] Memulai proses backup database: ${DB_NAME}..."
mkdir -p "${BACKUP_DIR}"

# Jalankan pg_dump dengan kompresi gzip
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F p \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges | gzip -9 > "${BACKUP_FILEPATH}"

BACKUP_SIZE=$(du -h "${BACKUP_FILEPATH}" | cut -f1)
echo "[SUCCESS] [$(date)] Backup database berhasil dibuat: ${BACKUP_FILEPATH} (${BACKUP_SIZE})"

# Rotasi backup lama (hapus backup yang lebih tua dari RETENTION_DAYS)
echo "[INFO] [$(date)] Menghapus arsip backup yang berumur lebih dari ${RETENTION_DAYS} hari..."
find "${BACKUP_DIR}" -type f -name "pmb_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +

echo "[SUCCESS] [$(date)] Pembersihan retensi selesai. Status direktori backup:"
ls -lh "${BACKUP_DIR}"

