/**
 * Audit Command - CLI command to view and export audit logs
 *
 * Features:
 * - View recent audit entries
 * - Filter by user, action type, date
 * - Export to JSON, CSV, Splunk, CEF formats
 * - Verify log integrity (checksum validation)
 */

import { AuditStorage } from './audit-storage.js';
import { AuditQuery } from './audit-query.js';
import { AuditExporter } from './audit-exporter.js';

const VALID_EXPORT_FORMATS = ['json', 'csv', 'splunk', 'cef'];

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
export function parseArgs(args) {
  const result = {
    user: null,
    type: null,
    since: null,
    export: null,
    verify: false,
    limit: 20,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verify') {
      result.verify = true;
    } else if (arg === '--user') {
      result.user = args[i + 1];
      i++;
    } else if (arg.startsWith('--user=')) {
      result.user = arg.split('=')[1];
    } else if (arg === '--type') {
      result.type = args[i + 1];
      i++;
    } else if (arg.startsWith('--type=')) {
      result.type = arg.split('=')[1];
    } else if (arg === '--since') {
      result.since = args[i + 1];
      i++;
    } else if (arg.startsWith('--since=')) {
      result.since = arg.split('=')[1];
    } else if (arg === '--export') {
      result.export = args[i + 1];
      i++;
    } else if (arg.startsWith('--export=')) {
      result.export = arg.split('=')[1];
    } else if (arg === '--limit') {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10);
    }
  }

  return result;
}

/**
 * AuditCommand class - handles tlc audit command
 */
export class AuditCommand {
  /**
   * Create an AuditCommand instance
   * @param {Object} options - Configuration options
   * @param {AuditStorage} options.storage - AuditStorage instance
   * @param {AuditQuery} options.query - AuditQuery instance
   * @param {AuditExporter} options.exporter - AuditExporter instance
   * @param {string} options.baseDir - Base directory for audit storage
   */
  constructor(options = {}) {
    this.storage = options.storage || new AuditStorage(options.baseDir);
    this.query = options.query || new AuditQuery(this.storage);
    this.exporter = options.exporter || new AuditExporter(options.baseDir);
  }

  /**
   * Execute the audit command
   * @param {string[]} args - Command arguments
   * @returns {Promise<Object>} Result { success, output, error? }
   */
  async execute(args) {
    const options = parseArgs(args);

    try {
      // Handle --verify flag
      if (options.verify) {
        return await this.handleVerify();
      }

      // Handle --export flag
      if (options.export) {
        return await this.handleExport(options);
      }

      // Default: query and display entries
      return await this.handleQuery(options);
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
      };
    }
  }

  /**
   * Handle --verify flag
   * @returns {Promise<Object>} Result
   */
  async handleVerify() {
    const result = await this.storage.verifyIntegrity();
    const output = this.formatVerifyResult(result);

    return {
      success: result.valid,
      output,
    };
  }

  /**
   * Handle --export flag
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleExport(options) {
    const format = options.export.toLowerCase();

    if (!VALID_EXPORT_FORMATS.includes(format)) {
      return {
        success: false,
        output: '',
        error: `Invalid export format: ${options.export}. Valid formats: ${VALID_EXPORT_FORMATS.join(', ')}`,
      };
    }

    // Build export options
    const exportOptions = {};
    if (options.since) {
      exportOptions.from = new Date(options.since);
    }

    let content;
    switch (format) {
      case 'json':
        content = await this.exporter.exportJSON(exportOptions);
        break;
      case 'csv':
        content = await this.exporter.exportCSV(exportOptions);
        break;
      case 'splunk':
        content = await this.exporter.exportSplunk(exportOptions);
        break;
      case 'cef':
        content = await this.exporter.exportCEF(exportOptions);
        break;
    }

    return {
      success: true,
      output: content,
    };
  }

  /**
   * Handle query (default behavior)
   * @param {Object} options - Parsed options
   * @returns {Promise<Object>} Result
   */
  async handleQuery(options) {
    // Build query options
    const queryOptions = {
      limit: options.limit,
      sort: 'desc',
    };

    if (options.user) {
      queryOptions.user = options.user;
    }

    if (options.type) {
      queryOptions.action = options.type;
    }

    if (options.since) {
      queryOptions.from = new Date(options.since);
    }

    const result = await this.query.query(queryOptions);

    if (result.entries.length === 0) {
      return {
        success: true,
        output: 'No audit entries found.',
      };
    }

    const output = this.formatQueryResult(result);

    return {
      success: true,
      output,
    };
  }

  /**
   * Format query result for display
   * @param {Object} result - Query result
   * @returns {string} Formatted output
   */
  formatQueryResult(result) {
    const lines = [];

    lines.push(`Audit Log (${result.total} entries)`);
    lines.push('='.repeat(60));
    lines.push('');

    for (const entry of result.entries) {
      lines.push(this.formatEntry(entry));
    }

    if (result.hasMore) {
      lines.push('');
      lines.push(`... and more. Use --limit to see more entries.`);
    }

    return lines.join('\n');
  }

  /**
   * Format a single entry for display
   * @param {Object} entry - Audit entry
   * @returns {string} Formatted entry
   */
  formatEntry(entry) {
    const timestamp = entry.timestamp ? entry.timestamp.substring(0, 19).replace('T', ' ') : 'unknown';
    const tool = entry.tool || 'unknown';
    const user = entry.attribution?.user || entry.user || '-';
    const classification = entry.classification || '-';
    const severity = entry.severity || 'info';

    return `[${timestamp}] ${severity.toUpperCase().padEnd(8)} ${tool.padEnd(12)} ${classification.padEnd(20)} ${user}`;
  }

  /**
   * Format verify result for display
   * @param {Object} result - Verification result
   * @returns {string} Formatted output
   */
  formatVerifyResult(result) {
    const lines = [];

    if (result.valid) {
      lines.push('Audit log integrity check: VALID');
      lines.push(`Verified ${result.entryCount} entries`);
      lines.push('All checksums and chain links are valid.');
    } else {
      lines.push('Audit log integrity check: INVALID');
      lines.push(`Error at entry ${result.entryCount}: ${result.error}`);
      lines.push('');
      lines.push('WARNING: Possible tampering detected!');
    }

    return lines.join('\n');
  }
}
