#!/usr/bin/env node

// Suppress punycode deprecation from upstream deps (http-proxy-middleware, ws)
const originalEmit = process.emit;
process.emit = function (event, error) {
  if (event === 'warning' && error?.name === 'DeprecationWarning' && error?.message?.includes('punycode')) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

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
const {
  createUserStore,
  createAuthMiddleware,
  generateJWT,
  verifyJWT,
  hashPassword,
  verifyPassword,
  hasPermission,
  USER_ROLES,
} = require('./lib/auth-system');

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
let appIsDocker = false; // true when app is Docker-managed (no local process)
let wsClients = new Set();
const logs = { app: [], test: [], git: [] };
const commandHistory = [];

// Create Express app
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// ============================================
// Authentication Setup
// ============================================
const userStore = createUserStore();
const JWT_SECRET = process.env.TLC_JWT_SECRET || 'tlc-dashboard-secret-change-in-production';
const AUTH_ENABLED = process.env.TLC_AUTH !== 'false';

// Initialize users from config or environment
async function initializeAuth() {
  const tlcConfigPath = path.join(PROJECT_DIR, '.tlc.json');
  let users = [];

  // Try to read from .tlc.json
  if (fs.existsSync(tlcConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(tlcConfigPath, 'utf-8'));

      // Support new multi-user format: auth.users array
      if (config.auth?.users && Array.isArray(config.auth.users)) {
        users = config.auth.users;
      }
      // Also support legacy single admin format for backwards compatibility
      else if (config.auth?.adminEmail && config.auth?.adminPassword) {
        users.push({
          email: config.auth.adminEmail,
          password: config.auth.adminPassword,
          name: config.auth.adminName || 'Admin',
          role: 'admin',
        });
      }
    } catch (e) {
      console.error('[TLC] Failed to parse .tlc.json:', e.message);
    }
  }

  // Also check environment variables for admin
  if (process.env.TLC_ADMIN_EMAIL && process.env.TLC_ADMIN_PASSWORD) {
    const envAdmin = {
      email: process.env.TLC_ADMIN_EMAIL,
      password: process.env.TLC_ADMIN_PASSWORD,
      name: process.env.TLC_ADMIN_NAME || 'Admin',
      role: 'admin',
    };
    // Don't duplicate if already in config
    if (!users.find(u => u.email === envAdmin.email)) {
      users.push(envAdmin);
    }
  }

  // Create all users
  for (const userData of users) {
    if (!userData.email || !userData.password) {
      console.warn('[TLC] Skipping user without email or password');
      continue;
    }

    try {
      await userStore.createUser({
        email: userData.email,
        password: userData.password,
        name: userData.name || userData.email.split('@')[0],
        role: userData.role || 'engineer',
      }, { skipValidation: true }); // Dev tool - allow simple passwords
      console.log(`[TLC] User initialized: ${userData.email} (${userData.role || 'engineer'})`);
    } catch (e) {
      if (!e.message.includes('already registered')) {
        console.error(`[TLC] Failed to create user ${userData.email}:`, e.message);
      }
    }
  }

  const userCount = await userStore.getUserCount();
  if (userCount === 0) {
    console.log('[TLC] No users configured. Add users to .tlc.json:');
    console.log('[TLC]   "auth": { "users": [{ "email": "...", "password": "...", "role": "admin" }] }');
  }
}

// Role-based permission middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Permission-based middleware
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const user = await userStore.findUserById(req.user.sub);
    if (!user || !hasPermission(user, permission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

// Auth middleware for protected routes
const authMiddleware = createAuthMiddleware({
  userStore,
  jwtSecret: JWT_SECRET,
  requireAuth: true,
});

// Public paths that don't require auth
const publicPaths = ['/api/auth/login', '/api/auth/status', '/login.html', '/login'];

// Apply auth to API routes (except public paths)
app.use((req, res, next) => {
  // Skip auth if disabled
  if (!AUTH_ENABLED) return next();

  // Allow public paths
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) {
    return next();
  }

  // Allow static assets
  if (req.path.match(/\.(js|css|png|jpg|ico|svg|woff|woff2)$/)) {
    return next();
  }

  // Check for auth cookie or header
  const token = req.cookies?.tlc_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Redirect browser requests to login, return 401 for API
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login.html');
  }

  // Verify token
  const payload = verifyJWT(token, JWT_SECRET);
  if (!payload) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.redirect('/login.html');
  }

  // Attach user to request
  req.user = payload;
  next();
});

// Auth routes
app.get('/api/auth/status', (req, res) => {
  res.json({ authEnabled: AUTH_ENABLED });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await userStore.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = generateJWT(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: 86400 * 7 } // 7 days
  );

  // Set cookie
  res.cookie('tlc_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 7 * 1000, // 7 days
  });

  res.json({ success: true, user: { email: user.email, name: user.name, role: user.role } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('tlc_token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// ============================================
// User Management API (Admin only)
// ============================================

// List all users
app.get('/api/users', requireRole('admin'), async (req, res) => {
  try {
    const users = await userStore.listUsers();
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single user
app.get('/api/users/:id', requireRole('admin'), async (req, res) => {
  try {
    const user = await userStore.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Don't return password hash
    const { passwordHash, passwordSalt, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create new user
app.post('/api/users', requireRole('admin'), async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Validate role
  const validRoles = ['admin', 'engineer', 'qa', 'po'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
  }

  try {
    const user = await userStore.createUser({
      email,
      password,
      name: name || email.split('@')[0],
      role: role || 'engineer',
    }, { skipValidation: true }); // Allow simple passwords for dev

    res.status(201).json({ user });
  } catch (e) {
    if (e.message.includes('already registered')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Update user
app.put('/api/users/:id', requireRole('admin'), async (req, res) => {
  const { name, role, active } = req.body;

  // Validate role if provided
  const validRoles = ['admin', 'engineer', 'qa', 'po'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
  }

  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;

    const user = await userStore.updateUser(req.params.id, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user
app.delete('/api/users/:id', requireRole('admin'), async (req, res) => {
  // Prevent self-deletion
  if (req.user.sub === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const deleted = await userStore.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also invalidate their sessions
    await userStore.invalidateUserSessions(req.params.id);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', requireRole('admin'), async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password required' });
  }

  try {
    const user = await userStore.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use the internal hash function
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = new Date().toISOString();

    // Invalidate all sessions for security
    await userStore.invalidateUserSessions(req.params.id);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get available roles
app.get('/api/roles', (req, res) => {
  res.json({
    roles: [
      { id: 'admin', name: 'Admin', description: 'Full access to all features' },
      { id: 'engineer', name: 'Engineer', description: 'Can read, write, deploy, and claim tasks' },
      { id: 'qa', name: 'QA', description: 'Can read, verify, report bugs, and run tests' },
      { id: 'po', name: 'Product Owner', description: 'Can read, plan, verify, and approve' },
    ],
  });
});

// Serve static files (after auth middleware)
// Prefer dashboard-web build (React SPA) over legacy static HTML
const dashboardWebDist = path.join(__dirname, '..', 'dashboard-web', 'dist');
const legacyDashboard = path.join(__dirname, 'dashboard');
if (fs.existsSync(dashboardWebDist)) {
  app.use(express.static(dashboardWebDist));
  console.log('[TLC] Serving dashboard from dashboard-web/dist/');
} else {
  app.use(express.static(legacyDashboard));
  console.log('[TLC] Serving legacy dashboard from server/dashboard/');
}

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

  // Docker-managed apps: don't spawn, just proxy
  if (project.type === 'docker') {
    appIsDocker = true;
    addLog('app', `App is Docker-managed — proxying to port ${appPort}`, 'info');
    if (project.url) {
      addLog('app', `App URL: ${project.url}`, 'info');
    }
    addLog('app', 'TLC will not spawn the app. Use Docker to manage it.', 'info');
    broadcast('app-start', { port: appPort });
    return;
  }

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

// Project info endpoint - returns real project data
app.get('/api/project', (req, res) => {
  try {
    const { execSync } = require('child_process');

    // Get project name and description from package.json or .tlc.json
    let projectName = 'Unknown Project';
    let projectDesc = '';
    let version = '';

    const pkgPath = path.join(PROJECT_DIR, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      projectName = pkg.name || projectName;
      projectDesc = pkg.description || '';
      version = pkg.version || '';
    }

    const tlcPath = path.join(PROJECT_DIR, '.tlc.json');
    if (fs.existsSync(tlcPath)) {
      const tlc = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
      if (tlc.project) projectName = tlc.project;
      if (tlc.description) projectDesc = tlc.description;
    }

    // Get git info
    let branch = 'unknown';
    let lastCommit = null;
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_DIR, encoding: 'utf-8' }).trim();
      const commitInfo = execSync('git log -1 --pretty=format:"%h|%s|%ar"', { cwd: PROJECT_DIR, encoding: 'utf-8' }).trim();
      const [hash, message, time] = commitInfo.split('|');
      lastCommit = { hash, message, time };
    } catch (e) {
      // Not a git repo
    }

    // Get phase info
    const plan = parsePlan(PROJECT_DIR);

    // Count phases from roadmap
    let totalPhases = 0;
    let completedPhases = 0;
    const roadmapPath = path.join(PROJECT_DIR, '.planning', 'ROADMAP.md');
    if (fs.existsSync(roadmapPath)) {
      const content = fs.readFileSync(roadmapPath, 'utf-8');
      const phases = content.match(/##\s+Phase\s+\d+/g) || [];
      totalPhases = phases.length;
      const completed = content.match(/##\s+Phase\s+\d+[^[]*\[x\]/gi) || [];
      completedPhases = completed.length;
    }

    // Calculate progress
    const tasksDone = plan.tasks?.filter(t => t.status === 'done' || t.status === 'complete').length || 0;
    const tasksTotal = plan.tasks?.length || 0;
    const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

    res.json({
      name: projectName,
      description: projectDesc,
      version,
      branch,
      lastCommit,
      phase: plan.currentPhase,
      phaseName: plan.currentPhaseName,
      totalPhases,
      completedPhases,
      tasks: {
        total: tasksTotal,
        done: tasksDone,
        progress
      },
      projectDir: PROJECT_DIR
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', (req, res) => {
  const bugs = parseBugs(PROJECT_DIR);
  const plan = parsePlan(PROJECT_DIR);

  res.json({
    appRunning: appProcess !== null || appIsDocker,
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
// Command Execution API
// ============================================

// GET /api/commands/history - Return command execution history
app.get('/api/commands/history', (req, res) => {
  res.json({ success: true, history: commandHistory });
});

// POST /api/commands/:command - Execute a TLC command
app.post('/api/commands/:command', (req, res) => {
  const command = req.params.command;
  const { args } = req.body || {};

  // Whitelist of allowed TLC commands
  const allowedCommands = ['plan', 'build', 'verify', 'bug', 'claim', 'release', 'who', 'progress'];
  if (!allowedCommands.includes(command)) {
    return res.status(400).json({ success: false, error: `Unknown command: ${command}. Allowed: ${allowedCommands.join(', ')}` });
  }

  const entry = {
    id: `cmd-${Date.now()}`,
    command,
    args: args || null,
    status: 'running',
    startedAt: new Date().toISOString(),
    output: '',
  };
  commandHistory.push(entry);
  if (commandHistory.length > 100) commandHistory.shift();

  addLog('app', `Executing command: tlc:${command}${args ? ' ' + args : ''}`, 'info');
  broadcast('command-started', { id: entry.id, command });

  // Build the CLI command
  const cliArgs = ['tlc', command];
  if (args) cliArgs.push(args);
  const fullCmd = `npx ${cliArgs.join(' ')}`;

  const cmdProcess = spawn('npx', cliArgs.slice(1), {
    cwd: PROJECT_DIR,
    env: { ...process.env },
    shell: true,
  });

  let output = '';

  cmdProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    broadcast('command-output', { id: entry.id, data: text, stream: 'stdout' });
  });

  cmdProcess.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    broadcast('command-output', { id: entry.id, data: text, stream: 'stderr' });
  });

  cmdProcess.on('exit', (code) => {
    entry.status = code === 0 ? 'completed' : 'failed';
    entry.exitCode = code;
    entry.output = output;
    entry.completedAt = new Date().toISOString();
    broadcast('command-completed', { id: entry.id, exitCode: code });
    addLog('app', `Command tlc:${command} ${code === 0 ? 'completed' : 'failed'} (exit ${code})`, code === 0 ? 'info' : 'error');
  });

  cmdProcess.on('error', (err) => {
    entry.status = 'failed';
    entry.output = err.message;
    entry.completedAt = new Date().toISOString();
    broadcast('command-completed', { id: entry.id, error: err.message });
    addLog('app', `Command tlc:${command} error: ${err.message}`, 'error');
  });

  res.json({ success: true, id: entry.id, command, message: `Command tlc:${command} started` });
});

// ============================================
// Dashboard Completion API (Phase 62)
// ============================================

// GET /api/config - Read .tlc.json configuration
app.get('/api/config', (req, res) => {
  try {
    const tlcPath = path.join(PROJECT_DIR, '.tlc.json');
    if (!fs.existsSync(tlcPath)) {
      return res.json({});
    }
    const config = JSON.parse(fs.readFileSync(tlcPath, 'utf-8'));
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config - Write .tlc.json configuration
app.put('/api/config', (req, res) => {
  try {
    const tlcPath = path.join(PROJECT_DIR, '.tlc.json');
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid config object' });
    }
    fs.writeFileSync(tlcPath, JSON.stringify(config, null, 2));
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health - System health status
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    },
    appRunning: appProcess !== null || appIsDocker,
    appPort,
  });
});

// GET /api/tasks/:id - Get single task by ID
app.get('/api/tasks/:id', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);
  const task = (plan.tasks || []).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// PATCH /api/tasks/:id - Update task status/owner
app.patch('/api/tasks/:id', (req, res) => {
  const plan = parsePlan(PROJECT_DIR);
  const task = (plan.tasks || []).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const updates = req.body;
  const updated = { ...task, ...updates };
  broadcast('task-update', updated);
  addLog('app', `Task ${req.params.id} updated`, 'info');
  res.json(updated);
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', (req, res) => {
  broadcast('task-update', { id: req.params.id, deleted: true });
  addLog('app', `Task ${req.params.id} deleted`, 'info');
  res.status(204).send();
});

// DELETE /api/logs/:type - Clear logs by type
app.delete('/api/logs/:type', (req, res) => {
  const type = req.params.type;
  if (logs[type]) {
    logs[type] = [];
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Unknown log type' });
  }
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

// Stop a running agent
app.post('/api/agents/:id/stop', (req, res) => {
  try {
    const registry = getAgentRegistry();
    const agent = registry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Transition state to stopped
    if (agent.stateMachine) {
      const currentState = agent.stateMachine.getState();
      if (currentState === 'stopped' || currentState === 'completed') {
        return res.status(400).json({ success: false, error: `Agent is already ${currentState}` });
      }
      const result = agent.stateMachine.transition('stopped', { reason: req.body.reason || 'Stopped via API' });
      if (!result.success) {
        // If formal transition fails, force the state
        agent.stateMachine.forceState('stopped', { reason: req.body.reason || 'Force stopped via API' });
      }
    }

    broadcast('agent-updated', formatAgent(agent));
    addLog('app', `Agent ${agent.name || req.params.id} stopped`, 'info');

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

// SPA catch-all: serve index.html for client-side routes (React Router)
// Must be after all API routes, before app proxy
if (fs.existsSync(dashboardWebDist)) {
  app.get(/^\/(?!api|app|login).*/, (req, res) => {
    // Don't catch file requests (has extension)
    if (path.extname(req.path)) {
      return res.status(404).end();
    }
    res.sendFile(path.join(dashboardWebDist, 'index.html'));
  });
}

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
    appRunning: appProcess !== null || appIsDocker,
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

  // Initialize authentication
  await initializeAuth();

  server.listen(TLC_PORT, () => {
    console.log(`  Dashboard: http://localhost:${TLC_PORT}`);
    console.log(`  Share:     http://${getLocalIP()}:${TLC_PORT}`);
    if (AUTH_ENABLED) {
      console.log(`  Auth:      ENABLED (set TLC_AUTH=false to disable)`);
    } else {
      console.log(`  Auth:      DISABLED`);
    }
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
