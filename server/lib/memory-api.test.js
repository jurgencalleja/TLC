/**
 * @file memory-api.test.js
 * @description Tests for the Memory API endpoint handlers (Phase 74, Task 1).
 *
 * Tests the factory function `createMemoryApi(deps)` which accepts injected
 * dependencies (semanticRecall, vectorIndexer, richCapture, embeddingClient,
 * memoryStore) and returns handler functions for memory-related HTTP endpoints.
 *
 * All handlers accept Express-compatible (req, res) objects and are async.
 * Tests mock the dependencies and req/res objects directly — no Express
 * routing is tested here.
 */
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createMemoryApi } from './memory-api.js';

/**
 * Creates a mock Express request object.
 * @param {object} overrides - Properties to merge into the base request
 * @returns {{ query: object, params: object, body: object }}
 */
function createMockReq(overrides = {}) {
  return { query: {}, params: {}, body: {}, ...overrides };
}

/**
 * Creates a mock Express response object with spy methods.
 * Provides helper accessors `_getJson()` and `_getStatus()` to inspect
 * the first call to `res.json()` and `res.status()` respectively.
 * @returns {object} Mock response with status/json spies
 */
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    _getJson() { return res.json.mock.calls[0]?.[0]; },
    _getStatus() { return res.status.mock.calls[0]?.[0]; },
  };
  return res;
}

/**
 * Creates a full set of mock dependencies for createMemoryApi.
 * Each dependency method is a vi.fn() returning a resolved promise.
 * @returns {object} Mock deps: semanticRecall, vectorIndexer, richCapture, embeddingClient, memoryStore
 */
function createMockDeps() {
  return {
    semanticRecall: {
      recall: vi.fn().mockResolvedValue([]),
    },
    vectorIndexer: {
      indexAll: vi.fn().mockResolvedValue({ indexed: 0 }),
    },
    richCapture: {
      processChunk: vi.fn().mockResolvedValue({ stored: true }),
    },
    embeddingClient: {
      embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    },
    memoryStore: {
      listConversations: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getConversation: vi.fn().mockResolvedValue(null),
      listDecisions: vi.fn().mockResolvedValue([]),
      listGotchas: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ count: 0, size: 0 }),
    },
  };
}

describe('memory-api', () => {
  let api;
  let deps;

  beforeEach(() => {
    deps = createMockDeps();
    api = createMemoryApi(deps);
  });

  describe('handleSearch', () => {
    it('search endpoint returns semantic results', async () => {
      const mockResults = [
        { id: 'r1', text: 'Use JWT for auth', score: 0.92, type: 'decision', date: '2026-01-15', source: 'session', permanent: false },
        { id: 'r2', text: 'Watch for cold starts', score: 0.85, type: 'gotcha', date: '2026-01-14', source: 'session', permanent: true },
      ];
      deps.semanticRecall.recall.mockResolvedValue(mockResults);

      const req = createMockReq({ query: { q: 'authentication' } });
      const res = createMockRes();

      await api.handleSearch(req, res);

      expect(deps.semanticRecall.recall).toHaveBeenCalledWith(
        'authentication',
        expect.anything(),
        expect.anything()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ results: mockResults })
      );
    });

    it('search with scope parameter filters correctly', async () => {
      deps.semanticRecall.recall.mockResolvedValue([]);

      const req = createMockReq({ query: { q: 'database', scope: 'project' } });
      const res = createMockRes();

      await api.handleSearch(req, res);

      expect(deps.semanticRecall.recall).toHaveBeenCalledWith(
        'database',
        expect.anything(),
        expect.objectContaining({ scope: 'project' })
      );
    });

    it('empty search returns empty results', async () => {
      const req = createMockReq({ query: { q: '' } });
      const res = createMockRes();

      await api.handleSearch(req, res);

      const body = res._getJson();
      expect(body.results).toEqual([]);
    });
  });

  describe('handleListConversations', () => {
    it('conversations list returns paginated results', async () => {
      const mockData = {
        items: [
          { id: 'c1', title: 'Session 1', date: '2026-02-01' },
          { id: 'c2', title: 'Session 2', date: '2026-02-02' },
        ],
        total: 25,
      };
      deps.memoryStore.listConversations.mockResolvedValue(mockData);

      const req = createMockReq({ query: { page: '2', limit: '10' } });
      const res = createMockRes();

      await api.handleListConversations(req, res);

      expect(deps.memoryStore.listConversations).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ items: mockData.items, total: 25 })
      );
    });
  });

  describe('handleGetConversation', () => {
    it('conversation detail returns full content', async () => {
      const mockConversation = {
        id: 'conv-42',
        title: 'Auth Architecture Discussion',
        content: '## Decisions made\n- Use JWT tokens\n- Add refresh flow',
        date: '2026-02-10',
        decisions: ['Use JWT', 'Add refresh'],
        files: ['server/lib/auth.js'],
      };
      deps.memoryStore.getConversation.mockResolvedValue(mockConversation);

      const req = createMockReq({ params: { id: 'conv-42' } });
      const res = createMockRes();

      await api.handleGetConversation(req, res);

      expect(deps.memoryStore.getConversation).toHaveBeenCalledWith('conv-42');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'conv-42', content: expect.any(String) })
      );
    });

    it('404 for unknown conversation ID', async () => {
      deps.memoryStore.getConversation.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent-id' } });
      const res = createMockRes();

      await api.handleGetConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('handleListDecisions', () => {
    it('decisions endpoint returns all decisions', async () => {
      const mockDecisions = [
        { id: 'd1', title: 'Use Postgres', date: '2026-01-20' },
        { id: 'd2', title: 'Use REST over GraphQL', date: '2026-01-22' },
      ];
      deps.memoryStore.listDecisions.mockResolvedValue(mockDecisions);

      const req = createMockReq();
      const res = createMockRes();

      await api.handleListDecisions(req, res);

      expect(deps.memoryStore.listDecisions).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ decisions: mockDecisions })
      );
    });
  });

  describe('handleListGotchas', () => {
    it('gotchas endpoint returns all gotchas', async () => {
      const mockGotchas = [
        { id: 'g1', title: 'Auth warmup delay', severity: 'high' },
        { id: 'g2', title: 'DB pool exhaustion', severity: 'medium' },
      ];
      deps.memoryStore.listGotchas.mockResolvedValue(mockGotchas);

      const req = createMockReq();
      const res = createMockRes();

      await api.handleListGotchas(req, res);

      expect(deps.memoryStore.listGotchas).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ gotchas: mockGotchas })
      );
    });
  });

  describe('handleGetStats', () => {
    it('stats endpoint returns vector DB info', async () => {
      const mockStats = {
        count: 1523,
        size: '45MB',
        lastIndexed: '2026-02-14T10:30:00Z',
        model: 'nomic-embed-text',
      };
      deps.memoryStore.getStats.mockResolvedValue(mockStats);

      const req = createMockReq();
      const res = createMockRes();

      await api.handleGetStats(req, res);

      expect(deps.memoryStore.getStats).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1523, model: 'nomic-embed-text' })
      );
    });
  });

  describe('handleRebuild', () => {
    it('rebuild endpoint triggers re-indexing', async () => {
      deps.vectorIndexer.indexAll.mockResolvedValue({ indexed: 347, duration: 12500 });

      const req = createMockReq({ body: { projectRoot: '/path/to/project' } });
      const res = createMockRes();

      await api.handleRebuild(req, res);

      expect(deps.vectorIndexer.indexAll).toHaveBeenCalledWith('/path/to/project');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ indexed: 347 })
      );
    });
  });

  describe('handleRemember', () => {
    it('remember endpoint stores permanent memory', async () => {
      deps.richCapture.processChunk.mockResolvedValue({ stored: true, id: 'mem-99' });

      const req = createMockReq({
        body: {
          text: 'Always run migrations before deploying',
          metadata: { type: 'gotcha', project: 'my-app' },
        },
      });
      const res = createMockRes();

      await api.handleRemember(req, res);

      expect(deps.richCapture.processChunk).toHaveBeenCalledWith(
        'Always run migrations before deploying',
        expect.objectContaining({ permanent: true })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stored: true })
      );
    });
  });

  describe('project filter', () => {
    it('project filter works across endpoints', async () => {
      const projectId = 'proj-abc';

      // Test project filter on conversations
      const convReq = createMockReq({ query: { project: projectId, page: '1', limit: '10' } });
      const convRes = createMockRes();
      await api.handleListConversations(convReq, convRes);
      expect(deps.memoryStore.listConversations).toHaveBeenCalledWith(
        expect.objectContaining({ project: projectId })
      );

      // Test project filter on decisions
      const decReq = createMockReq({ query: { project: projectId } });
      const decRes = createMockRes();
      await api.handleListDecisions(decReq, decRes);
      expect(deps.memoryStore.listDecisions).toHaveBeenCalledWith(
        expect.objectContaining({ project: projectId })
      );

      // Test project filter on gotchas
      const gotReq = createMockReq({ query: { project: projectId } });
      const gotRes = createMockRes();
      await api.handleListGotchas(gotReq, gotRes);
      expect(deps.memoryStore.listGotchas).toHaveBeenCalledWith(
        expect.objectContaining({ project: projectId })
      );
    });
  });
});
