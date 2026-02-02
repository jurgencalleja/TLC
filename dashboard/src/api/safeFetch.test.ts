import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeFetch, safePost, safePut, safeDelete } from './safeFetch.js';

describe('safeFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('successful requests', () => {
    it('returns data on successful response', async () => {
      const mockData = { message: 'success' };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await safeFetch('/api/test');

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('passes through fetch options', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await safeFetch('/api/test', {
        method: 'POST',
        headers: { 'X-Custom': 'value' },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'X-Custom': 'value' },
        })
      );
    });
  });

  describe('HTTP errors', () => {
    it('handles 404 errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await safeFetch('/api/missing');

      expect(result.status).toBe('error');
      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        type: 'http',
        code: 404,
        message: 'HTTP 404: Not Found',
      });
    });

    it('handles 500 errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await safeFetch('/api/broken');

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('http');
      expect(result.error?.code).toBe(500);
    });

    it('handles 401 unauthorized', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await safeFetch('/api/protected');

      expect(result.error?.type).toBe('http');
      expect(result.error?.code).toBe(401);
    });
  });

  describe('network errors', () => {
    it('handles network failures', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await safeFetch('/api/unreachable');

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('network');
      expect(result.error?.message).toBe('Cannot reach the server');
    });
  });

  describe('timeout handling', () => {
    it('times out after specified duration', async () => {
      // Use AbortError to simulate timeout
      vi.mocked(fetch).mockImplementation(() => {
        const error = new DOMException('Aborted', 'AbortError');
        return Promise.reject(error);
      });

      const result = await safeFetch('/api/slow', { timeout: 100 });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('timeout');
      expect(result.error?.message).toBe('Request timed out');
    });

    it('uses 10s default timeout', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await safeFetch('/api/test');

      // Signal should be passed
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('parse errors', () => {
    it('handles invalid JSON response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      } as Response);

      const result = await safeFetch('/api/bad-json');

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('parse');
      expect(result.error?.message).toBe('Invalid response from server');
    });
  });

  describe('never throws', () => {
    it('always returns FetchResult, never throws', async () => {
      // Various error types
      const errorCases = [
        new Error('Generic error'),
        new TypeError('Type error'),
        'String error',
        undefined,
        null,
      ];

      for (const error of errorCases) {
        vi.mocked(fetch).mockRejectedValue(error);

        // Should not throw
        const result = await safeFetch('/api/test');

        expect(result).toBeDefined();
        expect(result.status).toBe('error');
        expect(result.data).toBeNull();
        expect(result.error).not.toBeNull();
      }
    });
  });
});

describe('safePost', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends POST request with JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    } as Response);

    const body = { name: 'test' };
    await safePost('/api/items', body);

    expect(fetch).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(body),
      })
    );
  });

  it('merges custom headers', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await safePost('/api/items', {}, { headers: { Authorization: 'Bearer token' } });

    expect(fetch).toHaveBeenCalledWith(
      '/api/items',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        }),
      })
    );
  });
});

describe('safePut', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends PUT request with JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ updated: true }),
    } as Response);

    const body = { name: 'updated' };
    await safePut('/api/items/1', body);

    expect(fetch).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      })
    );
  });
});

describe('safeDelete', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends DELETE request', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deleted: true }),
    } as Response);

    await safeDelete('/api/items/1');

    expect(fetch).toHaveBeenCalledWith(
      '/api/items/1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });
});
