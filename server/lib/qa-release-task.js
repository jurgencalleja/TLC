/**
 * QA Release Task Generator
 *
 * Auto-creates QA verification tasks when a tag is deployed for review.
 * Tasks are formatted for compatibility with the QATaskQueue component.
 *
 * @module qa-release-task
 */

/**
 * Generate a deterministic task ID from a tag string.
 * Ensures idempotency: the same tag always produces the same task ID.
 *
 * @param {string} tag - Git tag (e.g. "v1.0.0-rc.1")
 * @returns {string} Deterministic task ID
 */
function generateTaskId(tag) {
  return `qa-task-${tag}`;
}

/**
 * Format an array of git commits into a markdown changelog string.
 *
 * @param {Array<{sha: string, message: string}>|null|undefined} commits - Array of commit objects
 * @returns {string} Markdown-formatted changelog, or empty string if no commits
 */
export function formatChangelog(commits) {
  if (!commits || !Array.isArray(commits) || commits.length === 0) {
    return '';
  }

  return commits
    .map((c) => `- \`${c.sha.slice(0, 7)}\` ${c.message}`)
    .join('\n');
}

/**
 * Format gate results into a human-readable summary string.
 *
 * @param {Object|null} gateResults - Gate results object from tag-release
 * @param {boolean} gateResults.passed - Whether all gates passed
 * @param {Array<{gate: string, status: string, details: Object}>} gateResults.results - Individual gate results
 * @returns {string} Summary string with pass/fail counts, or "pending" if no results
 */
export function formatGateSummary(gateResults) {
  if (!gateResults || !gateResults.results) {
    return 'Gates: pending';
  }

  const results = gateResults.results;
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status !== 'pass').length;
  const overall = gateResults.passed ? 'PASSED' : 'FAILED';

  return `Gates: ${overall} (${passCount} passed, ${failCount} failed)`;
}

/**
 * Extract QA users from a TLC config object.
 * Filters auth.users for entries with role === 'qa'.
 *
 * @param {Object|null|undefined} config - TLC config object (e.g. contents of .tlc.json)
 * @returns {Array<{email: string, name: string, role: string}>} Array of QA user objects
 */
export function getQAUsers(config) {
  if (!config || !config.auth || !Array.isArray(config.auth.users)) {
    return [];
  }

  return config.auth.users.filter((u) => u.role === 'qa');
}

/**
 * Format a test summary object into a human-readable string.
 *
 * @param {Object|null|undefined} testSummary - Test summary data
 * @param {number} testSummary.total - Total number of tests
 * @param {number} testSummary.passing - Number of passing tests
 * @param {number} testSummary.failing - Number of failing tests
 * @param {number} testSummary.coveragePercent - Code coverage percentage
 * @returns {string} Formatted test summary string
 */
function formatTestSummary(testSummary) {
  if (!testSummary) {
    return 'Tests: no data';
  }

  return `Tests: ${testSummary.total} total, ${testSummary.passing} passing, ${testSummary.failing} failing, ${testSummary.coveragePercent}% coverage`;
}

/**
 * Format a security scan summary into a human-readable string.
 *
 * @param {Object|null|undefined} securitySummary - Security scan results
 * @param {number} securitySummary.vulnerabilities - Number of vulnerabilities found
 * @returns {string} Formatted security summary string
 */
function formatSecuritySummary(securitySummary) {
  if (!securitySummary) {
    return 'Security: no data';
  }

  const count = securitySummary.vulnerabilities;
  if (count === 0) {
    return `Security: clean (${count} vulnerabilities)`;
  }
  return `Security: ${count} vulnerabilities found`;
}

/**
 * Create a QA release verification task from a deployed release.
 *
 * The generated task is compatible with the QATaskQueue component and includes
 * all relevant release metadata: tag info, preview URL, gate results, changelog,
 * test summary, and security summary.
 *
 * Idempotent: calling with the same release tag always produces a task with the same ID.
 *
 * @param {Object} release - Release object from tag-release.js createReleaseManager
 * @param {string} release.tag - Git tag string (e.g. "v1.0.0-rc.1")
 * @param {string} release.tier - Release tier ("alpha", "beta", "rc", "release")
 * @param {string} release.previewUrl - URL of the deployed preview environment
 * @param {Object|null} release.gateResults - Quality gate results
 * @param {Object} config - TLC config object (e.g. contents of .tlc.json)
 * @param {Object} [options] - Additional data for the task
 * @param {Array<{sha: string, message: string}>} [options.commits] - Git commits for changelog
 * @param {Object} [options.testSummary] - Test run summary
 * @param {Object} [options.securitySummary] - Security scan summary
 * @returns {{ id: string, title: string, description: string, status: string, assignee: Array, type: string, tag: string, previewUrl: string, changelog: string, gateSummary: string, testSummary: string, securitySummary: string, createdAt: string }}
 *   QA task object compatible with QATaskQueue component
 */
export function createQAReleaseTask(release, config, options = {}) {
  const { commits, testSummary, securitySummary } = options;

  const id = generateTaskId(release.tag);
  const qaUsers = getQAUsers(config);
  const changelog = formatChangelog(commits);
  const gateSummary = formatGateSummary(release.gateResults);
  const testSummaryStr = formatTestSummary(testSummary);
  const securitySummaryStr = formatSecuritySummary(securitySummary);

  const descriptionParts = [
    `## QA Review: ${release.tag}`,
    '',
    `**Tier:** ${release.tier}`,
    `**Preview:** ${release.previewUrl || 'N/A'}`,
    '',
    `### Gate Results`,
    gateSummary,
    '',
    `### Test Summary`,
    testSummaryStr,
    '',
    `### Security`,
    securitySummaryStr,
  ];

  if (changelog) {
    descriptionParts.push('', '### Changelog', changelog);
  }

  return {
    id,
    title: `Release Review: ${release.tag} (${release.tier})`,
    description: descriptionParts.join('\n'),
    status: 'pending',
    assignee: qaUsers,
    type: 'release-review',
    tag: release.tag,
    previewUrl: release.previewUrl || null,
    changelog,
    gateSummary,
    testSummary: testSummaryStr,
    securitySummary: securitySummaryStr,
    createdAt: new Date().toISOString(),
  };
}

export default {
  createQAReleaseTask,
  formatChangelog,
  formatGateSummary,
  getQAUsers,
};
