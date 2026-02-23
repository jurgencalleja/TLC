/**
 * Ollama health checker.
 *
 * Checks whether Ollama is installed, running, and has the required
 * embedding model. Returns actionable messages for each failure state.
 * Results are cached for 60 seconds.
 *
 * @module ollama-health
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const REQUIRED_MODEL = 'mxbai-embed-large';
const CACHE_TTL_MS = 60 * 1000;

/** @enum {string} */
const OLLAMA_STATUS = {
  READY: 'ready',
  NOT_INSTALLED: 'not_installed',
  NOT_RUNNING: 'not_running',
  NO_MODEL: 'no_model',
};

let cachedResult = null;
let cachedAt = 0;

/**
 * Check Ollama health status.
 *
 * @param {object} [deps] - Injectable dependencies for testing
 * @param {Function} [deps.fetch] - Fetch implementation
 * @returns {Promise<{status: string, message: string, action: string}>}
 */
async function checkOllamaHealth(deps = {}) {
  const now = Date.now();
  if (cachedResult && (now - cachedAt) < CACHE_TTL_MS) {
    return cachedResult;
  }

  const fetchFn = deps.fetch || globalThis.fetch;

  try {
    const response = await fetchFn(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      cachedResult = {
        status: OLLAMA_STATUS.NOT_RUNNING,
        message: 'Ollama responded with an error',
        action: 'Restart Ollama: ollama serve',
      };
      cachedAt = now;
      return cachedResult;
    }

    const data = await response.json();
    const models = data.models || [];
    const hasModel = models.some(m => m.name && m.name.startsWith(REQUIRED_MODEL));

    if (hasModel) {
      cachedResult = {
        status: OLLAMA_STATUS.READY,
        message: 'Memory: full (pattern detection + semantic search)',
        action: '',
      };
    } else {
      cachedResult = {
        status: OLLAMA_STATUS.NO_MODEL,
        message: `Ollama running but ${REQUIRED_MODEL} model not found`,
        action: `ollama pull ${REQUIRED_MODEL}`,
      };
    }
  } catch {
    cachedResult = {
      status: OLLAMA_STATUS.NOT_RUNNING,
      message: 'Ollama not running. Semantic search disabled, pattern detection still works.',
      action: 'brew install ollama && ollama serve && ollama pull mxbai-embed-large',
    };
  }

  cachedAt = now;
  return cachedResult;
}

/** Clear the cache (for testing). */
checkOllamaHealth._clearCache = function () {
  cachedResult = null;
  cachedAt = 0;
};

module.exports = { checkOllamaHealth, OLLAMA_STATUS };
