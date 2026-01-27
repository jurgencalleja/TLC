# /tlc:server - TLC Development Server

Set up Docker-based development environment.

## Instructions for Claude

**CRITICAL: Do NOT analyze the codebase. Do NOT check files. Do NOT run any detection. Just execute the two steps below immediately.**

### Step 1: Create the launcher

Run this command:

```bash
npx tlc-claude-code init
```

### Step 2: Tell the user

Say exactly this:

```
Done! Created tlc-start.bat

To start your dev environment:
  Double-click tlc-start.bat

Services when running:
  Dashboard:  http://localhost:3147
  App:        http://localhost:5000
  DB Admin:   http://localhost:8080
  Database:   localhost:5433

Requires: Docker Desktop

Commands:
  tlc rebuild   - Full rebuild after package.json changes
```

**That's it. Don't show alternatives or workarounds. Don't mention npm scripts.**
