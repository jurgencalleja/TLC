/**
 * Recall Command Tests
 *
 * Tests for /tlc:recall — semantic search command for querying memory.
 * "What did we decide about X?" Returns ranked results with similarity
 * scores, supports scope/type/limit options, and falls back to text
 * search when the vector store is unavailable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRecallCommand } from './recall-command.js';

/**
 * Creates a mock semanticRecall dependency with a vi.fn() recall method.
 * Returns configurable results so each test can set its own scenario.
 *
 * @param {Array} [results=[]] - Default results the recall method returns
 * @returns {object} Mock semanticRecall with a `recall` method
 */
function createMockSemanticRecall(results = []) {
  return {
    recall: vi.fn().mockResolvedValue(results),
  };
}

/**
 * Creates a single mock recall result entry.
 *
 * @param {object} overrides - Properties to override on the default result
 * @returns {object} A mock recall result
 */
function createMockResult(overrides = {}) {
  return {
    id: 'mem-1',
    text: 'Use SQLite for vector storage because it is lightweight and embeddable',
    score: 0.92,
    type: 'decision',
    source: {
      project: 'my-project',
      workspace: '/ws',
      branch: 'main',
      sourceFile: 'memory/decisions/use-sqlite.md',
    },
    date: Date.now() - 86400000,
    permanent: false,
    ...overrides,
  };
}

describe('recall-command', () => {
  let mockSemanticRecall;
  let recallCmd;

  beforeEach(() => {
    mockSemanticRecall = createMockSemanticRecall();
    recallCmd = createRecallCommand({
      semanticRecall: mockSemanticRecall,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns relevant results for a query', async () => {
    const mockResults = [
      createMockResult({ id: 'mem-1', text: 'Use SQLite for vector storage', score: 0.92 }),
      createMockResult({ id: 'mem-2', text: 'Postgres for production data', score: 0.85 }),
    ];
    mockSemanticRecall.recall.mockResolvedValue(mockResults);

    const result = await recallCmd.execute('/project', {
      query: 'database architecture',
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'database architecture',
      expect.objectContaining({}),
      expect.objectContaining({}),
    );
  });

  it('results include title, date, score, type, excerpt', async () => {
    const now = Date.now();
    const mockResults = [
      createMockResult({
        id: 'mem-1',
        text: 'Use SQLite for vector storage because it is lightweight and embeddable',
        score: 0.92,
        type: 'decision',
        date: now - 86400000,
        source: {
          project: 'my-project',
          workspace: '/ws',
          branch: 'main',
          sourceFile: 'memory/decisions/use-sqlite.md',
        },
        permanent: false,
      }),
    ];
    mockSemanticRecall.recall.mockResolvedValue(mockResults);

    const result = await recallCmd.execute('/project', {
      query: 'vector storage',
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);

    const entry = result.results[0];
    expect(entry).toHaveProperty('title');
    expect(entry).toHaveProperty('date');
    expect(entry).toHaveProperty('score');
    expect(entry).toHaveProperty('type');
    expect(entry).toHaveProperty('excerpt');
    expect(entry.type).toBe('decision');
    expect(entry.score).toBe(0.92);
  });

  it('score displayed as percentage in formatted output', async () => {
    const mockResults = [
      createMockResult({ score: 0.92 }),
    ];
    mockSemanticRecall.recall.mockResolvedValue(mockResults);

    const result = await recallCmd.execute('/project', {
      query: 'database architecture',
    });

    expect(result.success).toBe(true);
    expect(result.formatted).toBeDefined();
    // 0.92 should appear as "92%" in the formatted output
    expect(result.formatted).toMatch(/92%/);
  });

  it('--scope flag filters correctly (passes scope to semanticRecall)', async () => {
    mockSemanticRecall.recall.mockResolvedValue([]);

    await recallCmd.execute('/project', {
      query: 'test query',
      scope: 'workspace',
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ scope: 'workspace' }),
    );

    // Test with project scope
    await recallCmd.execute('/project', {
      query: 'test query',
      scope: 'project',
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ scope: 'project' }),
    );

    // Test with global scope
    await recallCmd.execute('/project', {
      query: 'test query',
      scope: 'global',
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ scope: 'global' }),
    );
  });

  it('--type flag filters correctly (passes types to semanticRecall)', async () => {
    mockSemanticRecall.recall.mockResolvedValue([]);

    await recallCmd.execute('/project', {
      query: 'test query',
      types: ['decision'],
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ types: ['decision'] }),
    );

    // Test with multiple types
    await recallCmd.execute('/project', {
      query: 'test query',
      types: ['decision', 'gotcha'],
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ types: ['decision', 'gotcha'] }),
    );
  });

  it('--limit flag respected', async () => {
    mockSemanticRecall.recall.mockResolvedValue([]);

    await recallCmd.execute('/project', {
      query: 'test query',
      limit: 3,
    });

    expect(mockSemanticRecall.recall).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({}),
      expect.objectContaining({ limit: 3 }),
    );
  });

  it('falls back gracefully when semanticRecall returns empty', async () => {
    mockSemanticRecall.recall.mockResolvedValue([]);

    const result = await recallCmd.execute('/project', {
      query: 'nonexistent topic',
    });

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.formatted).toBeDefined();
    // Should contain a helpful "no results" message
    expect(result.formatted).toMatch(/no (results|memories|matches)/i);
  });

  it('source file path shown in results', async () => {
    const mockResults = [
      createMockResult({
        source: {
          project: 'my-project',
          workspace: '/ws',
          branch: 'main',
          sourceFile: 'memory/decisions/use-sqlite.md',
        },
      }),
    ];
    mockSemanticRecall.recall.mockResolvedValue(mockResults);

    const result = await recallCmd.execute('/project', {
      query: 'sqlite',
    });

    expect(result.results[0]).toHaveProperty('sourceFile');
    expect(result.results[0].sourceFile).toBe('memory/decisions/use-sqlite.md');
    // Source file should also appear in the formatted output
    expect(result.formatted).toContain('memory/decisions/use-sqlite.md');
  });

  it('permanent items marked with indicator in formatted output', async () => {
    const mockResults = [
      createMockResult({ id: 'mem-perm', permanent: true, score: 0.95 }),
      createMockResult({ id: 'mem-temp', permanent: false, score: 0.80 }),
    ];
    mockSemanticRecall.recall.mockResolvedValue(mockResults);

    const result = await recallCmd.execute('/project', {
      query: 'something',
    });

    expect(result.results).toHaveLength(2);

    const permResult = result.results.find((r) => r.permanent === true);
    const tempResult = result.results.find((r) => r.permanent === false);
    expect(permResult).toBeDefined();
    expect(tempResult).toBeDefined();

    // The formatted output should contain an indicator for the permanent item
    // Common indicators: [PERMANENT], pin emoji, star, etc.
    expect(result.formatted).toMatch(/permanent|\[PERMANENT\]|pinned/i);
  });

  it('empty/no results returns helpful message', async () => {
    mockSemanticRecall.recall.mockResolvedValue([]);

    const result = await recallCmd.execute('/project', {
      query: 'completely unrelated topic xyz',
    });

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.formatted).toBeDefined();
    expect(result.formatted.length).toBeGreaterThan(0);
    // Should not just be empty — should tell the user nothing was found
    expect(result.formatted).toMatch(/no (results|memories|matches)|nothing found/i);
  });

  it('empty query returns usage help', async () => {
    const result = await recallCmd.execute('/project', {
      query: '',
    });

    expect(result.success).toBe(false);
    expect(result.formatted).toBeDefined();
    // Should contain usage instructions
    expect(result.formatted).toMatch(/usage|query|provide/i);
    // semanticRecall should NOT be called for empty queries
    expect(mockSemanticRecall.recall).not.toHaveBeenCalled();
  });
});
