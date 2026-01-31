/**
 * Consensus Engine - Aggregate reviews from multiple models
 */

class ConsensusEngine {
  constructor(adapters, config = {}) {
    this.adapters = adapters;
    this.config = {
      consensusType: 'majority',
      requireMinimum: 2,
      budgetAware: true,
      ...config,
    };
  }

  /**
   * Run review across all adapters
   * @param {string} code - Code to review
   * @param {Object} context - Review context
   * @returns {Promise<Object>} Aggregated review result
   */
  async review(code, context = {}) {
    // Filter adapters by budget if configured
    const availableAdapters = this.config.budgetAware
      ? this.adapters.filter(a => a.canAfford())
      : this.adapters;

    // Run all reviews in parallel
    const results = await Promise.allSettled(
      availableAdapters.map(async a => {
        const result = await a.review(code, context);
        return result;
      })
    );

    const reviews = [];
    const warnings = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        reviews.push(result.value);
      } else {
        warnings.push(`${availableAdapters[i].name} failed: ${result.reason.message}`);
      }
    });

    // Check minimum requirement
    if (reviews.length < this.config.requireMinimum) {
      throw new Error(`Insufficient reviews: got ${reviews.length}, need ${this.config.requireMinimum}`);
    }

    // Calculate consensus
    const consensus = ConsensusEngine.calculateConsensus(reviews, this.config.consensusType);
    const costs = ConsensusEngine.summarizeCosts(reviews);

    return {
      reviews,
      warnings,
      consensus,
      costs,
      consensusType: reviews.length === 1 ? 'single-model' : this.config.consensusType,
    };
  }

  /**
   * Calculate consensus from reviews
   * @param {Array} reviews - Array of review results
   * @param {string} type - Consensus type ('majority' or 'unanimous')
   * @returns {Object} Consensus result
   */
  static calculateConsensus(reviews, type = 'majority') {
    const issueMap = new Map();

    // Collect all issues
    for (const review of reviews) {
      for (const issue of (review.issues || [])) {
        const key = issue.id || ConsensusEngine.hashIssue(issue);
        if (!issueMap.has(key)) {
          issueMap.set(key, { ...issue, votes: 0, voters: [] });
        }
        const entry = issueMap.get(key);
        entry.votes++;
        entry.voters.push(review.model);
      }
    }

    // Filter by consensus type
    const threshold = type === 'unanimous' ? reviews.length : 1;

    const consensusIssues = Array.from(issueMap.values())
      .filter(issue => issue.votes >= threshold)
      .map(issue => ({
        ...issue,
        confidence: issue.votes / reviews.length,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return {
      issues: consensusIssues,
      totalReviews: reviews.length,
      consensusThreshold: threshold,
    };
  }

  /**
   * Create hash for issue deduplication
   * @param {Object} issue - Issue object
   * @returns {string} Hash
   */
  static hashIssue(issue) {
    return `${issue.line || ''}-${issue.message || ''}-${issue.severity || ''}`.toLowerCase();
  }

  /**
   * Summarize costs across reviews
   * @param {Array} reviews - Array of review results
   * @returns {Object} Cost summary
   */
  static summarizeCosts(reviews) {
    const byModel = {};
    let total = 0;

    for (const review of reviews) {
      const cost = review.cost || 0;
      byModel[review.model] = cost;
      total += cost;
    }

    return { byModel, total };
  }
}

module.exports = {
  ConsensusEngine,
};
