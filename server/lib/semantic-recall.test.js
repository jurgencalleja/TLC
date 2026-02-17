/**
 * Semantic Recall Tests
 * Tests for semantically searching and ranking memory results
 * using vector similarity, recency, and project relevance.
 *
 * Scoring formula:
 *   vectorSimilarity * 0.5 + recency * 0.25 + projectRelevance * 0.25
 *   Permanent memories boosted 1.2x
 *   Deduplication by id (keep highest score)
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { createSemanticRecall } from './semantic-recall.js';

/**
 * Creates a mock embedding client that returns deterministic embeddings.
 * @returns {object} Mock embedding client with vi.fn() methods
 */
function createMockEmbeddingClient() {
  return {
    embed: vi.fn().mockResolvedValue(new Float32Array(1024).fill(0.5)),
    embedBatch: vi.fn().mockResolvedValue([]),
    isAvailable: vi.fn().mockResolvedValue(true),
    getModelInfo: () => ({ model: 'mxbai-embed-large', dimensions: 1024 }),
  };
}

/**
 * Creates a mock vector store that tracks all search calls.
 * @returns {object} Mock vector store with vi.fn() methods
 */
function createMockVectorStore() {
  return {
    insert: vi.fn(),
    search: vi.fn().mockReturnValue([]),
    delete: vi.fn(),
    count: vi.fn().mockReturnValue(0),
    rebuild: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    close: vi.fn(),
  };
}

/**
 * Creates a mock search result entry.
 * @param {object} overrides - Properties to override
 * @returns {object} A mock search result
 */
function createMockResult(overrides = {}) {
  return {
    id: 'mem-1',
    text: 'Use Postgres for production',
    type: 'decision',
    project: 'my-project',
    workspace: '/ws',
    branch: 'main',
    timestamp: Date.now() - 86400000, // 1 day ago
    sourceFile: 'decisions/use-postgres.md',
    permanent: false,
    similarity: 0.92,
    ...overrides,
  };
}

describe('semantic-recall', () => {
  let mockVectorStore;
  let mockEmbeddingClient;
  let recall;

  beforeEach(() => {
    mockVectorStore = createMockVectorStore();
    mockEmbeddingClient = createMockEmbeddingClient();
    recall = createSemanticRecall({
      vectorStore: mockVectorStore,
      embeddingClient: mockEmbeddingClient,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recall', () => {
    it('returns semantically similar results for a query', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-1', text: 'Use Postgres for production', similarity: 0.92 }),
        createMockResult({ id: 'mem-2', text: 'Postgres JSONB for flexible schema', similarity: 0.85 }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('database choice', context);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('type');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('date');
      expect(results[0]).toHaveProperty('permanent');
      expect(mockEmbeddingClient.embed).toHaveBeenCalledWith('database choice');
      expect(mockVectorStore.search).toHaveBeenCalled();
    });

    it('calls vectorStore.search with (embedding, {limit}) not ({embedding, limit})', async () => {
      const mockResults = [createMockResult()];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      await recall.recall('test query', context, { limit: 5 });

      // The first argument must be the embedding (Float32Array), not an object
      const firstArg = mockVectorStore.search.mock.calls[0][0];
      expect(firstArg).toBeInstanceOf(Float32Array);

      // The second argument must be the options object with limit
      const secondArg = mockVectorStore.search.mock.calls[0][1];
      expect(secondArg).toHaveProperty('limit');
      expect(typeof secondArg.limit).toBe('number');
    });

    it('sorts results by combined score highest first', async () => {
      // mem-1: high similarity but old (low recency)
      // mem-2: moderate similarity but recent (high recency)
      // mem-3: low similarity, same project (high project relevance)
      const now = Date.now();
      const mockResults = [
        createMockResult({
          id: 'mem-1',
          text: 'Old but relevant',
          similarity: 0.95,
          timestamp: now - 30 * 86400000, // 30 days ago
          project: 'other-project',
        }),
        createMockResult({
          id: 'mem-2',
          text: 'Recent and moderately relevant',
          similarity: 0.70,
          timestamp: now - 3600000, // 1 hour ago
          project: 'my-project',
        }),
        createMockResult({
          id: 'mem-3',
          text: 'Medium all around',
          similarity: 0.80,
          timestamp: now - 7 * 86400000, // 7 days ago
          project: 'my-project',
        }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('something', context);

      expect(results).toHaveLength(3);
      // Results should be sorted descending by combined score
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('filters to current project only with project scope', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-1', project: 'my-project', similarity: 0.90 }),
        createMockResult({ id: 'mem-2', project: 'other-project', similarity: 0.88 }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { scope: 'project' });

      // Only results matching the current project should be returned
      const projectIds = results.map((r) => r.source?.project || r.id);
      expect(results.length).toBeLessThanOrEqual(mockResults.length);
      // Every result should belong to 'my-project'
      results.forEach((r) => {
        // The result set should not contain 'other-project' entries
        expect(r.id).not.toBe('mem-2');
      });
    });

    it('includes workspace-level memories with workspace scope', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-1', project: 'my-project', workspace: '/ws', similarity: 0.90 }),
        createMockResult({ id: 'mem-2', project: 'other-project', workspace: '/ws', similarity: 0.85 }),
        createMockResult({ id: 'mem-3', project: 'outside-project', workspace: '/other-ws', similarity: 0.80 }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { scope: 'workspace' });

      // Should include mem-1 and mem-2 (same workspace) but not mem-3 (different workspace)
      const ids = results.map((r) => r.id);
      expect(ids).toContain('mem-1');
      expect(ids).toContain('mem-2');
      expect(ids).not.toContain('mem-3');
    });

    it('searches everything with global scope (no project/workspace filter)', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-1', project: 'project-a', workspace: '/ws-a', similarity: 0.90 }),
        createMockResult({ id: 'mem-2', project: 'project-b', workspace: '/ws-b', similarity: 0.85 }),
        createMockResult({ id: 'mem-3', project: 'project-c', workspace: '/ws-c', similarity: 0.80 }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { scope: 'global' });

      // All results should be present regardless of project or workspace
      expect(results).toHaveLength(3);
      const ids = results.map((r) => r.id);
      expect(ids).toContain('mem-1');
      expect(ids).toContain('mem-2');
      expect(ids).toContain('mem-3');
    });

    it('auto-widens from project to workspace when few results (<3)', async () => {
      // First call (project scope) returns only 2 results
      // Second call (widened to workspace) returns more
      const projectResults = [
        createMockResult({ id: 'mem-1', project: 'my-project', workspace: '/ws', similarity: 0.90 }),
      ];
      const workspaceResults = [
        createMockResult({ id: 'mem-1', project: 'my-project', workspace: '/ws', similarity: 0.90 }),
        createMockResult({ id: 'mem-2', project: 'other-project', workspace: '/ws', similarity: 0.85 }),
        createMockResult({ id: 'mem-3', project: 'other-project', workspace: '/ws', similarity: 0.80 }),
      ];

      // The store returns all results; filtering happens in recall
      // On first pass with project scope only 1 matches, so it widens
      mockVectorStore.search.mockReturnValue(workspaceResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      // Default scope is 'project', which should auto-widen
      const results = await recall.recall('query', context, { scope: 'project' });

      // After auto-widening, should have more than the 1 project-only result
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('boosts permanent memories by 1.2x', async () => {
      const now = Date.now();
      const mockResults = [
        createMockResult({
          id: 'mem-ephemeral',
          text: 'Ephemeral memory',
          similarity: 0.90,
          permanent: false,
          timestamp: now - 86400000,
          project: 'my-project',
        }),
        createMockResult({
          id: 'mem-permanent',
          text: 'Permanent memory',
          similarity: 0.90,
          permanent: true,
          timestamp: now - 86400000,
          project: 'my-project',
        }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { scope: 'global' });

      const ephemeral = results.find((r) => r.id === 'mem-ephemeral');
      const permanent = results.find((r) => r.id === 'mem-permanent');

      expect(ephemeral).toBeDefined();
      expect(permanent).toBeDefined();
      // Permanent should have a higher score due to the 1.2x boost
      expect(permanent.score).toBeGreaterThan(ephemeral.score);
    });

    it('respects minScore threshold', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-high', similarity: 0.95, project: 'my-project' }),
        createMockResult({ id: 'mem-mid', similarity: 0.60, project: 'my-project' }),
        createMockResult({ id: 'mem-low', similarity: 0.20, project: 'my-project' }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { minScore: 0.5, scope: 'global' });

      // All returned results should have a combined score >= 0.5
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0.5);
      });
      // The low-similarity result should be filtered out
      const ids = results.map((r) => r.id);
      expect(ids).not.toContain('mem-low');
    });

    it('respects limit option', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-1', similarity: 0.95, project: 'my-project' }),
        createMockResult({ id: 'mem-2', similarity: 0.90, project: 'my-project' }),
        createMockResult({ id: 'mem-3', similarity: 0.85, project: 'my-project' }),
        createMockResult({ id: 'mem-4', similarity: 0.80, project: 'my-project' }),
        createMockResult({ id: 'mem-5', similarity: 0.75, project: 'my-project' }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { limit: 2, scope: 'global' });

      expect(results).toHaveLength(2);
    });

    it('falls back to empty results when vector store returns nothing and embedding fails', async () => {
      mockVectorStore.search.mockReturnValue([]);
      mockEmbeddingClient.embed.mockResolvedValue(null);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('some query', context);

      expect(results).toEqual([]);
    });

    it('deduplicates overlapping results by id keeping highest score', async () => {
      const now = Date.now();
      const mockResults = [
        createMockResult({
          id: 'mem-dup',
          text: 'Duplicate entry version A',
          similarity: 0.90,
          timestamp: now - 86400000,
          project: 'my-project',
        }),
        createMockResult({
          id: 'mem-dup',
          text: 'Duplicate entry version B',
          similarity: 0.70,
          timestamp: now - 3600000,
          project: 'my-project',
        }),
        createMockResult({
          id: 'mem-unique',
          text: 'Unique entry',
          similarity: 0.80,
          timestamp: now - 86400000,
          project: 'my-project',
        }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('query', context, { scope: 'global' });

      // Should only have 2 unique ids
      const ids = results.map((r) => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(2);
      expect(ids).toHaveLength(2);

      // The duplicate should keep the higher-scoring version
      const dupResult = results.find((r) => r.id === 'mem-dup');
      expect(dupResult).toBeDefined();
      // The one with similarity 0.90 should win
      expect(dupResult.text).toBe('Duplicate entry version A');
    });

    it('returns empty results for an empty query', async () => {
      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('', context);

      expect(results).toEqual([]);
      // Should not call the vector store or embedding client for empty queries
      expect(mockVectorStore.search).not.toHaveBeenCalled();
      expect(mockEmbeddingClient.embed).not.toHaveBeenCalled();
    });

    it('calculates combined score correctly using the formula', async () => {
      // Score = vectorSimilarity * 0.5 + recency * 0.25 + projectRelevance * 0.25
      // We need to verify the math with known values
      const now = Date.now();
      const mockResults = [
        createMockResult({
          id: 'mem-verify',
          text: 'Verify scoring',
          similarity: 0.80,
          // Very recent: recency should be close to 1.0
          timestamp: now - 60000, // 1 minute ago
          project: 'my-project', // Same project as context: projectRelevance = 1.0
          permanent: false,
        }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recall('scoring test', context, { scope: 'global' });

      expect(results).toHaveLength(1);
      const result = results[0];

      // vectorSimilarity = 0.80, recency ~= 1.0 (very recent), projectRelevance = 1.0
      // Expected score ~= 0.80 * 0.5 + 1.0 * 0.25 + 1.0 * 0.25 = 0.40 + 0.25 + 0.25 = 0.90
      // Allow some tolerance for recency calculation (timestamp-based)
      expect(result.score).toBeGreaterThan(0.85);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it('filters by type when types option is provided', async () => {
      const mockResults = [
        createMockResult({ id: 'mem-decision', type: 'decision', similarity: 0.90, project: 'my-project' }),
        createMockResult({ id: 'mem-convo', type: 'conversation', similarity: 0.88, project: 'my-project' }),
        createMockResult({ id: 'mem-gotcha', type: 'gotcha', similarity: 0.85, project: 'my-project' }),
      ];
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };

      // Filter to only decisions
      const decisionsOnly = await recall.recall('query', context, {
        types: ['decision'],
        scope: 'global',
      });
      expect(decisionsOnly.every((r) => r.type === 'decision')).toBe(true);
      expect(decisionsOnly).toHaveLength(1);

      // Filter to decisions and conversations
      const mixed = await recall.recall('query', context, {
        types: ['decision', 'conversation'],
        scope: 'global',
      });
      expect(mixed.every((r) => ['decision', 'conversation'].includes(r.type))).toBe(true);
      expect(mixed).toHaveLength(2);
    });
  });

  describe('recallForContext', () => {
    it('returns top-K results for context injection with default of 5', async () => {
      const now = Date.now();
      const mockResults = [];
      for (let i = 0; i < 10; i++) {
        mockResults.push(
          createMockResult({
            id: `mem-${i}`,
            text: `Memory entry ${i}`,
            similarity: 0.95 - i * 0.05,
            timestamp: now - i * 86400000,
            project: 'my-project',
          })
        );
      }
      mockVectorStore.search.mockReturnValue(mockResults);

      const context = { projectId: 'my-project', workspace: '/ws', branch: 'main', touchedFiles: [] };
      const results = await recall.recallForContext('/path/to/project', context);

      // Default top-K should be 5
      expect(results).toHaveLength(5);
      // Results should be sorted by score descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });
  });
});
