# /tlc:server - TLC Development Server

Launch a unified development environment with live app preview, real-time logs, and team collaboration.

## Usage

```
/tlc:server [--port 3147]
```

## What This Does

Starts a **mini-Replit experience** for your TLC project:

1. **Runs your app** - Auto-detects and starts your dev server
2. **Live preview** - Embeds running app in dashboard
3. **Real-time logs** - App logs, test output, git activity
4. **Team tools** - Task board, bug submission, status
5. **Hot reload** - Changes reflect immediately

```
┌─────────────────────────────────────────────────────────────────┐
│  TLC Development Server                              [Stop] [⚙] │
├─────────────────────────────────────────────────────────────────┤
│                          │                                      │
│   ┌─────────────────┐    │    ┌────────────────────────────┐   │
│   │  LIVE PREVIEW   │    │    │  LOGS                      │   │
│   │                 │    │    │                            │   │
│   │  ┌───────────┐  │    │    │  [App] [Tests] [Git]       │   │
│   │  │  Your App │  │    │    │                            │   │
│   │  │  Running  │  │    │    │  > Server started on :3000 │   │
│   │  │   Here    │  │    │    │  > GET /api/users 200 12ms │   │
│   │  │           │  │    │    │  > POST /api/login 401 8ms │   │
│   │  └───────────┘  │    │    │  > ✓ 12 tests passing      │   │
│   │                 │    │    │                            │   │
│   │  [Open in Tab]  │    │    └────────────────────────────┘   │
│   └─────────────────┘    │                                      │
│                          │    ┌────────────────────────────┐   │
├──────────────────────────┤    │  TASKS          Phase 2    │   │
│  REPORT BUG              │    │                            │   │
│  ────────────────────    │    │  ✓ Task 1 @alice           │   │
│  What's wrong?           │    │  → Task 2 @bob (working)   │   │
│  ┌────────────────────┐  │    │  ○ Task 3 (available)      │   │
│  │                    │  │    │  ○ Task 4 (available)      │   │
│  └────────────────────┘  │    │                            │   │
│  [Screenshot] [Submit]   │    │  Tests: 12/15 passing      │   │
│                          │    └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Process

### Step 1: Detect Project Type

Scan for project configuration:

```javascript
const PROJECT_TYPES = {
  // Node.js / JavaScript
  'package.json': {
    detect: (pkg) => {
      if (pkg.scripts?.dev) return { cmd: 'npm', args: ['run', 'dev'] };
      if (pkg.scripts?.start) return { cmd: 'npm', args: ['start'] };
      if (pkg.dependencies?.next) return { cmd: 'npx', args: ['next', 'dev'] };
      if (pkg.dependencies?.vite) return { cmd: 'npx', args: ['vite'] };
      if (pkg.dependencies?.express) return { cmd: 'node', args: ['src/index.js'] };
      return { cmd: 'npm', args: ['start'] };
    },
    defaultPort: 3000
  },

  // Python
  'pyproject.toml': {
    detect: (toml) => {
      if (toml.tool?.poetry) return { cmd: 'poetry', args: ['run', 'python', '-m', 'uvicorn', 'main:app', '--reload'] };
      return { cmd: 'python', args: ['-m', 'uvicorn', 'main:app', '--reload'] };
    },
    defaultPort: 8000
  },
  'requirements.txt': {
    cmd: 'python', args: ['-m', 'flask', 'run'],
    defaultPort: 5000
  },

  // Go
  'go.mod': {
    cmd: 'go', args: ['run', '.'],
    defaultPort: 8080
  },

  // Ruby
  'Gemfile': {
    detect: (gemfile) => {
      if (gemfile.includes('rails')) return { cmd: 'rails', args: ['server'] };
      return { cmd: 'ruby', args: ['app.rb'] };
    },
    defaultPort: 3000
  },

  // Rust
  'Cargo.toml': {
    cmd: 'cargo', args: ['run'],
    defaultPort: 8080
  }
};
```

### Step 2: Start App Server

```javascript
const { spawn } = require('child_process');

function startAppServer(projectType) {
  const config = PROJECT_TYPES[projectType];
  const appPort = process.env.PORT || config.defaultPort;

  const app = spawn(config.cmd, config.args, {
    env: { ...process.env, PORT: appPort },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Stream stdout to dashboard
  app.stdout.on('data', (data) => {
    broadcast('app-log', { stream: 'stdout', data: data.toString() });
  });

  // Stream stderr to dashboard
  app.stderr.on('data', (data) => {
    broadcast('app-log', { stream: 'stderr', data: data.toString() });
  });

  return { process: app, port: appPort };
}
```

### Step 3: Start TLC Dashboard Server

```javascript
const express = require('express');
const { WebSocketServer } = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const TLC_PORT = 3147;
const APP_PORT = 3000; // detected from project

// Serve dashboard UI
app.use(express.static('.tlc/dashboard'));
app.use(express.json());

// Proxy to running app (for iframe embed)
app.use('/app', createProxyMiddleware({
  target: `http://localhost:${APP_PORT}`,
  changeOrigin: true,
  pathRewrite: { '^/app': '' },
  ws: true // WebSocket support for hot reload
}));

// API endpoints
app.get('/api/status', (req, res) => { /* ... */ });
app.get('/api/logs', (req, res) => { /* ... */ });
app.post('/api/bug', (req, res) => { /* ... */ });
app.get('/api/tasks', (req, res) => { /* ... */ });
app.post('/api/test', (req, res) => { runTests(); });
app.post('/api/restart', (req, res) => { restartApp(); });

const server = app.listen(TLC_PORT);
const wss = new WebSocketServer({ server });
```

### Step 4: Create Dashboard UI

Create `.tlc/dashboard/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>TLC Dev Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0d1117;
      color: #e6edf3;
      height: 100vh;
      overflow: hidden;
    }

    .header {
      background: #161b22;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #30363d;
    }
    .header h1 { font-size: 16px; color: #58a6ff; }
    .header .status { display: flex; gap: 12px; align-items: center; }
    .header .status .dot { width: 8px; height: 8px; border-radius: 50%; }
    .header .status .dot.running { background: #3fb950; }
    .header .status .dot.stopped { background: #f85149; }

    .main {
      display: grid;
      grid-template-columns: 1fr 400px;
      grid-template-rows: 1fr 1fr;
      height: calc(100vh - 50px);
    }

    .preview {
      grid-row: 1 / 3;
      border-right: 1px solid #30363d;
      display: flex;
      flex-direction: column;
    }
    .preview-header {
      padding: 8px 12px;
      background: #161b22;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #30363d;
    }
    .preview-header input {
      flex: 1;
      margin: 0 10px;
      padding: 6px 10px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
    }
    .preview iframe {
      flex: 1;
      border: none;
      background: white;
    }

    .logs {
      border-bottom: 1px solid #30363d;
      display: flex;
      flex-direction: column;
    }
    .logs-header {
      padding: 8px 12px;
      background: #161b22;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #30363d;
    }
    .logs-header button {
      padding: 4px 12px;
      background: transparent;
      border: 1px solid #30363d;
      border-radius: 4px;
      color: #8b949e;
      cursor: pointer;
    }
    .logs-header button.active {
      background: #21262d;
      color: #e6edf3;
      border-color: #58a6ff;
    }
    .logs-content {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      background: #010409;
    }
    .log-line { padding: 2px 0; }
    .log-line.error { color: #f85149; }
    .log-line.success { color: #3fb950; }
    .log-line.info { color: #58a6ff; }
    .log-line.warn { color: #d29922; }

    .sidebar {
      display: flex;
      flex-direction: column;
    }
    .tasks {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .tasks h2 {
      font-size: 12px;
      text-transform: uppercase;
      color: #8b949e;
      margin-bottom: 12px;
    }
    .task {
      padding: 10px;
      background: #161b22;
      border-radius: 6px;
      margin-bottom: 8px;
      border-left: 3px solid transparent;
    }
    .task.done { border-left-color: #3fb950; opacity: 0.7; }
    .task.working { border-left-color: #58a6ff; }
    .task.available { border-left-color: #8b949e; }
    .task .title { font-weight: 500; }
    .task .meta { font-size: 11px; color: #8b949e; margin-top: 4px; }

    .bug-form {
      padding: 12px;
      background: #161b22;
      border-top: 1px solid #30363d;
    }
    .bug-form h2 {
      font-size: 12px;
      text-transform: uppercase;
      color: #8b949e;
      margin-bottom: 12px;
    }
    .bug-form textarea {
      width: 100%;
      height: 60px;
      padding: 8px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      resize: none;
      margin-bottom: 8px;
    }
    .bug-form .actions {
      display: flex;
      gap: 8px;
    }
    .bug-form button {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
    }
    .bug-form .screenshot {
      background: #21262d;
      color: #e6edf3;
      flex: 1;
    }
    .bug-form .submit {
      background: #238636;
      color: white;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px;
      background: #161b22;
      border-top: 1px solid #30363d;
    }
    .stat {
      text-align: center;
      padding: 8px;
      background: #0d1117;
      border-radius: 6px;
    }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-value.green { color: #3fb950; }
    .stat-value.red { color: #f85149; }
    .stat-value.blue { color: #58a6ff; }
    .stat-label { font-size: 10px; color: #8b949e; }
  </style>
</head>
<body>
  <div class="header">
    <h1>TLC Dev Server</h1>
    <div class="status">
      <span class="dot running" id="status-dot"></span>
      <span id="status-text">Running</span>
      <button onclick="runTests()">Run Tests</button>
      <button onclick="restartApp()">Restart</button>
    </div>
  </div>

  <div class="main">
    <div class="preview">
      <div class="preview-header">
        <span>Preview</span>
        <input type="text" id="url-bar" value="http://localhost:3000/" onkeypress="if(event.key==='Enter')navigateTo(this.value)">
        <button onclick="openInTab()">Open in Tab ↗</button>
      </div>
      <iframe id="app-frame" src="/app/"></iframe>
    </div>

    <div class="logs">
      <div class="logs-header">
        <button class="active" onclick="showLogs('app')">App</button>
        <button onclick="showLogs('test')">Tests</button>
        <button onclick="showLogs('git')">Git</button>
      </div>
      <div class="logs-content" id="logs"></div>
    </div>

    <div class="sidebar">
      <div class="tasks" id="tasks">
        <h2>Phase 2: Authentication</h2>
        <!-- Tasks populated by JS -->
      </div>

      <div class="bug-form">
        <h2>Report Bug</h2>
        <textarea id="bug-desc" placeholder="What went wrong?"></textarea>
        <div class="actions">
          <button class="screenshot" onclick="takeScreenshot()">📷 Screenshot</button>
          <button class="submit" onclick="submitBug()">Submit Bug</button>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value green" id="tests-pass">12</div>
          <div class="stat-label">Passing</div>
        </div>
        <div class="stat">
          <div class="stat-value red" id="tests-fail">3</div>
          <div class="stat-label">Failing</div>
        </div>
        <div class="stat">
          <div class="stat-value blue" id="bugs-open">2</div>
          <div class="stat-label">Open Bugs</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket(`ws://${location.host}`);
    const logs = { app: [], test: [], git: [] };
    let currentLogType = 'app';

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch(msg.type) {
        case 'app-log':
          addLog('app', msg.data.data, detectLogLevel(msg.data.data));
          break;
        case 'test-output':
          addLog('test', msg.data.data, msg.data.stream === 'stderr' ? 'error' : 'info');
          break;
        case 'test-complete':
          addLog('test', `Tests completed: exit code ${msg.data.exitCode}`,
                 msg.data.exitCode === 0 ? 'success' : 'error');
          refreshStats();
          break;
        case 'git-activity':
          addLog('git', msg.data.entry, 'info');
          break;
        case 'app-restart':
          addLog('app', '--- App restarting ---', 'warn');
          break;
        case 'task-update':
          refreshTasks();
          break;
        case 'bug-created':
          addLog('app', `Bug ${msg.data.bugId} created`, 'warn');
          refreshStats();
          break;
      }
    };

    function detectLogLevel(text) {
      if (/error|fail|exception/i.test(text)) return 'error';
      if (/warn/i.test(text)) return 'warn';
      if (/success|✓|pass/i.test(text)) return 'success';
      return '';
    }

    function addLog(type, text, level = '') {
      logs[type].push({ text, level, time: new Date() });
      if (logs[type].length > 1000) logs[type].shift();
      if (type === currentLogType) renderLogs();
    }

    function renderLogs() {
      const container = document.getElementById('logs');
      container.innerHTML = logs[currentLogType].map(l =>
        `<div class="log-line ${l.level}">${l.text}</div>`
      ).join('');
      container.scrollTop = container.scrollHeight;
    }

    function showLogs(type) {
      currentLogType = type;
      document.querySelectorAll('.logs-header button').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      renderLogs();
    }

    function navigateTo(url) {
      document.getElementById('app-frame').src = url.replace(/^http:\/\/localhost:\d+/, '/app');
    }

    function openInTab() {
      window.open('http://localhost:3000', '_blank');
    }

    async function runTests() {
      addLog('test', '--- Running tests ---', 'info');
      await fetch('/api/test', { method: 'POST' });
    }

    async function restartApp() {
      await fetch('/api/restart', { method: 'POST' });
    }

    async function submitBug() {
      const desc = document.getElementById('bug-desc').value;
      if (!desc) return alert('Please describe the bug');

      const res = await fetch('/api/bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: desc,
          url: document.getElementById('url-bar').value,
          screenshot: window.lastScreenshot || null
        })
      });
      const data = await res.json();
      alert(`Bug ${data.bugId} created!`);
      document.getElementById('bug-desc').value = '';
      window.lastScreenshot = null;
    }

    async function takeScreenshot() {
      // Use html2canvas or similar to capture the iframe
      // For now, just note that a screenshot was requested
      alert('Screenshot captured (preview area)');
      window.lastScreenshot = 'screenshot-placeholder';
    }

    async function refreshTasks() {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      const container = document.getElementById('tasks');
      container.innerHTML = `<h2>Phase ${tasks.phase}: ${tasks.phaseName}</h2>` +
        tasks.items.map(t => `
          <div class="task ${t.status}">
            <div class="title">${t.status === 'done' ? '✓' : t.status === 'working' ? '→' : '○'} ${t.title}</div>
            <div class="meta">${t.owner ? '@' + t.owner : 'Available'}</div>
          </div>
        `).join('');
    }

    async function refreshStats() {
      const res = await fetch('/api/status');
      const data = await res.json();
      document.getElementById('tests-pass').textContent = data.testsPass || 0;
      document.getElementById('tests-fail').textContent = data.testsFail || 0;
      document.getElementById('bugs-open').textContent = data.bugsOpen || 0;
    }

    // Initial load
    refreshTasks();
    refreshStats();
    addLog('app', 'Connected to TLC Dev Server', 'success');
  </script>
</body>
</html>
```

### Step 5: File Watching & Hot Reload

```javascript
const chokidar = require('chokidar');

// Watch source files for changes
const watcher = chokidar.watch(['src', 'lib', 'app'], {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', (path) => {
  broadcast('file-change', { path });

  // Many frameworks auto-reload, but notify dashboard
  broadcast('app-log', {
    stream: 'stdout',
    data: `File changed: ${path}`
  });
});

// Watch .planning for TLC updates
chokidar.watch('.planning', { persistent: true })
  .on('change', (path) => {
    broadcast('tlc-update', { path });
    if (path.includes('PLAN.md')) {
      broadcast('task-update', {});
    }
  });
```

### Step 6: Screenshot Capture

For QA bug reports with screenshots:

```javascript
// Client-side: Capture iframe content
async function capturePreview() {
  const iframe = document.getElementById('app-frame');

  // Option 1: Use html2canvas on iframe document
  const canvas = await html2canvas(iframe.contentDocument.body);
  return canvas.toDataURL('image/png');

  // Option 2: Use browser screenshot API (if available)
  // Option 3: Server-side puppeteer capture
}

// Server-side: Store screenshot with bug
app.post('/api/bug', async (req, res) => {
  const { description, url, screenshot } = req.body;

  // Save screenshot to .tlc/screenshots/BUG-XXX.png
  if (screenshot) {
    const screenshotPath = `.tlc/screenshots/${bugId}.png`;
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.split(',')[1], 'base64'));
  }

  // Create bug entry with screenshot reference
  const bugEntry = createBugEntry({
    description,
    url,
    screenshot: screenshot ? `screenshots/${bugId}.png` : null
  });

  res.json({ success: true, bugId });
});
```

## Configuration

In `.tlc.json`:

```json
{
  "server": {
    "dashboardPort": 3147,
    "appPort": 3000,
    "openBrowser": true,
    "proxy": {
      "enabled": true,
      "pathRewrite": { "^/app": "" }
    },
    "watch": {
      "source": ["src", "lib", "app"],
      "ignore": ["node_modules", "dist", ".git"]
    }
  }
}
```

## Custom Start Commands

Override auto-detection in `.tlc.json`:

```json
{
  "server": {
    "startCommand": "npm run dev:custom",
    "appPort": 4000
  }
}
```

## Example Session

```
> /tlc:server

Detecting project type...
  Found: package.json (Next.js)
  Start command: npm run dev
  App port: 3000

Starting app server...
  ✓ App running at http://localhost:3000

Starting TLC dashboard...
  ✓ Dashboard at http://localhost:3147

Opening browser...

╭──────────────────────────────────────────────────────────────╮
│  TLC Dev Server                                              │
│                                                              │
│  Dashboard:  http://localhost:3147                           │
│  App:        http://localhost:3000 (embedded in dashboard)   │
│                                                              │
│  Share with QA: http://192.168.1.5:3147                      │
╰──────────────────────────────────────────────────────────────╯

[10:15:32] App started
[10:15:33] Client connected (Chrome)
[10:15:45] GET /api/users 200 12ms
[10:16:02] File changed: src/components/Login.tsx
[10:16:03] Hot reload triggered
[10:16:30] Bug submitted: BUG-009 by QA
[10:17:00] Tests started
[10:17:15] Tests complete: 14 pass, 1 fail

Press Ctrl+C to stop
```

## Features Summary

| Feature | Description |
|---------|-------------|
| **Live Preview** | Your app embedded in dashboard |
| **App Logs** | Real-time stdout/stderr from your app |
| **Test Logs** | Test output with pass/fail highlighting |
| **Git Activity** | Commits, pulls, pushes as they happen |
| **Task Board** | Current phase tasks with claim status |
| **Bug Submission** | Form with optional screenshot |
| **Hot Reload** | File changes trigger app refresh |
| **Proxy** | Dashboard proxies to app (avoids CORS) |

## QA Workflow

1. Engineer runs `/tlc:server`
2. QA opens `http://192.168.1.x:3147` in browser
3. QA sees live preview of app + task board
4. QA tests features in the embedded preview
5. QA finds bug → fills form → attaches screenshot
6. Bug appears in `.planning/BUGS.md` instantly
7. Engineer sees bug in logs, fixes it
8. App hot-reloads, QA re-tests
9. QA marks bug verified

## Notes

- Single URL for everything (PO/QA don't need technical setup)
- Works on local network (same WiFi)
- For remote access, use ngrok: `ngrok http 3147`
- All data flows through git (bugs, tasks, status)
