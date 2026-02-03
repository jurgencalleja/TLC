/**
 * Security Scan Command
 * CLI command for running security scans (SAST, DAST, deps, secrets)
 */

import { formatSarif, formatHtml } from '../lib/security-testing/security-reporter.js';

/**
 * Create the security-scan command
 * @returns {Object} Command object with name, execute, and subcommands
 */
export function createSecurityScanCommand() {
  return {
    name: 'security-scan',
    description: 'Run security scans against the codebase',
    subcommands: ['sast', 'dast', 'deps', 'secrets', 'all'],

    /**
     * Execute the security scan command
     * @param {Object} options - Command options
     * @returns {Promise<Object>} Scan results
     */
    async execute(options = {}) {
      const type = options.type || options.subcommand || 'all';
      return runScan({ ...options, type });
    }
  };
}

/**
 * Run a security scan of the specified type
 * @param {Object} options - Scan options including type, runner(s), and target
 * @returns {Promise<Object>} Scan results
 */
export async function runScan(options = {}) {
  const { type, runner, runners, target } = options;

  switch (type) {
    case 'sast':
      return runSastScan(runner);

    case 'dast':
      return runDastScan(runner, target);

    case 'deps':
      return runDepsScan(runner);

    case 'secrets':
      return runSecretsScan(runner);

    case 'all':
      return runAllScans(runners);

    default:
      throw new Error(`Unknown scan type: ${type}`);
  }
}

/**
 * Format scan results in specified format
 * @param {Array} findings - Array of findings
 * @param {Object} options - Options including format (table, json, sarif)
 * @returns {string} Formatted results
 */
export function formatResults(findings, options = {}) {
  const format = options.format || 'table';

  switch (format) {
    case 'json':
      return JSON.stringify(findings);

    case 'sarif':
      return JSON.stringify(formatSarif(findings));

    case 'table':
    default:
      return formatAsTable(findings);
  }
}

/**
 * Generate a report from findings
 * @param {Array} findings - Array of findings
 * @param {Object} options - Options including format (html, markdown)
 * @returns {string} Generated report
 */
export function generateReport(findings, options = {}) {
  const format = options.format || 'html';

  switch (format) {
    case 'html':
      return formatHtml(findings, { title: 'Security Scan Report' });

    case 'markdown':
      return generateMarkdownReport(findings);

    default:
      return formatHtml(findings, { title: 'Security Scan Report' });
  }
}

// Internal scan functions

async function runSastScan(runner) {
  if (!runner || !runner.runSemgrep) {
    throw new Error('SAST runner with runSemgrep method required');
  }

  const result = await runner.runSemgrep();

  return {
    type: 'sast',
    findings: result.results || [],
    raw: result
  };
}

async function runDastScan(runner, target) {
  if (!runner || !runner.runZapBaseline) {
    throw new Error('DAST runner with runZapBaseline method required');
  }

  const result = await runner.runZapBaseline(target);

  return {
    type: 'dast',
    findings: result.alerts || [],
    raw: result
  };
}

async function runDepsScan(runner) {
  if (!runner || !runner.runNpmAudit) {
    throw new Error('Deps runner with runNpmAudit method required');
  }

  const result = await runner.runNpmAudit();

  // Convert vulnerabilities object to array
  const findings = [];
  if (result.vulnerabilities) {
    for (const [name, vuln] of Object.entries(result.vulnerabilities)) {
      findings.push({ package: name, ...vuln });
    }
  }

  return {
    type: 'deps',
    findings,
    raw: result
  };
}

async function runSecretsScan(runner) {
  if (!runner || !runner.runGitleaks) {
    throw new Error('Secrets runner with runGitleaks method required');
  }

  const result = await runner.runGitleaks();

  return {
    type: 'secrets',
    findings: Array.isArray(result) ? result : [],
    raw: result
  };
}

async function runAllScans(runners = {}) {
  const results = {
    sast: null,
    dast: null,
    deps: null,
    secrets: null
  };

  // Run all available scans
  if (runners.sast) {
    results.sast = await runSastScan(runners.sast);
  }

  if (runners.dast) {
    results.dast = await runDastScan(runners.dast);
  }

  if (runners.deps) {
    results.deps = await runDepsScan(runners.deps);
  }

  if (runners.secrets) {
    results.secrets = await runSecretsScan(runners.secrets);
  }

  return results;
}

// Formatting helpers

function formatAsTable(findings) {
  if (!findings || findings.length === 0) {
    return 'No findings';
  }

  const headers = ['Rule', 'Severity', 'File', 'Line'];
  const rows = findings.map(f => [
    f.rule || 'N/A',
    f.severity || 'unknown',
    f.file || 'N/A',
    f.line || '-'
  ]);

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map(r => String(r[i]).length));
    return Math.max(h.length, maxRow);
  });

  // Build table
  const separator = widths.map(w => '-'.repeat(w)).join('-+-');
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(' | ');
  const dataRows = rows.map(row =>
    row.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

function generateMarkdownReport(findings) {
  const lines = [
    '# Security Scan Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    '| Rule | Severity | File | Line |',
    '|------|----------|------|------|'
  ];

  for (const finding of findings) {
    lines.push(`| ${finding.rule || 'N/A'} | ${finding.severity || 'unknown'} | ${finding.file || 'N/A'} | ${finding.line || '-'} |`);
  }

  return lines.join('\n');
}
