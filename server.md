# /tlc:server - TLC Development Server

Launch a unified development environment with live app preview, real-time logs, and team collaboration.

## Instructions for Claude

**DO NOT generate server code. Run the pre-built server from the TLC package.**

### Step 1: Start Server

Run this command in the user's project directory:

```bash
npx -p tlc-claude-code tlc-server
```

That's it. The server will:
- Auto-detect the project type
- Start the user's app
- Open dashboard at http://localhost:3147

### Step 2: Show User the URLs

```
TLC Dev Server running!

  Dashboard: http://localhost:3147
  Share:     http://{local-ip}:3147

Open dashboard in browser to see:
  - Live app preview
  - Real-time logs (App / Tests / Git)
  - Task board
  - Bug submission form
```

---

## What the Server Does

- **Auto-detects** project type (Node, Python, Go, Ruby, Rust)
- **Starts your app** using detected dev command
- **Proxies** app at `/app/` to avoid CORS
- **Streams logs** via WebSocket
- **Shows tasks** from `.planning/phases/*-PLAN.md`
- **Accepts bugs** via web form → `.planning/BUGS.md`

## Configuration

Override auto-detection in `.tlc.json`:

```json
{
  "server": {
    "startCommand": "npm run dev",
    "appPort": 3000,
    "dashboardPort": 3147
  }
}
```

## Supported Project Types

| File | Detected As | Command |
|------|-------------|---------|
| `package.json` (next) | Next.js | `npm run dev` |
| `package.json` (vite) | Vite | `npm run dev` |
| `package.json` (express) | Express | `npm start` |
| `pyproject.toml` | FastAPI | `uvicorn main:app --reload` |
| `requirements.txt` | Flask | `flask run` |
| `go.mod` | Go | `go run .` |
| `Gemfile` (rails) | Rails | `rails server` |
| `Cargo.toml` | Rust | `cargo run` |

## Dashboard Features

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC Dev Server                              [Run Tests] [Restart] │
├─────────────────────────────────────────────────────────────────┤
│                          │                                      │
│   ┌─────────────────┐    │    ┌────────────────────────────┐   │
│   │  LIVE PREVIEW   │    │    │  LOGS  [App] [Tests] [Git] │   │
│   │   (your app)    │    │    │  > Server started :3000    │   │
│   └─────────────────┘    │    │  > GET /api/users 200 12ms │   │
│                          │    └────────────────────────────┘   │
│   ┌─────────────────┐    │    ┌────────────────────────────┐   │
│   │  REPORT BUG     │    │    │  TASKS (from PLAN.md)      │   │
│   │  [textarea]     │    │    │  ✓ Task 1 @alice           │   │
│   │  [Submit]       │    │    │  → Task 2 @bob             │   │
│   └─────────────────┘    │    │  ○ Task 3 (available)      │   │
│                          │    └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## QA Workflow

1. Engineer runs `/tlc:server`
2. QA opens `http://192.168.x.x:3147` in browser
3. QA tests app in live preview
4. QA submits bugs via web form
5. Bugs appear in `.planning/BUGS.md`
6. Engineer fixes, app hot-reloads
7. QA re-tests

## Notes

- Works on local network (share IP with QA)
- For remote: `ngrok http 3147`
- All data flows through git
