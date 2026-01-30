# /tlc:server - TLC Development Server

Set up local development environment (simple, no Docker by default).

## Instructions for Claude

### Default: Local Dev Mode

Start services directly without Docker:

**1. Check what's in the project:**
- Read package.json to find the dev/start script
- Check for database config (prisma, drizzle, .env with DATABASE_URL)
- Check for redis in dependencies

**2. Start TLC Dashboard:**
```bash
npx tlc-claude-code dashboard &
```

**3. Start the user's app:**
```bash
npm run dev
```

**4. Detect the app port:**
- Check package.json scripts for port hints
- Check .env for PORT variable
- Common defaults: Next.js/React (3000), Vite (5173), Express (3000)
- **AVOID**: 5000, 5001 (AirPlay on macOS), 7000, 8080

**5. Tell the user:**
```
TLC Dev Server Running

  Dashboard:  http://localhost:3147
  App:        http://localhost:{detected_port}

Services:
  ✓ TLC Dashboard (planning, bugs, progress)
  ✓ Your App (hot reload enabled)
  ✓ Database (PGlite embedded / local postgres)
  ○ Redis (start with: redis-server)

Stop: Ctrl+C
```

### Docker Mode (--docker flag)

Only if user runs `/tlc:server --docker`:

```bash
npx tlc-claude-code init
```

Then tell them about Docker setup with tlc-start.bat.

## Key Principle

**Local first.** Don't spin up Docker containers unless explicitly requested. Most developers just want:
- Their app running with hot reload
- TLC dashboard to track progress
- Simple local database
