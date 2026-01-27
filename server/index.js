#!/usr/bin/env node

const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

const { detectProject } = require('./lib/project-detector');
const { parsePlan, parseBugs } = require('./lib/plan-parser');

// Configuration
const TLC_PORT = parseInt(process.env.TLC_PORT || '3147');
const PROJECT_DIR = process.cwd();

// State
let appProcess = null;
let appPort = 3000;
let wsClients = new Set();
const logs = { app: [], test: [], git: [] };

// Create Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));

// Broadcast to all WebSocket clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  wsClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Add log entry
function addLog(type, text, level = '') {
  const entry = { text, level, time: new Date().toISOString() };
  logs[type].push(entry);
  if (logs[type].length > 1000) logs[type].shift();
  broadcast(`${type}-log`, { data: text, level });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[TLC] Client connected (${wsClients.size} total)`);

  // Send recent logs to new client
  ws.send(JSON.stringify({ type: 'init', data: { logs, appPort } }));

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[TLC] Client disconnected (${wsClients.size} total)`);
  });
});

// Start the user's app
async function startApp() {
  const project = detectProject(PROJECT_DIR);

  if (!project) {
    addLog('app', 'Could not detect project type. Create a start command in .tlc.json', 'error');
    return;
  }

  appPort = project.port;
  addLog('app', `Detected: ${project.name}`, 'info');
  addLog('app', `Command: ${project.cmd} ${project.args.join(' ')}`, 'info');
  addLog('app', `Port: ${appPort}`, 'info');

  // Kill existing process if any
  if (appProcess) {
    appProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  appProcess = spawn(project.cmd, project.args, {
    cwd: PROJECT_DIR,
    env: { ...process.env, PORT: appPort.toString() },
    shell: true
  });

  appProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) addLog('app', text);
  });

  appProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) addLog('app', text, 'error');
  });

  appProcess.on('exit', (code) => {
    addLog('app', `App exited with code ${code}`, code === 0 ? 'info' : 'error');
    appProcess = null;
  });

  broadcast('app-start', { port: appPort });
}

// Run tests
function runTests() {
  addLog('test', '--- Running tests ---', 'info');

  // Try to detect test command
  let testCmd = 'npm';
  let testArgs = ['test'];

  const pkgPath = path.join(PROJECT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.scripts?.test) {
      testCmd = 'npm';
      testArgs = ['test'];
    }
  }

  const testProcess = spawn(testCmd, testArgs, {
    cwd: PROJECT_DIR,
    env: { ...process.env, CI: 'true' },
    shell: true
  });

  testProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      broadcast('test-output', { data: text, stream: 'stdout' });
      addLog('test', text);
    }
  });

  testProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) {
      broadcast('test-output', { data: text, stream: 'stderr' });
      addLog('test', text, 'error');
    }
  });

  testProcess.on('exit', (code) => {
    broadcast('test-complete', { exitCode: code });
    addLog('test', `Tests ${code === 0 ? 'passed' : 'failed'}`, code === 0 ? 'success' : 'error');
  });
}

// API Routes
app.get('/api/status', (req, res) => {
  const bugs = parseBugs(PROJECT_DIR);
  const plan = parsePlan(PROJECT_DIR);

  res.json({
    appRunning: appProcess !== null,
    appPort,
    testsPass: plan.testsPass || 0,
    testsFail: plan.testsFail || 0,
    bugsOpen: bugs.filter(b => b.status === 'open').length,
    phase: plan.currentPhase,
    phaseName: plan.currentPhaseName
  });
});

app.get('/api/logs/:type', (req, res) => {
  const type = req.params.type;
  if (logs[type]) {
    res.json(logs[type]);
  } else {
    res.status(404).json({ error: 'Unknown log type' });
  }
});

app.get('/api/tasks', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);
  res.json({
    phase: plan.currentPhase,
    phaseName: plan.currentPhaseName,
    items: plan.tasks
  });
});

app.post('/api/bug', (req, res) => {
  const { description, url, screenshot, severity } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description required' });
  }

  const bugsFile = path.join(PROJECT_DIR, '.planning', 'BUGS.md');

  // Generate bug ID
  const bugs = parseBugs(PROJECT_DIR);
  const nextId = bugs.length + 1;
  const bugId = `BUG-${String(nextId).padStart(3, '0')}`;

  // Create bug entry
  const timestamp = new Date().toISOString().split('T')[0];
  const bugEntry = `
### ${bugId}: ${description.split('\n')[0].slice(0, 50)} [open]

- **Reported:** ${timestamp}
- **Severity:** ${severity || 'medium'}
- **URL:** ${url || 'N/A'}
${screenshot ? `- **Screenshot:** screenshots/${bugId}.png` : ''}

${description}

---
`;

  // Ensure .planning directory exists
  const planningDir = path.join(PROJECT_DIR, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  // Save screenshot if provided
  if (screenshot && screenshot.startsWith('data:image')) {
    const screenshotDir = path.join(planningDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const base64Data = screenshot.split(',')[1];
    fs.writeFileSync(
      path.join(screenshotDir, `${bugId}.png`),
      Buffer.from(base64Data, 'base64')
    );
  }

  // Append to BUGS.md
  let content = '';
  if (fs.existsSync(bugsFile)) {
    content = fs.readFileSync(bugsFile, 'utf-8');
  } else {
    content = `# Bug Tracker

## Open Bugs

`;
  }

  // Insert after "## Open Bugs" heading
  const insertPoint = content.indexOf('## Open Bugs');
  if (insertPoint !== -1) {
    const afterHeading = content.indexOf('\n', insertPoint) + 1;
    content = content.slice(0, afterHeading) + bugEntry + content.slice(afterHeading);
  } else {
    content += bugEntry;
  }

  fs.writeFileSync(bugsFile, content);

  broadcast('bug-created', { bugId, description: description.slice(0, 50) });
  addLog('app', `Bug ${bugId} created`, 'warn');

  res.json({ success: true, bugId });
});

app.post('/api/test', (req, res) => {
  runTests();
  res.json({ success: true });
});

app.post('/api/restart', (req, res) => {
  addLog('app', '--- Restarting app ---', 'warn');
  broadcast('app-restart', {});
  startApp();
  res.json({ success: true });
});

// Proxy to running app
app.use('/app', createProxyMiddleware({
  target: 'http://localhost:3000',  // default fallback
  router: () => `http://localhost:${appPort}`,  // dynamic routing
  changeOrigin: true,
  pathRewrite: { '^/app': '' },
  ws: true,
  onError: (err, req, res) => {
    res.status(502).send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; background: #1a1a2e; color: #eee;">
          <h2>App not running</h2>
          <p>Waiting for app to start on port ${appPort}...</p>
          <script>setTimeout(() => location.reload(), 2000)</script>
        </body>
      </html>
    `);
  }
}));

// File watching
function setupWatchers() {
  // Watch source files
  const sourceWatcher = chokidar.watch(
    ['src', 'lib', 'app', 'pages', 'components'].map(d => path.join(PROJECT_DIR, d)),
    { ignored: /node_modules/, ignoreInitial: true }
  );

  sourceWatcher.on('change', (filePath) => {
    const relative = path.relative(PROJECT_DIR, filePath);
    addLog('app', `File changed: ${relative}`, 'info');
    broadcast('file-change', { path: relative });
  });

  // Watch git activity
  const gitWatcher = chokidar.watch(path.join(PROJECT_DIR, '.git/logs/HEAD'), {
    ignoreInitial: true
  });

  gitWatcher.on('change', () => {
    // Parse last git log entry
    try {
      const logPath = path.join(PROJECT_DIR, '.git/logs/HEAD');
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/\t(.+)$/);
      if (match) {
        addLog('git', match[1], 'info');
        broadcast('git-activity', { entry: match[1] });
      }
    } catch (e) {
      // Ignore errors
    }
  });

  // Watch planning files
  const planWatcher = chokidar.watch(path.join(PROJECT_DIR, '.planning'), {
    ignoreInitial: true
  });

  planWatcher.on('change', (filePath) => {
    if (filePath.includes('PLAN.md')) {
      broadcast('task-update', {});
    }
    if (filePath.includes('BUGS.md')) {
      broadcast('bug-update', {});
    }
  });
}

// Graceful shutdown
function shutdown() {
  console.log('\n[TLC] Shutting down...');

  if (appProcess) {
    appProcess.kill();
  }

  wsClients.forEach(client => client.close());
  server.close(() => {
    console.log('[TLC] Server stopped');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
async function main() {
  console.log(`
  ████████╗██╗     ██████╗
  ╚══██╔══╝██║    ██╔════╝
     ██║   ██║    ██║
     ██║   ██║    ██║
     ██║   ███████╗╚██████╗
     ╚═╝   ╚══════╝ ╚═════╝

  TLC Dev Server
`);

  server.listen(TLC_PORT, () => {
    console.log(`  Dashboard: http://localhost:${TLC_PORT}`);
    console.log(`  Share:     http://${getLocalIP()}:${TLC_PORT}`);
    console.log('');
  });

  setupWatchers();
  await startApp();

  console.log('  Press Ctrl+C to stop\n');
}

// Get local IP for sharing
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

main().catch(console.error);
