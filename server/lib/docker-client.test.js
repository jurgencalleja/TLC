import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createDockerClient } = await import('./docker-client.js');

/**
 * Create a mock dockerode instance for injection
 */
function createMockDocker() {
  const mockContainer = {
    inspect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    remove: vi.fn(),
    stats: vi.fn(),
    logs: vi.fn(),
  };

  const mockDocker = {
    listContainers: vi.fn(),
    getContainer: vi.fn(() => mockContainer),
    listImages: vi.fn(),
    listVolumes: vi.fn(),
    ping: vi.fn(),
    version: vi.fn(),
    getEvents: vi.fn(),
  };

  return { mockDocker, mockContainer };
}

describe('DockerClient', () => {
  let client;
  let mockDocker;
  let mockContainer;

  beforeEach(() => {
    const mocks = createMockDocker();
    mockDocker = mocks.mockDocker;
    mockContainer = mocks.mockContainer;
    client = createDockerClient({ _docker: mockDocker });
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('returns true when Docker socket is accessible', async () => {
      mockDocker.ping.mockResolvedValue('OK');
      mockDocker.version.mockResolvedValue({ Version: '24.0.0', ApiVersion: '1.43' });

      const result = await client.isAvailable();
      expect(result).toEqual({
        available: true,
        version: '24.0.0',
        apiVersion: '1.43',
      });
    });

    it('returns false when Docker socket is missing', async () => {
      mockDocker.ping.mockRejectedValue(new Error('connect ENOENT /var/run/docker.sock'));

      const result = await client.isAvailable();
      expect(result).toEqual({
        available: false,
        error: expect.stringContaining('ENOENT'),
      });
    });
  });

  describe('listContainers', () => {
    it('returns formatted container objects', async () => {
      mockDocker.listContainers.mockResolvedValue([
        {
          Id: 'abc123def456',
          Names: ['/tlc-dev-dashboard'],
          Image: 'node:20-alpine',
          State: 'running',
          Status: 'Up 2 hours',
          Ports: [{ PrivatePort: 3147, PublicPort: 3147, Type: 'tcp' }],
          Created: 1708300000,
          Labels: { 'com.docker.compose.project': 'tlc' },
        },
      ]);

      const containers = await client.listContainers();
      expect(containers).toHaveLength(1);
      expect(containers[0]).toEqual({
        id: 'abc123def456',
        name: 'tlc-dev-dashboard',
        image: 'node:20-alpine',
        state: 'running',
        status: 'Up 2 hours',
        ports: [{ private: 3147, public: 3147, type: 'tcp' }],
        created: 1708300000,
        labels: { 'com.docker.compose.project': 'tlc' },
      });
    });

    it('lists all containers including stopped when all=true', async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await client.listContainers(true);
      expect(mockDocker.listContainers).toHaveBeenCalledWith({ all: true });
    });

    it('lists only running containers by default', async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await client.listContainers();
      expect(mockDocker.listContainers).toHaveBeenCalledWith({ all: false });
    });
  });

  describe('getContainer', () => {
    it('returns full detail for valid container ID', async () => {
      mockContainer.inspect.mockResolvedValue({
        Id: 'abc123',
        Name: '/tlc-dev-dashboard',
        Config: {
          Image: 'node:20-alpine',
          Env: ['NODE_ENV=development', 'TLC_PORT=3147'],
        },
        State: { Status: 'running', StartedAt: '2026-02-18T00:00:00Z' },
        Mounts: [{ Source: '/home/user/tlc', Destination: '/tlc', RW: true }],
        NetworkSettings: { Networks: { bridge: { IPAddress: '172.17.0.2' } } },
        HostConfig: { PortBindings: { '3147/tcp': [{ HostPort: '3147' }] } },
      });

      const detail = await client.getContainer('abc123');
      expect(detail.id).toBe('abc123');
      expect(detail.name).toBe('tlc-dev-dashboard');
      expect(detail.image).toBe('node:20-alpine');
      expect(detail.state).toBe('running');
      expect(detail.env).toContain('NODE_ENV=development');
      expect(detail.mounts).toHaveLength(1);
      expect(detail.mounts[0].source).toBe('/home/user/tlc');
    });

    it('throws for non-existent container', async () => {
      mockContainer.inspect.mockRejectedValue(
        Object.assign(new Error('no such container'), { statusCode: 404 })
      );
      await expect(client.getContainer('nonexistent')).rejects.toThrow('no such container');
    });
  });

  describe('startContainer', () => {
    it('calls dockerode start', async () => {
      mockContainer.start.mockResolvedValue();
      await client.startContainer('abc123');
      expect(mockDocker.getContainer).toHaveBeenCalledWith('abc123');
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });

  describe('stopContainer', () => {
    it('calls dockerode stop', async () => {
      mockContainer.stop.mockResolvedValue();
      await client.stopContainer('abc123');
      expect(mockDocker.getContainer).toHaveBeenCalledWith('abc123');
      expect(mockContainer.stop).toHaveBeenCalled();
    });
  });

  describe('restartContainer', () => {
    it('calls dockerode restart', async () => {
      mockContainer.restart.mockResolvedValue();
      await client.restartContainer('abc123');
      expect(mockDocker.getContainer).toHaveBeenCalledWith('abc123');
      expect(mockContainer.restart).toHaveBeenCalled();
    });
  });

  describe('removeContainer', () => {
    it('removes container with force option', async () => {
      mockContainer.remove.mockResolvedValue();
      await client.removeContainer('abc123', true);
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('removes container without force by default', async () => {
      mockContainer.remove.mockResolvedValue();
      await client.removeContainer('abc123');
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: false });
    });
  });

  describe('getContainerStats', () => {
    it('calculates CPU percentage from raw stats', async () => {
      mockContainer.stats.mockResolvedValue({
        cpu_stats: {
          cpu_usage: { total_usage: 500000000 },
          system_cpu_usage: 10000000000,
          online_cpus: 4,
        },
        precpu_stats: {
          cpu_usage: { total_usage: 400000000 },
          system_cpu_usage: 9000000000,
        },
        memory_stats: {
          usage: 104857600,
          limit: 2147483648,
          stats: { cache: 10485760 },
        },
        networks: {
          eth0: { rx_bytes: 1024000, tx_bytes: 512000 },
        },
      });

      const stats = await client.getContainerStats('abc123');
      expect(stats.cpuPercent).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.memoryLimit).toBe(2147483648);
      expect(stats.networkRx).toBe(1024000);
      expect(stats.networkTx).toBe(512000);
    });
  });

  describe('getContainerLogs', () => {
    it('returns recent log lines', async () => {
      const mockStream = Buffer.from('line1\nline2\nline3\n');
      mockContainer.logs.mockResolvedValue(mockStream);

      const logs = await client.getContainerLogs('abc123', { tail: 100 });
      expect(mockContainer.logs).toHaveBeenCalledWith({
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: true,
      });
      expect(typeof logs).toBe('string');
    });
  });

  describe('listImages', () => {
    it('returns formatted image objects', async () => {
      mockDocker.listImages.mockResolvedValue([
        {
          Id: 'sha256:abc123',
          RepoTags: ['node:20-alpine'],
          Size: 180000000,
          Created: 1708200000,
        },
      ]);

      const images = await client.listImages();
      expect(images).toHaveLength(1);
      expect(images[0]).toEqual({
        id: 'sha256:abc123',
        tags: ['node:20-alpine'],
        size: 180000000,
        created: 1708200000,
      });
    });
  });

  describe('listVolumes', () => {
    it('returns formatted volume objects', async () => {
      mockDocker.listVolumes.mockResolvedValue({
        Volumes: [
          {
            Name: 'postgres-data',
            Driver: 'local',
            Mountpoint: '/var/lib/docker/volumes/postgres-data/_data',
            CreatedAt: '2026-02-18T00:00:00Z',
          },
        ],
      });

      const volumes = await client.listVolumes();
      expect(volumes).toHaveLength(1);
      expect(volumes[0]).toEqual({
        name: 'postgres-data',
        driver: 'local',
        mountpoint: '/var/lib/docker/volumes/postgres-data/_data',
        createdAt: '2026-02-18T00:00:00Z',
      });
    });
  });

  describe('matchContainerToProject', () => {
    it('matches by container name pattern', () => {
      const container = { name: 'tlc-myapp-dashboard', labels: {} };
      const projects = [
        { name: 'myapp', path: '/home/user/myapp' },
        { name: 'other', path: '/home/user/other' },
      ];
      const match = client.matchContainerToProject(container, projects);
      expect(match).toBe('myapp');
    });

    it('matches by compose project label', () => {
      const container = {
        name: 'some-random-name',
        labels: { 'com.docker.compose.project': 'myapp' },
      };
      const projects = [
        { name: 'myapp', path: '/home/user/myapp' },
      ];
      const match = client.matchContainerToProject(container, projects);
      expect(match).toBe('myapp');
    });

    it('returns null when no match found', () => {
      const container = { name: 'unrelated-container', labels: {} };
      const projects = [{ name: 'myapp', path: '/home/user/myapp' }];
      const match = client.matchContainerToProject(container, projects);
      expect(match).toBeNull();
    });
  });
});
