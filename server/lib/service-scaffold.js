/**
 * Service Scaffold Generator
 * Generates service boilerplate from extraction plan
 */

const path = require('path');

class ServiceScaffold {
  constructor(options = {}) {
    this.options = options;
    this.basePath = options.basePath || process.cwd();
    this.templatesPath = options.templatesPath || path.join(__dirname, 'templates');
  }

  /**
   * Generate complete service scaffold
   * @param {Object} service - Service definition from conversion plan
   * @returns {Object} Generated scaffold files
   */
  generate(service) {
    const serviceName = service.name || 'service';
    const serviceDir = service.directory || serviceName;

    const files = {
      directory: serviceDir,
      files: [],
    };

    // Generate package.json
    files.files.push({
      path: `${serviceDir}/package.json`,
      content: this.generatePackageJson(service),
    });

    // Generate Dockerfile
    files.files.push({
      path: `${serviceDir}/Dockerfile`,
      content: this.generateDockerfile(service),
    });

    // Generate docker-compose entry
    files.files.push({
      path: `${serviceDir}/docker-compose.yml`,
      content: this.generateDockerCompose(service),
    });

    // Generate API client
    files.files.push({
      path: `${serviceDir}/client/index.js`,
      content: this.generateApiClient(service),
    });

    // Generate service structure
    files.files.push({
      path: `${serviceDir}/src/index.js`,
      content: this.generateEntryPoint(service),
    });

    // Generate health check
    files.files.push({
      path: `${serviceDir}/src/health.js`,
      content: this.generateHealthCheck(service),
    });

    // Generate config
    files.files.push({
      path: `${serviceDir}/src/config.js`,
      content: this.generateConfig(service),
    });

    // Generate README
    files.files.push({
      path: `${serviceDir}/README.md`,
      content: this.generateReadme(service),
    });

    return files;
  }

  /**
   * Generate package.json
   */
  generatePackageJson(service) {
    const pkg = {
      name: service.name || 'service',
      version: '0.1.0',
      description: service.description || `${service.name} microservice`,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'node --watch src/index.js',
        test: 'vitest run',
        'test:watch': 'vitest',
      },
      dependencies: {},
      devDependencies: {
        vitest: '^4.0.0',
      },
    };

    // Add express if service has endpoints
    if (service.endpoints?.length > 0) {
      pkg.dependencies.express = '^4.18.0';
    }

    // Add dependencies from service definition
    if (service.dependencies) {
      for (const dep of service.dependencies) {
        // Only add external npm dependencies, not internal service deps
        if (!dep.includes('/')) {
          pkg.dependencies[dep] = '*';
        }
      }
    }

    // Add dependencies from models (e.g., database drivers)
    if (service.models?.length > 0) {
      // Assume PostgreSQL for now
      pkg.dependencies.pg = '^8.11.0';
    }

    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Generate Dockerfile
   */
  generateDockerfile(service) {
    const nodeVersion = service.nodeVersion || '20';
    const port = service.port || 3000;

    return `# ${service.name} service
FROM node:${nodeVersion}-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Expose port
EXPOSE ${port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1

# Run service
CMD ["node", "src/index.js"]
`;
  }

  /**
   * Generate docker-compose entry
   */
  generateDockerCompose(service) {
    const port = service.port || 3000;
    const serviceName = (service.name || 'service').toLowerCase().replace(/[^a-z0-9]/g, '-');

    const compose = {
      version: '3.8',
      services: {
        [serviceName]: {
          build: {
            context: '.',
            dockerfile: 'Dockerfile',
          },
          ports: [`${port}:${port}`],
          environment: {
            NODE_ENV: 'development',
            PORT: port,
          },
          healthcheck: {
            test: ['CMD', 'wget', '--spider', `http://localhost:${port}/health`],
            interval: '30s',
            timeout: '3s',
            retries: 3,
          },
        },
      },
    };

    // Add database if service has models
    if (service.models?.length > 0) {
      compose.services.postgres = {
        image: 'postgres:15-alpine',
        environment: {
          POSTGRES_DB: serviceName,
          POSTGRES_USER: serviceName,
          POSTGRES_PASSWORD: 'dev_password',
        },
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      };

      compose.services[serviceName].depends_on = ['postgres'];
      compose.services[serviceName].environment.DATABASE_URL =
        `postgres://${serviceName}:dev_password@postgres:5432/${serviceName}`;

      compose.volumes = {
        postgres_data: {},
      };
    }

    // Convert to YAML manually (simple approach)
    return this.toYaml(compose);
  }

  /**
   * Simple YAML serializer
   */
  toYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.toYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.toYaml(value, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Generate API client for consumers
   */
  generateApiClient(service) {
    const serviceName = service.name || 'service';
    const port = service.port || 3000;
    const endpoints = service.endpoints || [];

    let client = `/**
 * ${serviceName} API Client
 * Auto-generated client for ${serviceName} service
 */

class ${this.toPascalCase(serviceName)}Client {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.${serviceName.toUpperCase()}_URL || 'http://localhost:${port}';
  }

  async request(method, path, data = null) {
    const url = \`\${this.baseUrl}\${path}\`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

`;

    // Generate method for each endpoint
    for (const endpoint of endpoints) {
      const method = (endpoint.method || 'GET').toLowerCase();
      const path = endpoint.path || '/';
      const name = endpoint.name || this.pathToMethodName(method, path);

      if (method === 'get') {
        client += `  async ${name}(params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = query ? \`${path}?\${query}\` : '${path}';
    return this.request('GET', path);
  }

`;
      } else {
        client += `  async ${name}(data) {
    return this.request('${method.toUpperCase()}', '${path}', data);
  }

`;
      }
    }

    client += `}

module.exports = { ${this.toPascalCase(serviceName)}Client };
`;

    return client;
  }

  /**
   * Generate service entry point
   */
  generateEntryPoint(service) {
    const serviceName = service.name || 'service';
    const port = service.port || 3000;
    const hasEndpoints = service.endpoints?.length > 0;

    if (!hasEndpoints) {
      return `/**
 * ${serviceName} Service
 */

const config = require('./config');

console.log('${serviceName} service starting...');
console.log('Configuration:', config);

// Service initialization
async function start() {
  console.log('${serviceName} service started');
}

start().catch(console.error);
`;
    }

    return `/**
 * ${serviceName} Service
 */

const express = require('express');
const { healthCheck } = require('./health');
const config = require('./config');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', healthCheck);

// Service routes
${service.endpoints.map(ep => `// ${ep.method || 'GET'} ${ep.path || '/'} - ${ep.description || 'TODO'}`).join('\n')}

app.listen(config.port, () => {
  console.log(\`${serviceName} service listening on port \${config.port}\`);
});
`;
  }

  /**
   * Generate health check
   */
  generateHealthCheck(service) {
    const serviceName = service.name || 'service';

    return `/**
 * Health Check
 */

function healthCheck(req, res) {
  res.json({
    status: 'healthy',
    service: '${serviceName}',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { healthCheck };
`;
  }

  /**
   * Generate config
   */
  generateConfig(service) {
    const serviceName = service.name || 'service';
    const port = service.port || 3000;

    return `/**
 * ${serviceName} Configuration
 */

module.exports = {
  serviceName: '${serviceName}',
  port: process.env.PORT || ${port},
  env: process.env.NODE_ENV || 'development',
  ${service.models?.length > 0 ? `databaseUrl: process.env.DATABASE_URL,` : ''}
};
`;
  }

  /**
   * Generate README
   */
  generateReadme(service) {
    const serviceName = service.name || 'service';
    const port = service.port || 3000;

    return `# ${serviceName}

${service.description || `${serviceName} microservice extracted from monolith.`}

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
${(service.endpoints || []).map(ep => `| ${ep.method || 'GET'} | ${ep.path || '/'} | ${ep.description || 'TODO'} |`).join('\n')}

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | ${port} | Service port |
| NODE_ENV | development | Environment |
${service.models?.length > 0 ? '| DATABASE_URL | - | PostgreSQL connection string |' : ''}

## Testing

\`\`\`bash
npm test
\`\`\`
`;
  }

  /**
   * Convert path to method name
   */
  pathToMethodName(method, path) {
    const parts = path.split('/').filter(Boolean).map(p => {
      if (p.startsWith(':')) return 'By' + this.toPascalCase(p.slice(1));
      return this.toPascalCase(p);
    });

    const action = method === 'get' ? 'get' :
                   method === 'post' ? 'create' :
                   method === 'put' ? 'update' :
                   method === 'delete' ? 'delete' : method;

    return action + parts.join('');
  }

  /**
   * Convert string to PascalCase
   */
  toPascalCase(str) {
    return str.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
  }
}

module.exports = { ServiceScaffold };
