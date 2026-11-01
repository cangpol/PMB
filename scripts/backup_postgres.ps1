# ==============================================================================
# Skrip Backup Terjadwal Database PostgreSQL PMB UPITRA (PowerShell Windows)
# ==============================================================================

param(
    [string]$BackupDir = ".\backups",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "pmb_db",
    [string]$DbUser = "pmb_user",
    [string]$DbPassword = $env:POSTGRES_PASSWORD,
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "pmb_backup_$Timestamp.sql"

Write-Host "[INFO] Memulai backup PostgreSQL ke $BackupFile..." -ForegroundColor Cyan

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$env:PGPASSWORD = $DbPassword

try {
    # Jalankan pg_dump
    pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists --no-owner --no-privileges -f $BackupFile
    Write-Host "[SUCCESS] Backup berhasil disimpan: $BackupFile" -ForegroundColor Green

    # Pembersihan file backup lama
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Filter "pmb_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
        Write-Host "[INFO] Menghapus backup usang: $($_.FullName)" -ForegroundColor Yellow
        Remove-Item $_.FullName -Force
    }
}
catch {
    Write-Error "[ERROR] Gagal melakukan backup: $_"
}
finally {
    $env:PGPASSWORD = $null
}

