/**
 * LiteLLM Client Tests
 *
 * Client for interacting with LiteLLM proxy
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createClient,
  completion,
  chat,
  getUsage,
  getModels,
  healthCheck,
  setApiKey,
  withFallback,
} = require('./litellm-client.js');

describe('LiteLLM Client', () => {
  let client;

  beforeEach(() => {
    client = createClient({
      baseUrl: 'http://localhost:4000',
    });
  });

  describe('createClient', () => {
    it('creates client with base URL', () => {
      assert.ok(client);
      assert.strictEqual(client.baseUrl, 'http://localhost:4000');
    });

    it('accepts API key', () => {
      const clientWithKey = createClient({
        baseUrl: 'http://localhost:4000',
        apiKey: 'test-key',
      });

      assert.ok(clientWithKey.apiKey);
    });
  });

  describe('completion', () => {
    it('sends completion request', async () => {
      // Mock the fetch for testing
      client._fetch = async (url, options) => ({
        ok: true,
        json: async () => ({
          choices: [{ text: 'Hello world' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      const result = await completion(client, {
        model: 'claude-3-sonnet',
        prompt: 'Say hello',
      });

      assert.ok(result.choices);
      assert.strictEqual(result.choices[0].text, 'Hello world');
    });

    it('includes usage stats', async () => {
      client._fetch = async () => ({
        ok: true,
        json: async () => ({
          choices: [{ text: 'Response' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      });

      const result = await completion(client, {
        model: 'claude-3-sonnet',
        prompt: 'Test',
      });

      assert.ok(result.usage);
      assert.strictEqual(result.usage.total_tokens, 15);
    });
  });

  describe('chat', () => {
    it('sends chat request', async () => {
      client._fetch = async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      const result = await chat(client, {
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      assert.ok(result.choices);
      assert.strictEqual(result.choices[0].message.content, 'Hello!');
    });

    it('handles streaming', async () => {
      let chunks = [];
      client._fetch = async () => ({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (chunks.length < 3) {
                chunks.push({ content: 'chunk' });
                return { done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"chunk"}}]}\n\n') };
              }
              return { done: true };
            },
          }),
        },
      });

      const result = await chat(client, {
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      });

      assert.ok(result.stream || result.choices);
    });
  });

  describe('getUsage', () => {
    it('returns usage statistics', async () => {
      client._fetch = async () => ({
        ok: true,
        json: async () => ({
          total_spend: 15.50,
          total_tokens: 50000,
          by_model: {
            'claude-3-sonnet': { spend: 10.00, tokens: 30000 },
            'gpt-4': { spend: 5.50, tokens: 20000 },
          },
        }),
      });

      const usage = await getUsage(client);

      assert.ok(usage.total_spend >= 0);
      assert.ok(usage.by_model);
    });

    it('filters by date range', async () => {
      let capturedOptions;
      client._fetch = async (url, options) => {
        capturedOptions = { url };
        return {
          ok: true,
          json: async () => ({ total_spend: 5.00, by_model: {} }),
        };
      };

      await getUsage(client, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      assert.ok(capturedOptions.url.includes('start') || capturedOptions.url.includes('2025'));
    });
  });

  describe('getModels', () => {
    it('lists available models', async () => {
      client._fetch = async () => ({
        ok: true,
        json: async () => ({
          data: [
            { id: 'claude-3-opus', provider: 'anthropic' },
            { id: 'gpt-4', provider: 'openai' },
          ],
        }),
      });

      const models = await getModels(client);

      assert.ok(Array.isArray(models));
      assert.ok(models.length > 0);
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status', async () => {
      client._fetch = async () => ({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const health = await healthCheck(client);

      assert.strictEqual(health.status, 'healthy');
    });

    it('returns unhealthy on error', async () => {
      client._fetch = async () => {
        throw new Error('Connection refused');
      };

      const health = await healthCheck(client);

      assert.strictEqual(health.status, 'unhealthy');
    });
  });

  describe('setApiKey', () => {
    it('updates API key', () => {
      setApiKey(client, 'new-key');

      assert.strictEqual(client.apiKey, 'new-key');
    });
  });

  describe('withFallback', () => {
    it('tries fallback on primary failure', async () => {
      let attempts = [];
      client._fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        attempts.push(body.model);

        if (body.model === 'claude-3-opus') {
          throw new Error('Rate limited');
        }

        return {
          ok: true,
          json: async () => ({
            choices: [{ text: 'Response from fallback' }],
          }),
        };
      };

      const result = await withFallback(client, {
        primary: 'claude-3-opus',
        fallbacks: ['claude-3-sonnet', 'gpt-4'],
        request: { prompt: 'Test' },
      });

      assert.ok(attempts.includes('claude-3-opus'));
      assert.ok(attempts.includes('claude-3-sonnet'));
      assert.ok(result.choices);
    });

    it('returns error if all models fail', async () => {
      client._fetch = async () => {
        throw new Error('All models unavailable');
      };

      try {
        await withFallback(client, {
          primary: 'claude-3-opus',
          fallbacks: ['claude-3-sonnet'],
          request: { prompt: 'Test' },
        });
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(err.message.includes('unavailable') || err.message.includes('failed'));
      }
    });
  });
});
