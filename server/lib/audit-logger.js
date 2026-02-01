/**
 * Audit Logger - Main logger that combines storage, classification, and attribution
 *
 * Features:
 * - Creates complete audit entries with tool name, params, and result
 * - Automatically classifies actions using audit-classifier
 * - Automatically attributes actions using audit-attribution
 * - Adds timestamps in ISO 8601 format
 * - Sanitizes sensitive values from parameters
 * - Supports async batch writing for performance
 */

import { AuditStorage } from './audit-storage.js';
import { classifyAction, detectSensitive, getSeverity } from './audit-classifier.js';
import { getAttribution, identifySource, createSessionId } from './audit-attribution.js';

/**
 * Patterns for sensitive data that should be redacted
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  { pattern: /sk-[a-zA-Z0-9]+/g, replacement: '[REDACTED]' },
  { pattern: /ghp_[a-zA-Z0-9]+/g, replacement: '[REDACTED]' },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [REDACTED]' },

  // Key-value patterns
  { pattern: /password\s*[=:]\s*\S+/gi, replacement: 'password=[REDACTED]' },
  { pattern: /api[_-]?key\s*[=:]\s*\S+/gi, replacement: 'api_key=[REDACTED]' },
  { pattern: /secret\s*[=:]\s*\S+/gi, replacement: 'secret=[REDACTED]' },
  { pattern: /token\s*[=:]\s*\S+/gi, replacement: 'token=[REDACTED]' },

  // AWS
  { pattern: /AWS_SECRET[_A-Z]*\s*[=:]\s*\S+/gi, replacement: 'AWS_SECRET=[REDACTED]' },

  // Private keys
  { pattern: /PRIVATE[_-]?KEY\s*[=:]\s*\S+/gi, replacement: 'PRIVATE_KEY=[REDACTED]' },
];

/**
 * Keys that should always be redacted regardless of value
 */
const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'api-key',
  'private_key',
  'privatekey',
  'access_token',
  'refresh_token',
  'auth_token',
  'authorization',
  'credential',
  'credentials',
];

/**
 * Sanitize a string value by redacting sensitive patterns
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

/**
 * Check if a key name indicates sensitive data
 * @param {string} key - Key name to check
 * @returns {boolean} True if key is sensitive
 */
function isSensitiveKey(key) {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitiveKey) => lowerKey.includes(sensitiveKey));
}

/**
 * Sanitize parameters by removing sensitive values while preserving structure
 * @param {Object} params - Parameters to sanitize
 * @returns {Object} Sanitized parameters
 */
export function sanitizeParams(params) {
  if (params === null || params === undefined) {
    return params;
  }

  if (Array.isArray(params)) {
    return params.map((item) => sanitizeParams(item));
  }

  if (typeof params === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeParams(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  if (typeof params === 'string') {
    return sanitizeString(params);
  }

  return params;
}

/**
 * AuditLogger class for logging actions with classification and attribution
 */
export class AuditLogger {
  /**
   * Create an AuditLogger instance
   * @param {Object} options - Configuration options
   * @param {string} options.baseDir - Base directory for storage
   * @param {boolean} options.batchMode - Enable batch writing mode
   * @param {number} options.batchSize - Number of entries to batch before writing
   */
  constructor(options = {}) {
    const { baseDir, batchMode = false, batchSize = 10 } = options;

    this.storage = new AuditStorage(baseDir);
    this.batchMode = batchMode;
    this.batchSize = batchSize;
    this.pendingEntries = [];
    this.sessionId = createSessionId();
  }

  /**
   * Get the number of pending entries in batch mode
   * @returns {number} Number of pending entries
   */
  getPendingCount() {
    return this.pendingEntries.length;
  }

  /**
   * Log an action with full classification and attribution
   * @param {string} tool - Tool name (e.g., 'Read', 'Write', 'Bash')
   * @param {Object} params - Tool parameters
   * @param {Object} result - Tool result
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} The logged entry
   */
  async logAction(tool, params, result, context = {}) {
    const timestamp = new Date().toISOString();

    // Get classification
    const action = { tool, params };
    const classification = classifyAction(action);
    const severity = getSeverity(action);
    const sensitive = detectSensitive(action);

    // Get attribution
    const attribution = await getAttribution();
    const sourceType = identifySource({
      toolName: tool,
      ...context,
    });

    // Build the audit entry
    const entry = {
      timestamp,
      tool,
      params: sanitizeParams(params),
      result,
      classification,
      severity,
      sensitive,
      attribution,
      sourceType,
      sessionId: this.sessionId,
      context: {
        ...context,
      },
    };

    // Handle batch mode
    if (this.batchMode) {
      this.pendingEntries.push(entry);

      // Flush if batch size reached
      if (this.pendingEntries.length >= this.batchSize) {
        await this.flushBatch();
      }

      return entry;
    }

    // Write immediately
    await this.storage.appendEntry(entry);
    return entry;
  }

  /**
   * Flush all pending entries to storage
   * @returns {Promise<void>}
   */
  async flushBatch() {
    if (this.pendingEntries.length === 0) {
      return;
    }

    const entries = [...this.pendingEntries];
    this.pendingEntries = [];

    for (const entry of entries) {
      await this.storage.appendEntry(entry);
    }
  }

  /**
   * Get the current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }
}
