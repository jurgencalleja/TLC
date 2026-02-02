/**
 * Zero-Retention Mode
 *
 * Master switch that configures all subsystems for zero-data-retention.
 * When enabled, ensures no sensitive data persists beyond the current session.
 *
 * Integrates with:
 * - sensitive-detector.js - Detects sensitive data types
 * - retention-policy.js - Configures immediate purge policies
 * - ephemeral-storage.js - In-memory only storage
 * - session-purge.js - Automatic session end purging
 * - memory-exclusion.js - Excludes all files from memory
 */

import { detectSensitive, getSensitivityLevel } from './sensitive-detector.js';
import {
  getPolicy,
  evaluateRetention,
  loadPolicies,
} from './retention-policy.js';
import { EphemeralStorage } from './ephemeral-storage.js';
import { SessionPurgeManager, createPurgeManager } from './session-purge.js';
import { shouldExclude, loadPatterns } from './memory-exclusion.js';

/**
 * Zero-Retention Mode Class
 *
 * Provides a master switch to configure all subsystems for zero data retention.
 */
export class ZeroRetentionMode {
  constructor(options = {}) {
    this._enabled = false;
    this._config = null;
    this._options = options;
    this._subsystems = {
      ephemeralStorage: null,
      sessionPurge: null,
      memoryExclusion: null,
    };
  }

  /**
   * Enable zero-retention mode
   * Configures all subsystems for immediate data purging and no persistence.
   *
   * @param {Object} options - Configuration options
   * @param {boolean} options.auditLogging - Enable audit logging (conflicts with zero-retention)
   * @returns {Object} Result with success status and configuration
   */
  enable(options = {}) {
    const enableOptions = { ...this._options, ...options };

    // Configure ephemeral storage - memory only, encrypted
    const ephemeralStorageConfig = {
      encrypt: true,
      registerExitHandler: true,
      basePath: null, // No disk persistence
    };

    // Configure session purge - aggressive purging
    const sessionPurgeConfig = {
      aggressive: true,
      purgeOnSessionEnd: true,
      purgeOnTimeout: true,
      idleTimeout: 5 * 60 * 1000, // 5 minutes
    };

    // Configure memory exclusion - exclude everything
    const memoryExclusionConfig = {
      excludeAll: true,
      mode: 'blacklist',
      filePatterns: ['*'],
      contentPatterns: ['*'],
    };

    // Configure retention policy - immediate purge, no persistence
    const retentionPolicyConfig = {
      retention: 'immediate',
      persist: false,
    };

    // Store subsystem configurations
    this._subsystems = {
      ephemeralStorage: true,
      sessionPurge: true,
      memoryExclusion: true,
    };

    // Build full configuration
    this._config = {
      enabled: true,
      ephemeralStorage: ephemeralStorageConfig,
      sessionPurge: sessionPurgeConfig,
      memoryExclusion: memoryExclusionConfig,
      retentionPolicy: retentionPolicyConfig,
      auditLogging: enableOptions.auditLogging || false,
    };

    this._enabled = true;

    return {
      success: true,
      enabled: true,
      subsystems: { ...this._subsystems },
      config: { ...this._config },
    };
  }

  /**
   * Disable zero-retention mode
   * Returns all subsystems to normal operation.
   *
   * @returns {Object} Result with success status
   */
  disable() {
    this._enabled = false;
    this._config = {
      enabled: false,
      ephemeralStorage: null,
      sessionPurge: null,
      memoryExclusion: null,
      retentionPolicy: null,
    };
    this._subsystems = {
      ephemeralStorage: null,
      sessionPurge: null,
      memoryExclusion: null,
    };

    return {
      success: true,
      enabled: false,
    };
  }

  /**
   * Check if zero-retention mode is enabled
   *
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Get the current configuration
   *
   * @returns {Object} Current configuration
   */
  getConfig() {
    if (!this._enabled) {
      return {
        enabled: false,
        ephemeralStorage: null,
        sessionPurge: null,
        memoryExclusion: null,
        retentionPolicy: null,
      };
    }

    return { ...this._config };
  }

  /**
   * Validate the current configuration for conflicts
   *
   * @returns {Object} Validation result with conflicts and warnings
   */
  validate() {
    const conflicts = [];
    const warnings = [];

    // Check for audit logging conflict
    if (this._config && this._config.auditLogging) {
      warnings.push(
        'Audit logging is enabled but conflicts with zero-retention mode. ' +
          'Audit logs may retain sensitive data references.'
      );
    }

    // Check for persistence conflicts
    if (this._enabled && this._config) {
      // Ephemeral storage should not persist
      if (
        this._config.ephemeralStorage &&
        this._config.ephemeralStorage.basePath
      ) {
        conflicts.push(
          'Ephemeral storage has basePath set, which may enable disk persistence.'
        );
      }

      // Retention policy should be immediate
      if (
        this._config.retentionPolicy &&
        this._config.retentionPolicy.retention !== 'immediate'
      ) {
        conflicts.push(
          'Retention policy is not set to immediate in zero-retention mode.'
        );
      }

      // Retention policy should not persist
      if (
        this._config.retentionPolicy &&
        this._config.retentionPolicy.persist === true
      ) {
        conflicts.push('Retention policy has persist enabled in zero-retention mode.');
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings,
    };
  }

  /**
   * Create configured subsystem instances
   * Returns ready-to-use instances of all subsystems configured for zero-retention.
   *
   * @returns {Object} Configured subsystem instances
   */
  createSubsystems() {
    if (!this._enabled) {
      throw new Error('Zero-retention mode must be enabled before creating subsystems');
    }

    const ephemeralStorage = new EphemeralStorage(this._config.ephemeralStorage);

    const sessionPurge = createPurgeManager({
      storage: ephemeralStorage,
      auditEnabled: false, // Audit logging disabled in zero-retention
      policies: {
        sensitivityLevels: {
          critical: { retention: 'immediate', persist: false },
          high: { retention: 'immediate', persist: false },
          medium: { retention: 'immediate', persist: false },
          low: { retention: 'immediate', persist: false },
        },
        dataTypes: {
          secrets: { retention: 'immediate', persist: false },
          pii: { retention: 'immediate', persist: false },
          general: { retention: 'immediate', persist: false },
        },
        default: { retention: 'immediate', persist: false },
      },
    });

    return {
      ephemeralStorage,
      sessionPurge,
      config: this._config,
    };
  }
}

// Global singleton instance
let globalInstance = new ZeroRetentionMode();

/**
 * Enable zero-retention mode globally
 *
 * @param {Object} options - Configuration options
 * @returns {Object} Result with success status
 */
export function enable(options = {}) {
  return globalInstance.enable(options);
}

/**
 * Disable zero-retention mode globally
 *
 * @returns {Object} Result with success status
 */
export function disable() {
  return globalInstance.disable();
}

/**
 * Check if zero-retention mode is enabled globally
 *
 * @returns {boolean} True if enabled
 */
export function isEnabled() {
  return globalInstance.isEnabled();
}

/**
 * Get the current global configuration
 *
 * @returns {Object} Current configuration
 */
export function getConfig() {
  return globalInstance.getConfig();
}

/**
 * Validate the current global configuration
 *
 * @returns {Object} Validation result
 */
export function validate() {
  return globalInstance.validate();
}

/**
 * Reset the global instance (for testing)
 */
export function _resetGlobalInstance() {
  globalInstance = new ZeroRetentionMode();
}

export default {
  ZeroRetentionMode,
  enable,
  disable,
  isEnabled,
  getConfig,
  validate,
};
