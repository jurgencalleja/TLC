import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ModelRouter,
  resolveProvider,
  resolveCapability,
} from './model-router.js';

describe('Model Router', () => {
  let router;

  beforeEach(() => {
    router = new ModelRouter({
      providers: {
        claude: { type: 'cli', command: 'claude', capabilities: ['review', 'code-gen'] },
        codex: { type: 'cli', command: 'codex', capabilities: ['review', 'code-gen'] },
        deepseek: { type: 'api', baseUrl: 'https://api.deepseek.com', capabilities: ['review'] },
      },
      capabilities: {
        review: { providers: ['claude', 'codex', 'deepseek'] },
        'code-gen': { providers: ['claude', 'codex'] },
      },
    });
  });

  describe('resolveProvider', () => {
    it('returns local when CLI detected', async () => {
      router._detectCLI = vi.fn().mockResolvedValue({ found: true, path: '/usr/bin/claude' });

      const provider = await router.resolveProvider('claude');

      expect(provider.location).toBe('local');
    });

    it('returns devserver when CLI not detected', async () => {
      router._detectCLI = vi.fn().mockResolvedValue({ found: false });
      router.devserverUrl = 'https://dev.example.com';

      const provider = await router.resolveProvider('claude');

      expect(provider.location).toBe('devserver');
    });

    it('returns devserver for API type', async () => {
      router.devserverUrl = 'https://dev.example.com';

      const provider = await router.resolveProvider('deepseek');

      expect(provider.location).toBe('devserver');
    });
  });

  describe('resolveCapability', () => {
    it('returns ordered providers', async () => {
      const providers = await router.resolveCapability('review');

      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0]).toHaveProperty('name');
    });

    it('filters by capability', async () => {
      const reviewProviders = await router.resolveCapability('review');
      const codeGenProviders = await router.resolveCapability('code-gen');

      expect(reviewProviders.length).toBe(3);
      expect(codeGenProviders.length).toBe(2);
    });
  });

  describe('cascade', () => {
    it('tries local first', async () => {
      router._detectCLI = vi.fn().mockResolvedValue({ found: true, path: '/usr/bin/claude' });

      const provider = await router.resolveProvider('claude');

      expect(provider.location).toBe('local');
    });

    it('falls back to devserver', async () => {
      router._detectCLI = vi.fn().mockResolvedValue({ found: false });
      router.devserverUrl = 'https://dev.example.com';

      const provider = await router.resolveProvider('claude');

      expect(provider.location).toBe('devserver');
    });
  });

  describe('loadConfig', () => {
    it('reads from .tlc.json', async () => {
      router._readConfig = vi.fn().mockResolvedValue({
        router: {
          providers: { test: { type: 'cli', command: 'test' } },
        },
      });

      await router.loadConfig();

      expect(router.config.providers).toHaveProperty('test');
    });

    it('uses defaults when missing', async () => {
      router._readConfig = vi.fn().mockResolvedValue({});

      await router.loadConfig();

      expect(router.config).toBeDefined();
    });
  });

  describe('handleUnavailable', () => {
    it('skips to next provider', async () => {
      router._detectCLI = vi.fn()
        .mockResolvedValueOnce({ found: false })
        .mockResolvedValueOnce({ found: true, path: '/usr/bin/codex' });

      const providers = await router.resolveCapability('review');
      const available = providers.filter(p => p.available);

      expect(available.length).toBeGreaterThan(0);
    });
  });
});
