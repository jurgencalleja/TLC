/**
 * API Adapter
 *
 * HTTP adapter for OpenAI-compatible APIs (LiteLLM, direct).
 *
 * @module llm/adapters/api-adapter
 */

const DEFAULT_TIMEOUT = 60000;

/**
 * Build HTTP request for OpenAI-compatible API
 * @param {string} prompt - Prompt text
 * @param {Object} options - Adapter options
 * @returns {Object} Request specification
 */
function buildRequest(prompt, options = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (options.apiKey) {
    headers['Authorization'] = 'Bearer ' + options.apiKey;
  }

  return {
    url: options.url,
    method: 'POST',
    headers,
    body: {
      model: options.model,
      messages: [{ role: 'user', content: prompt }],
    },
    timeout: options.timeout || DEFAULT_TIMEOUT,
  };
}

/**
 * Parse OpenAI-format API response
 * @param {Object|null} data - Response JSON body
 * @param {Object} httpResponse - HTTP response metadata
 * @returns {Object} Parsed response
 */
function parseApiResponse(data, httpResponse = {}) {
  if (httpResponse.status === 429) {
    return {
      error: 'Rate limited (429)',
      retryable: true,
      response: '',
    };
  }

  if (!data || !data.choices) {
    return {
      error: 'Invalid API response',
      retryable: false,
      response: '',
    };
  }

  const content = data.choices[0]?.message?.content || '';

  return {
    response: content,
    model: data.model || 'unknown',
    tokens: data.usage?.total_tokens || 0,
  };
}

/**
 * Create an API adapter instance
 * @param {Object} config - Adapter config
 * @returns {Object} Adapter with execute interface
 */
function createAdapter(config = {}) {
  return {
    name: 'api',
    execute: async (prompt, deps = {}) => {
      const req = buildRequest(prompt, config);
      const { executeApiProvider } = deps;
      if (!executeApiProvider) {
        throw new Error('executeApiProvider dependency required');
      }
      const result = await executeApiProvider(prompt, {
        ...config,
        fetch: deps.fetch,
      });
      return result;
    },
  };
}

module.exports = {
  buildRequest,
  parseApiResponse,
  createAdapter,
};
