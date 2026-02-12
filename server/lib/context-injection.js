/**
 * Context Injection — semantic-aware context building that integrates
 * vector-based conversation recall into CLAUDE.md injection.
 *
 * Task 7 (Phase 71): Enhanced Context Injection
 *
 * Provides weighted scoring for context relevance and formats recalled
 * conversations as markdown suitable for injection into CLAUDE.md.
 *
 * @module context-injection
 */

/**
 * Maximum character length for conversation text summaries.
 * Longer texts are truncated to keep context concise.
 */
const MAX_CONVERSATION_TEXT_LENGTH = 300;

/**
 * Semantic weights for ranking context relevance.
 * All weights sum to 1.0.
 *
 * @type {Object<string, number>}
 */
export const SEMANTIC_WEIGHTS = Object.freeze({
  VECTOR_SIMILARITY: 0.35,
  FILE_MATCH: 0.20,
  BRANCH_MATCH: 0.20,
  RECENCY: 0.15,
  KEYWORD_MATCH: 0.10,
});

/**
 * Truncate text to a maximum length, appending ellipsis if truncated.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Build semantic context by querying the vector store for related conversations.
 *
 * When a semanticRecall instance and vectorStore are provided, this calls
 * `semanticRecall.recallForContext()` to retrieve relevant past conversations.
 * Results are sorted by score (highest first) and conversation text is truncated
 * for concise summaries.
 *
 * Falls back gracefully to an empty conversations array when no vectorStore
 * is available.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} context - Current session context
 * @param {string} context.projectId - Project identifier
 * @param {string} context.workspace - Workspace path
 * @param {string} context.branch - Current git branch
 * @param {string[]} context.touchedFiles - Recently modified files
 * @param {object} [options={}] - Options
 * @param {object} [options.semanticRecall] - Semantic recall instance with recallForContext()
 * @param {object} [options.vectorStore] - Vector store instance
 * @returns {Promise<{conversations: Array}>} Semantic context with recalled conversations
 */
export async function buildSemanticContext(projectRoot, context, options = {}) {
  const { semanticRecall, vectorStore } = options;

  // Fall back to empty conversations when no vector store is available
  if (!vectorStore || !semanticRecall) {
    return { conversations: [] };
  }

  try {
    const results = await semanticRecall.recallForContext(projectRoot, context);

    // Process and sort results by score (highest first)
    const conversations = results
      .map((result) => ({
        ...result,
        text: truncateText(result.text, MAX_CONVERSATION_TEXT_LENGTH),
      }))
      .sort((a, b) => b.score - a.score);

    return { conversations };
  } catch (_err) {
    // If recall fails, fall back gracefully
    return { conversations: [] };
  }
}

/**
 * Format semantic context as markdown suitable for CLAUDE.md injection.
 *
 * Produces a "## Related Conversations" section listing each recalled
 * conversation as a markdown bullet point. Returns an empty string when
 * there are no conversations to display, maintaining backward compatibility.
 *
 * @param {object} semanticContext - Output from buildSemanticContext()
 * @param {Array} semanticContext.conversations - Recalled conversation entries
 * @returns {string} Formatted markdown string (empty if no conversations)
 */
export function formatContextForInjection(semanticContext) {
  const { conversations = [] } = semanticContext;

  if (conversations.length === 0) {
    return '';
  }

  const lines = ['## Related Conversations', ''];

  for (const convo of conversations) {
    const score = convo.score != null ? ` (relevance: ${convo.score.toFixed(2)})` : '';
    lines.push(`- ${convo.text}${score}`);
  }

  return lines.join('\n') + '\n';
}
