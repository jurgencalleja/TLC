/**
 * API Adapter Tests
 *
 * HTTP adapter for OpenAI-compatible APIs (LiteLLM, direct).
 */
import { describe, it, expect, vi } from 'vitest';

const {
  buildRequest,
  parseApiResponse,
  createAdapter,
} = require('./api-adapter.js');

describe('API Adapter', () => {
  describe('buildRequest', () => {
    it('sends correct HTTP request body', () => {
      const req = buildRequest('Review code', {
        url: 'http://localhost:4000/v1/chat/completions',
        model: 'gpt-4o',
      });

      expect(req.url).toBe('http://localhost:4000/v1/chat/completions');
      expect(req.body.model).toBe('gpt-4o');
      expect(req.body.messages).toBeDefined();
      expect(req.body.messages[0].content).toContain('Review code');
    });

    it('includes auth header from config', () => {
      const req = buildRequest('prompt', {
        url: 'http://api.example.com/v1/chat/completions',
        model: 'gpt-4o',
        apiKey: 'sk-test-key',
      });

      expect(req.headers['Authorization']).toBe('Bearer sk-test-key');
    });

    it('respects timeout', () => {
      const req = buildRequest('prompt', {
        url: 'http://localhost:4000/v1/chat/completions',
        model: 'gpt-4o',
        timeout: 30000,
      });

      expect(req.timeout).toBe(30000);
    });
  });

  describe('parseApiResponse', () => {
    it('parses OpenAI-format response', () => {
      const apiResp = {
        choices: [{ message: { content: '{"findings": [], "summary": "Clean"}' } }],
        model: 'gpt-4o',
        usage: { total_tokens: 500 },
      };

      const result = parseApiResponse(apiResp);
      expect(result.response).toContain('Clean');
      expect(result.model).toBe('gpt-4o');
      expect(result.tokens).toBe(500);
    });

    it('handles rate limiting (429)', () => {
      const result = parseApiResponse(null, { status: 429 });
      expect(result.error).toBeDefined();
      expect(result.retryable).toBe(true);
    });
  });

  describe('createAdapter', () => {
    it('implements execute interface', () => {
      const adapter = createAdapter({
        url: 'http://localhost:4000/v1/chat/completions',
        model: 'gpt-4o',
      });

      expect(adapter.name).toBe('api');
      expect(adapter.execute).toBeDefined();
    });
  });
});
