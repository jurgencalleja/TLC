/**
 * TLC Dashboard Server
 *
 * Serves the client-mode dashboard and API endpoints for:
 * - Project status
 * - Bug reporting
 * - Health monitoring
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getHealth } from './lib/health-api.js';
import { createTask } from './lib/tasks-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.TLC_PORT || 3147;
const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

// WebSocket clients for broadcasting events
const wsClients = new Set();

/**
 * Broadcast a message to all connected WebSocket clients
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  for (const client of wsClients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Middleware
app.use(express.json());

// Serve static files from dashboard directory
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Client mode dashboard route
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'client.html'));
});

// API: Project status
app.get('/api/status', (req, res) => {
  // Read project name from environment or .tlc.json if available
  const projectName = process.env.TLC_PROJECT_NAME || process.env.npm_package_name || 'TLC Project';

  res.json({
    projectName,
    version: process.env.TLC_VERSION || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// API: Health check
app.get('/api/health', async (req, res) => {
  try {
    const health = await getHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// API: Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const task = await createTask(req.body, PROJECT_DIR);
    // Broadcast via WebSocket
    broadcast('task-created', task);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// In-memory bug storage (would connect to .planning/BUGS.md in production)
const bugs = [];
let bugIdCounter = 1;

// API: Submit bug report
app.post('/api/bug', (req, res) => {
  const { description, severity = 'medium' } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({
      error: 'Bug description is required'
    });
  }

  // Validate severity
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) {
    return res.status(400).json({
      error: 'Invalid severity. Must be: low, medium, high, or critical'
    });
  }

  // Parse title from first line if multi-line description
  const lines = description.trim().split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n').trim();

  const bug = {
    id: `BUG-${String(bugIdCounter++).padStart(4, '0')}`,
    title,
    description: body || title,
    status: 'open',
    priority: severity,
    createdAt: new Date().toISOString(),
    reporter: 'client',
    labels: ['client-reported']
  };

  bugs.push(bug);

  res.status(201).json({
    success: true,
    bug: {
      id: bug.id,
      title: bug.title,
      status: bug.status
    }
  });
});

// API: List bugs
app.get('/api/bugs', (req, res) => {
  res.json(bugs);
});

// Proxy route for app preview (placeholder - configure based on your app's port)
app.get('/app', (req, res) => {
  // In production, this would proxy to the actual app or show a placeholder
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>App Preview</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #0d1117;
          color: #e6edf3;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .placeholder {
          text-align: center;
          padding: 40px;
        }
        .placeholder h2 {
          color: #58a6ff;
          margin-bottom: 16px;
        }
        .placeholder p {
          color: #8b949e;
        }
      </style>
    </head>
    <body>
      <div class="placeholder">
        <h2>App Preview</h2>
        <p>Configure your app URL in the TLC server settings to enable live preview.</p>
        <p style="font-size: 12px; margin-top: 24px;">
          Set <code>TLC_APP_URL</code> environment variable or update <code>.tlc.json</code>
        </p>
      </div>
    </body>
    </html>
  `);
});

// Start server
export function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`TLC Dashboard server running on http://localhost:${port}`);
      console.log(`  - Client dashboard: http://localhost:${port}/client`);
      console.log(`  - API status: http://localhost:${port}/api/status`);
      console.log(`  - API health: http://localhost:${port}/api/health`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

// Export app for testing
export { app, broadcast, wsClients, PROJECT_DIR };

// Start server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}
