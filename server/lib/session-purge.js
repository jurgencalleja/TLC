/**
 * Session Purge Manager - Automatically purge data when sessions end
 *
 * Provides:
 * - Session-end detection and data purging
 * - Policy-based retention evaluation
 * - Process exit and timeout handling
 * - Audit logging for purge operations
 * - Graceful and forced shutdown support
 */

const { getPolicy, evaluateRetention } = require('./retention-policy.js');

/**
 * Session Purge Manager
 *
 * Manages automatic purging of session data based on session lifecycle events
 */
class SessionPurgeManager {
  /**
   * Create a session purge manager
   * @param {Object} options - Configuration options
   * @param {Object} options.storage - EphemeralStorage instance to manage
   * @param {string} [options.sessionId] - Current session ID
   * @param {boolean} [options.auditEnabled] - Enable audit logging
   * @param {Function} [options.onAuditLog] - Callback for audit log entries
   * @param {Object} [options.policies] - Custom retention policies
   */
  constructor(options = {}) {
    this.storage = options.storage;
    this.sessionId = options.sessionId || this._generateSessionId();
    this.auditEnabled = options.auditEnabled || false;
    this.onAuditLog = options.onAuditLog || null;
    this.policies = options.policies || null;

    // Track purge history
    this.purgeHistory = [];
    this.lastPurge = null;

    // Idle timer
    this.idleTimer = null;
    this.idleTimeout = null;
  }

  /**
   * Generate a unique session ID
   * @private
   */
  _generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an audit entry if audit is enabled
   * @private
   */
  _logAudit(entry) {
    if (this.auditEnabled && this.onAuditLog) {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...entry,
      };
      this.onAuditLog(auditEntry);
    }
  }

  /**
   * Get all keys from storage with their values
   * @private
   */
  _getAllEntries() {
    const entries = [];
    const keys = this.storage.keys();
    for (const key of keys) {
      const value = this.storage.get(key);
      entries.push({ key, value });
    }
    return entries;
  }

  /**
   * Handle session end - purge all session-specific data
   * @param {Object} [options] - Purge options
   * @param {boolean} [options.respectPolicies] - Evaluate retention policies before purging
   * @returns {Object} Purge result with count and keys
   */
  onSessionEnd(options = {}) {
    const purgedKeys = [];
    const entries = this._getAllEntries();

    for (const { key, value } of entries) {
      let shouldPurge = false;

      // Check if data belongs to this session
      if (value && typeof value === 'object' && value.sessionId === this.sessionId) {
        shouldPurge = true;
      }

      // If respecting policies, evaluate retention
      if (options.respectPolicies && value && typeof value === 'object') {
        const policyOptions = {
          sensitivityLevel: value.sensitivityLevel,
          dataType: value.dataType,
        };
        const policy = getPolicy(policyOptions, this.policies);
        const decision = evaluateRetention(value, policy, {
          currentSessionId: this.sessionId,
        });

        if (decision === 'purge') {
          shouldPurge = true;
        }
      }

      if (shouldPurge) {
        this.storage.delete(key);
        purgedKeys.push(key);
      }
    }

    // Record this purge
    const purgeRecord = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      purgedKeys,
      purgedCount: purgedKeys.length,
      trigger: 'sessionEnd',
    };
    this.purgeHistory.push(purgeRecord);
    this.lastPurge = purgeRecord;

    // Log audit
    this._logAudit({
      action: 'purge',
      trigger: 'sessionEnd',
      purgedCount: purgedKeys.length,
      keys: purgedKeys,
    });

    return {
      purgedKeys,
      purgedCount: purgedKeys.length,
    };
  }

  /**
   * Handle process exit - purge session data
   * @returns {Object} Purge result
   */
  onProcessExit() {
    const purgedKeys = [];
    const entries = this._getAllEntries();

    for (const { key, value } of entries) {
      // On process exit, purge session-specific data
      if (value && typeof value === 'object' && value.sessionId === this.sessionId) {
        this.storage.delete(key);
        purgedKeys.push(key);
      }
    }

    const purgeRecord = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      purgedKeys,
      purgedCount: purgedKeys.length,
      trigger: 'processExit',
    };
    this.purgeHistory.push(purgeRecord);
    this.lastPurge = purgeRecord;

    this._logAudit({
      action: 'purge',
      trigger: 'processExit',
      purgedCount: purgedKeys.length,
    });

    return {
      purgedKeys,
      purgedCount: purgedKeys.length,
    };
  }

  /**
   * Start idle timer - purge after inactivity
   * @param {number} timeout - Idle timeout in milliseconds
   */
  startIdleTimer(timeout) {
    this.idleTimeout = timeout;
    this._scheduleIdleTimer();
  }

  /**
   * Reset idle timer on activity
   */
  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this._scheduleIdleTimer();
    }
  }

  /**
   * Stop idle timer
   */
  stopIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Schedule the idle timer
   * @private
   */
  _scheduleIdleTimer() {
    if (this.idleTimeout) {
      this.idleTimer = setTimeout(() => {
        this._onTimeout();
      }, this.idleTimeout);
    }
  }

  /**
   * Handle idle timeout
   * @private
   */
  _onTimeout() {
    const purgedKeys = [];
    const entries = this._getAllEntries();

    for (const { key, value } of entries) {
      if (value && typeof value === 'object' && value.sessionId === this.sessionId) {
        this.storage.delete(key);
        purgedKeys.push(key);
      }
    }

    const purgeRecord = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      purgedKeys,
      purgedCount: purgedKeys.length,
      trigger: 'timeout',
    };
    this.purgeHistory.push(purgeRecord);
    this.lastPurge = purgeRecord;

    this._logAudit({
      action: 'purge',
      trigger: 'timeout',
      purgedCount: purgedKeys.length,
    });

    return {
      purgedKeys,
      purgedCount: purgedKeys.length,
    };
  }

  /**
   * Purge data matching specific policy criteria
   * @param {Object} criteria - Policy criteria to match
   * @param {string} [criteria.sensitivityLevel] - Sensitivity level to purge
   * @param {string} [criteria.dataType] - Data type to purge
   * @returns {Object} Purge result
   */
  purgeByPolicy(criteria = {}) {
    const purgedKeys = [];
    const entries = this._getAllEntries();

    for (const { key, value } of entries) {
      if (!value || typeof value !== 'object') continue;

      let shouldPurge = false;

      // Match by sensitivity level
      if (criteria.sensitivityLevel && value.sensitivityLevel === criteria.sensitivityLevel) {
        shouldPurge = true;
      }

      // Match by data type
      if (criteria.dataType && value.dataType === criteria.dataType) {
        shouldPurge = true;
      }

      if (shouldPurge) {
        this.storage.delete(key);
        purgedKeys.push(key);
      }
    }

    const purgeRecord = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      purgedKeys,
      purgedCount: purgedKeys.length,
      trigger: 'policy',
      criteria,
    };
    this.purgeHistory.push(purgeRecord);
    this.lastPurge = purgeRecord;

    this._logAudit({
      action: 'purge',
      trigger: 'policy',
      criteria,
      purgedCount: purgedKeys.length,
    });

    return {
      purgedKeys,
      purgedCount: purgedKeys.length,
    };
  }

  /**
   * Force purge all data immediately
   * @returns {Object} Purge result
   */
  forcePurge() {
    const keys = this.storage.keys();
    const purgedKeys = [...keys];
    const purgedCount = keys.length;

    this.storage.clear();

    const purgeRecord = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      purgedKeys,
      purgedCount,
      trigger: 'forced',
      forced: true,
    };
    this.purgeHistory.push(purgeRecord);
    this.lastPurge = purgeRecord;

    this._logAudit({
      action: 'purge',
      trigger: 'forced',
      purgedCount,
    });

    return {
      purgedKeys,
      purgedCount,
      forced: true,
    };
  }

  /**
   * Get report of what was purged
   * @returns {Object} Purge report
   */
  getPurgeReport() {
    const totalPurged = this.purgeHistory.reduce((sum, record) => sum + record.purgedCount, 0);

    if (!this.lastPurge) {
      return {
        purgedKeys: [],
        purgedCount: 0,
        timestamp: null,
        sessionId: this.sessionId,
        totalPurged: 0,
        history: [],
      };
    }

    return {
      purgedKeys: this.lastPurge.purgedKeys,
      purgedCount: this.lastPurge.purgedCount,
      timestamp: this.lastPurge.timestamp,
      sessionId: this.sessionId,
      totalPurged,
      history: this.purgeHistory,
    };
  }

  /**
   * Perform graceful shutdown with timeout
   * @param {Object} [options] - Shutdown options
   * @param {number} [options.timeout] - Timeout in milliseconds before force purge
   * @returns {Promise<Object>} Shutdown result
   */
  async gracefulShutdown(options = {}) {
    const timeout = options.timeout || 5000;

    return new Promise((resolve) => {
      let timedOut = false;

      // Set up timeout for force purge
      const timeoutId = setTimeout(() => {
        timedOut = true;
        const result = this.forcePurge();
        resolve({
          ...result,
          graceful: false,
          timedOut: true,
        });
      }, timeout);

      // Try graceful purge
      try {
        // Stop idle timer if running
        this.stopIdleTimer();

        // Purge session data
        const result = this.onSessionEnd({ respectPolicies: true });

        if (!timedOut) {
          clearTimeout(timeoutId);
          resolve({
            ...result,
            graceful: true,
            timedOut: false,
          });
        }
      } catch (error) {
        if (!timedOut) {
          clearTimeout(timeoutId);
          // On error, force purge
          const result = this.forcePurge();
          resolve({
            ...result,
            graceful: false,
            error: error.message,
          });
        }
      }
    });
  }

  /**
   * Register process exit handlers
   */
  registerProcessHandlers() {
    const exitHandler = () => this.onProcessExit();

    process.on('exit', exitHandler);
    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
  }
}

/**
 * Factory function to create a SessionPurgeManager
 * @param {Object} options - Configuration options
 * @returns {SessionPurgeManager} New instance
 */
function createPurgeManager(options = {}) {
  return new SessionPurgeManager(options);
}

module.exports = {
  SessionPurgeManager,
  createPurgeManager,
};
