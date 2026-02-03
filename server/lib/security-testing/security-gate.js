/**
 * Security Gate
 * CI/CD security gates with policies for blocking deployments based on findings
 */

/**
 * Evaluate findings against a security gate policy
 * @param {Array} findings - Array of security findings
 * @param {Object} policy - Policy with thresholds (maxCritical, maxHigh, etc.)
 * @returns {Object} Result with passed boolean and reason
 */
export function evaluateGate(findings, policy) {
  const counts = countBySeverity(findings);
  const violations = [];

  if (policy.maxCritical !== undefined && counts.critical > policy.maxCritical) {
    violations.push(`critical findings (${counts.critical}) exceed threshold (${policy.maxCritical})`);
  }

  if (policy.maxHigh !== undefined && counts.high > policy.maxHigh) {
    violations.push(`high findings (${counts.high}) exceed threshold (${policy.maxHigh})`);
  }

  if (policy.maxMedium !== undefined && counts.medium > policy.maxMedium) {
    violations.push(`medium findings (${counts.medium}) exceed threshold (${policy.maxMedium})`);
  }

  if (policy.maxLow !== undefined && counts.low > policy.maxLow) {
    violations.push(`low findings (${counts.low}) exceed threshold (${policy.maxLow})`);
  }

  return {
    passed: violations.length === 0,
    reason: violations.length > 0 ? violations.join('; ') : 'All checks passed',
    counts,
    violations
  };
}

/**
 * Check findings against severity thresholds
 * @param {Array} findings - Array of findings
 * @param {Object} thresholds - Object with severity names as keys and max counts as values
 * @returns {Object} Result with violations array
 */
export function checkThresholds(findings, thresholds) {
  const counts = countBySeverity(findings);
  const violations = [];

  for (const [severity, maxCount] of Object.entries(thresholds)) {
    const actualCount = counts[severity] || 0;
    if (actualCount > maxCount) {
      violations.push(severity);
    }
  }

  return {
    violations,
    counts,
    passed: violations.length === 0
  };
}

/**
 * Create a policy from configuration
 * @param {Object} config - Policy configuration
 * @returns {Object} Policy object with name, evaluate method, and other properties
 */
export function createPolicy(config) {
  const policy = {
    name: config.name || 'default',
    thresholds: config.thresholds || {},
    requiredScans: config.requiredScans || [],
    baseline: config.baseline,
    allowNewFindings: config.allowNewFindings !== false,

    /**
     * Evaluate findings against this policy
     * @param {Array} findings - Array of findings
     * @returns {Object} Evaluation result
     */
    evaluate(findings) {
      // Convert thresholds format to maxX format
      const gatePolicy = {};
      if (this.thresholds.critical !== undefined) gatePolicy.maxCritical = this.thresholds.critical;
      if (this.thresholds.high !== undefined) gatePolicy.maxHigh = this.thresholds.high;
      if (this.thresholds.medium !== undefined) gatePolicy.maxMedium = this.thresholds.medium;
      if (this.thresholds.low !== undefined) gatePolicy.maxLow = this.thresholds.low;

      return evaluateGate(findings, gatePolicy);
    }
  };

  return policy;
}

/**
 * Load policies from a file
 * @param {Object} options - Options with readFile function
 * @returns {Promise<Array>} Array of policies
 */
export async function loadPolicies(options = {}) {
  const readFile = options.readFile || defaultReadFile;
  const path = options.path || '.security-policies.json';

  try {
    const content = await readFile(path);
    const data = JSON.parse(content);

    if (data.policies && Array.isArray(data.policies)) {
      return data.policies.map(config => createPolicy(config));
    }

    return [createPolicy(data)];
  } catch (error) {
    // Return default policy if file doesn't exist
    return [createPolicy({ name: 'default', thresholds: { critical: 0 } })];
  }
}

/**
 * Create a security gate instance
 * @param {Object} options - Options including ci flag for CI/CD mode
 * @returns {Object} Gate with evaluate, setPolicy, and generateReport methods
 */
export function createSecurityGate(options = {}) {
  let currentPolicy = { maxCritical: 0 };
  const ciMode = options.ci || false;

  return {
    /**
     * Set the policy for this gate
     * @param {Object} policy - Policy with thresholds
     */
    setPolicy(policy) {
      currentPolicy = policy;
    },

    /**
     * Evaluate findings against the current policy
     * @param {Array} findings - Array of findings
     * @returns {Object} Result with passed, reason, and exitCode (in CI mode)
     */
    evaluate(findings) {
      const result = evaluateGate(findings, currentPolicy);

      if (ciMode) {
        result.exitCode = result.passed ? 0 : 1;
      }

      return result;
    },

    /**
     * Generate a human-readable report from evaluation result
     * @param {Object} result - Evaluation result
     * @returns {string} Report string
     */
    generateReport(result) {
      const status = result.passed ? 'PASSED' : 'FAILED';
      const lines = [
        `Security Gate: ${status}`,
        '',
        'Findings by Severity:',
        `  Critical: ${result.counts?.critical || 0}`,
        `  High: ${result.counts?.high || 0}`,
        `  Medium: ${result.counts?.medium || 0}`,
        `  Low: ${result.counts?.low || 0}`,
        ''
      ];

      if (!result.passed) {
        lines.push('Violations:', `  ${result.reason}`);
      }

      return lines.join('\n');
    },

    /**
     * Get current policy
     * @returns {Object} Current policy
     */
    getPolicy() {
      return currentPolicy;
    }
  };
}

// Helper functions

function countBySeverity(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const finding of findings) {
    const severity = normalizeSeverity(finding.severity || finding.risk);
    if (counts.hasOwnProperty(severity)) {
      counts[severity]++;
    }
  }

  return counts;
}

function normalizeSeverity(severity) {
  if (!severity) return 'low';
  const lower = severity.toLowerCase();
  if (['critical', 'high', 'medium', 'low'].includes(lower)) {
    return lower;
  }
  return 'low';
}

async function defaultReadFile(path) {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
}
