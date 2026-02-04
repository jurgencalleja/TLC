/**
 * Quality Gate Command Module
 *
 * CLI for quality gate management
 */

const { getPreset, listPresets, applyPreset: applyPresetToConfig } = require('./quality-presets.js');
const { evaluate } = require('./quality-evaluator.js');
const { calculateTrend } = require('./quality-history.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = input.trim().split(/\s+/);
  const result = {
    command: parts[0] || 'status',
  };

  let i = 1;

  // Handle subcommand or positional arg
  if (parts[1] && !parts[1].startsWith('--')) {
    if (result.command === 'preset') {
      result.presetName = parts[1];
      i = 2;
    } else if (result.command === 'evaluate') {
      result.file = parts[1];
      i = 2;
    }
  }

  // Parse flags
  while (i < parts.length) {
    const part = parts[i];

    if (part === '--threshold' && parts[i + 1]) {
      result.threshold = parseInt(parts[i + 1], 10);
      i += 2;
    } else if (part === '--dimension' && parts[i + 1]) {
      result.dimension = parts[i + 1];
      i += 2;
    } else if (part === '--operation' && parts[i + 1]) {
      result.operation = parts[i + 1];
      i += 2;
    } else if (part === '--limit' && parts[i + 1]) {
      result.limit = parseInt(parts[i + 1], 10);
      i += 2;
    } else if (part === '--show') {
      result.show = true;
      i++;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Format output for display
 * @param {Object} data - Data to format
 * @param {Object} options - Format options
 * @returns {string} Formatted output
 */
function formatOutput(data, options = {}) {
  const lines = [];

  if (data.thresholds) {
    lines.push('Quality Gate Configuration');
    lines.push('═'.repeat(40));
    lines.push(`Default threshold: ${data.thresholds.default}`);

    if (data.thresholds.dimensions) {
      lines.push('\nDimension thresholds:');
      for (const [dim, val] of Object.entries(data.thresholds.dimensions)) {
        lines.push(`  ${dim}: ${val}`);
      }
    }
  }

  if (data.preset) {
    lines.push(`\nActive preset: ${data.preset}`);
  }

  if (data.scores) {
    lines.push('\nScores:');
    for (const [dim, score] of Object.entries(data.scores)) {
      const status = data.failed?.includes(dim) ? '✗ FAIL' : '✓';
      lines.push(`  ${dim}: ${score} ${status}`);
    }
  }

  if (data.pass !== undefined) {
    lines.push(`\nOverall: ${data.pass ? '✓ PASS' : '✗ FAIL'}`);
  }

  if (data.history) {
    lines.push('\nRecent History:');
    for (const record of data.history) {
      const date = new Date(record.timestamp).toLocaleDateString();
      lines.push(`  ${date}: ${record.composite}`);
    }
  }

  if (data.trend) {
    const arrow = data.trend.direction === 'improving' ? '↑' : data.trend.direction === 'declining' ? '↓' : '→';
    lines.push(`\nTrend: ${arrow} ${data.trend.direction}`);
  }

  if (data.presets) {
    lines.push('\nAvailable Presets:');
    for (const preset of data.presets) {
      lines.push(`  ${preset.name}: ${preset.description || ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Quality Gate Command class
 */
class QualityGateCommand {
  constructor() {
    this._readFile = async () => '';
    this._writeFile = async () => {};
    this._loadConfig = async () => ({ default: 70 });
    this._saveConfig = async () => {};
    this._getHistory = async () => [];
    this._scorer = null;
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Promise<Object>} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'status':
        return this.executeStatus(args);

      case 'configure':
        return this.executeConfigure(args);

      case 'preset':
        return this.executePreset(args);

      case 'history':
        return this.executeHistory(args);

      case 'evaluate':
        return this.executeEvaluate(args);

      default:
        return {
          success: false,
          error: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute status command
   */
  async executeStatus(args) {
    const config = await this._loadConfig();

    const result = {
      success: true,
      thresholds: {
        default: config.default,
        dimensions: config.dimensions,
      },
      preset: config.appliedPreset,
      dimensions: config.dimensions,
    };

    result.output = formatOutput(result);
    return result;
  }

  /**
   * Execute configure command
   */
  async executeConfigure(args) {
    const { threshold, dimension, operation } = args;

    // Validate threshold
    if (threshold !== undefined && (threshold < 0 || threshold > 100)) {
      return {
        success: false,
        error: 'Invalid threshold: must be in range 0-100',
      };
    }

    const config = await this._loadConfig();

    if (dimension) {
      if (!config.dimensions) {
        config.dimensions = {};
      }
      config.dimensions[dimension] = threshold;
    } else if (operation) {
      if (!config.operations) {
        config.operations = {};
      }
      config.operations[operation] = threshold;
    } else {
      config.default = threshold;
    }

    await this._saveConfig(config);

    return {
      success: true,
      config,
      output: formatOutput({ thresholds: config }),
    };
  }

  /**
   * Execute preset command
   */
  async executePreset(args) {
    const { presetName, show } = args;

    // List presets if no name given
    if (!presetName) {
      const presets = listPresets();
      return {
        success: true,
        presets,
        output: formatOutput({ presets }),
      };
    }

    // Get preset
    const preset = getPreset(presetName);
    if (!preset) {
      return {
        success: false,
        error: `Unknown preset: ${presetName}`,
      };
    }

    // Just show details
    if (show) {
      return {
        success: true,
        details: preset,
        output: formatOutput({ thresholds: preset.thresholds, preset: presetName }),
      };
    }

    // Apply preset
    const config = await this._loadConfig();
    const updated = applyPresetToConfig(config, presetName);
    await this._saveConfig(updated);

    return {
      success: true,
      preset: presetName,
      config: updated,
      output: `Applied preset: ${presetName}`,
    };
  }

  /**
   * Execute history command
   */
  async executeHistory(args) {
    const { limit, operation } = args;

    const options = {};
    if (limit) options.limit = limit;
    if (operation) options.operation = operation;

    const history = await this._getHistory(options);
    const trend = calculateTrend({ records: history });

    return {
      success: true,
      history,
      trend,
      output: formatOutput({ history, trend }),
    };
  }

  /**
   * Execute evaluate command
   */
  async executeEvaluate(args) {
    const { file, threshold } = args;

    try {
      const code = await this._readFile(file);
      const config = await this._loadConfig();

      // Override threshold if specified
      if (threshold !== undefined) {
        config.default = threshold;
      }

      const result = await evaluate(code, {
        thresholds: config,
        scorer: this._scorer,
      });

      return {
        success: true,
        pass: result.pass,
        scores: result.scores,
        composite: result.composite,
        failed: result.failed,
        output: formatOutput({
          scores: result.scores,
          pass: result.pass,
          failed: result.failed,
        }),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = {
  QualityGateCommand,
  parseArgs,
  formatOutput,
};
