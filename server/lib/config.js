/**
 * TLC Configuration Module
 * Handles .tlc.json parsing, validation, and defaults
 */

const fs = require('fs');
const path = require('path');

/**
 * Get default configuration
 * @returns {Object} Default config object
 */
function getDefaultConfig() {
  return {
    testFrameworks: {
      primary: 'mocha',
      installed: ['mocha', 'chai', 'sinon', 'proxyquire'],
      run: ['mocha'],
    },
    testCommand: 'npm test',
    testDirectory: 'test',
    quality: {
      coverageThreshold: 80,
      runMutationTests: false,
    },
    autofix: {
      maxAttempts: 5,
      strategies: ['null-check', 'import', 'return-value', 'undefined-check'],
      confirmBeforeApply: true,
    },
    edgeCases: {
      patterns: ['null-check', 'undefined-check', 'empty-string', 'boundary', 'security'],
      maxPerFunction: 20,
      includeSecurity: true,
    },
  };
}

/**
 * Parse JSON config string
 * @param {string} jsonStr - JSON string to parse
 * @returns {Object|null} Parsed config or null if invalid
 */
function parseConfig(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return null;
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

/**
 * Validate configuration
 * @param {Object} config - Config object to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    return { valid: true, errors: [] }; // Empty config is valid (uses defaults)
  }

  // Validate quality settings
  if (config.quality) {
    if (config.quality.coverageThreshold !== undefined) {
      const threshold = config.quality.coverageThreshold;
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
        errors.push('quality.coverageThreshold must be a number between 0 and 100');
      }
    }
  }

  // Validate autofix settings
  if (config.autofix) {
    if (config.autofix.maxAttempts !== undefined) {
      const attempts = config.autofix.maxAttempts;
      if (typeof attempts !== 'number' || attempts < 0) {
        errors.push('autofix.maxAttempts must be a non-negative number');
      }
    }

    if (config.autofix.strategies !== undefined) {
      if (!Array.isArray(config.autofix.strategies)) {
        errors.push('autofix.strategies must be an array');
      }
    }
  }

  // Validate edge case settings
  if (config.edgeCases) {
    if (config.edgeCases.patterns !== undefined) {
      if (!Array.isArray(config.edgeCases.patterns)) {
        errors.push('edgeCases.patterns must be an array');
      }
    }

    if (config.edgeCases.maxPerFunction !== undefined) {
      const max = config.edgeCases.maxPerFunction;
      if (typeof max !== 'number' || max < 1) {
        errors.push('edgeCases.maxPerFunction must be a positive number');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge user config with defaults
 * @param {Object|null} userConfig - User-provided config
 * @returns {Object} Merged config with defaults
 */
function mergeWithDefaults(userConfig) {
  const defaults = getDefaultConfig();

  if (!userConfig || typeof userConfig !== 'object') {
    return defaults;
  }

  // Deep merge
  const merged = { ...defaults };

  // Test frameworks
  if (userConfig.testFrameworks) {
    merged.testFrameworks = {
      ...defaults.testFrameworks,
      ...userConfig.testFrameworks,
    };
  }

  // Quality
  if (userConfig.quality) {
    merged.quality = {
      ...defaults.quality,
      ...userConfig.quality,
    };
  }

  // Autofix
  if (userConfig.autofix) {
    merged.autofix = {
      ...defaults.autofix,
      ...userConfig.autofix,
    };
  }

  // Edge cases
  if (userConfig.edgeCases) {
    merged.edgeCases = {
      ...defaults.edgeCases,
      ...userConfig.edgeCases,
    };
  }

  // Top-level fields
  if (userConfig.testCommand) {
    merged.testCommand = userConfig.testCommand;
  }
  if (userConfig.testDirectory) {
    merged.testDirectory = userConfig.testDirectory;
  }

  return merged;
}

/**
 * Load config from file (I/O wrapper)
 * @param {string} projectPath - Project root path
 * @returns {Object} Loaded and merged config
 */
function loadConfig(projectPath) {
  const configPath = path.join(projectPath, '.tlc.json');

  if (!fs.existsSync(configPath)) {
    return getDefaultConfig();
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = parseConfig(content);

  if (!parsed) {
    console.warn('Warning: Invalid .tlc.json, using defaults');
    return getDefaultConfig();
  }

  const validation = validateConfig(parsed);
  if (!validation.valid) {
    console.warn('Warning: Invalid .tlc.json config:');
    validation.errors.forEach(e => console.warn(`  - ${e}`));
    console.warn('Using defaults for invalid fields');
  }

  return mergeWithDefaults(parsed);
}

/**
 * Save config to file (I/O wrapper)
 * @param {string} projectPath - Project root path
 * @param {Object} config - Config to save
 */
function saveConfig(projectPath, config) {
  const configPath = path.join(projectPath, '.tlc.json');
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content + '\n', 'utf-8');
}

module.exports = {
  getDefaultConfig,
  parseConfig,
  validateConfig,
  mergeWithDefaults,
  loadConfig,
  saveConfig,
};
