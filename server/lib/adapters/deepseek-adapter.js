/**
 * DeepSeek Adapter - Adapter for DeepSeek API (budget-friendly model)
 */

const { BaseAdapter } = require('./base-adapter.js');

// Latest model: deepseek-r1 (January 2025)
const DEEPSEEK_MODEL = 'deepseek-r1';

const DEEPSEEK_PRICING = {
  // Pricing per 1M tokens (DeepSeek R1)
  // Significantly cheaper than OpenAI
  inputPerMillion: 0.55,
  outputPerMillion: 2.19,
};

class DeepSeekAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({
      name: 'deepseek',
      ...config,
    });
    this.budgetTracker = config.budgetTracker || null;
    this.pricing = config.pricing || DEEPSEEK_PRICING;
    this.model = config.model || DEEPSEEK_MODEL;
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

    const estimatedTokens = this.estimateTokens(code);
    const estimatedCost = this.estimateCost(estimatedTokens);

    if (!this.canAfford(estimatedCost)) {
      throw new Error('Budget exceeded for DeepSeek');
    }

    try {
      const result = await this.callAPI(code, context);

      if (this.budgetTracker) {
        this.budgetTracker.record('deepseek', result.cost || 0);
      }

      return result;
    } catch (error) {
      // DeepSeek errors return empty response with warning
      return {
        ...this.createEmptyResponse(),
        warning: `DeepSeek unavailable: ${error.message}`,
      };
    }
  }

  /**
   * Call DeepSeek API (mock implementation)
   * @param {string} code - Code to review
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} API response
   */
  async callAPI(code, context) {
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
    return Math.ceil(code.length / 4);
  }

  /**
   * Estimate cost for tokens
   * @param {number} tokens - Number of tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(tokens) {
    const inputCost = (tokens * 0.5 * this.pricing.inputPerMillion) / 1_000_000;
    const outputCost = (tokens * 0.5 * this.pricing.outputPerMillion) / 1_000_000;
    return inputCost + outputCost;
  }

  /**
   * Check if adapter can afford a request
   * @param {number} estimatedCost - Estimated cost
   * @returns {boolean}
   */
  canAfford(estimatedCost = 0) {
    if (!this.budgetTracker) {
      return true;
    }

    const budgetConfig = this.config.budget || { budgetDaily: 5, budgetMonthly: 50 };
    return this.budgetTracker.canSpend('deepseek', estimatedCost, budgetConfig);
  }

  /**
   * Get current usage stats
   * @returns {Object} Usage stats
   */
  getUsage() {
    if (!this.budgetTracker) {
      return { daily: 0, monthly: 0, requests: 0 };
    }
    return this.budgetTracker.getUsage('deepseek');
  }

  /**
   * Compare cost with OpenAI equivalent
   * @param {number} tokens - Token count
   * @returns {Object} Cost comparison
   */
  compareCostWithOpenAI(tokens) {
    const deepseekCost = this.estimateCost(tokens);
    // OpenAI GPT-4 Turbo pricing
    const openaiCost = (tokens * 0.5 * 10.00 + tokens * 0.5 * 30.00) / 1_000_000;
    const savings = openaiCost - deepseekCost;
    const savingsPercent = (savings / openaiCost) * 100;

    return {
      deepseek: deepseekCost,
      openai: openaiCost,
      savings,
      savingsPercent,
    };
  }
}

module.exports = {
  DeepSeekAdapter,
  DEEPSEEK_PRICING,
  DEEPSEEK_MODEL,
};
