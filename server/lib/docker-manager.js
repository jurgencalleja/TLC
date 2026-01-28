/**
 * Docker Manager Module
 * Handles service detection, Dockerfile generation, and container management
 */

/**
 * Detect services from project files
 * @param {Object} files - Map of file paths to contents
 * @returns {Object} Detected services
 */
function detectServices(files) {
  const services = [];

  // Check for existing docker-compose
  const composeFile = files['docker-compose.yml'] || files['docker-compose.yaml'];
  if (composeFile) {
    const parsed = parseDockerComposeYaml(composeFile);
    for (const [name, config] of Object.entries(parsed.services || {})) {
      services.push({
        name,
        type: config.image ? 'image' : 'build',
        image: config.image,
        build: config.build,
        existing: true,
      });
    }
  }

  // Detect from package.json files
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(content);
        const servicePath = path.replace('/package.json', '').replace('package.json', '.');
        const serviceName = getServiceName(path, pkg.name);

        // Skip if already in docker-compose
        if (services.some(s => s.name === serviceName)) continue;

        const type = detectNodeType(pkg);
        services.push({
          name: serviceName,
          type,
          port: getDefaultPort(type),
          path: servicePath,
        });
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  // Detect Python
  if (files['requirements.txt'] || files['pyproject.toml']) {
    if (!services.some(s => s.type === 'python')) {
      services.push({
        name: 'app',
        type: 'python',
        port: 5000,
        path: '.',
      });
    }
  }

  // Detect Go
  if (files['go.mod']) {
    if (!services.some(s => s.type === 'go')) {
      services.push({
        name: 'app',
        type: 'go',
        port: 8080,
        path: '.',
      });
    }
  }

  return { services };
}

/**
 * Parse docker-compose YAML (simplified)
 */
function parseDockerComposeYaml(content) {
  const result = { services: {} };

  // Simple YAML parsing for services
  const lines = content.split('\n');
  let currentService = null;
  let inServices = false;

  for (const line of lines) {
    if (line.match(/^services:/)) {
      inServices = true;
      continue;
    }

    if (inServices && line.match(/^  \w+:/)) {
      currentService = line.trim().replace(':', '');
      result.services[currentService] = {};
    }

    if (currentService && line.match(/^\s+image:/)) {
      result.services[currentService].image = line.split(':').slice(1).join(':').trim();
    }

    if (currentService && line.match(/^\s+build:/)) {
      result.services[currentService].build = line.split(':').slice(1).join(':').trim();
    }
  }

  return result;
}

/**
 * Get service name from path
 */
function getServiceName(path, pkgName) {
  if (path === 'package.json') return 'app';

  // Extract from path like services/api/package.json
  const parts = path.split('/');
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }

  return pkgName || 'app';
}

/**
 * Detect Node.js project type
 */
function detectNodeType(pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts = pkg.scripts || {};

  if (deps.next || scripts.dev?.includes('next')) return 'nextjs';
  if (deps.nuxt) return 'nuxt';
  if (deps.vite || scripts.dev?.includes('vite')) return 'vite';
  if (deps.express) return 'express';
  if (deps.fastify) return 'fastify';
  if (deps.hono) return 'hono';

  return 'nodejs';
}

/**
 * Get default port for service type
 */
function getDefaultPort(type) {
  const ports = {
    nextjs: 3000,
    nuxt: 3000,
    vite: 5173,
    express: 3000,
    fastify: 3000,
    hono: 3000,
    nodejs: 3000,
    python: 5000,
    go: 8080,
  };
  return ports[type] || 3000;
}

/**
 * Generate Dockerfile for a service
 * @param {Object} service - Service configuration
 * @returns {string} Dockerfile content
 */
function generateDockerfile(service) {
  switch (service.type) {
    case 'nextjs':
      return `# Next.js application
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE ${service.port || 3000}

# Run next dev for hot reload
CMD ["npm", "run", "dev"]
`;

    case 'vite':
    case 'nodejs':
    case 'express':
    case 'fastify':
    case 'hono':
      return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE ${service.port || 3000}

CMD ["npm", "run", "dev"]
`;

    case 'python':
      return `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE ${service.port || 5000}

CMD ["python", "app.py"]
`;

    case 'go':
      return `FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main .

EXPOSE ${service.port || 8080}

CMD ["./main"]
`;

    default:
      return `FROM node:20-alpine

WORKDIR /app

COPY . .

EXPOSE ${service.port || 3000}

CMD ["npm", "start"]
`;
  }
}

/**
 * Generate docker-compose.yml content
 * @param {Array} services - List of services
 * @param {Object} options - Generation options
 * @returns {string} docker-compose.yml content
 */
function generateDockerCompose(services, options = {}) {
  const { infrastructure = [], hotReload = true } = options;

  const lines = ['version: "3.8"', '', 'services:'];

  // App services
  for (const service of services) {
    lines.push(`  ${service.name}:`);
    lines.push(`    build: ${service.path || '.'}`);
    lines.push(`    ports:`);
    lines.push(`      - "${service.port}:${service.port}"`);

    if (hotReload && service.path) {
      lines.push(`    volumes:`);
      lines.push(`      - ${service.path === '.' ? './' : service.path + '/'}:/app`);
      lines.push(`      - /app/node_modules`);
    }

    lines.push(`    environment:`);
    lines.push(`      - NODE_ENV=development`);
    lines.push('');
  }

  // Infrastructure services
  if (infrastructure.includes('postgres')) {
    lines.push(`  postgres:`);
    lines.push(`    image: postgres:15-alpine`);
    lines.push(`    environment:`);
    lines.push(`      - POSTGRES_USER=postgres`);
    lines.push(`      - POSTGRES_PASSWORD=postgres`);
    lines.push(`      - POSTGRES_DB=app`);
    lines.push(`    volumes:`);
    lines.push(`      - postgres_data:/var/lib/postgresql/data`);
    lines.push(`    ports:`);
    lines.push(`      - "5432:5432"`);
    lines.push('');
  }

  if (infrastructure.includes('redis')) {
    lines.push(`  redis:`);
    lines.push(`    image: redis:7-alpine`);
    lines.push(`    ports:`);
    lines.push(`      - "6379:6379"`);
    lines.push('');
  }

  if (infrastructure.includes('minio')) {
    lines.push(`  minio:`);
    lines.push(`    image: minio/minio`);
    lines.push(`    command: server /data --console-address ":9001"`);
    lines.push(`    ports:`);
    lines.push(`      - "9000:9000"`);
    lines.push(`      - "9001:9001"`);
    lines.push(`    volumes:`);
    lines.push(`      - minio_data:/data`);
    lines.push('');
  }

  // Networks
  if (services.length > 1) {
    lines.push('networks:');
    lines.push('  default:');
    lines.push('    driver: bridge');
    lines.push('');
  }

  // Volumes
  const volumes = [];
  if (infrastructure.includes('postgres')) volumes.push('postgres_data');
  if (infrastructure.includes('minio')) volumes.push('minio_data');

  if (volumes.length > 0) {
    lines.push('volumes:');
    for (const vol of volumes) {
      lines.push(`  ${vol}:`);
    }
  }

  return lines.join('\n');
}

/**
 * Parse docker ps JSON output
 * @param {string} output - JSON output from docker ps --format json
 * @returns {Array} Parsed container list
 */
function parseDockerPs(output) {
  try {
    const containers = JSON.parse(output);
    return containers.map(c => ({
      name: c.Names,
      state: c.State,
      status: c.Status,
      ports: c.Ports,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Parse docker logs output
 * @param {string} logs - Raw log output
 * @returns {Array} Parsed log entries
 */
function parseDockerLogs(logs) {
  const lines = logs.split('\n').filter(l => l.trim());

  return lines.map(line => {
    // Try to parse ISO timestamp
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);

    if (timestampMatch) {
      return {
        timestamp: timestampMatch[1],
        message: timestampMatch[2],
      };
    }

    return {
      timestamp: null,
      message: line,
    };
  });
}

/**
 * Get service health from container info
 * @param {Object} container - Container info from docker ps
 * @returns {Object} Health status
 */
function getServiceHealth(container) {
  if (container.state === 'exited') {
    const exitMatch = container.status.match(/Exited \((\d+)\)/);
    return {
      status: 'unhealthy',
      exitCode: exitMatch ? parseInt(exitMatch[1], 10) : null,
    };
  }

  if (container.state === 'running') {
    if (container.status.includes('healthy')) {
      return { status: 'healthy' };
    }
    if (container.status.includes('unhealthy')) {
      return { status: 'unhealthy' };
    }
    return { status: 'running' };
  }

  return { status: 'unknown' };
}

module.exports = {
  detectServices,
  generateDockerfile,
  generateDockerCompose,
  parseDockerPs,
  parseDockerLogs,
  getServiceHealth,
};
