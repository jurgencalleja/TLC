import { describe, it, expect } from 'vitest';
import {
  detectServices,
  generateDockerfile,
  generateDockerCompose,
  parseDockerPs,
  parseDockerLogs,
  getServiceHealth,
} from './docker-manager.js';

describe('docker-manager', () => {
  describe('detectServices', () => {
    it('detects single service from package.json', () => {
      const files = {
        'package.json': JSON.stringify({ name: 'my-app', scripts: { dev: 'next dev' } }),
      };

      const result = detectServices(files);

      expect(result.services).toHaveLength(1);
      expect(result.services[0].name).toBe('app');
      expect(result.services[0].type).toBe('nextjs');
    });

    it('detects monorepo with multiple services', () => {
      const files = {
        'services/api/package.json': JSON.stringify({ name: 'api', scripts: { start: 'node index.js' } }),
        'services/web/package.json': JSON.stringify({ name: 'web', scripts: { dev: 'vite' } }),
        'services/worker/package.json': JSON.stringify({ name: 'worker' }),
      };

      const result = detectServices(files);

      expect(result.services.length).toBeGreaterThanOrEqual(2);
      expect(result.services.some(s => s.name === 'api')).toBe(true);
      expect(result.services.some(s => s.name === 'web')).toBe(true);
    });

    it('detects Python service', () => {
      const files = {
        'requirements.txt': 'flask==2.0.0\n',
        'app.py': 'from flask import Flask',
      };

      const result = detectServices(files);

      expect(result.services[0].type).toBe('python');
    });

    it('detects Go service', () => {
      const files = {
        'go.mod': 'module myapp\n\ngo 1.21',
        'main.go': 'package main',
      };

      const result = detectServices(files);

      expect(result.services[0].type).toBe('go');
    });

    it('detects existing docker-compose services', () => {
      const files = {
        'docker-compose.yml': `
services:
  api:
    build: ./api
  web:
    build: ./web
  postgres:
    image: postgres:15
`,
      };

      const result = detectServices(files);

      expect(result.services.some(s => s.name === 'api')).toBe(true);
      expect(result.services.some(s => s.name === 'postgres')).toBe(true);
    });
  });

  describe('generateDockerfile', () => {
    it('generates Dockerfile for Node.js app', () => {
      const service = {
        name: 'api',
        type: 'nodejs',
        port: 3000,
      };

      const dockerfile = generateDockerfile(service);

      expect(dockerfile).toContain('FROM node:');
      expect(dockerfile).toContain('WORKDIR');
      expect(dockerfile).toContain('npm');
      expect(dockerfile).toContain('EXPOSE');
    });

    it('generates Dockerfile for Next.js app', () => {
      const service = {
        name: 'web',
        type: 'nextjs',
        port: 3000,
      };

      const dockerfile = generateDockerfile(service);

      expect(dockerfile).toContain('FROM node:');
      expect(dockerfile).toContain('next');
    });

    it('generates Dockerfile for Python app', () => {
      const service = {
        name: 'api',
        type: 'python',
        port: 5000,
      };

      const dockerfile = generateDockerfile(service);

      expect(dockerfile).toContain('FROM python:');
      expect(dockerfile).toContain('pip');
    });

    it('generates Dockerfile for Go app', () => {
      const service = {
        name: 'api',
        type: 'go',
        port: 8080,
      };

      const dockerfile = generateDockerfile(service);

      expect(dockerfile).toContain('FROM golang:');
      expect(dockerfile).toContain('go build');
    });
  });

  describe('generateDockerCompose', () => {
    it('generates docker-compose with app service', () => {
      const services = [
        { name: 'app', type: 'nodejs', port: 3000 },
      ];

      const compose = generateDockerCompose(services);

      expect(compose).toContain('services:');
      expect(compose).toContain('app:');
      expect(compose).toContain('build:');
      expect(compose).toContain('3000');
    });

    it('includes infrastructure services', () => {
      const services = [
        { name: 'api', type: 'nodejs', port: 3000 },
      ];
      const infra = ['postgres', 'redis'];

      const compose = generateDockerCompose(services, { infrastructure: infra });

      expect(compose).toContain('postgres:');
      expect(compose).toContain('image: postgres');
      expect(compose).toContain('redis:');
    });

    it('adds volume mounts for hot reload', () => {
      const services = [
        { name: 'app', type: 'nodejs', port: 3000, path: '.' },
      ];

      const compose = generateDockerCompose(services, { hotReload: true });

      expect(compose).toContain('volumes:');
      expect(compose).toContain('./:/app');
    });

    it('sets up network for microservices', () => {
      const services = [
        { name: 'api', type: 'nodejs', port: 3001 },
        { name: 'web', type: 'nodejs', port: 3002 },
      ];

      const compose = generateDockerCompose(services);

      expect(compose).toContain('networks:');
    });
  });

  describe('parseDockerPs', () => {
    it('parses docker ps JSON output', () => {
      const output = JSON.stringify([
        { Names: 'myapp-api-1', State: 'running', Status: 'Up 2 minutes', Ports: '0.0.0.0:3001->3000/tcp' },
        { Names: 'myapp-web-1', State: 'running', Status: 'Up 2 minutes', Ports: '0.0.0.0:3002->3000/tcp' },
        { Names: 'myapp-postgres-1', State: 'running', Status: 'Up 2 minutes (healthy)' },
      ]);

      const result = parseDockerPs(output);

      expect(result).toHaveLength(3);
      expect(result[0].name).toContain('api');
      expect(result[0].state).toBe('running');
    });

    it('handles empty output', () => {
      const result = parseDockerPs('[]');

      expect(result).toHaveLength(0);
    });
  });

  describe('parseDockerLogs', () => {
    it('parses log lines with timestamps', () => {
      const logs = `2024-01-15T10:30:00.000Z api | Server started on port 3000
2024-01-15T10:30:01.000Z api | Connected to database`;

      const result = parseDockerLogs(logs);

      expect(result).toHaveLength(2);
      expect(result[0].message).toContain('Server started');
      expect(result[0].timestamp).toBeDefined();
    });

    it('handles logs without timestamps', () => {
      const logs = `Starting server...
Listening on port 3000`;

      const result = parseDockerLogs(logs);

      expect(result).toHaveLength(2);
      expect(result[0].message).toContain('Starting');
    });
  });

  describe('getServiceHealth', () => {
    it('returns healthy for running container', () => {
      const container = {
        state: 'running',
        status: 'Up 5 minutes (healthy)',
      };

      const health = getServiceHealth(container);

      expect(health.status).toBe('healthy');
    });

    it('returns unhealthy for exited container', () => {
      const container = {
        state: 'exited',
        status: 'Exited (1) 2 minutes ago',
      };

      const health = getServiceHealth(container);

      expect(health.status).toBe('unhealthy');
      expect(health.exitCode).toBe(1);
    });

    it('returns starting for container without health check', () => {
      const container = {
        state: 'running',
        status: 'Up 10 seconds',
      };

      const health = getServiceHealth(container);

      expect(health.status).toBe('running');
    });
  });
});
