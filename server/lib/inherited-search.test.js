/**
 * Inherited Search Tests
 *
 * Tests for inheritance-aware semantic search that wraps semantic-recall
 * to search across project and workspace scopes with score adjustment,
 * deduplication, and auto-widening.
 *
 * @module inherited-search.test
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { createInheritedSearch } from './inherited-search.js';

/**
 * Creates a mock semantic recall instance with vi.fn() methods.
 * @returns {object} Mock semantic recall
 */
function createMockSemanticRecall() {
  return {
    recall: vi.fn().mockResolvedValue([]),
    recallForContext: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Creates a mock workspace detector instance.
 * @returns {object} Mock workspace detector
 */
function createMockWorkspaceDetector() {
  return {
    detectWorkspace: vi.fn().mockReturnValue({
      isInWorkspace: true,
      workspaceRoot: '/ws',
      projectPath: '/ws/my-project',
      relativeProjectPath: 'my-project',
    }),
  };
}

/**
 * Creates a mock vector indexer instance.
 * @returns {object} Mock vector indexer
 */
function createMockVectorIndexer() {
  return {
    indexAll: vi.fn().mockResolvedValue({ indexed: 0, skipped: 0, errors: 0 }),
    indexFile: vi.fn().mockResolvedValue({ success: true }),
    indexChunk: vi.fn().mockResolvedValue({ success: true }),
    isIndexed: vi.fn().mockResolvedValue(false),
    rebuildIndex: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock search result.
 * @param {object} overrides - Properties to override
 * @returns {object} Mock search result matching semantic-recall output shape
 */
function createResult(overrides = {}) {
  return {
    id: 'mem-1',
    text: 'Some memory text',
    score: 0.85,
    type: 'decision',
    source: {
      project: 'my-project',
      workspace: '/ws/my-project',
      branch: 'main',
      sourceFile: 'decisions/something.md',
    },
    date: Date.now() - 86400000,
    permanent: false,
    ...overrides,
  };
}

describe('inherited-search', () => {
  let mockSemanticRecall;
  let mockWorkspaceDetector;
  let mockVectorIndexer;
  let search;

  beforeEach(() => {
    mockSemanticRecall = createMockSemanticRecall();
    mockWorkspaceDetector = createMockWorkspaceDetector();
    mockVectorIndexer = createMockVectorIndexer();
    search = createInheritedSearch({
      semanticRecall: mockSemanticRecall,
      workspaceDetector: mockWorkspaceDetector,
      vectorIndexer: mockVectorIndexer,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('project-scope search returns project memories only', async () => {
      const projectResults = [
        createResult({ id: 'p-1', score: 0.90 }),
        createResult({ id: 'p-2', score: 0.80 }),
        createResult({ id: 'p-3', score: 0.70 }),
      ];
      mockSemanticRecall.recall.mockResolvedValue(projectResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'project' });

      // Should call recall with scope 'project'
      expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
        'query',
        context,
        expect.objectContaining({ scope: 'project' }),
      );
      // Should return project results unmodified (no score adjustment)
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('p-1');
      expect(results[0].score).toBe(0.90);
    });

    it('auto-widens to workspace when project returns < 3 results', async () => {
      const projectResults = [
        createResult({ id: 'p-1', score: 0.90 }),
        createResult({ id: 'p-2', score: 0.80 }),
      ];
      const workspaceResults = [
        createResult({ id: 'ws-1', score: 0.75 }),
        createResult({ id: 'ws-2', score: 0.65 }),
        createResult({ id: 'ws-3', score: 0.55 }),
      ];

      // First call (project scope) returns < 3 results
      // Second call (workspace scope) returns more results
      mockSemanticRecall.recall
        .mockResolvedValueOnce(projectResults)
        .mockResolvedValueOnce(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'project' });

      // Should have called recall twice: once for project, once for workspace
      expect(mockSemanticRecall.recall).toHaveBeenCalledTimes(2);
      expect(mockSemanticRecall.recall).toHaveBeenNthCalledWith(
        1,
        'query',
        context,
        expect.objectContaining({ scope: 'project' }),
      );
      expect(mockSemanticRecall.recall).toHaveBeenNthCalledWith(
        2,
        'query',
        expect.anything(),
        expect.objectContaining({ scope: 'workspace' }),
      );

      // Should include both project results (full score) and workspace results (0.8x)
      expect(results.length).toBeGreaterThan(2);
    });

    it('workspace results scored 0.8x lower than project results', async () => {
      const projectResults = [
        createResult({ id: 'p-1', score: 0.90 }),
      ];
      const workspaceResults = [
        createResult({ id: 'ws-1', score: 0.80 }),
      ];

      mockSemanticRecall.recall
        .mockResolvedValueOnce(projectResults)
        .mockResolvedValueOnce(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'project' });

      // Project result keeps original score
      const projectResult = results.find((r) => r.id === 'p-1');
      expect(projectResult.score).toBe(0.90);

      // Workspace result gets 0.8x multiplier
      const wsResult = results.find((r) => r.id === 'ws-1');
      expect(wsResult.score).toBeCloseTo(0.80 * 0.8, 5);
    });

    it('explicit inherited scope searches both project and workspace', async () => {
      const projectResults = [
        createResult({ id: 'p-1', score: 0.90 }),
        createResult({ id: 'p-2', score: 0.85 }),
        createResult({ id: 'p-3', score: 0.80 }),
      ];
      const workspaceResults = [
        createResult({ id: 'ws-1', score: 0.75 }),
      ];

      mockSemanticRecall.recall
        .mockResolvedValueOnce(projectResults)
        .mockResolvedValueOnce(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'inherited' });

      // Should always call recall twice for inherited scope
      expect(mockSemanticRecall.recall).toHaveBeenCalledTimes(2);
      expect(mockSemanticRecall.recall).toHaveBeenNthCalledWith(
        1,
        'query',
        context,
        expect.objectContaining({ scope: 'project' }),
      );
      expect(mockSemanticRecall.recall).toHaveBeenNthCalledWith(
        2,
        'query',
        expect.anything(),
        expect.objectContaining({ scope: 'workspace' }),
      );

      // All results should be present (project at full score, workspace at 0.8x)
      expect(results).toHaveLength(4);
    });

    it('deduplication across scopes keeps higher-scoring entry', async () => {
      // Same id appears in both project (high score) and workspace (lower score after 0.8x)
      const projectResults = [
        createResult({ id: 'shared-1', score: 0.70 }),
      ];
      const workspaceResults = [
        createResult({ id: 'shared-1', score: 0.95 }), // after 0.8x = 0.76
      ];

      mockSemanticRecall.recall
        .mockResolvedValueOnce(projectResults)
        .mockResolvedValueOnce(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'inherited' });

      // Should have only one entry for shared-1
      const shared = results.filter((r) => r.id === 'shared-1');
      expect(shared).toHaveLength(1);

      // Workspace version after 0.8x = 0.76, project version = 0.70
      // The workspace version (0.76) should win because it's higher after multiplier
      expect(shared[0].score).toBeCloseTo(0.95 * 0.8, 5);
    });

    it('standalone project does not search workspace', async () => {
      // Workspace detector returns standalone (not in workspace)
      mockWorkspaceDetector.detectWorkspace.mockReturnValue({
        isInWorkspace: false,
        workspaceRoot: null,
        projectPath: '/standalone-project',
        relativeProjectPath: null,
      });

      const projectResults = [
        createResult({ id: 'p-1', score: 0.90 }),
      ];
      mockSemanticRecall.recall.mockResolvedValue(projectResults);

      const context = { projectId: 'my-project', workspace: '/standalone-project' };
      const results = await search.search('query', context, { scope: 'inherited' });

      // For standalone projects, should only call recall once (project scope only)
      expect(mockSemanticRecall.recall).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('p-1');
    });

    it('combined ranking sorts correctly across scopes', async () => {
      const projectResults = [
        createResult({ id: 'p-1', score: 0.60 }),
        createResult({ id: 'p-2', score: 0.50 }),
      ];
      const workspaceResults = [
        createResult({ id: 'ws-1', score: 0.90 }), // after 0.8x = 0.72
        createResult({ id: 'ws-2', score: 0.70 }), // after 0.8x = 0.56
      ];

      mockSemanticRecall.recall
        .mockResolvedValueOnce(projectResults)
        .mockResolvedValueOnce(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'inherited' });

      // Expected order: ws-1(0.72), p-1(0.60), ws-2(0.56), p-2(0.50)
      expect(results).toHaveLength(4);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
      expect(results[0].id).toBe('ws-1');
      expect(results[1].id).toBe('p-1');
      expect(results[2].id).toBe('ws-2');
      expect(results[3].id).toBe('p-2');
    });

    it('returns empty when no results from any scope', async () => {
      mockSemanticRecall.recall.mockResolvedValue([]);

      const context = { projectId: 'my-project', workspace: '/ws/my-project' };
      const results = await search.search('query', context, { scope: 'inherited' });

      expect(results).toEqual([]);
    });
  });

  describe('indexAll', () => {
    it('processes workspace memory path when in workspace', async () => {
      mockWorkspaceDetector.detectWorkspace.mockReturnValue({
        isInWorkspace: true,
        workspaceRoot: '/ws',
        projectPath: '/ws/my-project',
        relativeProjectPath: 'my-project',
      });

      mockVectorIndexer.indexAll.mockResolvedValue({ indexed: 5, skipped: 0, errors: 0 });

      const result = await search.indexAll('/ws/my-project');

      // Should index both the project path and the workspace root
      expect(mockVectorIndexer.indexAll).toHaveBeenCalledTimes(2);
      expect(mockVectorIndexer.indexAll).toHaveBeenCalledWith('/ws/my-project');
      expect(mockVectorIndexer.indexAll).toHaveBeenCalledWith('/ws');
    });

    it('processes only project path for standalone', async () => {
      mockWorkspaceDetector.detectWorkspace.mockReturnValue({
        isInWorkspace: false,
        workspaceRoot: null,
        projectPath: '/standalone-project',
        relativeProjectPath: null,
      });

      mockVectorIndexer.indexAll.mockResolvedValue({ indexed: 3, skipped: 0, errors: 0 });

      const result = await search.indexAll('/standalone-project');

      // Should only index the project path (no workspace)
      expect(mockVectorIndexer.indexAll).toHaveBeenCalledTimes(1);
      expect(mockVectorIndexer.indexAll).toHaveBeenCalledWith('/standalone-project');
    });
  });
});
