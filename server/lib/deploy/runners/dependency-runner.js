/**
 * Dependency Runner
 *
 * Scans project dependencies using npm audit.
 * Returns findings with severity, package name, and fix availability.
 */

import { execFile as defaultExecFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(defaultExecFile);

/** Severity levels ordered from lowest to highest */
const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];

/**
 * Check if a severity meets or exceeds the threshold
 * @param {string} severity - The vulnerability severity
 * @param {string} threshold - The minimum severity to fail on
 * @returns {boolean} True if severity >= threshold
 */
function meetsThreshold(severity, threshold) {
  return SEVERITY_ORDER.indexOf(severity) >= SEVERITY_ORDER.indexOf(threshold);
}

/**
 * Create a dependency scanning runner
 * @param {Object} [deps] - Injectable dependencies for testing
 * @param {Function} [deps.exec] - Command executor (replaces execFile)
 * @param {Object} [deps.fs] - File system module
 * @param {string} [deps.severityThreshold] - Minimum severity to fail on (default: 'high')
 * @returns {Function} Runner function: (projectPath, options) => { passed, findings, error? }
 */
export function createDependencyRunner(deps = {}) {
  const {
    exec: execFn,
    fs: fsMod = fs,
    severityThreshold = 'high',
  } = deps;

  return async (projectPath, options = {}) => {
    // Check if package.json exists
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fsMod.existsSync(pkgPath)) {
      return { passed: true, findings: [] };
    }

    let stdout;
    try {
      if (execFn) {
        // Injected exec for testing
        const result = await execFn('npm', ['audit', '--json'], { cwd: projectPath });
        stdout = result.stdout;
      } else {
        // Real exec
        try {
          const result = await execFileAsync('npm', ['audit', '--json'], { cwd: projectPath });
          stdout = result.stdout;
        } catch (execErr) {
          // npm audit exits with code 1 when vulnerabilities found — that's expected
          if (execErr.stdout) {
            stdout = execErr.stdout;
          } else {
            throw execErr;
          }
        }
      }
    } catch (err) {
      return { passed: false, findings: [], error: err.message };
    }

    // Parse the JSON output
    let auditData;
    try {
      auditData = JSON.parse(stdout);
    } catch {
      return { passed: false, findings: [], error: 'Failed to parse npm audit output' };
    }

    const vulnerabilities = auditData.vulnerabilities || {};
    const findings = [];
    let hasFailingSeverity = false;

    for (const [name, vuln] of Object.entries(vulnerabilities)) {
      const finding = {
        severity: vuln.severity,
        package: vuln.name || name,
        title: vuln.title || 'Unknown vulnerability',
        url: vuln.url || '',
        fixAvailable: Boolean(vuln.fixAvailable),
      };
      findings.push(finding);

      if (meetsThreshold(vuln.severity, severityThreshold)) {
        hasFailingSeverity = true;
      }
    }

    return {
      passed: !hasFailingSeverity,
      findings,
    };
  };
}
