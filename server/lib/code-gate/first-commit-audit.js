/**
 * First-Commit Audit Hook
 *
 * Auto-runs architectural audit on first commit to catch
 * AI-generated code issues before they accumulate.
 * The "2-hour audit on day 1 saves 10 days" lesson.
 *
 * @module code-gate/first-commit-audit
 */

const path = require('path');
const defaultFs = require('fs').promises;

/** Marker file path relative to project root */
const MARKER_FILE = '.tlc/first-audit-done';

/** Fix suggestions by audit issue type */
const FIX_SUGGESTIONS = {
  'hardcoded-url': 'Extract to environment variable using process.env',
  'hardcoded-port': 'Extract port to environment variable',
  'flat-folder': 'Reorganize into entity-based folder structure (src/{entity}/)',
  'inline-interface': 'Extract interface to separate types file',
  'magic-string': 'Replace with named constant',
  'flat-seeds': 'Move seeds into per-entity seed folders',
  'missing-jsdoc': 'Add JSDoc comment to exported function',
  'deep-import': 'Use path aliases or restructure to reduce nesting',
  'missing': 'Create required standards file',
};

/**
 * Check if the first audit has already run
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Object} options.fs - File system module
 * @returns {Promise<boolean>} True if marker exists
 */
async function hasFirstAuditRun(projectPath, options = {}) {
  const fsModule = options.fs || defaultFs;
  const markerPath = path.join(projectPath, MARKER_FILE);
  try {
    await fsModule.access(markerPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert audit results to gate findings
 * @param {Object} auditResults - Results from auditProject()
 * @returns {Array<Object>} Gate findings with severity: warn
 */
function convertAuditToFindings(auditResults) {
  const findings = [];

  const categories = [
    'standardsFiles', 'flatFolders', 'inlineInterfaces',
    'hardcodedUrls', 'magicStrings', 'seedOrganization',
    'jsDocCoverage', 'importStyle',
  ];

  for (const category of categories) {
    const result = auditResults[category];
    if (!result || !result.issues) continue;

    for (const issue of result.issues) {
      findings.push({
        severity: 'warn',
        rule: `first-audit/${issue.type}`,
        file: issue.file || issue.folder || 'project',
        line: 0,
        message: `First-commit audit: ${issue.type}${issue.value ? ` (${issue.value})` : ''}`,
        fix: FIX_SUGGESTIONS[issue.type] || 'Review and fix manually',
      });
    }
  }

  return findings;
}

/**
 * Run the first-commit audit
 * @param {string} projectPath - Path to project root
 * @param {Object} options - Injectable dependencies
 * @param {Object} options.fs - File system module
 * @param {Function} options.auditProject - Audit function from audit-checker
 * @param {Object} options.config - Gate config
 * @returns {Promise<Object>} Result with findings or skipped flag
 */
async function runFirstCommitAudit(projectPath, options = {}) {
  const fsModule = options.fs || defaultFs;
  const { auditProject, config } = options;

  // Check if disabled via config
  if (config && config.firstCommitAudit === false) {
    return { skipped: true, reason: 'disabled' };
  }

  // Check if already run
  const alreadyRun = await hasFirstAuditRun(projectPath, { fs: fsModule });
  if (alreadyRun) {
    return { skipped: true, reason: 'already-run' };
  }

  // Run audit
  const auditResults = await auditProject(projectPath, { fs: fsModule });
  const findings = convertAuditToFindings(auditResults);

  // Create marker file
  const markerPath = path.join(projectPath, MARKER_FILE);
  const markerDir = path.dirname(markerPath);
  await fsModule.mkdir(markerDir, { recursive: true });
  await fsModule.writeFile(markerPath, `First audit completed at ${new Date().toISOString()}\n`);

  return {
    skipped: false,
    findings,
    auditResults,
  };
}

/**
 * Create a first-commit audit instance with dependencies
 * @param {Object} deps - Injectable dependencies
 * @returns {Object} Audit instance with run method
 */
function createFirstCommitAudit(deps = {}) {
  return {
    run: (projectPath, config) => runFirstCommitAudit(projectPath, { ...deps, config }),
  };
}

module.exports = {
  createFirstCommitAudit,
  hasFirstAuditRun,
  convertAuditToFindings,
  runFirstCommitAudit,
};
