/**
 * Embedding Client — Ollama-based text embedding with graceful degradation.
 *
 * Generates vector embeddings from text using a local Ollama instance.
 * Returns null when Ollama is unavailable (caller falls back to text search).
 *
 * @module embedding-client
 */

/** Max characters to send per embed request (~8192 tokens * 4 chars/token) */
const MAX_INPUT_CHARS = 32768;

/** Known model dimensions */
const MODEL_DIMENSIONS = {
  'mxbai-embed-large': 1024,
  'nomic-embed-text': 768,
  'all-minilm': 384,
};

/**
 * Create an embedding client that talks to Ollama.
 *
 * @param {object} [options]
 * @param {string} [options.host='http://localhost:11434'] - Ollama host URL
 * @param {string} [options.model='mxbai-embed-large'] - Embedding model name
 * @param {number} [options.timeout=30000] - Request timeout in ms
 * @returns {object} Client with embed/embedBatch/isAvailable/getModelInfo
 */
export function createEmbeddingClient(options = {}) {
  const host = options.host || 'http://localhost:11434';
  const model = options.model || 'mxbai-embed-large';
  const timeout = options.timeout || 30000;

  /**
   * Truncate text to fit within model token limits.
   */
  function truncateText(text) {
    if (text.length > MAX_INPUT_CHARS) {
      return text.slice(0, MAX_INPUT_CHARS);
    }
    return text;
  }

  /**
   * Embed a single text string.
   * @param {string} text
   * @returns {Promise<Float32Array|null>} Embedding or null if unavailable
   */
  async function embed(text) {
    if (!text || text.length === 0) {
      return null;
    }

    try {
      const input = truncateText(text);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${host}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.embeddings || data.embeddings.length === 0) {
        return null;
      }

      return new Float32Array(data.embeddings[0]);
    } catch {
      return null;
    }
  }

  /**
   * Embed multiple texts in a single batch request.
   * @param {string[]} texts
   * @returns {Promise<(Float32Array|null)[]>}
   */
  async function embedBatch(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    try {
      const inputs = texts.map(truncateText);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${host}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: inputs }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return texts.map(() => null);
      }

      const data = await response.json();
      if (!data.embeddings) {
        return texts.map(() => null);
      }

      return data.embeddings.map((emb) => new Float32Array(emb));
    } catch {
      return texts.map(() => null);
    }
  }

  /**
   * Check if Ollama is running and accessible.
   * @returns {Promise<boolean>}
   */
  async function isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${host}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get info about the configured embedding model.
   * @returns {{ model: string, dimensions: number }}
   */
  function getModelInfo() {
    return {
      model,
      dimensions: MODEL_DIMENSIONS[model] || 1024,
    };
  }

  return {
    embed,
    embedBatch,
    isAvailable,
    getModelInfo,
  };
}
