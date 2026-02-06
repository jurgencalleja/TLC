/**
 * OpenAI Adapter - Adapter for OpenAI API with budget and rate limiting
 */

const { BaseAdapter } = require('./base-adapter.js');

// Latest model: gpt-5.3-codex (February 2026)
const OPENAI_MODEL = 'gpt-5.3-codex';

const OPENAI_PRICING = {
  // Pricing per 1M tokens (gpt-5.3-codex)
  inputPerMillion: 10.00,
  outputPerMillion: 40.00,
};

const DEFAULT_RATE_LIMITS = {
  requestsPerMinute: 500,
  tokensPerMinute: 150000,
};

class OpenAIAdapter extends BaseAdapter {
  constructor(config = {}) {
    super({
      name: 'openai',
      ...config,
    });
    this.budgetTracker = config.budgetTracker || null;
    this.pricing = config.pricing || OPENAI_PRICING;
    this.model = config.model || OPENAI_MODEL;
    this.rateLimits = config.rateLimits || DEFAULT_RATE_LIMITS;
    this.requestsThisMinute = 0;
    this.tokensThisMinute = 0;
    this.lastMinuteReset = Date.now();
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

    // Check budget
    const estimatedTokens = this.estimateTokens(code);
    const estimatedCost = this.estimateCost(estimatedTokens);

    if (!this.canAfford(estimatedCost)) {
      throw new Error('Budget exceeded for OpenAI');
    }

    // Check rate limits
    this.checkRateLimitReset();
    if (!this.withinRateLimits(estimatedTokens)) {
      throw new Error('Rate limit exceeded for OpenAI');
    }

    try {
      const result = await this.callAPI(code, context);

      // Record usage
      this.requestsThisMinute++;
      this.tokensThisMinute += result.tokensUsed;

      if (this.budgetTracker) {
        this.budgetTracker.record('openai', result.cost || 0);
      }

      return result;
    } catch (error) {
      return {
        ...this.createEmptyResponse(),
        error: error.message,
      };
    }
  }

  /**
   * Call OpenAI API (mock implementation)
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
   * Check if rate limit minute window should reset
   */
  checkRateLimitReset() {
    const now = Date.now();
    if (now - this.lastMinuteReset >= 60000) {
      this.requestsThisMinute = 0;
      this.tokensThisMinute = 0;
      this.lastMinuteReset = now;
    }
  }

  /**
   * Check if within rate limits
   * @param {number} tokens - Tokens to use
   * @returns {boolean}
   */
  withinRateLimits(tokens) {
    const withinRequests = this.requestsThisMinute < this.rateLimits.requestsPerMinute;
    const withinTokens = (this.tokensThisMinute + tokens) <= this.rateLimits.tokensPerMinute;
    return withinRequests && withinTokens;
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

    const budgetConfig = this.config.budget || { budgetDaily: 10, budgetMonthly: 100 };
    return this.budgetTracker.canSpend('openai', estimatedCost, budgetConfig);
  }

  /**
   * Get current usage stats
   * @returns {Object} Usage stats
   */
  getUsage() {
    if (!this.budgetTracker) {
      return { daily: 0, monthly: 0, requests: 0 };
    }
    return this.budgetTracker.getUsage('openai');
  }

  /**
   * Get rate limit status
   * @returns {Object} Rate limit status
   */
  getRateLimitStatus() {
    this.checkRateLimitReset();
    return {
      requestsUsed: this.requestsThisMinute,
      requestsLimit: this.rateLimits.requestsPerMinute,
      tokensUsed: this.tokensThisMinute,
      tokensLimit: this.rateLimits.tokensPerMinute,
      resetsIn: Math.max(0, 60000 - (Date.now() - this.lastMinuteReset)),
    };
  }
}

module.exports = {
  OpenAIAdapter,
  OPENAI_PRICING,
  OPENAI_MODEL,
  DEFAULT_RATE_LIMITS,
};
