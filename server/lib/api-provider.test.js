import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIProvider, calculateCost } from './api-provider.js';

describe('API Provider', () => {
  describe('run', () => {
    it('calls baseUrl/v1/chat/completions', async () => {
      const provider = new APIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        apiKey: 'test-key',
      });

      provider._fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      await provider.run('test prompt');

      expect(provider._fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.anything()
      );
    });

    it('sets Authorization header', async () => {
      const provider = new APIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        apiKey: 'test-key-123',
      });

      provider._fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      await provider.run('test prompt');

      expect(provider._fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key-123',
          }),
        })
      );
    });

    it('sends model in body', async () => {
      const provider = new APIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        apiKey: 'test-key',
      });

      let capturedBody;
      provider._fetch = vi.fn().mockImplementation((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'response' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        });
      });

      await provider.run('test prompt');

      expect(capturedBody.model).toBe('deepseek-coder');
    });

    it('includes response_format when schema provided', async () => {
      const provider = new APIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        apiKey: 'test-key',
      });

      let capturedBody;
      provider._fetch = vi.fn().mockImplementation((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '{"result": "test"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        });
      });

      await provider.run('test prompt', {
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
      });

      expect(capturedBody.response_format).toBeDefined();
    });
  });

  describe('parseResponse', () => {
    it('extracts content', async () => {
      const provider = new APIProvider({
        name: 'test',
        baseUrl: 'https://test.com',
        model: 'test',
        apiKey: 'key',
      });

      provider._fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Hello world' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });

      const result = await provider.run('test');

      expect(result.raw).toBe('Hello world');
    });

    it('extracts token usage', async () => {
      const provider = new APIProvider({
        name: 'test',
        baseUrl: 'https://test.com',
        model: 'test',
        apiKey: 'key',
      });

      provider._fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'response' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      });

      const result = await provider.run('test');

      expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    });
  });

  describe('calculateCost', () => {
    it('uses provider pricing', () => {
      const cost = calculateCost(
        { input: 1000, output: 500 },
        { inputPer1k: 0.001, outputPer1k: 0.002 }
      );

      expect(cost).toBe(0.002); // 1000*0.001/1000 + 500*0.002/1000
    });
  });

  describe('Error Handling', () => {
    it('retries on rate limit', async () => {
      const provider = new APIProvider({
        name: 'test',
        baseUrl: 'https://test.com',
        model: 'test',
        apiKey: 'key',
        maxRetries: 3,
      });

      let attempts = 0;
      provider._fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'rate limited' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'success' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
        });
      });

      const result = await provider.run('test');

      expect(attempts).toBe(2);
      expect(result.raw).toBe('success');
    });

    it('handles network errors gracefully', async () => {
      const provider = new APIProvider({
        name: 'test',
        baseUrl: 'https://test.com',
        model: 'test',
        apiKey: 'key',
        maxRetries: 1,
      });

      provider._fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(provider.run('test')).rejects.toThrow(/network/i);
    });
  });

  describe('DeepSeek Support', () => {
    it('supports DeepSeek endpoint', async () => {
      const provider = new APIProvider({
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-coder',
        apiKey: 'test-key',
      });

      provider._fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'code here' } }],
          usage: { prompt_tokens: 50, completion_tokens: 100 },
        }),
      });

      const result = await provider.run('write code');

      expect(result.raw).toBe('code here');
    });
  });
});
