/**
 * Code Gate Engine
 *
 * Core engine that accepts changed files and runs configurable rule sets
 * against each file, returning pass/fail with detailed findings per file.
 *
 * @module code-gate/gate-engine
 */

const path = require('path');

/**
 * Severity levels for gate findings.
 * - block: Commit/push is rejected
 * - warn: Warning shown but allowed through
 * - info: Informational, no action needed
 */
const SEVERITY = {
  BLOCK: 'block',
  WARN: 'warn',
  INFO: 'info',
};

/** Deduction points per severity level for scoring */
const SCORE_DEDUCTIONS = {
  [SEVERITY.BLOCK]: 25,
  [SEVERITY.WARN]: 10,
  [SEVERITY.INFO]: 2,
};

/**
 * Create a gate engine instance with configurable rules and options.
 *
 * @param {Object} options - Engine options
 * @param {Array<{id: string, check: Function}>} [options.rules] - Rule set to run
 * @param {string[]} [options.ignore] - Glob patterns for files to skip
 * @returns {{ rules: Array, options: Object }}
 */
function createGateEngine(options = {}) {
  return {
    rules: options.rules || [],
    options: {
      ignore: options.ignore || [],
    },
  };
}

/**
 * Run all configured rules against a set of changed files.
 *
 * @param {{ rules: Array, options: Object }} engine - Gate engine instance
 * @param {Array<{path: string, content: string}>} files - Changed files to check
 * @returns {Promise<{passed: boolean, findings: Array, summary: Object, duration: number}>}
 */
async function runGate(engine, files) {
  const start = Date.now();
  const findings = [];

  for (const file of files) {
    if (shouldIgnore(file.path, engine.options.ignore)) {
      continue;
    }

    for (const rule of engine.rules) {
      try {
        const ruleFindings = rule.check(file.path, file.content);
        for (const finding of ruleFindings) {
          findings.push({ ...finding, file: file.path });
        }
      } catch (err) {
        findings.push({
          severity: SEVERITY.WARN,
          rule: rule.id,
          file: file.path,
          message: `Rule error: ${err.message}`,
          fix: 'Check rule configuration',
        });
      }
    }
  }

  const summary = buildSummary(findings);
  const passed = summary.block === 0;

  return {
    passed,
    findings,
    summary,
    duration: Date.now() - start,
  };
}

/**
 * Group findings by file path for reporting.
 *
 * @param {Array} findings - Array of finding objects
 * @returns {Object.<string, Array>} Findings grouped by file
 */
function aggregateFindings(findings) {
  const grouped = {};
  for (const finding of findings) {
    const key = finding.file;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(finding);
  }
  return grouped;
}

/**
 * Calculate a 0-100 quality score from findings.
 * Starts at 100, deducts per severity. Floors at 0.
 *
 * @param {Array<{severity: string}>} findings - Finding objects with severity
 * @returns {number} Score from 0 to 100
 */
function calculateScore(findings) {
  let score = 100;
  for (const finding of findings) {
    const deduction = SCORE_DEDUCTIONS[finding.severity] || 0;
    score -= deduction;
  }
  return Math.max(0, score);
}

/**
 * Build summary counts from findings array.
 *
 * @param {Array<{severity: string}>} findings
 * @returns {{ total: number, block: number, warn: number, info: number }}
 */
function buildSummary(findings) {
  const summary = { total: findings.length, block: 0, warn: 0, info: 0 };
  for (const finding of findings) {
    if (summary[finding.severity] !== undefined) {
      summary[finding.severity]++;
    }
  }
  return summary;
}

/**
 * Check if a file path matches any ignore pattern.
 * Supports simple glob matching: *.ext and dir/* patterns.
 *
 * @param {string} filePath - File path to check
 * @param {string[]} patterns - Glob patterns
 * @returns {boolean} True if file should be ignored
 */
function shouldIgnore(filePath, patterns) {
  for (const pattern of patterns) {
    if (matchGlob(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Simple glob matcher for common patterns.
 *
 * @param {string} filePath
 * @param {string} pattern
 * @returns {boolean}
 */
function matchGlob(filePath, pattern) {
  // *.ext — match extension anywhere
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1);
    return filePath.endsWith(ext);
  }
  // **/*.ext — match extension in any directory
  if (pattern.startsWith('**/')) {
    const sub = pattern.slice(3);
    return matchGlob(filePath, sub) || matchGlob(path.basename(filePath), sub);
  }
  // dir/* — match files in directory
  if (pattern.endsWith('/*')) {
    const dir = pattern.slice(0, -2);
    return filePath.startsWith(dir + '/') || filePath.startsWith(dir + path.sep);
  }
  // Exact match
  return filePath === pattern;
}

module.exports = {
  createGateEngine,
  runGate,
  aggregateFindings,
  calculateScore,
  SEVERITY,
};
