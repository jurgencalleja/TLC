/**
 * Log Streamer Module
 * Handles log formatting, filtering, and buffering for real-time streaming
 */

/**
 * Format a log entry for display
 * @param {Object} entry - Log entry
 * @param {Object} options - Formatting options
 * @returns {string} Formatted log line
 */
function formatLogEntry(entry, options = {}) {
  const { colors = false } = options;
  const parts = [];

  // Timestamp - use consistent 24-hour format (HH:MM:SS)
  if (entry.timestamp) {
    const date = new Date(entry.timestamp);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds}`;
    parts.push(`[${time}]`);
  }

  // Service name
  if (entry.service) {
    parts.push(`[${entry.service}]`);
  }

  // Log level
  if (entry.level) {
    const level = entry.level.toUpperCase();
    if (colors) {
      // ANSI color codes
      const colorCodes = {
        error: '\x1b[31m',   // red
        warn: '\x1b[33m',    // yellow
        info: '\x1b[36m',    // cyan
        debug: '\x1b[90m',   // gray
      };
      const reset = '\x1b[0m';
      const color = colorCodes[entry.level] || '';
      parts.push(`${color}${level}${reset}`);
    } else {
      parts.push(level);
    }
  }

  // Message
  parts.push(entry.message);

  return parts.join(' ');
}

/**
 * Filter logs by criteria
 * @param {Array} logs - Array of log entries
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered logs
 */
function filterLogs(logs, criteria = {}) {
  return logs.filter(log => {
    // Filter by service
    if (criteria.service && log.service !== criteria.service) {
      return false;
    }

    // Filter by level
    if (criteria.level && log.level !== criteria.level) {
      return false;
    }

    // Filter by search term
    if (criteria.search) {
      const term = criteria.search.toLowerCase();
      const message = (log.message || '').toLowerCase();
      if (!message.includes(term)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Aggregate logs from multiple services, sorted by timestamp
 * @param {Array<Array>} logArrays - Arrays of logs from different services
 * @returns {Array} Merged and sorted logs
 */
function aggregateLogs(logArrays) {
  const allLogs = logArrays.flat();

  // Sort by timestamp if available
  return allLogs.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Create a log buffer with max size and eviction
 * @param {Object} options - Buffer options
 * @returns {Object} Log buffer instance
 */
function createLogBuffer(options = {}) {
  const { maxSize = 1000 } = options;
  const logs = [];

  return {
    maxSize,
    logs,

    /**
     * Add entry to buffer, evicting oldest if full
     */
    add(entry) {
      logs.push({
        ...entry,
        _id: Date.now() + Math.random(),
      });

      while (logs.length > maxSize) {
        logs.shift();
      }
    },

    /**
     * Get recent entries
     * @param {number} count - Number of entries to return
     */
    getRecent(count) {
      return logs.slice(-count);
    },

    /**
     * Clear all entries
     */
    clear() {
      logs.length = 0;
    },

    /**
     * Get all entries for a service
     * @param {string} service - Service name
     */
    getByService(service) {
      return logs.filter(l => l.service === service);
    },
  };
}

module.exports = {
  formatLogEntry,
  filterLogs,
  aggregateLogs,
  createLogBuffer,
};
