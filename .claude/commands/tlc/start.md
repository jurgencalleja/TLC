# /tlc:start - Start TLC Dev Server

Start local development with TLC dashboard and your app.

## Instructions for Claude

**Start these services in parallel (use background processes or separate terminals):**

### 1. TLC Dashboard
```bash
npx tlc-claude-code dashboard
```
Or if that doesn't exist, run the dashboard directly:
```bash
cd node_modules/tlc-claude-code/dashboard && npm run dev
```

### 2. User's App
Detect and start the user's app based on package.json scripts:
- If `dev` script exists: `npm run dev`
- If `start` script exists: `npm run start`
- For Next.js: `npm run dev` (usually port 3000)
- For Express/Node: `node index.js` or `npm start`

### 3. Database (if needed)
- **PGlite**: Embedded, no separate process needed
- **PostgreSQL**: Check if running locally, suggest `brew services start postgresql` or similar
- **SQLite**: No process needed

### 4. Redis (if needed)
- Check if redis is in dependencies
- If yes, suggest: `redis-server` or `brew services start redis`

## Port Selection

**TLC Dashboard**: Port 3147 (safe, not commonly used)

**User's App**: Detect from their config, common patterns:
- Next.js/React: 3000
- Vite: 5173
- Express: 3000 or PORT env
- Django: 8000
- Flask: 5000 (NOTE: conflicts with AirPlay on macOS Monterey+)

**Ports to AVOID suggesting:**
- 5000, 5001: AirPlay Receiver on macOS
- 7000: AirPlay on older macOS
- 8080: Common proxy port, often in use

## Output

Show the user:
```
TLC Dev Server Starting...

  Dashboard:  http://localhost:3147  (TLC)
  App:        http://localhost:{detected_port}  (Your app)

Press Ctrl+C to stop all services.
```

## Docker Mode (optional)

If user specifically wants Docker, they can run:
```
/tlc:start --docker
```

Then use the Docker-based launcher (tlc-start.sh/bat).
