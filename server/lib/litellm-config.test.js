/**
 * LiteLLM Config Tests
 *
 * Configuration management for LiteLLM proxy
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createConfig,
  setModelAlias,
  getModelAlias,
  setFallbackChain,
  getFallbackChain,
  setSpendLimit,
  getSpendLimit,
  setBaseUrl,
  getBaseUrl,
  enableCache,
  disableCache,
  isCacheEnabled,
  exportConfig,
  importConfig,
} = require('./litellm-config.js');

describe('LiteLLM Config', () => {
  let config;

  beforeEach(() => {
    config = createConfig();
  });

  describe('createConfig', () => {
    it('creates default config', () => {
      assert.ok(config);
      assert.ok(config.models);
      assert.ok(config.fallbacks);
    });

    it('has default base URL', () => {
      const baseUrl = getBaseUrl(config);
      assert.ok(baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));
    });
  });

  describe('setModelAlias', () => {
    it('maps logical name to provider model', () => {
      setModelAlias(config, {
        alias: 'fast',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
      });

      const resolved = getModelAlias(config, 'fast');
      assert.strictEqual(resolved.provider, 'anthropic');
      assert.strictEqual(resolved.model, 'claude-3-haiku-20240307');
    });

    it('supports multiple aliases', () => {
      setModelAlias(config, { alias: 'fast', provider: 'anthropic', model: 'claude-3-haiku-20240307' });
      setModelAlias(config, { alias: 'smart', provider: 'anthropic', model: 'claude-3-opus-20240229' });

      assert.ok(getModelAlias(config, 'fast'));
      assert.ok(getModelAlias(config, 'smart'));
    });
  });

  describe('getModelAlias', () => {
    it('returns null for unknown alias', () => {
      const resolved = getModelAlias(config, 'nonexistent');
      assert.strictEqual(resolved, null);
    });

    it('resolves nested aliases', () => {
      setModelAlias(config, { alias: 'default', provider: 'anthropic', model: 'claude-3-sonnet-20240229' });

      const resolved = getModelAlias(config, 'default');
      assert.ok(resolved);
    });
  });

  describe('setFallbackChain', () => {
    it('sets ordered fallback models', () => {
      setFallbackChain(config, {
        primary: 'claude-3-opus',
        fallbacks: ['claude-3-sonnet', 'gpt-4', 'gemini-pro'],
      });

      const chain = getFallbackChain(config, 'claude-3-opus');
      assert.deepStrictEqual(chain, ['claude-3-sonnet', 'gpt-4', 'gemini-pro']);
    });

    it('allows empty fallback', () => {
      setFallbackChain(config, {
        primary: 'claude-3-haiku',
        fallbacks: [],
      });

      const chain = getFallbackChain(config, 'claude-3-haiku');
      assert.deepStrictEqual(chain, []);
    });
  });

  describe('getFallbackChain', () => {
    it('returns empty array for unknown model', () => {
      const chain = getFallbackChain(config, 'unknown-model');
      assert.deepStrictEqual(chain, []);
    });
  });

  describe('setSpendLimit', () => {
    it('sets daily spend limit', () => {
      setSpendLimit(config, {
        type: 'daily',
        limit: 50.00,
      });

      const limit = getSpendLimit(config, { type: 'daily' });
      assert.strictEqual(limit, 50.00);
    });

    it('sets per-model spend limit', () => {
      setSpendLimit(config, {
        type: 'model',
        model: 'claude-3-opus',
        limit: 100.00,
      });

      const limit = getSpendLimit(config, { type: 'model', model: 'claude-3-opus' });
      assert.strictEqual(limit, 100.00);
    });

    it('sets per-user spend limit', () => {
      setSpendLimit(config, {
        type: 'user',
        user: 'developer-1',
        limit: 25.00,
      });

      const limit = getSpendLimit(config, { type: 'user', user: 'developer-1' });
      assert.strictEqual(limit, 25.00);
    });
  });

  describe('getSpendLimit', () => {
    it('returns null for unset limit', () => {
      const limit = getSpendLimit(config, { type: 'daily' });
      assert.strictEqual(limit, null);
    });
  });

  describe('setBaseUrl', () => {
    it('updates proxy URL', () => {
      setBaseUrl(config, 'http://litellm.example.com:4000');

      const url = getBaseUrl(config);
      assert.strictEqual(url, 'http://litellm.example.com:4000');
    });
  });

  describe('enableCache', () => {
    it('enables response caching', () => {
      enableCache(config, { ttl: 3600 });

      assert.strictEqual(isCacheEnabled(config), true);
    });
  });

  describe('disableCache', () => {
    it('disables response caching', () => {
      enableCache(config, { ttl: 3600 });
      disableCache(config);

      assert.strictEqual(isCacheEnabled(config), false);
    });
  });

  describe('exportConfig', () => {
    it('exports as YAML string', () => {
      setModelAlias(config, { alias: 'fast', provider: 'anthropic', model: 'claude-3-haiku-20240307' });

      const yaml = exportConfig(config, { format: 'yaml' });

      assert.ok(typeof yaml === 'string');
      assert.ok(yaml.includes('fast'));
    });

    it('exports as JSON string', () => {
      setModelAlias(config, { alias: 'fast', provider: 'anthropic', model: 'claude-3-haiku-20240307' });

      const json = exportConfig(config, { format: 'json' });

      const parsed = JSON.parse(json);
      assert.ok(parsed.models);
    });
  });

  describe('importConfig', () => {
    it('imports from JSON', () => {
      const jsonConfig = JSON.stringify({
        models: { fast: { provider: 'openai', model: 'gpt-4' } },
        baseUrl: 'http://custom:8000',
      });

      const imported = importConfig(jsonConfig, { format: 'json' });

      assert.ok(imported.models);
      assert.strictEqual(getBaseUrl(imported), 'http://custom:8000');
    });
  });
});
