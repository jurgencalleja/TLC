import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRouterAPI,
  handleRun,
  handleTaskStatus,
  handleReview,
  handleDesign,
  handleHealth,
  validateAuth,
  validateRequestBody,
} from './devserver-router-api.js';

// Mock dependencies
vi.mock('./model-router.js', () => ({
  createRouter: vi.fn(),
}));

vi.mock('./provider-queue.js', () => ({
  createQueue: vi.fn(),
}));

import { createRouter } from './model-router.js';
import { createQueue } from './provider-queue.js';

describe('devserver-router-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRouterAPI', () => {
    it('creates API with route handlers', async () => {
      createRouter.mockResolvedValue({ run: vi.fn() });
      createQueue.mockReturnValue({ enqueue: vi.fn() });

      const api = await createRouterAPI({ secret: 'test-secret' });

      expect(api).toBeDefined();
      expect(api.handleRun).toBeDefined();
      expect(api.handleTaskStatus).toBeDefined();
      expect(api.handleReview).toBeDefined();
      expect(api.handleDesign).toBeDefined();
      expect(api.handleHealth).toBeDefined();
    });

    it('initializes router and queue', async () => {
      createRouter.mockResolvedValue({ run: vi.fn() });
      createQueue.mockReturnValue({ enqueue: vi.fn() });

      await createRouterAPI({ secret: 'test-secret' });

      expect(createRouter).toHaveBeenCalled();
      expect(createQueue).toHaveBeenCalled();
    });
  });

  describe('handleRun', () => {
    it('queues task and returns taskId', async () => {
      const mockQueue = {
        enqueue: vi.fn().mockResolvedValue('task-123'),
      };
      const mockRouter = { run: vi.fn() };

      const handler = handleRun(mockRouter, mockQueue);
      const req = {
        body: {
          capability: 'review',
          prompt: 'Review this code',
        },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(mockQueue.enqueue).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-123' })
      );
    });

    it('returns taskId in response', async () => {
      const mockQueue = {
        enqueue: vi.fn().mockResolvedValue('task-456'),
      };
      const mockRouter = { run: vi.fn() };

      const handler = handleRun(mockRouter, mockQueue);
      const req = {
        body: { capability: 'code-gen', prompt: 'Generate code' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ taskId: 'task-456' });
    });
  });

  describe('handleTaskStatus', () => {
    it('returns pending status for queued task', async () => {
      const mockQueue = {
        getTask: vi.fn().mockReturnValue({ status: 'pending' }),
      };

      const handler = handleTaskStatus(mockQueue);
      const req = { params: { taskId: 'task-123' } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('returns completed result for finished task', async () => {
      const mockQueue = {
        getTask: vi.fn().mockReturnValue({
          status: 'completed',
          result: { summary: 'Code looks good' },
        }),
      };

      const handler = handleTaskStatus(mockQueue);
      const req = { params: { taskId: 'task-123' } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          result: { summary: 'Code looks good' },
        })
      );
    });

    it('returns 404 for unknown task', async () => {
      const mockQueue = {
        getTask: vi.fn().mockReturnValue(null),
      };

      const handler = handleTaskStatus(mockQueue);
      const req = { params: { taskId: 'unknown' } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleReview', () => {
    it('runs multiple providers for review', async () => {
      const mockRouter = {
        run: vi.fn().mockResolvedValue([
          { provider: 'claude', success: true, result: { score: 85 } },
          { provider: 'codex', success: true, result: { score: 80 } },
        ]),
      };

      const handler = handleReview(mockRouter);
      const req = {
        body: { code: 'function test() {}', prompt: 'Review this' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(mockRouter.run).toHaveBeenCalledWith(
        'review',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('returns consensus from multiple providers', async () => {
      const mockRouter = {
        run: vi.fn().mockResolvedValue([
          { provider: 'claude', success: true, result: { approved: true } },
          { provider: 'codex', success: true, result: { approved: true } },
          { provider: 'deepseek', success: true, result: { approved: false } },
        ]),
      };

      const handler = handleReview(mockRouter);
      const req = {
        body: { code: 'function test() {}' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          consensus: expect.any(Object),
          results: expect.any(Array),
        })
      );
    });
  });

  describe('handleDesign', () => {
    it('routes to gemini for design', async () => {
      const mockRouter = {
        run: vi.fn().mockResolvedValue([
          { provider: 'gemini', success: true, result: { mockups: [] } },
        ]),
      };

      const handler = handleDesign(mockRouter);
      const req = {
        body: { prompt: 'Design a login page' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(mockRouter.run).toHaveBeenCalledWith(
        'design',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('returns design result', async () => {
      const mockRouter = {
        run: vi.fn().mockResolvedValue([
          {
            provider: 'gemini',
            success: true,
            result: { mockups: ['mockup1.png'], rationale: 'Clean design' },
          },
        ]),
      };

      const handler = handleDesign(mockRouter);
      const req = {
        body: { prompt: 'Design a dashboard' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({ mockups: expect.any(Array) }),
        })
      );
    });
  });

  describe('handleHealth', () => {
    it('shows provider availability', async () => {
      const mockRouter = {
        getStatus: vi.fn().mockReturnValue({
          providers: {
            claude: { detected: true, type: 'cli' },
            codex: { detected: false, type: 'cli' },
            deepseek: { detected: false, type: 'api' },
          },
          devserver: { configured: true },
        }),
      };

      const handler = handleHealth(mockRouter);
      const req = {};
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.any(Object),
          devserver: expect.any(Object),
        })
      );
    });

    it('returns healthy status', async () => {
      const mockRouter = {
        getStatus: vi.fn().mockReturnValue({
          providers: { claude: { detected: true } },
          devserver: { configured: true },
        }),
      };

      const handler = handleHealth(mockRouter);
      const req = {};
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ healthy: true })
      );
    });
  });

  describe('validateAuth', () => {
    it('rejects unauthenticated requests', () => {
      const middleware = validateAuth('secret-key');
      const req = { headers: {} };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts valid auth header', () => {
      const middleware = validateAuth('secret-key');
      const req = {
        headers: { authorization: 'Bearer secret-key' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('rejects invalid auth header', () => {
      const middleware = validateAuth('secret-key');
      const req = {
        headers: { authorization: 'Bearer wrong-key' },
      };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateRequestBody', () => {
    it('validates required fields', () => {
      const middleware = validateRequestBody(['prompt']);
      const req = { body: {} };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes valid body', () => {
      const middleware = validateRequestBody(['prompt']);
      const req = { body: { prompt: 'Test prompt' } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('validates multiple required fields', () => {
      const middleware = validateRequestBody(['prompt', 'capability']);
      const req = { body: { prompt: 'Test' } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
