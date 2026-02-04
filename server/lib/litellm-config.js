/**
 * LiteLLM Config Module
 *
 * Configuration management for LiteLLM proxy
 */

const DEFAULT_BASE_URL = 'http://localhost:4000';

/**
 * Create a new LiteLLM configuration
 * @returns {Object} Configuration object
 */
function createConfig() {
  return {
    baseUrl: DEFAULT_BASE_URL,
    models: {},
    fallbacks: {},
    spendLimits: {
      daily: null,
      monthly: null,
      byModel: {},
      byUser: {},
    },
    cache: {
      enabled: false,
      ttl: 3600,
    },
  };
}

/**
 * Set a model alias
 * @param {Object} config - Configuration object
 * @param {Object} options - Alias options
 * @param {string} options.alias - Logical name
 * @param {string} options.provider - Provider name
 * @param {string} options.model - Model identifier
 */
function setModelAlias(config, options) {
  const { alias, provider, model } = options;

  config.models[alias] = {
    provider,
    model,
  };
}

/**
 * Get a model alias
 * @param {Object} config - Configuration object
 * @param {string} alias - Logical name
 * @returns {Object|null} Model configuration or null
 */
function getModelAlias(config, alias) {
  return config.models[alias] || null;
}

/**
 * Set fallback chain for a model
 * @param {Object} config - Configuration object
 * @param {Object} options - Fallback options
 * @param {string} options.primary - Primary model
 * @param {string[]} options.fallbacks - Ordered fallback models
 */
function setFallbackChain(config, options) {
  const { primary, fallbacks } = options;

  config.fallbacks[primary] = fallbacks;
}

/**
 * Get fallback chain for a model
 * @param {Object} config - Configuration object
 * @param {string} model - Model name
 * @returns {string[]} Fallback models
 */
function getFallbackChain(config, model) {
  return config.fallbacks[model] || [];
}

/**
 * Set spend limit
 * @param {Object} config - Configuration object
 * @param {Object} options - Limit options
 * @param {string} options.type - Limit type: 'daily', 'monthly', 'model', 'user'
 * @param {number} options.limit - Limit amount in dollars
 * @param {string} [options.model] - Model name (for model limits)
 * @param {string} [options.user] - User identifier (for user limits)
 */
function setSpendLimit(config, options) {
  const { type, limit, model, user } = options;

  if (type === 'daily') {
    config.spendLimits.daily = limit;
  } else if (type === 'monthly') {
    config.spendLimits.monthly = limit;
  } else if (type === 'model' && model) {
    config.spendLimits.byModel[model] = limit;
  } else if (type === 'user' && user) {
    config.spendLimits.byUser[user] = limit;
  }
}

/**
 * Get spend limit
 * @param {Object} config - Configuration object
 * @param {Object} options - Query options
 * @param {string} options.type - Limit type
 * @param {string} [options.model] - Model name
 * @param {string} [options.user] - User identifier
 * @returns {number|null} Limit or null
 */
function getSpendLimit(config, options) {
  const { type, model, user } = options;

  if (type === 'daily') {
    return config.spendLimits.daily;
  } else if (type === 'monthly') {
    return config.spendLimits.monthly;
  } else if (type === 'model' && model) {
    return config.spendLimits.byModel[model] || null;
  } else if (type === 'user' && user) {
    return config.spendLimits.byUser[user] || null;
  }

  return null;
}

/**
 * Set base URL for LiteLLM proxy
 * @param {Object} config - Configuration object
 * @param {string} url - Base URL
 */
function setBaseUrl(config, url) {
  config.baseUrl = url;
}

/**
 * Get base URL for LiteLLM proxy
 * @param {Object} config - Configuration object
 * @returns {string} Base URL
 */
function getBaseUrl(config) {
  return config.baseUrl;
}

/**
 * Enable response caching
 * @param {Object} config - Configuration object
 * @param {Object} options - Cache options
 * @param {number} [options.ttl=3600] - Cache TTL in seconds
 */
function enableCache(config, options = {}) {
  config.cache.enabled = true;
  config.cache.ttl = options.ttl || 3600;
}

/**
 * Disable response caching
 * @param {Object} config - Configuration object
 */
function disableCache(config) {
  config.cache.enabled = false;
}

/**
 * Check if caching is enabled
 * @param {Object} config - Configuration object
 * @returns {boolean} Cache enabled status
 */
function isCacheEnabled(config) {
  return config.cache.enabled;
}

/**
 * Export configuration
 * @param {Object} config - Configuration object
 * @param {Object} options - Export options
 * @param {string} [options.format='json'] - Export format: 'json' or 'yaml'
 * @returns {string} Exported configuration
 */
function exportConfig(config, options = {}) {
  const { format = 'json' } = options;

  if (format === 'yaml') {
    // Simple YAML export (no external dependencies)
    const lines = [];
    lines.push(`base_url: "${config.baseUrl}"`);
    lines.push('');
    lines.push('models:');
    for (const [alias, model] of Object.entries(config.models)) {
      lines.push(`  ${alias}:`);
      lines.push(`    provider: "${model.provider}"`);
      lines.push(`    model: "${model.model}"`);
    }
    lines.push('');
    lines.push('fallbacks:');
    for (const [primary, fallbacks] of Object.entries(config.fallbacks)) {
      lines.push(`  ${primary}: [${fallbacks.map(f => `"${f}"`).join(', ')}]`);
    }
    lines.push('');
    lines.push('spend_limits:');
    if (config.spendLimits.daily !== null) {
      lines.push(`  daily: ${config.spendLimits.daily}`);
    }
    if (config.spendLimits.monthly !== null) {
      lines.push(`  monthly: ${config.spendLimits.monthly}`);
    }
    lines.push('');
    lines.push('cache:');
    lines.push(`  enabled: ${config.cache.enabled}`);
    lines.push(`  ttl: ${config.cache.ttl}`);

    return lines.join('\n');
  }

  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration
 * @param {string} data - Configuration data
 * @param {Object} options - Import options
 * @param {string} [options.format='json'] - Import format
 * @returns {Object} Configuration object
 */
function importConfig(data, options = {}) {
  const { format = 'json' } = options;

  if (format === 'json') {
    const imported = JSON.parse(data);
    const config = createConfig();

    if (imported.models) {
      config.models = imported.models;
    }
    if (imported.fallbacks) {
      config.fallbacks = imported.fallbacks;
    }
    if (imported.baseUrl) {
      config.baseUrl = imported.baseUrl;
    }
    if (imported.spendLimits) {
      config.spendLimits = { ...config.spendLimits, ...imported.spendLimits };
    }
    if (imported.cache) {
      config.cache = { ...config.cache, ...imported.cache };
    }

    return config;
  }

  // For YAML, we'd need a parser - return default config
  return createConfig();
}

module.exports = {
  createConfig,
  setModelAlias,
  getModelAlias,
  setFallbackChain,
  getFallbackChain,
  setSpendLimit,
  getSpendLimit,
  setBaseUrl,
  getBaseUrl,
  enableCache,
  disableCache,
  isCacheEnabled,
  exportConfig,
  importConfig,
  DEFAULT_BASE_URL,
};
