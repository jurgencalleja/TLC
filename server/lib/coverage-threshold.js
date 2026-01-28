/**
 * Coverage Threshold Module
 * Parses coverage reports and enforces minimum thresholds
 */

/**
 * Coverage report formats
 */
const COVERAGE_FORMATS = {
  ISTANBUL: 'istanbul',
  VITEST: 'vitest',
  JEST: 'jest',
  PYTEST: 'pytest',
  GO: 'go',
};

/**
 * Parse Istanbul/NYC coverage summary JSON
 * @param {Object} summary - Coverage summary JSON
 * @returns {Object} Parsed coverage
 */
function parseIstanbulSummary(summary) {
  if (!summary || !summary.total) {
    return null;
  }

  const total = summary.total;
  return {
    format: COVERAGE_FORMATS.ISTANBUL,
    lines: total.lines?.pct ?? 0,
    statements: total.statements?.pct ?? 0,
    functions: total.functions?.pct ?? 0,
    branches: total.branches?.pct ?? 0,
    // File-level coverage
    files: Object.entries(summary)
      .filter(([key]) => key !== 'total')
      .map(([file, data]) => ({
        file,
        lines: data.lines?.pct ?? 0,
        statements: data.statements?.pct ?? 0,
        functions: data.functions?.pct ?? 0,
        branches: data.branches?.pct ?? 0,
      })),
  };
}

/**
 * Parse Vitest/Jest coverage JSON
 * @param {Object} report - Coverage report
 * @returns {Object} Parsed coverage
 */
function parseVitestCoverage(report) {
  // Handle coverage-final.json format
  if (!report || typeof report !== 'object') {
    return null;
  }

  // Vitest outputs Istanbul-compatible format
  if (report.total) {
    return parseIstanbulSummary(report);
  }

  let totalLines = 0;
  let coveredLines = 0;
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  const files = [];

  for (const [file, data] of Object.entries(report)) {
    if (!data.s || !data.f) continue;

    const statements = Object.values(data.s);
    const functions = Object.values(data.f);
    const branches = data.b ? Object.values(data.b).flat() : [];

    const fileStmtTotal = statements.length;
    const fileStmtCovered = statements.filter(c => c > 0).length;
    const fileFnTotal = functions.length;
    const fileFnCovered = functions.filter(c => c > 0).length;
    const fileBrTotal = branches.length;
    const fileBrCovered = branches.filter(c => c > 0).length;

    totalStatements += fileStmtTotal;
    coveredStatements += fileStmtCovered;
    totalFunctions += fileFnTotal;
    coveredFunctions += fileFnCovered;
    totalBranches += fileBrTotal;
    coveredBranches += fileBrCovered;

    files.push({
      file,
      statements: fileStmtTotal > 0 ? (fileStmtCovered / fileStmtTotal) * 100 : 100,
      functions: fileFnTotal > 0 ? (fileFnCovered / fileFnTotal) * 100 : 100,
      branches: fileBrTotal > 0 ? (fileBrCovered / fileBrTotal) * 100 : 100,
      lines: fileStmtTotal > 0 ? (fileStmtCovered / fileStmtTotal) * 100 : 100,
    });
  }

  return {
    format: COVERAGE_FORMATS.VITEST,
    statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    lines: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    files,
  };
}

/**
 * Parse pytest coverage output
 * @param {string} output - Pytest coverage output text
 * @returns {Object} Parsed coverage
 */
function parsePytestCoverage(output) {
  if (!output || typeof output !== 'string') {
    return null;
  }

  const files = [];
  let totalStatements = 0;
  let coveredStatements = 0;

  // Match pytest-cov table format
  // Name                      Stmts   Miss  Cover
  const lineRegex = /^(\S+)\s+(\d+)\s+(\d+)\s+(\d+)%/gm;
  let match;

  while ((match = lineRegex.exec(output)) !== null) {
    const [, file, stmts, miss, pct] = match;
    if (file === 'TOTAL' || file === 'Name') continue;

    const stmtCount = parseInt(stmts, 10);
    const missCount = parseInt(miss, 10);

    files.push({
      file,
      statements: parseInt(pct, 10),
      lines: parseInt(pct, 10),
    });

    totalStatements += stmtCount;
    coveredStatements += stmtCount - missCount;
  }

  // Get total from TOTAL line
  const totalMatch = /^TOTAL\s+\d+\s+\d+\s+(\d+)%/m.exec(output);
  const totalPct = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  return {
    format: COVERAGE_FORMATS.PYTEST,
    statements: totalPct,
    lines: totalPct,
    functions: totalPct, // pytest doesn't separate these
    branches: totalPct,
    files,
  };
}

/**
 * Parse Go coverage output
 * @param {string} output - Go coverage output
 * @returns {Object} Parsed coverage
 */
function parseGoCoverage(output) {
  if (!output || typeof output !== 'string') {
    return null;
  }

  // go tool cover -func output:
  // file.go:10:  FuncName    100.0%
  // total:                   (statements)    85.5%
  const totalMatch = /total:\s+\(statements\)\s+([\d.]+)%/m.exec(output);
  const totalPct = totalMatch ? parseFloat(totalMatch[1]) : 0;

  const files = [];
  const fileRegex = /^(\S+\.go):\d+:\s+\S+\s+([\d.]+)%/gm;
  let match;

  const fileCoverage = {};

  while ((match = fileRegex.exec(output)) !== null) {
    const [, file, pct] = match;
    if (!fileCoverage[file]) {
      fileCoverage[file] = { total: 0, covered: 0 };
    }
    fileCoverage[file].total++;
    if (parseFloat(pct) === 100) {
      fileCoverage[file].covered++;
    }
  }

  for (const [file, data] of Object.entries(fileCoverage)) {
    files.push({
      file,
      statements: data.total > 0 ? (data.covered / data.total) * 100 : 0,
      lines: data.total > 0 ? (data.covered / data.total) * 100 : 0,
    });
  }

  return {
    format: COVERAGE_FORMATS.GO,
    statements: totalPct,
    lines: totalPct,
    functions: totalPct,
    branches: totalPct,
    files,
  };
}

/**
 * Auto-detect and parse coverage
 * @param {Object|string} input - Coverage data
 * @returns {Object} Parsed coverage
 */
function parseCoverage(input) {
  if (!input) {
    return null;
  }

  // JSON object
  if (typeof input === 'object') {
    if (input.total) {
      return parseIstanbulSummary(input);
    }
    return parseVitestCoverage(input);
  }

  // String output
  if (typeof input === 'string') {
    if (input.includes('total:') && input.includes('statements')) {
      return parseGoCoverage(input);
    }
    if (input.includes('Stmts') && input.includes('Miss')) {
      return parsePytestCoverage(input);
    }
  }

  return null;
}

/**
 * Check if coverage meets threshold
 * @param {Object} coverage - Parsed coverage
 * @param {Object} thresholds - Threshold requirements
 * @returns {Object} Threshold check result
 */
function checkThresholds(coverage, thresholds = {}) {
  const {
    lines = 0,
    statements = 0,
    functions = 0,
    branches = 0,
    perFile = null,
  } = thresholds;

  const failures = [];
  const passes = [];

  // Check global thresholds
  if (lines > 0 && coverage.lines < lines) {
    failures.push({
      metric: 'lines',
      threshold: lines,
      actual: coverage.lines,
    });
  } else if (lines > 0) {
    passes.push({ metric: 'lines', threshold: lines, actual: coverage.lines });
  }

  if (statements > 0 && coverage.statements < statements) {
    failures.push({
      metric: 'statements',
      threshold: statements,
      actual: coverage.statements,
    });
  } else if (statements > 0) {
    passes.push({ metric: 'statements', threshold: statements, actual: coverage.statements });
  }

  if (functions > 0 && coverage.functions < functions) {
    failures.push({
      metric: 'functions',
      threshold: functions,
      actual: coverage.functions,
    });
  } else if (functions > 0) {
    passes.push({ metric: 'functions', threshold: functions, actual: coverage.functions });
  }

  if (branches > 0 && coverage.branches < branches) {
    failures.push({
      metric: 'branches',
      threshold: branches,
      actual: coverage.branches,
    });
  } else if (branches > 0) {
    passes.push({ metric: 'branches', threshold: branches, actual: coverage.branches });
  }

  // Check per-file thresholds
  const fileFailures = [];
  if (perFile && coverage.files) {
    for (const file of coverage.files) {
      const fileThreshold = typeof perFile === 'number' ? perFile : (perFile.lines || 0);
      if (file.lines < fileThreshold) {
        fileFailures.push({
          file: file.file,
          threshold: fileThreshold,
          actual: file.lines,
        });
      }
    }
  }

  return {
    pass: failures.length === 0 && fileFailures.length === 0,
    failures,
    passes,
    fileFailures,
    coverage,
  };
}

/**
 * Format threshold result for display
 * @param {Object} result - Threshold check result
 * @returns {string} Formatted result
 */
function formatThresholdResult(result) {
  const lines = [];

  if (result.pass) {
    lines.push('# Coverage Threshold Check: PASSED');
    lines.push('');
    lines.push('All coverage thresholds met.');
  } else {
    lines.push('# Coverage Threshold Check: FAILED');
    lines.push('');
    lines.push('The following thresholds were not met:');
    lines.push('');

    for (const failure of result.failures) {
      lines.push(`- **${failure.metric}**: ${failure.actual.toFixed(2)}% (threshold: ${failure.threshold}%)`);
    }

    if (result.fileFailures.length > 0) {
      lines.push('');
      lines.push('## Files Below Threshold');
      lines.push('');
      for (const failure of result.fileFailures) {
        lines.push(`- ${failure.file}: ${failure.actual.toFixed(2)}% (threshold: ${failure.threshold}%)`);
      }
    }
  }

  lines.push('');
  lines.push('## Coverage Summary');
  lines.push('');
  lines.push(`| Metric | Coverage |`);
  lines.push(`|--------|----------|`);
  lines.push(`| Lines | ${result.coverage.lines.toFixed(2)}% |`);
  lines.push(`| Statements | ${result.coverage.statements.toFixed(2)}% |`);
  lines.push(`| Functions | ${result.coverage.functions.toFixed(2)}% |`);
  lines.push(`| Branches | ${result.coverage.branches.toFixed(2)}% |`);

  return lines.join('\n');
}

/**
 * Create coverage threshold checker
 * @param {Object} options - Checker options
 * @returns {Object} Threshold checker
 */
function createCoverageChecker(options = {}) {
  const { thresholds = {} } = options;

  return {
    parse: parseCoverage,
    check: (coverage) => checkThresholds(coverage, thresholds),
    format: formatThresholdResult,
    parseAndCheck: (input) => {
      const coverage = parseCoverage(input);
      if (!coverage) {
        return {
          pass: false,
          error: 'Could not parse coverage data',
        };
      }
      return checkThresholds(coverage, thresholds);
    },
  };
}

module.exports = {
  COVERAGE_FORMATS,
  parseIstanbulSummary,
  parseVitestCoverage,
  parsePytestCoverage,
  parseGoCoverage,
  parseCoverage,
  checkThresholds,
  formatThresholdResult,
  createCoverageChecker,
};
