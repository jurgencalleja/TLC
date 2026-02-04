/**
 * Quality Presets Module
 *
 * Pre-configured quality levels for common use cases
 */

/**
 * Preset constants
 */
const PRESET_FAST = 'fast';
const PRESET_BALANCED = 'balanced';
const PRESET_THOROUGH = 'thorough';
const PRESET_CRITICAL = 'critical';

/**
 * Built-in presets registry
 */
const BUILT_IN_PRESETS = {
  [PRESET_FAST]: {
    name: 'fast',
    description: 'Quick iterations with minimal quality checks',
    thresholds: {
      default: 50,
      dimensions: {
        style: 40,
        completeness: 50,
        correctness: 60,
        documentation: 30,
      },
    },
    modelTier: 'basic',
    maxRetries: 0,
    skipDimensions: ['documentation'],
    allowedModels: ['gpt-3.5-turbo', 'claude-instant'],
  },
  [PRESET_BALANCED]: {
    name: 'balanced',
    description: 'Standard quality for normal development work',
    thresholds: {
      default: 70,
      dimensions: {
        style: 70,
        completeness: 70,
        correctness: 75,
        documentation: 60,
      },
    },
    modelTier: 'standard',
    maxRetries: 2,
  },
  [PRESET_THOROUGH]: {
    name: 'thorough',
    description: 'High quality for production code',
    thresholds: {
      default: 85,
      dimensions: {
        style: 85,
        completeness: 85,
        correctness: 90,
        documentation: 80,
      },
    },
    modelTier: 'premium',
    minModel: 'gpt-4',
    maxRetries: 3,
    allowedModels: ['gpt-4', 'gpt-4-turbo', 'claude-3-opus'],
  },
  [PRESET_CRITICAL]: {
    name: 'critical',
    description: 'Maximum quality for mission-critical code',
    thresholds: {
      default: 95,
      dimensions: {
        style: 90,
        completeness: 95,
        correctness: 98,
        documentation: 85,
      },
    },
    modelTier: 'premium',
    minModel: 'gpt-4-turbo',
    maxRetries: 5,
  },
};

/**
 * Custom presets registry (populated at runtime)
 */
const customPresets = {};

/**
 * Get a preset by name
 * @param {string} name - Preset name
 * @returns {Object|null} Preset configuration
 */
function getPreset(name) {
  // Normalize name
  const normalizedName = typeof name === 'string' ? name.toLowerCase() : name;

  // Check built-in presets
  if (BUILT_IN_PRESETS[normalizedName]) {
    return { ...BUILT_IN_PRESETS[normalizedName] };
  }

  // Check custom presets
  if (customPresets[normalizedName]) {
    return { ...customPresets[normalizedName] };
  }

  return null;
}

/**
 * Create a custom preset
 * @param {string} name - Preset name
 * @param {Object} config - Preset configuration
 * @returns {Object} Created preset
 */
function createCustomPreset(name, config = {}) {
  // Validate threshold values
  if (config.thresholds?.default !== undefined) {
    const threshold = config.thresholds.default;
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
      throw new Error('Invalid threshold value: must be 0-100');
    }
  }

  let baseConfig = {};

  // Extend existing preset if specified
  if (config.extends) {
    const base = getPreset(config.extends);
    if (base) {
      baseConfig = { ...base };
    }
  }

  const preset = {
    ...baseConfig,
    ...config,
    name,
    thresholds: {
      ...baseConfig.thresholds,
      ...config.thresholds,
      dimensions: {
        ...baseConfig.thresholds?.dimensions,
        ...config.thresholds?.dimensions,
      },
    },
  };

  // Register custom preset
  customPresets[name.toLowerCase()] = preset;

  return preset;
}

/**
 * Recommend preset for a task
 * @param {Object} context - Task context
 * @returns {string} Recommended preset name
 */
function recommendPreset(context = {}) {
  const { task, importance, timeConstrained } = context;

  // Time-constrained tasks get faster presets
  if (timeConstrained) {
    if (task === 'release' || importance === 'high') {
      return 'balanced';
    }
    return 'fast';
  }

  // Task-specific recommendations
  switch (task) {
    case 'quick-fix':
    case 'debug':
    case 'prototype':
      return 'fast';

    case 'feature':
    case 'refactor':
      return 'balanced';

    case 'release':
    case 'production':
      return 'thorough';

    case 'security':
    case 'critical':
    case 'financial':
      return 'critical';

    default:
      break;
  }

  // Importance-based
  switch (importance) {
    case 'low':
      return 'fast';
    case 'high':
      return 'thorough';
    case 'critical':
      return 'critical';
    default:
      return 'balanced';
  }
}

/**
 * Apply preset to a configuration
 * @param {Object} current - Current configuration
 * @param {string} presetName - Preset to apply
 * @returns {Object} Updated configuration
 */
function applyPreset(current, presetName) {
  const preset = getPreset(presetName);
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  return {
    ...current,
    thresholds: {
      ...preset.thresholds,
      dimensions: { ...preset.thresholds?.dimensions },
    },
    modelTier: preset.modelTier,
    minModel: preset.minModel,
    maxRetries: preset.maxRetries,
    skipDimensions: preset.skipDimensions,
    appliedPreset: presetName,
  };
}

/**
 * List all available presets
 * @param {Object} options - List options
 * @returns {Array} Preset summaries
 */
function listPresets(options = {}) {
  const presets = [];

  // Add built-in presets
  for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
    const entry = {
      name,
      description: preset.description,
      builtin: true,
    };

    if (options.summary) {
      entry.thresholdSummary = preset.thresholds.default;
    }

    presets.push(entry);
  }

  // Add custom presets
  for (const [name, preset] of Object.entries(customPresets)) {
    const entry = {
      name,
      description: preset.description || 'Custom preset',
      builtin: false,
    };

    if (options.summary) {
      entry.thresholdSummary = preset.thresholds?.default;
    }

    presets.push(entry);
  }

  return presets;
}

module.exports = {
  getPreset,
  createCustomPreset,
  recommendPreset,
  applyPreset,
  listPresets,
  PRESET_FAST,
  PRESET_BALANCED,
  PRESET_THOROUGH,
  PRESET_CRITICAL,
};
