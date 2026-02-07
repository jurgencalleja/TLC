/**
 * Gate Configuration
 *
 * Reads gate config from .tlc.json, supports rule enable/disable,
 * severity overrides, ignore patterns, and strictness levels.
 *
 * @module code-gate/gate-config
 */

const path = require('path');
const fs = require('fs');

/** Strictness levels control default severity thresholds */
const STRICTNESS = {
  RELAXED: 'relaxed',
  STANDARD: 'standard',
  STRICT: 'strict',
};

/**
 * Return the default gate configuration.
 * Defaults to strict mode — block on all high/critical findings.
 *
 * @returns {Object} Default gate config
 */
function getDefaultGateConfig() {
  return {
    enabled: true,
    strictness: STRICTNESS.STRICT,
    preCommit: true,
    prePush: true,
    rules: {},
    ignore: ['*.md', '*.json', '*.lock', '*.yml', '*.yaml'],
  };
}

/**
 * Load gate configuration from .tlc.json in the given project path.
 * Falls back to defaults if no config exists or if parsing fails.
 *
 * @param {string} projectPath - Path to project root
 * @param {Object} [options] - Options with injectable dependencies
 * @param {Object} [options.fs] - File system module (for testing)
 * @returns {Object} Resolved gate configuration
 */
function loadGateConfig(projectPath, options = {}) {
  const fsModule = options.fs || fs;
  const defaults = getDefaultGateConfig();
  const configPath = path.join(projectPath, '.tlc.json');

  if (!fsModule.existsSync(configPath)) {
    return defaults;
  }

  try {
    const raw = fsModule.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const gateSection = parsed.gate || {};
    return mergeGateConfig(defaults, gateSection);
  } catch {
    return defaults;
  }
}

/**
 * Deep-merge user gate config over defaults.
 * Rules are merged as an override map. Ignore arrays are concatenated
 * with deduplication.
 *
 * @param {Object} defaults - Default gate config
 * @param {Object} userConfig - User overrides from .tlc.json
 * @returns {Object} Merged config
 */
function mergeGateConfig(defaults, userConfig) {
  const merged = { ...defaults };

  // Simple scalar overrides
  if (userConfig.enabled !== undefined) merged.enabled = userConfig.enabled;
  if (userConfig.strictness !== undefined) merged.strictness = userConfig.strictness;
  if (userConfig.preCommit !== undefined) merged.preCommit = userConfig.preCommit;
  if (userConfig.prePush !== undefined) merged.prePush = userConfig.prePush;

  // Merge rules as override map
  if (userConfig.rules) {
    merged.rules = { ...defaults.rules, ...userConfig.rules };
  }

  // Concatenate ignore arrays, deduplicate
  if (userConfig.ignore) {
    const combined = [...defaults.ignore, ...userConfig.ignore];
    merged.ignore = [...new Set(combined)];
  }

  return merged;
}

/**
 * Resolve the effective severity for a rule, considering user overrides.
 *
 * @param {string} ruleId - Rule identifier
 * @param {string} defaultSeverity - The rule's built-in severity
 * @param {Object} config - Gate config with rules overrides
 * @returns {string|false} Effective severity, or false if rule is disabled
 */
function resolveRuleSeverity(ruleId, defaultSeverity, config) {
  if (config.rules && config.rules[ruleId] !== undefined) {
    return config.rules[ruleId];
  }
  return defaultSeverity;
}

/**
 * Check if a file should be ignored based on config ignore patterns.
 * Supports simple glob matching: *.ext and dir/* patterns.
 *
 * @param {string} filePath - File path to check
 * @param {Object} config - Gate config with ignore array
 * @returns {boolean} True if file should be ignored
 */
function shouldIgnoreFile(filePath, config) {
  const patterns = config.ignore || [];
  for (const pattern of patterns) {
    if (matchPattern(filePath, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Simple glob pattern matcher.
 *
 * @param {string} filePath
 * @param {string} pattern
 * @returns {boolean}
 */
function matchPattern(filePath, pattern) {
  // *.ext — match extension anywhere
  if (pattern.startsWith('*.')) {
    return filePath.endsWith(pattern.slice(1));
  }
  // **/*.ext — match extension in any nested path
  if (pattern.startsWith('**/')) {
    const sub = pattern.slice(3);
    return matchPattern(filePath, sub) || matchPattern(path.basename(filePath), sub);
  }
  // dir/* — match files starting with dir/
  if (pattern.endsWith('/*')) {
    const dir = pattern.slice(0, -2);
    return filePath.startsWith(dir + '/');
  }
  // Exact match
  return filePath === pattern;
}

module.exports = {
  loadGateConfig,
  getDefaultGateConfig,
  mergeGateConfig,
  resolveRuleSeverity,
  shouldIgnoreFile,
  STRICTNESS,
};
