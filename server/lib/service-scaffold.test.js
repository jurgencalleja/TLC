/**
 * Service Scaffold Generator Tests
 */

import { describe, it, expect } from 'vitest';

describe('ServiceScaffold', () => {
  describe('generate', () => {
    it('creates service directory structure', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'user-service',
        description: 'User management service',
      };

      const result = scaffold.generate(service);

      expect(result.directory).toBe('user-service');
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('generates all required files', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'auth-service',
        endpoints: [{ method: 'POST', path: '/login' }],
      };

      const result = scaffold.generate(service);
      const paths = result.files.map(f => f.path);

      expect(paths).toContain('auth-service/package.json');
      expect(paths).toContain('auth-service/Dockerfile');
      expect(paths).toContain('auth-service/docker-compose.yml');
      expect(paths).toContain('auth-service/client/index.js');
      expect(paths).toContain('auth-service/src/index.js');
      expect(paths).toContain('auth-service/src/health.js');
      expect(paths).toContain('auth-service/README.md');
    });
  });

  describe('generatePackageJson', () => {
    it('has correct deps', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'my-service',
        endpoints: [{ method: 'GET', path: '/users' }],
      };

      const result = scaffold.generate(service);
      const pkgFile = result.files.find(f => f.path.endsWith('package.json'));
      const pkg = JSON.parse(pkgFile.content);

      expect(pkg.name).toBe('my-service');
      expect(pkg.dependencies.express).toBeDefined();
      expect(pkg.devDependencies.vitest).toBeDefined();
    });

    it('adds database dep for models', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'data-service',
        models: ['User', 'Product'],
      };

      const result = scaffold.generate(service);
      const pkgFile = result.files.find(f => f.path.endsWith('package.json'));
      const pkg = JSON.parse(pkgFile.content);

      expect(pkg.dependencies.pg).toBeDefined();
    });

    it('includes service scripts', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = { name: 'test-service' };

      const result = scaffold.generate(service);
      const pkgFile = result.files.find(f => f.path.endsWith('package.json'));
      const pkg = JSON.parse(pkgFile.content);

      expect(pkg.scripts.start).toBeDefined();
      expect(pkg.scripts.dev).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });
  });

  describe('generateDockerfile', () => {
    it('follows best practices', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'docker-service',
        port: 8080,
      };

      const result = scaffold.generate(service);
      const dockerFile = result.files.find(f => f.path.endsWith('Dockerfile'));
      const content = dockerFile.content;

      expect(content).toContain('FROM node:');
      expect(content).toContain('WORKDIR /app');
      expect(content).toContain('COPY package');
      expect(content).toContain('npm ci');
      expect(content).toContain('EXPOSE 8080');
      expect(content).toContain('HEALTHCHECK');
    });

    it('uses alpine image', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = { name: 'alpine-service' };

      const result = scaffold.generate(service);
      const dockerFile = result.files.find(f => f.path.endsWith('Dockerfile'));

      expect(dockerFile.content).toContain('-alpine');
    });
  });

  describe('generateDockerCompose', () => {
    it('has correct config', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'compose-service',
        port: 4000,
      };

      const result = scaffold.generate(service);
      const composeFile = result.files.find(f => f.path.endsWith('docker-compose.yml'));
      const content = composeFile.content;

      expect(content).toContain('version:');
      expect(content).toContain('services:');
      expect(content).toContain('compose-service');
      expect(content).toContain('4000:4000');
    });

    it('adds database when models exist', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'db-service',
        models: ['Order'],
      };

      const result = scaffold.generate(service);
      const composeFile = result.files.find(f => f.path.endsWith('docker-compose.yml'));
      const content = composeFile.content;

      expect(content).toContain('postgres');
      expect(content).toContain('DATABASE_URL');
    });
  });

  describe('generateApiClient', () => {
    it('matches contract', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'api-service',
        endpoints: [
          { method: 'GET', path: '/items', name: 'getItems' },
          { method: 'POST', path: '/items', name: 'createItem' },
        ],
      };

      const result = scaffold.generate(service);
      const clientFile = result.files.find(f => f.path.includes('client/index.js'));
      const content = clientFile.content;

      expect(content).toContain('ApiServiceClient');
      expect(content).toContain('getItems');
      expect(content).toContain('createItem');
    });

    it('generates method for each endpoint', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'user-api',
        endpoints: [
          { method: 'GET', path: '/users' },
          { method: 'GET', path: '/users/:id' },
          { method: 'POST', path: '/users' },
          { method: 'PUT', path: '/users/:id' },
          { method: 'DELETE', path: '/users/:id' },
        ],
      };

      const result = scaffold.generate(service);
      const clientFile = result.files.find(f => f.path.includes('client/index.js'));
      const content = clientFile.content;

      expect(content).toContain("request('GET'");
      expect(content).toContain("request('POST'");
      expect(content).toContain("request('PUT'");
      expect(content).toContain("request('DELETE'");
    });
  });

  describe('generateEntryPoint', () => {
    it('uses express for services with endpoints', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'express-service',
        port: 3000,
        endpoints: [{ method: 'GET', path: '/api' }],
      };

      const result = scaffold.generate(service);
      const indexFile = result.files.find(f => f.path.endsWith('src/index.js'));
      const content = indexFile.content;

      expect(content).toContain("require('express')");
      expect(content).toContain('app.listen');
      expect(content).toContain('/health');
    });

    it('is simple for services without endpoints', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'worker-service',
      };

      const result = scaffold.generate(service);
      const indexFile = result.files.find(f => f.path.endsWith('src/index.js'));
      const content = indexFile.content;

      expect(content).not.toContain("require('express')");
      expect(content).toContain('start()');
    });
  });

  describe('generateHealthCheck', () => {
    it('returns healthy status', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = { name: 'health-service' };

      const result = scaffold.generate(service);
      const healthFile = result.files.find(f => f.path.endsWith('src/health.js'));
      const content = healthFile.content;

      expect(content).toContain("status: 'healthy'");
      expect(content).toContain('health-service');
    });
  });

  describe('generateConfig', () => {
    it('includes port and env', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'config-service',
        port: 5000,
      };

      const result = scaffold.generate(service);
      const configFile = result.files.find(f => f.path.endsWith('src/config.js'));
      const content = configFile.content;

      expect(content).toContain('port:');
      expect(content).toContain('5000');
      expect(content).toContain('NODE_ENV');
    });

    it('includes database URL for services with models', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'db-config-service',
        models: ['Entity'],
      };

      const result = scaffold.generate(service);
      const configFile = result.files.find(f => f.path.endsWith('src/config.js'));
      const content = configFile.content;

      expect(content).toContain('databaseUrl');
      expect(content).toContain('DATABASE_URL');
    });
  });

  describe('generateReadme', () => {
    it('includes quick start instructions', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = { name: 'readme-service' };

      const result = scaffold.generate(service);
      const readmeFile = result.files.find(f => f.path.endsWith('README.md'));
      const content = readmeFile.content;

      expect(content).toContain('# readme-service');
      expect(content).toContain('Quick Start');
      expect(content).toContain('npm install');
      expect(content).toContain('docker-compose');
    });

    it('lists endpoints', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'docs-service',
        endpoints: [
          { method: 'GET', path: '/docs', description: 'Get documentation' },
        ],
      };

      const result = scaffold.generate(service);
      const readmeFile = result.files.find(f => f.path.endsWith('README.md'));
      const content = readmeFile.content;

      expect(content).toContain('Endpoints');
      expect(content).toContain('/docs');
      expect(content).toContain('Get documentation');
    });
  });

  describe('edge cases', () => {
    it('handles service with no name', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {};

      const result = scaffold.generate(service);

      expect(result.directory).toBe('service');
    });

    it('handles empty endpoints array', async () => {
      const { ServiceScaffold } = await import('./service-scaffold.js');
      const scaffold = new ServiceScaffold();

      const service = {
        name: 'empty-endpoints',
        endpoints: [],
      };

      const result = scaffold.generate(service);
      const clientFile = result.files.find(f => f.path.includes('client/index.js'));

      expect(clientFile.content).toContain('EmptyEndpointsClient');
    });
  });
});
