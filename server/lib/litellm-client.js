/**
 * LiteLLM Client Module
 *
 * Client for interacting with LiteLLM proxy
 */

/**
 * Create a LiteLLM client
 * @param {Object} options - Client options
 * @param {string} options.baseUrl - LiteLLM proxy URL
 * @param {string} [options.apiKey] - API key for authentication
 * @returns {Object} Client instance
 */
function createClient(options) {
  const { baseUrl, apiKey } = options;

  return {
    baseUrl,
    apiKey,
    _fetch: globalThis.fetch,
  };
}

/**
 * Make a completion request
 * @param {Object} client - Client instance
 * @param {Object} options - Completion options
 * @param {string} options.model - Model to use
 * @param {string} options.prompt - Input prompt
 * @param {number} [options.maxTokens] - Maximum tokens
 * @param {number} [options.temperature] - Temperature
 * @returns {Promise<Object>} Completion response
 */
async function completion(client, options) {
  const { model, prompt, maxTokens, temperature } = options;

  const body = {
    model,
    prompt,
  };

  if (maxTokens) body.max_tokens = maxTokens;
  if (temperature !== undefined) body.temperature = temperature;

  const response = await client._fetch(`${client.baseUrl}/v1/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(client.apiKey && { 'Authorization': `Bearer ${client.apiKey}` }),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Completion failed: ${error}`);
  }

  return response.json();
}

/**
 * Make a chat completion request
 * @param {Object} client - Client instance
 * @param {Object} options - Chat options
 * @param {string} options.model - Model to use
 * @param {Array} options.messages - Chat messages
 * @param {boolean} [options.stream] - Enable streaming
 * @param {number} [options.maxTokens] - Maximum tokens
 * @param {number} [options.temperature] - Temperature
 * @returns {Promise<Object>} Chat response
 */
async function chat(client, options) {
  const { model, messages, stream, maxTokens, temperature } = options;

  const body = {
    model,
    messages,
    stream: stream || false,
  };

  if (maxTokens) body.max_tokens = maxTokens;
  if (temperature !== undefined) body.temperature = temperature;

  const response = await client._fetch(`${client.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(client.apiKey && { 'Authorization': `Bearer ${client.apiKey}` }),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat failed: ${error}`);
  }

  if (stream && response.body) {
    return { stream: response.body };
  }

  return response.json();
}

/**
 * Get usage statistics
 * @param {Object} client - Client instance
 * @param {Object} [options] - Query options
 * @param {string} [options.startDate] - Start date
 * @param {string} [options.endDate] - End date
 * @returns {Promise<Object>} Usage statistics
 */
async function getUsage(client, options = {}) {
  const { startDate, endDate } = options;

  let url = `${client.baseUrl}/spend/logs`;
  const params = new URLSearchParams();

  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await client._fetch(url, {
    headers: {
      ...(client.apiKey && { 'Authorization': `Bearer ${client.apiKey}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage');
  }

  return response.json();
}

/**
 * Get available models
 * @param {Object} client - Client instance
 * @returns {Promise<Array>} List of models
 */
async function getModels(client) {
  const response = await client._fetch(`${client.baseUrl}/v1/models`, {
    headers: {
      ...(client.apiKey && { 'Authorization': `Bearer ${client.apiKey}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Check proxy health
 * @param {Object} client - Client instance
 * @returns {Promise<Object>} Health status
 */
async function healthCheck(client) {
  try {
    const response = await client._fetch(`${client.baseUrl}/health`, {
      headers: {
        ...(client.apiKey && { 'Authorization': `Bearer ${client.apiKey}` }),
      },
    });

    if (!response.ok) {
      return { status: 'unhealthy', error: 'Bad response' };
    }

    const result = await response.json();
    return { status: result.status || 'healthy', ...result };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * Set API key
 * @param {Object} client - Client instance
 * @param {string} apiKey - New API key
 */
function setApiKey(client, apiKey) {
  client.apiKey = apiKey;
}

/**
 * Execute request with fallback
 * @param {Object} client - Client instance
 * @param {Object} options - Fallback options
 * @param {string} options.primary - Primary model
 * @param {string[]} options.fallbacks - Fallback models
 * @param {Object} options.request - Request options
 * @returns {Promise<Object>} Response
 */
async function withFallback(client, options) {
  const { primary, fallbacks, request } = options;

  const models = [primary, ...fallbacks];
  const errors = [];

  for (const model of models) {
    try {
      const result = await completion(client, {
        ...request,
        model,
      });
      return result;
    } catch (error) {
      errors.push({ model, error: error.message });
    }
  }

  throw new Error(`All models failed: ${errors.map(e => `${e.model}: ${e.error}`).join(', ')}`);
}

module.exports = {
  createClient,
  completion,
  chat,
  getUsage,
  getModels,
  healthCheck,
  setApiKey,
  withFallback,
};
