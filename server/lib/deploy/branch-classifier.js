/**
 * Branch Classifier
 * Classifies git branches by tier (feature, dev, stable, unknown)
 */

/**
 * Branch tier constants
 */
export const BRANCH_TIERS = {
  FEATURE: 'feature',
  DEV: 'dev',
  STABLE: 'stable',
  UNKNOWN: 'unknown',
};

/**
 * Default patterns for branch classification
 */
const DEFAULT_PATTERNS = {
  feature: ['^feature/', '^feat/', '^bugfix/', '^fix/'],
  dev: ['^dev$', '^develop$', '^development$'],
  stable: ['^main$', '^master$', '^stable$', '^production$', '^prod$', '^release/', '^hotfix/'],
};

/**
 * Default protected branches (stable tier by default)
 */
const DEFAULT_PROTECTED = ['main', 'master', 'production', 'prod', 'stable'];

/**
 * Parse string patterns into RegExp objects
 * @param {string[]|null} patterns - Array of regex pattern strings
 * @returns {RegExp[]} Array of compiled RegExp objects
 */
export function parsePatterns(patterns) {
  if (!patterns || !Array.isArray(patterns)) {
    return [];
  }

  const compiled = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern));
    } catch {
      // Skip invalid regex patterns
    }
  }
  return compiled;
}

/**
 * Classify a branch name using default patterns
 * @param {string} branchName - The branch name to classify
 * @returns {string} The tier classification (feature, dev, stable, unknown)
 */
export function classifyBranch(branchName) {
  return getBranchTier(branchName, DEFAULT_PATTERNS);
}

/**
 * Get branch tier using custom patterns
 * @param {string} branch - The branch name to classify
 * @param {Object} customPatterns - Custom patterns object with feature, dev, stable arrays
 * @returns {string} The tier classification
 */
export function getBranchTier(branch, customPatterns = DEFAULT_PATTERNS) {
  const patterns = customPatterns || DEFAULT_PATTERNS;

  // Check feature patterns
  if (patterns.feature) {
    const featureRegexes = parsePatterns(patterns.feature);
    for (const regex of featureRegexes) {
      if (regex.test(branch)) {
        return BRANCH_TIERS.FEATURE;
      }
    }
  }

  // Check dev patterns
  if (patterns.dev) {
    const devRegexes = parsePatterns(patterns.dev);
    for (const regex of devRegexes) {
      if (regex.test(branch)) {
        return BRANCH_TIERS.DEV;
      }
    }
  }

  // Check stable patterns
  if (patterns.stable) {
    const stableRegexes = parsePatterns(patterns.stable);
    for (const regex of stableRegexes) {
      if (regex.test(branch)) {
        return BRANCH_TIERS.STABLE;
      }
    }
  }

  return BRANCH_TIERS.UNKNOWN;
}

/**
 * Check if a branch is protected
 * @param {string} branch - The branch name to check
 * @param {string[]} [protectedList] - Optional custom list of protected branch names/patterns
 * @returns {boolean} True if the branch is protected
 */
export function isProtectedBranch(branch, protectedList) {
  // If custom protected list provided, use exact matching
  if (protectedList && Array.isArray(protectedList)) {
    return protectedList.includes(branch);
  }

  // Default: stable tier branches and release branches are protected
  const tier = classifyBranch(branch);
  return tier === BRANCH_TIERS.STABLE;
}

/**
 * Create a branch classifier with custom configuration
 * @param {Object} [config] - Configuration object
 * @param {Object} [config.patterns] - Custom patterns for classification
 * @param {string[]} [config.protected] - Custom list of protected branches
 * @returns {Object} Classifier object with classify, isProtected, getTier methods
 */
export function createBranchClassifier(config = {}) {
  const patterns = config.patterns || DEFAULT_PATTERNS;
  const protectedList = config.protected;

  return {
    /**
     * Classify a branch name
     * @param {string} branch - Branch name to classify
     * @returns {string} Tier classification
     */
    classify(branch) {
      return getBranchTier(branch, patterns);
    },

    /**
     * Check if a branch is protected
     * @param {string} branch - Branch name to check
     * @returns {boolean} True if protected
     */
    isProtected(branch) {
      if (protectedList) {
        return protectedList.includes(branch);
      }
      // Default: stable branches are protected
      const tier = getBranchTier(branch, patterns);
      return tier === BRANCH_TIERS.STABLE;
    },

    /**
     * Get the tier for a branch
     * @param {string} branch - Branch name
     * @returns {string} Tier classification
     */
    getTier(branch) {
      return getBranchTier(branch, patterns);
    },
  };
}
