/**
 * Container Orchestrator Module
 * Handles Docker container lifecycle management
 */

/**
 * Build docker-compose command with common flags
 * @param {string} action - Command action (up, down, logs, etc.)
 * @param {Object} options - Command options
 * @returns {string} Full docker-compose command
 */
function buildComposeCommand(action, options = {}) {
  const {
    file = 'docker-compose.yml',
    projectName,
    services = [],
    flags = [],
  } = options;

  const parts = ['docker', 'compose'];

  if (file !== 'docker-compose.yml') {
    parts.push('-f', file);
  }

  if (projectName) {
    parts.push('-p', projectName);
  }

  parts.push(action);
  parts.push(...flags);

  if (services.length > 0) {
    parts.push(...services);
  }

  return parts.join(' ');
}

/**
 * Generate command to start services
 * @param {Object} options - Start options
 * @returns {string} Docker compose up command
 */
function getStartCommand(options = {}) {
  const { detached = true, build = false, services = [] } = options;

  const flags = [];
  if (detached) flags.push('-d');
  if (build) flags.push('--build');

  return buildComposeCommand('up', { ...options, flags, services });
}

/**
 * Generate command to stop services
 * @param {Object} options - Stop options
 * @returns {string} Docker compose down command
 */
function getStopCommand(options = {}) {
  const { removeVolumes = false, removeOrphans = false } = options;

  const flags = [];
  if (removeVolumes) flags.push('-v');
  if (removeOrphans) flags.push('--remove-orphans');

  return buildComposeCommand('down', { ...options, flags });
}

/**
 * Generate command to get logs
 * @param {Object} options - Log options
 * @returns {string} Docker compose logs command
 */
function getLogsCommand(options = {}) {
  const { follow = false, tail, timestamps = false, services = [] } = options;

  const flags = [];
  if (follow) flags.push('-f');
  if (timestamps) flags.push('-t');
  if (tail !== undefined) flags.push('--tail', String(tail));

  return buildComposeCommand('logs', { ...options, flags, services });
}

/**
 * Generate command to rebuild a service
 * @param {string} service - Service name
 * @param {Object} options - Build options
 * @returns {string} Docker compose build command
 */
function getRebuildCommand(service, options = {}) {
  const { noCache = false } = options;

  const flags = [];
  if (noCache) flags.push('--no-cache');

  return buildComposeCommand('build', { ...options, flags, services: [service] });
}

/**
 * Generate command to restart a service
 * @param {string} service - Service name
 * @param {Object} options - Restart options
 * @returns {string} Docker compose restart command
 */
function getRestartCommand(service, options = {}) {
  return buildComposeCommand('restart', { ...options, services: [service] });
}

/**
 * Generate command to get container status
 * @param {Object} options - Status options
 * @returns {string} Docker compose ps command
 */
function getStatusCommand(options = {}) {
  const flags = ['--format', 'json'];
  return buildComposeCommand('ps', { ...options, flags });
}

/**
 * Parse compose ps JSON output
 * @param {string} output - JSON output from docker compose ps
 * @returns {Array} Parsed container list
 */
function parseComposeStatus(output) {
  if (!output || output.trim() === '') {
    return [];
  }

  try {
    // Docker compose ps --format json outputs one JSON object per line
    const lines = output.trim().split('\n').filter(l => l.trim());
    return lines.map(line => {
      const container = JSON.parse(line);
      return {
        name: container.Name || container.Service,
        service: container.Service,
        state: container.State,
        status: container.Status,
        ports: container.Ports || container.Publishers,
        health: container.Health,
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * Determine overall stack health from container statuses
 * @param {Array} containers - Container status array
 * @returns {Object} Stack health summary
 */
function getStackHealth(containers) {
  if (containers.length === 0) {
    return { status: 'stopped', running: 0, total: 0 };
  }

  const running = containers.filter(c => c.state === 'running').length;
  const unhealthy = containers.filter(
    c => c.state === 'exited' || c.health === 'unhealthy'
  ).length;

  let status;
  if (running === containers.length && unhealthy === 0) {
    status = 'healthy';
  } else if (running === 0) {
    status = 'stopped';
  } else if (unhealthy > 0) {
    status = 'degraded';
  } else {
    status = 'starting';
  }

  return {
    status,
    running,
    total: containers.length,
    unhealthy,
    containers: containers.map(c => ({
      name: c.service || c.name,
      state: c.state,
      health: c.health,
    })),
  };
}

/**
 * Generate environment variables for development
 * @param {Object} options - Environment options
 * @returns {Object} Environment variable map
 */
function generateDevEnv(options = {}) {
  const {
    nodeEnv = 'development',
    dbHost = 'postgres',
    dbPort = 5432,
    redisHost = 'redis',
    redisPort = 6379,
    extraEnv = {},
  } = options;

  return {
    NODE_ENV: nodeEnv,
    DATABASE_HOST: dbHost,
    DATABASE_PORT: String(dbPort),
    REDIS_HOST: redisHost,
    REDIS_PORT: String(redisPort),
    ...extraEnv,
  };
}

/**
 * Format environment for docker-compose
 * @param {Object} env - Environment variables
 * @returns {string} YAML-formatted environment section
 */
function formatEnvForCompose(env) {
  return Object.entries(env)
    .map(([key, value]) => `      - ${key}=${value}`)
    .join('\n');
}

/**
 * Get volume mount for hot reload
 * @param {string} servicePath - Path to service directory
 * @param {string} containerPath - Path inside container
 * @returns {Object} Volume configuration
 */
function getHotReloadVolume(servicePath, containerPath = '/app') {
  return {
    mount: `${servicePath}:${containerPath}`,
    exclude: [`${containerPath}/node_modules`],
  };
}

module.exports = {
  buildComposeCommand,
  getStartCommand,
  getStopCommand,
  getLogsCommand,
  getRebuildCommand,
  getRestartCommand,
  getStatusCommand,
  parseComposeStatus,
  getStackHealth,
  generateDevEnv,
  formatEnvForCompose,
  getHotReloadVolume,
};
