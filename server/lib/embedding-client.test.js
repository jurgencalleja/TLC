/**
 * Embedding Client Tests
 * Tests for Ollama-based embedding client with graceful degradation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEmbeddingClient } from './embedding-client.js';

describe('embedding-client', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    client = createEmbeddingClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('embed', () => {
    it('embeds text and returns Float32Array', async () => {
      const mockEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding],
        }),
      });

      const result = await client.embed('hello world');

      expect(result).toBeInstanceOf(Float32Array);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embed',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.model).toBe('mxbai-embed-large');
      expect(body.input).toBe('hello world');
    });

    it('returns correct dimensions for mxbai-embed-large (1024)', async () => {
      const mockEmbedding = Array.from({ length: 1024 }, () => Math.random());

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding],
        }),
      });

      const result = await client.embed('test text');

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(1024);
    });

    it('returns null on connection failure (graceful degradation)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await client.embed('some text');

      expect(result).toBeNull();
    });

    it('returns null for empty text', async () => {
      const result = await client.embed('');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('truncates text exceeding token limit (8192 tokens ~ 32768 chars)', async () => {
      const longText = 'a'.repeat(40000);
      const mockEmbedding = Array.from({ length: 1024 }, () => 0.5);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding],
        }),
      });

      await client.embed(longText);

      expect(global.fetch).toHaveBeenCalled();
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.input.length).toBeLessThanOrEqual(32768);
    });

    it('handles Ollama API error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'model not found' }),
      });

      const result = await client.embed('test');

      expect(result).toBeNull();
    });

    it('times out after 30s default', async () => {
      global.fetch = vi.fn().mockImplementation((url, opts) => {
        // Verify that an AbortSignal is passed for timeout control
        expect(opts.signal).toBeDefined();
        return new Promise((_, reject) => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });

      const result = await client.embed('test');

      expect(result).toBeNull();
    });
  });

  describe('embedBatch', () => {
    it('batch embed processes multiple texts', async () => {
      const mockEmbedding1 = Array.from({ length: 1024 }, () => 0.1);
      const mockEmbedding2 = Array.from({ length: 1024 }, () => 0.2);
      const mockEmbedding3 = Array.from({ length: 1024 }, () => 0.3);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding1, mockEmbedding2, mockEmbedding3],
        }),
      });

      const results = await client.embedBatch(['text one', 'text two', 'text three']);

      expect(results).toHaveLength(3);
    });

    it('batch embed returns array of Float32Arrays', async () => {
      const mockEmbedding1 = Array.from({ length: 1024 }, () => 0.1);
      const mockEmbedding2 = Array.from({ length: 1024 }, () => 0.2);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding1, mockEmbedding2],
        }),
      });

      const results = await client.embedBatch(['hello', 'world']);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(1024);
      });
    });
  });

  describe('isAvailable', () => {
    it('returns true when Ollama is running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          models: [{ name: 'mxbai-embed-large', size: 670000000 }],
        }),
      });

      const available = await client.isAvailable();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('returns false when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const available = await client.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    it('returns model name and dimensions', () => {
      const info = client.getModelInfo();

      expect(info).toEqual({
        model: 'mxbai-embed-large',
        dimensions: 1024,
      });
    });
  });

  describe('configuration', () => {
    it('respects configurable model name', async () => {
      const customClient = createEmbeddingClient({ model: 'nomic-embed-text' });
      const mockEmbedding = Array.from({ length: 768 }, () => 0.5);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding],
        }),
      });

      await customClient.embed('test');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.model).toBe('nomic-embed-text');
    });

    it('respects configurable host', async () => {
      const customClient = createEmbeddingClient({ host: 'http://ollama.local:11434' });
      const mockEmbedding = Array.from({ length: 1024 }, () => 0.5);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embeddings: [mockEmbedding],
        }),
      });

      await customClient.embed('test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ollama.local:11434/api/embed',
        expect.any(Object)
      );
    });
  });
});
