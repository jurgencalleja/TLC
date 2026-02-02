import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadRouterConfig,
  validateConfig,
  getProviderConfig,
  getCapabilityConfig,
  defaultConfig,
  saveRouterConfig,
} from './router-config.js';

describe('Router Config', () => {
  describe('loadRouterConfig', () => {
    it('reads from .tlc.json', async () => {
      const config = await loadRouterConfig({ _readFile: vi.fn().mockResolvedValue(JSON.stringify({
        router: { providers: { test: { type: 'cli' } } }
      }))});
      expect(config.providers).toHaveProperty('test');
    });

    it('validates schema', async () => {
      const config = await loadRouterConfig({ _readFile: vi.fn().mockResolvedValue(JSON.stringify({
        router: { providers: {} }
      }))});
      expect(config).toBeDefined();
    });

    it('merges defaults', async () => {
      const config = await loadRouterConfig({ _readFile: vi.fn().mockResolvedValue('{}') });
      expect(config.providers).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('checks provider refs', () => {
      const result = validateConfig({
        capabilities: { review: { providers: ['nonexistent'] } },
        providers: {},
      });
      expect(result.valid).toBe(false);
    });

    it('checks required fields', () => {
      const result = validateConfig({
        providers: { test: { type: 'cli' } },
        capabilities: {},
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('getProviderConfig', () => {
    it('returns provider', () => {
      const config = { providers: { claude: { type: 'cli', command: 'claude' } } };
      const provider = getProviderConfig(config, 'claude');
      expect(provider.type).toBe('cli');
    });
  });

  describe('getCapabilityConfig', () => {
    it('returns providers array', () => {
      const config = {
        capabilities: { review: { providers: ['claude', 'codex'] } },
      };
      const cap = getCapabilityConfig(config, 'review');
      expect(cap.providers).toHaveLength(2);
    });
  });

  describe('defaultConfig', () => {
    it('has sensible defaults', () => {
      expect(defaultConfig.providers).toBeDefined();
      expect(defaultConfig.capabilities).toBeDefined();
    });
  });

  describe('saveRouterConfig', () => {
    it('writes to file', async () => {
      const writeFile = vi.fn().mockResolvedValue(undefined);
      await saveRouterConfig({ providers: {} }, { _writeFile: writeFile });
      expect(writeFile).toHaveBeenCalled();
    });
  });
});
