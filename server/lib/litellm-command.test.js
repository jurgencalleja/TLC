/**
 * LiteLLM Command Tests
 *
 * CLI commands for LiteLLM management
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  LiteLLMCommand,
  parseArgs,
  formatStatus,
  formatModels,
} = require('./litellm-command.js');

describe('LiteLLM Command', () => {
  let command;
  let mockClient;
  let mockConfig;

  beforeEach(() => {
    mockClient = {
      baseUrl: 'http://localhost:4000',
      _fetch: async () => ({
        ok: true,
        json: async () => ({}),
      }),
    };

    mockConfig = {
      models: {},
      fallbacks: {},
      spendLimits: {
        daily: null,
        monthly: null,
        byModel: {},
        byUser: {},
      },
      baseUrl: 'http://localhost:4000',
      cache: {
        enabled: false,
        ttl: 3600,
      },
    };

    command = new LiteLLMCommand({
      client: mockClient,
      config: mockConfig,
    });
  });

  describe('execute config', () => {
    it('shows current configuration', async () => {
      const result = await command.execute('config');

      assert.ok(result.output);
      assert.ok(result.output.includes('localhost:4000') || result.output.includes('Configuration'));
    });

    it('sets model alias', async () => {
      const result = await command.execute('config --alias fast=anthropic/claude-3-haiku-20240307');

      assert.ok(result.success);
    });

    it('sets fallback chain', async () => {
      const result = await command.execute('config --fallback claude-3-opus=claude-3-sonnet,gpt-4');

      assert.ok(result.success);
    });
  });

  describe('execute status', () => {
    it('shows proxy status', async () => {
      mockClient._fetch = async () => ({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const result = await command.execute('status');

      assert.ok(result.output);
      assert.ok(result.status);
    });

    it('shows usage stats', async () => {
      mockClient._fetch = async (url) => {
        if (url.includes('health')) {
          return { ok: true, json: async () => ({ status: 'healthy' }) };
        }
        return {
          ok: true,
          json: async () => ({
            total_spend: 25.00,
            total_tokens: 100000,
          }),
        };
      };

      const result = await command.execute('status');

      assert.ok(result.output);
    });
  });

  describe('execute models', () => {
    it('lists available models', async () => {
      mockClient._fetch = async () => ({
        ok: true,
        json: async () => ({
          data: [
            { id: 'claude-3-opus', provider: 'anthropic' },
            { id: 'gpt-4', provider: 'openai' },
            { id: 'gemini-pro', provider: 'google' },
          ],
        }),
      });

      const result = await command.execute('models');

      assert.ok(result.output);
      assert.ok(result.models);
      assert.ok(result.models.length >= 1);
    });

    it('filters by provider', async () => {
      mockClient._fetch = async () => ({
        ok: true,
        json: async () => ({
          data: [
            { id: 'claude-3-opus', provider: 'anthropic' },
            { id: 'gpt-4', provider: 'openai' },
          ],
        }),
      });

      const result = await command.execute('models --provider anthropic');

      assert.ok(result.output);
      // Should filter to only anthropic models
      if (result.models) {
        result.models.forEach(m => {
          assert.strictEqual(m.provider, 'anthropic');
        });
      }
    });
  });

  describe('execute test', () => {
    it('sends test request', async () => {
      mockClient._fetch = async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello!' } }],
          usage: { total_tokens: 10 },
        }),
      });

      const result = await command.execute('test --model claude-3-sonnet');

      assert.ok(result.success);
      assert.ok(result.response);
    });

    it('reports test failure', async () => {
      mockClient._fetch = async () => {
        throw new Error('Model not available');
      };

      const result = await command.execute('test --model unknown-model');

      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('parseArgs', () => {
    it('parses config command', () => {
      const parsed = parseArgs('config');

      assert.strictEqual(parsed.command, 'config');
    });

    it('parses alias flag', () => {
      const parsed = parseArgs('config --alias fast=anthropic/claude-3-haiku');

      assert.strictEqual(parsed.command, 'config');
      assert.strictEqual(parsed.alias, 'fast=anthropic/claude-3-haiku');
    });

    it('parses fallback flag', () => {
      const parsed = parseArgs('config --fallback claude-3-opus=claude-3-sonnet,gpt-4');

      assert.strictEqual(parsed.command, 'config');
      assert.strictEqual(parsed.fallback, 'claude-3-opus=claude-3-sonnet,gpt-4');
    });

    it('parses models with provider filter', () => {
      const parsed = parseArgs('models --provider openai');

      assert.strictEqual(parsed.command, 'models');
      assert.strictEqual(parsed.provider, 'openai');
    });

    it('parses test with model', () => {
      const parsed = parseArgs('test --model claude-3-sonnet');

      assert.strictEqual(parsed.command, 'test');
      assert.strictEqual(parsed.model, 'claude-3-sonnet');
    });
  });

  describe('formatStatus', () => {
    it('creates readable status output', () => {
      const status = {
        healthy: true,
        baseUrl: 'http://localhost:4000',
        totalSpend: 25.00,
        totalTokens: 100000,
        modelsAvailable: 5,
      };

      const formatted = formatStatus(status);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('healthy') || formatted.includes('Healthy'));
      assert.ok(formatted.includes('$') || formatted.includes('25'));
    });
  });

  describe('formatModels', () => {
    it('creates readable models list', () => {
      const models = [
        { id: 'claude-3-opus', provider: 'anthropic' },
        { id: 'gpt-4', provider: 'openai' },
      ];

      const formatted = formatModels(models);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('claude-3-opus'));
      assert.ok(formatted.includes('gpt-4'));
    });

    it('groups by provider', () => {
      const models = [
        { id: 'claude-3-opus', provider: 'anthropic' },
        { id: 'claude-3-sonnet', provider: 'anthropic' },
        { id: 'gpt-4', provider: 'openai' },
      ];

      const formatted = formatModels(models, { groupByProvider: true });

      // Provider names are capitalized in output
      assert.ok(formatted.includes('Anthropic'));
      assert.ok(formatted.includes('Openai'));
    });
  });
});
