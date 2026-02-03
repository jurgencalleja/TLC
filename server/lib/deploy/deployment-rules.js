/**
 * Deployment Rules
 *
 * Defines and manages deployment rules for different tiers (feature, dev, stable).
 */

/**
 * Default deployment rules for each tier
 */
export const DEFAULT_RULES = {
  feature: {
    autoDeploy: true,
    securityGates: ['sast', 'dependencies'],
    deploymentStrategy: 'rolling',
    requiresApproval: false,
    requires2FA: false,
  },
  dev: {
    autoDeploy: true,
    securityGates: ['sast', 'dast', 'container', 'dependencies'],
    deploymentStrategy: 'rolling',
    requiresApproval: false,
    requires2FA: false,
  },
  stable: {
    autoDeploy: false,
    securityGates: ['sast', 'dast', 'container', 'dependencies', 'pentest'],
    deploymentStrategy: 'blue-green',
    requiresApproval: true,
    requires2FA: true,
  },
};

/**
 * Valid deployment strategies
 */
const VALID_STRATEGIES = ['rolling', 'blue-green', 'canary', 'recreate'];

/**
 * Load deployment rules from config object
 * @param {object} config - Configuration object with optional deployment.rules
 * @returns {object} Merged rules with defaults
 */
export function loadDeploymentRules(config) {
  if (!config || !config.deployment || !config.deployment.rules) {
    return DEFAULT_RULES;
  }
  return mergeWithDefaults(config.deployment.rules);
}

/**
 * Validate rules schema
 * @param {object} rules - Rules object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRules(rules) {
  const errors = [];

  for (const [tier, tierRules] of Object.entries(rules)) {
    if (tierRules.autoDeploy !== undefined && typeof tierRules.autoDeploy !== 'boolean') {
      errors.push(`${tier}.autoDeploy must be a boolean`);
    }

    if (tierRules.securityGates !== undefined && !Array.isArray(tierRules.securityGates)) {
      errors.push(`${tier}.securityGates must be an array`);
    }

    if (
      tierRules.deploymentStrategy !== undefined &&
      !VALID_STRATEGIES.includes(tierRules.deploymentStrategy)
    ) {
      errors.push(
        `${tier}.deploymentStrategy must be one of: ${VALID_STRATEGIES.join(', ')}`
      );
    }

    if (tierRules.requiresApproval !== undefined && typeof tierRules.requiresApproval !== 'boolean') {
      errors.push(`${tier}.requiresApproval must be a boolean`);
    }

    if (tierRules.requires2FA !== undefined && typeof tierRules.requires2FA !== 'boolean') {
      errors.push(`${tier}.requires2FA must be a boolean`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get rules for a specific tier
 * @param {string} tier - Tier name (feature, dev, stable)
 * @param {object} customRules - Optional custom rules to use instead of defaults
 * @returns {object} Rules for the specified tier
 */
export function getRulesForTier(tier, customRules = null) {
  const rules = customRules ? mergeWithDefaults(customRules) : DEFAULT_RULES;
  return rules[tier] || DEFAULT_RULES.feature;
}

/**
 * Merge custom rules with defaults
 * @param {object} custom - Custom rules to merge
 * @returns {object} Merged rules
 */
export function mergeWithDefaults(custom) {
  if (!custom || Object.keys(custom).length === 0) {
    return DEFAULT_RULES;
  }

  const merged = {};

  for (const tier of Object.keys(DEFAULT_RULES)) {
    if (custom[tier]) {
      merged[tier] = {
        ...DEFAULT_RULES[tier],
        ...custom[tier],
      };
    } else {
      merged[tier] = { ...DEFAULT_RULES[tier] };
    }
  }

  return merged;
}

/**
 * Factory function to create a deployment rules manager
 * @param {object} config - Optional configuration object
 * @returns {{ getRules: Function, validate: Function, getForTier: Function }}
 */
export function createDeploymentRules(config = null) {
  const rules = loadDeploymentRules(config);

  return {
    /**
     * Get all rules
     * @returns {object} All deployment rules
     */
    getRules() {
      return rules;
    },

    /**
     * Validate the current rules
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate() {
      return validateRules(rules);
    },

    /**
     * Get rules for a specific tier
     * @param {string} tier - Tier name
     * @returns {object} Rules for the tier
     */
    getForTier(tier) {
      return rules[tier] || DEFAULT_RULES.feature;
    },
  };
}
