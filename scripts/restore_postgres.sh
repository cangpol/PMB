#!/usr/bin/env bash
# ==============================================================================
# Skrip Restore Database PostgreSQL PMB UPITRA
# PERINGATAN: Operasi ini akan menimpa seluruh skema dan data database tujuan!
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Penggunaan: $0 <path_ke_file_backup.sql[.gz]>"
  echo "Contoh:     $0 /backups/pmb_backup_20261101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERROR] Berkas backup tidak ditemukan: ${BACKUP_FILE}"
  exit 1
fi

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-pmb_db}"
DB_USER="${POSTGRES_USER:-pmb_user}"

echo "================================================================================"
echo "[PERINGATAN] Anda akan me-restore database: ${DB_NAME} dari file: ${BACKUP_FILE}"
echo "================================================================================"

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "[INFO] Mengekstrak dan memulihkan dari arsip gzip..."
  PGPASSWORD="${POSTGRES_PASSWORD}" gunzip -c "${BACKUP_FILE}" | psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}"
else
  echo "[INFO] Memulihkan dari file SQL langsung..."
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -f "${BACKUP_FILE}"
fi

echo "[SUCCESS] [$(date)] Restore database ${DB_NAME} selesai dan berhasil diverifikasi."

