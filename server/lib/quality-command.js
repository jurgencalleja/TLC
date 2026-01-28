const fs = require('fs');
const path = require('path');
const {
  parseCoverageData,
  detectEdgeCasesFromContent,
  calculateScore,
  generateRecommendations,
  EDGE_CASE_PATTERNS,
} = require('./quality-scorer.js');

/**
 * Run quality analysis on test suite
 * @param {Object} options - Analysis options
 * @param {Object} options.coverage - Coverage data {lines, branches, functions, statements}
 * @param {string[]} options.testFiles - List of test file paths
 * @param {Object} options.testContent - Map of file path to content
 * @returns {Promise<Object>} Analysis result
 */
async function runQualityAnalysis(options) {
  const { coverage, testFiles, testContent } = options;

  // Aggregate edge cases across all test files
  const allEdgeCaseCategories = Object.keys(EDGE_CASE_PATTERNS);
  const coveredCategories = new Set();

  for (const file of testFiles) {
    const content = testContent[file] || '';
    const missing = detectEdgeCasesFromContent(content);

    // Categories that are NOT missing are covered
    for (const category of allEdgeCaseCategories) {
      if (!missing.includes(category)) {
        coveredCategories.add(category);
      }
    }
  }

  const coveredList = Array.from(coveredCategories);
  const missingList = allEdgeCaseCategories.filter(c => !coveredCategories.has(c));

  // Calculate quality score
  const edgeCasesMissing = missingList.length;
  const edgeCasesTotal = allEdgeCaseCategories.length;
  const score = calculateScore(coverage, edgeCasesMissing, edgeCasesTotal);

  // Generate recommendations
  const recommendations = generateRecommendations(
    coverage,
    missingList,
    [] // uncovered files - would need file-level coverage data
  );

  return {
    score,
    coverage,
    edgeCases: {
      missing: missingList,
      covered: coveredList,
      total: edgeCasesTotal,
    },
    recommendations,
  };
}

/**
 * Generate markdown quality report
 * @param {Object} analysis - Analysis result from runQualityAnalysis
 * @returns {string} Markdown report content
 */
function generateQualityReport(analysis) {
  const { score, coverage, edgeCases, recommendations, timestamp } = analysis;

  const lines = [];
  lines.push('# Test Quality Report');
  lines.push('');
  lines.push(`Generated: ${timestamp || new Date().toISOString()}`);
  lines.push('');

  // Score section
  lines.push(`## Score: ${score}/100`);
  lines.push('');

  if (score === 100) {
    lines.push('Test quality is **excellent**! Full coverage and all edge cases addressed.');
  } else if (score >= 80) {
    lines.push('Test quality is **good**. Some minor improvements possible.');
  } else if (score >= 60) {
    lines.push('Test quality is **fair**. Several areas need improvement.');
  } else {
    lines.push('Test quality **needs attention**. Significant gaps in coverage or edge cases.');
  }
  lines.push('');

  // Coverage section
  lines.push('## Coverage');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Lines | ${coverage.lines}% |`);
  lines.push(`| Branches | ${coverage.branches}% |`);
  lines.push(`| Functions | ${coverage.functions}% |`);
  lines.push(`| Statements | ${coverage.statements}% |`);
  lines.push('');

  // Edge cases section
  lines.push('## Edge Cases');
  lines.push('');

  if (edgeCases.covered.length > 0) {
    lines.push('**Covered:**');
    for (const category of edgeCases.covered) {
      lines.push(`- ✓ ${category}`);
    }
    lines.push('');
  }

  if (edgeCases.missing.length > 0) {
    lines.push('**Missing:**');
    for (const category of edgeCases.missing) {
      lines.push(`- ✗ ${category}`);
    }
    lines.push('');
  }

  // Recommendations section
  if (recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    lines.push('| Priority | Type | Action |');
    lines.push('|----------|------|--------|');
    for (const rec of recommendations) {
      const file = rec.file ? ` (${rec.file})` : '';
      lines.push(`| ${rec.priority} | ${rec.type} | ${rec.message}${file} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format analysis for CLI output
 * @param {Object} analysis - Analysis result
 * @returns {string} Formatted CLI output
 */
function formatQualityOutput(analysis) {
  const { score, coverage, edgeCases, recommendations } = analysis;

  const lines = [];

  // Score with visual bar
  const barLength = 20;
  const filledLength = Math.round((score / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  lines.push('');
  lines.push(`Quality Score: ${score}/100`);
  lines.push(`[${bar}]`);
  lines.push('');

  // Coverage breakdown
  lines.push('Coverage:');
  lines.push(`  Lines:      ${coverage.lines}%`);
  lines.push(`  Branches:   ${coverage.branches}%`);
  lines.push(`  Functions:  ${coverage.functions}%`);
  lines.push(`  Statements: ${coverage.statements}%`);
  lines.push('');

  // Edge cases
  lines.push('Edge Cases:');
  if (edgeCases.covered.length > 0) {
    lines.push(`  ✓ ${edgeCases.covered.join(', ')}`);
  }
  if (edgeCases.missing.length > 0) {
    lines.push(`  ✗ Missing: ${edgeCases.missing.join(', ')}`);
  }
  lines.push('');

  // Top recommendations
  if (recommendations.length > 0) {
    lines.push('Recommendations:');
    const topRecs = recommendations.slice(0, 5);
    for (const rec of topRecs) {
      const icon = rec.priority === 'HIGH' ? '!' : rec.priority === 'MEDIUM' ? '·' : ' ';
      lines.push(`  ${icon} ${rec.message}`);
    }
    if (recommendations.length > 5) {
      lines.push(`  ... and ${recommendations.length - 5} more`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  runQualityAnalysis,
  generateQualityReport,
  formatQualityOutput,
};
