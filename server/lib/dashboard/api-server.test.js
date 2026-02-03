/**
 * Dashboard API Server Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createApiServer, mountRoutes, handleError, corsMiddleware, requestLogger, createErrorResponse } from './api-server.js';

describe('api-server', () => {
  describe('createApiServer', () => {
    it('creates Express app', () => {
      const app = createApiServer({ basePath: '/test' });
      expect(app.listen).toBeDefined();
      expect(app.use).toBeDefined();
    });

    it('mounts API routes', () => {
      const app = createApiServer({ basePath: '/test' });
      // Routes should be mounted at /api/*
      expect(app._router).toBeDefined();
    });
  });

  describe('mountRoutes', () => {
    it('mounts tasks API', () => {
      const mockApp = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
      mountRoutes(mockApp, { basePath: '/test' });
      expect(mockApp.get).toHaveBeenCalledWith('/api/tasks', expect.any(Function));
      expect(mockApp.post).toHaveBeenCalledWith('/api/tasks', expect.any(Function));
    });

    it('mounts health API', () => {
      const mockApp = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
      mountRoutes(mockApp, { basePath: '/test' });
      expect(mockApp.get).toHaveBeenCalledWith('/api/health', expect.any(Function));
    });

    it('mounts notes API', () => {
      const mockApp = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
      mountRoutes(mockApp, { basePath: '/test' });
      expect(mockApp.get).toHaveBeenCalledWith('/api/notes', expect.any(Function));
      expect(mockApp.put).toHaveBeenCalledWith('/api/notes', expect.any(Function));
    });

    it('mounts router API', () => {
      const mockApp = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
      mountRoutes(mockApp, { basePath: '/test' });
      expect(mockApp.get).toHaveBeenCalledWith('/api/router/status', expect.any(Function));
    });
  });

  describe('handleError', () => {
    it('returns error response', () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const error = new Error('Test error');
      handleError(error, {}, mockRes, () => {});
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('uses error status code', () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const error = new Error('Not found');
      error.statusCode = 404;
      handleError(error, {}, mockRes, () => {});
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('hides stack trace in production', () => {
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const error = new Error('Error');
      handleError(error, {}, mockRes, () => {}, { env: 'production' });
      const response = mockRes.json.mock.calls[0][0];
      expect(response.stack).toBeUndefined();
    });
  });

  describe('corsMiddleware', () => {
    it('sets CORS headers', () => {
      const mockRes = {
        header: vi.fn()
      };
      const mockNext = vi.fn();
      corsMiddleware({}, mockRes, mockNext);
      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('handles preflight requests', () => {
      const mockReq = { method: 'OPTIONS' };
      const mockRes = {
        header: vi.fn(),
        sendStatus: vi.fn()
      };
      corsMiddleware(mockReq, mockRes, () => {});
      expect(mockRes.sendStatus).toHaveBeenCalledWith(200);
    });

    it('allows configurable origins', () => {
      const mockRes = { header: vi.fn() };
      const mockNext = vi.fn();
      corsMiddleware({}, mockRes, mockNext, { origin: 'http://localhost:3000' });
      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
    });
  });

  describe('requestLogger', () => {
    it('logs requests', () => {
      const mockLogger = { info: vi.fn() };
      const mockReq = { method: 'GET', url: '/api/tasks' };
      const mockRes = { on: vi.fn() };
      const mockNext = vi.fn();

      requestLogger(mockReq, mockRes, mockNext, { logger: mockLogger });
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('logs response time', () => {
      const mockLogger = { info: vi.fn() };
      const mockReq = { method: 'GET', url: '/test' };
      let finishCallback;
      const mockRes = {
        on: vi.fn((event, cb) => { if (event === 'finish') finishCallback = cb; }),
        statusCode: 200
      };

      requestLogger(mockReq, mockRes, () => {}, { logger: mockLogger });
      finishCallback();
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('createErrorResponse', () => {
    it('creates standard error format', () => {
      const response = createErrorResponse('Not found', 404);
      expect(response.error).toBe('Not found');
      expect(response.statusCode).toBe(404);
    });

    it('includes timestamp', () => {
      const response = createErrorResponse('Error');
      expect(response.timestamp).toBeDefined();
    });
  });
});
