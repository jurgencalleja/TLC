/**
 * Dev Server Command Module
 * Main orchestrator for the TLC development server
 */

const { detectServices, generateDockerfile, generateDockerCompose } = require('./docker-manager');
const { buildProxyMap, extractServicesFromContainers } = require('./service-proxy');
const {
  getStartCommand,
  getStopCommand,
  getStatusCommand,
  parseComposeStatus,
  getStackHealth,
} = require('./container-orchestrator');
const { createLogBuffer, aggregateLogs } = require('./log-streamer');

/**
 * Analyze project and detect services
 * @param {Object} files - Map of file paths to contents
 * @returns {Object} Analysis result
 */
function analyzeProject(files) {
  const { services } = detectServices(files);

  const analysis = {
    services,
    hasDockerCompose: !!files['docker-compose.yml'] || !!files['docker-compose.yaml'],
    hasDockerfile: Object.keys(files).some(f => f.toLowerCase().includes('dockerfile')),
    needsGeneration: [],
    infrastructure: detectInfrastructure(files),
  };

  // Check what needs to be generated
  if (!analysis.hasDockerCompose) {
    analysis.needsGeneration.push('docker-compose.yml');
  }

  for (const service of services) {
    if (service.type !== 'image' && !files[`${service.path || '.'}/Dockerfile`]) {
      analysis.needsGeneration.push(`${service.path || '.'}/Dockerfile`);
    }
  }

  return analysis;
}

/**
 * Detect infrastructure requirements from files
 * @param {Object} files - Project files
 * @returns {Array} Infrastructure services needed
 */
function detectInfrastructure(files) {
  const infra = [];

  // Check for database
  const allContent = Object.values(files).join('\n');

  if (allContent.includes('postgres') || allContent.includes('pg_') || allContent.includes('DATABASE_URL')) {
    infra.push('postgres');
  }

  if (allContent.includes('redis') || allContent.includes('REDIS_URL')) {
    infra.push('redis');
  }

  if (allContent.includes('minio') || allContent.includes('S3_') || allContent.includes('aws-sdk')) {
    infra.push('minio');
  }

  return infra;
}

/**
 * Generate Docker files for the project
 * @param {Object} analysis - Project analysis
 * @returns {Object} Generated files
 */
function generateDockerFiles(analysis) {
  const files = {};

  // Generate docker-compose.yml
  if (analysis.needsGeneration.includes('docker-compose.yml')) {
    files['docker-compose.yml'] = generateDockerCompose(analysis.services, {
      infrastructure: analysis.infrastructure,
      hotReload: true,
    });
  }

  // Generate Dockerfiles for services
  for (const service of analysis.services) {
    const dockerfilePath = `${service.path || '.'}/Dockerfile`;
    if (analysis.needsGeneration.includes(dockerfilePath)) {
      files[dockerfilePath] = generateDockerfile(service);
    }
  }

  return files;
}

/**
 * Format project analysis for display
 * @param {Object} analysis - Project analysis
 * @returns {string} Formatted output
 */
function formatAnalysis(analysis) {
  const lines = ['# Project Analysis', ''];

  // Services
  lines.push('## Detected Services');
  if (analysis.services.length === 0) {
    lines.push('No services detected.');
  } else {
    lines.push('');
    lines.push('| Service | Type | Port | Path |');
    lines.push('|---------|------|------|------|');
    for (const s of analysis.services) {
      lines.push(`| ${s.name} | ${s.type} | ${s.port || '-'} | ${s.path || '.'} |`);
    }
  }
  lines.push('');

  // Infrastructure
  if (analysis.infrastructure.length > 0) {
    lines.push('## Infrastructure');
    lines.push(`Detected: ${analysis.infrastructure.join(', ')}`);
    lines.push('');
  }

  // Files to generate
  if (analysis.needsGeneration.length > 0) {
    lines.push('## Files to Generate');
    for (const file of analysis.needsGeneration) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format stack status for display
 * @param {Object} health - Stack health info
 * @returns {string} Formatted status
 */
function formatStackStatus(health) {
  const statusIcons = {
    healthy: '✅',
    degraded: '⚠️',
    stopped: '⏹️',
    starting: '🔄',
  };

  const lines = [
    '# Stack Status',
    '',
    `Status: ${statusIcons[health.status] || '❓'} ${health.status}`,
    `Running: ${health.running}/${health.total}`,
    '',
  ];

  if (health.containers && health.containers.length > 0) {
    lines.push('## Services');
    lines.push('');
    lines.push('| Service | State | Health |');
    lines.push('|---------|-------|--------|');
    for (const c of health.containers) {
      const stateIcon = c.state === 'running' ? '🟢' : '🔴';
      const healthStr = c.health || '-';
      lines.push(`| ${c.name} | ${stateIcon} ${c.state} | ${healthStr} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Create server state manager
 * @returns {Object} State manager
 */
function createServerState() {
  const state = {
    services: [],
    containers: [],
    health: null,
    logBuffers: {},
    startTime: null,
    isRunning: false,
  };

  return {
    getState: () => ({ ...state }),

    setServices(services) {
      state.services = services;
      // Create log buffer for each service
      for (const service of services) {
        if (!state.logBuffers[service.name]) {
          state.logBuffers[service.name] = createLogBuffer({ maxSize: 500 });
        }
      }
    },

    updateContainers(containers) {
      state.containers = containers;
      state.health = getStackHealth(containers);
    },

    addLog(service, entry) {
      if (state.logBuffers[service]) {
        state.logBuffers[service].add(entry);
      }
    },

    getLogs(service, count = 100) {
      if (service && state.logBuffers[service]) {
        return state.logBuffers[service].getRecent(count);
      }
      // Aggregate all logs
      const allLogs = Object.values(state.logBuffers).map(b => b.getRecent(count));
      return aggregateLogs(allLogs).slice(-count);
    },

    setRunning(isRunning) {
      state.isRunning = isRunning;
      if (isRunning) {
        state.startTime = Date.now();
      } else {
        state.startTime = null;
      }
    },

    getUptime() {
      if (!state.startTime) return null;
      return Date.now() - state.startTime;
    },
  };
}

/**
 * Get commands to run for starting the dev server
 * @param {Object} analysis - Project analysis
 * @returns {Array} Commands to execute
 */
function getStartSequence(analysis) {
  const commands = [];

  // Build command
  commands.push({
    name: 'build',
    command: getStartCommand({ build: true, detached: false }),
    description: 'Building and starting services...',
  });

  return commands;
}

/**
 * Get URL for accessing the dashboard with embedded app
 * @param {Object} options - Options
 * @returns {string} Dashboard URL
 */
function getDashboardUrl(options = {}) {
  const { host = 'localhost', port = 3147 } = options;
  return `http://${host}:${port}`;
}

module.exports = {
  analyzeProject,
  detectInfrastructure,
  generateDockerFiles,
  formatAnalysis,
  formatStackStatus,
  createServerState,
  getStartSequence,
  getDashboardUrl,
};
