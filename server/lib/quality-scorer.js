const fs = require('fs');
const path = require('path');

/**
 * Parse coverage data from coverage JSON object
 * Supports both Istanbul and Vitest coverage formats
 */
function parseCoverageData(data) {
  // Check if it's Istanbul summary format (has total key)
  if (data.total) {
    return {
      lines: data.total.lines?.pct ?? 0,
      branches: data.total.branches?.pct ?? 0,
      functions: data.total.functions?.pct ?? 0,
      statements: data.total.statements?.pct ?? 0,
    };
  }

  // Vitest coverage-final.json format: object with file paths as keys
  // Need to aggregate across all files
  const files = Object.values(data);
  if (files.length === 0) {
    return { lines: 0, branches: 0, functions: 0, statements: 0 };
  }

  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;

  for (const file of files) {
    // Statements
    if (file.s) {
      const stmtValues = Object.values(file.s);
      totalStatements += stmtValues.length;
      coveredStatements += stmtValues.filter(v => v > 0).length;
    }

    // Branches
    if (file.b) {
      for (const branchCounts of Object.values(file.b)) {
        totalBranches += branchCounts.length;
        coveredBranches += branchCounts.filter(v => v > 0).length;
      }
    }

    // Functions
    if (file.f) {
      const fnValues = Object.values(file.f);
      totalFunctions += fnValues.length;
      coveredFunctions += fnValues.filter(v => v > 0).length;
    }
  }

  const pct = (covered, total) => total === 0 ? 0 : (covered / total) * 100;

  return {
    lines: pct(coveredStatements, totalStatements), // Using statements as proxy for lines
    branches: pct(coveredBranches, totalBranches),
    functions: pct(coveredFunctions, totalFunctions),
    statements: pct(coveredStatements, totalStatements),
  };
}

/**
 * Parse coverage from file path (I/O wrapper)
 */
function parseCoverage(coveragePath) {
  if (!fs.existsSync(coveragePath)) {
    throw new Error('Coverage file not found: ' + coveragePath);
  }

  let data;
  try {
    const content = fs.readFileSync(coveragePath, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    throw new Error('Failed to parse coverage: ' + err.message);
  }

  return parseCoverageData(data);
}

/**
 * Edge case patterns to look for in test files
 */
const EDGE_CASE_PATTERNS = {
  'null-check': [/null/i, /\bnull\b/, /\bnil\b/],
  'empty-string': [/''|""/, /empty.*string/i, /\.length\s*===?\s*0/],
  'undefined-check': [/undefined/i, /\bundefined\b/],
  'boundary': [/\b0\b/, /\b-1\b/, /MAX_/, /MIN_/, /boundary/i, /edge/i],
  'error-handling': [/throw/, /reject/, /error/i, /catch/],
};

/**
 * Detect missing edge cases from test content
 */
function detectEdgeCasesFromContent(content) {
  const missing = [];

  for (const [category, patterns] of Object.entries(EDGE_CASE_PATTERNS)) {
    const hasPattern = patterns.some(pattern => pattern.test(content));
    if (!hasPattern) {
      missing.push(category);
    }
  }

  return missing;
}

/**
 * Detect missing edge cases in a test file (I/O wrapper)
 */
function detectEdgeCases(testFilePath) {
  const content = fs.readFileSync(testFilePath, 'utf-8');
  return detectEdgeCasesFromContent(content);
}

/**
 * Calculate quality score
 * Formula: 40% coverage + 30% edge cases + 30% mutation score (future)
 */
function calculateScore(coverage, edgeCasesMissing, edgeCasesTotal) {
  // Coverage score (40% weight)
  // Average of all coverage metrics
  const avgCoverage = (
    coverage.lines +
    coverage.branches +
    coverage.functions +
    coverage.statements
  ) / 4;
  const coverageScore = (avgCoverage / 100) * 40;

  // Edge case score (30% weight)
  // edgeCasesMissing = number of edge case categories NOT covered
  // edgeCasesTotal = total edge case categories expected
  let edgeCaseScore = 0;
  if (edgeCasesTotal > 0) {
    const edgeCaseCoverage = (edgeCasesTotal - edgeCasesMissing) / edgeCasesTotal;
    edgeCaseScore = edgeCaseCoverage * 30;
  }

  // Mutation score (30% weight) - placeholder for future
  const mutationScore = 0;

  return Math.round(coverageScore + edgeCaseScore + mutationScore);
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(coverage, missingEdgeCases, uncoveredFiles) {
  const recommendations = [];

  // Add recommendations for uncovered files (sorted by impact - more uncovered lines = higher priority)
  const sortedFiles = [...uncoveredFiles].sort((a, b) => b.lines.length - a.lines.length);

  for (const fileInfo of sortedFiles) {
    const lineCount = fileInfo.lines.length;
    let priority = 'LOW';
    if (lineCount > 10) priority = 'HIGH';
    else if (lineCount > 3) priority = 'MEDIUM';

    recommendations.push({
      type: 'coverage',
      priority,
      file: fileInfo.file,
      lines: fileInfo.lines,
      message: `Cover ${lineCount} uncovered lines in ${fileInfo.file}`,
    });
  }

  // Add recommendations for missing edge cases
  for (const category of missingEdgeCases) {
    recommendations.push({
      type: 'edge-case',
      priority: category === 'null-check' ? 'HIGH' : 'MEDIUM',
      category,
      message: `Add ${category} tests`,
    });
  }

  // Sort by priority
  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

module.exports = {
  parseCoverage,
  parseCoverageData,
  detectEdgeCases,
  detectEdgeCasesFromContent,
  calculateScore,
  generateRecommendations,
  EDGE_CASE_PATTERNS,
};
