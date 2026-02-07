/**
 * Gate Reporter
 *
 * Formats gate results into clear, actionable terminal output
 * with severity badges, fix suggestions, and summary line.
 *
 * @module code-gate/gate-reporter
 */

/**
 * Format a single finding as a readable string.
 *
 * @param {Object} finding
 * @param {string} finding.severity
 * @param {string} finding.rule
 * @param {string} finding.file
 * @param {number} [finding.line]
 * @param {string} finding.message
 * @param {string} finding.fix
 * @returns {string}
 */
function formatFinding(finding) {
  const badge = `[${finding.severity.toUpperCase()}]`;
  const location = finding.line ? ` (line ${finding.line})` : '';
  const rule = finding.rule;

  let output = `  ${badge} ${rule}${location}\n`;
  output += `    ${finding.message}\n`;
  if (finding.fix) {
    output += `    Fix: ${finding.fix}\n`;
  }
  return output;
}

/**
 * Group findings by file path.
 *
 * @param {Array} findings
 * @returns {Object.<string, Array>}
 */
function groupByFile(findings) {
  const groups = {};
  for (const finding of findings) {
    const key = finding.file;
    if (!groups[key]) groups[key] = [];
    groups[key].push(finding);
  }
  return groups;
}

/**
 * Format the summary line.
 *
 * @param {Object} summary - { total, block, warn, info }
 * @param {boolean} passed
 * @returns {string}
 */
function formatSummary(summary, passed) {
  if (passed && summary.total === 0) {
    return 'All clear — gate passed.';
  }

  const parts = [];
  if (summary.block > 0) parts.push(`${summary.block} blocking`);
  if (summary.warn > 0) parts.push(`${summary.warn} warning${summary.warn > 1 ? 's' : ''}`);
  if (summary.info > 0) parts.push(`${summary.info} info`);

  const status = passed ? 'passed' : 'blocked';
  return `Summary: ${parts.join(' | ')} — gate ${status}.`;
}

/**
 * Format a complete gate report.
 *
 * @param {Object} result - Gate engine result
 * @param {boolean} result.passed
 * @param {Array} result.findings
 * @param {Object} result.summary
 * @returns {string}
 */
function formatReport(result) {
  const { passed, findings, summary } = result;

  let report = '';

  // Header
  const status = passed ? 'Passed' : 'Blocked';
  report += `TLC Code Gate — ${status}\n`;
  report += '─'.repeat(42) + '\n\n';

  if (findings.length === 0) {
    report += 'All clear — no issues found.\n\n';
    report += formatSummary(summary, passed) + '\n';
    return report;
  }

  // Group and display findings by file
  const grouped = groupByFile(findings);
  for (const [file, fileFindings] of Object.entries(grouped)) {
    report += `${file}\n`;
    for (const finding of fileFindings) {
      report += formatFinding(finding);
    }
    report += '\n';
  }

  // Summary
  report += formatSummary(summary, passed) + '\n';

  // Bypass hint (only when blocked)
  if (!passed) {
    report += 'Fix blocking issues or use --no-verify (logged).\n';
  }

  return report;
}

module.exports = {
  formatReport,
  formatSummary,
  formatFinding,
  groupByFile,
};
