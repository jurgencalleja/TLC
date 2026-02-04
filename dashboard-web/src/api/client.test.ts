import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiClient, type ApiClient } from './client';

describe('api/client', () => {
  let client: ApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    client = createApiClient({ baseUrl: 'http://localhost:3001' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createApiClient', () => {
    it('creates client with default options', () => {
      const defaultClient = createApiClient();
      expect(defaultClient).toBeDefined();
      expect(defaultClient.get).toBeInstanceOf(Function);
      expect(defaultClient.post).toBeInstanceOf(Function);
    });

    it('creates client with custom baseUrl', () => {
      const customClient = createApiClient({ baseUrl: 'http://api.example.com' });
      expect(customClient).toBeDefined();
    });
  });

  describe('get', () => {
    it('makes GET request to correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await client.get('/api/status');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/status',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns parsed JSON response', async () => {
      const mockData = { name: 'TLC', version: '2.0' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await client.get('/api/project');

      expect(result).toEqual(mockData);
    });

    it('includes default headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/data');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('throws ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Resource not found' }),
      });

      await expect(client.get('/api/missing')).rejects.toThrow('Resource not found');
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/api/data')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('makes POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const body = { name: 'Test Task', status: 'pending' };
      await client.post('/api/tasks', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });

    it('returns response data', async () => {
      const responseData = { id: '123', name: 'Test Task' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await client.post('/api/tasks', { name: 'Test Task' });

      expect(result).toEqual(responseData);
    });
  });

  describe('put', () => {
    it('makes PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      });

      const body = { status: 'completed' };
      await client.put('/api/tasks/123', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('delete', () => {
    it('makes DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      });

      await client.delete('/api/tasks/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('includes status code in error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      try {
        await client.get('/api/data');
      } catch (error: unknown) {
        expect((error as { status?: number }).status).toBe(500);
      }
    });

    it('handles JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.get('/api/data')).rejects.toThrow();
    });
  });

  describe('request options', () => {
    it('allows custom headers per request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/data', {
        headers: { Authorization: 'Bearer token123' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
          }),
        })
      );
    });

    it('supports abort signal', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/data', { signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });
});
