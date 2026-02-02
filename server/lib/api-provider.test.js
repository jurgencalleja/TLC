import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAPIProvider,
  callAPI,
  parseResponse,
  calculateCost,
  API_PRICING,
} from './api-provider.js';

// Mock fetch
global.fetch = vi.fn();

describe('api-provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAPIProvider', () => {
    it('creates provider with API type', () => {
      const provider = createAPIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        capabilities: ['review'],
      });

      expect(provider.type).toBe('api');
      expect(provider.name).toBe('deepseek');
    });

    it('sets devserverOnly to true by default', () => {
      const provider = createAPIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
      });

      expect(provider.devserverOnly).toBe(true);
    });

    it('stores baseUrl and model', () => {
      const provider = createAPIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
      });

      expect(provider.baseUrl).toBe('https://api.deepseek.com');
      expect(provider.model).toBe('deepseek-coder');
    });
  });

  describe('callAPI', () => {
    it('calls baseUrl/v1/chat/completions', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"result": "ok"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      await callAPI({
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        prompt: 'test',
        apiKey: 'sk-test',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('sets Authorization header', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      await callAPI({
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        prompt: 'test',
        apiKey: 'sk-test-key',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
          }),
        })
      );
    });

    it('sends model in body', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      await callAPI({
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        prompt: 'test',
        apiKey: 'sk-test',
      });

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.model).toBe('deepseek-coder');
    });

    it('includes response_format when schema provided', async () => {
      const schema = {
        type: 'object',
        properties: {
          result: { type: 'string' },
        },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"result": "ok"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      await callAPI({
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        prompt: 'test',
        apiKey: 'sk-test',
        outputSchema: schema,
      });

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.response_format).toBeDefined();
      expect(body.response_format.type).toBe('json_schema');
    });
  });

  describe('parseResponse', () => {
    it('extracts content from response', () => {
      const response = {
        choices: [{ message: { content: '{"result": "ok"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      };

      const result = parseResponse(response);

      expect(result.raw).toBe('{"result": "ok"}');
    });

    it('extracts token usage', () => {
      const response = {
        choices: [{ message: { content: '{}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      };

      const result = parseResponse(response);

      expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    });

    it('parses JSON content', () => {
      const response = {
        choices: [{ message: { content: '{"score": 85}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      };

      const result = parseResponse(response);

      expect(result.parsed).toEqual({ score: 85 });
    });

    it('handles non-JSON content', () => {
      const response = {
        choices: [{ message: { content: 'Plain text response' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      };

      const result = parseResponse(response);

      expect(result.raw).toBe('Plain text response');
      expect(result.parsed).toBeNull();
    });
  });

  describe('calculateCost', () => {
    it('uses provider pricing', () => {
      const cost = calculateCost(
        { input: 1000, output: 500 },
        { input: 0.001, output: 0.002 }
      );

      // (1000 * 0.001 + 500 * 0.002) / 1000 = 0.002
      expect(cost).toBeCloseTo(0.002);
    });

    it('handles zero tokens', () => {
      const cost = calculateCost(
        { input: 0, output: 0 },
        { input: 0.001, output: 0.002 }
      );

      expect(cost).toBe(0);
    });

    it('returns null when no pricing', () => {
      const cost = calculateCost({ input: 1000, output: 500 }, null);

      expect(cost).toBeNull();
    });
  });

  describe('rate limit handling', () => {
    it('retries on rate limit', async () => {
      let attempts = 0;
      global.fetch.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: { get: () => '1' }, // Retry-After
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '{}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        });
      });

      const result = await callAPI({
        baseUrl: 'https://api.example.com',
        model: 'test',
        prompt: 'test',
        apiKey: 'sk-test',
        retryDelay: 10,
      });

      expect(attempts).toBe(2);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await callAPI({
        baseUrl: 'https://api.example.com',
        model: 'test',
        prompt: 'test',
        apiKey: 'sk-test',
        maxRetries: 1,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    });

    it('handles API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: { message: 'Server error' } }),
      });

      const result = await callAPI({
        baseUrl: 'https://api.example.com',
        model: 'test',
        prompt: 'test',
        apiKey: 'sk-test',
        maxRetries: 1,
      });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('DeepSeek support', () => {
    it('supports DeepSeek endpoint', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"review": "LGTM"}' } }],
          usage: { prompt_tokens: 500, completion_tokens: 100 },
        }),
      });

      const result = await callAPI({
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        prompt: 'Review this code',
        apiKey: 'sk-deepseek-key',
      });

      expect(result.parsed).toEqual({ review: 'LGTM' });
      expect(result.tokenUsage).toEqual({ input: 500, output: 100 });
    });
  });

  describe('API_PRICING', () => {
    it('has pricing for deepseek', () => {
      expect(API_PRICING.deepseek).toBeDefined();
      expect(API_PRICING.deepseek.input).toBeDefined();
      expect(API_PRICING.deepseek.output).toBeDefined();
    });

    it('has pricing for mistral', () => {
      expect(API_PRICING.mistral).toBeDefined();
    });

    it('has default pricing', () => {
      expect(API_PRICING.default).toBeDefined();
    });
  });
});
