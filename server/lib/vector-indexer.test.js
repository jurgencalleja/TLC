/**
 * Vector Indexer Tests
 * Tests for indexing memory files into the vector store with embeddings.
 *
 * The vector indexer reads markdown files from memory/ subdirectories
 * (decisions, gotchas, conversations), extracts clean text, generates
 * embeddings, and inserts them into the vector store.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createVectorIndexer } from './vector-indexer.js';

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
 * Creates a mock vector store that tracks all insert/delete/rebuild calls.
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
 * Sets up a temporary project directory with memory/ subdirectories.
 * @param {string} baseDir - Temp directory to create structure in
 */
function setupMemoryDirs(baseDir) {
  const memoryDir = path.join(baseDir, 'memory');
  fs.mkdirSync(path.join(memoryDir, 'decisions'), { recursive: true });
  fs.mkdirSync(path.join(memoryDir, 'gotchas'), { recursive: true });
  fs.mkdirSync(path.join(memoryDir, 'conversations'), { recursive: true });
}

describe('vector-indexer', () => {
  let testDir;
  let mockVectorStore;
  let mockEmbeddingClient;
  let indexer;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-vector-indexer-test-'));
    setupMemoryDirs(testDir);
    mockVectorStore = createMockVectorStore();
    mockEmbeddingClient = createMockEmbeddingClient();
    indexer = createVectorIndexer({
      vectorStore: mockVectorStore,
      embeddingClient: mockEmbeddingClient,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('indexAll', () => {
    it('indexes all decisions from memory/decisions/', async () => {
      const decisionsDir = path.join(testDir, 'memory', 'decisions');
      fs.writeFileSync(
        path.join(decisionsDir, '2026-02-09-use-postgres.md'),
        '# Use Postgres for production\n**Date:** 2026-02-09\n**Reasoning:** Better for concurrent writes and JSONB support.\n'
      );
      fs.writeFileSync(
        path.join(decisionsDir, '2026-02-10-use-rest.md'),
        '# Use REST over GraphQL\n**Date:** 2026-02-10\n**Reasoning:** Simpler tooling and easier caching.\n'
      );

      const result = await indexer.indexAll(testDir);

      expect(result.indexed).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(2);
      expect(mockVectorStore.insert).toHaveBeenCalledTimes(2);

      // Verify decision type was set in at least one insert call
      const insertCalls = mockVectorStore.insert.mock.calls;
      const types = insertCalls.map((call) => call[0].type);
      expect(types.every((t) => t === 'decision')).toBe(true);
    });

    it('indexes all gotchas from memory/gotchas/', async () => {
      const gotchasDir = path.join(testDir, 'memory', 'gotchas');
      fs.writeFileSync(
        path.join(gotchasDir, 'sqlite-wal-locking.md'),
        '# SQLite WAL locking\nWAL mode can cause issues with multiple writers.\n'
      );
      fs.writeFileSync(
        path.join(gotchasDir, 'node-esm-imports.md'),
        '# Node ESM imports require .js extension\nAlways use .js extension in ESM imports.\n'
      );
      fs.writeFileSync(
        path.join(gotchasDir, 'vitest-mock-reset.md'),
        '# Vitest mocks must be reset\nCall vi.restoreAllMocks() in afterEach.\n'
      );

      const result = await indexer.indexAll(testDir);

      expect(result.indexed).toBe(3);
      expect(result.errors).toBe(0);
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(3);

      // Verify gotcha type was set
      const insertCalls = mockVectorStore.insert.mock.calls;
      const types = insertCalls.map((call) => call[0].type);
      expect(types.every((t) => t === 'gotcha')).toBe(true);
    });

    it('indexes all conversations from memory/conversations/', async () => {
      const convoDir = path.join(testDir, 'memory', 'conversations');
      fs.writeFileSync(
        path.join(convoDir, '2026-02-09-session-1.md'),
        '# Session 1\nDiscussed database options and decided on Postgres.\n'
      );
      fs.writeFileSync(
        path.join(convoDir, '2026-02-10-session-2.md'),
        '# Session 2\nImplemented vector store with sqlite-vec.\n'
      );

      const result = await indexer.indexAll(testDir);

      expect(result.indexed).toBe(2);
      expect(result.errors).toBe(0);

      // Verify conversation type was set
      const insertCalls = mockVectorStore.insert.mock.calls;
      const types = insertCalls.map((call) => call[0].type);
      expect(types.every((t) => t === 'conversation')).toBe(true);
    });

    it('handles empty memory directories (no files = 0 indexed)', async () => {
      // memory dirs exist but are empty (created in beforeEach)
      const result = await indexer.indexAll(testDir);

      expect(result.indexed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockEmbeddingClient.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.insert).not.toHaveBeenCalled();
    });

    it('reports progress callback with counts', async () => {
      const decisionsDir = path.join(testDir, 'memory', 'decisions');
      fs.writeFileSync(
        path.join(decisionsDir, 'decision-1.md'),
        '# Decision 1\nFirst decision.\n'
      );
      fs.writeFileSync(
        path.join(decisionsDir, 'decision-2.md'),
        '# Decision 2\nSecond decision.\n'
      );

      const gotchasDir = path.join(testDir, 'memory', 'gotchas');
      fs.writeFileSync(
        path.join(gotchasDir, 'gotcha-1.md'),
        '# Gotcha 1\nA gotcha.\n'
      );

      const onProgress = vi.fn();
      await indexer.indexAll(testDir, { onProgress });

      // onProgress should have been called at least once per file
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(3);

      // Each progress call should include indexed/total counts
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
      expect(lastCall).toHaveProperty('indexed');
      expect(lastCall).toHaveProperty('total');
      expect(lastCall.indexed).toBe(3);
    });
  });

  describe('indexFile', () => {
    it('indexes a single file incrementally', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'new-decision.md');
      fs.writeFileSync(
        filePath,
        '# Use TypeScript strict mode\n**Date:** 2026-02-11\n**Reasoning:** Catches more bugs at compile time.\n'
      );

      const result = await indexer.indexFile(testDir, filePath);

      expect(result.success).toBe(true);
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.insert).toHaveBeenCalledTimes(1);

      // Verify the inserted entry has correct source_file
      const insertArg = mockVectorStore.insert.mock.calls[0][0];
      expect(insertArg.sourceFile).toBe(filePath);
    });

    it('re-indexes file when content changed', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'changing-decision.md');

      // First write and index
      fs.writeFileSync(filePath, '# Original Decision\nOriginal reasoning.\n');
      const result1 = await indexer.indexFile(testDir, filePath);
      expect(result1.success).toBe(true);

      // Update the file content
      fs.writeFileSync(filePath, '# Updated Decision\nUpdated reasoning with more detail.\n');
      const result2 = await indexer.indexFile(testDir, filePath);
      expect(result2.success).toBe(true);

      // Should have called embed and insert twice (once per indexFile call)
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(2);
      expect(mockVectorStore.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('indexChunk', () => {
    it('indexes a conversation chunk object directly', async () => {
      const chunk = {
        id: 'chunk-2026-02-09-001',
        text: 'Discussed using Postgres for the production database. Decided JSONB columns for flexible schema.',
        type: 'conversation',
        project: 'my-project',
        workspace: testDir,
        timestamp: Date.now(),
        sourceFile: 'session-2026-02-09.md',
      };

      const result = await indexer.indexChunk(testDir, chunk);

      expect(result.success).toBe(true);
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(1);
      expect(mockEmbeddingClient.embed).toHaveBeenCalledWith(chunk.text);
      expect(mockVectorStore.insert).toHaveBeenCalledTimes(1);

      const insertArg = mockVectorStore.insert.mock.calls[0][0];
      expect(insertArg.id).toBe(chunk.id);
      expect(insertArg.text).toBe(chunk.text);
      expect(insertArg.type).toBe('conversation');
    });
  });

  describe('isIndexed', () => {
    it('skips already-indexed unchanged files', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'existing-decision.md');
      fs.writeFileSync(filePath, '# Existing Decision\nAlready indexed.\n');

      // Simulate the store returning an entry for this file (already indexed)
      mockVectorStore.getAll.mockReturnValue([
        {
          id: 'existing-decision',
          text: '# Existing Decision\nAlready indexed.\n',
          type: 'decision',
          sourceFile: filePath,
          permanent: false,
        },
      ]);

      const result = await indexer.isIndexed(filePath);

      expect(result).toBe(true);
    });

    it('returns false for files not yet indexed', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'new-decision.md');

      // Store returns empty — nothing indexed yet
      mockVectorStore.getAll.mockReturnValue([]);

      const result = await indexer.isIndexed(filePath);

      expect(result).toBe(false);
    });
  });

  describe('rebuildIndex', () => {
    it('drops all vectors and re-indexes everything from text files', async () => {
      // Pre-populate some files
      const decisionsDir = path.join(testDir, 'memory', 'decisions');
      fs.writeFileSync(
        path.join(decisionsDir, 'decision-a.md'),
        '# Decision A\nReasoning A.\n'
      );
      fs.writeFileSync(
        path.join(decisionsDir, 'decision-b.md'),
        '# Decision B\nReasoning B.\n'
      );

      const gotchasDir = path.join(testDir, 'memory', 'gotchas');
      fs.writeFileSync(
        path.join(gotchasDir, 'gotcha-a.md'),
        '# Gotcha A\nDetails A.\n'
      );

      await indexer.rebuildIndex(testDir);

      // Should have called rebuild on the store to clear existing data
      expect(mockVectorStore.rebuild).toHaveBeenCalledTimes(1);

      // Should have re-indexed all 3 files after clearing
      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(3);
      expect(mockVectorStore.insert).toHaveBeenCalledTimes(3);
    });
  });

  describe('markdown text extraction', () => {
    it('extracts clean text from markdown (strips headers, bold, etc.)', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'formatted-decision.md');
      fs.writeFileSync(
        filePath,
        [
          '# Use Postgres for production',
          '**Date:** 2026-02-09',
          '**Reasoning:** Better for concurrent writes and **JSONB** support.',
          '',
          '## Alternatives considered',
          '- MySQL: lacks JSONB',
          '- SQLite: single writer',
        ].join('\n')
      );

      await indexer.indexFile(testDir, filePath);

      expect(mockEmbeddingClient.embed).toHaveBeenCalledTimes(1);

      // The text passed to embed should be cleaned — no # or ** markers
      const embeddedText = mockEmbeddingClient.embed.mock.calls[0][0];
      expect(embeddedText).not.toContain('# ');
      expect(embeddedText).not.toContain('**');
      // But should preserve the actual content words
      expect(embeddedText).toContain('Use Postgres for production');
      expect(embeddedText).toContain('Reasoning');
      expect(embeddedText).toContain('JSONB');
    });
  });

  describe('metadata extraction', () => {
    it('sets correct metadata (type, project, workspace based on directory)', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'meta-decision.md');
      fs.writeFileSync(filePath, '# Meta Decision\nSome reasoning here.\n');

      await indexer.indexFile(testDir, filePath);

      const insertArg = mockVectorStore.insert.mock.calls[0][0];

      // Type should be derived from the parent directory name
      expect(insertArg.type).toBe('decision');
      // Source file should point to the original file
      expect(insertArg.sourceFile).toBe(filePath);
      // Should have a workspace set to the project root
      expect(insertArg.workspace).toBe(testDir);
      // Should have an embedding
      expect(insertArg.embedding).toBeInstanceOf(Float32Array);
      // Should have a timestamp
      expect(insertArg.timestamp).toEqual(expect.any(Number));
    });

    it('permanent flag preserved in index (detected from frontmatter)', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'permanent-decision.md');
      fs.writeFileSync(
        filePath,
        [
          '---',
          'permanent: true',
          '---',
          '# Never use eval() in production',
          'Critical security decision that should never be forgotten.',
        ].join('\n')
      );

      await indexer.indexFile(testDir, filePath);

      const insertArg = mockVectorStore.insert.mock.calls[0][0];
      expect(insertArg.permanent).toBe(true);
    });

    it('defaults permanent to false when frontmatter absent', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'normal-decision.md');
      fs.writeFileSync(filePath, '# Normal Decision\nNot permanent.\n');

      await indexer.indexFile(testDir, filePath);

      const insertArg = mockVectorStore.insert.mock.calls[0][0];
      expect(insertArg.permanent).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('handles embedding client returning null (Ollama unavailable)', async () => {
      mockEmbeddingClient.embed.mockResolvedValue(null);

      const filePath = path.join(testDir, 'memory', 'decisions', 'no-embed-decision.md');
      fs.writeFileSync(filePath, '# Decision Without Embedding\nOllama is down.\n');

      const result = await indexer.indexFile(testDir, filePath);

      // Should not throw, but should not insert (no embedding available)
      expect(result.success).toBe(false);
      expect(mockVectorStore.insert).not.toHaveBeenCalled();
    });

    it('handles malformed markdown files gracefully (does not throw)', async () => {
      const filePath = path.join(testDir, 'memory', 'decisions', 'malformed.md');
      // Write binary-like garbage that is not valid markdown
      fs.writeFileSync(filePath, Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]));

      // Should not throw
      const result = await indexer.indexFile(testDir, filePath);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      // Even with garbage input, it should degrade gracefully
    });

    it('reports errors in indexAll without stopping other files', async () => {
      const decisionsDir = path.join(testDir, 'memory', 'decisions');
      fs.writeFileSync(
        path.join(decisionsDir, 'good-decision.md'),
        '# Good Decision\nThis one works.\n'
      );
      fs.writeFileSync(
        path.join(decisionsDir, 'bad-decision.md'),
        '# Bad Decision\nThis one will fail.\n'
      );

      // Make embedding fail for the second file only
      let callCount = 0;
      mockEmbeddingClient.embed.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return null; // Simulate failure for second file
        }
        return new Float32Array(1024).fill(0.5);
      });

      const result = await indexer.indexAll(testDir);

      // One should succeed, one should fail — but neither should throw
      expect(result.indexed + result.errors).toBe(2);
      expect(result.errors).toBeGreaterThanOrEqual(1);
    });
  });
});
