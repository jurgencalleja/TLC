/**
 * Dev Server Runtime Module
 * Main entry point that integrates all Phase 3 components
 */

const { createServerState, analyzeProject, formatStackStatus } = require('./dev-server-command');
const { getStartCommand, getStopCommand, getLogsCommand, parseComposeStatus, getStackHealth } = require('./container-orchestrator');
const { createConnectionManager, createLogMessage, createStackStatusMessage, handleMessage, parseMessage } = require('./websocket-server');
const { createWatcherOptions, createChangeEvent, getAffectedService, batchChanges } = require('./file-watcher');
const { formatLogEntry, createLogBuffer } = require('./log-streamer');

/**
 * Server configuration defaults
 */
const DEFAULT_CONFIG = {
  port: 3147,
  host: 'localhost',
  logBufferSize: 1000,
  statusPollInterval: 5000,
  logPollInterval: 1000,
};

/**
 * Create the dev server runtime
 * @param {Object} options - Runtime options
 * @returns {Object} Runtime instance
 */
function createDevServerRuntime(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const state = createServerState();
  const connections = createConnectionManager();
  const logBuffer = createLogBuffer({ maxSize: config.logBufferSize });

  let statusPollTimer = null;
  let logPollTimer = null;
  let isRunning = false;

  return {
    config,
    state,
    connections,

    /**
     * Get current runtime status
     */
    getStatus() {
      return {
        isRunning,
        config,
        connections: connections.getConnectionCount(),
        services: state.getState().services,
        health: state.getState().health,
        uptime: state.getUptime(),
      };
    },

    /**
     * Initialize runtime with project analysis
     * @param {Object} files - Project files map
     */
    initialize(files) {
      const analysis = analyzeProject(files);
      state.setServices(analysis.services);
      return analysis;
    },

    /**
     * Start polling for container status
     * @param {Function} execCommand - Function to execute shell commands
     */
    startStatusPolling(execCommand) {
      if (statusPollTimer) return;

      const poll = async () => {
        try {
          const cmd = getStartCommand({ detached: true });
          // In real implementation, this would use execCommand
          // For now, we just update state
        } catch (err) {
          // Log error but continue polling
        }
      };

      statusPollTimer = setInterval(poll, config.statusPollInterval);
      poll(); // Initial poll
    },

    /**
     * Stop status polling
     */
    stopStatusPolling() {
      if (statusPollTimer) {
        clearInterval(statusPollTimer);
        statusPollTimer = null;
      }
    },

    /**
     * Update container status from docker compose ps output
     * @param {string} output - JSON output from docker compose ps
     */
    updateContainerStatus(output) {
      const containers = parseComposeStatus(output);
      state.updateContainers(containers);

      // Broadcast to subscribed clients
      const health = state.getState().health;
      const message = createStackStatusMessage(health);
      this.broadcastToStatusSubscribers(message);

      return health;
    },

    /**
     * Add log entry and broadcast to subscribers
     * @param {Object} entry - Log entry
     */
    addLogEntry(entry) {
      const enrichedEntry = {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      logBuffer.add(enrichedEntry);
      state.addLog(entry.service || 'system', enrichedEntry);

      // Broadcast to subscribed clients
      const message = createLogMessage(enrichedEntry);
      this.broadcastToLogSubscribers(entry.service, message);

      return enrichedEntry;
    },

    /**
     * Get recent logs
     * @param {string} service - Optional service filter
     * @param {number} count - Number of entries
     */
    getLogs(service, count = 100) {
      // Use main log buffer - it contains all entries
      const allLogs = logBuffer.getRecent(count * 2); // Get more to allow for filtering

      if (service) {
        return allLogs.filter(l => l.service === service).slice(-count);
      }

      return allLogs.slice(-count);
    },

    /**
     * Handle WebSocket connection
     * @param {Object} ws - WebSocket instance
     */
    handleConnection(ws) {
      const client = connections.addClient();

      ws.clientId = client.clientId;

      ws.on('message', (raw) => {
        const message = parseMessage(raw.toString());
        if (!message) return;

        const response = handleMessage(client, message);
        if (response) {
          ws.send(JSON.stringify(response));
        }

        // Send initial logs if subscribing
        if (message.type === 'subscribe_logs') {
          const recentLogs = this.getLogs(null, 50);
          ws.send(JSON.stringify({
            type: 'log_batch',
            entries: recentLogs,
          }));
        }

        // Send current status if subscribing
        if (message.type === 'subscribe_status') {
          const health = state.getState().health;
          if (health) {
            ws.send(createStackStatusMessage(health));
          }
        }
      });

      ws.on('close', () => {
        connections.removeClient(client.clientId);
      });

      return client;
    },

    /**
     * Broadcast message to log subscribers
     * @param {string} service - Service name
     * @param {string} message - JSON message
     */
    broadcastToLogSubscribers(service, message) {
      const subscribers = connections.getLogSubscribers(service || '*');
      // In real implementation, would send to actual WebSocket connections
      return subscribers.length;
    },

    /**
     * Broadcast message to status subscribers
     * @param {string} message - JSON message
     */
    broadcastToStatusSubscribers(message) {
      const subscribers = connections.getStatusSubscribers();
      // In real implementation, would send to actual WebSocket connections
      return subscribers.length;
    },

    /**
     * Handle file change event
     * @param {string} path - Changed file path
     * @param {string} changeType - Type of change
     */
    handleFileChange(path, changeType) {
      const services = state.getState().services;
      const affectedService = getAffectedService(path, services);
      const event = createChangeEvent(path, changeType, affectedService);

      // Add log entry for the change
      this.addLogEntry({
        service: 'watcher',
        level: 'info',
        message: `File ${changeType}: ${path}`,
      });

      return event;
    },

    /**
     * Mark runtime as started
     */
    start() {
      isRunning = true;
      state.setRunning(true);
      this.addLogEntry({
        service: 'system',
        level: 'info',
        message: 'Dev server started',
      });
    },

    /**
     * Mark runtime as stopped
     */
    stop() {
      this.stopStatusPolling();
      isRunning = false;
      state.setRunning(false);
      this.addLogEntry({
        service: 'system',
        level: 'info',
        message: 'Dev server stopped',
      });
    },

    /**
     * Get commands for starting containers
     */
    getStartCommands() {
      return {
        start: getStartCommand({ build: true, detached: true }),
        logs: getLogsCommand({ follow: true, timestamps: true }),
      };
    },

    /**
     * Get command for stopping containers
     */
    getStopCommand() {
      return getStopCommand({ removeOrphans: true });
    },
  };
}

/**
 * Create HTTP request handler for the dev server
 * @param {Object} runtime - Dev server runtime
 * @returns {Function} Request handler
 */
function createRequestHandler(runtime) {
  return (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // API routes
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(runtime.getStatus()));
      return;
    }

    if (url.pathname === '/api/logs') {
      const service = url.searchParams.get('service');
      const count = parseInt(url.searchParams.get('count') || '100', 10);
      const logs = runtime.getLogs(service, count);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs }));
      return;
    }

    if (url.pathname === '/api/services') {
      const services = runtime.state.getState().services;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ services }));
      return;
    }

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  };
}

/**
 * Parse command line arguments
 * @param {Array} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--host' || arg === '-h') {
      options.host = args[++i];
    } else if (arg === '--build' || arg === '-b') {
      options.build = true;
    } else if (arg === '--no-watch') {
      options.watch = false;
    } else if (arg === '--help') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Format help text
 * @returns {string} Help text
 */
function formatHelp() {
  return `
TLC Dev Server

Usage: tlc start [options]

Options:
  -p, --port <port>    Server port (default: 3147)
  -h, --host <host>    Server host (default: localhost)
  -b, --build          Rebuild containers before starting
  --no-watch           Disable file watching
  --help               Show this help message

Examples:
  tlc start                    Start with defaults
  tlc start --port 8080        Use custom port
  tlc start --build            Rebuild containers first
`.trim();
}

module.exports = {
  DEFAULT_CONFIG,
  createDevServerRuntime,
  createRequestHandler,
  parseArgs,
  formatHelp,
};
