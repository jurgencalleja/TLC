/**
 * Provider Registry Tests
 *
 * Runtime registry of available providers with health status.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  createRegistry,
} = require('./provider-registry.js');

describe('Provider Registry', () => {
  let registry;
  let mockHealthCheck;

  beforeEach(() => {
    mockHealthCheck = vi.fn().mockResolvedValue({ available: true, version: '1.0.0' });
    registry = createRegistry({ healthCheck: mockHealthCheck });
  });

  describe('register', () => {
    it('registers CLI provider', () => {
      registry.register({
        name: 'codex',
        type: 'cli',
        command: 'codex',
        capabilities: ['review', 'code-gen'],
      });

      const providers = registry.list();
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('codex');
      expect(providers[0].type).toBe('cli');
    });

    it('registers API provider', () => {
      registry.register({
        name: 'litellm',
        type: 'api',
        url: 'http://localhost:4000',
        capabilities: ['review'],
      });

      const providers = registry.list();
      expect(providers).toHaveLength(1);
      expect(providers[0].type).toBe('api');
    });
  });

  describe('health', () => {
    it('health check passes for available CLI', async () => {
      mockHealthCheck.mockResolvedValue({ available: true, version: '2.1.0' });
      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review'] });

      const status = await registry.checkHealth('codex');
      expect(status.available).toBe(true);
      expect(status.version).toBe('2.1.0');
    });

    it('health check fails for missing CLI', async () => {
      mockHealthCheck.mockResolvedValue({ available: false, error: 'not found' });
      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review'] });

      const status = await registry.checkHealth('codex');
      expect(status.available).toBe(false);
    });

    it('health check passes for reachable API', async () => {
      mockHealthCheck.mockResolvedValue({ available: true, latency: 50 });
      registry.register({ name: 'litellm', type: 'api', url: 'http://localhost:4000', capabilities: ['review'] });

      const status = await registry.checkHealth('litellm');
      expect(status.available).toBe(true);
    });

    it('health check fails for unreachable API', async () => {
      mockHealthCheck.mockResolvedValue({ available: false, error: 'connection refused' });
      registry.register({ name: 'litellm', type: 'api', url: 'http://localhost:4000', capabilities: ['review'] });

      const status = await registry.checkHealth('litellm');
      expect(status.available).toBe(false);
    });
  });

  describe('capability lookup', () => {
    it('lists providers by capability', () => {
      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review', 'code-gen'] });
      registry.register({ name: 'gemini', type: 'cli', command: 'gemini', capabilities: ['design', 'review'] });
      registry.register({ name: 'litellm', type: 'api', url: 'http://localhost:4000', capabilities: ['review'] });

      const reviewProviders = registry.getByCapability('review');
      expect(reviewProviders).toHaveLength(3);

      const designProviders = registry.getByCapability('design');
      expect(designProviders).toHaveLength(1);
      expect(designProviders[0].name).toBe('gemini');
    });

    it('returns best available provider (first healthy in priority order)', async () => {
      mockHealthCheck
        .mockResolvedValueOnce({ available: false }) // codex unhealthy
        .mockResolvedValueOnce({ available: true, version: '1.0' }); // gemini healthy

      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review'], priority: 1 });
      registry.register({ name: 'gemini', type: 'cli', command: 'gemini', capabilities: ['review'], priority: 2 });

      const best = await registry.getBestProvider('review');
      expect(best.name).toBe('gemini');
    });
  });

  describe('health cache', () => {
    it('caches health status within TTL', async () => {
      registry = createRegistry({ healthCheck: mockHealthCheck, cacheTTL: 5000 });
      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review'] });

      await registry.checkHealth('codex');
      await registry.checkHealth('codex');

      expect(mockHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('refreshes status after TTL expires', async () => {
      registry = createRegistry({ healthCheck: mockHealthCheck, cacheTTL: 10 });
      registry.register({ name: 'codex', type: 'cli', command: 'codex', capabilities: ['review'] });

      await registry.checkHealth('codex');
      await new Promise(r => setTimeout(r, 20));
      await registry.checkHealth('codex');

      expect(mockHealthCheck).toHaveBeenCalledTimes(2);
    });
  });

  describe('config loading', () => {
    it('loads providers from config', () => {
      const config = {
        providers: {
          codex: { type: 'cli', command: 'codex', capabilities: ['review'] },
          gemini: { type: 'cli', command: 'gemini', capabilities: ['design'] },
        },
      };

      const reg = createRegistry({ healthCheck: mockHealthCheck });
      reg.loadFromConfig(config);

      expect(reg.list()).toHaveLength(2);
    });

    it('handles empty config gracefully', () => {
      const reg = createRegistry({ healthCheck: mockHealthCheck });
      reg.loadFromConfig({});

      expect(reg.list()).toHaveLength(0);
    });
  });
});
