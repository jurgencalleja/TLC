/**
 * Audit Log Storage - Append-only audit log storage with tamper-evident checksums
 *
 * Features:
 * - Append-only log files (no overwrites)
 * - Each entry has SHA-256 checksum
 * - Checksum chains to previous entry (blockchain-style)
 * - Daily log rotation with configurable retention
 * - Stores in .tlc/audit/ directory
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const AUDIT_PATH = '.tlc/audit';

export class AuditStorage {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.auditDir = path.join(baseDir, AUDIT_PATH);
    this.lastChecksum = null;
  }

  /**
   * Ensure audit directory exists
   */
  ensureDirectory() {
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  /**
   * Get current date string for log file naming
   * @returns {string} YYYY-MM-DD format
   */
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current log file path
   * @returns {string} Path to current day's log file
   */
  getCurrentLogFile() {
    const dateStr = this.getDateString();
    return path.join(this.auditDir, `audit-${dateStr}.jsonl`);
  }

  /**
   * Calculate SHA-256 checksum for entry data
   * @param {Object} entryData - Entry data without checksum
   * @returns {string} Hex-encoded SHA-256 hash
   */
  calculateChecksum(entryData) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');
  }

  /**
   * Get the last entry's checksum from the current log file
   * @returns {string|null} Last checksum or null if no entries
   */
  getLastChecksum() {
    const logFile = this.getCurrentLogFile();
    if (!fs.existsSync(logFile)) {
      return null;
    }

    const content = fs.readFileSync(logFile, 'utf-8').trim();
    if (!content) {
      return null;
    }

    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    try {
      const entry = JSON.parse(lastLine);
      return entry.checksum || null;
    } catch {
      return null;
    }
  }

  /**
   * Append an audit entry with checksum
   * @param {Object} entry - Entry data to append
   * @returns {Promise<Object>} Appended entry with checksum
   */
  async appendEntry(entry) {
    this.ensureDirectory();

    const logFile = this.getCurrentLogFile();
    const previousChecksum = this.getLastChecksum();

    // Build entry with metadata
    const entryData = {
      ...entry,
      previousChecksum,
    };

    // Calculate checksum
    const checksum = this.calculateChecksum(entryData);
    const finalEntry = {
      ...entryData,
      checksum,
    };

    // Append to log file (append-only)
    fs.appendFileSync(logFile, JSON.stringify(finalEntry) + '\n', 'utf-8');

    this.lastChecksum = checksum;
    return finalEntry;
  }

  /**
   * Get all log files in the audit directory
   * @returns {string[]} Array of log file paths sorted by date
   */
  getLogFiles() {
    if (!fs.existsSync(this.auditDir)) {
      return [];
    }

    return fs
      .readdirSync(this.auditDir)
      .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
      .sort()
      .map((f) => path.join(this.auditDir, f));
  }

  /**
   * Read entries from a single log file
   * @param {string} logFile - Path to log file
   * @returns {Object[]} Array of entries
   */
  readLogFile(logFile) {
    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, 'utf-8').trim();
    if (!content) {
      return [];
    }

    return content.split('\n').map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Get all entries, optionally filtered by date range
   * @param {Object} options - Filter options
   * @param {Date} options.from - Start date (inclusive)
   * @param {Date} options.to - End date (inclusive)
   * @returns {Promise<Object[]>} Array of entries sorted by timestamp
   */
  async getEntries(options = {}) {
    const { from, to } = options;
    const logFiles = this.getLogFiles();

    let allEntries = [];
    for (const logFile of logFiles) {
      const entries = this.readLogFile(logFile);
      allEntries = allEntries.concat(entries);
    }

    // Filter by date range if specified
    if (from || to) {
      allEntries = allEntries.filter((entry) => {
        const ts = entry.timestamp;
        if (from && ts < from.getTime()) return false;
        if (to && ts > to.getTime()) return false;
        return true;
      });
    }

    // Sort by timestamp ascending
    return allEntries.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Verify integrity of the audit log
   * @returns {Promise<Object>} Verification result { valid: boolean, error?: string, entryCount: number }
   */
  async verifyIntegrity() {
    const logFiles = this.getLogFiles();

    let entryCount = 0;
    let previousChecksum = null;

    for (const logFile of logFiles) {
      const entries = this.readLogFile(logFile);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        entryCount++;

        // Verify entry's own checksum
        const { checksum, ...entryData } = entry;
        const calculatedChecksum = this.calculateChecksum(entryData);

        if (checksum !== calculatedChecksum) {
          return {
            valid: false,
            error: `Entry ${entryCount} has invalid checksum (expected ${calculatedChecksum}, got ${checksum})`,
            entryCount,
          };
        }

        // Verify chain (previousChecksum matches previous entry's checksum)
        if (entry.previousChecksum !== previousChecksum) {
          return {
            valid: false,
            error: `Entry ${entryCount} has broken chain (expected previousChecksum ${previousChecksum}, got ${entry.previousChecksum})`,
            entryCount,
          };
        }

        previousChecksum = checksum;
      }
    }

    return {
      valid: true,
      entryCount,
    };
  }

  /**
   * Rotate logs, removing files older than retention period
   * @param {Object} options - Rotation options
   * @param {number} options.retentionDays - Number of days to retain (default: 30)
   */
  async rotateLog(options = {}) {
    const { retentionDays = 30 } = options;

    if (!fs.existsSync(this.auditDir)) {
      return;
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const files = fs.readdirSync(this.auditDir).filter(
      (f) => f.startsWith('audit-') && f.endsWith('.jsonl')
    );

    for (const file of files) {
      // Extract date from filename: audit-YYYY-MM-DD.jsonl
      const match = file.match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/);
      if (match) {
        const fileDate = match[1];
        if (fileDate < cutoffStr) {
          fs.unlinkSync(path.join(this.auditDir, file));
        }
      }
    }
  }
}
