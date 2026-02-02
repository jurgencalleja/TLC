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
const { autoProvision, stopDatabase } = require('./lib/auto-database');

// Handle PGlite WASM crashes gracefully
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('unreachable')) {
    console.error('\n[TLC] ⚠️  Database crashed (PGlite WASM limitation)');
    console.error('[TLC] This happens with heavy concurrent database operations.');
    console.error('[TLC] Solutions:');
    console.error('[TLC]   1. Install Docker for stable PostgreSQL support');
    console.error('[TLC]   2. Use an external PostgreSQL database');
    console.error('[TLC]   3. Set DATABASE_URL environment variable\n');
    process.exit(1);
  }
  console.error('[TLC] Uncaught exception:', err);
  process.exit(1);
});

// Configuration
const TLC_PORT = parseInt(process.env.TLC_PORT || '3147');
const PROJECT_DIR = process.cwd();
const SKIP_DB = process.argv.includes('--skip-db') || process.env.TLC_SKIP_DB === 'true';
const PROXY_ONLY = process.argv.includes('--proxy-only') || process.env.TLC_PROXY_ONLY === 'true';
const EXTERNAL_APP_PORT = parseInt(process.env.TLC_APP_PORT || '5000');

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
  // Also log to console for debugging
  const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`[${type}] ${prefix} ${text}`);
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
  console.log('[TLC] Starting app detection...');
  console.log('[TLC] Project dir:', PROJECT_DIR);

  const project = detectProject(PROJECT_DIR);
  console.log('[TLC] Detected project:', project);

  if (!project) {
    addLog('app', 'Could not detect project type. Create a start command in .tlc.json', 'error');
    return;
  }

  appPort = project.port;
  addLog('app', `Detected: ${project.name}`, 'info');
  addLog('app', `Command: ${project.cmd} ${project.args.join(' ')}`, 'info');
  addLog('app', `Port: ${appPort}`, 'info');

  // Auto-provision database if needed
  let extraEnv = {};
  if (SKIP_DB) {
    addLog('app', 'Skipping database auto-provisioning (--skip-db)', 'info');
  } else {
    try {
      extraEnv = await autoProvision(PROJECT_DIR, (msg) => addLog('app', msg, 'info'));
    } catch (err) {
      addLog('app', `Database provisioning failed: ${err.message}`, 'error');
    }
  }

  // Kill existing process if any
  if (appProcess) {
    appProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  try {
    console.log('[TLC] Spawning:', project.cmd, project.args);
    appProcess = spawn(project.cmd, project.args, {
      cwd: PROJECT_DIR,
      env: { ...process.env, ...extraEnv, PORT: appPort.toString() },
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

    appProcess.on('error', (err) => {
      console.error('[TLC] Spawn error:', err);
      addLog('app', `Failed to start: ${err.message}`, 'error');
    });

    appProcess.on('exit', (code) => {
      addLog('app', `App exited with code ${code}`, code === 0 ? 'info' : 'error');
      appProcess = null;
    });

    broadcast('app-start', { port: appPort });
  } catch (err) {
    console.error('[TLC] Failed to spawn app:', err);
    addLog('app', `Failed to start app: ${err.message}`, 'error');
  }
}

// Run tests
function runTests() {
  broadcast('test-start', { timestamp: Date.now() });
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
    tasks: plan.tasks?.length || 0,
    bugsOpen: bugs.filter(b => b.status === 'open').length,
    phase: plan.currentPhase,
    phaseName: plan.currentPhaseName
  });
});

app.get('/api/progress', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);

  // Calculate progress from tasks
  let progress = 0;
  if (plan.tasks && plan.tasks.length > 0) {
    const completed = plan.tasks.filter(t => t.status === 'done' || t.status === 'complete').length;
    progress = Math.round((completed / plan.tasks.length) * 100);
  }

  res.json({
    phase: plan.currentPhase,
    phaseName: plan.currentPhaseName,
    totalTasks: plan.tasks?.length || 0,
    completedTasks: plan.tasks?.filter(t => t.status === 'done' || t.status === 'complete').length || 0,
    progress
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

// Plan content endpoint
app.get('/api/plan', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);
  let content = '';

  // Try to read current phase plan file
  const phasesDir = path.join(PROJECT_DIR, '.planning', 'phases');
  if (plan.currentPhase && fs.existsSync(phasesDir)) {
    const planFile = path.join(phasesDir, `${plan.currentPhase}-PLAN.md`);
    if (fs.existsSync(planFile)) {
      content = fs.readFileSync(planFile, 'utf-8');
    }
  }

  // Fallback to ROADMAP.md
  if (!content) {
    const roadmapFile = path.join(PROJECT_DIR, '.planning', 'ROADMAP.md');
    if (fs.existsSync(roadmapFile)) {
      content = fs.readFileSync(roadmapFile, 'utf-8');
    }
  }

  res.json({
    phase: plan.currentPhase,
    phaseName: plan.currentPhaseName,
    content
  });
});

// Test checklist endpoint
app.get('/api/tests', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);
  let items = [];

  // Try to read TESTS.md for current phase
  const phasesDir = path.join(PROJECT_DIR, '.planning', 'phases');
  if (plan.currentPhase && fs.existsSync(phasesDir)) {
    const testsFile = path.join(phasesDir, `${plan.currentPhase}-TESTS.md`);
    if (fs.existsSync(testsFile)) {
      const content = fs.readFileSync(testsFile, 'utf-8');
      // Parse checkboxes
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*]\s*\[([ x])\]\s*(.+)$/i);
        if (match) {
          items.push({
            checked: match[1].toLowerCase() === 'x',
            text: match[2].trim()
          });
        }
      }
    }
  }

  res.json({ items });
});

// Bugs list endpoint
app.get('/api/bugs', (req, res) => {
  const bugs = parseBugs(PROJECT_DIR);
  res.json(bugs);
});

// Changelog endpoint
app.get('/api/changelog', (req, res) => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('git log --oneline -20 --pretty=format:"%h|%s|%an|%ar"', {
      cwd: PROJECT_DIR,
      encoding: 'utf-8'
    });

    const commits = output.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });

    res.json({ commits });
  } catch (e) {
    res.json({ commits: [] });
  }
});

// Playwright endpoint
app.post('/api/playwright', (req, res) => {
  addLog('test', '--- Running Playwright tests ---', 'info');

  const testProcess = spawn('npx', ['playwright', 'test'], {
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
    addLog('test', `Playwright ${code === 0 ? 'passed' : 'failed'}`, code === 0 ? 'success' : 'error');
  });

  res.json({ success: true });
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', (req, res) => {
  const { title, phase, owner } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const plan = parsePlan(PROJECT_DIR);
  const taskId = `task-${Date.now()}`;
  const task = {
    id: taskId,
    title,
    status: 'pending',
    phase: phase || plan.currentPhase || 1,
    owner: owner || null,
    createdAt: new Date().toISOString()
  };

  // Broadcast to all connected clients
  broadcast('task-created', task);
  addLog('app', `Task created: ${title}`, 'info');

  res.status(201).json(task);
});

app.post('/api/bug', (req, res) => {
  const { description, url, screenshot, severity, images } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description required' });
  }

  const bugsFile = path.join(PROJECT_DIR, '.planning', 'BUGS.md');

  // Generate bug ID
  const bugs = parseBugs(PROJECT_DIR);
  const nextId = bugs.length + 1;
  const bugId = `BUG-${String(nextId).padStart(3, '0')}`;

  // Ensure .planning directory exists
  const planningDir = path.join(PROJECT_DIR, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  // Handle multiple images (new) or single screenshot (legacy)
  const allImages = images || (screenshot ? [screenshot] : []);
  const savedImages = [];

  if (allImages.length > 0) {
    const screenshotDir = path.join(planningDir, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    allImages.forEach((imgData, index) => {
      if (imgData && imgData.startsWith('data:image')) {
        const ext = imgData.includes('image/png') ? 'png' : 'jpg';
        const filename = allImages.length === 1
          ? `${bugId}.${ext}`
          : `${bugId}-${index + 1}.${ext}`;
        const base64Data = imgData.split(',')[1];
        fs.writeFileSync(
          path.join(screenshotDir, filename),
          Buffer.from(base64Data, 'base64')
        );
        savedImages.push(`screenshots/${filename}`);
      }
    });
  }

  // Create bug entry
  const timestamp = new Date().toISOString().split('T')[0];
  const imagesMarkdown = savedImages.length > 0
    ? `- **Attachments:** ${savedImages.map(img => `![](${img})`).join(' ')}`
    : '';

  const bugEntry = `
### ${bugId}: ${description.split('\n')[0].slice(0, 50)} [open]

- **Reported:** ${timestamp}
- **Severity:** ${severity || 'medium'}
- **URL:** ${url || 'N/A'}
${imagesMarkdown}

${description}

---
`;

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

// ============================================
// Agent Registry API (Phase 32)
// ============================================
const { getAgentRegistry } = require('./lib/agent-registry');
const { createAgentState } = require('./lib/agent-state');
const { createMetadata } = require('./lib/agent-metadata');

// Helper to format agent for API response
function formatAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    state: {
      current: agent.stateMachine ? agent.stateMachine.getState() : 'pending',
      history: agent.stateMachine ? agent.stateMachine.getHistory() : [],
    },
    metadata: {
      model: agent.model,
      taskType: agent.taskType || 'unknown',
      tokens: agent.metadataObj ? {
        input: agent.metadataObj.inputTokens,
        output: agent.metadataObj.outputTokens,
        total: agent.metadataObj.totalTokens,
      } : { input: 0, output: 0, total: 0 },
    },
    createdAt: agent.createdAt || agent.registeredAt,
  };
}

// List agents
app.get('/api/agents', (req, res) => {
  try {
    const registry = getAgentRegistry();
    let agents = registry.listAgents();

    // Filter by status (state.current)
    if (req.query.status) {
      agents = agents.filter(a =>
        a.stateMachine ? a.stateMachine.getState() === req.query.status : false
      );
    }
    // Filter by model
    if (req.query.model) {
      agents = agents.filter(a => a.model === req.query.model);
    }
    // Filter by type
    if (req.query.type) {
      agents = agents.filter(a => a.taskType === req.query.type);
    }

    res.json({ success: true, agents: agents.map(formatAgent) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const agent = registry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, agent: formatAgent(agent) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register new agent
app.post('/api/agents', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const { id, name, model, taskType } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    // Create state machine and metadata
    const stateMachine = createAgentState({ agentId: id });
    const metadataObj = createMetadata({
      model: model || 'unknown',
      taskType: taskType || 'default',
    });

    // Register with all components
    const agentId = registry.registerAgent({
      id,
      name,
      model: model || 'unknown',
      taskType: taskType || 'default',
      stateMachine,
      metadataObj,
      createdAt: Date.now(),
    });

    const agent = registry.getAgent(agentId);

    // Broadcast agent creation
    broadcast('agent-created', formatAgent(agent));
    addLog('app', `Agent registered: ${name}`, 'info');

    res.status(201).json({ success: true, agent: formatAgent(agent) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update agent (state transitions, token updates)
app.patch('/api/agents/:id', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const agent = registry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Handle state transition
    if (req.body.state) {
      if (!agent.stateMachine) {
        return res.status(400).json({ success: false, error: 'Agent has no state machine' });
      }
      const result = agent.stateMachine.transition(req.body.state, { reason: req.body.reason });
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
    }

    // Handle token updates
    if (req.body.tokens && agent.metadataObj) {
      agent.metadataObj.updateTokens({
        input: req.body.tokens.input || 0,
        output: req.body.tokens.output || 0,
      });
    }

    // Broadcast agent update
    broadcast('agent-updated', formatAgent(agent));

    res.json({ success: true, agent: formatAgent(agent) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const removed = registry.removeAgent(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get registry stats
app.get('/api/agents-stats', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const agents = registry.listAgents();

    const stats = {
      total: agents.length,
      byStatus: {},
      byModel: {}
    };

    agents.forEach(agent => {
      const status = agent.stateMachine ? agent.stateMachine.getState() : 'pending';
      const model = agent.model || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      stats.byModel[model] = (stats.byModel[model] || 0) + 1;
    });

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  router: () => {
    const target = `http://localhost:${appPort}`;
    return target;
  },  // dynamic routing
  changeOrigin: true,
  pathRewrite: { '^/app': '' },
  ws: true,
  onError: (err, req, res) => {
    // WebSocket upgrades don't have res.status
    if (res && typeof res.status === 'function') {
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
async function shutdown() {
  console.log('\n[TLC] Shutting down...');

  if (appProcess) {
    appProcess.kill();
  }

  // Stop auto-provisioned database
  try {
    await stopDatabase();
  } catch (e) {
    // Ignore
  }

  wsClients.forEach(client => client.close());
  server.close(() => {
    console.log('[TLC] Server stopped');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Get health data for broadcasting
function getHealthData() {
  const os = require('os');
  const memUsed = process.memoryUsage().heapUsed;
  const memTotal = os.totalmem();
  const loadAvg = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpuPercent = Math.round((loadAvg / cpuCount) * 100);

  return {
    status: appProcess ? 'healthy' : 'degraded',
    memory: memUsed,
    cpu: Math.min(cpuPercent, 100),
    uptime: process.uptime(),
    appRunning: appProcess !== null,
    appPort: appPort
  };
}

// Periodic health broadcast
let healthInterval = null;
function startHealthBroadcast() {
  if (healthInterval) clearInterval(healthInterval);
  healthInterval = setInterval(() => {
    broadcast('health-update', getHealthData());
  }, 30000); // Every 30 seconds
}

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
  startHealthBroadcast();

  if (PROXY_ONLY) {
    // In proxy-only mode, just set the app port for proxying
    // App is managed externally (e.g., by docker-compose)
    appPort = EXTERNAL_APP_PORT;
    console.log(`  Proxy-only mode: forwarding to app on port ${appPort}`);
    addLog('app', `Proxy-only mode: app expected on port ${appPort}`, 'info');
  } else {
    await startApp();
  }

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
