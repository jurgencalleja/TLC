import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_CONFIG,
  createDevServerRuntime,
  createRequestHandler,
  parseArgs,
  formatHelp,
} from './dev-server-runtime.js';

describe('dev-server-runtime', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has correct default port', () => {
      expect(DEFAULT_CONFIG.port).toBe(3147);
    });

    it('has correct default host', () => {
      expect(DEFAULT_CONFIG.host).toBe('localhost');
    });

    it('has log buffer size', () => {
      expect(DEFAULT_CONFIG.logBufferSize).toBe(1000);
    });
  });

  describe('createDevServerRuntime', () => {
    let runtime;

    beforeEach(() => {
      runtime = createDevServerRuntime();
    });

    it('creates runtime with default config', () => {
      expect(runtime.config.port).toBe(3147);
      expect(runtime.config.host).toBe('localhost');
    });

    it('accepts custom config', () => {
      const custom = createDevServerRuntime({ port: 8080 });
      expect(custom.config.port).toBe(8080);
    });

    describe('getStatus', () => {
      it('returns initial status', () => {
        const status = runtime.getStatus();

        expect(status.isRunning).toBe(false);
        expect(status.connections).toBe(0);
        expect(status.services).toHaveLength(0);
      });

      it('reflects running state after start', () => {
        runtime.start();
        const status = runtime.getStatus();

        expect(status.isRunning).toBe(true);
        expect(status.uptime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('initialize', () => {
      it('analyzes project files', () => {
        const files = {
          'package.json': JSON.stringify({
            name: 'test-app',
            dependencies: { express: '4.0.0' },
          }),
        };

        const analysis = runtime.initialize(files);

        expect(analysis.services).toHaveLength(1);
        expect(analysis.services[0].type).toBe('express');
      });

      it('updates state with services', () => {
        const files = {
          'package.json': JSON.stringify({ name: 'app' }),
        };

        runtime.initialize(files);
        const state = runtime.state.getState();

        expect(state.services.length).toBeGreaterThan(0);
      });
    });

    describe('addLogEntry', () => {
      it('adds entry with timestamp', () => {
        const entry = runtime.addLogEntry({
          service: 'api',
          level: 'info',
          message: 'Test log',
        });

        expect(entry.timestamp).toBeDefined();
        expect(entry.message).toBe('Test log');
      });

      it('stores entry in buffer', () => {
        runtime.initialize({ 'package.json': '{}' });

        runtime.addLogEntry({ service: 'api', message: 'Log 1' });
        runtime.addLogEntry({ service: 'api', message: 'Log 2' });

        const logs = runtime.getLogs('api', 10);
        expect(logs.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getLogs', () => {
      it('returns empty array initially', () => {
        const logs = runtime.getLogs(null, 10);
        expect(logs).toHaveLength(0);
      });

      it('returns logs after adding', () => {
        runtime.addLogEntry({ message: 'Test' });
        const logs = runtime.getLogs(null, 10);
        expect(logs.length).toBeGreaterThan(0);
      });
    });

    describe('updateContainerStatus', () => {
      it('parses and updates status', () => {
        const output = JSON.stringify({
          Name: 'test-api-1',
          Service: 'api',
          State: 'running',
          Status: 'Up 5 minutes',
        });

        // Single container as one JSON line
        const health = runtime.updateContainerStatus(output);

        expect(health).toBeDefined();
      });

      it('handles empty output', () => {
        const health = runtime.updateContainerStatus('');

        expect(health.status).toBe('stopped');
      });
    });

    describe('handleFileChange', () => {
      it('creates change event', () => {
        runtime.initialize({
          'package.json': JSON.stringify({ name: 'app' }),
        });

        const event = runtime.handleFileChange('src/index.js', 'change');

        expect(event.path).toBe('src/index.js');
        expect(event.changeType).toBe('change');
        expect(event.action).toBeDefined();
      });

      it('adds log entry for change', () => {
        runtime.handleFileChange('src/index.js', 'change');

        const logs = runtime.getLogs(null, 10);
        expect(logs.some(l => l.message.includes('index.js'))).toBe(true);
      });
    });

    describe('start/stop', () => {
      it('marks runtime as running', () => {
        runtime.start();

        expect(runtime.getStatus().isRunning).toBe(true);
      });

      it('marks runtime as stopped', () => {
        runtime.start();
        runtime.stop();

        expect(runtime.getStatus().isRunning).toBe(false);
      });

      it('logs start/stop events', () => {
        runtime.start();
        runtime.stop();

        const logs = runtime.getLogs(null, 10);
        expect(logs.some(l => l.message.includes('started'))).toBe(true);
        expect(logs.some(l => l.message.includes('stopped'))).toBe(true);
      });
    });

    describe('getStartCommands', () => {
      it('returns docker compose commands', () => {
        const commands = runtime.getStartCommands();

        expect(commands.start).toContain('docker compose');
        expect(commands.logs).toContain('docker compose logs');
      });
    });

    describe('getStopCommand', () => {
      it('returns docker compose down command', () => {
        const cmd = runtime.getStopCommand();

        expect(cmd).toContain('docker compose down');
      });
    });

    describe('connection management', () => {
      it('tracks connection count', () => {
        expect(runtime.connections.getConnectionCount()).toBe(0);

        const client = runtime.connections.addClient();
        expect(runtime.connections.getConnectionCount()).toBe(1);

        runtime.connections.removeClient(client.clientId);
        expect(runtime.connections.getConnectionCount()).toBe(0);
      });
    });
  });

  describe('createRequestHandler', () => {
    let runtime;
    let handler;

    beforeEach(() => {
      runtime = createDevServerRuntime();
      handler = createRequestHandler(runtime);
    });

    it('handles /api/status', () => {
      const req = {
        url: '/api/status',
        headers: { host: 'localhost:3147' },
      };
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      handler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.isRunning).toBeDefined();
    });

    it('handles /api/logs', () => {
      runtime.addLogEntry({ message: 'Test log' });

      const req = {
        url: '/api/logs?count=10',
        headers: { host: 'localhost:3147' },
      };
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      handler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.logs).toBeDefined();
    });

    it('handles /api/services', () => {
      runtime.initialize({ 'package.json': '{}' });

      const req = {
        url: '/api/services',
        headers: { host: 'localhost:3147' },
      };
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      handler(req, res);

      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.services).toBeDefined();
    });

    it('handles /health', () => {
      const req = {
        url: '/health',
        headers: { host: 'localhost:3147' },
      };
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      handler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.status).toBe('ok');
    });

    it('returns 404 for unknown routes', () => {
      const req = {
        url: '/unknown',
        headers: { host: 'localhost:3147' },
      };
      const res = {
        writeHead: vi.fn(),
        end: vi.fn(),
      };

      handler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    });
  });

  describe('parseArgs', () => {
    it('parses port flag', () => {
      const opts = parseArgs(['--port', '8080']);
      expect(opts.port).toBe(8080);
    });

    it('parses short port flag', () => {
      const opts = parseArgs(['-p', '9000']);
      expect(opts.port).toBe(9000);
    });

    it('parses host flag', () => {
      const opts = parseArgs(['--host', '0.0.0.0']);
      expect(opts.host).toBe('0.0.0.0');
    });

    it('parses build flag', () => {
      const opts = parseArgs(['--build']);
      expect(opts.build).toBe(true);
    });

    it('parses no-watch flag', () => {
      const opts = parseArgs(['--no-watch']);
      expect(opts.watch).toBe(false);
    });

    it('parses help flag', () => {
      const opts = parseArgs(['--help']);
      expect(opts.help).toBe(true);
    });

    it('handles multiple flags', () => {
      const opts = parseArgs(['-p', '8080', '--build', '--host', '0.0.0.0']);

      expect(opts.port).toBe(8080);
      expect(opts.build).toBe(true);
      expect(opts.host).toBe('0.0.0.0');
    });
  });

  describe('formatHelp', () => {
    it('includes usage information', () => {
      const help = formatHelp();

      expect(help).toContain('Usage:');
      expect(help).toContain('tlc start');
    });

    it('includes options', () => {
      const help = formatHelp();

      expect(help).toContain('--port');
      expect(help).toContain('--host');
      expect(help).toContain('--build');
    });

    it('includes examples', () => {
      const help = formatHelp();

      expect(help).toContain('Examples:');
    });
  });
});
