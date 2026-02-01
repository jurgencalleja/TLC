/**
 * Audit Log SIEM Exporter
 *
 * Exports audit logs to various SIEM-compatible formats:
 * - JSON (default)
 * - CSV
 * - Splunk HEC (HTTP Event Collector)
 * - CEF (Common Event Format)
 *
 * Supports incremental export with position tracking.
 */

import fs from 'fs';
import path from 'path';
import { AuditQuery } from './audit-query.js';

const EXPORT_STATE_FILE = '.tlc/audit/export-state.json';

/**
 * CEF severity mapping
 * CEF uses 0-10 scale:
 * - info: 0-3
 * - warning: 4-6
 * - critical: 7-10
 */
const CEF_SEVERITY_MAP = {
  info: 1,
  warning: 5,
  critical: 8,
};

/**
 * CSV column headers
 */
const CSV_HEADERS = [
  'timestamp',
  'tool',
  'classification',
  'severity',
  'user',
  'source',
  'sessionId',
  'params',
  'checksum',
];

/**
 * Escape a value for CEF header field (pipe, backslash)
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCEFHeader(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|');
}

/**
 * Escape a value for CEF extension field (equals, backslash, newlines)
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCEFExtension(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/=/g, '\\=')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Escape a value for CSV
 * @param {string} value - Value to escape
 * @returns {string} Escaped and possibly quoted value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * AuditExporter class for exporting audit logs to SIEM formats
 */
export class AuditExporter {
  /**
   * Create an AuditExporter instance
   * @param {string} baseDir - Base directory for audit storage
   * @param {Object} options - Configuration options
   * @param {string} options.host - Host name for Splunk HEC
   * @param {string} options.splunkIndex - Splunk index name
   */
  constructor(baseDir = process.cwd(), options = {}) {
    this.baseDir = baseDir;
    this.options = options;
    this.auditQuery = new AuditQuery(baseDir);
    this.stateFile = path.join(baseDir, EXPORT_STATE_FILE);
    this.lastExportChecksum = this._loadExportState();
  }

  /**
   * Load the last export state from file
   * @returns {string|null} Last exported checksum or null
   * @private
   */
  _loadExportState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        return state.lastChecksum || null;
      }
    } catch {
      // Ignore errors, return null
    }
    return null;
  }

  /**
   * Save the export state to file
   * @param {string} checksum - Last exported checksum
   * @private
   */
  _saveExportState(checksum) {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      this.stateFile,
      JSON.stringify({ lastChecksum: checksum, updatedAt: new Date().toISOString() }),
      'utf-8'
    );
  }

  /**
   * Get the last export position (checksum)
   * @returns {string|null} Last exported checksum
   */
  getLastExportPosition() {
    return this.lastExportChecksum;
  }

  /**
   * Reset the export position
   */
  resetExportPosition() {
    this.lastExportChecksum = null;
    if (fs.existsSync(this.stateFile)) {
      fs.unlinkSync(this.stateFile);
    }
  }

  /**
   * Query entries with optional filtering
   * @param {Object} options - Query options
   * @param {Date} options.from - Start date
   * @param {Date} options.to - End date
   * @param {boolean} options.incremental - Use incremental mode
   * @returns {Promise<Object[]>} Array of entries
   * @private
   */
  async _queryEntries(options = {}) {
    const { from, to, incremental } = options;

    const queryOptions = {};
    if (from) queryOptions.from = from;
    if (to) queryOptions.to = to;

    if (incremental && this.lastExportChecksum) {
      queryOptions.afterChecksum = this.lastExportChecksum;
    }

    const entries = await this.auditQuery.query(queryOptions);

    // Update last position if incremental
    if (incremental && entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      this.lastExportChecksum = lastEntry.checksum;
      this._saveExportState(this.lastExportChecksum);
    }

    return entries;
  }

  /**
   * Export audit logs to JSON format
   * @param {Object} options - Export options
   * @returns {Promise<string>} JSON string
   */
  async exportJSON(options = {}) {
    const entries = await this._queryEntries(options);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Export audit logs to CSV format
   * @param {Object} options - Export options
   * @returns {Promise<string>} CSV string
   */
  async exportCSV(options = {}) {
    const entries = await this._queryEntries(options);

    const lines = [CSV_HEADERS.join(',')];

    for (const entry of entries) {
      const row = [
        escapeCSV(entry.timestamp),
        escapeCSV(entry.tool),
        escapeCSV(entry.classification),
        escapeCSV(entry.severity),
        escapeCSV(entry.attribution?.user || ''),
        escapeCSV(entry.attribution?.source || ''),
        escapeCSV(entry.sessionId),
        escapeCSV(JSON.stringify(entry.params)),
        escapeCSV(entry.checksum),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Export audit logs to Splunk HEC format
   * @param {Object} options - Export options
   * @returns {Promise<string>} Newline-delimited JSON events
   */
  async exportSplunk(options = {}) {
    const entries = await this._queryEntries(options);

    const lines = entries.map((entry) => {
      const formatted = this.formatForSplunk(entry);
      return JSON.stringify(formatted);
    });

    return lines.join('\n');
  }

  /**
   * Export audit logs to CEF format
   * @param {Object} options - Export options
   * @returns {Promise<string>} CEF-formatted lines
   */
  async exportCEF(options = {}) {
    const entries = await this._queryEntries(options);

    const lines = entries.map((entry) => this.formatForCEF(entry));

    return lines.join('\n');
  }

  /**
   * Format a single entry for Splunk HEC
   * @param {Object} entry - Audit entry
   * @returns {Object} Splunk HEC event object
   */
  formatForSplunk(entry) {
    const event = {
      time: new Date(entry.timestamp).getTime() / 1000,
      source: 'tlc',
      sourcetype: 'tlc:audit',
      event: {
        tool: entry.tool,
        params: entry.params,
        classification: entry.classification,
        severity: entry.severity,
        attribution: entry.attribution,
        sessionId: entry.sessionId,
        checksum: entry.checksum,
      },
    };

    if (this.options.host) {
      event.host = this.options.host;
    }

    if (this.options.splunkIndex) {
      event.index = this.options.splunkIndex;
    }

    return event;
  }

  /**
   * Format a single entry to CEF (Common Event Format)
   * CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
   * @param {Object} entry - Audit entry
   * @returns {string} CEF-formatted string
   */
  formatForCEF(entry) {
    const version = '0';
    const deviceVendor = 'TLC';
    const deviceProduct = 'AuditLogger';
    const deviceVersion = '1.0';
    const signatureId = entry.classification || 'unknown';
    const name = escapeCEFHeader(entry.tool);
    const severity = CEF_SEVERITY_MAP[entry.severity] || 1;

    // Build extension key-value pairs
    const extensions = [];

    // rt = receipt time (epoch milliseconds)
    extensions.push(`rt=${new Date(entry.timestamp).getTime()}`);

    // src or suser for attribution
    if (entry.attribution?.user) {
      extensions.push(`suser=${escapeCEFExtension(entry.attribution.user)}`);
    }
    if (entry.attribution?.source) {
      extensions.push(`src=${escapeCEFExtension(entry.attribution.source)}`);
    }

    // cs1 = custom string 1 for session ID
    if (entry.sessionId) {
      extensions.push(`cs1=${escapeCEFExtension(entry.sessionId)}`);
      extensions.push(`cs1Label=sessionId`);
    }

    // fname for file path if present
    if (entry.params?.file_path) {
      extensions.push(`fname=${escapeCEFExtension(entry.params.file_path)}`);
    }

    // msg for additional info
    if (entry.params?.command) {
      extensions.push(`msg=${escapeCEFExtension(entry.params.command)}`);
    }

    const extension = extensions.join(' ');

    return `CEF:${version}|${escapeCEFHeader(deviceVendor)}|${escapeCEFHeader(deviceProduct)}|${escapeCEFHeader(deviceVersion)}|${escapeCEFHeader(signatureId)}|${name}|${severity}|${extension}`;
  }

  /**
   * Export to a file
   * @param {string} filePath - Output file path
   * @param {string} format - Export format (json, csv, splunk, cef)
   * @param {Object} options - Export options
   * @returns {Promise<void>}
   */
  async exportToFile(filePath, format, options = {}) {
    let content;

    switch (format.toLowerCase()) {
      case 'json':
        content = await this.exportJSON(options);
        break;
      case 'csv':
        content = await this.exportCSV(options);
        break;
      case 'splunk':
        content = await this.exportSplunk(options);
        break;
      case 'cef':
        content = await this.exportCEF(options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
