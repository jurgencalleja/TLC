import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRouter,
  resolveProvider,
  resolveCapability,
  loadConfig,
  DEFAULT_CONFIG,
} from './model-router.js';

// Mock dependencies
vi.mock('./cli-detector.js', () => ({
  detectAllCLIs: vi.fn(),
  clearCache: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

import { detectAllCLIs } from './cli-detector.js';
import fs from 'fs/promises';

describe('model-router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRouter', () => {
    it('creates router with default config', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const router = await createRouter();

      expect(router).toBeDefined();
      expect(router.resolveProvider).toBeDefined();
      expect(router.resolveCapability).toBeDefined();
    });

    it('creates router with custom config', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const config = {
        providers: {
          claude: { type: 'cli', command: 'claude' },
        },
        capabilities: {
          review: { providers: ['claude'] },
        },
      };

      const router = await createRouter(config);

      expect(router).toBeDefined();
    });

    it('detects local CLIs on creation', async () => {
      detectAllCLIs.mockResolvedValue(new Map([
        ['claude', { name: 'claude', version: 'v4.0.0' }],
      ]));

      await createRouter();

      expect(detectAllCLIs).toHaveBeenCalled();
    });
  });

  describe('resolveProvider', () => {
    it('returns local when CLI detected', async () => {
      detectAllCLIs.mockResolvedValue(new Map([
        ['claude', { name: 'claude', version: 'v4.0.0', detected: true }],
      ]));

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
        },
      });

      const result = router.resolveProvider('claude');

      expect(result.via).toBe('local');
      expect(result.provider.name).toBe('claude');
    });

    it('returns devserver when CLI not detected', async () => {
      detectAllCLIs.mockResolvedValue(new Map()); // No CLIs detected

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
        },
        devserver: { url: 'https://devserver.example.com' },
      });

      const result = router.resolveProvider('claude');

      expect(result.via).toBe('devserver');
    });

    it('returns devserver for API type', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const router = await createRouter({
        providers: {
          deepseek: {
            type: 'api',
            baseUrl: 'https://api.deepseek.com',
            capabilities: ['review'],
          },
        },
      });

      const result = router.resolveProvider('deepseek');

      expect(result.via).toBe('devserver');
    });

    it('returns null for unknown provider', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const router = await createRouter();

      const result = router.resolveProvider('unknown');

      expect(result).toBeNull();
    });
  });

  describe('resolveCapability', () => {
    it('returns ordered providers for capability', async () => {
      detectAllCLIs.mockResolvedValue(new Map([
        ['claude', { name: 'claude' }],
      ]));

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
          deepseek: { type: 'api', baseUrl: 'https://api.deepseek.com', capabilities: ['review'] },
        },
        capabilities: {
          review: { providers: ['claude', 'deepseek'] },
        },
      });

      const providers = router.resolveCapability('review');

      expect(providers.length).toBe(2);
      expect(providers[0].name).toBe('claude');
      expect(providers[1].name).toBe('deepseek');
    });

    it('filters by capability', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review', 'code-gen'] },
          gemini: { type: 'cli', command: 'gemini', capabilities: ['design'] },
        },
        capabilities: {
          review: { providers: ['claude'] },
          design: { providers: ['gemini'] },
        },
      });

      const reviewProviders = router.resolveCapability('review');
      const designProviders = router.resolveCapability('design');

      expect(reviewProviders.length).toBe(1);
      expect(reviewProviders[0].name).toBe('claude');

      expect(designProviders.length).toBe(1);
      expect(designProviders[0].name).toBe('gemini');
    });

    it('returns empty array for unknown capability', async () => {
      detectAllCLIs.mockResolvedValue(new Map());

      const router = await createRouter();

      const providers = router.resolveCapability('unknown');

      expect(providers).toEqual([]);
    });
  });

  describe('cascade behavior', () => {
    it('tries local first', async () => {
      detectAllCLIs.mockResolvedValue(new Map([
        ['claude', { name: 'claude', detected: true }],
      ]));

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
        },
        devserver: { url: 'https://devserver.example.com' },
      });

      const result = router.resolveProvider('claude');

      expect(result.via).toBe('local');
    });

    it('falls back to devserver when local unavailable', async () => {
      detectAllCLIs.mockResolvedValue(new Map()); // No CLIs detected

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
        },
        devserver: { url: 'https://devserver.example.com' },
      });

      const result = router.resolveProvider('claude');

      expect(result.via).toBe('devserver');
    });
  });

  describe('loadConfig', () => {
    it('reads from .tlc.json', async () => {
      const config = {
        router: {
          providers: { claude: { type: 'cli', command: 'claude' } },
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(config));

      const loaded = await loadConfig('/project');

      expect(fs.readFile).toHaveBeenCalledWith('/project/.tlc.json', 'utf8');
      expect(loaded.providers.claude).toBeDefined();
    });

    it('uses defaults when file missing', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT'));

      const loaded = await loadConfig('/project');

      expect(loaded).toEqual(DEFAULT_CONFIG);
    });

    it('merges with defaults', async () => {
      const config = {
        router: {
          providers: { custom: { type: 'api', baseUrl: 'https://example.com' } },
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(config));

      const loaded = await loadConfig('/project');

      // Should have custom provider
      expect(loaded.providers.custom).toBeDefined();
      // Should still have defaults
      expect(loaded.providers.claude).toBeDefined();
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('includes claude provider', () => {
      expect(DEFAULT_CONFIG.providers.claude).toBeDefined();
      expect(DEFAULT_CONFIG.providers.claude.type).toBe('cli');
    });

    it('includes codex provider', () => {
      expect(DEFAULT_CONFIG.providers.codex).toBeDefined();
      expect(DEFAULT_CONFIG.providers.codex.type).toBe('cli');
    });

    it('includes gemini provider', () => {
      expect(DEFAULT_CONFIG.providers.gemini).toBeDefined();
      expect(DEFAULT_CONFIG.providers.gemini.type).toBe('cli');
    });

    it('includes deepseek provider', () => {
      expect(DEFAULT_CONFIG.providers.deepseek).toBeDefined();
      expect(DEFAULT_CONFIG.providers.deepseek.type).toBe('api');
    });

    it('includes review capability', () => {
      expect(DEFAULT_CONFIG.capabilities.review).toBeDefined();
      expect(DEFAULT_CONFIG.capabilities.review.providers).toContain('claude');
    });
  });

  describe('handleUnavailable', () => {
    it('skips unavailable providers', async () => {
      detectAllCLIs.mockResolvedValue(new Map()); // No local CLIs

      const router = await createRouter({
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
          deepseek: { type: 'api', baseUrl: 'https://api.deepseek.com', capabilities: ['review'] },
        },
        capabilities: {
          review: { providers: ['claude', 'deepseek'] },
        },
        devserver: { url: 'https://devserver.example.com' },
      });

      const providers = router.resolveCapability('review');

      // Both should be available (claude via devserver, deepseek via api)
      expect(providers.length).toBe(2);
    });
  });
});
