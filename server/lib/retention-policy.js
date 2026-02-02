/**
 * Retention Policy Engine - Configurable retention policies per data type
 *
 * Supports:
 * - Policies per sensitivity level (critical, high, medium, low)
 * - Policies per data type (secrets, pii, general)
 * - Time-based retention (hours, days)
 * - Session-based retention
 * - Immediate purge policy
 * - Loading policies from .tlc.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Sensitivity level constants
 */
const SENSITIVITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Data type constants
 */
const DATA_TYPES = {
  SECRETS: 'secrets',
  PII: 'pii',
  GENERAL: 'general',
};

/**
 * Default retention policies
 */
const DEFAULT_POLICIES = {
  sensitivityLevels: {
    critical: { retention: 'immediate', persist: false },
    high: { retention: 'session', persist: false },
    medium: { retention: '24h', persist: true },
    low: { retention: '7d', persist: true },
  },
  dataTypes: {
    secrets: { retention: 'immediate', persist: false },
    pii: { retention: 'session', persist: false },
    general: { retention: '7d', persist: true },
  },
  default: { retention: '7d', persist: true },
};

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '24h', '7d', '30m')
 * @returns {number|null} Milliseconds or null for non-time-based
 */
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  // Handle special cases
  if (duration === 'immediate' || duration === 'session') {
    return null;
  }

  const match = duration.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60 * 1000; // minutes to ms
    case 'h':
      return value * 60 * 60 * 1000; // hours to ms
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to ms
    default:
      return null;
  }
}

/**
 * Get retention policy for given options
 * @param {Object} options - Options to match against policies
 * @param {string} [options.sensitivityLevel] - Sensitivity level
 * @param {string} [options.dataType] - Data type
 * @param {Object} [customPolicies] - Custom policies to use instead of defaults
 * @returns {Object} Policy object with retention and persist fields
 */
function getPolicy(options, customPolicies) {
  const policies = customPolicies || DEFAULT_POLICIES;
  const opts = options || {};

  // Priority: sensitivity level > data type > default
  if (opts.sensitivityLevel && policies.sensitivityLevels) {
    const levelPolicy = policies.sensitivityLevels[opts.sensitivityLevel];
    if (levelPolicy) {
      return { ...levelPolicy };
    }
  }

  if (opts.dataType && policies.dataTypes) {
    const typePolicy = policies.dataTypes[opts.dataType];
    if (typePolicy) {
      return { ...typePolicy };
    }
  }

  // Return default policy
  return { ...(policies.default || DEFAULT_POLICIES.default) };
}

/**
 * Evaluate retention decision for data item
 * @param {Object} data - Data item to evaluate
 * @param {Object} policy - Policy to apply
 * @param {Object} [context] - Additional context
 * @param {string} [context.currentSessionId] - Current session ID
 * @returns {string} 'purge' or 'keep'
 */
function evaluateRetention(data, policy, context) {
  // Handle null/undefined data
  if (!data) {
    return 'purge';
  }

  // Handle null/undefined policy
  if (!policy) {
    return 'keep';
  }

  const retention = policy.retention;

  // Immediate purge
  if (retention === 'immediate') {
    return 'purge';
  }

  // Session-based retention
  if (retention === 'session') {
    const ctx = context || {};
    const currentSessionId = ctx.currentSessionId;

    // No current session context means we can't verify - purge
    if (!currentSessionId) {
      return 'purge';
    }

    // Data without sessionId is considered current session
    if (!data.sessionId) {
      return 'keep';
    }

    // Check session match
    if (data.sessionId === currentSessionId) {
      return 'keep';
    }

    return 'purge';
  }

  // Time-based retention
  const durationMs = parseDuration(retention);
  if (durationMs !== null) {
    // No createdAt means we can't evaluate age - keep it
    if (!data.createdAt) {
      return 'keep';
    }

    const createdTime = new Date(data.createdAt).getTime();
    const now = Date.now();
    const age = now - createdTime;

    if (age > durationMs) {
      return 'purge';
    }

    return 'keep';
  }

  // Unknown retention type - default to keep
  return 'keep';
}

/**
 * Load policies from config file
 * @param {string} projectPath - Project root path
 * @param {Object} [fsModule] - Optional fs module for testing
 * @returns {Object} Loaded policies merged with defaults
 */
function loadPolicies(projectPath, fsModule) {
  const fsImpl = fsModule || fs;
  const configPath = path.join(projectPath, '.tlc.json');

  // Check if config exists
  if (!fsImpl.existsSync(configPath)) {
    return DEFAULT_POLICIES;
  }

  // Read and parse config
  let config;
  try {
    const content = fsImpl.readFileSync(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch (e) {
    // Invalid JSON - use defaults
    return DEFAULT_POLICIES;
  }

  // Check for retention section
  if (!config.retention || !config.retention.policies) {
    return DEFAULT_POLICIES;
  }

  // Merge with defaults
  return mergeWithDefaults(config.retention.policies);
}

/**
 * Merge user policies with defaults
 * @param {Object} userPolicies - User-provided policies
 * @returns {Object} Merged policies
 */
function mergeWithDefaults(userPolicies) {
  if (!userPolicies || typeof userPolicies !== 'object') {
    return DEFAULT_POLICIES;
  }

  const merged = {
    sensitivityLevels: { ...DEFAULT_POLICIES.sensitivityLevels },
    dataTypes: { ...DEFAULT_POLICIES.dataTypes },
    default: { ...DEFAULT_POLICIES.default },
  };

  // Merge sensitivity levels
  if (userPolicies.sensitivityLevels) {
    for (const level of Object.keys(userPolicies.sensitivityLevels)) {
      merged.sensitivityLevels[level] = {
        ...merged.sensitivityLevels[level],
        ...userPolicies.sensitivityLevels[level],
      };
    }
  }

  // Merge data types
  if (userPolicies.dataTypes) {
    for (const type of Object.keys(userPolicies.dataTypes)) {
      merged.dataTypes[type] = {
        ...merged.dataTypes[type],
        ...userPolicies.dataTypes[type],
      };
    }
  }

  // Merge default
  if (userPolicies.default) {
    merged.default = {
      ...DEFAULT_POLICIES.default,
      ...userPolicies.default,
    };
  }

  return merged;
}

module.exports = {
  getPolicy,
  evaluateRetention,
  loadPolicies,
  mergeWithDefaults,
  parseDuration,
  DEFAULT_POLICIES,
  SENSITIVITY_LEVELS,
  DATA_TYPES,
};
