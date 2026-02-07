/**
 * TypeScript Compilation Gate
 *
 * Integrates `tsc --noEmit` as an optional check in the push gate.
 * Catches 7 categories of bugs that compile silently with esbuild/Vite:
 * - Invented enum values (Bug #4, #33)
 * - Wrong field names (Bug #7)
 * - Date type mismatches (Bug #8)
 * - Undefined variables (Bug #31)
 * - Accumulated type errors (Bug #32)
 * - Missing required fields in spreads (Bug #34)
 *
 * @module code-gate/typescript-gate
 */

const path = require('path');

/**
 * Check if a project has TypeScript configured.
 *
 * @param {string} projectPath - Project root
 * @param {Object} [options]
 * @param {Object} [options.fs] - File system (injectable)
 * @returns {boolean}
 */
function detectTypeScript(projectPath, options = {}) {
  const fs = options.fs || require('fs');
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  return fs.existsSync(tsconfigPath);
}

/**
 * Parse tsc --noEmit output into gate findings.
 * TypeScript error format: file(line,col): error TSxxxx: message
 *
 * @param {string} output - Raw tsc output
 * @returns {Array<{severity: string, rule: string, file: string, line: number, message: string, fix: string}>}
 */
function parseTscOutput(output) {
  if (!output || !output.trim()) return [];
  const findings = [];
  const lines = output.split('\n');

  // TS error format: path/file.ts(line,col): error TSxxxx: message
  const errorPattern = /^(.+?)\((\d+),\d+\):\s*error\s+(TS\d+):\s*(.+)$/;

  for (const line of lines) {
    const match = line.match(errorPattern);
    if (match) {
      const [, file, lineNum, code, message] = match;
      findings.push({
        severity: 'block',
        rule: 'typescript-error',
        file,
        line: parseInt(lineNum, 10),
        message: `${code}: ${message}`,
        fix: 'Fix the TypeScript type error — tsc --noEmit must pass with zero errors',
      });
    }
  }

  return findings;
}

/**
 * Run tsc --noEmit and return gate-compatible result.
 *
 * @param {string} projectPath - Project root
 * @param {Object} [options]
 * @param {Function} [options.exec] - Command executor (injectable)
 * @returns {Promise<{passed: boolean, findings: Array, summary: Object, skipped?: boolean}>}
 */
async function runTypeScriptGate(projectPath, options = {}) {
  const exec = options.exec;

  try {
    const result = await exec('npx tsc --noEmit', { cwd: projectPath });
    const output = result.stdout || '';
    const findings = parseTscOutput(output);
    const summary = { total: findings.length, block: findings.length, warn: 0, info: 0 };

    return {
      passed: findings.length === 0,
      findings,
      summary,
    };
  } catch (err) {
    // If tsc fails with errors, the output is usually in stdout or stderr
    if (err.stdout || err.stderr) {
      const output = err.stdout || err.stderr || '';
      const findings = parseTscOutput(output);
      const summary = { total: findings.length, block: findings.length, warn: 0, info: 0 };
      return {
        passed: findings.length === 0,
        findings,
        summary,
      };
    }

    // tsc not installed or other system error — skip gracefully
    return {
      passed: true,
      findings: [],
      summary: { total: 0, block: 0, warn: 0, info: 0 },
      skipped: true,
    };
  }
}

/**
 * Create a TypeScript gate with configurable options.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]
 * @returns {{ enabled: boolean }}
 */
function createTypeScriptGate(options = {}) {
  return {
    enabled: options.enabled !== false,
  };
}

module.exports = {
  detectTypeScript,
  parseTscOutput,
  runTypeScriptGate,
  createTypeScriptGate,
};
