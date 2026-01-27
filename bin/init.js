#!/usr/bin/env node

/**
 * TLC Init - Add TLC dev server launcher to a project
 * Usage: npx tlc-claude-code init
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();

// Windows batch file content
const batContent = `@echo off
:: ========================================
:: TLC Dev Server Launcher
:: ========================================
:: Double-click to start your dev environment
::
:: Dashboard: http://localhost:3147
:: App:       http://localhost:5001
:: DB Admin:  http://localhost:8080
:: Database:  localhost:5433
:: ========================================

setlocal

:: Find TLC installation (check common locations)
set TLC_DIR=
if exist "C:\\Code\\TLC\\start-dev.ps1" set TLC_DIR=C:\\Code\\TLC
if exist "%USERPROFILE%\\Code\\TLC\\start-dev.ps1" set TLC_DIR=%USERPROFILE%\\Code\\TLC
if exist "%~dp0..\\TLC\\start-dev.ps1" set TLC_DIR=%~dp0..\\TLC

:: Also check if installed globally via npm
for /f "delims=" %%i in ('npm root -g 2^>nul') do (
    if exist "%%i\\tlc-claude-code\\start-dev.ps1" set TLC_DIR=%%i\\tlc-claude-code
)

if "%TLC_DIR%"=="" (
    echo [TLC] ERROR: Could not find TLC installation
    echo [TLC] Install TLC or set TLC_DIR in this script
    echo [TLC] See: https://github.com/jurgencalleja/TLC
    pause
    exit /b 1
)

:: Get project directory without trailing backslash
set PROJECT_PATH=%~dp0
if "%PROJECT_PATH:~-1%"=="\\" set PROJECT_PATH=%PROJECT_PATH:~0,-1%

echo [TLC] Found TLC at: %TLC_DIR%
echo [TLC] Starting dev server for: %PROJECT_PATH%
echo.

powershell -ExecutionPolicy Bypass -File "%TLC_DIR%\\start-dev.ps1" -ProjectPath "%PROJECT_PATH%"

pause
`;

// macOS/Linux shell script
const shContent = `#!/bin/bash
# ========================================
# TLC Dev Server Launcher
# ========================================
# Dashboard: http://localhost:3147
# App:       http://localhost:5001
# DB Admin:  http://localhost:8080
# Database:  localhost:5433
# ========================================

set -e

# Find TLC installation
TLC_DIR=""
LOCATIONS=(
    "$HOME/.nvm/versions/node/*/lib/node_modules/tlc-claude-code"
    "/usr/local/lib/node_modules/tlc-claude-code"
    "/usr/lib/node_modules/tlc-claude-code"
    "$HOME/.npm-global/lib/node_modules/tlc-claude-code"
)

# Check npm global
NPM_ROOT=$(npm root -g 2>/dev/null || echo "")
if [ -n "$NPM_ROOT" ] && [ -f "$NPM_ROOT/tlc-claude-code/start-dev.sh" ]; then
    TLC_DIR="$NPM_ROOT/tlc-claude-code"
fi

# Check common locations
if [ -z "$TLC_DIR" ]; then
    for pattern in "\${LOCATIONS[@]}"; do
        for dir in $pattern; do
            if [ -f "$dir/start-dev.sh" ]; then
                TLC_DIR="$dir"
                break 2
            fi
        done
    done
fi

if [ -z "$TLC_DIR" ]; then
    echo "[TLC] ERROR: Could not find TLC installation"
    echo "[TLC] Install with: npm install -g tlc-claude-code"
    exit 1
fi

PROJECT_PATH="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

echo "[TLC] Found TLC at: $TLC_DIR"
echo "[TLC] Starting dev server for: $PROJECT_PATH"
echo ""

exec "$TLC_DIR/start-dev.sh" "$PROJECT_PATH"
`;

// Detect OS - WSL counts as Windows since user will double-click .bat from Explorer
const isWSL = process.platform === 'linux' && fs.existsSync('/mnt/c');
const isWindows = process.platform === 'win32' || isWSL;
const launcherFile = isWindows ? 'tlc-start.bat' : 'tlc-start.sh';
const launcherPath = path.join(projectDir, launcherFile);

// FAST PATH: If launcher exists for this OS, just confirm and exit
if (fs.existsSync(launcherPath)) {
    console.log('');
    console.log(`[TLC] Already initialized. ${launcherFile} exists.`);
    console.log('');
    if (isWindows) {
        console.log('[TLC] To start: Double-click ' + launcherFile);
    } else {
        console.log('[TLC] To start: ./' + launcherFile);
    }
    console.log('[TLC] To rebuild: tlc rebuild');
    console.log('');
    process.exit(0);
}

console.log('');
console.log('  ============================');
console.log('       TLC Project Init');
console.log('  ============================');
console.log('');

if (isWindows) {
    // Create Windows launcher
    const batPath = path.join(projectDir, 'tlc-start.bat');

    if (fs.existsSync(batPath)) {
        console.log('[TLC] tlc-start.bat already exists, overwriting...');
    }
    fs.writeFileSync(batPath, batContent);
    console.log('[TLC] Created: tlc-start.bat');
} else {
    // Create Unix launcher (placeholder)
    const shPath = path.join(projectDir, 'tlc-start.sh');

    if (fs.existsSync(shPath)) {
        console.log('[TLC] tlc-start.sh already exists, overwriting...');
    }
    fs.writeFileSync(shPath, shContent, { mode: 0o755 });
    console.log('[TLC] Created: tlc-start.sh');
    console.log('[TLC] Note: Full macOS/Linux support coming soon!');
}

// Add to .gitignore if not already there
const gitignorePath = path.join(projectDir, '.gitignore');

if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('tlc-start')) {
        gitignore += '\\n# TLC dev server launcher (local only)\\ntlc-start.*\\n';
        fs.writeFileSync(gitignorePath, gitignore);
        console.log('[TLC] Added tlc-start.* to .gitignore');
    }
} else {
    fs.writeFileSync(gitignorePath, '# TLC dev server launcher (local only)\\ntlc-start.*\\n');
    console.log('[TLC] Created .gitignore with tlc-start.*');
}

// Create/update .tlc.json if it doesn't exist
const tlcConfigPath = path.join(projectDir, '.tlc.json');
if (!fs.existsSync(tlcConfigPath)) {
    // Try to detect project settings
    const pkgPath = path.join(projectDir, 'package.json');
    let appPort = 3000;
    let startCommand = 'npm run dev';

    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            // Detect port from scripts if possible
            if (pkg.scripts?.dev?.includes('--port')) {
                const match = pkg.scripts.dev.match(/--port[=\\s]+(\\d+)/);
                if (match) appPort = parseInt(match[1]);
            }
            if (pkg.scripts?.dev?.includes('5001')) appPort = 5001;
            if (pkg.scripts?.dev?.includes('3000')) appPort = 3000;
            if (pkg.scripts?.dev?.includes('5173')) appPort = 5173;
        } catch (e) {
            // Ignore parsing errors
        }
    }

    const tlcConfig = {
        server: {
            startCommand: startCommand,
            appPort: appPort
        }
    };

    fs.writeFileSync(tlcConfigPath, JSON.stringify(tlcConfig, null, 2) + '\\n');
    console.log('[TLC] Created: .tlc.json');
}

console.log('');
console.log('[TLC] Setup complete!');
console.log('');

if (isWindows) {
    console.log('[TLC] To start your dev server:');
    console.log('      Double-click tlc-start.bat');
    console.log('');
    console.log('[TLC] Or run from command line:');
    console.log('      .\\\\tlc-start.bat');
} else {
    console.log('[TLC] To start your dev server:');
    console.log('      ./tlc-start.sh');
}

console.log('');
console.log('[TLC] Services when running:');
console.log('      Dashboard: http://localhost:3147');
console.log('      App:       http://localhost:5001');
console.log('      DB Admin:  http://localhost:8080');
console.log('      Database:  localhost:5433');
console.log('');
