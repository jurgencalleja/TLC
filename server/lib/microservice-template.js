/**
 * Microservice Template Generator
 * Generates monorepo structure for microservice projects
 */

class MicroserviceTemplate {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate monorepo directory structure
   * @param {Object} config - Configuration object
   * @param {string} config.projectName - Project name
   * @param {string[]} config.services - Array of service names
   * @param {string} config.database - Database type (default: 'postgres')
   * @returns {Object} Generated structure with directories and files arrays
   */
  generateStructure(config) {
    const { projectName, services = [] } = config;

    const directories = [
      projectName,
      `${projectName}/services`,
      `${projectName}/shared`,
      `${projectName}/shared/types`,
      `${projectName}/shared/contracts`,
      `${projectName}/shared/events`,
      `${projectName}/gateway`,
    ];

    // Add service directories
    for (const service of services) {
      directories.push(`${projectName}/services/${service}`);
    }

    const files = [
      `${projectName}/docker-compose.yml`,
      `${projectName}/package.json`,
      `${projectName}/.env.example`,
      `${projectName}/README.md`,
    ];

    return { directories, files };
  }

  /**
   * Generate root package.json with npm workspaces
   * @param {Object} config - Configuration object
   * @returns {string} JSON string of package.json
   */
  generateRootPackageJson(config) {
    const { projectName } = config;

    const pkg = {
      name: projectName,
      version: '0.1.0',
      private: true,
      workspaces: [
        'services/*',
        'shared',
      ],
      scripts: {
        dev: 'npm run docker:up',
        build: 'npm run -ws build',
        test: 'npm run -ws test',
        'docker:up': 'docker-compose up -d',
        'docker:down': 'docker-compose down',
      },
      devDependencies: {
        vitest: '^4.0.0',
      },
    };

    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Generate docker-compose.yml
   * @param {Object} config - Configuration object
   * @returns {string} YAML string
   */
  generateDockerCompose(config) {
    const { services = [], database = 'postgres' } = config;

    const compose = {
      version: '3.8',
      services: {},
      networks: {
        backend: {
          driver: 'bridge',
        },
      },
      volumes: {},
    };

    // Add application services
    let port = 3001;
    for (const service of services) {
      compose.services[service] = {
        build: {
          context: `./services/${service}`,
          dockerfile: 'Dockerfile',
        },
        ports: [`${port}:${port}`],
        environment: {
          NODE_ENV: 'development',
          PORT: port,
          DATABASE_URL: `postgres://user:password@postgres:5432/${config.projectName}`,
          REDIS_URL: 'redis://redis:6379',
        },
        depends_on: ['postgres', 'redis'],
        networks: ['backend'],
        labels: {
          'traefik.enable': 'true',
          [`traefik.http.routers.${service}.rule`]: `PathPrefix(\`/api/${service}\`)`,
        },
      };
      port++;
    }

    // Add infrastructure services
    if (database === 'postgres' || !database) {
      compose.services.postgres = {
        image: 'postgres:15-alpine',
        environment: {
          POSTGRES_DB: config.projectName,
          POSTGRES_USER: 'user',
          POSTGRES_PASSWORD: 'password',
        },
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
        networks: ['backend'],
      };
      compose.volumes.postgres_data = {};
    }

    compose.services.redis = {
      image: 'redis:7-alpine',
      ports: ['6379:6379'],
      volumes: ['redis_data:/data'],
      networks: ['backend'],
    };
    compose.volumes.redis_data = {};

    compose.services.traefik = {
      image: 'traefik:v2.10',
      command: [
        '--api.insecure=true',
        '--providers.docker=true',
        '--providers.docker.exposedbydefault=false',
        '--entrypoints.web.address=:80',
      ],
      ports: ['80:80', '8080:8080'],
      volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'],
      networks: ['backend'],
    };

    return this.toYaml(compose);
  }

  /**
   * Generate .env.example file
   * @param {Object} config - Configuration object
   * @returns {string} Environment file content
   */
  generateEnvExample(config) {
    const { projectName, services = [], database = 'postgres' } = config;

    let env = `# ${projectName} Environment Configuration

# Node Environment
NODE_ENV=development

`;

    // Service URLs
    env += '# Service URLs\n';
    let port = 3001;
    for (const service of services) {
      const envName = service.toUpperCase().replace(/-/g, '_');
      env += `${envName}_SERVICE_URL=http://localhost:${port}\n`;
      port++;
    }

    env += '\n';

    // Database
    if (database === 'postgres' || !database) {
      env += `# Database
DATABASE_URL=postgres://user:password@localhost:5432/${projectName}

`;
    }

    // Redis
    env += `# Redis
REDIS_URL=redis://localhost:6379

`;

    // Traefik
    env += `# Gateway
GATEWAY_URL=http://localhost:80
TRAEFIK_DASHBOARD=http://localhost:8080
`;

    return env;
  }

  /**
   * Generate README.md
   * @param {Object} config - Configuration object
   * @returns {string} Markdown content
   */
  generateReadme(config) {
    const { projectName, services = [], database = 'postgres' } = config;

    let readme = `# ${projectName}

A microservices platform built with Node.js.

## Architecture

\`\`\`mermaid
graph TB
    Client[Client]
    Gateway[Traefik Gateway]

    Client --> Gateway

`;

    // Add services to diagram
    for (const service of services) {
      const label = service.charAt(0).toUpperCase() + service.slice(1);
      readme += `    Gateway --> ${label}[${label} Service]\n`;
    }

    // Add infrastructure
    readme += `
    subgraph Infrastructure
        DB[(${database === 'postgres' ? 'PostgreSQL' : database})]
        Cache[(Redis)]
    end

`;

    // Connect services to infrastructure
    for (const service of services) {
      const label = service.charAt(0).toUpperCase() + service.slice(1);
      readme += `    ${label} --> DB\n`;
      readme += `    ${label} --> Cache\n`;
    }

    readme += `\`\`\`

## Services

| Service | Port | Description |
|---------|------|-------------|
`;

    let port = 3001;
    for (const service of services) {
      readme += `| ${service} | ${port} | ${service.charAt(0).toUpperCase() + service.slice(1)} service |\n`;
      port++;
    }

    readme += `
## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${projectName}

# Install dependencies
npm install

# Start all services
npm run docker:up
\`\`\`

### Development

\`\`\`bash
# Start infrastructure
docker-compose up -d postgres redis traefik

# Run services locally
npm run dev
\`\`\`

### Testing

\`\`\`bash
npm test
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── services/
${services.map(s => `│   ├── ${s}/`).join('\n')}
├── shared/
│   ├── types/
│   ├── contracts/
│   └── events/
├── gateway/
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
\`\`\`

## Environment Variables

Copy \`.env.example\` to \`.env\` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | postgres://user:password@localhost:5432/${projectName} |
| REDIS_URL | Redis connection string | redis://localhost:6379 |

## API Gateway

Traefik routes requests to services:

- \`/api/{service}/*\` -> {service} service
- Dashboard: http://localhost:8080

## License

MIT
`;

    return readme;
  }

  /**
   * Simple YAML serializer (same pattern as service-scaffold.js)
   * @param {Object} obj - Object to serialize
   * @param {number} indent - Current indentation level
   * @returns {string} YAML string
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
}

module.exports = { MicroserviceTemplate };
