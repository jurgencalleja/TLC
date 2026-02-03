/**
 * Health Check Manager Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createLivenessProbe,
  createReadinessProbe,
  createDeepHealthCheck,
  runHealthCheck,
  HEALTH_STATUS,
  createHealthCheckManager,
} from './health-check.js';

describe('health-check', () => {
  describe('HEALTH_STATUS', () => {
    it('defines status constants', () => {
      expect(HEALTH_STATUS.HEALTHY).toBe('healthy');
      expect(HEALTH_STATUS.UNHEALTHY).toBe('unhealthy');
      expect(HEALTH_STATUS.DEGRADED).toBe('degraded');
    });
  });

  describe('createLivenessProbe', () => {
    it('returns healthy when process is running', async () => {
      const probe = createLivenessProbe();
      const result = await probe.check();

      expect(result.status).toBe('healthy');
      expect(result.pid).toBeDefined();
    });

    it('includes uptime', async () => {
      const probe = createLivenessProbe();
      const result = await probe.check();

      expect(result.uptime).toBeDefined();
    });

    it('includes memory usage', async () => {
      const probe = createLivenessProbe({ includeMemory: true });
      const result = await probe.check();

      expect(result.memory).toBeDefined();
    });
  });

  describe('createReadinessProbe', () => {
    it('checks all dependencies', async () => {
      const mockDbCheck = vi.fn().mockResolvedValue(true);
      const mockCacheCheck = vi.fn().mockResolvedValue(true);

      const probe = createReadinessProbe({
        checks: [
          { name: 'database', check: mockDbCheck },
          { name: 'cache', check: mockCacheCheck },
        ],
      });

      const result = await probe.check();

      expect(result.status).toBe('healthy');
      expect(mockDbCheck).toHaveBeenCalled();
      expect(mockCacheCheck).toHaveBeenCalled();
    });

    it('returns unhealthy if any check fails', async () => {
      const probe = createReadinessProbe({
        checks: [
          { name: 'database', check: vi.fn().mockResolvedValue(true) },
          { name: 'cache', check: vi.fn().mockResolvedValue(false) },
        ],
      });

      const result = await probe.check();

      expect(result.status).toBe('unhealthy');
      expect(result.failed).toContain('cache');
    });

    it('handles check timeout', async () => {
      const slowCheck = () => new Promise((r) => setTimeout(() => r(true), 5000));

      const probe = createReadinessProbe({
        checks: [{ name: 'slow', check: slowCheck }],
        timeout: 100,
      });

      const result = await probe.check();

      expect(result.status).toBe('unhealthy');
    });
  });

  describe('createDeepHealthCheck', () => {
    it('verifies database connection', async () => {
      const mockDb = { query: vi.fn().mockResolvedValue([{ result: 1 }]) };

      const check = createDeepHealthCheck({ db: mockDb });
      const result = await check.checkDatabase();

      expect(result.healthy).toBe(true);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('verifies cache connection', async () => {
      const mockCache = { ping: vi.fn().mockResolvedValue('PONG') };

      const check = createDeepHealthCheck({ cache: mockCache });
      const result = await check.checkCache();

      expect(result.healthy).toBe(true);
    });

    it('verifies external service', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });

      const check = createDeepHealthCheck({ fetch: mockFetch });
      const result = await check.checkExternal('https://api.example.com/health');

      expect(result.healthy).toBe(true);
    });

    it('does not leak sensitive info', async () => {
      const check = createDeepHealthCheck({
        db: { connectionString: 'postgres://user:pass@host/db' },
      });

      const result = await check.getStatus();

      expect(JSON.stringify(result)).not.toContain('pass');
    });
  });

  describe('runHealthCheck', () => {
    it('runs all configured checks', async () => {
      const result = await runHealthCheck({
        liveness: true,
        readiness: true,
        checks: [],
      });

      expect(result.liveness).toBeDefined();
      expect(result.readiness).toBeDefined();
    });

    it('aggregates status', async () => {
      const result = await runHealthCheck({
        checks: [
          { name: 'a', check: vi.fn().mockResolvedValue(true) },
          { name: 'b', check: vi.fn().mockResolvedValue(true) },
        ],
      });

      expect(result.overall).toBe('healthy');
    });
  });

  describe('createHealthCheckManager', () => {
    it('creates manager with methods', () => {
      const manager = createHealthCheckManager();

      expect(manager.addCheck).toBeDefined();
      expect(manager.runAll).toBeDefined();
      expect(manager.getLiveness).toBeDefined();
      expect(manager.getReadiness).toBeDefined();
    });

    it('configures check intervals', () => {
      const manager = createHealthCheckManager({
        interval: 30000,
      });

      expect(manager.getInterval()).toBe(30000);
    });
  });
});
