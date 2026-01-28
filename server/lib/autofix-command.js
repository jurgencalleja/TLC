/**
 * AutoFix Command - CLI interface for automatic test failure recovery
 */

const {
  parseTestFailure,
  matchErrorPattern,
  generateFixProposal,
} = require('./autofix-engine.js');

/**
 * Analyze test output and categorize failures
 * @param {string} testOutput - Raw test runner output
 * @returns {Object} Analysis result with failures and proposals
 */
function analyzeFailures(testOutput) {
  const failures = [];
  const fixable = [];
  const unfixable = [];

  // Split output by FAIL markers
  const failureBlocks = testOutput.split(/(?=FAIL\s+)/);

  for (const block of failureBlocks) {
    if (!block.includes('FAIL')) continue;

    const failure = parseTestFailure(block);
    if (!failure) continue;

    // Match error pattern and generate proposal
    const pattern = matchErrorPattern(failure.error);
    const proposal = generateFixProposal(failure, pattern);

    const fullFailure = {
      ...failure,
      pattern,
      proposal,
    };

    failures.push(fullFailure);

    if (proposal.confidence === 'high' || proposal.confidence === 'medium') {
      fixable.push(fullFailure);
    } else {
      unfixable.push(fullFailure);
    }
  }

  return {
    failures,
    fixable,
    unfixable,
    total: failures.length,
  };
}

/**
 * Format progress indicator for CLI output
 * @param {number} current - Current item number
 * @param {number} total - Total items
 * @param {string} message - Current action description
 * @returns {string} Formatted progress string
 */
function formatFixProgress(current, total, message) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));

  return [
    `[${bar}] ${current}/${total} (${pct}%)`,
    `  ${message}`,
  ].join('\n');
}

/**
 * Format summary of fix attempts
 * @param {Object} results - Fix results
 * @returns {string} Formatted summary
 */
function formatFixSummary(results) {
  const lines = [];

  lines.push('');
  lines.push('AutoFix Summary');
  lines.push('═══════════════');
  lines.push('');

  if (results.total === 0) {
    lines.push('No test failures found.');
    lines.push('');
    return lines.join('\n');
  }

  // Stats
  lines.push(`Total:  ${results.total}`);
  lines.push(`fixed:  ${results.fixed} ✓`);
  lines.push(`failed: ${results.failed} ✗`);
  lines.push('');

  // Fixed tests
  if (results.fixed > 0) {
    lines.push('Successfully fixed:');
    for (const detail of results.details.filter(d => d.status === 'fixed')) {
      lines.push(`  ✓ ${detail.testName}`);
      lines.push(`    ${detail.description}`);
    }
    lines.push('');
  }

  // Failed tests
  if (results.failed > 0) {
    lines.push('Could not fix:');
    for (const detail of results.details.filter(d => d.status === 'failed')) {
      lines.push(`  ✗ ${detail.testName}`);
      lines.push(`    Reason: ${detail.reason}`);
    }
    lines.push('');
  }

  // Commit prompt
  if (results.fixed > 0) {
    lines.push('Commit fixes?');
    lines.push('  1) Yes - commit all fixes');
    lines.push('  2) No - review changes first');
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  analyzeFailures,
  formatFixProgress,
  formatFixSummary,
};
