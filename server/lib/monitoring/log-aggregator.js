/**
 * Log Aggregator
 * Collects and aggregates logs from multiple sources
 */

/**
 * Log level constants
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Structures a log entry as JSON with timestamp
 * @param {Object} entry - Log entry with message and level
 * @returns {Object} Structured log entry
 */
export function structureLog(entry) {
  return {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  };
}

/**
 * Filters sensitive data from log entries
 * @param {Object} log - Log entry to filter
 * @returns {Object} Filtered log entry
 */
export function filterSensitiveData(log) {
  const sensitivePatterns = [
    /password\s*[=:]\s*\S+/gi,
    /api_key\s*[=:]\s*\S+/gi,
    /secret\s*[=:]\s*\S+/gi,
    /token\s*[=:]\s*\S+/gi,
    /authorization\s*[=:]\s*\S+/gi,
  ];

  let filteredMessage = log.message;
  for (const pattern of sensitivePatterns) {
    filteredMessage = filteredMessage.replace(pattern, (match) => {
      const [key] = match.split(/[=:]/);
      return `${key}=[REDACTED]`;
    });
  }

  return {
    ...log,
    message: filteredMessage,
  };
}

/**
 * Aggregates logs from multiple sources
 * @param {Array} sources - Array of log sources with logs
 * @returns {Array} Aggregated logs
 */
export function aggregateLogs(sources) {
  const aggregated = [];
  for (const source of sources) {
    for (const log of source.logs) {
      aggregated.push({
        ...log,
        source: source.source,
      });
    }
  }
  return aggregated;
}

/**
 * Determines if logs should be rotated
 * @param {Object} options - Rotation options
 * @param {number} options.maxSize - Maximum size in bytes
 * @param {number} options.currentSize - Current size in bytes
 * @param {number} options.maxAge - Maximum age in milliseconds
 * @param {number} options.age - Current age in milliseconds
 * @returns {Object} Rotation result
 */
export function rotateLogs(options) {
  const { maxSize, currentSize, maxAge, age } = options;

  const shouldRotateBySize = maxSize && currentSize && currentSize > maxSize;
  const shouldRotateByAge = maxAge && age && age > maxAge;

  return {
    rotated: shouldRotateBySize || shouldRotateByAge,
    reason: shouldRotateBySize ? 'size' : shouldRotateByAge ? 'age' : null,
  };
}

/**
 * Exports logs to specified format
 * @param {Array} logs - Logs to export
 * @param {string} format - Output format (json or ndjson)
 * @returns {string} Exported logs
 */
export function exportLogs(logs, format) {
  if (format === 'ndjson') {
    return logs.map(log => JSON.stringify(log)).join('\n');
  }
  return JSON.stringify(logs);
}

/**
 * Creates a log aggregator instance
 * @returns {Object} Log aggregator with methods
 */
export function createLogAggregator() {
  const sources = [];
  const logs = [];

  return {
    /**
     * Adds a log source
     * @param {Object} source - Source configuration
     */
    addSource(source) {
      sources.push(source);
    },

    /**
     * Collects logs from all sources
     * @returns {Array} Collected logs
     */
    collect() {
      const collected = aggregateLogs(sources.map(s => ({
        source: s.name,
        logs: s.getLogs ? s.getLogs() : [],
      })));
      logs.push(...collected);
      return collected;
    },

    /**
     * Exports all collected logs
     * @param {string} format - Export format
     * @returns {string} Exported logs
     */
    export(format = 'json') {
      return exportLogs(logs, format);
    },
  };
}
