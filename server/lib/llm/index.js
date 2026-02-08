/**
 * LLM Service - Unified API
 *
 * createLLMService(config) → { review(diff), execute(prompt), health() }
 *
 * @module llm
 */

const { createExecutor } = require('./provider-executor.js');
const { createRegistry } = require('./provider-registry.js');
const { createReviewService } = require('./review-service.js');

/**
 * Create the unified LLM service
 * @param {Object} config - Service configuration
 * @param {Object} config.providers - Provider configs { name: { type, command, capabilities } }
 * @param {boolean} config.multiModel - Enable multi-model review
 * @param {number} config.timeout - Default timeout
 * @param {Object} deps - Injectable dependencies
 * @param {Function} deps.healthCheck - Health check function
 * @param {Function} deps.spawn - Process spawn function
 * @param {Function} deps.fetch - HTTP fetch function
 * @returns {Object} Service with review, execute, health methods
 */
function createLLMService(config = {}, deps = {}) {
  const { providers = {}, multiModel = false, timeout } = config;

  // Build health check from deps
  const healthCheck = deps.healthCheck || (() => Promise.resolve({ available: false }));

  // Create registry and load providers
  const registry = createRegistry({ healthCheck, cacheTTL: config.cacheTTL });
  registry.loadFromConfig({ providers });

  // Create executor with real spawn/fetch
  const executor = createExecutor({
    spawn: deps.spawn,
    fetch: deps.fetch,
  });

  // Create review service
  const reviewService = createReviewService({
    registry,
    executor,
    multiModel,
    timeout,
    standards: config.standards || '',
  });

  return {
    /**
     * Review a diff using configured providers
     * @param {string} diff - Git diff content
     * @param {Object} options - Review options
     * @returns {Promise<Object>} { findings, summary, provider, latency }
     */
    review: (diff, options) => reviewService.review(diff, options),

    /**
     * Execute a generic prompt against best available provider
     * @param {string} prompt - Prompt text
     * @param {Object} options - Execution options
     * @returns {Promise<Object>} { response, model, latency }
     */
    execute: async (prompt, options = {}) => {
      const capability = options.capability || 'code-gen';
      const provider = await registry.getBestProvider(capability);

      if (!provider) {
        // Fall back to first available provider
        const allProviders = registry.list();
        if (allProviders.length === 0) {
          return { response: '', error: 'No providers configured' };
        }

        try {
          return await executor.execute(prompt, { ...allProviders[0], timeout });
        } catch (err) {
          return { response: '', error: err.message };
        }
      }

      try {
        return await executor.execute(prompt, { ...provider, timeout });
      } catch (err) {
        return { response: '', error: err.message };
      }
    },

    /**
     * Get health status of all providers
     * @returns {Promise<Object>} { providers: { name: status } }
     */
    health: async () => {
      const allProviders = registry.list();
      const statuses = {};

      for (const provider of allProviders) {
        statuses[provider.name] = await registry.checkHealth(provider.name);
      }

      return { providers: statuses };
    },
  };
}

module.exports = {
  createLLMService,
};
