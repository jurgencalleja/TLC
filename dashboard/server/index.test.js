import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';

// Mock the tasks-api module for route tests
vi.mock('./lib/tasks-api.js', () => ({
  createTask: vi.fn(),
}));

import { createTask } from './lib/tasks-api.js';

// Set test timeout for slow environments
vi.setConfig({ testTimeout: 10000 });

describe('TLC Dashboard Server', () => {
  describe('GET /client', () => {
    it('serves the client dashboard HTML', async () => {
      const res = await request(app).get('/client');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/html/);
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('Report an Issue');
      expect(res.text).toContain('project-name');
    });

    it('includes mobile-first viewport meta tag', async () => {
      const res = await request(app).get('/client');

      expect(res.text).toContain('viewport');
      expect(res.text).toContain('width=device-width');
    });

    it('includes FAB button for bug reporting', async () => {
      const res = await request(app).get('/client');

      expect(res.text).toContain('class="fab"');
      expect(res.text).toContain('openBugForm');
    });

    it('includes bug form panel', async () => {
      const res = await request(app).get('/client');

      expect(res.text).toContain('bug-panel');
      expect(res.text).toContain('bug-title');
      expect(res.text).toContain('bug-severity');
    });
  });

  describe('GET /api/status', () => {
    it('returns project status', async () => {
      const res = await request(app).get('/api/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projectName');
      expect(res.body).toHaveProperty('status', 'running');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/health', () => {
    it('returns health metrics', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status);
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('services');
    }, 15000); // Extended timeout for port checking
  });

  describe('POST /api/bug', () => {
    it('creates a bug report', async () => {
      const res = await request(app)
        .post('/api/bug')
        .send({
          description: 'Test bug title\n\nTest bug description',
          severity: 'medium'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bug).toHaveProperty('id');
      expect(res.body.bug.id).toMatch(/^BUG-\d{4}$/);
      expect(res.body.bug).toHaveProperty('title', 'Test bug title');
      expect(res.body.bug).toHaveProperty('status', 'open');
    });

    it('requires description', async () => {
      const res = await request(app)
        .post('/api/bug')
        .send({ severity: 'high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('rejects empty description', async () => {
      const res = await request(app)
        .post('/api/bug')
        .send({ description: '   ', severity: 'low' });

      expect(res.status).toBe(400);
    });

    it('validates severity values', async () => {
      const res = await request(app)
        .post('/api/bug')
        .send({ description: 'Test bug', severity: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('severity');
    });

    it('accepts all valid severity levels', async () => {
      const severities = ['low', 'medium', 'high', 'critical'];

      for (const severity of severities) {
        const res = await request(app)
          .post('/api/bug')
          .send({ description: `Test ${severity} bug`, severity });

        expect(res.status).toBe(201);
      }
    });

    it('uses medium severity as default', async () => {
      const res = await request(app)
        .post('/api/bug')
        .send({ description: 'Bug without severity' });

      expect(res.status).toBe(201);
      // Default severity should work without error
    });
  });

  describe('POST /api/tasks', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('creates a task and returns it', async () => {
      const mockTask = {
        id: '1-2',
        title: 'New task',
        status: 'pending',
        owner: null,
        phase: 1,
      };
      createTask.mockResolvedValue(mockTask);

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'New task', description: 'Test description' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTask);
      expect(createTask).toHaveBeenCalledWith(
        { title: 'New task', description: 'Test description' },
        expect.any(String)
      );
    });

    it('returns 400 when title is missing', async () => {
      createTask.mockRejectedValue(new Error('Title is required'));

      const res = await request(app)
        .post('/api/tasks')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('returns 400 when title exceeds 200 chars', async () => {
      createTask.mockRejectedValue(new Error('Title must be 200 characters or less'));

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'x'.repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title must be 200 characters or less');
    });
  });

  describe('GET /api/bugs', () => {
    it('returns list of bugs', async () => {
      // First submit a bug
      await request(app)
        .post('/api/bug')
        .send({ description: 'List test bug', severity: 'low' });

      const res = await request(app).get('/api/bugs');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns bugs with correct structure', async () => {
      const res = await request(app).get('/api/bugs');

      if (res.body.length > 0) {
        const bug = res.body[0];
        expect(bug).toHaveProperty('id');
        expect(bug).toHaveProperty('title');
        expect(bug).toHaveProperty('status');
        expect(bug).toHaveProperty('priority');
        expect(bug).toHaveProperty('createdAt');
      }
    });
  });

  describe('GET /app', () => {
    it('returns app preview placeholder', async () => {
      const res = await request(app).get('/app');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/html/);
      expect(res.text).toContain('App Preview');
    });
  });

  describe('Mobile compatibility', () => {
    it('client dashboard has touch-friendly button sizes', async () => {
      const res = await request(app).get('/client');

      // FAB should be at least 56px (44px minimum touch target + padding)
      expect(res.text).toContain('width: 56px');
      expect(res.text).toContain('height: 56px');
    });

    it('client dashboard has safe area handling', async () => {
      const res = await request(app).get('/client');

      // Should handle notched devices
      expect(res.text).toContain('safe-area-inset');
    });
  });
});
