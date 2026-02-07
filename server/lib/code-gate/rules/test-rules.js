/**
 * Test Rules
 *
 * Detects test files with no assertions, skipped tests,
 * and other test quality issues.
 *
 * @module code-gate/rules/test-rules
 */

/**
 * Check if a file is a test file.
 * @param {string} filePath
 * @returns {boolean}
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(filePath);
}

/**
 * Check for test files that contain no assertions.
 * Tests without expect(), assert, or should are likely empty stubs.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array<{severity: string, rule: string, line: number, message: string, fix: string}>}
 */
function checkEmptyTests(filePath, content) {
  if (!isTestFile(filePath)) return [];

  const hasAssertion =
    /\bexpect\s*\(/.test(content) ||
    /\bassert\b/.test(content) ||
    /\.should\b/.test(content);

  if (!hasAssertion) {
    return [{
      severity: 'block',
      rule: 'no-empty-tests',
      line: 1,
      message: 'Test file contains no assertions',
      fix: 'Add expect() or assert calls to verify behavior',
    }];
  }

  return [];
}

/**
 * Check for skipped tests (.skip, xit, xdescribe).
 * Skipped tests hide regressions.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {Array}
 */
function checkSkippedTests(filePath, content) {
  if (!isTestFile(filePath)) return [];
  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const skipPatterns = [
      { pattern: /\bdescribe\.skip\s*\(/, label: 'describe.skip' },
      { pattern: /\bit\.skip\s*\(/, label: 'it.skip' },
      { pattern: /\btest\.skip\s*\(/, label: 'test.skip' },
      { pattern: /\bxdescribe\s*\(/, label: 'xdescribe' },
      { pattern: /\bxit\s*\(/, label: 'xit' },
      { pattern: /\bxtest\s*\(/, label: 'xtest' },
    ];

    for (const { pattern, label } of skipPatterns) {
      if (pattern.test(line)) {
        findings.push({
          severity: 'warn',
          rule: 'no-skipped-tests',
          line: i + 1,
          message: `Skipped test found: ${label}`,
          fix: 'Remove .skip or fix the test — skipped tests hide regressions',
        });
        break;
      }
    }
  }

  return findings;
}

module.exports = {
  checkEmptyTests,
  checkSkippedTests,
};
