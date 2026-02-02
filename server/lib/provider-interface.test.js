import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProvider,
  validateProviderConfig,
  ProviderType,
} from './provider-interface.js';

describe('Provider Interface', () => {
  describe('createProvider', () => {
    it('creates CLI provider with correct type', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review', 'code-gen'],
      });

      expect(provider.name).toBe('claude');
      expect(provider.type).toBe('cli');
    });

    it('creates API provider with correct type', () => {
      const provider = createProvider({
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      });

      expect(provider.name).toBe('deepseek');
      expect(provider.type).toBe('api');
    });

    it('throws on invalid type', () => {
      expect(() =>
        createProvider({
          name: 'test',
          type: 'invalid',
          capabilities: [],
        })
      ).toThrow(/invalid.*type/i);
    });

    it('provider.run returns ProviderResult shape', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'cli',
        command: 'echo',
        capabilities: ['test'],
      });

      provider._execute = vi.fn().mockResolvedValue({
        raw: '{"result": "test"}',
        parsed: { result: 'test' },
        exitCode: 0,
        tokenUsage: { input: 10, output: 5 },
        cost: 0.0001,
      });

      const result = await provider.run('test prompt');

      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('parsed');
      expect(result).toHaveProperty('exitCode');
      expect(result).toHaveProperty('tokenUsage');
      expect(result).toHaveProperty('cost');
    });

    it('ProviderResult includes token usage', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'api',
        baseUrl: 'https://test.com',
        model: 'test',
        capabilities: ['test'],
      });

      provider._execute = vi.fn().mockResolvedValue({
        raw: 'response',
        parsed: null,
        exitCode: 0,
        tokenUsage: { input: 100, output: 50 },
        cost: 0.001,
      });

      const result = await provider.run('test');

      expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    });

    it('ProviderResult calculates cost', async () => {
      const provider = createProvider({
        name: 'mock',
        type: 'api',
        baseUrl: 'https://test.com',
        model: 'test',
        capabilities: ['test'],
        pricing: { inputPer1k: 0.001, outputPer1k: 0.002 },
      });

      provider._execute = vi.fn().mockResolvedValue({
        raw: 'response',
        parsed: null,
        exitCode: 0,
        tokenUsage: { input: 1000, output: 500 },
        cost: 0.002,
      });

      const result = await provider.run('test');

      expect(result.cost).toBe(0.002);
    });

    it('provider.capabilities returns array', () => {
      const provider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review', 'code-gen', 'refactor'],
      });

      expect(provider.capabilities).toEqual(['review', 'code-gen', 'refactor']);
    });

    it('provider.type distinguishes cli from api', () => {
      const cliProvider = createProvider({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review'],
      });

      const apiProvider = createProvider({
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      });

      expect(cliProvider.type).toBe('cli');
      expect(apiProvider.type).toBe('api');
    });
  });

  describe('validateProviderConfig', () => {
    it('rejects missing name', () => {
      const result = validateProviderConfig({
        type: 'cli',
        command: 'claude',
        capabilities: ['review'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('rejects missing type', () => {
      const result = validateProviderConfig({
        name: 'test',
        command: 'claude',
        capabilities: ['review'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('type is required');
    });

    it('rejects CLI without command', () => {
      const result = validateProviderConfig({
        name: 'test',
        type: 'cli',
        capabilities: ['review'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('command is required for CLI providers');
    });

    it('rejects API without baseUrl', () => {
      const result = validateProviderConfig({
        name: 'test',
        type: 'api',
        model: 'test',
        capabilities: ['review'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl is required for API providers');
    });

    it('accepts valid CLI config', () => {
      const result = validateProviderConfig({
        name: 'claude',
        type: 'cli',
        command: 'claude',
        capabilities: ['review', 'code-gen'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid API config', () => {
      const result = validateProviderConfig({
        name: 'deepseek',
        type: 'api',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ProviderType', () => {
    it('exports CLI constant', () => {
      expect(ProviderType.CLI).toBe('cli');
    });

    it('exports API constant', () => {
      expect(ProviderType.API).toBe('api');
    });
  });
});
