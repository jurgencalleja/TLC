# /tlc:server - TLC Development Server

Launch a Docker-based development environment with dashboard, database, and live reload.

## Instructions for Claude

### Step 1: Run tlc init

Run this command in the user's project directory to create the Docker launcher:

```bash
npx tlc-claude-code init
```

This creates `tlc-start.bat` in the project folder.

### Step 2: Show User Instructions

```
TLC Dev Server Setup Complete!

Created: tlc-start.bat

To start your dev environment:
  1. Double-click tlc-start.bat (Windows)
  2. Wait for Docker containers to start

Services:
  Dashboard:  http://localhost:3147
  App:        http://localhost:5000
  DB Admin:   http://localhost:8080
  Database:   localhost:5433

Requirements: Docker Desktop (https://docker.com/products/docker-desktop)

Other commands:
  tlc rebuild    # Full rebuild after package.json changes
```

---

## What You Get

| URL | Service |
|-----|---------|
| http://localhost:3147 | Dashboard - Logs, tasks, bugs |
| http://localhost:5000 | App - Your running application |
| http://localhost:8080 | DB Admin - Adminer database GUI |
| localhost:5433 | PostgreSQL database |

## Features

- **Hot reload** - Code changes apply instantly
- **Real-time logs** - App, tests, git activity
- **Bug submission** - Web form for QA
- **Task board** - Who's working on what
- **Multi-project** - Run multiple projects simultaneously

## Configuration

Override settings in `.tlc.json`:

```json
{
  "server": {
    "startCommand": "npm run dev",
    "appPort": 3000
  }
}
```

## Rebuild

After changing `package.json` or dependencies:

```bash
tlc rebuild
```

Or manually:
```bash
# Stop containers (Ctrl+C in the terminal)
# Double-click tlc-start.bat again
```

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Windows (macOS/Linux support coming soon)
