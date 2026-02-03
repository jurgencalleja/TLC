/**
 * Deployment Audit Module
 *
 * Provides audit logging for deployment events with:
 * - Immutable event logging
 * - Checksum chain for integrity verification
 * - Query and export capabilities (JSON, CSV, CEF)
 */
import crypto from 'crypto';

/**
 * Audit event type constants
 */
export const AUDIT_EVENTS = {
  DEPLOYMENT_STARTED: 'deployment_started',
  DEPLOYMENT_COMPLETED: 'deployment_completed',
  DEPLOYMENT_FAILED: 'deployment_failed',
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_DENIED: 'approval_denied',
  ROLLBACK_TRIGGERED: 'rollback_triggered',
  ROLLBACK_COMPLETED: 'rollback_completed',
  SECURITY_GATE_PASSED: 'security_gate_passed',
  SECURITY_GATE_FAILED: 'security_gate_failed',
};

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate SHA-256 checksum of an entry
 * @param {object} entry - The entry to checksum
 * @param {string} [previousChecksum] - Previous entry's checksum
 * @returns {string} SHA-256 hex digest
 */
function calculateChecksum(entry, previousChecksum = '') {
  const data = JSON.stringify({
    id: entry.id,
    event: entry.event,
    deploymentId: entry.deploymentId,
    branch: entry.branch,
    user: entry.user,
    timestamp: entry.timestamp,
    metadata: entry.metadata,
    previousChecksum,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log a deployment event
 * @param {object} options - Event options
 * @param {string} options.event - Event type
 * @param {string} options.deploymentId - Deployment identifier
 * @param {string} options.branch - Branch name
 * @param {string} options.user - User who triggered the event
 * @param {object} [options.metadata] - Additional metadata
 * @param {string} [options.previousChecksum] - Previous entry's checksum
 * @param {function} [options.writeFn] - Function to write the entry
 * @returns {Promise<object>} The logged entry
 */
export async function logDeploymentEvent(options) {
  const {
    event,
    deploymentId,
    branch,
    user,
    metadata = {},
    previousChecksum = null,
    writeFn,
  } = options;

  const entry = {
    id: generateId(),
    event,
    deploymentId,
    branch,
    user,
    timestamp: new Date().toISOString(),
    metadata,
    previousChecksum,
  };

  entry.checksum = calculateChecksum(entry, previousChecksum);

  if (writeFn) {
    await writeFn(entry);
  }

  return entry;
}

/**
 * Query the audit log
 * @param {object} options - Query options
 * @param {string} [options.startDate] - Start date for range filter
 * @param {string} [options.endDate] - End date for range filter
 * @param {string} [options.user] - Filter by user
 * @param {string} [options.branch] - Filter by branch
 * @param {string} [options.event] - Filter by event type
 * @param {number} [options.limit] - Maximum entries to return
 * @param {number} [options.offset] - Offset for pagination
 * @param {function} options.queryFn - Function to fetch entries
 * @returns {Promise<object[]>} Matching entries
 */
export async function queryAuditLog(options) {
  const {
    startDate,
    endDate,
    user,
    branch,
    event,
    limit,
    offset = 0,
    queryFn,
  } = options;

  let entries = await queryFn();

  // Apply filters
  if (startDate || endDate) {
    entries = entries.filter((entry) => {
      const ts = new Date(entry.timestamp);
      if (startDate && ts < new Date(startDate)) return false;
      if (endDate && ts > new Date(endDate)) return false;
      return true;
    });
  }

  if (user) {
    entries = entries.filter((entry) => entry.user === user);
  }

  if (branch) {
    entries = entries.filter((entry) => entry.branch === branch);
  }

  if (event) {
    entries = entries.filter((entry) => entry.event === event);
  }

  // Apply pagination
  if (offset > 0) {
    entries = entries.slice(offset);
  }

  if (limit !== undefined) {
    entries = entries.slice(0, limit);
  }

  return entries;
}

/**
 * Export audit log in various formats
 * @param {object} options - Export options
 * @param {string} options.format - Export format (json, csv, cef)
 * @param {boolean} [options.includeMetadata] - Include export metadata
 * @param {function} options.queryFn - Function to fetch entries
 * @returns {Promise<string>} Exported data
 */
export async function exportAuditLog(options) {
  const { format, includeMetadata = false, queryFn, ...queryOptions } = options;

  const entries = await queryFn(queryOptions);

  switch (format) {
    case 'json':
      return exportAsJson(entries, includeMetadata);
    case 'csv':
      return exportAsCsv(entries);
    case 'cef':
      return exportAsCef(entries);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export entries as JSON
 * @param {object[]} entries - Entries to export
 * @param {boolean} includeMetadata - Include export metadata
 * @returns {string} JSON string
 */
function exportAsJson(entries, includeMetadata) {
  const result = {
    entries,
    exportedAt: new Date().toISOString(),
  };

  if (includeMetadata) {
    result.totalEntries = entries.length;
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Export entries as CSV
 * @param {object[]} entries - Entries to export
 * @returns {string} CSV string
 */
function exportAsCsv(entries) {
  const headers = ['id', 'event', 'branch', 'user', 'timestamp'];
  const lines = [headers.join(',')];

  for (const entry of entries) {
    const row = headers.map((h) => {
      const value = entry[h] || '';
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Export entries as CEF (Common Event Format) for SIEM integration
 * @param {object[]} entries - Entries to export
 * @returns {string} CEF formatted string
 */
function exportAsCef(entries) {
  const lines = [];

  for (const entry of entries) {
    // CEF format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
    const cefLine = [
      'CEF:0',
      'DeploymentAudit',
      'DeploymentAudit',
      '1.0',
      entry.event,
      entry.event,
      getSeverity(entry.event),
      `branch=${entry.branch} user=${entry.user} deploymentId=${entry.deploymentId || ''} timestamp=${entry.timestamp}`,
    ].join('|');
    lines.push(cefLine);
  }

  return lines.join('\n');
}

/**
 * Get severity level for CEF format based on event type
 * @param {string} event - Event type
 * @returns {number} Severity (0-10)
 */
function getSeverity(event) {
  const severityMap = {
    [AUDIT_EVENTS.DEPLOYMENT_STARTED]: 1,
    [AUDIT_EVENTS.DEPLOYMENT_COMPLETED]: 1,
    [AUDIT_EVENTS.DEPLOYMENT_FAILED]: 7,
    [AUDIT_EVENTS.APPROVAL_REQUESTED]: 3,
    [AUDIT_EVENTS.APPROVAL_GRANTED]: 1,
    [AUDIT_EVENTS.APPROVAL_DENIED]: 5,
    [AUDIT_EVENTS.ROLLBACK_TRIGGERED]: 6,
    [AUDIT_EVENTS.ROLLBACK_COMPLETED]: 3,
    [AUDIT_EVENTS.SECURITY_GATE_PASSED]: 1,
    [AUDIT_EVENTS.SECURITY_GATE_FAILED]: 8,
  };
  return severityMap[event] || 5;
}

/**
 * Create a deployment audit instance with storage
 * @param {object} [options] - Configuration options
 * @param {object} [options.storage] - Storage backend with read/write methods
 * @returns {object} Audit instance with log, query, export, verifyIntegrity methods
 */
export function createDeploymentAudit(options = {}) {
  const { storage } = options;

  // In-memory storage if none provided
  let entries = [];
  let lastChecksum = null;

  const internalStorage = {
    write: async (entry) => {
      entries.push(entry);
      return true;
    },
    read: async () => [...entries],
  };

  const activeStorage = storage || internalStorage;

  return {
    /**
     * Log a deployment event
     * @param {object} eventOptions - Event options
     * @returns {Promise<object>} The logged entry
     */
    async log(eventOptions) {
      const entry = await logDeploymentEvent({
        ...eventOptions,
        previousChecksum: lastChecksum,
        writeFn: activeStorage.write,
      });
      lastChecksum = entry.checksum;
      return entry;
    },

    /**
     * Query the audit log
     * @param {object} queryOptions - Query options
     * @returns {Promise<object[]>} Matching entries
     */
    async query(queryOptions = {}) {
      return queryAuditLog({
        ...queryOptions,
        queryFn: activeStorage.read,
      });
    },

    /**
     * Export the audit log
     * @param {object} exportOptions - Export options
     * @returns {Promise<string>} Exported data
     */
    async export(exportOptions) {
      return exportAuditLog({
        ...exportOptions,
        queryFn: activeStorage.read,
      });
    },

    /**
     * Verify the integrity of the audit log
     * @returns {Promise<object>} Integrity result with valid flag and tampered entries
     */
    async verifyIntegrity() {
      const allEntries = await activeStorage.read();
      const tamperedEntries = [];
      let prevChecksum = null;

      for (let i = 0; i < allEntries.length; i++) {
        const entry = allEntries[i];
        const expectedChecksum = calculateChecksum(entry, prevChecksum);

        if (entry.checksum !== expectedChecksum) {
          tamperedEntries.push({ index: i, entry });
        }

        prevChecksum = entry.checksum;
      }

      return {
        valid: tamperedEntries.length === 0,
        tamperedEntries,
      };
    },

    /**
     * Internal method for testing - tamper with an entry
     * @param {number} index - Entry index
     * @param {object} changes - Changes to apply
     */
    _tamperEntry(index, changes) {
      if (entries[index]) {
        Object.assign(entries[index], changes);
      }
    },
  };
}
