/**
 * PR Test Report Module
 * Generates test reports for pull request comments
 */

/**
 * Format test duration
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get status emoji
 * @param {string} status - Test status
 * @returns {string} Emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'passed':
    case 'pass':
      return '✅';
    case 'failed':
    case 'fail':
      return '❌';
    case 'skipped':
    case 'skip':
      return '⏭️';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
}

/**
 * Parse Vitest/Jest JSON output
 * @param {Object} output - Test output JSON
 * @returns {Object} Parsed test results
 */
function parseVitestOutput(output) {
  if (!output || !output.testResults) {
    return null;
  }

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    duration: output.startTime ? Date.now() - output.startTime : 0,
    suites: [],
    failures: [],
  };

  for (const file of output.testResults) {
    const suite = {
      name: file.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    for (const test of file.assertionResults || []) {
      results.total++;
      suite.tests.push({
        name: test.title || test.fullName,
        status: test.status,
        duration: test.duration || 0,
      });

      if (test.status === 'passed') {
        results.passed++;
        suite.passed++;
      } else if (test.status === 'failed') {
        results.failed++;
        suite.failed++;
        results.failures.push({
          file: file.name,
          test: test.title || test.fullName,
          message: test.failureMessages?.[0] || 'Unknown error',
        });
      } else {
        results.skipped++;
        suite.skipped++;
      }
    }

    results.suites.push(suite);
  }

  return results;
}

/**
 * Parse pytest JSON output
 * @param {Object} output - Pytest output JSON
 * @returns {Object} Parsed test results
 */
function parsePytestOutput(output) {
  if (!output || !output.tests) {
    return null;
  }

  const results = {
    passed: output.summary?.passed || 0,
    failed: output.summary?.failed || 0,
    skipped: output.summary?.skipped || 0,
    total: output.summary?.total || 0,
    duration: output.duration || 0,
    suites: [],
    failures: [],
  };

  // Group tests by file
  const fileGroups = {};
  for (const test of output.tests) {
    const file = test.nodeid?.split('::')[0] || 'unknown';
    if (!fileGroups[file]) {
      fileGroups[file] = [];
    }
    fileGroups[file].push(test);
  }

  for (const [file, tests] of Object.entries(fileGroups)) {
    const suite = {
      name: file,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    for (const test of tests) {
      const status = test.outcome || 'unknown';
      suite.tests.push({
        name: test.nodeid?.split('::').slice(1).join('::') || test.name,
        status,
        duration: test.duration || 0,
      });

      if (status === 'passed') {
        suite.passed++;
      } else if (status === 'failed') {
        suite.failed++;
        results.failures.push({
          file,
          test: test.name || test.nodeid,
          message: test.longrepr || test.message || 'Unknown error',
        });
      } else {
        suite.skipped++;
      }
    }

    results.suites.push(suite);
  }

  return results;
}

/**
 * Parse Go test JSON output
 * @param {string} output - Go test output (JSON lines)
 * @returns {Object} Parsed test results
 */
function parseGoTestOutput(output) {
  if (!output || typeof output !== 'string') {
    return null;
  }

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    duration: 0,
    suites: [],
    failures: [],
  };

  const lines = output.trim().split('\n');
  const testMap = {};

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      if (event.Action === 'pass' && event.Test) {
        results.passed++;
        results.total++;
        const pkg = event.Package || 'unknown';
        if (!testMap[pkg]) testMap[pkg] = { passed: 0, failed: 0, skipped: 0, tests: [] };
        testMap[pkg].passed++;
        testMap[pkg].tests.push({ name: event.Test, status: 'passed', duration: (event.Elapsed || 0) * 1000 });
      } else if (event.Action === 'fail' && event.Test) {
        results.failed++;
        results.total++;
        const pkg = event.Package || 'unknown';
        if (!testMap[pkg]) testMap[pkg] = { passed: 0, failed: 0, skipped: 0, tests: [] };
        testMap[pkg].failed++;
        testMap[pkg].tests.push({ name: event.Test, status: 'failed', duration: (event.Elapsed || 0) * 1000 });
        results.failures.push({
          file: pkg,
          test: event.Test,
          message: event.Output || 'Test failed',
        });
      } else if (event.Action === 'skip' && event.Test) {
        results.skipped++;
        results.total++;
        const pkg = event.Package || 'unknown';
        if (!testMap[pkg]) testMap[pkg] = { passed: 0, failed: 0, skipped: 0, tests: [] };
        testMap[pkg].skipped++;
        testMap[pkg].tests.push({ name: event.Test, status: 'skipped', duration: 0 });
      }

      if (event.Elapsed && !event.Test) {
        results.duration += event.Elapsed * 1000;
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  for (const [pkg, data] of Object.entries(testMap)) {
    results.suites.push({
      name: pkg,
      ...data,
    });
  }

  return results;
}

/**
 * Parse generic test results
 * @param {Object|string} output - Test output
 * @returns {Object} Parsed test results
 */
function parseTestResults(output) {
  if (!output) {
    return null;
  }

  // Try JSON object formats
  if (typeof output === 'object') {
    if (output.testResults) {
      return parseVitestOutput(output);
    }
    if (output.tests) {
      return parsePytestOutput(output);
    }
  }

  // Try Go test JSON lines
  if (typeof output === 'string' && output.includes('"Action"')) {
    return parseGoTestOutput(output);
  }

  return null;
}

/**
 * Generate PR comment body
 * @param {Object} results - Test results
 * @param {Object} options - Report options
 * @returns {string} Comment body markdown
 */
function generatePRComment(results, options = {}) {
  const {
    title = 'Test Results',
    showDetails = true,
    showFailures = true,
    maxFailures = 5,
    coverage = null,
  } = options;

  const lines = [];

  // Header
  const overallStatus = results.failed === 0 ? 'passed' : 'failed';
  lines.push(`## ${getStatusEmoji(overallStatus)} ${title}`);
  lines.push('');

  // Summary
  lines.push(`| Status | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| ✅ Passed | ${results.passed} |`);
  lines.push(`| ❌ Failed | ${results.failed} |`);
  if (results.skipped > 0) {
    lines.push(`| ⏭️ Skipped | ${results.skipped} |`);
  }
  lines.push(`| **Total** | **${results.total}** |`);
  lines.push('');

  if (results.duration > 0) {
    lines.push(`⏱️ Duration: ${formatDuration(results.duration)}`);
    lines.push('');
  }

  // Coverage
  if (coverage) {
    lines.push('### Coverage');
    lines.push('');
    lines.push(`| Metric | Coverage |`);
    lines.push(`|--------|----------|`);
    if (coverage.lines !== undefined) {
      lines.push(`| Lines | ${coverage.lines.toFixed(1)}% |`);
    }
    if (coverage.statements !== undefined) {
      lines.push(`| Statements | ${coverage.statements.toFixed(1)}% |`);
    }
    if (coverage.functions !== undefined) {
      lines.push(`| Functions | ${coverage.functions.toFixed(1)}% |`);
    }
    if (coverage.branches !== undefined) {
      lines.push(`| Branches | ${coverage.branches.toFixed(1)}% |`);
    }
    lines.push('');
  }

  // Failures
  if (showFailures && results.failures.length > 0) {
    lines.push('### Failed Tests');
    lines.push('');

    const failuresToShow = results.failures.slice(0, maxFailures);
    for (const failure of failuresToShow) {
      lines.push(`<details>`);
      lines.push(`<summary>❌ ${failure.test}</summary>`);
      lines.push('');
      lines.push('```');
      lines.push(`File: ${failure.file}`);
      lines.push(failure.message.slice(0, 500));
      lines.push('```');
      lines.push('</details>');
      lines.push('');
    }

    if (results.failures.length > maxFailures) {
      lines.push(`...and ${results.failures.length - maxFailures} more failures`);
      lines.push('');
    }
  }

  // Suite details
  if (showDetails && results.suites.length > 0) {
    lines.push('<details>');
    lines.push('<summary>📁 Test Suites</summary>');
    lines.push('');
    lines.push('| Suite | Passed | Failed | Skipped |');
    lines.push('|-------|--------|--------|---------|');

    for (const suite of results.suites) {
      const status = suite.failed > 0 ? '❌' : '✅';
      const name = suite.name.length > 50 ? '...' + suite.name.slice(-47) : suite.name;
      lines.push(`| ${status} ${name} | ${suite.passed} | ${suite.failed} | ${suite.skipped} |`);
    }

    lines.push('</details>');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('*Generated by TLC*');

  return lines.join('\n');
}

/**
 * Generate GitHub step summary
 * @param {Object} results - Test results
 * @param {Object} options - Report options
 * @returns {string} Step summary markdown
 */
function generateStepSummary(results, options = {}) {
  // Step summary uses the same format as PR comment
  return generatePRComment(results, options);
}

/**
 * Generate short status line
 * @param {Object} results - Test results
 * @returns {string} Status line
 */
function generateStatusLine(results) {
  const emoji = results.failed === 0 ? '✅' : '❌';
  const status = results.failed === 0 ? 'passed' : 'failed';

  return `${emoji} ${results.passed}/${results.total} tests ${status}`;
}

/**
 * Create PR report generator
 * @param {Object} options - Generator options
 * @returns {Object} Report generator
 */
function createPRReportGenerator(options = {}) {
  return {
    parseResults: parseTestResults,
    parseVitest: parseVitestOutput,
    parsePytest: parsePytestOutput,
    parseGo: parseGoTestOutput,
    generateComment: (results, opts) => generatePRComment(results, { ...options, ...opts }),
    generateSummary: (results, opts) => generateStepSummary(results, { ...options, ...opts }),
    generateStatusLine,
    formatDuration,
    getStatusEmoji,
  };
}

module.exports = {
  formatDuration,
  getStatusEmoji,
  parseVitestOutput,
  parsePytestOutput,
  parseGoTestOutput,
  parseTestResults,
  generatePRComment,
  generateStepSummary,
  generateStatusLine,
  createPRReportGenerator,
};
