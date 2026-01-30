# /tlc:start - Start TLC Dev Server

The single command for starting your development environment.

## Instructions for Claude

### Step 1: Ask the User

```
What do you want to run?

1) TLC Environment (Recommended)
   - TLC Dashboard (planning, progress, bugs)
   - Your app with hot reload
   - PostgreSQL database
   - DB Admin GUI (Adminer)

2) Full Production Stack
   - Everything above, PLUS:
   - Redis cache
   - Nginx reverse proxy
   - Production-like isolation

Choose [1/2]:
```

---

### Option 1: TLC Environment (Default)

Start the TLC dev stack:

**Run:**
```bash
npx tlc-claude-code start
```

This spins up:
- TLC Dashboard
- User's app (detected from package.json)
- PostgreSQL database
- Adminer (DB GUI)

**Detect the app port:**
- Check package.json scripts for port hints
- Check .env for PORT variable
- Common defaults: Next.js/React (3000), Vite (5173)
- **AVOID**: 5000, 5001 (AirPlay on macOS), 7000, 8080

**Output:**
```
TLC Environment Running

  Dashboard:  http://localhost:3147
  App:        http://localhost:{port}
  DB Admin:   http://localhost:8081
  Database:   localhost:5432

Stop: Ctrl+C (or docker-compose down)
```

---

### Option 2: Full Production Stack

Everything from TLC Environment, plus production services:

**Run:**
```bash
npx tlc-claude-code start --full
```

This adds on top of TLC Environment:
- Redis cache
- Nginx reverse proxy
- Production-like container isolation
- Health checks

**Output:**
```
Full Production Stack Running

  Dashboard:  http://localhost:3147
  App:        http://localhost:3000
  DB Admin:   http://localhost:8081
  Database:   localhost:5432
  Redis:      localhost:6379

Stop: docker-compose down
```

---

## Port Selection

**TLC Dashboard**: Always port 3147 (safe, not commonly used)

**User's App**: Detect from config:
| Framework | Default Port |
|-----------|-------------|
| Next.js | 3000 |
| Vite | 5173 |
| Express | 3000 |
| Django | 8000 |

**Ports to NEVER use:**
- 5000, 5001: AirPlay Receiver on macOS Monterey+
- 7000: AirPlay on older macOS
- 8080: Often already in use

---

## Quick Flags

Skip the question with flags:

```
/tlc:start           # Asks which option
/tlc:start --tlc     # TLC Environment only (option 1)
/tlc:start --full    # Full Production Stack (option 2)
```
