/**
 * Rich Capture Writer Tests
 *
 * Tests for writing conversation chunks and enhanced decisions
 * to the memory/conversations/ and memory/decisions/ directories.
 *
 * These tests are written BEFORE the implementation (Red phase).
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeConversationChunk, writeDecisionDetail } from './rich-capture.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A typical conversation chunk as produced by conversation-chunker.js */
const sampleChunk = {
  id: 'abc123',
  title: 'Should we use Postgres or SQLite?',
  summary: 'Discussed database options. SQLite chosen for simplicity.',
  topic: 'database-selection',
  exchanges: [
    {
      user: 'Should we use Postgres or SQLite for the vector store?',
      assistant:
        'For your use case, SQLite with sqlite-vec is better because it keeps the deployment simple.',
      timestamp: 1707500060000,
    },
    {
      user: 'What about performance at scale?',
      assistant:
        'SQLite handles reads extremely well. For write-heavy workloads above 10k writes/sec you would want Postgres, but vector search is read-dominant.',
      timestamp: 1707500120000,
    },
  ],
  startTime: 1707500060000,
  endTime: 1707500120000,
  metadata: {
    projects: ['TLC'],
    files: ['server/lib/config.js'],
    commands: ['/tlc:build'],
    decisions: ['use SQLite'],
  },
};

/** A chunk whose topic slug should produce a clean URL-safe filename */
const chunkWithSpecialChars = {
  id: 'def456',
  title: 'REST vs GraphQL — which API style?',
  summary: 'Decided on REST for simplicity.',
  topic: 'rest-vs-graphql',
  exchanges: [
    {
      user: 'REST vs GraphQL?',
      assistant: 'REST is simpler for your case.',
      timestamp: 1707500060000,
    },
  ],
  startTime: 1707500060000,
  endTime: 1707500060000,
  metadata: { projects: [], files: [], commands: [], decisions: [] },
};

/** A chunk that references phase 71 for cross-reference testing */
const chunkWithPhaseRef = {
  id: 'ghi789',
  title: 'Phase 71 vector memory approach',
  summary: 'Discussed phase 71 implementation details.',
  topic: 'phase-71-vector-memory',
  exchanges: [
    {
      user: 'How should we implement phase 71 vector memory?',
      assistant:
        'Phase 71 calls for sqlite-vec. See .planning/phases/71-PLAN.md for the task breakdown.',
      timestamp: 1707500060000,
    },
  ],
  startTime: 1707500060000,
  endTime: 1707500060000,
  metadata: { projects: ['TLC'], files: [], commands: [], decisions: [] },
};

/** A standard decision object */
const sampleDecision = {
  title: 'Use SQLite for vector storage',
  reasoning: 'Zero infrastructure, single file, ships with TLC',
  alternatives: ['Postgres with pgvector', 'Pinecone', 'ChromaDB'],
  context: 'Phase 71 vector memory implementation',
  permanent: false,
};

/** A permanent decision */
const permanentDecision = {
  title: 'Use vitest as test runner',
  reasoning: 'Native ESM support, fast execution, compatible with our stack',
  alternatives: ['Jest', 'Mocha'],
  context: 'Testing infrastructure',
  permanent: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a timestamp to YYYY-MM-DD.
 * @param {number} ts - Unix timestamp in milliseconds
 * @returns {string}
 */
function toDateString(ts) {
  return new Date(ts).toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rich-capture', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-rich-capture-test-'));
    // Create the memory directory structure that rich-capture expects
    fs.mkdirSync(path.join(testDir, 'memory', 'conversations'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'memory', 'decisions'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // writeConversationChunk
  // -------------------------------------------------------------------------

  describe('writeConversationChunk', () => {
    it('writes chunk as markdown file with correct filename (YYYY-MM-DD-{slug}.md)', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);

      const expectedDate = toDateString(sampleChunk.startTime);
      const filename = path.basename(filepath);

      expect(filename).toMatch(new RegExp(`^${expectedDate}-database-selection\\.md$`));
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('markdown includes title, date, and context section', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);
      const content = fs.readFileSync(filepath, 'utf8');

      expect(content).toContain(sampleChunk.title);
      expect(content).toContain(toDateString(sampleChunk.startTime));
      // Should have some kind of context/metadata section
      expect(content).toMatch(/context|metadata|info/i);
    });

    it('markdown includes full exchange content (user + assistant)', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);
      const content = fs.readFileSync(filepath, 'utf8');

      for (const exchange of sampleChunk.exchanges) {
        expect(content).toContain(exchange.user);
        expect(content).toContain(exchange.assistant);
      }
    });

    it('markdown includes extracted decisions', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);
      const content = fs.readFileSync(filepath, 'utf8');

      for (const decision of sampleChunk.metadata.decisions) {
        expect(content).toContain(decision);
      }
    });

    it('markdown includes related files section', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);
      const content = fs.readFileSync(filepath, 'utf8');

      for (const file of sampleChunk.metadata.files) {
        expect(content).toContain(file);
      }
    });

    it('appends to existing file for same date+topic', async () => {
      // Write the same chunk twice (same date + same topic slug)
      const filepath1 = await writeConversationChunk(testDir, sampleChunk);
      const contentAfterFirst = fs.readFileSync(filepath1, 'utf8');

      // Create a second chunk with same date and topic but different exchanges
      const secondChunk = {
        ...sampleChunk,
        id: 'xyz999',
        exchanges: [
          {
            user: 'Any other database considerations?',
            assistant: 'Consider WAL mode for concurrent reads.',
            timestamp: 1707500180000,
          },
        ],
        startTime: 1707500180000,
        endTime: 1707500180000,
      };

      const filepath2 = await writeConversationChunk(testDir, secondChunk);

      // Should write to the same file
      expect(filepath2).toBe(filepath1);

      const contentAfterSecond = fs.readFileSync(filepath2, 'utf8');

      // Second write should have more content than first
      expect(contentAfterSecond.length).toBeGreaterThan(contentAfterFirst.length);
      // Both chunks' content should be present
      expect(contentAfterSecond).toContain('Any other database considerations?');
      expect(contentAfterSecond).toContain(sampleChunk.exchanges[0].user);
    });

    it('creates conversations/ directory if missing', async () => {
      // Remove the conversations directory
      const convDir = path.join(testDir, 'memory', 'conversations');
      fs.rmSync(convDir, { recursive: true });
      expect(fs.existsSync(convDir)).toBe(false);

      const filepath = await writeConversationChunk(testDir, sampleChunk);

      expect(fs.existsSync(convDir)).toBe(true);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('file slug is URL-safe (no spaces, special chars)', async () => {
      const filepath = await writeConversationChunk(testDir, chunkWithSpecialChars);
      const filename = path.basename(filepath);

      // Filename should only contain URL-safe characters: letters, digits, hyphens, dots
      expect(filename).toMatch(/^[a-z0-9._-]+$/);
      // Should not contain spaces, em-dashes, or other special chars
      expect(filename).not.toMatch(/[\s—&?!@#$%^*()+={}\[\]|\\:;"'<>,]/);
    });

    it('handles special characters in titles', async () => {
      const chunkWithWeirdTitle = {
        ...sampleChunk,
        id: 'weird1',
        title: 'What about C++ & Rust? (performance!)',
        topic: 'cpp-and-rust-performance',
      };

      const filepath = await writeConversationChunk(testDir, chunkWithWeirdTitle);
      const content = fs.readFileSync(filepath, 'utf8');

      // Title should appear in the content (possibly escaped but present)
      expect(content).toContain('C++');
      expect(content).toContain('Rust');
      // File should be created successfully
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('cross-references plan files when phase mentioned', async () => {
      const filepath = await writeConversationChunk(testDir, chunkWithPhaseRef);
      const content = fs.readFileSync(filepath, 'utf8');

      // Should include a cross-reference to the plan file
      expect(content).toMatch(/\.planning\/phases\/71-PLAN\.md|phase\s*71/i);
    });

    it('timestamps in ISO format', async () => {
      const filepath = await writeConversationChunk(testDir, sampleChunk);
      const content = fs.readFileSync(filepath, 'utf8');

      // Should contain at least one ISO-formatted timestamp (YYYY-MM-DDThh:mm:ss)
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // -------------------------------------------------------------------------
  // writeDecisionDetail
  // -------------------------------------------------------------------------

  describe('writeDecisionDetail', () => {
    it('permanent flag set in frontmatter (permanent: true)', async () => {
      const filepath = await writeDecisionDetail(testDir, permanentDecision);
      const content = fs.readFileSync(filepath, 'utf8');

      // Should have frontmatter with permanent flag
      expect(content).toMatch(/permanent:\s*true/);
    });

    it('enhanced decision format includes alternatives and reasoning chain', async () => {
      const filepath = await writeDecisionDetail(testDir, sampleDecision);
      const content = fs.readFileSync(filepath, 'utf8');

      // Title
      expect(content).toContain(sampleDecision.title);

      // Reasoning
      expect(content).toContain(sampleDecision.reasoning);

      // All alternatives listed
      for (const alt of sampleDecision.alternatives) {
        expect(content).toContain(alt);
      }

      // Context
      expect(content).toContain(sampleDecision.context);
    });
  });
});
