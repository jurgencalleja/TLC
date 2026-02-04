/**
 * Quality Thresholds Module
 *
 * Configurable quality thresholds per operation
 */

/**
 * Preset constants
 */
const PRESET_FAST = 'fast';
const PRESET_BALANCED = 'balanced';
const PRESET_THOROUGH = 'thorough';
const PRESET_CRITICAL = 'critical';

/**
 * Preset configurations
 */
const PRESETS = {
  [PRESET_FAST]: {
    name: 'fast',
    default: 50,
    modelTier: 'basic',
    maxRetries: 0,
    skipDimensions: ['documentation'],
    dimensions: {
      style: 40,
      correctness: 60,
    },
  },
  [PRESET_BALANCED]: {
    name: 'balanced',
    default: 70,
    modelTier: 'standard',
    maxRetries: 2,
    dimensions: {
      style: 70,
      completeness: 70,
      correctness: 75,
      documentation: 60,
    },
  },
  [PRESET_THOROUGH]: {
    name: 'thorough',
    default: 85,
    modelTier: 'premium',
    minModel: 'gpt-4',
    maxRetries: 3,
    dimensions: {
      style: 85,
      completeness: 85,
      correctness: 90,
      documentation: 80,
    },
  },
  [PRESET_CRITICAL]: {
    name: 'critical',
    default: 95,
    modelTier: 'premium',
    minModel: 'gpt-4-turbo',
    maxRetries: 5,
    dimensions: {
      style: 90,
      completeness: 95,
      correctness: 98,
      documentation: 85,
    },
  },
};

/**
 * Create a thresholds configuration
 * @param {Object} options - Threshold options
 * @returns {Object} Thresholds config
 */
function createThresholds(options = {}) {
  return {
    default: options.default ?? 70,
    operations: options.operations || {},
    dimensions: options.dimensions || {},
    ...options,
  };
}

/**
 * Get threshold for an operation
 * @param {Object} thresholds - Thresholds config
 * @param {string} operation - Operation name
 * @returns {number} Threshold value
 */
function getThreshold(thresholds, operation) {
  if (!operation) {
    return thresholds.default;
  }

  const opThreshold = thresholds.operations?.[operation];
  if (typeof opThreshold === 'number') {
    return opThreshold;
  }
  if (typeof opThreshold === 'object' && opThreshold.default !== undefined) {
    return opThreshold.default;
  }

  return thresholds.default;
}

/**
 * Get threshold for a specific dimension
 * @param {Object} thresholds - Thresholds config
 * @param {string} dimension - Dimension name
 * @param {string} operation - Operation name (optional)
 * @returns {number} Threshold value
 */
function getDimensionThreshold(thresholds, dimension, operation = null) {
  // Check operation-specific dimension threshold
  if (operation && thresholds.operations?.[operation]) {
    const opConfig = thresholds.operations[operation];
    if (typeof opConfig === 'object' && opConfig.dimensions?.[dimension] !== undefined) {
      return opConfig.dimensions[dimension];
    }
  }

  // Check global dimension threshold
  if (thresholds.dimensions?.[dimension] !== undefined) {
    return thresholds.dimensions[dimension];
  }

  // Fall back to default
  return thresholds.default;
}

/**
 * Check if scores meet thresholds
 * @param {Object} thresholds - Thresholds config
 * @param {Object} scores - Dimension scores
 * @param {Object} options - Check options
 * @returns {Object} Result with pass/fail and details
 */
function checkThreshold(thresholds, scores, options = {}) {
  const failed = [];
  const margins = {};
  let allPass = true;

  // Check composite score if present
  if (scores.composite !== undefined) {
    const threshold = thresholds.default;
    const margin = scores.composite - threshold;
    if (options.margins) {
      margins.composite = margin;
    }
    if (scores.composite < threshold) {
      allPass = false;
    }
  }

  // Check each dimension
  for (const [dim, score] of Object.entries(scores)) {
    if (dim === 'composite') continue;

    const threshold = getDimensionThreshold(thresholds, dim);
    const margin = score - threshold;

    if (options.margins) {
      margins[dim] = margin;
    }

    if (score < threshold) {
      failed.push(dim);
      allPass = false;
    }
  }

  const result = {
    pass: allPass,
    failed: failed.length > 0 ? failed : undefined,
  };

  if (options.margins) {
    result.margins = margins;
  }

  return result;
}

/**
 * Apply a preset configuration
 * @param {string|Object} preset - Preset name or config
 * @param {Object} overrides - Custom overrides
 * @returns {Object} Thresholds config
 */
function applyPreset(preset, overrides = {}) {
  const presetConfig = typeof preset === 'string' ? PRESETS[preset] : preset;

  if (!presetConfig) {
    throw new Error(`Unknown preset: ${preset}`);
  }

  return {
    ...presetConfig,
    ...overrides,
    preset: presetConfig.name,
    dimensions: {
      ...presetConfig.dimensions,
      ...overrides.dimensions,
    },
  };
}

/**
 * Save thresholds to persistent storage
 * @param {Object} thresholds - Thresholds to save
 * @param {Object} options - Save options with save function
 * @returns {Promise<Object>} Save result
 */
async function saveThresholds(thresholds, options = {}) {
  const { save } = options;
  if (save) {
    await save(thresholds);
  }
  return { success: true };
}

/**
 * Load thresholds from persistent storage
 * @param {Object} options - Load options with load function
 * @returns {Promise<Object>} Loaded thresholds
 */
async function loadThresholds(options = {}) {
  const { load } = options;
  if (load) {
    const data = await load();
    if (data) {
      // Validate loaded config
      if (typeof data.default !== 'number') {
        data.default = 70;
      }
      return data;
    }
  }
  return createThresholds();
}

module.exports = {
  createThresholds,
  getThreshold,
  getDimensionThreshold,
  checkThreshold,
  applyPreset,
  saveThresholds,
  loadThresholds,
  PRESET_FAST,
  PRESET_BALANCED,
  PRESET_THOROUGH,
  PRESET_CRITICAL,
  PRESETS,
};
