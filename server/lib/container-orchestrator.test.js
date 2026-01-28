import { describe, it, expect } from 'vitest';
import {
  buildComposeCommand,
  getStartCommand,
  getStopCommand,
  getLogsCommand,
  getRebuildCommand,
  getRestartCommand,
  getStatusCommand,
  parseComposeStatus,
  getStackHealth,
  generateDevEnv,
  formatEnvForCompose,
  getHotReloadVolume,
} from './container-orchestrator.js';

describe('container-orchestrator', () => {
  describe('buildComposeCommand', () => {
    it('builds basic docker compose command', () => {
      const cmd = buildComposeCommand('up');

      expect(cmd).toBe('docker compose up');
    });

    it('includes custom file flag', () => {
      const cmd = buildComposeCommand('up', { file: 'docker-compose.dev.yml' });

      expect(cmd).toBe('docker compose -f docker-compose.dev.yml up');
    });

    it('includes project name', () => {
      const cmd = buildComposeCommand('up', { projectName: 'myapp' });

      expect(cmd).toBe('docker compose -p myapp up');
    });

    it('includes services', () => {
      const cmd = buildComposeCommand('up', { services: ['api', 'web'] });

      expect(cmd).toBe('docker compose up api web');
    });

    it('includes flags', () => {
      const cmd = buildComposeCommand('up', { flags: ['-d', '--build'] });

      expect(cmd).toBe('docker compose up -d --build');
    });
  });

  describe('getStartCommand', () => {
    it('generates detached start command by default', () => {
      const cmd = getStartCommand();

      expect(cmd).toBe('docker compose up -d');
    });

    it('includes build flag when requested', () => {
      const cmd = getStartCommand({ build: true });

      expect(cmd).toBe('docker compose up -d --build');
    });

    it('starts specific services', () => {
      const cmd = getStartCommand({ services: ['api'] });

      expect(cmd).toBe('docker compose up -d api');
    });

    it('runs in foreground when detached is false', () => {
      const cmd = getStartCommand({ detached: false });

      expect(cmd).toBe('docker compose up');
    });
  });

  describe('getStopCommand', () => {
    it('generates basic down command', () => {
      const cmd = getStopCommand();

      expect(cmd).toBe('docker compose down');
    });

    it('removes volumes when requested', () => {
      const cmd = getStopCommand({ removeVolumes: true });

      expect(cmd).toBe('docker compose down -v');
    });

    it('removes orphans when requested', () => {
      const cmd = getStopCommand({ removeOrphans: true });

      expect(cmd).toBe('docker compose down --remove-orphans');
    });
  });

  describe('getLogsCommand', () => {
    it('generates basic logs command', () => {
      const cmd = getLogsCommand();

      expect(cmd).toBe('docker compose logs');
    });

    it('follows logs when requested', () => {
      const cmd = getLogsCommand({ follow: true });

      expect(cmd).toBe('docker compose logs -f');
    });

    it('limits tail lines', () => {
      const cmd = getLogsCommand({ tail: 100 });

      expect(cmd).toBe('docker compose logs --tail 100');
    });

    it('includes timestamps', () => {
      const cmd = getLogsCommand({ timestamps: true });

      expect(cmd).toBe('docker compose logs -t');
    });

    it('filters by service', () => {
      const cmd = getLogsCommand({ services: ['api'] });

      expect(cmd).toBe('docker compose logs api');
    });
  });

  describe('getRebuildCommand', () => {
    it('generates build command for service', () => {
      const cmd = getRebuildCommand('api');

      expect(cmd).toBe('docker compose build api');
    });

    it('includes no-cache flag', () => {
      const cmd = getRebuildCommand('api', { noCache: true });

      expect(cmd).toBe('docker compose build --no-cache api');
    });
  });

  describe('getRestartCommand', () => {
    it('generates restart command for service', () => {
      const cmd = getRestartCommand('api');

      expect(cmd).toBe('docker compose restart api');
    });
  });

  describe('getStatusCommand', () => {
    it('generates ps command with JSON format', () => {
      const cmd = getStatusCommand();

      expect(cmd).toBe('docker compose ps --format json');
    });
  });

  describe('parseComposeStatus', () => {
    it('parses JSON lines from docker compose ps', () => {
      const output = `{"Name":"myapp-api-1","Service":"api","State":"running","Status":"Up 5 minutes","Health":"healthy"}
{"Name":"myapp-web-1","Service":"web","State":"running","Status":"Up 5 minutes"}`;

      const result = parseComposeStatus(output);

      expect(result).toHaveLength(2);
      expect(result[0].service).toBe('api');
      expect(result[0].state).toBe('running');
      expect(result[0].health).toBe('healthy');
    });

    it('handles empty output', () => {
      const result = parseComposeStatus('');

      expect(result).toHaveLength(0);
    });

    it('handles invalid JSON', () => {
      const result = parseComposeStatus('not json');

      expect(result).toHaveLength(0);
    });
  });

  describe('getStackHealth', () => {
    it('returns healthy when all containers running', () => {
      const containers = [
        { service: 'api', state: 'running' },
        { service: 'web', state: 'running' },
      ];

      const health = getStackHealth(containers);

      expect(health.status).toBe('healthy');
      expect(health.running).toBe(2);
      expect(health.total).toBe(2);
    });

    it('returns stopped when no containers', () => {
      const health = getStackHealth([]);

      expect(health.status).toBe('stopped');
      expect(health.running).toBe(0);
    });

    it('returns degraded when some unhealthy', () => {
      const containers = [
        { service: 'api', state: 'running' },
        { service: 'db', state: 'exited' },
      ];

      const health = getStackHealth(containers);

      expect(health.status).toBe('degraded');
      expect(health.unhealthy).toBe(1);
    });

    it('returns starting when partially running', () => {
      const containers = [
        { service: 'api', state: 'running' },
        { service: 'db', state: 'created' },
      ];

      const health = getStackHealth(containers);

      expect(health.status).toBe('starting');
    });
  });

  describe('generateDevEnv', () => {
    it('generates default development environment', () => {
      const env = generateDevEnv();

      expect(env.NODE_ENV).toBe('development');
      expect(env.DATABASE_HOST).toBe('postgres');
      expect(env.REDIS_HOST).toBe('redis');
    });

    it('accepts custom values', () => {
      const env = generateDevEnv({
        nodeEnv: 'test',
        dbHost: 'db',
        extraEnv: { API_KEY: 'secret' },
      });

      expect(env.NODE_ENV).toBe('test');
      expect(env.DATABASE_HOST).toBe('db');
      expect(env.API_KEY).toBe('secret');
    });
  });

  describe('formatEnvForCompose', () => {
    it('formats environment variables for YAML', () => {
      const env = { NODE_ENV: 'development', PORT: '3000' };

      const formatted = formatEnvForCompose(env);

      expect(formatted).toContain('- NODE_ENV=development');
      expect(formatted).toContain('- PORT=3000');
    });
  });

  describe('getHotReloadVolume', () => {
    it('generates volume mount configuration', () => {
      const volume = getHotReloadVolume('./src');

      expect(volume.mount).toBe('./src:/app');
      expect(volume.exclude).toContain('/app/node_modules');
    });

    it('uses custom container path', () => {
      const volume = getHotReloadVolume('./api', '/workspace');

      expect(volume.mount).toBe('./api:/workspace');
      expect(volume.exclude).toContain('/workspace/node_modules');
    });
  });
});
