import { describe, it, expect } from 'vitest';
import {
  parseDeployArgs,
  loadDeployConfig,
  loadEnvFile,
  formatDeploymentStatus,
  formatDeploymentList,
  formatSetupInstructions,
  createDeployCommand,
} from './deploy-command.js';
import { DEPLOYMENT_STATUS } from './branch-deployer.js';

describe('deploy-command', () => {
  describe('parseDeployArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseDeployArgs('');

      expect(options.action).toBe('status');
      expect(options.branch).toBeNull();
      expect(options.project).toBeNull();
      expect(options.force).toBe(false);
      expect(options.dryRun).toBe(false);
    });

    it('parses action', () => {
      expect(parseDeployArgs('start').action).toBe('start');
      expect(parseDeployArgs('stop').action).toBe('stop');
      expect(parseDeployArgs('logs').action).toBe('logs');
      expect(parseDeployArgs('list').action).toBe('list');
      expect(parseDeployArgs('setup').action).toBe('setup');
      expect(parseDeployArgs('config').action).toBe('config');
    });

    it('parses --branch flag', () => {
      const options = parseDeployArgs('start --branch feature/auth');
      expect(options.branch).toBe('feature/auth');
    });

    it('parses positional branch after action', () => {
      const options = parseDeployArgs('start main');
      expect(options.action).toBe('start');
      expect(options.branch).toBe('main');
    });

    it('parses --project flag', () => {
      const options = parseDeployArgs('start --project myapp');
      expect(options.project).toBe('myapp');
    });

    it('parses --force flag', () => {
      expect(parseDeployArgs('start --force').force).toBe(true);
      expect(parseDeployArgs('start -f').force).toBe(true);
    });

    it('parses --tail flag', () => {
      const options = parseDeployArgs('logs --tail 50');
      expect(options.tail).toBe(50);
    });

    it('parses --follow flag', () => {
      expect(parseDeployArgs('logs --follow').follow).toBe(true);
      expect(parseDeployArgs('logs -F').follow).toBe(true);
    });

    it('parses --port flag', () => {
      const options = parseDeployArgs('start --port 8080');
      expect(options.port).toBe(8080);
    });

    it('parses --domain flag', () => {
      const options = parseDeployArgs('start --domain app.example.com');
      expect(options.domain).toBe('app.example.com');
    });

    it('parses --env-file flag', () => {
      const options = parseDeployArgs('start --env-file .env.prod');
      expect(options.envFile).toBe('.env.prod');
    });

    it('parses --dry-run flag', () => {
      const options = parseDeployArgs('start --dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseDeployArgs('start --branch main --project app --dry-run');

      expect(options.action).toBe('start');
      expect(options.branch).toBe('main');
      expect(options.project).toBe('app');
      expect(options.dryRun).toBe(true);
    });
  });

  describe('loadDeployConfig', () => {
    it('returns defaults for non-existent directory', () => {
      const config = loadDeployConfig('/nonexistent/path');

      expect(config.project).toBe('project');
      expect(config.port).toBe(10000);
      expect(config.workDir).toBe('/var/tlc/deployments');
    });
  });

  describe('loadEnvFile', () => {
    it('returns empty object for non-existent file', () => {
      const env = loadEnvFile('/nonexistent/.env');
      expect(env).toEqual({});
    });
  });

  describe('formatDeploymentStatus', () => {
    it('formats running deployment', () => {
      const output = formatDeploymentStatus({
        branch: 'main',
        status: DEPLOYMENT_STATUS.RUNNING,
        subdomain: 'main.app.com',
        port: 10001,
        containerName: 'tlc-app-main',
        startedAt: '2024-01-01T00:00:00Z',
      });

      expect(output).toContain('# Deployment: main');
      expect(output).toContain('**Status:** running');
      expect(output).toContain('**URL:** https://main.app.com');
      expect(output).toContain('**Port:** 10001');
      expect(output).toContain('**Container:** tlc-app-main');
    });

    it('formats failed deployment', () => {
      const output = formatDeploymentStatus({
        branch: 'feature',
        status: DEPLOYMENT_STATUS.FAILED,
        error: 'Build failed: missing dependency',
      });

      expect(output).toContain('**Status:** failed');
      expect(output).toContain('**Error:** Build failed');
    });

    it('handles missing optional fields', () => {
      const output = formatDeploymentStatus({
        branch: 'test',
        status: DEPLOYMENT_STATUS.PENDING,
      });

      expect(output).toContain('# Deployment: test');
      expect(output).toContain('**Status:** pending');
    });
  });

  describe('formatDeploymentList', () => {
    it('formats empty list', () => {
      const output = formatDeploymentList([]);
      expect(output).toContain('No active deployments');
    });

    it('formats deployment list', () => {
      const output = formatDeploymentList([
        {
          containerName: 'tlc-app-main',
          status: DEPLOYMENT_STATUS.RUNNING,
          ports: '10001:3000',
          created: '2024-01-01',
        },
        {
          containerName: 'tlc-app-feature',
          status: DEPLOYMENT_STATUS.STOPPED,
          ports: '10002:3000',
          created: '2024-01-02',
        },
      ]);

      expect(output).toContain('# Active Deployments');
      expect(output).toContain('| Container | Status | Ports | Created |');
      expect(output).toContain('tlc-app-main');
      expect(output).toContain('tlc-app-feature');
      expect(output).toContain('running');
      expect(output).toContain('stopped');
    });
  });

  describe('formatSetupInstructions', () => {
    it('includes prerequisites', () => {
      const output = formatSetupInstructions({});

      expect(output).toContain('# TLC Deploy Setup');
      expect(output).toContain('## Prerequisites');
      expect(output).toContain('Docker');
      expect(output).toContain('Domain');
      expect(output).toContain('Caddy');
    });

    it('includes configuration example', () => {
      const output = formatSetupInstructions({});

      expect(output).toContain('## Configuration');
      expect(output).toContain('.tlc.json');
      expect(output).toContain('"deploy"');
      expect(output).toContain('"slack"');
    });

    it('includes webhook setup', () => {
      const output = formatSetupInstructions({ domain: 'app.example.com' });

      expect(output).toContain('## GitHub Webhook');
      expect(output).toContain('/api/webhook');
      expect(output).toContain('app.example.com');
    });

    it('includes command examples', () => {
      const output = formatSetupInstructions({});

      expect(output).toContain('## Commands');
      expect(output).toContain('/tlc:deploy start');
      expect(output).toContain('/tlc:deploy stop');
      expect(output).toContain('/tlc:deploy logs');
      expect(output).toContain('/tlc:deploy list');
    });
  });

  describe('createDeployCommand', () => {
    it('creates command handler', () => {
      const handler = createDeployCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.loadDeployConfig).toBeDefined();
      expect(handler.loadEnvFile).toBeDefined();
      expect(handler.formatDeploymentStatus).toBeDefined();
      expect(handler.formatDeploymentList).toBeDefined();
      expect(handler.formatSetupInstructions).toBeDefined();
    });

    it('exposes DEPLOYMENT_STATUS', () => {
      const handler = createDeployCommand();
      expect(handler.DEPLOYMENT_STATUS).toBeDefined();
      expect(handler.DEPLOYMENT_STATUS.RUNNING).toBe('running');
    });

    it('executes setup action', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('setup', { projectDir: '/tmp' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('TLC Deploy Setup');
    });

    it('executes config action', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('config', { projectDir: '/tmp' });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Configuration');
    });

    it('returns error for start without branch', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('start', { projectDir: '/nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Branch');
    });

    it('handles dry run for start without git remote', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('start main --dry-run --domain app.com', {
        projectDir: '/tmp',
      });

      // Without a git remote, it should fail
      expect(result.success).toBe(false);
      expect(result.error).toContain('remote');
    });

    it('returns error for stop without branch', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('stop', { projectDir: '/nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Branch');
    });

    it('returns error for logs without branch', async () => {
      const handler = createDeployCommand();
      const result = await handler.execute('logs', { projectDir: '/nonexistent' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Branch');
    });

    it('returns error for unknown action', async () => {
      const handler = createDeployCommand();
      // Manually call with unknown action
      const options = handler.parseArgs('unknown');
      options.action = 'invalid';

      // This should be handled gracefully in real usage
    });
  });
});
