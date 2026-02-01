/**
 * Example Service Template Tests
 */

import { describe, it, expect } from 'vitest';

describe('ExampleService', () => {
  describe('generate', () => {
    it('generates service directory structure', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = {
        name: 'user',
        port: 3001,
        database: 'postgres',
      };

      const result = service.generate(config);

      expect(result.directories).toContain('user');
      expect(result.directories).toContain('user/src');
      expect(result.directories).toContain('user/src/routes');
      expect(result.directories).toContain('user/migrations');
      expect(result.directories).toContain('user/tests');
    });

    it('generates all required files', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = {
        name: 'order',
        port: 3002,
        database: 'postgres',
      };

      const result = service.generate(config);
      const filePaths = result.files.map(f => f.path);

      expect(filePaths).toContain('order/package.json');
      expect(filePaths).toContain('order/src/index.js');
      expect(filePaths).toContain('order/src/routes/index.js');
      expect(filePaths).toContain('order/Dockerfile');
      expect(filePaths).toContain('order/docker-compose.yml');
    });
  });

  describe('generatePackageJson', () => {
    it('has correct name from config', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'inventory', port: 3003 };

      const result = service.generatePackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.name).toBe('inventory');
    });

    it('includes express dependency', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'catalog', port: 3004 };

      const result = service.generatePackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.dependencies.express).toBeDefined();
    });

    it('includes pg when database is postgres', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'billing', port: 3005, database: 'postgres' };

      const result = service.generatePackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.dependencies.pg).toBeDefined();
    });

    it('does not include pg when no database specified', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'simple', port: 3006 };

      const result = service.generatePackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.dependencies.pg).toBeUndefined();
    });

    it('includes required scripts', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'worker', port: 3007 };

      const result = service.generatePackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.scripts.start).toBeDefined();
      expect(pkg.scripts.dev).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.migrate).toBeDefined();
    });
  });

  describe('generateIndex', () => {
    it('creates express app', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'api', port: 3008 };

      const result = service.generateIndex(config);

      expect(result).toContain("require('express')");
      expect(result).toContain('express()');
    });

    it('has health endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'health-check', port: 3009 };

      const result = service.generateIndex(config);

      expect(result).toContain('/health');
      expect(result).toContain('healthy');
    });

    it('imports routes', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'router', port: 3010 };

      const result = service.generateIndex(config);

      expect(result).toContain("require('./routes')");
    });

    it('has error middleware', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'errors', port: 3011 };

      const result = service.generateIndex(config);

      expect(result).toContain('err');
      expect(result).toContain('500');
    });
  });

  describe('generateRoutes', () => {
    it('includes GET list endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'items', port: 3012 };

      const result = service.generateRoutes(config);

      expect(result).toContain("router.get('/'");
    });

    it('includes GET by id endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'products', port: 3013 };

      const result = service.generateRoutes(config);

      expect(result).toContain("router.get('/:id'");
    });

    it('includes POST create endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'users', port: 3014 };

      const result = service.generateRoutes(config);

      expect(result).toContain("router.post('/'");
    });

    it('includes PUT update endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'accounts', port: 3015 };

      const result = service.generateRoutes(config);

      expect(result).toContain("router.put('/:id'");
    });

    it('includes DELETE endpoint', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'tasks', port: 3016 };

      const result = service.generateRoutes(config);

      expect(result).toContain("router.delete('/:id'");
    });
  });

  describe('generateMigrations', () => {
    it('has up function', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'migrate', port: 3017, database: 'postgres' };

      const result = service.generateMigrations(config);

      expect(result.content).toContain('async function up');
    });

    it('has down function', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'rollback', port: 3018, database: 'postgres' };

      const result = service.generateMigrations(config);

      expect(result.content).toContain('async function down');
    });

    it('has timestamp naming', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'schema', port: 3019, database: 'postgres' };

      const result = service.generateMigrations(config);

      // Should have timestamp format like 001_initial_schema.js or YYYYMMDD format
      expect(result.path).toMatch(/\d+.*\.js$/);
    });
  });

  describe('generateTests', () => {
    it('covers CRUD operations', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'crud', port: 3020 };

      const result = service.generateTests(config);

      expect(result.unit).toContain('GET');
      expect(result.unit).toContain('POST');
      expect(result.unit).toContain('PUT');
      expect(result.unit).toContain('DELETE');
    });

    it('has integration test examples', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'integration', port: 3021 };

      const result = service.generateTests(config);

      expect(result.integration).toContain('describe');
      expect(result.integration).toContain('it(');
    });
  });

  describe('generateDockerfile', () => {
    it('has multi-stage build', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'docker', port: 3022 };

      const result = service.generateDockerfile(config);

      expect(result).toContain('FROM');
      expect(result).toContain('AS');
    });

    it('has health check', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'healthcheck', port: 3023 };

      const result = service.generateDockerfile(config);

      expect(result).toContain('HEALTHCHECK');
    });

    it('has non-root user', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'secure', port: 3024 };

      const result = service.generateDockerfile(config);

      expect(result).toContain('USER');
    });
  });

  describe('generateDockerCompose', () => {
    it('includes service container', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'compose', port: 3025 };

      const result = service.generateDockerCompose(config);

      expect(result).toContain('compose');
      expect(result).toContain('services:');
    });

    it('includes database when configured', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'db-compose', port: 3026, database: 'postgres' };

      const result = service.generateDockerCompose(config);

      expect(result).toContain('postgres');
    });

    it('has network configuration', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'network', port: 3027 };

      const result = service.generateDockerCompose(config);

      expect(result).toContain('networks:');
    });
  });

  describe('edge cases', () => {
    it('handles service without database', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'no-db', port: 3028 };

      const result = service.generate(config);

      // Should still generate basic structure
      expect(result.directories).toContain('no-db');
      expect(result.files.length).toBeGreaterThan(0);

      // Docker compose should NOT have postgres
      const composeFile = result.files.find(f => f.path.endsWith('docker-compose.yml'));
      expect(composeFile.content).not.toContain('postgres');
    });

    it('service starts without errors (structure check)', async () => {
      const { ExampleService } = await import('./example-service.js');
      const service = new ExampleService();

      const config = { name: 'valid', port: 3029, database: 'postgres' };

      const result = service.generate(config);

      // Verify complete structure
      expect(result.directories).toBeDefined();
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.directories)).toBe(true);
      expect(Array.isArray(result.files)).toBe(true);

      // Each file should have path and content
      for (const file of result.files) {
        expect(file.path).toBeDefined();
        expect(file.content).toBeDefined();
        expect(typeof file.path).toBe('string');
        expect(typeof file.content).toBe('string');
      }
    });
  });
});
