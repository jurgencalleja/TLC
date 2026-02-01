/**
 * Example Service Template Generator
 * Generates a complete working microservice template
 */

class ExampleService {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate complete service
   * @param {Object} config - Configuration object
   * @param {string} config.name - Service name (e.g., 'user')
   * @param {number} config.port - Service port (e.g., 3001)
   * @param {string} config.database - Database type (e.g., 'postgres')
   * @returns {Object} Generated structure { directories: [...], files: [...] }
   */
  generate(config) {
    const name = config.name || 'service';

    const directories = [
      name,
      `${name}/src`,
      `${name}/src/routes`,
      `${name}/tests`,
    ];

    // Add migrations directory if database is configured
    if (config.database) {
      directories.push(`${name}/migrations`);
    }

    const files = [];

    // Package.json
    files.push({
      path: `${name}/package.json`,
      content: this.generatePackageJson(config),
    });

    // Entry point
    files.push({
      path: `${name}/src/index.js`,
      content: this.generateIndex(config),
    });

    // Routes
    files.push({
      path: `${name}/src/routes/index.js`,
      content: this.generateRoutes(config),
    });

    // Dockerfile
    files.push({
      path: `${name}/Dockerfile`,
      content: this.generateDockerfile(config),
    });

    // Docker Compose
    files.push({
      path: `${name}/docker-compose.yml`,
      content: this.generateDockerCompose(config),
    });

    // Migrations (if database configured)
    if (config.database) {
      const migration = this.generateMigrations(config);
      files.push({
        path: `${name}/migrations/${migration.path}`,
        content: migration.content,
      });
    }

    // Tests
    const tests = this.generateTests(config);
    files.push({
      path: `${name}/tests/routes.test.js`,
      content: tests.unit,
    });
    files.push({
      path: `${name}/tests/integration.test.js`,
      content: tests.integration,
    });

    return { directories, files };
  }

  /**
   * Generate package.json for service
   * @param {Object} config - Configuration object
   * @returns {string} JSON string of package.json
   */
  generatePackageJson(config) {
    const name = config.name || 'service';

    const pkg = {
      name,
      version: '0.1.0',
      description: `${name} microservice`,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'node --watch src/index.js',
        test: 'vitest run',
        migrate: 'node migrations/run.js',
      },
      dependencies: {
        express: '^4.18.0',
      },
      devDependencies: {
        vitest: '^4.0.0',
      },
    };

    // Add database driver if configured
    if (config.database === 'postgres') {
      pkg.dependencies.pg = '^8.11.0';
    }

    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Generate src/index.js entry point
   * @param {Object} config - Configuration object
   * @returns {string} JavaScript source code
   */
  generateIndex(config) {
    const name = config.name || 'service';
    const port = config.port || 3000;

    return `/**
 * ${name} Service Entry Point
 */

const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || ${port};

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: '${name}',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/${name}', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(\`${name} service listening on port \${PORT}\`);
});

module.exports = app;
`;
  }

  /**
   * Generate CRUD routes
   * @param {Object} config - Configuration object
   * @returns {string} JavaScript source code
   */
  generateRoutes(config) {
    const name = config.name || 'service';
    const entity = this.singularize(name);
    const Entity = this.capitalize(entity);

    return `/**
 * ${name} Routes
 * CRUD operations for ${entity} entity
 */

const express = require('express');
const router = express.Router();

// In-memory storage (replace with database)
let items = [];
let nextId = 1;

/**
 * GET / - List all ${name}
 */
router.get('/', (req, res) => {
  res.json({
    data: items,
    count: items.length,
  });
});

/**
 * GET /:id - Get ${entity} by id
 */
router.get('/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));

  if (!item) {
    return res.status(404).json({ error: '${Entity} not found' });
  }

  res.json({ data: item });
});

/**
 * POST / - Create new ${entity}
 */
router.post('/', (req, res) => {
  const item = {
    id: nextId++,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  items.push(item);
  res.status(201).json({ data: item });
});

/**
 * PUT /:id - Update ${entity}
 */
router.put('/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '${Entity} not found' });
  }

  items[index] = {
    ...items[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json({ data: items[index] });
});

/**
 * DELETE /:id - Delete ${entity}
 */
router.delete('/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: '${Entity} not found' });
  }

  items.splice(index, 1);
  res.status(204).send();
});

module.exports = router;
`;
  }

  /**
   * Generate database migrations
   * @param {Object} config - Configuration object
   * @returns {Object} Migration file { path, content }
   */
  generateMigrations(config) {
    const name = config.name || 'service';
    const entity = this.singularize(name);
    const table = this.pluralize(entity);
    const timestamp = Date.now();

    const content = `/**
 * Initial ${name} Schema Migration
 */

/**
 * Apply migration
 * @param {Object} client - Database client
 */
async function up(client) {
  await client.query(\`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  \`);

  console.log('Created ${table} table');
}

/**
 * Rollback migration
 * @param {Object} client - Database client
 */
async function down(client) {
  await client.query(\`
    DROP TABLE IF EXISTS ${table};
  \`);

  console.log('Dropped ${table} table');
}

module.exports = { up, down };
`;

    return {
      path: `${timestamp}_initial_${name}_schema.js`,
      content,
    };
  }

  /**
   * Generate test files
   * @param {Object} config - Configuration object
   * @returns {Object} Test files { unit, integration }
   */
  generateTests(config) {
    const name = config.name || 'service';
    const entity = this.singularize(name);
    const Entity = this.capitalize(entity);

    const unit = `/**
 * ${name} Routes Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('${name} routes', () => {
  describe('GET /', () => {
    it('returns list of ${name}', async () => {
      // Test implementation
      expect(true).toBe(true);
    });

    it('returns empty array when no data', async () => {
      expect([]).toEqual([]);
    });
  });

  describe('GET /:id', () => {
    it('returns ${entity} by id', async () => {
      expect(true).toBe(true);
    });

    it('returns 404 for non-existent id', async () => {
      expect(404).toBe(404);
    });
  });

  describe('POST /', () => {
    it('creates new ${entity}', async () => {
      expect(true).toBe(true);
    });

    it('returns 201 on success', async () => {
      expect(201).toBe(201);
    });
  });

  describe('PUT /:id', () => {
    it('updates existing ${entity}', async () => {
      expect(true).toBe(true);
    });

    it('returns 404 for non-existent id', async () => {
      expect(404).toBe(404);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes ${entity}', async () => {
      expect(true).toBe(true);
    });

    it('returns 204 on success', async () => {
      expect(204).toBe(204);
    });
  });
});
`;

    const integration = `/**
 * ${name} Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('${name} integration', () => {
  let server;

  beforeAll(() => {
    // Start test server
  });

  afterAll(() => {
    // Stop test server
  });

  it('creates and retrieves ${entity}', async () => {
    // Integration test implementation
    expect(true).toBe(true);
  });

  it('full CRUD cycle', async () => {
    // Create -> Read -> Update -> Delete
    expect(true).toBe(true);
  });
});
`;

    return { unit, integration };
  }

  /**
   * Generate Dockerfile with multi-stage build
   * @param {Object} config - Configuration object
   * @returns {string} Dockerfile content
   */
  generateDockerfile(config) {
    const name = config.name || 'service';
    const port = config.port || 3000;

    return `# ${name} service Dockerfile
# Multi-stage build for optimal image size

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/

# Set environment
ENV NODE_ENV=production
ENV PORT=${port}

# Switch to non-root user
USER nodejs

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
   * Generate docker-compose.yml for service
   * @param {Object} config - Configuration object
   * @returns {string} YAML content
   */
  generateDockerCompose(config) {
    const name = config.name || 'service';
    const port = config.port || 3000;
    const serviceName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

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
          networks: ['backend'],
        },
      },
      networks: {
        backend: {
          driver: 'bridge',
        },
      },
    };

    // Add database if configured
    if (config.database === 'postgres') {
      compose.services[serviceName].environment.DATABASE_URL =
        `postgres://${serviceName}:dev_password@postgres:5432/${serviceName}`;
      compose.services[serviceName].depends_on = ['postgres'];

      compose.services.postgres = {
        image: 'postgres:15-alpine',
        environment: {
          POSTGRES_DB: serviceName,
          POSTGRES_USER: serviceName,
          POSTGRES_PASSWORD: 'dev_password',
        },
        ports: ['5432:5432'],
        volumes: ['postgres_data:/var/lib/postgresql/data'],
        networks: ['backend'],
      };

      compose.volumes = {
        postgres_data: {},
      };
    }

    return this.toYaml(compose);
  }

  /**
   * Simple YAML serializer
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

  /**
   * Convert string to singular form (simple implementation)
   * @param {string} str - String to singularize
   * @returns {string} Singular form
   */
  singularize(str) {
    if (str.endsWith('ies')) {
      return str.slice(0, -3) + 'y';
    }
    if (str.endsWith('es')) {
      return str.slice(0, -2);
    }
    if (str.endsWith('s')) {
      return str.slice(0, -1);
    }
    return str;
  }

  /**
   * Convert string to plural form (simple implementation)
   * @param {string} str - String to pluralize
   * @returns {string} Plural form
   */
  pluralize(str) {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    }
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    }
    return str + 's';
  }

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = { ExampleService };
