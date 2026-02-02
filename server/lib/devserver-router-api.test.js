import { describe, it, expect, vi } from 'vitest';
import {
  handleRun,
  handleTask,
  handleReview,
  handleDesign,
  handleHealth,
} from './devserver-router-api.js';

describe('Devserver Router API', () => {
  describe('POST /api/run', () => {
    it('queues task', async () => {
      const req = { body: { provider: 'claude', prompt: 'test' } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      
      await handleRun(req, res, { queue: { enqueue: vi.fn().mockReturnValue('task-1') } });
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1' }));
    });

    it('returns taskId', async () => {
      const req = { body: { provider: 'claude', prompt: 'test' } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      
      await handleRun(req, res, { queue: { enqueue: vi.fn().mockReturnValue('abc123') } });
      
      expect(res.json).toHaveBeenCalledWith({ taskId: 'abc123' });
    });
  });

  describe('GET /api/task/:taskId', () => {
    it('returns pending status', async () => {
      const req = { params: { taskId: 'task-1' } };
      const res = { json: vi.fn() };
      
      await handleTask(req, res, { queue: { getTask: vi.fn().mockReturnValue({ status: 'pending' }) } });
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    it('returns completed result', async () => {
      const req = { params: { taskId: 'task-1' } };
      const res = { json: vi.fn() };
      
      await handleTask(req, res, { 
        queue: { getTask: vi.fn().mockReturnValue({ status: 'completed', result: { data: 'test' } }) } 
      });
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        status: 'completed',
        result: { data: 'test' }
      }));
    });
  });

  describe('POST /api/review', () => {
    it('runs multiple providers', async () => {
      const req = { body: { code: 'test code' } };
      const res = { json: vi.fn() };
      const runProvider = vi.fn().mockResolvedValue({ parsed: { score: 80 } });
      
      await handleReview(req, res, { runProvider, providers: ['claude', 'codex'] });
      
      expect(runProvider).toHaveBeenCalledTimes(2);
    });

    it('returns consensus', async () => {
      const req = { body: { code: 'test code' } };
      const res = { json: vi.fn() };
      const runProvider = vi.fn().mockResolvedValue({ parsed: { score: 80, approved: true } });
      
      await handleReview(req, res, { runProvider, providers: ['claude'] });
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ consensus: expect.anything() }));
    });
  });

  describe('POST /api/design', () => {
    it('routes to gemini', async () => {
      const req = { body: { description: 'design a button' } };
      const res = { json: vi.fn() };
      const runProvider = vi.fn().mockResolvedValue({ parsed: { mockups: [] } });
      
      await handleDesign(req, res, { runProvider });
      
      expect(runProvider).toHaveBeenCalledWith('gemini', expect.anything());
    });
  });

  describe('GET /api/health', () => {
    it('shows provider status', async () => {
      const req = {};
      const res = { json: vi.fn() };
      
      await handleHealth(req, res, { 
        getProviderStatus: vi.fn().mockReturnValue({ claude: 'available', codex: 'unavailable' })
      });
      
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        providers: expect.anything() 
      }));
    });
  });

  describe('Authentication', () => {
    it('rejects unauthenticated requests', async () => {
      const req = { headers: {} };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      
      await handleRun(req, res, { requireAuth: true });
      
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Validation', () => {
    it('validates request body', async () => {
      const req = { body: {} };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
      
      await handleRun(req, res, { queue: { enqueue: vi.fn() } });
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
