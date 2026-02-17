/**
 * Remember Command Tests
 *
 * Tests for the /tlc:remember command that captures conversation context
 * or explicit text as permanent memory entries.
 *
 * Permanent memories:
 * - Have `permanent: true` in frontmatter and vector metadata
 * - Are written to memory/conversations/ with [PERMANENT] prefix in title
 * - Are indexed in the vector store with permanent = 1
 * - Are never pruned or archived
 *
 * These tests are written BEFORE the implementation (Red phase).
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRememberCommand } from './remember-command.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock richCapture dependency with vi.fn() stubs.
 * writeConversationChunk resolves to a deterministic file path.
 * @param {string} projectRoot - Used to build the returned file path
 * @returns {object}
 */
function createMockRichCapture(projectRoot) {
  return {
    writeConversationChunk: vi.fn().mockImplementation(async (root, chunk) => {
      const convDir = path.join(root, 'memory', 'conversations');
      const dateStr = new Date().toISOString().split('T')[0];
      const slug = (chunk.topic || 'permanent-memory')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const filepath = path.join(convDir, `${dateStr}-${slug}.md`);
      // Simulate file creation so downstream assertions can inspect it
      fs.mkdirSync(convDir, { recursive: true });
      const lines = [];
      if (chunk.permanent) {
        lines.push('---');
        lines.push('permanent: true');
        lines.push('---');
        lines.push('');
      }
      lines.push(`# ${chunk.title}`);
      lines.push('');
      if (chunk.exchanges) {
        for (const ex of chunk.exchanges) {
          lines.push(`**User:** ${ex.user}`);
          lines.push(`**Assistant:** ${ex.assistant}`);
          lines.push('');
        }
      }
      fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
      return filepath;
    }),
    writeDecisionDetail: vi.fn().mockResolvedValue('/mock/decision.md'),
  };
}

/**
 * Creates a mock vectorIndexer dependency.
 * @returns {object}
 */
function createMockVectorIndexer() {
  return {
    indexChunk: vi.fn().mockResolvedValue({ success: true }),
    indexFile: vi.fn().mockResolvedValue({ success: true }),
    indexAll: vi.fn().mockResolvedValue({ indexed: 0, errors: 0 }),
  };
}

/**
 * Creates a mock embeddingClient dependency.
 * @returns {object}
 */
function createMockEmbeddingClient() {
  return {
    embed: vi.fn().mockResolvedValue(new Float32Array(1024).fill(0.1)),
  };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

/** Recent exchanges to simulate conversation context */
const sampleExchanges = [
  {
    user: 'Should we always use UTC timestamps?',
    assistant: 'Yes, UTC avoids timezone confusion in distributed systems.',
    timestamp: Date.now() - 60000,
  },
  {
    user: 'Even for user-facing display?',
    assistant: 'Store UTC, convert to local for display.',
    timestamp: Date.now() - 30000,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('remember-command', () => {
  let testDir;
  let mockRichCapture;
  let mockVectorIndexer;
  let mockEmbeddingClient;
  let remember;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-remember-cmd-test-'));
    fs.mkdirSync(path.join(testDir, 'memory', 'conversations'), { recursive: true });

    mockRichCapture = createMockRichCapture(testDir);
    mockVectorIndexer = createMockVectorIndexer();
    mockEmbeddingClient = createMockEmbeddingClient();

    remember = createRememberCommand({
      richCapture: mockRichCapture,
      vectorIndexer: mockVectorIndexer,
      embeddingClient: mockEmbeddingClient,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 1. Captures explicit text as permanent memory
  // -------------------------------------------------------------------------
  it('captures explicit text as permanent memory (writes file with permanent: true frontmatter)', async () => {
    const result = await remember.execute(testDir, { text: 'Always use UTC timestamps' });

    expect(result.success).toBe(true);

    // richCapture.writeConversationChunk should have been called
    expect(mockRichCapture.writeConversationChunk).toHaveBeenCalledTimes(1);

    // The chunk passed to writeConversationChunk should have permanent: true
    const calledChunk = mockRichCapture.writeConversationChunk.mock.calls[0][1];
    expect(calledChunk.permanent).toBe(true);

    // The written file should contain permanent: true in frontmatter
    const writtenFile = result.filePath;
    const content = fs.readFileSync(writtenFile, 'utf8');
    expect(content).toMatch(/permanent:\s*true/);
  });

  // -------------------------------------------------------------------------
  // 2. Captures recent exchanges when no text provided
  // -------------------------------------------------------------------------
  it('captures recent exchanges when no text provided', async () => {
    const result = await remember.execute(testDir, { exchanges: sampleExchanges });

    expect(result.success).toBe(true);

    // Should have called writeConversationChunk with the exchanges
    expect(mockRichCapture.writeConversationChunk).toHaveBeenCalledTimes(1);
    const calledChunk = mockRichCapture.writeConversationChunk.mock.calls[0][1];
    expect(calledChunk.exchanges).toBeDefined();
    expect(calledChunk.exchanges.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3. File written to memory/conversations/ directory
  // -------------------------------------------------------------------------
  it('file written to memory/conversations/ directory', async () => {
    const result = await remember.execute(testDir, { text: 'Use named exports everywhere' });

    expect(result.filePath).toBeDefined();

    // File path should be under memory/conversations/
    const convDir = path.join(testDir, 'memory', 'conversations');
    expect(result.filePath.startsWith(convDir)).toBe(true);

    // File should exist on disk
    expect(fs.existsSync(result.filePath)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. File has [PERMANENT] prefix in title
  // -------------------------------------------------------------------------
  it('file has [PERMANENT] prefix in title', async () => {
    const result = await remember.execute(testDir, { text: 'Never commit .env files' });

    expect(mockRichCapture.writeConversationChunk).toHaveBeenCalledTimes(1);
    const calledChunk = mockRichCapture.writeConversationChunk.mock.calls[0][1];

    // Title should start with [PERMANENT]
    expect(calledChunk.title).toMatch(/^\[PERMANENT\]/);
  });

  // -------------------------------------------------------------------------
  // 5. permanent: true set in frontmatter of written file
  // -------------------------------------------------------------------------
  it('permanent: true set in frontmatter of written file', async () => {
    const result = await remember.execute(testDir, { text: 'Always run lint before commit' });

    const content = fs.readFileSync(result.filePath, 'utf8');

    // File should start with YAML frontmatter containing permanent: true
    expect(content).toMatch(/^---\n[\s\S]*permanent:\s*true[\s\S]*\n---/);
  });

  // -------------------------------------------------------------------------
  // 6. Vector indexer called with permanent flag
  // -------------------------------------------------------------------------
  it('vector indexer called with permanent flag', async () => {
    await remember.execute(testDir, { text: 'Use Vitest for all tests' });

    // indexChunk should have been called
    expect(mockVectorIndexer.indexChunk).toHaveBeenCalledTimes(1);

    // The chunk passed to indexChunk should have permanent: true (or permanent = 1)
    const indexedChunk = mockVectorIndexer.indexChunk.mock.calls[0][1];
    expect(indexedChunk.permanent).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 7. Returns success with confirmation message
  // -------------------------------------------------------------------------
  it('returns success with confirmation message', async () => {
    const result = await remember.execute(testDir, { text: 'Always use UTC timestamps' });

    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
    expect(result.message).toContain('Remembered permanently');
    expect(result.message).toContain('Always use UTC timestamps');
  });

  // -------------------------------------------------------------------------
  // 8. Returns file path in result
  // -------------------------------------------------------------------------
  it('returns file path in result', async () => {
    const result = await remember.execute(testDir, { text: 'Prefer composition over inheritance' });

    expect(result).toHaveProperty('filePath');
    expect(typeof result.filePath).toBe('string');
    expect(result.filePath.length).toBeGreaterThan(0);
    // Should be an absolute path ending in .md
    expect(result.filePath).toMatch(/\.md$/);
  });

  // -------------------------------------------------------------------------
  // 9. Handles empty text gracefully (returns error/guidance)
  // -------------------------------------------------------------------------
  it('handles empty text gracefully (returns error/guidance)', async () => {
    const result = await remember.execute(testDir, { text: '' });

    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
    // Should provide guidance about what to provide
    expect(result.message.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 10. Phase 81: chunk.text must be set for vector indexing
  // -------------------------------------------------------------------------
  it('explicit text remember sets chunk.text on indexChunk call', async () => {
    await remember.execute(testDir, { text: 'Always use UTC timestamps' });

    expect(mockVectorIndexer.indexChunk).toHaveBeenCalledTimes(1);
    const indexedChunk = mockVectorIndexer.indexChunk.mock.calls[0][1];
    // chunk.text MUST be set — vectorIndexer.indexChunk only reads chunk.text
    expect(indexedChunk.text).toBe('Always use UTC timestamps');
  });

  it('exchange capture sets chunk.text to exchange summary', async () => {
    await remember.execute(testDir, { exchanges: sampleExchanges });

    expect(mockVectorIndexer.indexChunk).toHaveBeenCalledTimes(1);
    const indexedChunk = mockVectorIndexer.indexChunk.mock.calls[0][1];
    // chunk.text MUST be non-empty for vector indexing to work
    expect(indexedChunk.text).toBeDefined();
    expect(typeof indexedChunk.text).toBe('string');
    expect(indexedChunk.text.length).toBeGreaterThan(0);
  });
});
