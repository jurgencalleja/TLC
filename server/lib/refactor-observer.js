/**
 * Refactor Observer - Background detection of refactoring opportunities
 * Hooks into /tlc:build and /tlc:review to silently capture candidates
 */

const fs = require('fs');
const path = require('path');
const { AstAnalyzer } = require('./ast-analyzer.js');

const CANDIDATES_FILE = 'REFACTOR-CANDIDATES.md';
const TLC_DIR = '.tlc';

/**
 * Observer that auto-detects refactoring opportunities during normal TLC work
 */
class RefactorObserver {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      complexityThreshold: options.complexityThreshold || 10,
      nestingThreshold: options.nestingThreshold || 4,
      longFunctionThreshold: options.longFunctionThreshold || 50,
      ...options,
    };
    this.analyzer = new AstAnalyzer({
      highComplexityThreshold: this.options.complexityThreshold,
      deepNestingThreshold: this.options.nestingThreshold,
      longFunctionThreshold: this.options.longFunctionThreshold,
    });
    this._enabled = this._loadEnabledState();
  }

  /**
   * Load enabled state from config
   * @returns {boolean} Whether auto-detect is enabled
   */
  _loadEnabledState() {
    try {
      const configPath = path.join(this.projectRoot, '.tlc.json');
      if (!fs.existsSync(configPath)) {
        return true; // Default enabled
      }
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.refactor && config.refactor.autoDetect === false) {
        return false;
      }
      return true;
    } catch (e) {
      return true; // Default enabled on error
    }
  }

  /**
   * Check if auto-detection is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Observe code being written during build
   * Fire-and-forget - does not block
   * @param {string} filePath - Path to file being built
   * @param {string} code - Source code content
   */
  async observeBuild(filePath, code) {
    if (!this._enabled) {
      return;
    }

    // Fire and forget - don't await the full processing
    setImmediate(async () => {
      try {
        await this._analyzeBuild(filePath, code);
      } catch (e) {
        // Silently fail - observation is nice-to-have
        console.error('Refactor observation failed:', e.message);
      }
    });
  }

  /**
   * Internal build analysis
   * @param {string} filePath - Path to file
   * @param {string} code - Source code
   */
  async _analyzeBuild(filePath, code) {
    const result = this.analyzer.analyze(code, filePath);

    if (result.error) {
      return; // Skip files with parse errors
    }

    const candidates = [];

    for (const func of result.functions) {
      if (func.isComplex) {
        candidates.push({
          file: filePath,
          function: func.name,
          line: func.startLine,
          reason: `High cyclomatic complexity (${func.complexity})`,
          type: 'complexity',
          severity: 'medium',
          detectedAt: new Date().toISOString(),
        });
      }

      if (func.isDeeplyNested) {
        candidates.push({
          file: filePath,
          function: func.name,
          line: func.startLine,
          reason: `Deep nesting (${func.maxNesting} levels)`,
          type: 'nesting',
          severity: 'low',
          detectedAt: new Date().toISOString(),
        });
      }

      if (func.isLong) {
        candidates.push({
          file: filePath,
          function: func.name,
          line: func.startLine,
          reason: `Long function (${func.lineCount} lines)`,
          type: 'length',
          severity: 'low',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (candidates.length > 0) {
      await this._addCandidates(candidates);
    }
  }

  /**
   * Observe review results to capture suggestions
   * Fire-and-forget - does not block
   * @param {Object} reviewResult - Review result with suggestions
   */
  async observeReview(reviewResult) {
    if (!this._enabled) {
      return;
    }

    // Fire and forget
    setImmediate(async () => {
      try {
        await this._analyzeReview(reviewResult);
      } catch (e) {
        console.error('Refactor review observation failed:', e.message);
      }
    });
  }

  /**
   * Internal review analysis
   * @param {Object} reviewResult - Review result
   */
  async _analyzeReview(reviewResult) {
    const candidates = [];
    const file = reviewResult.file || 'unknown';

    // Extract refactoring suggestions
    const suggestions = reviewResult.suggestions || [];
    for (const suggestion of suggestions) {
      // Filter for refactoring-related suggestions
      const lowerSuggestion = suggestion.toLowerCase();
      if (
        lowerSuggestion.includes('extract') ||
        lowerSuggestion.includes('refactor') ||
        lowerSuggestion.includes('split') ||
        lowerSuggestion.includes('simplify') ||
        lowerSuggestion.includes('too long') ||
        lowerSuggestion.includes('too complex')
      ) {
        candidates.push({
          file,
          function: null,
          line: null,
          reason: suggestion,
          type: 'review-suggestion',
          severity: 'medium',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Extract from issues as well
    const issues = reviewResult.issues || [];
    for (const issue of issues) {
      const message = (issue.message || '').toLowerCase();
      if (
        message.includes('complex') ||
        message.includes('refactor') ||
        message.includes('simplify')
      ) {
        candidates.push({
          file,
          function: null,
          line: issue.line || null,
          reason: issue.message,
          type: 'review-issue',
          severity: issue.severity || 'medium',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (candidates.length > 0) {
      await this._addCandidates(candidates);
    }
  }

  /**
   * Add candidates to the REFACTOR-CANDIDATES.md file
   * @param {Array} candidates - Candidates to add
   */
  async _addCandidates(candidates) {
    const tlcDir = path.join(this.projectRoot, TLC_DIR);
    const candidatesPath = path.join(tlcDir, CANDIDATES_FILE);

    // Ensure .tlc directory exists
    if (!fs.existsSync(tlcDir)) {
      fs.mkdirSync(tlcDir, { recursive: true });
    }

    // Read existing content or create header
    let content = '';
    if (fs.existsSync(candidatesPath)) {
      content = fs.readFileSync(candidatesPath, 'utf8');
    } else {
      content = this._createHeader();
    }

    // Append new candidates
    for (const candidate of candidates) {
      content += this._formatCandidate(candidate);
    }

    fs.writeFileSync(candidatesPath, content, 'utf8');
  }

  /**
   * Create header for candidates file
   * @returns {string} Header markdown
   */
  _createHeader() {
    return `# Refactoring Candidates

Auto-detected opportunities for code improvement.
Generated by TLC Refactor Observer.

---

`;
  }

  /**
   * Format a single candidate as markdown
   * @param {Object} candidate - Candidate object
   * @returns {string} Formatted markdown
   */
  _formatCandidate(candidate) {
    const location = candidate.function
      ? `\`${candidate.function}\` in \`${candidate.file}\``
      : `\`${candidate.file}\``;

    const line = candidate.line ? ` (line ${candidate.line})` : '';

    return `## ${candidate.type}: ${location}${line}

- **Reason:** ${candidate.reason}
- **Severity:** ${candidate.severity}
- **Detected:** ${candidate.detectedAt}

---

`;
  }

  /**
   * Get all current candidates
   * @returns {Array} List of candidates
   */
  getCandidates() {
    const candidatesPath = path.join(this.projectRoot, TLC_DIR, CANDIDATES_FILE);

    if (!fs.existsSync(candidatesPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(candidatesPath, 'utf8');
      return this._parseCandidates(content);
    } catch (e) {
      return [];
    }
  }

  /**
   * Parse candidates from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Parsed candidates
   */
  _parseCandidates(content) {
    const candidates = [];
    const sections = content.split(/^## /m).slice(1); // Skip header

    for (const section of sections) {
      const lines = section.split('\n');
      const headerMatch = lines[0].match(/^(\w+(?:-\w+)?): `([^`]+)`(?: in `([^`]+)`)?(?: \(line (\d+)\))?/);

      if (headerMatch) {
        const candidate = {
          type: headerMatch[1],
          function: headerMatch[2].includes('/') ? null : headerMatch[2],
          file: headerMatch[3] || headerMatch[2],
          line: headerMatch[4] ? parseInt(headerMatch[4], 10) : null,
          reason: '',
          severity: 'medium',
        };

        // Parse bullet points
        for (const line of lines) {
          const reasonMatch = line.match(/^\- \*\*Reason:\*\* (.+)$/);
          if (reasonMatch) {
            candidate.reason = reasonMatch[1];
          }
          const severityMatch = line.match(/^\- \*\*Severity:\*\* (.+)$/);
          if (severityMatch) {
            candidate.severity = severityMatch[1];
          }
        }

        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Clear all candidates
   */
  clearCandidates() {
    const candidatesPath = path.join(this.projectRoot, TLC_DIR, CANDIDATES_FILE);
    if (fs.existsSync(candidatesPath)) {
      fs.unlinkSync(candidatesPath);
    }
  }
}

module.exports = { RefactorObserver };
