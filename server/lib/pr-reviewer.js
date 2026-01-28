/**
 * PR Reviewer Module
 * Automatically reviews code changes for TLC compliance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Get changed files between two refs
 * @param {string} base - Base ref (e.g., 'main')
 * @param {string} head - Head ref (e.g., 'HEAD')
 * @param {string} cwd - Working directory
 * @returns {Array} List of changed files with status
 */
function getChangedFiles(base = 'main', head = 'HEAD', cwd = process.cwd()) {
  try {
    const output = execSync(`git diff --name-status ${base}...${head}`, {
      cwd,
      encoding: 'utf-8',
    });

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [status, ...fileParts] = line.split('\t');
        return {
          status: status.trim(),
          file: fileParts.join('\t').trim(),
          isTest: isTestFile(fileParts.join('\t').trim()),
        };
      });
  } catch (e) {
    return [];
  }
}

/**
 * Check if a file is a test file
 * @param {string} filePath - File path
 * @returns {boolean}
 */
function isTestFile(filePath) {
  const testPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /test_.*\.py$/,
    /_test\.py$/,
    /_test\.go$/,
    /\.test\.go$/,
    /spec\/.*_spec\.rb$/,
    /__tests__\//,
    /tests?\//i,
  ];
  return testPatterns.some(p => p.test(filePath));
}

/**
 * Check if implementation file has corresponding test
 * @param {string} implFile - Implementation file path
 * @param {Array} allFiles - All changed files
 * @param {string} cwd - Working directory
 * @returns {Object} Test coverage info
 */
function findTestForFile(implFile, allFiles, cwd = process.cwd()) {
  // Skip if it's already a test file
  if (isTestFile(implFile)) {
    return { hasTest: true, isTestFile: true };
  }

  // Skip non-code files
  const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rb'];
  const ext = path.extname(implFile);
  if (!codeExtensions.includes(ext)) {
    return { hasTest: true, skipped: true, reason: 'non-code file' };
  }

  // Generate possible test file names
  const baseName = path.basename(implFile, ext);
  const dirName = path.dirname(implFile);

  const possibleTestFiles = [
    // Same directory patterns
    `${dirName}/${baseName}.test${ext}`,
    `${dirName}/${baseName}.spec${ext}`,
    `${dirName}/__tests__/${baseName}.test${ext}`,
    `${dirName}/__tests__/${baseName}${ext}`,
    // Test directory patterns
    `test/${dirName}/${baseName}.test${ext}`,
    `tests/${dirName}/${baseName}.test${ext}`,
    `test/${baseName}.test${ext}`,
    `tests/${baseName}.test${ext}`,
    // Python patterns
    `${dirName}/test_${baseName}.py`,
    `tests/test_${baseName}.py`,
    // Go patterns
    `${dirName}/${baseName}_test.go`,
  ];

  // Check if any test file exists in changed files
  const changedTestFile = allFiles.find(
    f => f.isTest && possibleTestFiles.some(p => f.file.includes(baseName))
  );

  if (changedTestFile) {
    return { hasTest: true, testFile: changedTestFile.file, inChangeset: true };
  }

  // Check if test file exists on disk
  for (const testFile of possibleTestFiles) {
    const fullPath = path.join(cwd, testFile);
    if (fs.existsSync(fullPath)) {
      return { hasTest: true, testFile, existsOnDisk: true };
    }
  }

  return { hasTest: false, searchedPatterns: possibleTestFiles.slice(0, 3) };
}

/**
 * Analyze commit order to verify test-first development
 * @param {string} base - Base ref
 * @param {string} head - Head ref
 * @param {string} cwd - Working directory
 * @returns {Object} Commit order analysis
 */
function analyzeCommitOrder(base = 'main', head = 'HEAD', cwd = process.cwd()) {
  try {
    const output = execSync(
      `git log --oneline --name-status ${base}..${head}`,
      { cwd, encoding: 'utf-8' }
    );

    const commits = [];
    let currentCommit = null;

    for (const line of output.split('\n')) {
      if (/^[a-f0-9]{7,}/.test(line)) {
        if (currentCommit) commits.push(currentCommit);
        const [hash, ...msgParts] = line.split(' ');
        currentCommit = {
          hash,
          message: msgParts.join(' '),
          files: [],
          hasTests: false,
          hasImpl: false,
        };
      } else if (currentCommit && line.trim()) {
        const [status, file] = line.split('\t');
        if (file) {
          const isTest = isTestFile(file);
          currentCommit.files.push({ status, file, isTest });
          if (isTest) currentCommit.hasTests = true;
          else currentCommit.hasImpl = true;
        }
      }
    }
    if (currentCommit) commits.push(currentCommit);

    // Analyze TDD compliance
    const analysis = {
      commits: commits.length,
      testFirstCommits: 0,
      implOnlyCommits: 0,
      mixedCommits: 0,
      violations: [],
    };

    for (const commit of commits) {
      if (commit.hasTests && !commit.hasImpl) {
        analysis.testFirstCommits++;
      } else if (commit.hasImpl && !commit.hasTests) {
        analysis.implOnlyCommits++;
        // Check if it's a fix/refactor (acceptable)
        const isFixOrRefactor = /^(fix|refactor|chore|docs|style):/i.test(commit.message);
        if (!isFixOrRefactor) {
          analysis.violations.push({
            commit: commit.hash,
            message: commit.message,
            reason: 'Implementation without tests',
          });
        }
      } else if (commit.hasTests && commit.hasImpl) {
        analysis.mixedCommits++;
      }
    }

    analysis.tddScore = commits.length > 0
      ? Math.round((analysis.testFirstCommits / commits.length) * 100)
      : 100;

    return analysis;
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Check for common security issues in diff
 * @param {string} base - Base ref
 * @param {string} head - Head ref
 * @param {string} cwd - Working directory
 * @returns {Array} Security issues found
 */
function checkSecurityIssues(base = 'main', head = 'HEAD', cwd = process.cwd()) {
  const issues = [];

  try {
    const diff = execSync(`git diff ${base}...${head}`, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const patterns = [
      { pattern: /password\s*=\s*['"][^'"]+['"]/gi, type: 'hardcoded-password', severity: 'high' },
      { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, type: 'hardcoded-api-key', severity: 'high' },
      { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, type: 'hardcoded-secret', severity: 'high' },
      { pattern: /eval\s*\(/g, type: 'eval-usage', severity: 'medium' },
      { pattern: /innerHTML\s*=/g, type: 'innerhtml-xss', severity: 'medium' },
      { pattern: /dangerouslySetInnerHTML/g, type: 'react-xss', severity: 'medium' },
      { pattern: /exec\s*\(\s*[`'"]/g, type: 'command-injection', severity: 'high' },
      { pattern: /SELECT.*FROM.*WHERE.*\+/gi, type: 'sql-injection', severity: 'high' },
      { pattern: /\.env(?:\.local)?$/gm, type: 'env-file-committed', severity: 'high' },
      { pattern: /console\.log\(/g, type: 'console-log', severity: 'low' },
      { pattern: /TODO|FIXME|HACK|XXX/g, type: 'todo-comment', severity: 'info' },
    ];

    // Only check added lines
    const addedLines = diff
      .split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'));

    for (const { pattern, type, severity } of patterns) {
      for (const line of addedLines) {
        if (pattern.test(line)) {
          issues.push({
            type,
            severity,
            line: line.slice(1).trim().slice(0, 100),
          });
        }
      }
    }
  } catch (e) {
    // Ignore diff errors
  }

  return issues;
}

/**
 * Generate review report
 * @param {Object} options - Review options
 * @returns {Object} Review report
 */
function generateReview(options = {}) {
  const {
    base = 'main',
    head = 'HEAD',
    cwd = process.cwd(),
    prNumber = null,
  } = options;

  const report = {
    timestamp: new Date().toISOString(),
    base,
    head,
    prNumber,
    passed: true,
    summary: [],
    details: {},
  };

  // 1. Get changed files
  const changedFiles = getChangedFiles(base, head, cwd);
  report.details.changedFiles = changedFiles;
  report.details.fileCount = changedFiles.length;

  // 2. Check test coverage for changed files
  const coverageIssues = [];
  const implFiles = changedFiles.filter(f => !f.isTest && f.status !== 'D');

  for (const file of implFiles) {
    const testInfo = findTestForFile(file.file, changedFiles, cwd);
    if (!testInfo.hasTest) {
      coverageIssues.push({
        file: file.file,
        issue: 'No test file found',
        suggestions: testInfo.searchedPatterns,
      });
    }
  }

  report.details.coverage = {
    implFiles: implFiles.length,
    testFiles: changedFiles.filter(f => f.isTest).length,
    missingTests: coverageIssues.length,
    issues: coverageIssues,
  };

  if (coverageIssues.length > 0) {
    report.passed = false;
    report.summary.push(`❌ ${coverageIssues.length} files missing tests`);
  } else {
    report.summary.push(`✅ All changed files have tests`);
  }

  // 3. Analyze commit order (TDD compliance)
  const commitAnalysis = analyzeCommitOrder(base, head, cwd);
  report.details.commits = commitAnalysis;

  if (commitAnalysis.tddScore !== undefined) {
    if (commitAnalysis.tddScore < 50 && commitAnalysis.commits > 2) {
      report.passed = false;
      report.summary.push(`❌ TDD score: ${commitAnalysis.tddScore}% (target: 50%+)`);
    } else {
      report.summary.push(`✅ TDD score: ${commitAnalysis.tddScore}%`);
    }

    if (commitAnalysis.violations.length > 0) {
      report.summary.push(`⚠️ ${commitAnalysis.violations.length} commits without tests`);
    }
  }

  // 4. Security check
  const securityIssues = checkSecurityIssues(base, head, cwd);
  report.details.security = securityIssues;

  const highSeverity = securityIssues.filter(i => i.severity === 'high');
  const mediumSeverity = securityIssues.filter(i => i.severity === 'medium');

  if (highSeverity.length > 0) {
    report.passed = false;
    report.summary.push(`❌ ${highSeverity.length} high severity security issues`);
  }
  if (mediumSeverity.length > 0) {
    report.summary.push(`⚠️ ${mediumSeverity.length} medium severity security issues`);
  }
  if (highSeverity.length === 0 && mediumSeverity.length === 0) {
    report.summary.push(`✅ No security issues detected`);
  }

  // 5. Overall verdict
  report.verdict = report.passed ? 'APPROVED' : 'CHANGES_REQUESTED';

  return report;
}

/**
 * Format review report as markdown
 * @param {Object} report - Review report
 * @returns {string} Markdown formatted report
 */
function formatReviewMarkdown(report) {
  const lines = [];

  lines.push('# Code Review Report');
  lines.push('');
  lines.push(`**Date:** ${report.timestamp}`);
  lines.push(`**Base:** ${report.base} → **Head:** ${report.head}`);
  if (report.prNumber) {
    lines.push(`**PR:** #${report.prNumber}`);
  }
  lines.push('');

  // Verdict
  const verdictEmoji = report.passed ? '✅' : '❌';
  lines.push(`## ${verdictEmoji} Verdict: ${report.verdict}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  for (const item of report.summary) {
    lines.push(`- ${item}`);
  }
  lines.push('');

  // Coverage details
  if (report.details.coverage.missingTests > 0) {
    lines.push('## Missing Tests');
    lines.push('');
    lines.push('| File | Suggested Test Location |');
    lines.push('|------|------------------------|');
    for (const issue of report.details.coverage.issues) {
      const suggestion = issue.suggestions?.[0] || 'N/A';
      lines.push(`| \`${issue.file}\` | \`${suggestion}\` |`);
    }
    lines.push('');
  }

  // TDD violations
  if (report.details.commits.violations?.length > 0) {
    lines.push('## TDD Violations');
    lines.push('');
    lines.push('| Commit | Message | Issue |');
    lines.push('|--------|---------|-------|');
    for (const v of report.details.commits.violations) {
      lines.push(`| \`${v.commit}\` | ${v.message.slice(0, 40)} | ${v.reason} |`);
    }
    lines.push('');
  }

  // Security issues
  const importantSecurity = report.details.security.filter(
    i => i.severity === 'high' || i.severity === 'medium'
  );
  if (importantSecurity.length > 0) {
    lines.push('## Security Issues');
    lines.push('');
    lines.push('| Severity | Type | Sample |');
    lines.push('|----------|------|--------|');
    for (const issue of importantSecurity) {
      lines.push(`| ${issue.severity.toUpperCase()} | ${issue.type} | \`${issue.line.slice(0, 50)}\` |`);
    }
    lines.push('');
  }

  // Stats
  lines.push('## Statistics');
  lines.push('');
  lines.push(`- Files changed: ${report.details.fileCount}`);
  lines.push(`- Implementation files: ${report.details.coverage.implFiles}`);
  lines.push(`- Test files: ${report.details.coverage.testFiles}`);
  if (report.details.commits.commits) {
    lines.push(`- Commits: ${report.details.commits.commits}`);
    lines.push(`- TDD Score: ${report.details.commits.tddScore}%`);
  }

  return lines.join('\n');
}

/**
 * Run review and return result
 * @param {Object} options - Review options
 * @returns {Object} Review result with report and formatted output
 */
function runReview(options = {}) {
  const report = generateReview(options);
  const markdown = formatReviewMarkdown(report);

  return {
    report,
    markdown,
    passed: report.passed,
    verdict: report.verdict,
  };
}

module.exports = {
  getChangedFiles,
  isTestFile,
  findTestForFile,
  analyzeCommitOrder,
  checkSecurityIssues,
  generateReview,
  formatReviewMarkdown,
  runReview,
};
