/**
 * SAST Runner - Semgrep Static Application Security Testing
 */

/**
 * Run Semgrep scan on a path
 * @param {Object} options - Scan options
 * @param {string} options.path - Path to scan
 * @param {Function} options.exec - Exec function for running commands
 * @returns {Promise<Object>} Scan results
 */
export async function runSemgrep({ path, exec }) {
  const command = `semgrep --json --config=auto ${path}`;
  const { stdout } = await exec(command);
  return JSON.parse(stdout);
}

/**
 * Parse Semgrep JSON output into normalized findings
 * @param {Object} output - Raw Semgrep output
 * @returns {Array} Normalized findings
 */
export function parseSemgrepOutput(output) {
  return (output.results || []).map(result => ({
    ruleId: result.check_id,
    path: result.path,
    line: result.start?.line,
    severity: (result.extra?.severity || 'info').toLowerCase(),
    message: result.extra?.message || ''
  }));
}

/**
 * Filter findings by severity level
 * @param {Array} findings - List of findings
 * @param {string} minSeverity - Minimum severity to include
 * @returns {Array} Filtered findings
 */
export function filterBySeverity(findings, minSeverity) {
  const severityOrder = ['info', 'warning', 'error', 'critical'];
  const minIndex = severityOrder.indexOf(minSeverity.toLowerCase());

  return findings.filter(finding => {
    const findingIndex = severityOrder.indexOf(finding.severity.toLowerCase());
    return findingIndex >= minIndex;
  });
}

/**
 * Generate PR comment from findings
 * @param {Array} findings - List of findings
 * @returns {string} Formatted PR comment
 */
export function generatePrComment(findings) {
  if (findings.length === 0) {
    return '## SAST Scan Results\n\nNo issues found.';
  }

  let comment = '## SAST Scan Results\n\n';
  comment += `Found ${findings.length} issue(s):\n\n`;

  for (const finding of findings) {
    comment += `### ${finding.ruleId}\n`;
    comment += `- **File:** ${finding.path}`;
    if (finding.line) {
      comment += `:${finding.line}`;
    }
    comment += '\n';
    if (finding.message) {
      comment += `- **Message:** ${finding.message}\n`;
    }
    comment += '\n';
  }

  return comment;
}

/**
 * Create a SAST runner instance with configurable options
 * @param {Object} options - Runner options
 * @param {boolean} options.cache - Enable result caching
 * @returns {Object} SAST runner instance
 */
export function createSastRunner(options = {}) {
  const { cache = false } = options;
  const customRules = [];
  const scanCache = new Map();

  return {
    /**
     * Run a scan
     * @param {Object} scanOptions - Scan options
     * @returns {Promise<Array>} Scan results
     */
    async scan(scanOptions) {
      const { path, mockResults, exec } = scanOptions;
      const cacheKey = path;

      if (cache && scanCache.has(cacheKey)) {
        return scanCache.get(cacheKey);
      }

      let results;
      if (mockResults !== undefined) {
        results = mockResults;
      } else if (exec) {
        const output = await runSemgrep({ path, exec });
        results = parseSemgrepOutput(output);
      } else {
        results = [];
      }

      if (cache) {
        scanCache.set(cacheKey, results);
      }

      return results;
    },

    /**
     * Add a custom rule
     * @param {Object} rule - Rule configuration
     */
    addRule(rule) {
      customRules.push(rule);
    },

    /**
     * Get all custom rules
     * @returns {Array} List of custom rules
     */
    getRules() {
      return customRules;
    }
  };
}
