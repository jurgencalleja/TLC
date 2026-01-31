/**
 * Review Orchestrator - Orchestrate multi-model reviews with consensus
 */

const { ConsensusEngine } = require('./consensus-engine.js');
const { collectFiles, readFileContent } = require('./file-collector.js');

/**
 * Orchestrate code review across multiple models
 */
class ReviewOrchestrator {
  constructor(adapters, options = {}) {
    this.adapters = adapters;
    this.options = {
      consensusType: 'majority',
      requireMinimum: 1,
      budgetAware: true,
      maxFileSizeKB: 100,
      ...options,
    };
    this.consensusEngine = new ConsensusEngine(adapters, this.options);
  }

  /**
   * Review a single file
   * @param {string} filePath - File path
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Review result
   */
  async reviewFile(filePath, context = {}) {
    const { content, error } = readFileContent(filePath);

    if (error) {
      return {
        file: filePath,
        error,
        issues: [],
        costs: { byModel: {}, total: 0 },
      };
    }

    // Check file size
    const sizeKB = Buffer.byteLength(content, 'utf-8') / 1024;
    if (sizeKB > this.options.maxFileSizeKB) {
      return {
        file: filePath,
        warning: `File too large: ${sizeKB.toFixed(1)}KB > ${this.options.maxFileSizeKB}KB limit`,
        issues: [],
        costs: { byModel: {}, total: 0 },
      };
    }

    try {
      const result = await this.consensusEngine.review(content, {
        ...context,
        file: filePath,
      });

      return {
        file: filePath,
        issues: result.consensus?.issues || [],
        suggestions: this.aggregateSuggestions(result.reviews),
        costs: result.costs,
        models: result.reviews.map(r => r.model),
        warnings: result.warnings,
        consensusType: result.consensusType,
      };
    } catch (err) {
      return {
        file: filePath,
        error: err.message,
        issues: [],
        costs: { byModel: {}, total: 0 },
      };
    }
  }

  /**
   * Review multiple files
   * @param {string[]} files - Array of file paths
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Aggregated review result
   */
  async reviewFiles(files, context = {}) {
    const fileResults = [];
    const allModels = new Set();
    let totalCost = 0;
    const costsByModel = {};

    for (const file of files) {
      const result = await this.reviewFile(file, context);
      fileResults.push(result);

      // Aggregate models
      if (result.models) {
        result.models.forEach(m => allModels.add(m));
      }

      // Aggregate costs
      if (result.costs) {
        totalCost += result.costs.total || 0;
        for (const [model, cost] of Object.entries(result.costs.byModel || {})) {
          costsByModel[model] = (costsByModel[model] || 0) + cost;
        }
      }
    }

    return this.summarizeResults(fileResults, Array.from(allModels), {
      byModel: costsByModel,
      total: totalCost,
    });
  }

  /**
   * Review a directory
   * @param {string} dir - Directory path
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Aggregated review result
   */
  async reviewDirectory(dir, options = {}) {
    const { files, stats } = collectFiles(dir, options);

    if (stats.error) {
      return {
        files: [],
        models: [],
        error: stats.error,
        fileResults: [],
        totalIssues: 0,
        averageConfidence: 0,
        totalCost: 0,
        costs: { byModel: {}, total: 0 },
      };
    }

    if (files.length === 0) {
      return {
        files: [],
        models: [],
        warning: 'No files found to review',
        fileResults: [],
        totalIssues: 0,
        averageConfidence: 0,
        totalCost: 0,
        costs: { byModel: {}, total: 0 },
      };
    }

    return this.reviewFiles(files, { directory: dir });
  }

  /**
   * Summarize review results
   * @param {Array} fileResults - Results per file
   * @param {Array} models - Models used
   * @param {Object} costs - Cost summary
   * @returns {Object} Summary
   */
  summarizeResults(fileResults, models, costs) {
    // Collect all issues across files
    const allIssues = [];
    for (const result of fileResults) {
      for (const issue of result.issues || []) {
        allIssues.push({ ...issue, file: result.file });
      }
    }

    // Calculate average confidence
    let totalConfidence = 0;
    let confidenceCount = 0;
    for (const result of fileResults) {
      for (const issue of result.issues || []) {
        if (issue.confidence !== undefined) {
          totalConfidence += issue.confidence;
          confidenceCount++;
        }
      }
    }
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Get consensus issues (across all files)
    const consensusIssues = this.getConsensusIssues(fileResults);

    return {
      files: fileResults.map(r => r.file),
      models,
      fileResults,
      totalIssues: allIssues.length,
      averageConfidence,
      totalCost: costs.total,
      costs,
      consensusIssues,
      modelAgreement: models.length > 1,
    };
  }

  /**
   * Get issues that appear across multiple files
   * @param {Array} fileResults - Results per file
   * @returns {Array} Consensus issues
   */
  getConsensusIssues(fileResults) {
    const issueMap = new Map();

    for (const result of fileResults) {
      for (const issue of result.issues || []) {
        // Key by message (normalized)
        const key = (issue.message || '').toLowerCase().trim();
        if (!key) continue;

        if (!issueMap.has(key)) {
          issueMap.set(key, {
            id: issue.id || key,
            message: issue.message,
            severity: issue.severity,
            voters: issue.voters || [],
            confidence: issue.confidence || 0,
            files: [],
          });
        }
        const entry = issueMap.get(key);
        entry.files.push(result.file);
      }
    }

    return Array.from(issueMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Aggregate suggestions from all reviews
   * @param {Array} reviews - Review results
   * @returns {Array} Unique suggestions
   */
  aggregateSuggestions(reviews) {
    const suggestions = new Set();
    for (const review of reviews || []) {
      for (const suggestion of review.suggestions || []) {
        suggestions.add(suggestion);
      }
    }
    return Array.from(suggestions);
  }

  /**
   * Get available models (within budget)
   * @returns {Array} Available adapter names
   */
  getAvailableModels() {
    if (!this.options.budgetAware) {
      return this.adapters.map(a => a.name);
    }
    return this.adapters
      .filter(a => a.canAfford())
      .map(a => a.name);
  }

  /**
   * Get usage summary across all adapters
   * @returns {Object} Usage by model
   */
  getUsageSummary() {
    const usage = {};
    for (const adapter of this.adapters) {
      usage[adapter.name] = adapter.getUsage();
    }
    return usage;
  }
}

module.exports = {
  ReviewOrchestrator,
};
