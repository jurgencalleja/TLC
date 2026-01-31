/**
 * Base Adapter - Common interface for all model adapters
 */

/**
 * Schema for standardized review response
 */
const REVIEW_RESPONSE_SCHEMA = {
  issues: 'array',      // Array of { id, severity, message, line?, suggestion? }
  suggestions: 'array', // Array of strings
  score: 'number',      // 0-100 quality score
  model: 'string',      // Model name
  tokensUsed: 'number', // Tokens consumed
  cost: 'number',       // Cost in USD
};

/**
 * Base adapter class - all model adapters extend this
 */
class BaseAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = config.name || 'unknown';
  }

  /**
   * Review code for issues and suggestions
   * @param {string} code - Code to review
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Standardized review response
   */
  async review(code, context = {}) {
    throw new Error('Not implemented: review');
  }

  /**
   * Analyze codebase for patterns
   * @param {string} codebase - Codebase path or content
   * @param {string} query - Analysis query
   * @returns {Promise<Object>} Analysis result
   */
  async analyze(codebase, query) {
    throw new Error('Not implemented: analyze');
  }

  /**
   * Get current usage stats
   * @returns {Object} Usage stats { daily, monthly, requests }
   */
  getUsage() {
    return { daily: 0, monthly: 0, requests: 0 };
  }

  /**
   * Estimate cost for a request
   * @param {number} tokens - Estimated tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(tokens) {
    return 0;
  }

  /**
   * Check if adapter can afford a request
   * @param {number} estimatedCost - Estimated cost
   * @returns {boolean} Whether request is within budget
   */
  canAfford(estimatedCost = 0) {
    return true;
  }

  /**
   * Create empty but valid response
   * @returns {Object} Empty review response
   */
  createEmptyResponse() {
    return {
      issues: [],
      suggestions: [],
      score: 100,
      model: this.name,
      tokensUsed: 0,
      cost: 0,
    };
  }

  /**
   * Validate response against schema
   * @param {Object} response - Response to validate
   * @returns {boolean} Whether response is valid
   */
  static validateResponse(response) {
    if (!response) return false;

    // Check required fields
    for (const [field, type] of Object.entries(REVIEW_RESPONSE_SCHEMA)) {
      if (!(field in response)) return false;

      if (type === 'array' && !Array.isArray(response[field])) return false;
      if (type === 'number' && typeof response[field] !== 'number') return false;
      if (type === 'string' && typeof response[field] !== 'string') return false;
    }

    // Validate score range
    if (response.score < 0 || response.score > 100) return false;

    return true;
  }
}

module.exports = {
  BaseAdapter,
  REVIEW_RESPONSE_SCHEMA,
};
