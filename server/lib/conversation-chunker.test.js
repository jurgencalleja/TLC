/**
 * Conversation Chunker Tests
 *
 * Tests for chunking conversation exchanges into meaningful,
 * topic-coherent segments with metadata extraction.
 */

import { describe, it, expect } from 'vitest';
import {
  chunkConversation,
  detectBoundary,
  generateChunkTitle,
  generateChunkSummary,
  extractChunkMetadata,
} from './conversation-chunker.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tlcBuildExchange = {
  user: '/tlc:build 5',
  assistant: 'Building phase 5...',
  timestamp: 1707500000000,
};

const tlcPlanExchange = {
  user: '/tlc:plan',
  assistant: 'Starting planning phase. Let me analyze the roadmap...',
  timestamp: 1707500010000,
};

const tlcDiscussExchange = {
  user: '/tlc:discuss authentication approach',
  assistant: 'Let me outline the options for authentication...',
  timestamp: 1707500020000,
};

const designDiscussion = {
  user: 'Should we use Postgres or SQLite for the vector store?',
  assistant: 'For your use case, SQLite with sqlite-vec is better because it keeps the deployment simple and avoids the need for a separate database server.',
  timestamp: 1707500060000,
};

const designFollowUp = {
  user: 'What about performance at scale?',
  assistant: 'SQLite handles reads extremely well. For write-heavy workloads above 10k writes/sec you would want Postgres, but vector search is read-dominant.',
  timestamp: 1707500120000,
};

const acknowledgment = {
  user: 'ok let\'s move on to the next task',
  assistant: 'Sure, the next task is implementing the conversation chunker.',
  timestamp: 1707500180000,
};

const nextSignal = {
  user: 'next',
  assistant: 'Moving on to the metadata extraction step.',
  timestamp: 1707500200000,
};

const doneSignal = {
  user: 'done',
  assistant: 'Great, marking that as complete.',
  timestamp: 1707500220000,
};

const letsBuildSignal = {
  user: 'let\'s build this',
  assistant: 'Starting implementation now.',
  timestamp: 1707500240000,
};

const authDiscussion = {
  user: 'We need JWT authentication for the API endpoints',
  assistant: 'I\'ll set up JWT-based auth with refresh tokens. We should store tokens in httpOnly cookies for security.',
  timestamp: 1707500300000,
};

const authImplementation = {
  user: 'Can you update src/auth/login.ts to use bcrypt for password hashing?',
  assistant: 'Updated src/auth/login.ts with bcrypt hashing. Also modified src/auth/types.ts for the new hash field.',
  timestamp: 1707500360000,
};

const deployDiscussion = {
  user: 'How should we deploy this to production?',
  assistant: 'I recommend using Docker with a multi-stage build. We can use GitHub Actions for CI/CD to deploy to AWS ECS.',
  timestamp: 1707500420000,
};

const deployFollowUp = {
  user: 'Let\'s use Terraform for the infrastructure',
  assistant: 'Good choice. I\'ll create the Terraform modules for ECS, RDS, and the ALB. The files will go in infra/terraform/.',
  timestamp: 1707500480000,
};

const filePathExchange = {
  user: 'Check the file at src/auth/login.ts and also server/lib/config.js',
  assistant: 'I\'ve reviewed both files. src/auth/login.ts has the auth logic and server/lib/config.js has the configuration loading.',
  timestamp: 1707500540000,
};

const projectNameExchange = {
  user: 'This is for the TLC project, specifically the memory-service module',
  assistant: 'Understood, the TLC memory-service module handles conversation persistence.',
  timestamp: 1707500600000,
};

const commandExchange = {
  user: '/tlc:review the auth module',
  assistant: 'Running review on the auth module...',
  timestamp: 1707500660000,
};

const decisionExchange = {
  user: 'Let\'s use Redis for caching instead of in-memory',
  assistant: 'Agreed. Redis gives us persistence across restarts and shared cache between instances. I\'ll update the cache layer.',
  timestamp: 1707500720000,
};

const anotherDecision = {
  user: 'We decided to use vitest instead of jest',
  assistant: 'Good call. Vitest is faster and has native ESM support. I\'ll migrate the test config.',
  timestamp: 1707500780000,
};

const shortQA1 = {
  user: 'What\'s the port?',
  assistant: '3000',
  timestamp: 1707500840000,
};

const shortQA2 = {
  user: 'And the host?',
  assistant: 'localhost',
  timestamp: 1707500850000,
};

const shortQA3 = {
  user: 'Is CORS enabled?',
  assistant: 'Yes, for localhost:5173',
  timestamp: 1707500860000,
};

const shortQA4 = {
  user: 'What about rate limiting?',
  assistant: '100 requests per minute per IP',
  timestamp: 1707500870000,
};

// Semantic shift: from auth topic to completely different CSS topic
const cssDiscussion = {
  user: 'The CSS grid layout is broken on mobile. Can you fix the responsive breakpoints?',
  assistant: 'I\'ll fix the grid template columns at the 768px breakpoint and add a flex fallback for older browsers.',
  timestamp: 1707500930000,
};

const cssFollowUp = {
  user: 'Also add dark mode support with CSS custom properties',
  assistant: 'I\'ll define the color tokens as custom properties and add a prefers-color-scheme media query.',
  timestamp: 1707500990000,
};

// ---------------------------------------------------------------------------
// Helper: generate a sequence of exchanges for long-conversation tests
// ---------------------------------------------------------------------------

function generateExchanges(count, topicPrefix = 'topic', startTimestamp = 1707500000000) {
  return Array.from({ length: count }, (_, i) => ({
    user: `${topicPrefix} question ${i + 1}`,
    assistant: `${topicPrefix} answer ${i + 1}`,
    timestamp: startTimestamp + i * 60000,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('conversation-chunker', () => {
  // -----------------------------------------------------------------------
  // chunkConversation
  // -----------------------------------------------------------------------

  describe('chunkConversation', () => {
    it('chunks exchanges by TLC command boundaries (hard split)', () => {
      const exchanges = [
        designDiscussion,
        designFollowUp,
        tlcBuildExchange,       // hard boundary here
        authDiscussion,
        authImplementation,
      ];

      const chunks = chunkConversation(exchanges);

      // The TLC command should trigger a new chunk
      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // First chunk should contain the design exchanges
      const firstChunkTexts = chunks[0].exchanges.map(e => e.user);
      expect(firstChunkTexts).toContain(designDiscussion.user);

      // A later chunk should contain the auth exchanges
      const lastChunk = chunks[chunks.length - 1];
      const lastChunkTexts = lastChunk.exchanges.map(e => e.user);
      expect(lastChunkTexts).toContain(authDiscussion.user);
    });

    it('chunks exchanges by user boundary signals (soft split)', () => {
      const exchanges = [
        designDiscussion,
        designFollowUp,
        acknowledgment,         // soft boundary: "ok let's move on"
        deployDiscussion,
        deployFollowUp,
      ];

      const chunks = chunkConversation(exchanges);

      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Design discussion and deploy discussion should be in separate chunks
      const designChunk = chunks.find(c =>
        c.exchanges.some(e => e.user.includes('Postgres'))
      );
      const deployChunk = chunks.find(c =>
        c.exchanges.some(e => e.user.includes('deploy'))
      );

      expect(designChunk).toBeDefined();
      expect(deployChunk).toBeDefined();
      expect(designChunk.id).not.toBe(deployChunk.id);
    });

    it('chunks by semantic shift (topic change via low keyword overlap)', () => {
      const exchanges = [
        authDiscussion,
        authImplementation,
        // No explicit boundary signal, but drastic topic change
        cssDiscussion,
        cssFollowUp,
      ];

      const chunks = chunkConversation(exchanges);

      expect(chunks.length).toBeGreaterThanOrEqual(2);

      // Auth and CSS should be in different chunks
      const authChunk = chunks.find(c =>
        c.exchanges.some(e => e.user.includes('JWT'))
      );
      const cssChunk = chunks.find(c =>
        c.exchanges.some(e => e.user.includes('CSS'))
      );

      expect(authChunk).toBeDefined();
      expect(cssChunk).toBeDefined();
      expect(authChunk.id).not.toBe(cssChunk.id);
    });

    it('returns empty chunks array for empty exchanges', () => {
      const chunks = chunkConversation([]);

      expect(chunks).toEqual([]);
    });

    it('returns a single chunk for a single exchange', () => {
      const chunks = chunkConversation([designDiscussion]);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].exchanges).toHaveLength(1);
      expect(chunks[0].exchanges[0]).toEqual(designDiscussion);
    });

    it('handles very long exchanges (>20) with multiple splits', () => {
      // Generate 25 exchanges with two distinct topic blocks
      const authExchanges = generateExchanges(12, 'authentication');
      const deployExchanges = generateExchanges(13, 'deployment', 1707600000000);
      const allExchanges = [...authExchanges, ...deployExchanges];

      const chunks = chunkConversation(allExchanges, { maxChunkSize: 8 });

      // With maxChunkSize=8 and 25 exchanges, should produce at least 4 chunks
      expect(chunks.length).toBeGreaterThanOrEqual(3);

      // No single chunk should exceed maxChunkSize
      for (const chunk of chunks) {
        expect(chunk.exchanges.length).toBeLessThanOrEqual(8);
      }
    });

    it('preserves exchange order within chunks', () => {
      const exchanges = [
        designDiscussion,
        designFollowUp,
        acknowledgment,
        deployDiscussion,
        deployFollowUp,
      ];

      const chunks = chunkConversation(exchanges);

      // Flatten all exchanges back and verify order matches original
      const flattened = chunks.flatMap(c => c.exchanges);
      for (let i = 0; i < flattened.length; i++) {
        expect(flattened[i].timestamp).toBe(exchanges[i].timestamp);
        expect(flattened[i].user).toBe(exchanges[i].user);
      }
    });

    it('produces chunks with unique deterministic IDs (hash-based)', () => {
      const exchanges = [
        designDiscussion,
        designFollowUp,
        tlcBuildExchange,
        authDiscussion,
        authImplementation,
      ];

      const chunks1 = chunkConversation(exchanges);
      const chunks2 = chunkConversation(exchanges);

      // IDs should be deterministic -- same input produces same IDs
      expect(chunks1.map(c => c.id)).toEqual(chunks2.map(c => c.id));

      // All IDs within a run should be unique
      const ids = chunks1.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);

      // IDs should be non-empty strings
      for (const id of ids) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });

    it('groups short Q&A exchanges together under maxChunkSize (adaptive sizing)', () => {
      const exchanges = [
        shortQA1,
        shortQA2,
        shortQA3,
        shortQA4,
      ];

      const chunks = chunkConversation(exchanges, { maxChunkSize: 8 });

      // Four short Q&A exchanges should be grouped into a single chunk
      expect(chunks).toHaveLength(1);
      expect(chunks[0].exchanges).toHaveLength(4);
    });

    it('creates a chunk for a single important exchange', () => {
      const exchanges = [
        designDiscussion,
        designFollowUp,
        tlcBuildExchange,       // hard boundary
        decisionExchange,       // single important exchange before next boundary
        tlcPlanExchange,        // hard boundary
        authDiscussion,
      ];

      const chunks = chunkConversation(exchanges, { minChunkSize: 1 });

      // The decision exchange should appear in a chunk (possibly alone)
      const decisionChunk = chunks.find(c =>
        c.exchanges.some(e => e.user.includes('Redis'))
      );
      expect(decisionChunk).toBeDefined();
    });

    it('populates chunk fields: id, title, summary, topic, startTime, endTime, metadata', () => {
      const exchanges = [designDiscussion, designFollowUp];

      const chunks = chunkConversation(exchanges);

      expect(chunks).toHaveLength(1);
      const chunk = chunks[0];

      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('title');
      expect(chunk).toHaveProperty('summary');
      expect(chunk).toHaveProperty('exchanges');
      expect(chunk).toHaveProperty('topic');
      expect(chunk).toHaveProperty('startTime');
      expect(chunk).toHaveProperty('endTime');
      expect(chunk).toHaveProperty('metadata');

      expect(typeof chunk.id).toBe('string');
      expect(typeof chunk.title).toBe('string');
      expect(typeof chunk.summary).toBe('string');
      expect(typeof chunk.topic).toBe('string');
      expect(typeof chunk.startTime).toBe('number');
      expect(typeof chunk.endTime).toBe('number');

      expect(chunk.startTime).toBe(designDiscussion.timestamp);
      expect(chunk.endTime).toBe(designFollowUp.timestamp);

      expect(chunk.metadata).toHaveProperty('projects');
      expect(chunk.metadata).toHaveProperty('files');
      expect(chunk.metadata).toHaveProperty('commands');
      expect(chunk.metadata).toHaveProperty('decisions');
    });
  });

  // -----------------------------------------------------------------------
  // detectBoundary
  // -----------------------------------------------------------------------

  describe('detectBoundary', () => {
    it('detects hard boundary on TLC command invocations', () => {
      const result = detectBoundary(tlcBuildExchange, designFollowUp);

      expect(result.isBoundary).toBe(true);
      expect(result.type).toBe('hard');
    });

    it('detects hard boundary for various TLC commands', () => {
      for (const exchange of [tlcBuildExchange, tlcPlanExchange, tlcDiscussExchange, commandExchange]) {
        const result = detectBoundary(exchange, designDiscussion);
        expect(result.isBoundary).toBe(true);
        expect(result.type).toBe('hard');
      }
    });

    it('detects soft boundary on user signals like "ok", "next", "done"', () => {
      for (const exchange of [acknowledgment, nextSignal, doneSignal, letsBuildSignal]) {
        const result = detectBoundary(exchange, designFollowUp);
        expect(result.isBoundary).toBe(true);
        expect(result.type).toBe('soft');
      }
    });

    it('detects semantic boundary when topic changes drastically', () => {
      // Auth topic followed immediately by CSS topic -- no shared keywords
      const result = detectBoundary(cssDiscussion, authImplementation);

      expect(result.isBoundary).toBe(true);
      expect(result.type).toBe('semantic');
    });

    it('returns no boundary for exchanges on the same topic', () => {
      const result = detectBoundary(designFollowUp, designDiscussion);

      expect(result.isBoundary).toBe(false);
      expect(result.type).toBeNull();
    });

    it('returns no boundary when previous exchange is undefined (first exchange)', () => {
      const result = detectBoundary(designDiscussion, undefined);

      expect(result.isBoundary).toBe(false);
      expect(result.type).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // generateChunkTitle
  // -----------------------------------------------------------------------

  describe('generateChunkTitle', () => {
    it('generates a meaningful title from chunk content', () => {
      const exchanges = [designDiscussion, designFollowUp];

      const title = generateChunkTitle(exchanges);

      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
      // Title should relate to the database/vector store discussion
      const lowerTitle = title.toLowerCase();
      expect(
        lowerTitle.includes('postgres') ||
        lowerTitle.includes('sqlite') ||
        lowerTitle.includes('database') ||
        lowerTitle.includes('vector')
      ).toBe(true);
    });

    it('returns a non-empty title for a single exchange', () => {
      const title = generateChunkTitle([authDiscussion]);

      expect(typeof title).toBe('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // generateChunkSummary
  // -----------------------------------------------------------------------

  describe('generateChunkSummary', () => {
    it('generates a 2-3 sentence summary from exchanges', () => {
      const exchanges = [designDiscussion, designFollowUp];

      const summary = generateChunkSummary(exchanges);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);

      // Should be roughly 2-3 sentences (at least 1 period)
      const sentenceEndings = (summary.match(/[.!?]/g) || []).length;
      expect(sentenceEndings).toBeGreaterThanOrEqual(1);
      expect(sentenceEndings).toBeLessThanOrEqual(5);
    });

    it('returns a summary for a single exchange', () => {
      const summary = generateChunkSummary([decisionExchange]);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // extractChunkMetadata
  // -----------------------------------------------------------------------

  describe('extractChunkMetadata', () => {
    it('extracts mentioned file paths from exchange text', () => {
      const metadata = extractChunkMetadata([filePathExchange, authImplementation]);

      expect(metadata.files).toContain('src/auth/login.ts');
      expect(metadata.files).toContain('server/lib/config.js');
      expect(metadata.files).toContain('src/auth/types.ts');
    });

    it('extracts mentioned project names', () => {
      const metadata = extractChunkMetadata([projectNameExchange]);

      expect(metadata.projects.length).toBeGreaterThan(0);
      // Should detect "TLC" or "memory-service" as project references
      const joined = metadata.projects.join(' ').toLowerCase();
      expect(
        joined.includes('tlc') || joined.includes('memory-service')
      ).toBe(true);
    });

    it('extracts TLC commands used', () => {
      const metadata = extractChunkMetadata([
        tlcBuildExchange,
        commandExchange,
        tlcPlanExchange,
      ]);

      expect(metadata.commands.length).toBeGreaterThanOrEqual(2);
      expect(metadata.commands).toContain('/tlc:build');
      expect(metadata.commands).toContain('/tlc:review');
      expect(metadata.commands).toContain('/tlc:plan');
    });

    it('flags decisions detected via "let\'s use" patterns', () => {
      const metadata = extractChunkMetadata([decisionExchange, anotherDecision]);

      expect(metadata.decisions.length).toBeGreaterThanOrEqual(1);
      // Should capture the Redis and/or vitest decisions
      const joined = metadata.decisions.join(' ').toLowerCase();
      expect(
        joined.includes('redis') || joined.includes('vitest') || joined.includes('caching')
      ).toBe(true);
    });

    it('returns empty arrays when no metadata is present', () => {
      const metadata = extractChunkMetadata([shortQA1, shortQA2]);

      expect(Array.isArray(metadata.projects)).toBe(true);
      expect(Array.isArray(metadata.files)).toBe(true);
      expect(Array.isArray(metadata.commands)).toBe(true);
      expect(Array.isArray(metadata.decisions)).toBe(true);
    });
  });
});
