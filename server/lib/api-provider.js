/**
 * API Provider - Provider implementation for REST API endpoints
 *
 * Supports OpenAI-compatible endpoints:
 * - DeepSeek
 * - Mistral
 * - Any OpenAI-compatible API
 */

import { createProvider, PROVIDER_TYPES } from './provider-interface.js';

/**
 * API pricing per 1K tokens (USD)
 */
export const API_PRICING = {
  deepseek: { input: 0.0001, output: 0.0002 },
  'deepseek-coder': { input: 0.0001, output: 0.0002 },
  mistral: { input: 0.0002, output: 0.0006 },
  'mistral-large': { input: 0.002, output: 0.006 },
  groq: { input: 0.0001, output: 0.0001 },
  default: { input: 0.001, output: 0.002 },
};

/**
 * Calculate cost from token usage
 * @param {Object} tokenUsage - { input, output }
 * @param {Object} pricing - { input, output } per 1K tokens
 * @returns {number|null} Cost in USD
 */
export function calculateCost(tokenUsage, pricing) {
  if (!tokenUsage || !pricing) return null;

  const inputCost = (tokenUsage.input * pricing.input) / 1000;
  const outputCost = (tokenUsage.output * pricing.output) / 1000;

  return inputCost + outputCost;
}

/**
 * Parse API response
 * @param {Object} response - API response
 * @returns {Object} Parsed result
 */
export function parseResponse(response) {
  const content = response.choices?.[0]?.message?.content || '';
  const usage = response.usage || {};

  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Not JSON, that's ok
  }

  return {
    raw: content,
    parsed,
    tokenUsage: {
      input: usage.prompt_tokens || 0,
      output: usage.completion_tokens || 0,
    },
  };
}

/**
 * Call an OpenAI-compatible API
 * @param {Object} params - Parameters
 * @param {string} params.baseUrl - API base URL
 * @param {string} params.model - Model name
 * @param {string} params.prompt - The prompt
 * @param {string} params.apiKey - API key
 * @param {Object} [params.outputSchema] - JSON schema for output
 * @param {number} [params.maxRetries=3] - Max retry attempts
 * @param {number} [params.retryDelay=1000] - Retry delay in ms
 * @returns {Promise<Object>} ProviderResult
 */
export async function callAPI({
  baseUrl,
  model,
  prompt,
  apiKey,
  outputSchema,
  maxRetries = 3,
  retryDelay = 1000,
}) {
  const url = `${baseUrl}/v1/chat/completions`;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
  };

  if (outputSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        schema: outputSchema,
      },
    };
  }

  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000 || retryDelay));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        lastError = new Error(errorBody.error?.message || response.statusText);
        continue;
      }

      const data = await response.json();
      const parsed = parseResponse(data);

      // Get pricing for cost calculation
      const pricing = API_PRICING[model] || API_PRICING.default;
      const cost = calculateCost(parsed.tokenUsage, pricing);

      return {
        ...parsed,
        exitCode: 0,
        cost,
      };
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
  }

  return {
    raw: '',
    parsed: null,
    exitCode: 1,
    error: lastError?.message || 'API call failed',
    tokenUsage: null,
    cost: null,
  };
}

/**
 * Create an API provider instance
 * @param {Object} config - Provider configuration
 * @returns {Object} Provider instance
 */
export function createAPIProvider(config) {
  const runner = async (prompt, opts) => {
    if (!config.apiKey && !process.env[`${config.name.toUpperCase()}_API_KEY`]) {
      throw new Error(`API key not configured for ${config.name}`);
    }

    return callAPI({
      baseUrl: config.baseUrl,
      model: config.model || config.name,
      prompt,
      apiKey: config.apiKey || process.env[`${config.name.toUpperCase()}_API_KEY`],
      outputSchema: opts.outputSchema,
    });
  };

  return createProvider({
    ...config,
    type: PROVIDER_TYPES.API,
    devserverOnly: config.devserverOnly ?? true,
    runner,
  });
}
