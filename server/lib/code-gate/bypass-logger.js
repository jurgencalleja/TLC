/**
 * Bypass Logger
 *
 * Logs when someone uses --no-verify to bypass the code gate.
 * Maintains an append-only JSONL audit trail.
 *
 * @module code-gate/bypass-logger
 */

const path = require('path');
const fs = require('fs');

/** Default audit file path relative to project root */
const AUDIT_FILE = '.tlc/audit/gate-bypasses.jsonl';

/**
 * Log a gate bypass event to the audit trail.
 *
 * @param {Object} event
 * @param {string} event.user - Who bypassed
 * @param {string} event.commitHash - Commit hash
 * @param {string[]} event.filesChanged - Files in the commit
 * @param {string} [event.hookType] - Which hook was bypassed
 * @param {Object} [options]
 * @param {Object} [options.fs] - File system module
 * @param {string} [options.projectPath] - Project root
 */
function logBypass(event, options = {}) {
  const fsModule = options.fs || fs;
  const projectPath = options.projectPath || process.cwd();
  const auditPath = path.join(projectPath, AUDIT_FILE);
  const auditDir = path.dirname(auditPath);

  if (!fsModule.existsSync(auditDir)) {
    fsModule.mkdirSync(auditDir, { recursive: true });
  }

  const record = {
    timestamp: new Date().toISOString(),
    user: event.user,
    commitHash: event.commitHash,
    filesChanged: event.filesChanged,
    hookType: event.hookType || 'unknown',
  };

  fsModule.appendFileSync(auditPath, JSON.stringify(record) + '\n');
}

/**
 * Read the bypass audit history.
 *
 * @param {string} projectPath
 * @param {Object} [options]
 * @param {Object} [options.fs] - File system module
 * @returns {Array<Object>} Array of bypass events
 */
function readBypassHistory(projectPath, options = {}) {
  const fsModule = options.fs || fs;
  const auditPath = path.join(projectPath, AUDIT_FILE);

  if (!fsModule.existsSync(auditPath)) {
    return [];
  }

  const content = fsModule.readFileSync(auditPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const entries = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Calculate bypass count per user.
 *
 * @param {Array<{user: string}>} history
 * @returns {Object.<string, number>} User to bypass count map
 */
function getBypassRate(history) {
  const rates = {};
  for (const entry of history) {
    rates[entry.user] = (rates[entry.user] || 0) + 1;
  }
  return rates;
}

/**
 * Format bypass history as a readable report.
 *
 * @param {Array} history
 * @returns {string}
 */
function formatBypassReport(history) {
  if (history.length === 0) {
    return 'No bypasses recorded. Gate compliance is 100%.';
  }

  let report = 'Gate Bypass Report\n';
  report += '─'.repeat(42) + '\n\n';

  const rates = getBypassRate(history);
  report += 'Bypasses by user:\n';
  for (const [user, count] of Object.entries(rates)) {
    report += `  ${user}: ${count} bypass${count > 1 ? 'es' : ''}\n`;
  }

  report += `\nRecent bypasses:\n`;
  const recent = history.slice(-5);
  for (const entry of recent) {
    const date = entry.timestamp ? entry.timestamp.split('T')[0] : 'unknown';
    report += `  ${date} ${entry.user} (${entry.commitHash})\n`;
  }

  return report;
}

module.exports = {
  logBypass,
  readBypassHistory,
  getBypassRate,
  formatBypassReport,
};
