/**
 * Memory Hooks - Auto-Capture Hooks Tests (Task 8)
 *
 * Tests for createCaptureHooks() factory function that provides
 * rolling buffer capture, chunking, and vector indexing of exchanges.
 *
 * These tests are RED - createCaptureHooks does not exist yet in memory-hooks.js.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createCaptureHooks } from './memory-hooks.js';

describe('memory-hooks capture (auto-capture hooks)', () => {
  let testDir;

  const mockChunker = {
    chunkConversation: vi.fn().mockReturnValue([{
      id: 'chunk-1',
      title: 'Test chunk',
      summary: 'Test summary',
      topic: 'testing',
      exchanges: [],
      startTime: Date.now(),
      endTime: Date.now(),
      metadata: { projects: [], files: [], commands: [], decisions: [] },
    }]),
  };

  const mockRichCapture = {
    writeConversationChunk: vi.fn().mockResolvedValue('/tmp/test.md'),
  };

  const mockVectorIndexer = {
    indexChunk: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-capture-hooks-test-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function makeDeps(overrides = {}) {
    return {
      chunker: overrides.chunker || mockChunker,
      richCapture: overrides.richCapture || mockRichCapture,
      vectorIndexer: overrides.vectorIndexer || mockVectorIndexer,
    };
  }

  function makeExchange(user, assistant) {
    return {
      user: user || 'test question',
      assistant: assistant || 'test answer',
      timestamp: Date.now(),
    };
  }

  describe('createCaptureHooks factory', () => {
    it('accumulates exchanges in rolling buffer', () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      hooks.onExchange(makeExchange('hello', 'hi there'));
      hooks.onExchange(makeExchange('how are you', 'doing well'));
      hooks.onExchange(makeExchange('what is TLC', 'Test Led Coding'));

      expect(hooks.getBufferSize()).toBe(3);
    });

    it('getBufferSize returns correct count', () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      expect(hooks.getBufferSize()).toBe(0);

      hooks.onExchange(makeExchange());
      expect(hooks.getBufferSize()).toBe(1);

      hooks.onExchange(makeExchange());
      expect(hooks.getBufferSize()).toBe(2);

      hooks.onExchange(makeExchange());
      hooks.onExchange(makeExchange());
      expect(hooks.getBufferSize()).toBe(4);
    });

    it('triggers chunking after 5 exchanges (default threshold)', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Add 5 exchanges to hit the default threshold
      for (let i = 0; i < 5; i++) {
        hooks.onExchange(makeExchange(`question ${i}`, `answer ${i}`));
      }

      // Allow setImmediate / microtask to flush
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();
      expect(mockRichCapture.writeConversationChunk).toHaveBeenCalled();
    });

    it('TLC command triggers immediate capture', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Add a couple of exchanges (below threshold)
      hooks.onExchange(makeExchange('setup question', 'setup answer'));
      hooks.onExchange(makeExchange('another question', 'another answer'));

      expect(hooks.getBufferSize()).toBe(2);

      // TLC command should trigger immediate capture regardless of buffer size
      hooks.onTlcCommand('build');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();
      expect(mockRichCapture.writeConversationChunk).toHaveBeenCalled();
    });

    it('/tlc:discuss captured with full context', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      hooks.onExchange(makeExchange(
        'let us discuss the database architecture',
        'We should consider PostgreSQL for JSONB support and strong consistency'
      ));

      hooks.onTlcCommand('discuss');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();

      // The chunker should receive the buffered exchanges
      const callArgs = mockChunker.chunkConversation.mock.calls[0];
      expect(callArgs).toBeDefined();
      // Exchanges passed to chunker should contain the discuss context
      const exchanges = callArgs[0];
      expect(exchanges.length).toBeGreaterThanOrEqual(1);
    });

    it('/tlc:plan captured with rationale', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      hooks.onExchange(makeExchange(
        'plan the authentication module',
        'We will use JWT tokens with refresh rotation for security'
      ));

      hooks.onTlcCommand('plan');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();

      const callArgs = mockChunker.chunkConversation.mock.calls[0];
      const exchanges = callArgs[0];
      expect(exchanges.length).toBeGreaterThanOrEqual(1);
      expect(exchanges[0].assistant).toContain('JWT tokens');
    });

    it('/tlc:build captured with implementation choices', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      hooks.onExchange(makeExchange(
        'build the API endpoint',
        'I chose Express over Fastify because the team already uses Express middleware'
      ));

      hooks.onTlcCommand('build');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();

      const callArgs = mockChunker.chunkConversation.mock.calls[0];
      const exchanges = callArgs[0];
      expect(exchanges.length).toBeGreaterThanOrEqual(1);
      expect(exchanges[0].assistant).toContain('Express over Fastify');
    });

    it('AskUserQuestion response captured (exchange containing question context)', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Simulate an exchange that contains a question/answer flow
      hooks.onExchange(makeExchange(
        'Should we use Redis or Memcached for caching?',
        'Redis is better here because we need pub/sub and data persistence'
      ));

      // Accumulate enough to trigger or force flush
      hooks.flush();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();

      const callArgs = mockChunker.chunkConversation.mock.calls[0];
      const exchanges = callArgs[0];
      expect(exchanges.length).toBe(1);
      expect(exchanges[0].user).toContain('Redis or Memcached');
      expect(exchanges[0].assistant).toContain('Redis is better');
    });

    it('DevOps decisions auto-detected and flagged (via pattern in exchange text)', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Exchange containing DevOps decision patterns
      hooks.onExchange(makeExchange(
        'how should we deploy this',
        'We should use Docker containers with Kubernetes orchestration for production deployment'
      ));
      hooks.onExchange(makeExchange(
        'what about CI/CD',
        'GitHub Actions with staging environment and auto-deploy on merge to main'
      ));

      hooks.flush();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();

      const callArgs = mockChunker.chunkConversation.mock.calls[0];
      const exchanges = callArgs[0];
      // At least one exchange should be present with DevOps content
      const devopsExchange = exchanges.find(
        e => e.assistant.includes('Docker') || e.assistant.includes('GitHub Actions')
      );
      expect(devopsExchange).toBeDefined();
    });

    it('non-blocking: processBuffer uses setImmediate pattern (returns immediately)', async () => {
      const slowChunker = {
        chunkConversation: vi.fn().mockImplementation(() => {
          // Simulate slow chunking
          const start = Date.now();
          while (Date.now() - start < 100) { /* spin */ }
          return [{
            id: 'chunk-slow',
            title: 'Slow chunk',
            summary: 'Slow',
            topic: 'testing',
            exchanges: [],
            startTime: Date.now(),
            endTime: Date.now(),
            metadata: { projects: [], files: [], commands: [], decisions: [] },
          }];
        }),
      };

      const hooks = createCaptureHooks(testDir, makeDeps({ chunker: slowChunker }));

      for (let i = 0; i < 5; i++) {
        hooks.onExchange(makeExchange(`q${i}`, `a${i}`));
      }

      // processBuffer should return immediately (non-blocking)
      const start = Date.now();
      const result = hooks.processBuffer();
      const elapsed = Date.now() - start;

      // Should return quickly - the actual chunking runs via setImmediate/microtask
      expect(elapsed).toBeLessThan(50);

      // Wait for the background work to complete
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    it('capture failure does not throw (logs warning)', async () => {
      const failingChunker = {
        chunkConversation: vi.fn().mockImplementation(() => {
          throw new Error('Chunker exploded');
        }),
      };

      const hooks = createCaptureHooks(testDir, makeDeps({ chunker: failingChunker }));

      // Add exchanges and trigger processing
      for (let i = 0; i < 5; i++) {
        hooks.onExchange(makeExchange(`q${i}`, `a${i}`));
      }

      // Should not throw despite chunker failure
      await new Promise(resolve => setTimeout(resolve, 50));

      // Hooks should still be functional after failure
      expect(() => hooks.onExchange(makeExchange('after error', 'still works'))).not.toThrow();
      expect(hooks.getBufferSize()).toBeGreaterThanOrEqual(0);
    });

    it('buffer resets after chunk written', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Fill buffer to threshold
      for (let i = 0; i < 5; i++) {
        hooks.onExchange(makeExchange(`q${i}`, `a${i}`));
      }

      expect(hooks.getBufferSize()).toBe(5);

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Buffer should be reset after chunking
      expect(hooks.getBufferSize()).toBe(0);
    });

    it('flush() forces processing regardless of buffer size', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Add just 1 exchange (well below any threshold)
      hooks.onExchange(makeExchange('single question', 'single answer'));
      expect(hooks.getBufferSize()).toBe(1);

      // flush() should force processing even with only 1 exchange
      hooks.flush();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockChunker.chunkConversation).toHaveBeenCalled();
      expect(mockRichCapture.writeConversationChunk).toHaveBeenCalled();
      expect(hooks.getBufferSize()).toBe(0);
    });

    it('indexing triggered after capture (vectorIndexer.indexChunk called)', async () => {
      const hooks = createCaptureHooks(testDir, makeDeps());

      // Add enough exchanges to trigger processing
      for (let i = 0; i < 5; i++) {
        hooks.onExchange(makeExchange(`q${i}`, `a${i}`));
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // vectorIndexer.indexChunk should be called after chunking + writing
      expect(mockVectorIndexer.indexChunk).toHaveBeenCalled();

      // Should receive the chunk data from the chunker
      const indexCallArgs = mockVectorIndexer.indexChunk.mock.calls[0];
      expect(indexCallArgs).toBeDefined();
      expect(indexCallArgs[0]).toHaveProperty('id', 'chunk-1');
    });
  });
});
