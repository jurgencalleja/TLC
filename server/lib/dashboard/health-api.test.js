/**
 * Health API Module Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { getHealthStatus, getSystemMetrics, checkDependencies, runTestSuite, createHealthApi } from './health-api.js';

describe('health-api', () => {
  describe('getHealthStatus', () => {
    it('returns healthy status', async () => {
      const status = await getHealthStatus({
        checkDeps: vi.fn().mockResolvedValue({ healthy: true })
      });
      expect(status.status).toBe('healthy');
      expect(status.timestamp).toBeDefined();
    });

    it('returns degraded on dependency issues', async () => {
      const status = await getHealthStatus({
        checkDeps: vi.fn().mockResolvedValue({ healthy: false, issues: ['db down'] })
      });
      expect(status.status).toBe('degraded');
      expect(status.issues).toContain('db down');
    });

    it('includes uptime', async () => {
      const status = await getHealthStatus({
        checkDeps: vi.fn().mockResolvedValue({ healthy: true })
      });
      expect(status.uptime).toBeDefined();
      expect(typeof status.uptime).toBe('number');
    });
  });

  describe('getSystemMetrics', () => {
    it('returns memory metrics', () => {
      const metrics = getSystemMetrics();
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.used).toBeDefined();
      expect(metrics.memory.total).toBeDefined();
    });

    it('returns cpu metrics', () => {
      const metrics = getSystemMetrics();
      expect(metrics.cpu).toBeDefined();
    });

    it('returns process info', () => {
      const metrics = getSystemMetrics();
      expect(metrics.pid).toBeDefined();
      expect(metrics.nodeVersion).toBeDefined();
    });
  });

  describe('checkDependencies', () => {
    it('checks file system access', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined)
      };
      const result = await checkDependencies({ fs: mockFs, basePath: '/test' });
      expect(result.filesystem).toBe(true);
    });

    it('reports missing directories', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT'))
      };
      const result = await checkDependencies({ fs: mockFs, basePath: '/test' });
      expect(result.filesystem).toBe(false);
    });

    it('aggregates health status', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined)
      };
      const result = await checkDependencies({ fs: mockFs, basePath: '/test' });
      expect(result.healthy).toBe(true);
    });
  });

  describe('runTestSuite', () => {
    it('returns test results', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        stdout: '5541 passed',
        stderr: ''
      });
      const result = await runTestSuite({ exec: mockExec });
      expect(result.passed).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('parses test output', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        stdout: 'Tests: 100 passed | 5 failed',
        stderr: ''
      });
      const result = await runTestSuite({ exec: mockExec });
      expect(result.passed).toBe(100);
      expect(result.failed).toBe(5);
    });

    it('handles test errors', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('Command failed'));
      const result = await runTestSuite({ exec: mockExec });
      expect(result.error).toBeDefined();
    });
  });

  describe('createHealthApi', () => {
    it('creates API handler', () => {
      const api = createHealthApi({ basePath: '/test' });
      expect(api.get).toBeDefined();
    });

    it('caches health status briefly', async () => {
      const mockCheck = vi.fn().mockResolvedValue({ healthy: true });
      const api = createHealthApi({ checkDeps: mockCheck, cacheMs: 1000 });
      await api.get();
      await api.get();
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });
  });
});
