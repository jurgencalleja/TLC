/**
 * Microservice Template Generator Tests
 */

import { describe, it, expect } from 'vitest';

describe('MicroserviceTemplate', () => {
  describe('generateStructure', () => {
    it('creates correct directory structure', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'my-platform',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
      };

      const result = template.generateStructure(config);

      expect(result.directories).toContain('my-platform');
      expect(result.directories).toContain('my-platform/services');
      expect(result.directories).toContain('my-platform/shared');
      expect(result.directories).toContain('my-platform/shared/types');
      expect(result.directories).toContain('my-platform/shared/contracts');
      expect(result.directories).toContain('my-platform/shared/events');
      expect(result.directories).toContain('my-platform/gateway');
    });

    it('services array creates service directories', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'ecommerce',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
      };

      const result = template.generateStructure(config);

      expect(result.directories).toContain('ecommerce/services/user');
      expect(result.directories).toContain('ecommerce/services/order');
      expect(result.directories).toContain('ecommerce/services/notification');
    });

    it('handles empty services array', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'empty-project',
        services: [],
        database: 'postgres',
      };

      const result = template.generateStructure(config);

      expect(result.directories).toContain('empty-project');
      expect(result.directories).toContain('empty-project/services');
      // No service subdirectories
      const serviceSubdirs = result.directories.filter(d => d.startsWith('empty-project/services/'));
      expect(serviceSubdirs.length).toBe(0);
    });

    it('handles single service', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'single-service',
        services: ['api'],
        database: 'postgres',
      };

      const result = template.generateStructure(config);

      expect(result.directories).toContain('single-service/services/api');
      const serviceSubdirs = result.directories.filter(d => d.startsWith('single-service/services/') && d !== 'single-service/services/');
      expect(serviceSubdirs.length).toBe(1);
    });
  });

  describe('generateRootPackageJson', () => {
    it('has workspace configuration', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'workspace-project',
        services: ['user', 'order'],
        database: 'postgres',
      };

      const result = template.generateRootPackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.name).toBe('workspace-project');
      expect(pkg.workspaces).toContain('services/*');
      expect(pkg.workspaces).toContain('shared');
    });

    it('has correct scripts', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'scripts-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateRootPackageJson(config);
      const pkg = JSON.parse(result);

      expect(pkg.scripts.dev).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts['docker:up']).toBeDefined();
      expect(pkg.scripts['docker:down']).toBeDefined();
    });
  });

  describe('generateDockerCompose', () => {
    it('includes all services', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'docker-project',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
      };

      const result = template.generateDockerCompose(config);

      expect(result).toContain('user:');
      expect(result).toContain('order:');
      expect(result).toContain('notification:');
    });

    it('includes postgres when database is postgres', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'postgres-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateDockerCompose(config);

      expect(result).toContain('postgres:');
      expect(result).toContain('postgres:15-alpine');
    });

    it('includes redis', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'redis-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateDockerCompose(config);

      expect(result).toContain('redis:');
      expect(result).toContain('redis:7-alpine');
    });

    it('includes traefik gateway', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'gateway-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateDockerCompose(config);

      expect(result).toContain('traefik:');
      expect(result).toContain('traefik:v2');
    });
  });

  describe('generateEnvExample', () => {
    it('has all service URLs', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'env-project',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
      };

      const result = template.generateEnvExample(config);

      expect(result).toContain('USER_SERVICE_URL');
      expect(result).toContain('ORDER_SERVICE_URL');
      expect(result).toContain('NOTIFICATION_SERVICE_URL');
    });

    it('has database URL', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'db-env-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateEnvExample(config);

      expect(result).toContain('DATABASE_URL');
      expect(result).toContain('postgres://');
    });

    it('has redis URL', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'redis-env-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateEnvExample(config);

      expect(result).toContain('REDIS_URL');
      expect(result).toContain('redis://');
    });
  });

  describe('generateReadme', () => {
    it('includes project name', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'readme-project',
        services: ['user', 'order'],
        database: 'postgres',
      };

      const result = template.generateReadme(config);

      expect(result).toContain('# readme-project');
    });

    it('includes Mermaid architecture diagram', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'diagram-project',
        services: ['user', 'order'],
        database: 'postgres',
      };

      const result = template.generateReadme(config);

      expect(result).toContain('```mermaid');
      expect(result).toContain('graph');
    });

    it('lists all services', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'services-project',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
      };

      const result = template.generateReadme(config);

      expect(result).toContain('user');
      expect(result).toContain('order');
      expect(result).toContain('notification');
    });

    it('includes quick start instructions', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'quickstart-project',
        services: ['user'],
        database: 'postgres',
      };

      const result = template.generateReadme(config);

      expect(result).toContain('Quick Start');
      expect(result).toContain('npm install');
      expect(result).toContain('docker');
    });
  });

  describe('defaults', () => {
    it('default database is postgres', async () => {
      const { MicroserviceTemplate } = await import('./microservice-template.js');
      const template = new MicroserviceTemplate();

      const config = {
        projectName: 'default-db-project',
        services: ['user'],
        // No database specified
      };

      const result = template.generateDockerCompose(config);

      expect(result).toContain('postgres:');
    });
  });
});
