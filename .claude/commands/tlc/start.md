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
   - DB Studio (auto-detected: Drizzle/Prisma/pgweb)

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

**1. Detect ORM for DB Studio:**

Check package.json dependencies:
- `drizzle-orm` → Use Drizzle Studio (`npx drizzle-kit studio`)
- `prisma` or `@prisma/client` → Use Prisma Studio (`npx prisma studio`)
- Neither → Use pgweb (Docker: `sosedoff/pgweb`)

**2. Start services:**

```bash
# TLC Dashboard
npx tlc-claude-code dashboard &

# User's app
npm run dev &

# PostgreSQL (Docker)
docker run -d --name tlc-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine

# DB Studio (based on detection)
npx drizzle-kit studio &    # If Drizzle
npx prisma studio &          # If Prisma
docker run -d --name tlc-pgweb -p 8081:8081 -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/postgres sosedoff/pgweb  # Fallback
```

**3. Detect the app port:**
- Check package.json scripts for port hints
- Check .env for PORT variable
- Common defaults: Next.js/React (3000), Vite (5173)
- **AVOID**: 5000, 5001 (AirPlay on macOS), 7000, 8080

**Output:**
```
TLC Environment Running

  Dashboard:  http://localhost:3147
  App:        http://localhost:{port}
  DB Studio:  http://localhost:4983  (Drizzle Studio)
              http://localhost:5555  (Prisma Studio)
              http://localhost:8081  (pgweb)
  Database:   localhost:5432

Stop: Ctrl+C
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
  DB Studio:  http://localhost:{studio_port}
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
