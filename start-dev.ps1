# TLC Dev Server Launcher
# Usage: .\start-dev.ps1 [project-path]
# Or right-click -> Run with PowerShell

param(
    [string]$ProjectPath = (Get-Location).Path
)

Write-Host ""
Write-Host "  ============================" -ForegroundColor Cyan
Write-Host "       TLC Dev Server" -ForegroundColor Cyan
Write-Host "  ============================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[TLC] Checking Docker..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "[TLC] Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    Write-Host "[TLC] Waiting for Docker..." -ForegroundColor Yellow
    $timeout = 60
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                break
            }
        } catch {}
        Write-Host "." -NoNewline
    }
    Write-Host ""

    if (-not $dockerRunning) {
        Write-Host "[TLC] ERROR: Docker failed to start" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[TLC] Docker is ready!" -ForegroundColor Green

# Resolve project path
try {
    $ProjectPath = (Resolve-Path $ProjectPath).Path
} catch {
    Write-Host "[TLC] ERROR: Invalid project path: $ProjectPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get project name from directory
$ProjectName = (Split-Path $ProjectPath -Leaf).ToLower() -replace '[^a-z0-9]', ''
if ([string]::IsNullOrEmpty($ProjectName)) {
    $ProjectName = "dev"
}

Write-Host "[TLC] Project: $ProjectPath" -ForegroundColor Cyan
Write-Host "[TLC] Name:    $ProjectName" -ForegroundColor Cyan

# Set environment and run
$env:PROJECT_DIR = $ProjectPath
$env:COMPOSE_PROJECT_NAME = $ProjectName
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "[TLC] Starting services..." -ForegroundColor Yellow
Write-Host "      Dashboard: http://localhost:3147" -ForegroundColor White
Write-Host "      App:       http://localhost:5000" -ForegroundColor White
Write-Host "      DB Admin:  http://localhost:8080" -ForegroundColor White
Write-Host "      Database:  localhost:5433 (postgres/postgres)" -ForegroundColor Gray
Write-Host ""
Write-Host "[TLC] Containers: tlc-$ProjectName-*" -ForegroundColor Gray
Write-Host "[TLC] Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Run docker-compose
docker-compose -f docker-compose.dev.yml up --build

Write-Host ""
Write-Host "[TLC] Stopped." -ForegroundColor Yellow
