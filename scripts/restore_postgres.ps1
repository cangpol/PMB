# ==============================================================================
# Skrip Restore Database PostgreSQL PMB UPITRA (PowerShell Windows)
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "pmb_db",
    [string]$DbUser = "pmb_user",
    [string]$DbPassword = $env:POSTGRES_PASSWORD
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "[ERROR] Berkas backup tidak ditemukan: $BackupFile"
    exit 1
}

Write-Host "================================================================================" -ForegroundColor Yellow
Write-Host "[PERINGATAN] Memulihkan database $DbName dari berkas $BackupFile" -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Yellow

$env:PGPASSWORD = $DbPassword

try {
    psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $BackupFile
    Write-Host "[SUCCESS] Restore database $DbName berhasil diselesaikan." -ForegroundColor Green
}
catch {
    Write-Error "[ERROR] Gagal memulihkan database: $_"
}
finally {
    $env:PGPASSWORD = $null
}

