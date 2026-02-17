/**
 * Remember Command
 *
 * Provides the /tlc:remember command that captures conversation context
 * or explicit text as permanent memory entries.
 *
 * Permanent memories:
 * - Have `permanent: true` in frontmatter and vector metadata
 * - Are written to memory/conversations/ with [PERMANENT] prefix in title
 * - Are indexed in the vector store with permanent = 1
 * - Are never pruned or archived
 *
 * @module remember-command
 */

/**
 * Creates a remember command instance with injected dependencies.
 *
 * @param {object} deps
 * @param {object} deps.richCapture - Writer with writeConversationChunk(projectRoot, chunk)
 * @param {object} deps.vectorIndexer - Indexer with indexChunk(projectRoot, chunk)
 * @param {object} deps.embeddingClient - Client with embed(text) for generating embeddings
 * @returns {{ execute: (projectRoot: string, options: object) => Promise<object> }}
 */
export function createRememberCommand({ richCapture, vectorIndexer, embeddingClient }) {
  /**
   * Execute the remember command.
   *
   * @param {string} projectRoot - Absolute path to the project root
   * @param {object} options - Command options
   * @param {string} [options.text] - Explicit text to remember
   * @param {Array<{user: string, assistant: string, timestamp?: number}>} [options.exchanges] - Recent conversation exchanges
   * @returns {Promise<{success: boolean, message: string, filePath?: string}>}
   */
  async function execute(projectRoot, options = {}) {
    const { text, exchanges } = options;

    // Handle empty text — return guidance
    if (text !== undefined && !text) {
      return {
        success: false,
        message:
          'Please provide text to remember, or pass recent exchanges for automatic capture. ' +
          'Usage: /tlc:remember "Always use UTC timestamps"',
      };
    }

    // Build the chunk for richCapture
    const chunk = {
      permanent: true,
    };

    if (text) {
      // Explicit text mode
      chunk.title = `[PERMANENT] ${text}`;
      chunk.topic = text;
      chunk.content = text;
      chunk.text = text;
    } else if (exchanges && exchanges.length > 0) {
      // Exchange capture mode
      const summary = exchanges
        .map((ex) => ex.user)
        .join('; ')
        .slice(0, 80);
      chunk.title = `[PERMANENT] ${summary}`;
      chunk.topic = summary;
      chunk.exchanges = exchanges;
      chunk.text = summary;
    } else {
      return {
        success: false,
        message:
          'Nothing to remember. Provide text or recent exchanges. ' +
          'Usage: /tlc:remember "Always use UTC timestamps"',
      };
    }

    // Write the chunk to disk via richCapture
    const filePath = await richCapture.writeConversationChunk(projectRoot, chunk);

    // Index in the vector store with permanent flag
    await vectorIndexer.indexChunk(projectRoot, {
      ...chunk,
      filePath,
      permanent: true,
    });

    // Build confirmation message
    const displayText = text || chunk.topic;
    return {
      success: true,
      message: `Remembered permanently: ${displayText}`,
      filePath,
    };
  }

  return { execute };
}
