import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { createDockerRouter } = await import('./docker-api.js');

/**
 * Helper: create mock docker client
 */
function createMockDockerClient(available = true) {
  return {
    isAvailable: vi.fn().mockResolvedValue(
      available
        ? { available: true, version: '24.0.0', apiVersion: '1.43' }
        : { available: false, error: 'Docker not available' }
    ),
    listContainers: vi.fn().mockResolvedValue([
      {
        id: 'abc123',
        name: 'tlc-dev-dashboard',
        image: 'node:20-alpine',
        state: 'running',
        status: 'Up 2 hours',
        ports: [{ private: 3147, public: 3147, type: 'tcp' }],
        created: 1708300000,
        labels: {},
      },
    ]),
    getContainer: vi.fn().mockResolvedValue({
      id: 'abc123',
      name: 'tlc-dev-dashboard',
      image: 'node:20-alpine',
      state: 'running',
      env: ['NODE_ENV=development'],
      mounts: [],
      networks: {},
    }),
    startContainer: vi.fn().mockResolvedValue(),
    stopContainer: vi.fn().mockResolvedValue(),
    restartContainer: vi.fn().mockResolvedValue(),
    removeContainer: vi.fn().mockResolvedValue(),
    getContainerStats: vi.fn().mockResolvedValue({
      cpuPercent: 2.5,
      memoryUsage: 104857600,
      memoryLimit: 2147483648,
      networkRx: 1024000,
      networkTx: 512000,
    }),
    getContainerLogs: vi.fn().mockResolvedValue('log line 1\nlog line 2\n'),
    listImages: vi.fn().mockResolvedValue([
      { id: 'sha256:abc', tags: ['node:20-alpine'], size: 180000000, created: 1708200000 },
    ]),
    listVolumes: vi.fn().mockResolvedValue([
      { name: 'postgres-data', driver: 'local', mountpoint: '/var/lib/docker/volumes/pg/_data' },
    ]),
    matchContainerToProject: vi.fn().mockReturnValue(null),
  };
}

function createApp(dockerClient) {
  const app = express();
  app.use(express.json());
  app.use('/docker', createDockerRouter({ dockerClient }));
  return app;
}

describe('Docker API Router', () => {
  let mockClient;
  let app;

  beforeEach(() => {
    mockClient = createMockDockerClient();
    app = createApp(mockClient);
  });

  describe('GET /docker/status', () => {
    it('returns Docker status and version', async () => {
      const res = await request(app).get('/docker/status');
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.version).toBe('24.0.0');
    });

    it('returns 503 when Docker unavailable', async () => {
      const unavailableClient = createMockDockerClient(false);
      const unavailableApp = createApp(unavailableClient);
      const res = await request(unavailableApp).get('/docker/status');
      expect(res.status).toBe(503);
      expect(res.body.available).toBe(false);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe('GET /docker/containers', () => {
    it('returns list of containers', async () => {
      const res = await request(app).get('/docker/containers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('tlc-dev-dashboard');
    });

    it('passes all=true query parameter', async () => {
      await request(app).get('/docker/containers?all=true');
      expect(mockClient.listContainers).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /docker/containers/:id', () => {
    it('returns container detail', async () => {
      const res = await request(app).get('/docker/containers/abc123');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('abc123');
      expect(mockClient.getContainer).toHaveBeenCalledWith('abc123');
    });

    it('returns 404 for unknown container', async () => {
      mockClient.getContainer.mockRejectedValue(
        Object.assign(new Error('no such container'), { statusCode: 404 })
      );
      const res = await request(app).get('/docker/containers/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /docker/containers/:id/start', () => {
    it('starts a container', async () => {
      const res = await request(app).post('/docker/containers/abc123/start');
      expect(res.status).toBe(200);
      expect(mockClient.startContainer).toHaveBeenCalledWith('abc123');
    });
  });

  describe('POST /docker/containers/:id/stop', () => {
    it('stops a container', async () => {
      const res = await request(app).post('/docker/containers/abc123/stop');
      expect(res.status).toBe(200);
      expect(mockClient.stopContainer).toHaveBeenCalledWith('abc123');
    });
  });

  describe('POST /docker/containers/:id/restart', () => {
    it('restarts a container', async () => {
      const res = await request(app).post('/docker/containers/abc123/restart');
      expect(res.status).toBe(200);
      expect(mockClient.restartContainer).toHaveBeenCalledWith('abc123');
    });
  });

  describe('DELETE /docker/containers/:id', () => {
    it('removes a container', async () => {
      const res = await request(app).delete('/docker/containers/abc123');
      expect(res.status).toBe(200);
      expect(mockClient.removeContainer).toHaveBeenCalledWith('abc123', false);
    });

    it('removes with force when requested', async () => {
      const res = await request(app).delete('/docker/containers/abc123?force=true');
      expect(res.status).toBe(200);
      expect(mockClient.removeContainer).toHaveBeenCalledWith('abc123', true);
    });
  });

  describe('GET /docker/containers/:id/logs', () => {
    it('returns container logs', async () => {
      const res = await request(app).get('/docker/containers/abc123/logs');
      expect(res.status).toBe(200);
      expect(res.body.logs).toContain('log line 1');
    });

    it('passes tail parameter', async () => {
      await request(app).get('/docker/containers/abc123/logs?tail=50');
      expect(mockClient.getContainerLogs).toHaveBeenCalledWith('abc123', { tail: 50 });
    });
  });

  describe('GET /docker/containers/:id/stats', () => {
    it('returns container stats snapshot', async () => {
      const res = await request(app).get('/docker/containers/abc123/stats');
      expect(res.status).toBe(200);
      expect(res.body.cpuPercent).toBe(2.5);
      expect(res.body.memoryUsage).toBe(104857600);
    });
  });

  describe('GET /docker/images', () => {
    it('returns list of images', async () => {
      const res = await request(app).get('/docker/images');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].tags).toContain('node:20-alpine');
    });
  });

  describe('GET /docker/volumes', () => {
    it('returns list of volumes', async () => {
      const res = await request(app).get('/docker/volumes');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('postgres-data');
    });
  });
});
