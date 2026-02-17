# Phase 80: Dashboard as a Service — Plan

## Overview

Transform the TLC dashboard from a project-level dev tool into a standalone platform. Run it once via Docker, see all your projects, manage Docker containers, trigger builds, and deploy to VPSes — all from the browser.

## Prerequisites

- [x] Phase 79 complete (scanner intelligence + memory wiring)
- [x] Dashboard running in Docker (`docker-compose.dev.yml`)
- [x] Project scanner with recursion boundary fix
- [x] Install `dockerode` npm package (Docker API client)
- [x] Install `ssh2` npm package (SSH client)

## Tasks

### Task 1: Docker client library + REST API [x]

**Goal:** Create a Docker socket client and Express router exposing container/image/volume operations.

**Files:**
- server/lib/docker-client.js (new)
- server/lib/docker-client.test.js (new)
- server/lib/docker-api.js (new)
- server/lib/docker-api.test.js (new)

**Details:**

`docker-client.js` wraps `dockerode` to talk to `/var/run/docker.sock`:
- `listContainers(all)` — running + stopped containers with name, image, status, ports, created
- `getContainer(id)` — full detail including env, mounts, network
- `startContainer(id)` / `stopContainer(id)` / `restartContainer(id)` — lifecycle controls
- `removeContainer(id, force)` — remove stopped container
- `getContainerStats(id)` — single snapshot of CPU/memory/network
- `getContainerLogs(id, opts)` — return recent logs (tail N lines)
- `streamContainerLogs(id, callback)` — live log stream (returns abort function)
- `streamContainerStats(id, callback)` — live stats stream (returns abort function)
- `listImages()` — images with repo, tag, size, created
- `listVolumes()` — volumes with name, driver, mountpoint
- `isAvailable()` — check if Docker socket is accessible
- `matchContainerToProject(container, projects)` — match by name pattern, labels, or compose project

`docker-api.js` is an Express Router:
- `GET /docker/status` — Docker available? Version info
- `GET /docker/containers` — list all containers
- `GET /docker/containers/:id` — container detail
- `POST /docker/containers/:id/start` — start
- `POST /docker/containers/:id/stop` — stop
- `POST /docker/containers/:id/restart` — restart
- `DELETE /docker/containers/:id` — remove
- `GET /docker/containers/:id/logs?tail=100` — recent logs
- `GET /docker/containers/:id/stats` — current stats snapshot
- `GET /docker/images` — list images
- `GET /docker/volumes` — list volumes

All routes return JSON. Graceful 503 when Docker socket unavailable.

**Acceptance Criteria:**
- [ ] Docker client connects via socket and lists containers
- [ ] Container start/stop/restart work
- [ ] Logs returned with timestamps
- [ ] Stats return CPU %, memory usage/limit, network I/O
- [ ] Images and volumes listed with metadata
- [ ] Returns 503 with setup instructions when Docker unavailable
- [ ] Container-to-project matching works by name pattern

**Test Cases:**
- listContainers returns formatted container objects (mock dockerode)
- getContainer returns full detail for valid ID
- startContainer calls dockerode start
- stopContainer calls dockerode stop
- restartContainer calls dockerode restart
- getContainerStats calculates CPU % from raw stats
- listImages returns formatted image objects
- isAvailable returns false when socket missing
- matchContainerToProject matches by name pattern
- API routes return 503 when Docker unavailable
- API routes return containers list
- API routes return 404 for unknown container

---

### Task 2: Docker WebSocket streaming (logs + stats) [x]

**Goal:** Add real-time Docker log streaming and stats via WebSocket, wire Docker API into server.

**Files:**
- server/index.js (modify — mount Docker router + add WS handlers)
- server/lib/docker-client.js (modify — ensure stream methods return proper cleanup)

**Details:**

WebSocket message types (client → server):
- `{ type: 'docker:subscribe-logs', containerId: '...' }` — start log stream
- `{ type: 'docker:unsubscribe-logs', containerId: '...' }` — stop log stream
- `{ type: 'docker:subscribe-stats', containerId: '...' }` — start stats stream
- `{ type: 'docker:unsubscribe-stats', containerId: '...' }` — stop stats stream

WebSocket message types (server → client):
- `{ type: 'docker:log', containerId, data, timestamp }` — log line
- `{ type: 'docker:stats', containerId, cpu, memory, network }` — stats update
- `{ type: 'docker:container-event', event, containerId }` — start/stop/die events

In `index.js`:
- Mount `dockerApi` router at `/api/docker`
- Initialize `dockerClient` (pass socket path from env or default `/var/run/docker.sock`)
- Add WS message handlers for docker subscribe/unsubscribe
- Track active streams per WS connection, clean up on disconnect
- Listen to Docker events (container start/stop/die) and broadcast

**Acceptance Criteria:**
- [ ] Docker router mounted and accessible at /api/docker/*
- [ ] WebSocket log streaming sends real-time log lines
- [ ] WebSocket stats streaming sends CPU/memory every 2 seconds
- [ ] Streams cleaned up when client disconnects
- [ ] Docker events (start/stop/die) broadcast to all connected clients
- [ ] Multiple clients can stream different containers simultaneously

**Test Cases:**
- Docker router mounts at /api/docker
- WS subscribe-logs starts stream for container
- WS unsubscribe-logs stops stream
- WS disconnect cleans up all active streams
- Docker container events broadcast to clients

**Depends on:** Task 1

---

### Task 3: Docker management frontend page [x]

**Goal:** Build the Docker page in the dashboard — container list, detail panel, log viewer, stats graphs, images, volumes.

**Files:**
- dashboard-web/src/pages/DockerPage.tsx (new)
- dashboard-web/src/components/docker/ContainerList.tsx (new)
- dashboard-web/src/components/docker/ContainerDetail.tsx (new)
- dashboard-web/src/components/docker/LogViewer.tsx (new)
- dashboard-web/src/components/docker/StatsChart.tsx (new)
- dashboard-web/src/components/docker/ImageList.tsx (new)
- dashboard-web/src/components/docker/VolumeList.tsx (new)
- dashboard-web/src/App.tsx (modify — add /docker route)
- dashboard-web/src/components/layout/Sidebar.tsx (modify — add Docker nav item)

**Details:**

`DockerPage.tsx` — tabbed layout:
- **Containers** tab (default): table with name, image, status (badge), ports, CPU/mem sparkline, actions (start/stop/restart)
- **Images** tab: table with repo:tag, size, created
- **Volumes** tab: table with name, driver, mountpoint

`ContainerDetail.tsx` — slide-out panel or modal:
- Container info (image, ports, env vars, mounts, network)
- Live log viewer (WebSocket stream, auto-scroll, search/filter)
- Live stats (CPU % line chart, memory bar, network I/O)
- Action buttons: start/stop/restart/remove
- Link to associated TLC project (if matched)

`LogViewer.tsx`:
- Connects via WebSocket for live streaming
- Shows last 200 lines by default
- Auto-scroll with "pin to bottom" toggle
- Search/filter within logs
- Copy log selection

`StatsChart.tsx`:
- CPU % line chart (last 60 data points)
- Memory usage bar (used/limit)
- Network I/O (rx/tx bytes)
- Uses Recharts (already installed)

Color-coded status badges: running=green, exited=red, paused=yellow, created=gray.

**Acceptance Criteria:**
- [ ] Docker page accessible at /docker route
- [ ] Sidebar shows Docker navigation item with container icon
- [ ] Container list shows all containers with status badges
- [ ] Container actions (start/stop/restart) work from UI
- [ ] Live log streaming works with auto-scroll
- [ ] Stats chart shows CPU and memory in real-time
- [ ] Images and volumes tabs show data
- [ ] Shows setup instructions when Docker unavailable
- [ ] Containers linked to TLC projects when matched

**Test Cases:**
- DockerPage renders container list
- DockerPage shows "Docker not available" when 503
- ContainerList renders containers with status badges
- ContainerDetail shows container info
- LogViewer connects to WebSocket and displays logs
- StatsChart renders CPU/memory data
- ImageList renders image table
- Start/stop buttons call API endpoints

**Depends on:** Task 2

---

### Task 4: SSH client library + VPS registry API [x]

**Goal:** Create an SSH connection manager and VPS registry with CRUD operations.

**Files:**
- server/lib/ssh-client.js (new)
- server/lib/ssh-client.test.js (new)
- server/lib/vps-api.js (new)
- server/lib/vps-api.test.js (new)

**Details:**

`ssh-client.js` wraps `ssh2`:
- `connect(config)` — connect to VPS: `{ host, port, username, privateKeyPath }`
- `exec(config, command)` — execute command, return `{ stdout, stderr, exitCode }`
- `execStream(config, command, onData)` — streaming exec (for long-running commands)
- `upload(config, localPath, remotePath)` — SFTP upload file
- `testConnection(config)` — verify SSH connectivity, return server info (OS, Docker version, etc.)
- `disconnect(config)` — close connection
- Connection pooling: reuse connections to same host within 60s

VPS data model (stored in `~/.tlc/vps.json`):
```json
{
  "servers": [
    {
      "id": "uuid",
      "name": "dev-1",
      "host": "1.2.3.4",
      "port": 22,
      "username": "deploy",
      "privateKeyPath": "~/.ssh/id_rsa",
      "domain": "myapp.dev",
      "provider": "hetzner",
      "pool": true,
      "assignedProjects": ["project-id-1"],
      "status": "online",
      "lastChecked": "2026-02-18T...",
      "bootstrapped": false,
      "createdAt": "2026-02-18T..."
    }
  ]
}
```

`vps-api.js` Express Router:
- `GET /vps/servers` — list all VPS servers
- `POST /vps/servers` — register new VPS
- `GET /vps/servers/:id` — get VPS detail
- `PUT /vps/servers/:id` — update VPS config
- `DELETE /vps/servers/:id` — remove VPS
- `POST /vps/servers/:id/test` — test SSH connection
- `POST /vps/servers/:id/assign` — assign project to VPS `{ projectId }`
- `POST /vps/servers/:id/unassign` — unassign project `{ projectId }`
- `GET /vps/pool` — list pool (shared) VPSes with availability

Storage: read/write `~/.tlc/vps.json` (same config dir as workspace config).

**Acceptance Criteria:**
- [ ] SSH client connects with private key auth
- [ ] SSH exec runs command and returns output
- [ ] SSH exec streaming sends output chunks via callback
- [ ] SSH test connection returns server info
- [ ] VPS CRUD operations read/write vps.json
- [ ] VPS can be assigned to projects (shared pool model)
- [ ] VPS can be dedicated to a single project
- [ ] Connection test returns OS info, Docker version, disk space

**Test Cases:**
- SSH connect with valid config succeeds (mock ssh2)
- SSH connect with bad host rejects with error
- SSH exec returns stdout/stderr/exitCode
- SSH execStream calls onData with chunks
- SSH testConnection returns server info object
- VPS registry creates server with UUID
- VPS registry lists all servers
- VPS registry updates server config
- VPS registry deletes server
- VPS assign adds projectId to server
- VPS unassign removes projectId
- VPS pool returns only pool=true servers
- API returns 404 for unknown server ID
- API validates required fields on create

---

### Task 5: VPS bootstrap via SSH + Nginx config generator [x]

**Goal:** One-click server setup: install Docker, Nginx, Certbot, firewall. Generate Nginx configs for projects.

**Files:**
- server/lib/vps-bootstrap.js (new)
- server/lib/vps-bootstrap.test.js (new)
- server/lib/nginx-config.js (new)
- server/lib/nginx-config.test.js (new)
- server/lib/vps-api.js (modify — add bootstrap route)

**Details:**

`vps-bootstrap.js` — idempotent setup script execution via SSH:
- `bootstrap(sshConfig, options, onProgress)` — runs setup steps:
  1. Update packages (`apt update && apt upgrade -y`)
  2. Install Docker + Docker Compose (`curl -fsSL get.docker.com | sh`)
  3. Install Nginx (`apt install nginx -y`)
  4. Install Certbot (`apt install certbot python3-certbot-nginx -y`)
  5. Configure UFW firewall (allow 22, 80, 443)
  6. Create deploy user with SSH key
  7. Configure Nginx base config (wildcard subdomain ready)
  8. Enable and start services
- `onProgress(step, status, message)` — callback for each step
- `checkBootstrapStatus(sshConfig)` — verify what's already installed
- `generateBootstrapScript(options)` — generate the full bash script
- Each step is idempotent (checks before installing)

`nginx-config.js` — Nginx configuration generator (replaces caddy-config.js):
- `generateSiteConfig(project, options)` — Nginx server block for a project
  - `{ domain, port, ssl, proxyPass }`
  - Includes proxy headers, WebSocket upgrade support
- `generateWildcardConfig(baseDomain, options)` — wildcard `*.baseDomain` config
  - Routes `branch.baseDomain` to correct container port
  - Includes default server for unknown subdomains
- `generateSslConfig(domain)` — Certbot SSL snippet
- `generateUpstreamConfig(name, backends)` — upstream block for load balancing

New route in `vps-api.js`:
- `POST /vps/servers/:id/bootstrap` — trigger bootstrap (streams progress via WebSocket)
- `GET /vps/servers/:id/bootstrap-status` — check what's installed

**Acceptance Criteria:**
- [ ] Bootstrap script installs Docker, Nginx, Certbot, UFW
- [ ] Each bootstrap step is idempotent (safe to re-run)
- [ ] Progress reported per step (step name, status, message)
- [ ] Bootstrap status check detects installed components
- [ ] Nginx site config generates valid server blocks
- [ ] Wildcard config routes subdomains to container ports
- [ ] SSL config uses Let's Encrypt / Certbot
- [ ] Nginx config includes WebSocket upgrade headers

**Test Cases:**
- generateBootstrapScript returns valid bash script
- Bootstrap script includes Docker install step
- Bootstrap script includes Nginx install step
- Bootstrap script includes UFW config (ports 22, 80, 443)
- Bootstrap script creates deploy user
- checkBootstrapStatus parses installed components
- generateSiteConfig produces valid Nginx server block
- generateSiteConfig includes proxy_pass directive
- generateSiteConfig includes WebSocket upgrade headers
- generateWildcardConfig routes subdomains
- generateWildcardConfig includes default server
- generateSslConfig references Let's Encrypt paths
- Bootstrap route returns 404 for unknown server

**Depends on:** Task 4

---

### Task 6: Deploy engine + branch preview deployment [x]

**Goal:** Deploy projects to VPS via SSH (git pull + docker compose + nginx), support per-branch preview deploys with auto-cleanup.

**Files:**
- server/lib/deploy-engine.js (new)
- server/lib/deploy-engine.test.js (new)
- server/lib/vps-api.js (modify — add deploy + preview routes)

**Details:**

`deploy-engine.js`:
- `deploy(sshConfig, project, options, onProgress)` — full deploy pipeline:
  1. SSH into VPS
  2. `cd /opt/deploys/{project}` (create if needed)
  3. `git clone` or `git pull origin {branch}`
  4. `docker compose up -d --build`
  5. Generate Nginx site config → write to `/etc/nginx/sites-available/`
  6. Symlink to `sites-enabled`, `nginx -t && nginx -s reload`
  7. Run Certbot for SSL if domain set (`certbot --nginx -d domain`)
  8. Verify deployment (HTTP health check)
- `deployBranch(sshConfig, project, branch, baseDomain, onProgress)` — preview deploy:
  1. Same as deploy but to `/opt/deploys/{project}/branches/{sanitized-branch}`
  2. Container name: `tlc-{project}-{branch}`
  3. Unique port allocation (track in state file on VPS)
  4. Nginx config: `{branch}.{baseDomain}` → container port
  5. SSL via wildcard cert or per-branch cert
- `rollback(sshConfig, project, onProgress)` — rollback to previous:
  1. `git checkout HEAD~1`
  2. `docker compose up -d --build`
  3. Verify health check
- `cleanupBranch(sshConfig, project, branch)` — remove preview:
  1. Stop and remove container
  2. Remove Nginx config
  3. Remove deploy directory
  4. Reload Nginx
- `listDeployments(sshConfig, project)` — list active deployments on VPS
- `getDeploymentStatus(sshConfig, project, branch)` — health + uptime info

Uses `sanitizeBranchName()` from existing `branch-deployer.js`.

New routes in `vps-api.js`:
- `POST /vps/servers/:id/deploy` — deploy project `{ projectId, branch }`
- `POST /vps/servers/:id/deploy/rollback` — rollback `{ projectId }`
- `POST /vps/servers/:id/previews` — deploy branch preview `{ projectId, branch }`
- `DELETE /vps/servers/:id/previews/:branch` — remove preview
- `GET /vps/servers/:id/deployments` — list active deployments
- `GET /vps/servers/:id/deployments/:project/status` — deployment health

**Acceptance Criteria:**
- [ ] Deploy clones/pulls repo, runs docker compose, configures Nginx
- [ ] Deploy sets up SSL via Certbot
- [ ] Branch preview creates subdomain routing
- [ ] Branch names sanitized for DNS (slashes → dashes, lowercase, max 63 chars)
- [ ] Rollback reverts to previous git commit
- [ ] Cleanup removes container, nginx config, and files
- [ ] Deploy progress reported step-by-step
- [ ] Port conflicts detected (multiple projects on same VPS)
- [ ] Health check verifies deployment is responding

**Test Cases:**
- deploy executes git clone + docker compose + nginx steps
- deploy generates correct Nginx config for project domain
- deploy runs certbot for SSL
- deployBranch creates subdomain config
- deployBranch allocates unique port
- deployBranch sanitizes branch name for DNS
- rollback checks out previous commit
- cleanupBranch removes container and nginx config
- listDeployments returns active deploys
- getDeploymentStatus returns health info
- Deploy route validates projectId and branch
- Port conflict detection warns when ports overlap

**Depends on:** Tasks 4, 5

---

### Task 7: VPS management frontend pages [x]

**Goal:** Build VPS management UI — server registry, bootstrap progress, deploy controls, branch previews list.

**Files:**
- dashboard-web/src/pages/VpsPage.tsx (new)
- dashboard-web/src/components/vps/ServerList.tsx (new)
- dashboard-web/src/components/vps/ServerDetail.tsx (new)
- dashboard-web/src/components/vps/AddServerModal.tsx (new)
- dashboard-web/src/components/vps/BootstrapProgress.tsx (new)
- dashboard-web/src/components/vps/DeployPanel.tsx (new)
- dashboard-web/src/components/vps/PreviewList.tsx (new)
- dashboard-web/src/components/vps/MonitoringPanel.tsx (new)
- dashboard-web/src/App.tsx (modify — add /vps route + mount VPS router in server)
- server/index.js (modify — mount VPS router at /api/vps)

**Details:**

`VpsPage.tsx` — main VPS management page:
- Server list with status indicators (online/offline/bootstrapping)
- "Add Server" button opens modal form
- Per-server: name, IP, domain, assigned projects, health badge
- Click server → detail panel

`AddServerModal.tsx`:
- Form: name, host/IP, SSH port, username, private key path, domain, provider (optional)
- "Pool" toggle (shared vs dedicated)
- "Test Connection" button before save

`ServerDetail.tsx`:
- Server info card (IP, domain, OS, Docker version)
- Bootstrap section: "Setup Server" button, step-by-step progress log
- Assigned projects list with deploy buttons
- Active deployments table (project, branch, status, URL)
- Branch previews list with cleanup actions

`BootstrapProgress.tsx`:
- Step-by-step progress indicator (WebSocket updates)
- Each step: name, status icon (pending/running/done/error), message
- Re-run button if failed

`DeployPanel.tsx`:
- Select project + branch
- "Deploy" button with real-time progress log
- "Rollback" button with confirmation
- Deployment history

`PreviewList.tsx`:
- Table: branch name, URL, status, created date
- Delete button per preview
- Auto-refresh status

**Acceptance Criteria:**
- [ ] VPS page accessible at /vps route
- [ ] Sidebar shows VPS/Servers navigation item
- [ ] Server list shows all registered VPSes with health status
- [ ] Add server form validates and tests connection
- [ ] Bootstrap progress shows real-time step updates
- [ ] Deploy panel allows selecting project and branch
- [ ] Deploy progress streams via WebSocket
- [ ] Preview list shows branch URLs
- [ ] Preview cleanup works from UI

**Test Cases:**
- VpsPage renders server list
- VpsPage shows empty state when no servers
- AddServerModal validates required fields
- ServerDetail shows server info
- BootstrapProgress renders step indicators
- DeployPanel shows project selector
- PreviewList renders branch previews with URLs
- Delete preview button calls API

**Depends on:** Tasks 4, 5, 6

---

### Task 8: TLC command execution engine [x]

**Goal:** "Build" and "Deploy" buttons per project that execute TLC commands via tlc-standalone, Claude Code, or task queue.

**Files:**
- server/lib/command-runner.js (new)
- server/lib/command-runner.test.js (new)
- server/lib/workspace-api.js (modify — add command execution routes)
- dashboard-web/src/components/project/CommandPanel.tsx (new)
- dashboard-web/src/pages/ProjectDetailPage.tsx (modify — add CommandPanel)

**Details:**

`command-runner.js`:
- `detectExecutionMethod(projectPath)` — check what's available:
  1. Check if `tlc-standalone` Docker image exists → return `'container'`
  2. Check if Claude Code process is running (check pid file or socket) → return `'claude-code'`
  3. Fallback → return `'queue'`
- `executeViaContainer(projectPath, command, onOutput)` — spawn Docker container with tlc-standalone:
  - Mount project dir, run command, stream output
  - Container auto-removed after completion
- `executeViaClaude(projectPath, command, onOutput)` — send to running Claude Code:
  - Via MCP if available, or write to stdin pipe
  - Stream response back
- `queueCommand(projectPath, command)` — add to project's PLAN.md as task:
  - Append `### Queued: {command}` with timestamp
  - Return queue position
- `getCommandHistory(projectPath)` — read command log
- `cancelCommand(commandId)` — stop running command

New routes in `workspace-api.js`:
- `POST /projects/:projectId/commands/execute` — execute command `{ command: 'build' | 'deploy' | 'test' }`
- `GET /projects/:projectId/commands/method` — detect available execution method
- `GET /projects/:projectId/commands/history` — command history

WebSocket: stream command output in real-time.

`CommandPanel.tsx`:
- Shows execution method badge (Container / Claude Code / Queue)
- Buttons: Build, Deploy, Test, Custom command
- Real-time output terminal
- Command history dropdown

**Acceptance Criteria:**
- [ ] Detection correctly identifies tlc-standalone, Claude Code, or fallback
- [ ] Container execution spawns Docker container and streams output
- [ ] Queue fallback writes task to PLAN.md
- [ ] Command output streams via WebSocket in real-time
- [ ] Command history persisted per project
- [ ] CommandPanel shows in project detail view
- [ ] Cancel stops running command

**Test Cases:**
- detectExecutionMethod returns 'container' when image exists
- detectExecutionMethod returns 'claude-code' when process running
- detectExecutionMethod returns 'queue' as fallback
- executeViaContainer spawns docker run with correct mounts
- queueCommand appends task to PLAN.md
- getCommandHistory returns recent commands
- cancelCommand kills running process
- API validates command type
- API returns 404 for unknown project

**Depends on:** Task 2 (WebSocket patterns)

---

### Task 9: VPS monitoring + alerts [x]

**Goal:** Monitor VPS health (disk, CPU, memory, network) and alert on issues.

**Files:**
- server/lib/vps-monitor.js (new)
- server/lib/vps-monitor.test.js (new)
- server/lib/vps-api.js (modify — add monitoring routes)

**Details:**

`vps-monitor.js`:
- `getServerMetrics(sshConfig)` — SSH and collect:
  - Disk usage (`df -h /`)
  - CPU usage (`top -bn1 | grep 'Cpu(s)'` or `/proc/stat`)
  - Memory usage (`free -m`)
  - Network stats (`cat /proc/net/dev`)
  - Container health (`docker ps --format json`)
  - Uptime (`uptime`)
- `checkAlerts(metrics, thresholds)` — evaluate alert conditions:
  - Disk > 80% → warning, > 90% → critical
  - Container crashed (exited with non-zero) → alert
  - SSL cert expiring within 14 days → warning
  - Server unreachable → critical
- `startMonitoringLoop(servers, interval, onAlert)` — periodic check (default 5 min)
- `getMetricsHistory(serverId)` — return stored metrics (last 24h)
- `checkSslExpiry(sshConfig, domain)` — check cert expiry date

New routes in `vps-api.js`:
- `GET /vps/servers/:id/metrics` — current metrics snapshot
- `GET /vps/servers/:id/metrics/history` — metrics over time
- `GET /vps/servers/:id/alerts` — active alerts
- `GET /vps/alerts` — all alerts across all servers

Metrics stored in `~/.tlc/metrics/` as JSON files (one per server, rolling 24h window).

**Acceptance Criteria:**
- [ ] Metrics collected via SSH (disk, CPU, memory, network)
- [ ] Container health checked on VPS
- [ ] Alerts fire for disk > 80%, crashed containers, SSL expiry
- [ ] Monitoring loop runs every 5 minutes
- [ ] Metrics history stored for 24 hours
- [ ] SSL expiry checked per domain
- [ ] Alerts broadcast via WebSocket

**Test Cases:**
- getServerMetrics parses disk usage from df output
- getServerMetrics parses CPU from top/proc output
- getServerMetrics parses memory from free output
- checkAlerts returns warning for disk > 80%
- checkAlerts returns critical for disk > 90%
- checkAlerts returns alert for crashed container
- checkAlerts returns warning for SSL expiring < 14 days
- checkSslExpiry parses cert expiry date
- startMonitoringLoop calls getServerMetrics periodically
- getMetricsHistory returns stored data points
- API returns current metrics for server
- API returns all active alerts

**Depends on:** Task 4

---

### Task 10: Production docker-compose + integration wiring [x]

**Goal:** Create the production standalone `docker-compose.yml`, update dev compose with Docker socket, and wire all Phase 80 routes into the server.

**Files:**
- docker-compose.yml (new — production standalone)
- docker-compose.dev.yml (modify — add Docker socket mount)
- server/package.json (modify — add dockerode + ssh2 dependencies)
- server/index.js (verify all routers mounted)

**Details:**

Production `docker-compose.yml` — the "just run it" experience:
```yaml
services:
  dashboard:
    image: node:20-alpine
    container_name: tlc-dashboard
    working_dir: /tlc
    command: node server/index.js --standalone --skip-db
    ports:
      - "3147:3147"
    volumes:
      - .:/tlc
      - /var/run/docker.sock:/var/run/docker.sock
      - ${HOME}/.tlc:${HOME}/.tlc
      - ${HOME}:${HOME}:ro
      - ${HOME}/.ssh:${HOME}/.ssh:ro
    environment:
      - TLC_PORT=3147
      - TLC_STANDALONE=true
      - TLC_AUTH=false
      - TLC_CONFIG_DIR=${HOME}/.tlc
      - DOCKER_SOCKET=/var/run/docker.sock
    restart: unless-stopped
```

Key additions:
- `/var/run/docker.sock` mounted for Docker visibility
- `~/.ssh` mounted read-only for VPS SSH access
- `TLC_STANDALONE=true` flag for standalone mode
- `--standalone` server flag: skip app proxy, enable Docker + VPS features

Update `docker-compose.dev.yml`:
- Add Docker socket mount to dashboard service
- Add SSH key mount to dashboard service

Dependencies to add to `server/package.json`:
- `dockerode` — Docker API client
- `ssh2` — SSH client

Verification:
- All routers mounted: `/api/docker/*`, `/api/vps/*`
- WebSocket handlers registered for docker + deploy streaming
- Graceful degradation when Docker socket or SSH unavailable

**Acceptance Criteria:**
- [ ] `docker compose up` starts standalone dashboard
- [ ] Dashboard accessible at localhost:3147
- [ ] Docker socket mounted and containers visible
- [ ] SSH keys accessible for VPS operations
- [ ] No .env file required (zero config)
- [ ] Docker API returns data from host Docker
- [ ] VPS API loads/saves to ~/.tlc/vps.json
- [ ] Server starts cleanly even without Docker socket (graceful 503)

**Test Cases:**
- docker-compose.yml syntax is valid
- Dashboard container starts with standalone flag
- Docker socket mount enables container listing
- SSH mount enables VPS connections
- Server starts without Docker socket (degraded mode)
- All API routes accessible after startup

**Depends on:** Tasks 1-9

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Uses docker-client.js for streaming |
| 3 | 2 | Needs Docker API + WebSocket mounted |
| 5 | 4 | Uses ssh-client.js for bootstrap |
| 6 | 4, 5 | Uses SSH client + Nginx config |
| 7 | 4, 5, 6 | Frontend for all VPS features |
| 8 | 2 | Uses WebSocket streaming patterns |
| 9 | 4 | Uses SSH client for metrics collection |
| 10 | 1-9 | Integration of all components |

**Parallel groups:**
- Group A: Tasks 1, 4 (independent new modules — can work simultaneously)
- Group B: Tasks 2, 5 (each depends on one from Group A)
- Group C: Tasks 3, 6, 8, 9 (depend on Group B)
- Group D: Task 7 (depends on 4, 5, 6)
- Group E: Task 10 (integration — after all others)

## File Overlap Analysis

```
Files by task:
  Task 1:  server/lib/docker-client.js (new), server/lib/docker-api.js (new)
  Task 2:  server/index.js, server/lib/docker-client.js ← overlap Task 1
  Task 3:  dashboard-web/src/App.tsx, dashboard-web/src/pages/DockerPage.tsx (new)
  Task 4:  server/lib/ssh-client.js (new), server/lib/vps-api.js (new)
  Task 5:  server/lib/vps-bootstrap.js (new), server/lib/nginx-config.js (new), server/lib/vps-api.js ← overlap Task 4
  Task 6:  server/lib/deploy-engine.js (new), server/lib/vps-api.js ← overlap Tasks 4, 5
  Task 7:  server/index.js ← overlap Task 2, dashboard-web/src/App.tsx ← overlap Task 3
  Task 8:  server/lib/workspace-api.js, server/lib/command-runner.js (new)
  Task 9:  server/lib/vps-monitor.js (new), server/lib/vps-api.js ← overlap Tasks 4, 5, 6
  Task 10: docker-compose.yml (new), docker-compose.dev.yml, server/index.js ← overlap Tasks 2, 7

Sequencing required:
  server/lib/vps-api.js → Task 4 → Task 5 → Task 6 → Task 9
  server/index.js → Task 2 → Task 7 → Task 10
  dashboard-web/src/App.tsx → Task 3 → Task 7
```

## Estimated Scope

- Tasks: 10
- New files: ~25 (server modules + tests + frontend pages + components)
- Modified files: ~6 (index.js, App.tsx, Sidebar, workspace-api.js, docker-compose.dev.yml, package.json)
- Tests: ~120 (estimated)
