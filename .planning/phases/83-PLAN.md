# Phase 83: Server Always-On — Plan

## Overview

Ensure the TLC server (port 3147) is always running so the memory capture bridge POSTs exchanges directly instead of spooling to disk. Uses macOS launchd (LaunchAgent) for persistent uptime with the SessionStart hook as a fallback safety net.

## Prerequisites

- [x] Phase 82 complete (capture bridge, Stop hook, spool)
- [x] Server has `/api/health` endpoint (returns `{ status: 'ok' }`)
- [x] Server listens on TLC_PORT (default 3147)

## Tasks

### Task 1: Create LaunchAgent plist generator

**Goal:** Node.js module that generates a macOS LaunchAgent plist file for the TLC server. The plist tells launchd to keep the server running, restart on crash, and start on user login.

**Files:**
- server/lib/launchd-agent.js
- server/lib/launchd-agent.test.js

**Acceptance Criteria:**
- [ ] `generatePlist(opts)` returns valid XML plist string
- [ ] Plist uses label `com.tlc.server`
- [ ] ProgramArguments: `node <absolute-path>/server/index.js`
- [ ] Sets WorkingDirectory to project root
- [ ] Sets EnvironmentVariables (PATH, HOME, NODE_ENV=development, TLC_PORT)
- [ ] KeepAlive: true (restart on crash)
- [ ] ThrottleInterval: 10 (prevent crash loops)
- [ ] StandardOutPath and StandardErrorPath point to `~/.tlc/logs/server.log`
- [ ] `installAgent()` writes plist to `~/Library/LaunchAgents/com.tlc.server.plist`
- [ ] `uninstallAgent()` removes plist and unloads from launchd
- [ ] `isInstalled()` checks if plist file exists

**Test Cases:**
- generatePlist returns valid XML with correct label
- generatePlist includes KeepAlive and ThrottleInterval
- generatePlist sets WorkingDirectory and EnvironmentVariables
- generatePlist uses absolute node path
- installAgent writes plist to correct location
- uninstallAgent removes plist file
- isInstalled returns true when plist exists, false otherwise

---

### Task 2: Add server startup guard (port conflict detection)

**Goal:** Before the server starts listening, check if port 3147 is already in use. If it's another TLC server instance, exit cleanly. If it's a different process, log a clear error and exit.

**Files:**
- server/lib/port-guard.js
- server/lib/port-guard.test.js

**Acceptance Criteria:**
- [ ] `checkPort(port)` returns `{ available: true }` or `{ available: false, pid, command }`
- [ ] Uses `net.createServer().listen()` to test port availability
- [ ] On conflict, logs clear message: "Port {port} in use by PID {pid} ({command})"
- [ ] Exits with code 1 on conflict (launchd ThrottleInterval prevents restart spam)
- [ ] Handles EADDRINUSE gracefully

**Test Cases:**
- checkPort returns available:true when port is free
- checkPort returns available:false with pid when port is occupied
- checkPort handles EADDRINUSE error
- Graceful message on port conflict

---

### Task 3: Wire port guard into server startup

**Goal:** Integrate port-guard into server/index.js so the server checks for port conflicts before listening.

**Files:**
- server/index.js

**Acceptance Criteria:**
- [ ] Port guard runs before `server.listen()`
- [ ] Server exits cleanly if port is in use
- [ ] Normal startup unaffected when port is free

**Test Cases:**
- N/A (integration wiring, covered by Task 2 unit tests)

---

### Task 4: Update SessionStart hook as safety net

**Goal:** The SessionStart hook checks if the TLC server is running (via `/api/health`). If not, it starts it via `launchctl kickstart` (if LaunchAgent is installed) or falls back to `node server/index.js &`.

**Files:**
- .claude/hooks/tlc-session-init.sh

**Acceptance Criteria:**
- [ ] Checks `curl -sf http://localhost:3147/api/health` (1s timeout)
- [ ] If healthy, reports "TLC server running" and continues
- [ ] If unhealthy and LaunchAgent installed, runs `launchctl kickstart -k gui/$(id -u)/com.tlc.server`
- [ ] If unhealthy and no LaunchAgent, starts server in background: `nohup node server/index.js &`
- [ ] Waits up to 3s for server to come up after start attempt
- [ ] Never blocks — always exits 0
- [ ] Preserves existing TLC project detection message

**Test Cases:**
- Script exits 0 when server is healthy
- Script exits 0 when server is down (never blocks)
- Script preserves existing TLC detection output

---

### Task 5: Add `/tlc:server` install/uninstall commands

**Goal:** Wire the LaunchAgent into a user-facing command so users can `install` and `uninstall` the always-on server.

**Files:**
- server/lib/launchd-agent.js (add loadAgent/unloadAgent using launchctl)

**Acceptance Criteria:**
- [ ] `loadAgent()` runs `launchctl load ~/Library/LaunchAgents/com.tlc.server.plist`
- [ ] `unloadAgent()` runs `launchctl unload ...` before removing plist
- [ ] `statusAgent()` checks if agent is loaded via `launchctl list com.tlc.server`
- [ ] Clear output: "TLC server installed as LaunchAgent — starts on login, restarts on crash"

**Test Cases:**
- loadAgent calls launchctl load with correct path
- unloadAgent calls launchctl unload then removes plist
- statusAgent returns loaded/not-loaded state

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 2 | Wire port guard needs port guard module |
| 4 | 1 | SessionStart fallback references LaunchAgent |
| 5 | 1 | Install/uninstall uses launchd-agent module |

**Parallel groups:**
- Group A: Tasks 1, 2 (independent modules)
- Group B: Tasks 3, 4, 5 (after their dependencies)

## Estimated Scope

- Tasks: 5
- Files: 6 (2 new modules + tests, 2 modifications)
- Tests: ~18 (estimated)
