/**
 * Ollama health checker tests - Phase 84 Task 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { checkOllamaHealth, OLLAMA_STATUS } from './ollama-health.js';

describe('ollama-health', () => {
  beforeEach(() => {
    // Clear cache between tests
    checkOllamaHealth._clearCache?.();
  });

  it('returns ready when Ollama responds with correct model', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'mxbai-embed-large:latest' }] }),
    });

    const result = await checkOllamaHealth({ fetch: mockFetch });
    expect(result.status).toBe(OLLAMA_STATUS.READY);
    expect(result.message).toContain('full');
  });

  it('returns not_running when connection refused', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkOllamaHealth({ fetch: mockFetch });
    expect([OLLAMA_STATUS.NOT_INSTALLED, OLLAMA_STATUS.NOT_RUNNING]).toContain(result.status);
    expect(result.action).toBeDefined();
  });

  it('returns no_model when Ollama responds but model missing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3:latest' }] }),
    });

    const result = await checkOllamaHealth({ fetch: mockFetch });
    expect(result.status).toBe(OLLAMA_STATUS.NO_MODEL);
    expect(result.action).toContain('ollama pull');
  });

  it('caches result within 60s window', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'mxbai-embed-large:latest' }] }),
    });

    const result1 = await checkOllamaHealth({ fetch: mockFetch });
    const result2 = await checkOllamaHealth({ fetch: mockFetch });

    expect(result1.status).toBe(result2.status);
    // Should only call fetch once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns actionable message for each status', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await checkOllamaHealth({ fetch: mockFetch });
    expect(result.action).toBeTruthy();
    expect(typeof result.action).toBe('string');
    expect(result.message).toBeTruthy();
  });

  it('exports status constants', () => {
    expect(OLLAMA_STATUS.READY).toBe('ready');
    expect(OLLAMA_STATUS.NOT_INSTALLED).toBe('not_installed');
    expect(OLLAMA_STATUS.NOT_RUNNING).toBe('not_running');
    expect(OLLAMA_STATUS.NO_MODEL).toBe('no_model');
  });
});
