/**
 * Router Status API Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { getRouterStatus, getProviderStats, calculateCosts, filterByTimeRange, createRouterApi } from './router-api.js';

describe('router-api', () => {
  describe('getRouterStatus', () => {
    it('returns all provider statuses', async () => {
      const mockRouter = {
        getProviders: vi.fn().mockReturnValue([
          { name: 'openai', status: 'active' },
          { name: 'anthropic', status: 'active' }
        ])
      };
      const status = await getRouterStatus({ router: mockRouter });
      expect(status.providers.length).toBe(2);
      expect(status.providers[0].name).toBe('openai');
    });

    it('includes overall status', async () => {
      const mockRouter = {
        getProviders: vi.fn().mockReturnValue([
          { name: 'openai', status: 'active' }
        ])
      };
      const status = await getRouterStatus({ router: mockRouter });
      expect(status.overall).toBe('healthy');
    });

    it('reports degraded when providers down', async () => {
      const mockRouter = {
        getProviders: vi.fn().mockReturnValue([
          { name: 'openai', status: 'error' },
          { name: 'anthropic', status: 'active' }
        ])
      };
      const status = await getRouterStatus({ router: mockRouter });
      expect(status.overall).toBe('degraded');
    });
  });

  describe('getProviderStats', () => {
    it('returns request counts', () => {
      const stats = getProviderStats({
        requests: [
          { provider: 'openai', timestamp: Date.now() },
          { provider: 'openai', timestamp: Date.now() },
          { provider: 'anthropic', timestamp: Date.now() }
        ]
      });
      expect(stats.openai.requests).toBe(2);
      expect(stats.anthropic.requests).toBe(1);
    });

    it('calculates error rates', () => {
      const stats = getProviderStats({
        requests: [
          { provider: 'openai', error: false },
          { provider: 'openai', error: true }
        ]
      });
      expect(stats.openai.errorRate).toBe(0.5);
    });

    it('tracks latency', () => {
      const stats = getProviderStats({
        requests: [
          { provider: 'openai', latency: 100 },
          { provider: 'openai', latency: 200 }
        ]
      });
      expect(stats.openai.avgLatency).toBe(150);
    });
  });

  describe('calculateCosts', () => {
    it('calculates total costs', () => {
      const requests = [
        { provider: 'openai', inputTokens: 1000, outputTokens: 500 },
        { provider: 'anthropic', inputTokens: 2000, outputTokens: 1000 }
      ];
      const costs = calculateCosts(requests, {
        openai: { input: 0.01, output: 0.03 },
        anthropic: { input: 0.008, output: 0.024 }
      });
      expect(costs.total).toBeGreaterThan(0);
      expect(costs.byProvider.openai).toBeDefined();
    });

    it('handles missing pricing', () => {
      const requests = [{ provider: 'unknown', inputTokens: 1000 }];
      const costs = calculateCosts(requests, {});
      expect(costs.byProvider.unknown).toBe(0);
    });
  });

  describe('filterByTimeRange', () => {
    it('filters by date range', () => {
      const now = Date.now();
      const requests = [
        { timestamp: now - 1000 },
        { timestamp: now - 100000 },
        { timestamp: now - 1000000 }
      ];
      const filtered = filterByTimeRange(requests, { start: now - 50000 });
      expect(filtered.length).toBe(1);
    });

    it('supports end date', () => {
      const now = Date.now();
      const requests = [
        { timestamp: now - 1000 },
        { timestamp: now - 5000 }
      ];
      const filtered = filterByTimeRange(requests, {
        start: now - 10000,
        end: now - 3000
      });
      expect(filtered.length).toBe(1);
    });
  });

  describe('createRouterApi', () => {
    it('creates API handler', () => {
      const api = createRouterApi({});
      expect(api.getStatus).toBeDefined();
      expect(api.getStats).toBeDefined();
      expect(api.getCosts).toBeDefined();
    });
  });
});
