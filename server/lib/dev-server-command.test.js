import { describe, it, expect } from 'vitest';
import {
  analyzeProject,
  detectInfrastructure,
  generateDockerFiles,
  formatAnalysis,
  formatStackStatus,
  createServerState,
  getStartSequence,
  getDashboardUrl,
} from './dev-server-command.js';

describe('dev-server-command', () => {
  describe('analyzeProject', () => {
    it('detects services from package.json', () => {
      const files = {
        'package.json': JSON.stringify({
          name: 'my-app',
          dependencies: { express: '4.18.0' },
        }),
      };

      const analysis = analyzeProject(files);

      expect(analysis.services).toHaveLength(1);
      expect(analysis.services[0].type).toBe('express');
    });

    it('detects existing docker-compose', () => {
      const files = {
        'docker-compose.yml': 'services:\n  api:\n    build: .',
        'package.json': JSON.stringify({ name: 'api' }),
      };

      const analysis = analyzeProject(files);

      expect(analysis.hasDockerCompose).toBe(true);
    });

    it('identifies files needing generation', () => {
      const files = {
        'package.json': JSON.stringify({ name: 'app' }),
      };

      const analysis = analyzeProject(files);

      expect(analysis.needsGeneration).toContain('docker-compose.yml');
    });

    it('detects monorepo services', () => {
      const files = {
        'services/api/package.json': JSON.stringify({ name: 'api' }),
        'services/web/package.json': JSON.stringify({ name: 'web', dependencies: { vite: '5.0.0' } }),
      };

      const analysis = analyzeProject(files);

      expect(analysis.services.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('detectInfrastructure', () => {
    it('detects postgres requirement', () => {
      const files = {
        '.env': 'DATABASE_URL=postgres://localhost:5432/db',
      };

      const infra = detectInfrastructure(files);

      expect(infra).toContain('postgres');
    });

    it('detects redis requirement', () => {
      const files = {
        'src/cache.js': 'import redis from "redis"',
      };

      const infra = detectInfrastructure(files);

      expect(infra).toContain('redis');
    });

    it('detects minio/S3 requirement', () => {
      const files = {
        'src/storage.js': 'const S3_BUCKET = process.env.S3_BUCKET',
      };

      const infra = detectInfrastructure(files);

      expect(infra).toContain('minio');
    });

    it('returns empty array when no infra detected', () => {
      const files = {
        'index.js': 'console.log("hello")',
      };

      const infra = detectInfrastructure(files);

      expect(infra).toHaveLength(0);
    });
  });

  describe('generateDockerFiles', () => {
    it('generates docker-compose when needed', () => {
      const analysis = {
        services: [{ name: 'app', type: 'express', port: 3000 }],
        needsGeneration: ['docker-compose.yml'],
        infrastructure: [],
      };

      const files = generateDockerFiles(analysis);

      expect(files['docker-compose.yml']).toBeDefined();
      expect(files['docker-compose.yml']).toContain('services:');
    });

    it('generates Dockerfile when needed', () => {
      const analysis = {
        services: [{ name: 'api', type: 'express', port: 3000, path: '.' }],
        needsGeneration: ['./Dockerfile'],
        infrastructure: [],
      };

      const files = generateDockerFiles(analysis);

      expect(files['./Dockerfile']).toBeDefined();
      expect(files['./Dockerfile']).toContain('FROM node:');
    });

    it('skips files not in needsGeneration', () => {
      const analysis = {
        services: [{ name: 'app', type: 'nodejs', port: 3000 }],
        needsGeneration: [],
        infrastructure: [],
      };

      const files = generateDockerFiles(analysis);

      expect(Object.keys(files)).toHaveLength(0);
    });
  });

  describe('formatAnalysis', () => {
    it('formats services table', () => {
      const analysis = {
        services: [
          { name: 'api', type: 'express', port: 3000, path: './api' },
          { name: 'web', type: 'vite', port: 5173, path: './web' },
        ],
        infrastructure: [],
        needsGeneration: [],
      };

      const output = formatAnalysis(analysis);

      expect(output).toContain('| api | express | 3000 | ./api |');
      expect(output).toContain('| web | vite | 5173 | ./web |');
    });

    it('shows infrastructure when detected', () => {
      const analysis = {
        services: [],
        infrastructure: ['postgres', 'redis'],
        needsGeneration: [],
      };

      const output = formatAnalysis(analysis);

      expect(output).toContain('## Infrastructure');
      expect(output).toContain('postgres, redis');
    });

    it('lists files to generate', () => {
      const analysis = {
        services: [],
        infrastructure: [],
        needsGeneration: ['docker-compose.yml', './Dockerfile'],
      };

      const output = formatAnalysis(analysis);

      expect(output).toContain('## Files to Generate');
      expect(output).toContain('- docker-compose.yml');
    });
  });

  describe('formatStackStatus', () => {
    it('shows healthy status with icon', () => {
      const health = {
        status: 'healthy',
        running: 2,
        total: 2,
        containers: [
          { name: 'api', state: 'running' },
          { name: 'web', state: 'running' },
        ],
      };

      const output = formatStackStatus(health);

      expect(output).toContain('✅');
      expect(output).toContain('healthy');
      expect(output).toContain('2/2');
    });

    it('shows degraded status', () => {
      const health = {
        status: 'degraded',
        running: 1,
        total: 2,
        unhealthy: 1,
        containers: [
          { name: 'api', state: 'running' },
          { name: 'db', state: 'exited' },
        ],
      };

      const output = formatStackStatus(health);

      expect(output).toContain('⚠️');
      expect(output).toContain('degraded');
    });

    it('shows container list with states', () => {
      const health = {
        status: 'healthy',
        running: 1,
        total: 1,
        containers: [{ name: 'api', state: 'running', health: 'healthy' }],
      };

      const output = formatStackStatus(health);

      expect(output).toContain('| api |');
      expect(output).toContain('🟢 running');
    });
  });

  describe('createServerState', () => {
    it('creates state manager with initial state', () => {
      const state = createServerState();

      expect(state.getState().services).toHaveLength(0);
      expect(state.getState().isRunning).toBe(false);
    });

    it('sets services and creates log buffers', () => {
      const state = createServerState();

      state.setServices([{ name: 'api' }, { name: 'web' }]);

      expect(state.getState().services).toHaveLength(2);
      expect(state.getState().logBuffers.api).toBeDefined();
      expect(state.getState().logBuffers.web).toBeDefined();
    });

    it('adds and retrieves logs', () => {
      const state = createServerState();
      state.setServices([{ name: 'api' }]);

      state.addLog('api', { message: 'Server started', level: 'info' });
      state.addLog('api', { message: 'Request received', level: 'debug' });

      const logs = state.getLogs('api', 10);

      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Server started');
    });

    it('tracks running state and uptime', () => {
      const state = createServerState();

      state.setRunning(true);

      expect(state.getState().isRunning).toBe(true);
      expect(state.getUptime()).toBeGreaterThanOrEqual(0);

      state.setRunning(false);

      expect(state.getUptime()).toBeNull();
    });

    it('aggregates logs from all services', () => {
      const state = createServerState();
      state.setServices([{ name: 'api' }, { name: 'web' }]);

      state.addLog('api', { message: 'API log', timestamp: '2024-01-15T10:00:01Z' });
      state.addLog('web', { message: 'Web log', timestamp: '2024-01-15T10:00:00Z' });

      const allLogs = state.getLogs(null, 10);

      expect(allLogs).toHaveLength(2);
      // Should be sorted by timestamp
      expect(allLogs[0].message).toBe('Web log');
    });
  });

  describe('getStartSequence', () => {
    it('returns build command', () => {
      const analysis = {
        services: [{ name: 'app', type: 'express' }],
      };

      const commands = getStartSequence(analysis);

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('build');
      expect(commands[0].command).toContain('docker compose');
    });
  });

  describe('getDashboardUrl', () => {
    it('returns default dashboard URL', () => {
      const url = getDashboardUrl();

      expect(url).toBe('http://localhost:3147');
    });

    it('uses custom host and port', () => {
      const url = getDashboardUrl({ host: '192.168.1.100', port: 8080 });

      expect(url).toBe('http://192.168.1.100:8080');
    });
  });
});
