/**
 * Model Pricing Module
 *
 * Pricing database for all supported models
 */

const fs = require('fs');

/**
 * Default pricing for known models (per 1K tokens)
 * Prices are approximate and should be updated regularly
 */
const DEFAULT_PRICING = {
  // Anthropic Claude models
  'claude-3-opus': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075 },
  'claude-3-sonnet': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'claude-3-haiku': { inputPer1kTokens: 0.00025, outputPer1kTokens: 0.00125 },
  'claude-3.5-sonnet': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'claude-opus-4-5-20251101': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075 },

  // OpenAI models
  'gpt-4': { inputPer1kTokens: 0.03, outputPer1kTokens: 0.06 },
  'gpt-4-turbo': { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  'gpt-4o': { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015 },
  'gpt-3.5-turbo': { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
  'o1': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.06 },
  'o3': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.06 },

  // DeepSeek models
  'deepseek-r1': { inputPer1kTokens: 0.00055, outputPer1kTokens: 0.00219 },
  'deepseek-chat': { inputPer1kTokens: 0.00014, outputPer1kTokens: 0.00028 },
  'deepseek-coder': { inputPer1kTokens: 0.00014, outputPer1kTokens: 0.00028 },

  // Google Gemini models
  'gemini-2.0-flash': { inputPer1kTokens: 0.00, outputPer1kTokens: 0.00 },
  'gemini-1.5-pro': { inputPer1kTokens: 0.00125, outputPer1kTokens: 0.005 },
  'gemini-1.5-flash': { inputPer1kTokens: 0.000075, outputPer1kTokens: 0.0003 },
};

// Runtime pricing (can be modified)
let runtimePricing = { ...DEFAULT_PRICING };

// Fallback rate for unknown models
const FALLBACK_RATE = { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 };

/**
 * Get pricing for a model
 * @param {string} model - Model name
 * @returns {Object|null} Pricing object or null if unknown
 */
function getPricing(model) {
  return runtimePricing[model] || null;
}

/**
 * Calculate cost from token counts
 * @param {Object} options - Calculation options
 * @param {string} options.model - Model name
 * @param {number} options.inputTokens - Input token count
 * @param {number} options.outputTokens - Output token count
 * @param {boolean} [options.isLocal] - Whether this is a local model
 * @param {boolean} [options.useFallback=true] - Use fallback pricing for unknown
 * @returns {number} Cost in dollars
 */
function calculateCost(options) {
  const { model, inputTokens, outputTokens, isLocal, useFallback = true } = options;

  // Local models are free
  if (isLocal) {
    return 0;
  }

  const pricing = getPricing(model);

  if (!pricing) {
    if (!useFallback) {
      return 0;
    }
    // Use fallback rate
    const inputCost = (inputTokens / 1000) * FALLBACK_RATE.inputPer1kTokens;
    const outputCost = (outputTokens / 1000) * FALLBACK_RATE.outputPer1kTokens;
    return inputCost + outputCost;
  }

  const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokens;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens;

  return inputCost + outputCost;
}

/**
 * Load custom pricing from config file
 * @param {string} filePath - Path to pricing config
 * @param {Object} options - Options including fs module
 * @returns {Object} Loaded pricing
 */
function loadPricing(filePath, options = {}) {
  const fsModule = options.fs || fs;

  if (!fsModule.existsSync(filePath)) {
    return { ...DEFAULT_PRICING };
  }

  try {
    const custom = JSON.parse(fsModule.readFileSync(filePath, 'utf-8'));
    return { ...DEFAULT_PRICING, ...custom };
  } catch (err) {
    return { ...DEFAULT_PRICING };
  }
}

/**
 * Update pricing for a model at runtime
 * @param {string} model - Model name
 * @param {Object} pricing - Pricing object
 * @param {number} pricing.inputPer1kTokens - Input cost per 1K tokens
 * @param {number} pricing.outputPer1kTokens - Output cost per 1K tokens
 */
function updatePricing(model, pricing) {
  runtimePricing[model] = pricing;
}

/**
 * Get all default pricing
 * @returns {Object} Default pricing for all models
 */
function getDefaultPricing() {
  return { ...DEFAULT_PRICING };
}

/**
 * Estimate cost using fallback rates
 * @param {Object} options - Estimation options
 * @param {string} options.model - Model name (may be unknown)
 * @param {number} options.inputTokens - Input token count
 * @param {number} options.outputTokens - Output token count
 * @returns {number} Estimated cost
 */
function estimateCost(options) {
  const { model, inputTokens, outputTokens } = options;

  const pricing = getPricing(model) || FALLBACK_RATE;

  const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokens;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens;

  return inputCost + outputCost;
}

/**
 * Format cost as currency string
 * @param {number} cost - Cost in dollars
 * @returns {string} Formatted cost string
 */
function formatCost(cost) {
  if (cost === 0) {
    return '$0.00';
  }

  if (cost < 0.0001) {
    return '<$0.0001';
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }

  return `$${cost.toFixed(2)}`;
}

/**
 * Reset runtime pricing to defaults
 */
function resetPricing() {
  runtimePricing = { ...DEFAULT_PRICING };
}

module.exports = {
  getPricing,
  calculateCost,
  loadPricing,
  updatePricing,
  getDefaultPricing,
  estimateCost,
  formatCost,
  resetPricing,
  DEFAULT_PRICING,
  FALLBACK_RATE,
};
