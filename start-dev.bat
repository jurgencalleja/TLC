@echo off
setlocal

echo.
echo   ████████╗██╗     ██████╗
echo   ╚══██╔══╝██║    ██╔════╝
echo      ██║   ██║    ██║
echo      ██║   ██║    ██║
echo      ██║   ███████╗╚██████╗
echo      ╚═╝   ╚══════╝ ╚═════╝
echo.
echo   TLC Dev Server Launcher
echo.

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [TLC] Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [TLC] Waiting for Docker to start...
    :wait_docker
    timeout /t 2 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 goto wait_docker
    echo [TLC] Docker is ready!
)

:: Get project directory (default to current dir, or pass as argument)
if "%~1"=="" (
    set PROJECT_DIR=%cd%
) else (
    set PROJECT_DIR=%~1
)

echo [TLC] Project: %PROJECT_DIR%
echo.

:: Start everything with docker-compose
cd /d "%~dp0"
set PROJECT_DIR=%PROJECT_DIR%
docker-compose -f docker-compose.dev.yml up --build

pause
