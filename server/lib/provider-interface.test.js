import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProvider,
  validateConfig,
  PROVIDER_TYPES,
  createProviderResult,
} from './provider-interface.js';

describe('provider-interface', () => {
  describe('createProvider', () => {
    it('creates CLI provider with correct shape', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review', 'code-gen'],
      });

      expect(provider.name).toBe('claude');
      expect(provider.type).toBe('cli');
      expect(provider.capabilities).toContain('review');
      expect(typeof provider.run).toBe('function');
    });

    it('creates API provider with correct shape', () => {
      const provider = createProvider({
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      });

      expect(provider.name).toBe('deepseek');
      expect(provider.type).toBe('api');
      expect(provider.baseUrl).toBe('https://api.deepseek.com');
      expect(typeof provider.run).toBe('function');
    });

    it('throws on invalid type', () => {
      expect(() => createProvider({
        name: 'test',
        type: 'invalid',
        capabilities: [],
      })).toThrow('Invalid provider type');
    });

    it('throws on missing name', () => {
      expect(() => createProvider({
        type: 'cli',
        capabilities: [],
      })).toThrow('name is required');
    });

    it('defaults capabilities to empty array', () => {
      const provider = createProvider({
        name: 'test',
        type: 'cli',
        command: 'test',
      });

      expect(provider.capabilities).toEqual([]);
    });

    it('sets detected to false by default', () => {
      const provider = createProvider({
        name: 'test',
        type: 'cli',
        command: 'test',
      });

      expect(provider.detected).toBe(false);
    });
  });

  describe('provider.run', () => {
    it('returns ProviderResult shape', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'echo',
        capabilities: [],
        // Mock runner for testing
        runner: async () => ({
          raw: '{"result": "ok"}',
          parsed: { result: 'ok' },
          exitCode: 0,
        }),
      });

      const result = await provider.run('test prompt', {});

      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('exitCode');
    });

    it('includes token usage when available', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'api',
        baseUrl: 'https://example.com',
        capabilities: [],
        runner: async () => ({
          raw: '{}',
          parsed: {},
          exitCode: 0,
          tokenUsage: { input: 100, output: 50 },
        }),
      });

      const result = await provider.run('test', {});

      expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    });

    it('calculates cost from token usage', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'api',
        baseUrl: 'https://example.com',
        capabilities: [],
        pricing: { input: 0.001, output: 0.002 }, // per 1K tokens
        runner: async () => ({
          raw: '{}',
          parsed: {},
          exitCode: 0,
          tokenUsage: { input: 1000, output: 500 },
        }),
      });

      const result = await provider.run('test', {});

      expect(result.cost).toBe(0.002); // (1000 * 0.001 + 500 * 0.002) / 1000
    });
  });

  describe('createProviderResult', () => {
    it('creates result with required fields', () => {
      const result = createProviderResult({
        raw: 'output',
        parsed: { data: 'test' },
        exitCode: 0,
      });

      expect(result.raw).toBe('output');
      expect(result.parsed).toEqual({ data: 'test' });
      expect(result.exitCode).toBe(0);
    });

    it('includes optional tokenUsage', () => {
      const result = createProviderResult({
        raw: '',
        parsed: null,
        exitCode: 0,
        tokenUsage: { input: 100, output: 50 },
      });

      expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    });

    it('includes optional cost', () => {
      const result = createProviderResult({
        raw: '',
        parsed: null,
        exitCode: 0,
        cost: 0.05,
      });

      expect(result.cost).toBe(0.05);
    });

    it('defaults tokenUsage to null', () => {
      const result = createProviderResult({
        raw: '',
        parsed: null,
        exitCode: 0,
      });

      expect(result.tokenUsage).toBeNull();
    });

    it('defaults cost to null', () => {
      const result = createProviderResult({
        raw: '',
        parsed: null,
        exitCode: 0,
      });

      expect(result.cost).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('accepts valid CLI config', () => {
      const config = {
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review'],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('accepts valid API config', () => {
      const config = {
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('rejects missing name', () => {
      const config = {
        type: 'cli',
        command: 'test',
      };

      expect(() => validateConfig(config)).toThrow('name is required');
    });

    it('rejects missing type', () => {
      const config = {
        name: 'test',
        command: 'test',
      };

      expect(() => validateConfig(config)).toThrow('type is required');
    });

    it('rejects invalid type', () => {
      const config = {
        name: 'test',
        type: 'invalid',
      };

      expect(() => validateConfig(config)).toThrow('Invalid provider type');
    });

    it('rejects CLI config without command', () => {
      const config = {
        name: 'test',
        type: 'cli',
      };

      expect(() => validateConfig(config)).toThrow('command is required for CLI providers');
    });

    it('rejects API config without baseUrl', () => {
      const config = {
        name: 'test',
        type: 'api',
      };

      expect(() => validateConfig(config)).toThrow('baseUrl is required for API providers');
    });
  });

  describe('PROVIDER_TYPES', () => {
    it('exports CLI type', () => {
      expect(PROVIDER_TYPES.CLI).toBe('cli');
    });

    it('exports API type', () => {
      expect(PROVIDER_TYPES.API).toBe('api');
    });
  });

  describe('provider.type distinguishes cli from api', () => {
    it('CLI provider has type cli', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
      });

      expect(provider.type).toBe('cli');
    });

    it('API provider has type api', () => {
      const provider = createProvider({
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
      });

      expect(provider.type).toBe('api');
    });
  });

  describe('provider.capabilities', () => {
    it('returns capabilities array', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review', 'code-gen', 'refactor'],
      });

      expect(provider.capabilities).toEqual(['review', 'code-gen', 'refactor']);
    });

    it('capabilities is immutable', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review'],
      });

      // Try to mutate - should throw or be ignored
      expect(() => provider.capabilities.push('hack')).toThrow();

      // Original should be unchanged
      expect(provider.capabilities).toEqual(['review']);
    });
  });

  describe('RunOpts', () => {
    it('accepts outputFormat option', async () => {
      let capturedOpts;
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'test',
        runner: async (prompt, opts) => {
          capturedOpts = opts;
          return { raw: '', parsed: null, exitCode: 0 };
        },
      });

      await provider.run('test', { outputFormat: 'json' });

      expect(capturedOpts.outputFormat).toBe('json');
    });

    it('accepts sandbox option', async () => {
      let capturedOpts;
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'test',
        runner: async (prompt, opts) => {
          capturedOpts = opts;
          return { raw: '', parsed: null, exitCode: 0 };
        },
      });

      await provider.run('test', { sandbox: 'read-only' });

      expect(capturedOpts.sandbox).toBe('read-only');
    });

    it('accepts outputSchema option', async () => {
      let capturedOpts;
      const schema = { type: 'object', properties: { result: { type: 'string' } } };
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'test',
        runner: async (prompt, opts) => {
          capturedOpts = opts;
          return { raw: '', parsed: null, exitCode: 0 };
        },
      });

      await provider.run('test', { outputSchema: schema });

      expect(capturedOpts.outputSchema).toEqual(schema);
    });

    it('accepts cwd option', async () => {
      let capturedOpts;
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'test',
        runner: async (prompt, opts) => {
          capturedOpts = opts;
          return { raw: '', parsed: null, exitCode: 0 };
        },
      });

      await provider.run('test', { cwd: '/some/path' });

      expect(capturedOpts.cwd).toBe('/some/path');
    });
  });
});
