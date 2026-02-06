/**
 * Release Config Schema - Configuration for .tlc.json release pipeline section
 * Phase 63, Task 6
 */

/** Valid gate names for release tiers */
const VALID_GATES = ['tests', 'security', 'coverage', 'qa-approval'];

/**
 * Default release pipeline configuration.
 * Used when no release section exists or to fill in missing fields.
 * @type {object}
 */
export const DEFAULT_RELEASE_CONFIG = Object.freeze({
  tagPattern: 'v*',
  previewUrlTemplate: 'qa-{tag}.{domain}',
  tiers: Object.freeze({
    rc: Object.freeze({
      gates: Object.freeze(['tests', 'security', 'coverage', 'qa-approval']),
      coverageThreshold: 80,
      autoPromote: false,
    }),
    beta: Object.freeze({
      gates: Object.freeze(['tests', 'security']),
      coverageThreshold: 70,
      autoPromote: false,
    }),
    release: Object.freeze({
      gates: Object.freeze(['tests', 'security', 'coverage']),
      coverageThreshold: 80,
      requiresPromotion: true,
    }),
  }),
  notifications: Object.freeze({
    onDeploy: Object.freeze(['slack']),
    onAccept: Object.freeze(['slack']),
    onReject: Object.freeze(['slack']),
  }),
});

/**
 * Deep-clone a plain object (JSON-safe values only).
 * @param {object} obj
 * @returns {object}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep-merge source into target, returning a new object.
 * Arrays are replaced, not concatenated.
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Load and validate release configuration from a config object.
 * Merges user-supplied values with defaults. Returns only the release section.
 * Handles null/undefined/empty input gracefully.
 *
 * @param {object|null|undefined} configObj - Full .tlc.json-style object (may contain a `release` key)
 * @returns {object} Validated release config with defaults applied
 */
export function loadReleaseConfig(configObj) {
  const releaseSection = (configObj && configObj.release) || {};
  const defaults = deepClone(DEFAULT_RELEASE_CONFIG);
  const merged = deepMerge(defaults, releaseSection);
  return deepClone(merged);
}

/**
 * Get the list of quality gates required for a specific release tier.
 *
 * @param {object} config - Release config (as returned by loadReleaseConfig)
 * @param {string} tier - Tier name (e.g. 'rc', 'beta', 'release')
 * @returns {string[]} Array of gate names, or empty array if tier is unknown
 */
export function getGatesForTier(config, tier) {
  if (!config || !config.tiers || !config.tiers[tier]) {
    return [];
  }
  return [...config.tiers[tier].gates];
}

/**
 * Generate a preview URL by substituting {tag} and {domain} placeholders
 * in the configured template.
 *
 * @param {object} config - Release config (as returned by loadReleaseConfig)
 * @param {string} tag - The release tag (e.g. 'v1.0.0')
 * @param {string} domain - The base domain (e.g. 'example.com')
 * @returns {string} Resolved preview URL
 */
export function getPreviewUrl(config, tag, domain) {
  const template = (config && config.previewUrlTemplate) || DEFAULT_RELEASE_CONFIG.previewUrlTemplate;
  return template.replace(/\{tag\}/g, tag).replace(/\{domain\}/g, domain);
}

/**
 * Validate a release config object. Checks gate names, URL template placeholders,
 * notification channels, and tag pattern.
 *
 * @param {object} config - Release config (as returned by loadReleaseConfig)
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateReleaseConfig(config) {
  const errors = [];

  // Validate tagPattern
  if (!config.tagPattern || typeof config.tagPattern !== 'string' || config.tagPattern.trim() === '') {
    errors.push('tagPattern must be a non-empty string');
  }

  // Validate previewUrlTemplate contains {tag}
  if (config.previewUrlTemplate && !config.previewUrlTemplate.includes('{tag}')) {
    errors.push('previewUrlTemplate must contain {tag} placeholder');
  }

  // Validate gate names across all tiers
  if (config.tiers) {
    for (const [tierName, tierConfig] of Object.entries(config.tiers)) {
      if (tierConfig.gates) {
        for (const gate of tierConfig.gates) {
          if (!VALID_GATES.includes(gate)) {
            errors.push('Tier ' + tierName + ' has unknown gate: ' + gate + '. Valid gates: ' + VALID_GATES.join(', '));
          }
        }
      }
    }
  }

  // Validate notification channels
  if (config.notifications) {
    for (const [event, channels] of Object.entries(config.notifications)) {
      if (Array.isArray(channels)) {
        for (const channel of channels) {
          if (typeof channel !== 'string' || channel.trim() === '') {
            errors.push('Invalid notification channel in ' + event + ': channels must be non-empty strings');
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default {
  loadReleaseConfig,
  getGatesForTier,
  getPreviewUrl,
  validateReleaseConfig,
  DEFAULT_RELEASE_CONFIG,
};
