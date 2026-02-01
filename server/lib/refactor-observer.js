/**
 * Refactor Observer
 * Background hook that watches for refactoring opportunities during normal TLC operations
 */

const { AstAnalyzer } = require('./ast-analyzer.js');
const { ImpactScorer } = require('./impact-scorer.js');
const { CandidatesTracker } = require('./candidates-tracker.js');

class RefactorObserver {
  constructor(options = {}) {
    this.options = options;
    this.astAnalyzer = options.astAnalyzer || new AstAnalyzer();
    this.impactScorer = options.impactScorer || new ImpactScorer();
    this.candidatesTracker = options.candidatesTracker || new CandidatesTracker(options.trackerOptions);

    // Configuration
    this.enabled = options.enabled !== false;
    this.complexityThreshold = options.complexityThreshold || 10;
    this.lengthThreshold = options.lengthThreshold || 50;
    this.nestingThreshold = options.nestingThreshold || 4;
    this.minImpact = options.minImpact || 50;

    // Debounce for file watching
    this.pendingFiles = new Map();
    this.debounceMs = options.debounceMs || 500;

    // Callbacks
    this.onCandidateFound = options.onCandidateFound || (() => {});
  }

  /**
   * Enable the observer
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable the observer
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if observer is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Observe a file for refactoring opportunities
   * Called automatically during TLC operations (build, verify, etc.)
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @param {Object} context - Additional context (e.g., which operation triggered this)
   * @returns {Array} Found opportunities
   */
  async observe(filePath, content, context = {}) {
    if (!this.enabled) {
      return [];
    }

    // Debounce rapid calls for same file
    if (this.pendingFiles.has(filePath)) {
      clearTimeout(this.pendingFiles.get(filePath));
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        this.pendingFiles.delete(filePath);
        const opportunities = await this.analyzeFile(filePath, content, context);
        resolve(opportunities);
      }, this.debounceMs);

      this.pendingFiles.set(filePath, timeout);
    });
  }

  /**
   * Observe a file immediately (no debounce)
   */
  async observeImmediate(filePath, content, context = {}) {
    if (!this.enabled) {
      return [];
    }

    return this.analyzeFile(filePath, content, context);
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath, content, context = {}) {
    const opportunities = [];

    try {
      const analysis = this.astAnalyzer.analyze(content, filePath);

      // Check each function for issues
      for (const fn of analysis.functions || []) {
        const issues = [];

        if (fn.complexity > this.complexityThreshold) {
          issues.push({
            type: 'complexity',
            message: `High cyclomatic complexity (${fn.complexity})`,
            threshold: this.complexityThreshold,
            value: fn.complexity,
          });
        }

        if (fn.lines > this.lengthThreshold) {
          issues.push({
            type: 'length',
            message: `Function too long (${fn.lines} lines)`,
            threshold: this.lengthThreshold,
            value: fn.lines,
          });
        }

        if (fn.maxNesting > this.nestingThreshold) {
          issues.push({
            type: 'nesting',
            message: `Deep nesting (${fn.maxNesting} levels)`,
            threshold: this.nestingThreshold,
            value: fn.maxNesting,
          });
        }

        if (issues.length > 0) {
          const opportunity = {
            file: filePath,
            startLine: fn.line,
            endLine: fn.endLine || fn.line,
            name: fn.name,
            issues,
            context: context.operation || 'background',
          };

          // Calculate impact score
          const score = this.impactScorer.score({
            file: filePath,
            complexity: fn.complexity,
            lines: fn.lines,
            nesting: fn.maxNesting,
          });

          if (score.total >= this.minImpact) {
            opportunity.impact = score.total;
            opportunity.description = this.describeOpportunity(fn, issues);
            opportunities.push(opportunity);
          }
        }
      }

      // Add to candidates tracker if any found
      if (opportunities.length > 0) {
        await this.candidatesTracker.add(opportunities);

        // Notify callback
        for (const opp of opportunities) {
          this.onCandidateFound(opp);
        }
      }
    } catch (error) {
      // Silently ignore parse errors in background mode
      if (context.verbose) {
        console.error(`Observer error for ${filePath}:`, error.message);
      }
    }

    return opportunities;
  }

  /**
   * Generate a human-readable description of the opportunity
   */
  describeOpportunity(fn, issues) {
    const parts = [];

    if (issues.find(i => i.type === 'complexity')) {
      parts.push(`high complexity (${fn.complexity})`);
    }
    if (issues.find(i => i.type === 'length')) {
      parts.push(`long function (${fn.lines} lines)`);
    }
    if (issues.find(i => i.type === 'nesting')) {
      parts.push(`deep nesting (${fn.maxNesting} levels)`);
    }

    return `${fn.name}: ${parts.join(', ')}`;
  }

  /**
   * Batch observe multiple files
   */
  async observeBatch(files, context = {}) {
    if (!this.enabled) {
      return [];
    }

    const allOpportunities = [];

    for (const file of files) {
      const opportunities = await this.observeImmediate(file.path, file.content, context);
      allOpportunities.push(...opportunities);
    }

    return allOpportunities;
  }

  /**
   * Hook into TLC build process
   */
  createBuildHook() {
    return {
      name: 'refactor-observer',
      afterFileWrite: async (filePath, content) => {
        await this.observe(filePath, content, { operation: 'build' });
      },
    };
  }

  /**
   * Hook into TLC verify process
   */
  createVerifyHook() {
    return {
      name: 'refactor-observer',
      afterVerify: async (files) => {
        await this.observeBatch(files, { operation: 'verify' });
      },
    };
  }

  /**
   * Get summary of pending observations
   */
  getPendingCount() {
    return this.pendingFiles.size;
  }

  /**
   * Cancel all pending observations
   */
  cancelPending() {
    for (const timeout of this.pendingFiles.values()) {
      clearTimeout(timeout);
    }
    this.pendingFiles.clear();
  }

  /**
   * Update configuration
   */
  configure(options) {
    if (options.complexityThreshold !== undefined) {
      this.complexityThreshold = options.complexityThreshold;
    }
    if (options.lengthThreshold !== undefined) {
      this.lengthThreshold = options.lengthThreshold;
    }
    if (options.nestingThreshold !== undefined) {
      this.nestingThreshold = options.nestingThreshold;
    }
    if (options.minImpact !== undefined) {
      this.minImpact = options.minImpact;
    }
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      enabled: this.enabled,
      complexityThreshold: this.complexityThreshold,
      lengthThreshold: this.lengthThreshold,
      nestingThreshold: this.nestingThreshold,
      minImpact: this.minImpact,
      debounceMs: this.debounceMs,
    };
  }
}

module.exports = { RefactorObserver };
