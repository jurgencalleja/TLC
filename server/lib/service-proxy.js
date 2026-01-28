/**
 * Service Proxy Module
 * Handles proxying requests to running application containers
 */

/**
 * Create proxy configuration for a service
 * @param {Object} service - Service configuration
 * @returns {Object} Proxy config
 */
function createProxyConfig(service) {
  const { name, port, host = 'localhost' } = service;

  return {
    target: `http://${host}:${port}`,
    changeOrigin: true,
    ws: true, // Support WebSocket proxying
    pathRewrite: {
      [`^/proxy/${name}`]: '',
    },
    onError: (err, req, res) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Service unavailable',
        service: name,
        message: err.message,
      }));
    },
  };
}

/**
 * Build proxy middleware map for multiple services
 * @param {Array} services - List of services
 * @returns {Object} Map of path -> proxy config
 */
function buildProxyMap(services) {
  const proxyMap = {};

  for (const service of services) {
    const path = `/proxy/${service.name}`;
    proxyMap[path] = createProxyConfig(service);
  }

  return proxyMap;
}

/**
 * Check if a service is healthy by making a health check request
 * @param {Object} service - Service configuration
 * @param {Object} options - Health check options
 * @returns {Promise<Object>} Health check result
 */
async function checkServiceHealth(service, options = {}) {
  const { timeout = 5000, path = '/health' } = options;
  const { name, port, host = 'localhost' } = service;
  const url = `http://${host}:${port}${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      service: name,
      healthy: response.ok,
      status: response.status,
      latency: Date.now(), // Would need start time for real latency
    };
  } catch (error) {
    return {
      service: name,
      healthy: false,
      status: 0,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}

/**
 * Get iframe embed URL for a service
 * @param {Object} service - Service configuration
 * @param {Object} options - Dashboard options
 * @returns {string} Embed URL
 */
function getEmbedUrl(service, options = {}) {
  const { dashboardHost = 'localhost', dashboardPort = 3147 } = options;
  return `http://${dashboardHost}:${dashboardPort}/proxy/${service.name}`;
}

/**
 * Parse port mapping from docker-compose format
 * @param {string} portMapping - Port mapping like "3000:3000" or "8080:3000"
 * @returns {Object} Parsed port info
 */
function parsePortMapping(portMapping) {
  const parts = portMapping.split(':');

  if (parts.length === 1) {
    // Just container port, same host port
    const port = parseInt(parts[0], 10);
    return { hostPort: port, containerPort: port };
  }

  if (parts.length === 2) {
    // host:container
    return {
      hostPort: parseInt(parts[0], 10),
      containerPort: parseInt(parts[1], 10),
    };
  }

  if (parts.length === 3) {
    // ip:host:container
    return {
      ip: parts[0],
      hostPort: parseInt(parts[1], 10),
      containerPort: parseInt(parts[2], 10),
    };
  }

  return null;
}

/**
 * Extract services from running containers
 * @param {Array} containers - Container info from docker ps
 * @returns {Array} Service configurations for proxy
 */
function extractServicesFromContainers(containers) {
  return containers
    .filter(c => c.ports && c.state === 'running')
    .map(container => {
      // Parse first port mapping
      const portMatch = container.ports.match(/(\d+)->(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : null;

      return {
        name: container.name.replace(/-\d+$/, ''), // Remove suffix like -1
        port,
        host: 'localhost',
        containerId: container.name,
        status: container.status,
      };
    })
    .filter(s => s.port !== null);
}

/**
 * Generate nginx config for reverse proxy
 * @param {Array} services - List of services
 * @param {Object} options - Config options
 * @returns {string} Nginx config content
 */
function generateNginxConfig(services, options = {}) {
  const { serverName = 'localhost', dashboardPort = 3147 } = options;

  const locations = services.map(service => `
    location /proxy/${service.name}/ {
        proxy_pass http://${service.host || 'localhost'}:${service.port}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
`).join('\n');

  return `server {
    listen ${dashboardPort};
    server_name ${serverName};

    # Dashboard
    location / {
        proxy_pass http://localhost:3147;
    }
${locations}
}
`;
}

module.exports = {
  createProxyConfig,
  buildProxyMap,
  checkServiceHealth,
  getEmbedUrl,
  parsePortMapping,
  extractServicesFromContainers,
  generateNginxConfig,
};
