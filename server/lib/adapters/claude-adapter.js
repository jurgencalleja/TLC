/**
 * Claude Adapter - Adapter for Claude API
 * Note: In TLC context, Claude is subscription-based so no per-request cost
 */

const { BaseAdapter } = require('./base-adapter.js');

// Latest model: claude-opus-4-5-20251101 (Claude Opus 4.5)
const CLAUDE_MODEL = 'claude-opus-4-5-20251101';

const CLAUDE_PRICING = {
  // Pricing per 1M tokens (Claude Opus 4.5)
  inputPerMillion: 15.00,
  outputPerMillion: 75.00,
};

class ClaudeAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({
      name: 'claude',
      ...config,
    });
    this.budgetTracker = config.budgetTracker || null;
    this.pricing = config.pricing || CLAUDE_PRICING;
    this.model = config.model || CLAUDE_MODEL;
    this.trackCost = config.trackCost !== false;
  }

  /**
   * Review code for issues and suggestions
   * @param {string} code - Code to review
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Standardized review response
   */
  async review(code, context = {}) {
    if (!code || code.trim() === '') {
      return this.createEmptyResponse();
    }

    // Check budget if tracking
    const estimatedTokens = this.estimateTokens(code);
    const estimatedCost = this.estimateCost(estimatedTokens);

    if (this.trackCost && !this.canAfford(estimatedCost)) {
      throw new Error('Budget exceeded for Claude');
    }

    try {
      // Simulate API call - in real implementation, call Claude API
      const result = await this.callAPI(code, context);

      // Record cost if tracking
      if (this.trackCost && this.budgetTracker) {
        this.budgetTracker.record('claude', result.cost || 0);
      }

      return result;
    } catch (error) {
      // Return empty response on error, don't throw
      return {
        ...this.createEmptyResponse(),
        error: error.message,
      };
    }
  }

  /**
   * Call Claude API (mock implementation)
   * @param {string} code - Code to review
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} API response
   */
  async callAPI(code, context) {
    // This is a mock - in production, call actual Claude API
    // For now, simulate a response
    const tokensUsed = this.estimateTokens(code);
    const cost = this.estimateCost(tokensUsed);

    return {
      issues: [],
      suggestions: [],
      score: 100,
      model: this.name,
      tokensUsed,
      cost,
    };
  }

  /**
   * Estimate tokens for code
   * @param {string} code - Code to estimate
   * @returns {number} Estimated tokens
   */
  estimateTokens(code) {
    // Rough estimate: ~4 chars per token for code
    return Math.ceil(code.length / 4);
  }

  /**
   * Estimate cost for tokens
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(tokens) {
    // Assume 50% input, 50% output for review
    const inputCost = (tokens * 0.5 * this.pricing.inputPerMillion) / 1_000_000;
    const outputCost = (tokens * 0.5 * this.pricing.outputPerMillion) / 1_000_000;
    return inputCost + outputCost;
  }

  /**
   * Check if adapter can afford a request
   * @param {number} estimatedCost - Estimated cost
   * @returns {boolean} Whether request is within budget
   */
  canAfford(estimatedCost = 0) {
    if (!this.trackCost || !this.budgetTracker) {
      return true;
    }

    const budgetConfig = this.config.budget || { budgetDaily: 10, budgetMonthly: 100 };
    return this.budgetTracker.canSpend('claude', estimatedCost, budgetConfig);
  }

  /**
   * Get current usage stats
   * @returns {Object} Usage stats
   */
  getUsage() {
    if (!this.budgetTracker) {
      return { daily: 0, monthly: 0, requests: 0 };
    }
    return this.budgetTracker.getUsage('claude');
  }
}

module.exports = {
  ClaudeAdapter,
  CLAUDE_PRICING,
  CLAUDE_MODEL,
};
