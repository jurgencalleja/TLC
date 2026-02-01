/**
 * New Project Microservice Command Tests
 * Integration orchestrator for /tlc:new-project --architecture microservice
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('NewProjectMicroservice', () => {
  // Mock dependencies
  const createMockDependencies = () => ({
    microserviceTemplate: {
      generateStructure: vi.fn().mockReturnValue({
        directories: ['project', 'project/services'],
        files: ['project/package.json', 'project/docker-compose.yml'],
      }),
      generateRootPackageJson: vi.fn().mockReturnValue('{"name": "project"}'),
      generateDockerCompose: vi.fn().mockReturnValue('version: 3.8'),
      generateEnvExample: vi.fn().mockReturnValue('NODE_ENV=development'),
      generateReadme: vi.fn().mockReturnValue('# Project'),
    },
    traefikConfig: {
      generateTraefikYml: vi.fn().mockReturnValue('entryPoints:'),
      generateDynamicConfig: vi.fn().mockReturnValue('http:'),
    },
    sharedKernel: {
      generate: vi.fn().mockReturnValue({
        directories: ['shared', 'shared/types'],
        files: [{ path: 'shared/index.ts', content: 'export {}' }],
      }),
    },
    messagingPatterns: {
      generate: vi.fn().mockReturnValue({
        files: [{ path: 'messaging/index.js', content: 'module.exports = {}' }],
      }),
    },
    contractTesting: {
      generate: vi.fn().mockReturnValue({
        files: [{ name: 'pact.config.js', content: 'module.exports = {}' }],
      }),
    },
    exampleService: {
      generate: vi.fn().mockReturnValue({
        directories: ['user', 'user/src'],
        files: [{ path: 'user/package.json', content: '{}' }],
      }),
    },
  });

  describe('constructor', () => {
    it('accepts dependency injection', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();

      const cmd = new NewProjectMicroservice(deps);

      expect(cmd).toBeDefined();
    });
  });

  describe('parseArgs', () => {
    it('extracts --architecture flag', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--architecture', 'microservice']);

      expect(result.architecture).toBe('microservice');
    });

    it('extracts --services as array', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--services', 'user,order,notification']);

      expect(result.services).toEqual(['user', 'order', 'notification']);
    });

    it('extracts --database', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--database', 'postgres']);

      expect(result.database).toBe('postgres');
    });

    it('extracts --events as array', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--events', 'UserCreated,OrderPlaced']);

      expect(result.events).toEqual(['UserCreated', 'OrderPlaced']);
    });

    it('extracts --gateway', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--gateway', 'nginx']);

      expect(result.gateway).toBe('nginx');
    });

    it('extracts --contracts', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--contracts', 'pactflow']);

      expect(result.contracts).toBe('pactflow');
    });

    it('handles missing optional args with defaults', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs([]);

      expect(result.services).toEqual([]);
      expect(result.events).toEqual([]);
      expect(result.database).toBe('postgres');
      expect(result.gateway).toBe('traefik');
      expect(result.contracts).toBe('local');
    });

    it('default gateway is traefik', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--services', 'api']);

      expect(result.gateway).toBe('traefik');
    });

    it('default contracts is local', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['--services', 'api']);

      expect(result.contracts).toBe('local');
    });

    it('extracts project name', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const cmd = new NewProjectMicroservice(createMockDependencies());

      const result = cmd.parseArgs(['my-platform', '--architecture', 'microservice']);

      expect(result.projectName).toBe('my-platform');
    });
  });

  describe('generate', () => {
    it('calls MicroserviceTemplate', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user', 'order'],
        database: 'postgres',
        events: [],
      };

      cmd.generate(config);

      expect(deps.microserviceTemplate.generateStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: 'my-project',
          services: ['user', 'order'],
        })
      );
    });

    it('calls TraefikConfig', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user'],
        database: 'postgres',
        events: [],
        gateway: 'traefik',
      };

      cmd.generate(config);

      expect(deps.traefikConfig.generateDynamicConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['user'],
        })
      );
    });

    it('calls SharedKernel', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user'],
        database: 'postgres',
        events: ['UserCreated'],
      };

      cmd.generate(config);

      expect(deps.sharedKernel.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['user'],
          events: ['UserCreated'],
        })
      );
    });

    it('calls MessagingPatterns', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user'],
        database: 'postgres',
        events: ['UserCreated', 'OrderPlaced'],
      };

      cmd.generate(config);

      expect(deps.messagingPatterns.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          events: ['UserCreated', 'OrderPlaced'],
        })
      );
    });

    it('calls ContractTesting', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user', 'order'],
        database: 'postgres',
        events: [],
        contracts: 'local',
      };

      cmd.generate(config);

      expect(deps.contractTesting.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['user', 'order'],
          broker: 'local',
        })
      );
    });

    it('calls ExampleService for each service', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'my-project',
        services: ['user', 'order', 'notification'],
        database: 'postgres',
        events: [],
      };

      cmd.generate(config);

      expect(deps.exampleService.generate).toHaveBeenCalledTimes(3);
      expect(deps.exampleService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'user' })
      );
      expect(deps.exampleService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'order' })
      );
      expect(deps.exampleService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'notification' })
      );
    });

    it('combines all directories', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'combined',
        services: ['api'],
        database: 'postgres',
        events: [],
      };

      const result = cmd.generate(config);

      expect(result.directories).toBeDefined();
      expect(Array.isArray(result.directories)).toBe(true);
      // Should include directories from multiple generators
      expect(result.directories.length).toBeGreaterThan(0);
    });

    it('combines all files', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'combined',
        services: ['api'],
        database: 'postgres',
        events: [],
      };

      const result = cmd.generate(config);

      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('handles single service', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'single',
        services: ['api'],
        database: 'postgres',
        events: [],
      };

      const result = cmd.generate(config);

      expect(deps.exampleService.generate).toHaveBeenCalledTimes(1);
      expect(result.directories).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('handles no events', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'no-events',
        services: ['user'],
        database: 'postgres',
        events: [],
      };

      const result = cmd.generate(config);

      expect(deps.messagingPatterns.generate).toHaveBeenCalledWith(
        expect.objectContaining({ events: [] })
      );
      expect(result).toBeDefined();
    });

    it('handles no database', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = {
        projectName: 'no-db',
        services: ['user'],
        database: 'none',
        events: [],
      };

      const result = cmd.generate(config);

      expect(deps.exampleService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ database: 'none' })
      );
      expect(result).toBeDefined();
    });
  });

  describe('interactivePrompts', () => {
    it('returns config object', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
    });

    it('includes project name prompt', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      const projectPrompt = prompts.find(p => p.name === 'projectName');
      expect(projectPrompt).toBeDefined();
    });

    it('includes services prompt', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      const servicesPrompt = prompts.find(p => p.name === 'services');
      expect(servicesPrompt).toBeDefined();
    });

    it('includes database prompt', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      const dbPrompt = prompts.find(p => p.name === 'database');
      expect(dbPrompt).toBeDefined();
    });

    it('includes events prompt', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      const eventsPrompt = prompts.find(p => p.name === 'events');
      expect(eventsPrompt).toBeDefined();
    });

    it('includes gateway prompt', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const prompts = cmd.interactivePrompts();

      const gatewayPrompt = prompts.find(p => p.name === 'gateway');
      expect(gatewayPrompt).toBeDefined();
    });
  });

  describe('generateNextSteps', () => {
    it('includes cd command', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = { projectName: 'my-app', services: ['api'] };
      const result = cmd.generateNextSteps(config);

      expect(result).toContain('cd my-app');
    });

    it('includes npm install', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = { projectName: 'my-app', services: ['api'] };
      const result = cmd.generateNextSteps(config);

      expect(result).toContain('npm install');
    });

    it('includes docker-compose up', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = { projectName: 'my-app', services: ['api'] };
      const result = cmd.generateNextSteps(config);

      expect(result).toContain('docker-compose up');
    });

    it('includes service URLs', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const config = { projectName: 'my-app', services: ['user', 'order'] };
      const result = cmd.generateNextSteps(config);

      expect(result).toContain('http://localhost');
      expect(result).toMatch(/user/i);
      expect(result).toMatch(/order/i);
    });
  });

  describe('createProjectFiles', () => {
    it('returns success on valid input', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const result = {
        directories: ['test-project'],
        files: [{ path: 'test-project/package.json', content: '{}' }],
      };

      // Mock fs operations
      const mockFs = {
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      };
      cmd.setFs(mockFs);

      const status = cmd.createProjectFiles('/tmp/output', result);

      expect(status.success).toBe(true);
    });

    it('creates directories', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const result = {
        directories: ['test-project', 'test-project/src'],
        files: [],
      };

      const mockFs = {
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      };
      cmd.setFs(mockFs);

      cmd.createProjectFiles('/tmp/output', result);

      expect(mockFs.mkdirSync).toHaveBeenCalledTimes(2);
    });

    it('writes all files', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const result = {
        directories: [],
        files: [
          { path: 'test-project/package.json', content: '{}' },
          { path: 'test-project/README.md', content: '# Test' },
        ],
      };

      const mockFs = {
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
      };
      cmd.setFs(mockFs);

      cmd.createProjectFiles('/tmp/output', result);

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('returns failure on error', async () => {
      const { NewProjectMicroservice } = await import('./new-project-microservice.js');
      const deps = createMockDependencies();
      const cmd = new NewProjectMicroservice(deps);

      const result = {
        directories: ['test-project'],
        files: [],
      };

      const mockFs = {
        mkdirSync: vi.fn().mockImplementation(() => {
          throw new Error('Permission denied');
        }),
        writeFileSync: vi.fn(),
      };
      cmd.setFs(mockFs);

      const status = cmd.createProjectFiles('/tmp/output', result);

      expect(status.success).toBe(false);
      expect(status.error).toBeDefined();
    });
  });
});
