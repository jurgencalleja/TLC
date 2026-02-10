# /tlc:dashboard - TLC Dashboard Container

Manage the TLC dashboard as a standalone Docker container in any project.

## Instructions for Claude

### Step 1: Parse Arguments

The user may pass a subcommand:

```
/tlc:dashboard              → start (default)
/tlc:dashboard stop         → stop
/tlc:dashboard rebuild      → rebuild with latest TLC
/tlc:dashboard logs         → tail logs
/tlc:dashboard status       → show container status
```

### Step 2: Ensure docker-compose.tlc.yml Exists

Check if `docker-compose.tlc.yml` exists in the project root.

**If it does NOT exist:**

1. Find the TLC package directory:
   ```bash
   TLC_DIR=$(node -e "try { console.log(require.resolve('tlc-claude-code/package.json').replace('/package.json','')) } catch(e) { console.log('') }")
   ```
   If empty, try global:
   ```bash
   TLC_DIR=$(npm root -g)/tlc-claude-code
   ```

2. Copy the template:
   ```bash
   cp "$TLC_DIR/templates/docker-compose.tlc.yml" ./docker-compose.tlc.yml
   ```

3. If template not found, generate it inline (see Template section below).

4. Tell the user:
   ```
   Created docker-compose.tlc.yml in your project root.
   This file is YOURS — customize it freely. TLC will never overwrite it.
   ```

**If it already exists:** Use it as-is. Never modify the user's file.

### Step 3: Execute Subcommand

**start (default):**
```bash
docker compose -f docker-compose.tlc.yml up -d
```

Then show:
```
TLC Dashboard running at http://localhost:3147

  Stop:    /tlc:dashboard stop
  Logs:    /tlc:dashboard logs
  Rebuild: /tlc:dashboard rebuild
```

**stop:**
```bash
docker compose -f docker-compose.tlc.yml down
```

**rebuild:**
```bash
docker compose -f docker-compose.tlc.yml build --no-cache
docker compose -f docker-compose.tlc.yml up -d
```

**logs:**
```bash
docker compose -f docker-compose.tlc.yml logs -f --tail 50 dashboard
```

**status:**
```bash
docker compose -f docker-compose.tlc.yml ps
```

### Step 4: Verify

After `start` or `rebuild`, check the dashboard is serving the React SPA:

```bash
# Wait a few seconds for startup
sleep 5
curl -s http://localhost:3147 | head -5
```

If it contains `<div id="root">` → React SPA is running.
If it contains the old static HTML → warn the user that TLC needs updating.

---

## Template

The `docker-compose.tlc.yml` template contains only the dashboard service:

```yaml
# TLC Dashboard
# This file is yours — customize freely. TLC will never overwrite it.
# Docs: https://github.com/jurgencalleja/TLC/wiki/devserver

services:
  dashboard:
    image: node:20-alpine
    container_name: tlc-dashboard
    working_dir: /project
    command: >
      sh -c "
        npm install -g tlc-claude-code@latest &&
        TLC_DIR=$$(npm root -g)/tlc-claude-code &&
        cd /project && node $$TLC_DIR/server/index.js
      "
    environment:
      - TLC_PORT=3147
      - TLC_AUTH=false
    ports:
      - "${DASHBOARD_PORT:-3147}:3147"
    volumes:
      - .:/project
    restart: on-failure
```

---

## Important Notes

- The compose file belongs to the USER. Never overwrite or modify it.
- If the user has customized ports, environment, or volumes — respect that.
- The dashboard serves the React SPA from `dashboard-web/dist/` (included in npm package since v1.8.1).
- This is independent from `/tlc:start` which manages the full dev environment (app, db, storage).
