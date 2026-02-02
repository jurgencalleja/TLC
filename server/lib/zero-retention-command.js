/**
 * Zero-Retention Command - CLI command to manage zero-retention mode
 *
 * Features:
 * - Enable/disable zero-retention mode
 * - Show status and configuration
 * - Force immediate purge
 * - Update configuration settings
 */

import * as zeroRetention from './zero-retention.js';

const VALID_SUBCOMMANDS = ['enable', 'disable', 'status', 'purge', 'config'];

const VALID_CONFIG_KEYS = ['auditLogging'];

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
export function parseArgs(args) {
  const result = {
    subcommand: null,
    set: null,
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // First non-flag argument is the subcommand
    if (!arg.startsWith('--') && !result.subcommand) {
      result.subcommand = arg;
    } else if (arg === '--set') {
      result.set = args[i + 1];
      i++;
    } else if (arg.startsWith('--set=')) {
      result.set = arg.split('=').slice(1).join('=');
    } else if (arg === '--force') {
      result.force = true;
    }
  }

  return result;
}

/**
 * ZeroRetentionCommand class - handles tlc zero-retention command
 */
export class ZeroRetentionCommand {
  /**
   * Create a ZeroRetentionCommand instance
   * @param {Object} options - Configuration options
   * @param {Object} options.zeroRetention - ZeroRetention module (for testing)
   * @param {Object} options.purgeManager - Purge manager instance (for testing)
   */
  constructor(options = {}) {
    this.zeroRetention = options.zeroRetention || zeroRetention;
    this.purgeManager = options.purgeManager || null;
  }

  /**
   * Execute the zero-retention command
   * @param {string[]} args - Command arguments
   * @returns {Promise<Object>} Result { success, output, error? }
   */
  async execute(args) {
    const options = parseArgs(args);

    try {
      // No subcommand - show help
      if (!options.subcommand) {
        return this.showHelp();
      }

      // Unknown subcommand
      if (!VALID_SUBCOMMANDS.includes(options.subcommand)) {
        return {
          success: false,
          output: '',
          error: `Unknown subcommand: ${options.subcommand}. Valid subcommands: ${VALID_SUBCOMMANDS.join(', ')}`,
        };
      }

      // Handle subcommands
      switch (options.subcommand) {
        case 'enable':
          return this.handleEnable();
        case 'disable':
          return this.handleDisable();
        case 'status':
          return this.handleStatus();
        case 'purge':
          return this.handlePurge(options);
        case 'config':
          return this.handleConfig(options);
        default:
          return this.showHelp();
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Show help information
   * @returns {Object} Result
   */
  showHelp() {
    const lines = [
      'Usage: tlc zero-retention <subcommand> [options]',
      '',
      'Subcommands:',
      '  enable     Enable zero-retention mode',
      '  disable    Disable zero-retention mode',
      '  status     Show current status and policy summary',
      '  purge      Force immediate purge of all session data',
      '  config     Show or update configuration',
      '',
      'Options:',
      '  --set <key=value>  Update configuration (use with config)',
      '  --force            Force action without confirmation',
      '',
      'Examples:',
      '  tlc zero-retention enable',
      '  tlc zero-retention status',
      '  tlc zero-retention config --set auditLogging=true',
    ];

    return {
      success: true,
      output: lines.join('\n'),
    };
  }

  /**
   * Handle enable subcommand
   * @returns {Object} Result
   */
  handleEnable() {
    const result = this.zeroRetention.enable();

    if (result.success) {
      const lines = [
        'Zero-retention mode enabled.',
        '',
        'Subsystems configured:',
      ];

      if (result.subsystems) {
        for (const [key, value] of Object.entries(result.subsystems)) {
          lines.push(`  - ${key}: ${value ? 'active' : 'inactive'}`);
        }
      }

      lines.push('');
      lines.push('All data will be purged at session end.');

      return {
        success: true,
        output: lines.join('\n'),
      };
    }

    return {
      success: false,
      output: '',
      error: 'Failed to enable zero-retention mode',
    };
  }

  /**
   * Handle disable subcommand
   * @returns {Object} Result
   */
  handleDisable() {
    const result = this.zeroRetention.disable();

    if (result.success) {
      return {
        success: true,
        output: 'Zero-retention mode disabled.\n\nNormal retention policies now apply.',
      };
    }

    return {
      success: false,
      output: '',
      error: 'Failed to disable zero-retention mode',
    };
  }

  /**
   * Handle status subcommand
   * @returns {Object} Result
   */
  handleStatus() {
    const enabled = this.zeroRetention.isEnabled();
    const config = this.zeroRetention.getConfig();
    const validation = this.zeroRetention.validate();

    const status = {
      enabled,
      config,
      subsystems: config.ephemeralStorage
        ? {
            ephemeralStorage: true,
            sessionPurge: true,
            memoryExclusion: true,
          }
        : {},
      validation,
    };

    return {
      success: true,
      output: this.formatStatus(status),
    };
  }

  /**
   * Handle purge subcommand
   * @param {Object} options - Parsed options
   * @returns {Object} Result
   */
  handlePurge(options) {
    // Check if enabled
    if (!this.zeroRetention.isEnabled()) {
      return {
        success: false,
        output: '',
        error: 'Zero-retention mode is not enabled. Enable it first with: tlc zero-retention enable',
      };
    }

    // Perform purge
    if (this.purgeManager) {
      const result = this.purgeManager.forcePurge();

      const lines = [
        'Forced purge completed.',
        '',
        `Purged ${result.purgedCount} items.`,
      ];

      if (result.purgedKeys && result.purgedKeys.length > 0 && result.purgedKeys.length <= 10) {
        lines.push('');
        lines.push('Purged keys:');
        for (const key of result.purgedKeys) {
          lines.push(`  - ${key}`);
        }
      }

      return {
        success: true,
        output: lines.join('\n'),
      };
    }

    return {
      success: true,
      output: 'Forced purge initiated. All session data will be cleared.',
    };
  }

  /**
   * Handle config subcommand
   * @param {Object} options - Parsed options
   * @returns {Object} Result
   */
  handleConfig(options) {
    // Handle --set flag
    if (options.set) {
      return this.handleConfigSet(options.set);
    }

    // Show current configuration
    const config = this.zeroRetention.getConfig();

    return {
      success: true,
      output: this.formatConfig(config),
    };
  }

  /**
   * Handle config --set
   * @param {string} setValue - The key=value string
   * @returns {Object} Result
   */
  handleConfigSet(setValue) {
    // Parse key=value
    const eqIndex = setValue.indexOf('=');
    if (eqIndex === -1) {
      return {
        success: false,
        output: '',
        error: `Invalid format: ${setValue}. Use key=value format.`,
      };
    }

    const key = setValue.substring(0, eqIndex);
    const value = setValue.substring(eqIndex + 1);

    // Validate key
    if (!VALID_CONFIG_KEYS.includes(key)) {
      return {
        success: false,
        output: '',
        error: `Invalid configuration key: ${key}. Valid keys: ${VALID_CONFIG_KEYS.join(', ')}`,
      };
    }

    // Parse value
    let parsedValue;
    if (value === 'true') {
      parsedValue = true;
    } else if (value === 'false') {
      parsedValue = false;
    } else {
      parsedValue = value;
    }

    // Re-enable with new config
    const configUpdate = { [key]: parsedValue };
    const result = this.zeroRetention.enable(configUpdate);

    if (result.success) {
      return {
        success: true,
        output: `Configuration updated: ${key} = ${parsedValue}`,
      };
    }

    return {
      success: false,
      output: '',
      error: 'Failed to update configuration',
    };
  }

  /**
   * Format status for display
   * @param {Object} status - Status object
   * @returns {string} Formatted output
   */
  formatStatus(status) {
    const lines = [];

    lines.push('Zero-Retention Mode Status');
    lines.push('='.repeat(40));
    lines.push('');
    lines.push(`Status: ${status.enabled ? 'ENABLED' : 'DISABLED'}`);

    if (status.enabled && status.subsystems) {
      lines.push('');
      lines.push('Subsystems:');
      for (const [key, value] of Object.entries(status.subsystems)) {
        lines.push(`  - ${key}: ${value ? 'active' : 'inactive'}`);
      }
    }

    if (status.enabled && status.config && status.config.retentionPolicy) {
      lines.push('');
      lines.push('Policy:');
      lines.push(`  - Retention: ${status.config.retentionPolicy.retention}`);
      lines.push(`  - Persist: ${status.config.retentionPolicy.persist}`);
    }

    // Show validation results
    if (status.validation) {
      if (status.validation.conflicts && status.validation.conflicts.length > 0) {
        lines.push('');
        lines.push('Conflicts:');
        for (const conflict of status.validation.conflicts) {
          lines.push(`  - Conflict: ${conflict}`);
        }
      }

      if (status.validation.warnings && status.validation.warnings.length > 0) {
        lines.push('');
        lines.push('Warnings:');
        for (const warning of status.validation.warnings) {
          lines.push(`  - Warning: ${warning}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format configuration for display
   * @param {Object} config - Configuration object
   * @returns {string} Formatted output
   */
  formatConfig(config) {
    const lines = [];

    lines.push('Zero-Retention Configuration');
    lines.push('='.repeat(40));
    lines.push('');
    lines.push(`Enabled: ${config.enabled}`);

    if (!config.enabled) {
      lines.push('');
      lines.push('Mode is not configured. Enable with: tlc zero-retention enable');
      return lines.join('\n');
    }

    // Format each subsystem config
    const subsystems = ['ephemeralStorage', 'sessionPurge', 'memoryExclusion', 'retentionPolicy'];

    for (const subsystem of subsystems) {
      lines.push('');
      lines.push(`${subsystem}:`);

      if (config[subsystem]) {
        for (const [key, value] of Object.entries(config[subsystem])) {
          lines.push(`  ${key}: ${JSON.stringify(value)}`);
        }
      } else {
        lines.push('  (not configured)');
      }
    }

    return lines.join('\n');
  }
}

export default {
  ZeroRetentionCommand,
  parseArgs,
};
