import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadRouterConfig,
  validateCapabilities,
  validateProviders,
  getProviderConfig,
  getCapabilityConfig,
  migrateConfig,
  saveRouterConfig,
  defaultConfig,
} from './router-config.js';

vi.mock('fs/promises');
import fs from 'fs/promises';

describe('router-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadRouterConfig', () => {
    it('reads from .tlc.json', async () => {
      const config = {
        router: {
          providers: { claude: { type: 'cli', command: 'claude' } },
          capabilities: { review: { providers: ['claude'] } },
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(config));

      const loaded = await loadRouterConfig('/project');

      expect(fs.readFile).toHaveBeenCalledWith('/project/.tlc.json', 'utf8');
    });

    it('validates schema', async () => {
      const invalidConfig = {
        router: {
          providers: { test: { /* missing type */ } },
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(loadRouterConfig('/project')).rejects.toThrow(/type/i);
    });

    it('merges with defaults', async () => {
      const partialConfig = {
        router: {
          providers: { custom: { type: 'api', baseUrl: 'https://example.com' } },
        },
      };

      fs.readFile.mockResolvedValue(JSON.stringify(partialConfig));

      const loaded = await loadRouterConfig('/project');

      expect(loaded.providers.custom).toBeDefined();
      expect(loaded.providers.claude).toBeDefined(); // From defaults
    });
  });

  describe('validateCapabilities', () => {
    it('checks provider refs', () => {
      const config = {
        providers: { claude: { type: 'cli', command: 'claude' } },
        capabilities: { review: { providers: ['claude'] } },
      };

      expect(() => validateCapabilities(config)).not.toThrow();
    });

    it('throws on invalid provider ref', () => {
      const config = {
        providers: { claude: { type: 'cli', command: 'claude' } },
        capabilities: { review: { providers: ['nonexistent'] } },
      };

      expect(() => validateCapabilities(config)).toThrow(/nonexistent/);
    });
  });

  describe('validateProviders', () => {
    it('checks required fields for CLI', () => {
      const providers = {
        claude: { type: 'cli', command: 'claude' },
      };

      expect(() => validateProviders(providers)).not.toThrow();
    });

    it('throws on missing command for CLI', () => {
      const providers = {
        claude: { type: 'cli' },
      };

      expect(() => validateProviders(providers)).toThrow(/command/i);
    });

    it('checks required fields for API', () => {
      const providers = {
        deepseek: { type: 'api', baseUrl: 'https://api.deepseek.com' },
      };

      expect(() => validateProviders(providers)).not.toThrow();
    });

    it('throws on missing baseUrl for API', () => {
      const providers = {
        deepseek: { type: 'api' },
      };

      expect(() => validateProviders(providers)).toThrow(/baseUrl/i);
    });
  });

  describe('getProviderConfig', () => {
    it('returns provider config', () => {
      const config = {
        providers: {
          claude: { type: 'cli', command: 'claude', capabilities: ['review'] },
        },
      };

      const provider = getProviderConfig(config, 'claude');

      expect(provider.type).toBe('cli');
      expect(provider.command).toBe('claude');
    });

    it('returns null for unknown provider', () => {
      const config = { providers: {} };

      const provider = getProviderConfig(config, 'unknown');

      expect(provider).toBeNull();
    });
  });

  describe('getCapabilityConfig', () => {
    it('returns providers array', () => {
      const config = {
        capabilities: {
          review: { providers: ['claude', 'codex'] },
        },
      };

      const cap = getCapabilityConfig(config, 'review');

      expect(cap.providers).toEqual(['claude', 'codex']);
    });

    it('returns null for unknown capability', () => {
      const config = { capabilities: {} };

      const cap = getCapabilityConfig(config, 'unknown');

      expect(cap).toBeNull();
    });
  });

  describe('migrateConfig', () => {
    it('handles old format', () => {
      const oldConfig = {
        model: 'claude', // Old format
        adapters: { claude: {} },
      };

      const migrated = migrateConfig(oldConfig);

      expect(migrated.providers).toBeDefined();
    });

    it('preserves new format', () => {
      const newConfig = {
        router: {
          providers: { claude: { type: 'cli', command: 'claude' } },
        },
      };

      const migrated = migrateConfig(newConfig);

      expect(migrated.providers.claude.type).toBe('cli');
    });
  });

  describe('defaultConfig', () => {
    it('has sensible defaults', () => {
      expect(defaultConfig.providers).toBeDefined();
      expect(defaultConfig.capabilities).toBeDefined();
      expect(defaultConfig.devserver).toBeDefined();
    });

    it('includes all standard providers', () => {
      expect(defaultConfig.providers.claude).toBeDefined();
      expect(defaultConfig.providers.codex).toBeDefined();
      expect(defaultConfig.providers.gemini).toBeDefined();
      expect(defaultConfig.providers.deepseek).toBeDefined();
    });
  });

  describe('saveRouterConfig', () => {
    it('writes to file', async () => {
      fs.readFile.mockResolvedValue('{}');
      fs.writeFile.mockResolvedValue();

      const config = {
        providers: { claude: { type: 'cli', command: 'claude' } },
      };

      await saveRouterConfig('/project', config);

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('merges with existing config', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify({
        testFrameworks: { primary: 'vitest' },
      }));
      fs.writeFile.mockResolvedValue();

      const routerConfig = {
        providers: { claude: { type: 'cli', command: 'claude' } },
      };

      await saveRouterConfig('/project', routerConfig);

      const writeCall = fs.writeFile.mock.calls[0];
      const written = JSON.parse(writeCall[1]);

      expect(written.testFrameworks.primary).toBe('vitest');
      expect(written.router.providers.claude).toBeDefined();
    });
  });
});
