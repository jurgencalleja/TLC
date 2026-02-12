/**
 * Context Injection Tests
 * Tests for integrating semantic recall into context building.
 *
 * Task 7 (Phase 71): Enhanced Context Injection
 *   - buildSemanticContext() calls recallForContext when vectorStore provided
 *   - Falls back to empty conversations when no vectorStore
 *   - New SEMANTIC_WEIGHTS with VECTOR_SIMILARITY: 0.35
 *   - Conversation chunks included in semantic context output
 *   - formatContextForInjection() produces "Related Conversations" section
 *   - Backward compatible: no vector store = same format as before
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import {
  buildSemanticContext,
  formatContextForInjection,
  SEMANTIC_WEIGHTS,
} from './context-injection.js';

/**
 * Creates a mock vector store with vi.fn() methods.
 * @returns {object} Mock vector store
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
 * Creates a mock embedding client that returns deterministic embeddings.
 * @returns {object} Mock embedding client
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
 * Creates a mock semantic recall instance with recallForContext.
 * @param {Array} results - Results to return from recallForContext
 * @returns {object} Mock semantic recall with vi.fn() methods
 */
function createMockSemanticRecall(results = []) {
  return {
    recall: vi.fn().mockResolvedValue(results),
    recallForContext: vi.fn().mockResolvedValue(results),
  };
}

/**
 * Creates a mock conversation recall result.
 * @param {object} overrides - Properties to override
 * @returns {object} A mock conversation result
 */
function createConversationResult(overrides = {}) {
  return {
    id: 'conv-1',
    text: 'Discussed auth token refresh strategy using short-lived JWTs with rotation.',
    score: 0.85,
    type: 'conversation',
    source: {
      project: 'my-project',
      workspace: '/ws',
      branch: 'main',
      sourceFile: 'sessions/2025-01-15.md',
    },
    date: Date.now() - 86400000,
    permanent: false,
    ...overrides,
  };
}

describe('context-injection', () => {
  let mockVectorStore;
  let mockEmbeddingClient;
  let mockSemanticRecall;

  beforeEach(() => {
    mockVectorStore = createMockVectorStore();
    mockEmbeddingClient = createMockEmbeddingClient();
    mockSemanticRecall = createMockSemanticRecall();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SEMANTIC_WEIGHTS', () => {
    it('new relevance weights sum to 1.0', () => {
      // Task 7 defines new weights:
      //   VECTOR_SIMILARITY: 0.35, FILE_MATCH: 0.20, BRANCH_MATCH: 0.20,
      //   RECENCY: 0.15, KEYWORD_MATCH: 0.10
      const sum = Object.values(SEMANTIC_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);

      // Verify individual weights exist with correct values
      expect(SEMANTIC_WEIGHTS).toHaveProperty('VECTOR_SIMILARITY', 0.35);
      expect(SEMANTIC_WEIGHTS).toHaveProperty('FILE_MATCH', 0.20);
      expect(SEMANTIC_WEIGHTS).toHaveProperty('BRANCH_MATCH', 0.20);
      expect(SEMANTIC_WEIGHTS).toHaveProperty('RECENCY', 0.15);
      expect(SEMANTIC_WEIGHTS).toHaveProperty('KEYWORD_MATCH', 0.10);
    });
  });

  describe('buildSemanticContext', () => {
    it('calls recallForContext when vectorStore is provided', async () => {
      const conversationResults = [
        createConversationResult({ id: 'conv-1', text: 'Auth token discussion' }),
        createConversationResult({ id: 'conv-2', text: 'Database migration plan' }),
      ];
      mockSemanticRecall = createMockSemanticRecall(conversationResults);

      const context = {
        projectId: 'my-project',
        workspace: '/ws',
        branch: 'main',
        touchedFiles: ['src/auth/token.js'],
      };

      const result = await buildSemanticContext('/path/to/project', context, {
        semanticRecall: mockSemanticRecall,
        vectorStore: mockVectorStore,
      });

      // recallForContext should have been called with the project root and context
      expect(mockSemanticRecall.recallForContext).toHaveBeenCalledWith(
        '/path/to/project',
        context
      );
      // Result should include the recalled conversations
      expect(result.conversations).toBeDefined();
      expect(result.conversations).toHaveLength(2);
    });

    it('returns empty conversations when no vectorStore is provided', async () => {
      const context = {
        projectId: 'my-project',
        workspace: '/ws',
        branch: 'main',
        touchedFiles: [],
      };

      const result = await buildSemanticContext('/path/to/project', context, {
        // No vectorStore, no semanticRecall
      });

      // Should fall back gracefully with empty conversations
      expect(result.conversations).toBeDefined();
      expect(result.conversations).toHaveLength(0);
    });

    it('vector similarity score integrated into ranking (scoreWithVector)', async () => {
      // When vector store is available, the ranking should incorporate
      // VECTOR_SIMILARITY weight (0.35) from SEMANTIC_WEIGHTS
      const conversationResults = [
        createConversationResult({
          id: 'conv-high',
          text: 'High relevance auth discussion',
          score: 0.95,
        }),
        createConversationResult({
          id: 'conv-low',
          text: 'Low relevance logging setup',
          score: 0.40,
        }),
      ];
      mockSemanticRecall = createMockSemanticRecall(conversationResults);

      const context = {
        projectId: 'my-project',
        workspace: '/ws',
        branch: 'main',
        touchedFiles: ['src/auth/login.js'],
      };

      const result = await buildSemanticContext('/path/to/project', context, {
        semanticRecall: mockSemanticRecall,
        vectorStore: mockVectorStore,
      });

      // Conversations should be ordered by score (highest first)
      expect(result.conversations.length).toBeGreaterThanOrEqual(2);
      expect(result.conversations[0].score).toBeGreaterThanOrEqual(
        result.conversations[1].score
      );
    });

    it('includes conversation chunks in semantic context output', async () => {
      const conversationResults = [
        createConversationResult({
          id: 'conv-1',
          text: 'We decided to use JWT for auth tokens with 15-minute expiry and refresh rotation.',
          type: 'conversation',
          score: 0.90,
        }),
        createConversationResult({
          id: 'conv-2',
          text: 'Database migration strategy: use knex with timestamped migration files.',
          type: 'conversation',
          score: 0.80,
        }),
      ];
      mockSemanticRecall = createMockSemanticRecall(conversationResults);

      const context = {
        projectId: 'my-project',
        workspace: '/ws',
        branch: 'main',
        touchedFiles: [],
      };

      const result = await buildSemanticContext('/path/to/project', context, {
        semanticRecall: mockSemanticRecall,
        vectorStore: mockVectorStore,
      });

      // Context output should contain actual conversation text chunks
      expect(result.conversations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            text: expect.stringContaining('JWT'),
          }),
          expect.objectContaining({
            id: 'conv-2',
            text: expect.stringContaining('migration'),
          }),
        ])
      );
    });

    it('conversation summaries are concise (not full exchanges)', async () => {
      // Conversations returned should have text that is a summary, not a
      // full multi-turn exchange. The text in each result should be
      // a concise chunk suitable for context injection.
      const longExchange = 'A'.repeat(5000); // Simulating a very long conversation
      const conversationResults = [
        createConversationResult({
          id: 'conv-long',
          text: longExchange,
          score: 0.85,
        }),
      ];
      mockSemanticRecall = createMockSemanticRecall(conversationResults);

      const context = {
        projectId: 'my-project',
        workspace: '/ws',
        branch: 'main',
        touchedFiles: [],
      };

      const result = await buildSemanticContext('/path/to/project', context, {
        semanticRecall: mockSemanticRecall,
        vectorStore: mockVectorStore,
      });

      // Each conversation in the output should be truncated to a concise summary
      // (implementation should cap at a reasonable length, e.g., 300 chars)
      for (const convo of result.conversations) {
        expect(convo.text.length).toBeLessThanOrEqual(300);
      }
    });
  });

  describe('formatContextForInjection', () => {
    it('includes "Related Conversations" section when conversations exist', () => {
      const semanticContext = {
        conversations: [
          createConversationResult({
            id: 'conv-1',
            text: 'Auth token refresh uses short-lived JWTs.',
            score: 0.90,
          }),
          createConversationResult({
            id: 'conv-2',
            text: 'Database indexes on user_id for performance.',
            score: 0.80,
          }),
        ],
      };

      const formatted = formatContextForInjection(semanticContext);

      // Should contain the Related Conversations header
      expect(formatted).toContain('## Related Conversations');
      // Should contain the conversation text
      expect(formatted).toContain('Auth token refresh');
      expect(formatted).toContain('Database indexes');
      // Should be valid markdown
      expect(formatted).toContain('- ');
    });

    it('omits conversations section when conversations array is empty', () => {
      const semanticContext = {
        conversations: [],
      };

      const formatted = formatContextForInjection(semanticContext);

      // Should NOT contain the Related Conversations header
      expect(formatted).not.toContain('## Related Conversations');
      // Formatted output may be empty or contain other sections, but no conversations
      expect(formatted).not.toContain('conversation');
    });

    it('backward compatible: without vector store, produces same format', () => {
      // When no vector store was used, semanticContext has empty conversations.
      // The formatted output should match the pre-Task-7 format: no new sections,
      // no "Related Conversations" header, just the existing context structure.
      const semanticContextWithoutVector = {
        conversations: [],
      };

      const formatted = formatContextForInjection(semanticContextWithoutVector);

      // No new sections should appear
      expect(formatted).not.toContain('## Related Conversations');

      // The output should be a string (possibly empty) that doesn't break
      // existing CLAUDE.md injection
      expect(typeof formatted).toBe('string');

      // If there's nothing to inject, the result should be empty or whitespace-only
      expect(formatted.trim()).toBe('');
    });
  });
});
