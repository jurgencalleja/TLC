/**
 * Semantic Analyzer
 * Use AI to detect naming issues and semantic problems
 */

const { ConsensusEngine } = require('./consensus-engine.js');

class SemanticAnalyzer {
  constructor(options = {}) {
    this.adapters = options.adapters || [];
    this.useConsensus = options.useConsensus !== false && this.adapters.length > 1;
    this.budgetAware = options.budgetAware !== false;
    this.requireMinimum = options.requireMinimum ?? 1;

    if (this.useConsensus) {
      this.consensusEngine = new ConsensusEngine(this.adapters, {
        consensusType: options.consensusType || 'majority',
        requireMinimum: this.requireMinimum,
        budgetAware: this.budgetAware,
      });
    }
  }

  /**
   * Analyze code for semantic issues
   * @param {string} code - Source code to analyze
   * @param {string} filename - Filename for context
   * @param {Object} extraContext - Additional context to pass to adapters
   * @returns {Object} Analysis result with issues
   */
  async analyze(code, filename, extraContext = {}) {
    if (!code || code.trim() === '') {
      return {
        issues: [],
        byType: {},
        cost: 0,
        warnings: [],
      };
    }

    const context = {
      filename,
      type: 'semantic',
      ...extraContext,
    };

    // Filter adapters by budget if configured
    const availableAdapters = this.budgetAware
      ? this.adapters.filter((a) => a.canAfford())
      : this.adapters;

    if (availableAdapters.length === 0) {
      return {
        issues: [],
        byType: {},
        cost: 0,
        warnings: ['No adapters available (budget exceeded or none configured)'],
      };
    }

    // Use consensus engine for multi-model
    if (this.useConsensus && availableAdapters.length > 1) {
      return this.analyzeWithConsensus(code, context);
    }

    // Single model analysis
    return this.analyzeWithSingleModel(code, context, availableAdapters[0]);
  }

  /**
   * Analyze with consensus engine (multiple models)
   */
  async analyzeWithConsensus(code, context) {
    try {
      const result = await this.consensusEngine.review(code, context);

      const issues = [];
      const warnings = result.warnings || [];

      // Collect all issues from reviews
      for (const review of result.reviews) {
        for (const issue of review.issues || []) {
          issues.push({
            ...issue,
            model: review.model,
          });
        }
      }

      // Categorize by type
      const byType = this.categorizeByType(issues);

      return {
        issues,
        byType,
        consensus: result.consensus,
        cost: result.costs.total,
        warnings,
        models: result.reviews.map((r) => r.model),
      };
    } catch (error) {
      return {
        issues: [],
        byType: {},
        cost: 0,
        warnings: [error.message],
        error: error.message,
      };
    }
  }

  /**
   * Analyze with a single model
   */
  async analyzeWithSingleModel(code, context, adapter) {
    const warnings = [];
    let issues = [];
    let cost = 0;

    try {
      const result = await adapter.review(code, context);
      issues = result.issues || [];
      cost = result.cost || 0;
    } catch (error) {
      warnings.push(`${adapter.name} failed: ${error.message}`);
    }

    const byType = this.categorizeByType(issues);

    return {
      issues,
      byType,
      cost,
      warnings,
    };
  }

  /**
   * Categorize issues by type
   */
  categorizeByType(issues) {
    const byType = {};

    for (const issue of issues) {
      const type = issue.type || 'unknown';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(issue);
    }

    return byType;
  }

  /**
   * Create a prompt for semantic analysis
   * Used when calling LLM adapters
   */
  static createPrompt(code, context) {
    return `Analyze this code for naming and semantic issues.

File: ${context.filename}

Code:
\`\`\`
${code}
\`\`\`

Look for:
1. Poor variable names (single letters, cryptic abbreviations)
2. Poor function names (vague like 'doIt', 'process', 'handle')
3. Unclear function purposes (doing too many things)
4. Inconsistent naming conventions
5. Magic numbers without explanation

For each issue found, provide:
- type: "naming" or "clarity"
- severity: "error", "warning", or "info"
- line: line number
- message: description of the issue
- suggestion: how to fix it

Respond in JSON format:
{
  "issues": [
    {
      "type": "naming",
      "severity": "warning",
      "line": 5,
      "message": "Variable 'x' has unclear name",
      "suggestion": "Rename to descriptive name like 'userCount'"
    }
  ]
}`;
  }
}

module.exports = { SemanticAnalyzer };
