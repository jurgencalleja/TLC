/**
 * Edge Cases Command - CLI interface for edge case test generation
 */

const {
  parseFunction,
  generateEdgeCases,
} = require('./edge-case-generator.js');

/**
 * Analyze file content and extract functions with edge cases
 * @param {string} fileContent - Source file content
 * @returns {Object} Analysis result
 */
function analyzeTarget(fileContent) {
  const functions = [];
  const byCategory = {};

  // Find all function declarations
  // Match regular functions
  const fnRegex = /(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/g;
  // Match arrow functions
  const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;

  let match;

  // Extract function blocks for parsing
  const lines = fileContent.split('\n');
  let currentFn = null;
  let braceCount = 0;
  let fnBuffer = [];

  for (const line of lines) {
    // Check for function start
    const fnMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/);
    const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);

    if (fnMatch || arrowMatch) {
      if (currentFn && fnBuffer.length > 0) {
        // Process previous function
        processFunctionBuffer(fnBuffer.join('\n'), functions, byCategory);
      }
      currentFn = fnMatch ? fnMatch[1] : arrowMatch[1];
      fnBuffer = [line];
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    } else if (currentFn) {
      fnBuffer.push(line);
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      if (braceCount <= 0) {
        // End of function
        processFunctionBuffer(fnBuffer.join('\n'), functions, byCategory);
        currentFn = null;
        fnBuffer = [];
        braceCount = 0;
      }
    }
  }

  // Process any remaining function
  if (currentFn && fnBuffer.length > 0) {
    processFunctionBuffer(fnBuffer.join('\n'), functions, byCategory);
  }

  const totalEdgeCases = functions.reduce((sum, fn) => sum + fn.edgeCases.length, 0);

  return {
    functions,
    totalFunctions: functions.length,
    totalEdgeCases,
    byCategory,
  };
}

/**
 * Process a function buffer and add to results
 */
function processFunctionBuffer(code, functions, byCategory) {
  const parsed = parseFunction(code);
  if (!parsed) return;

  const edgeCases = generateEdgeCases(parsed);

  // Count by category
  for (const ec of edgeCases) {
    byCategory[ec.category] = (byCategory[ec.category] || 0) + 1;
  }

  functions.push({
    name: parsed.name,
    params: parsed.params,
    types: parsed.types,
    async: parsed.async,
    edgeCases,
  });
}

/**
 * Format analysis summary for CLI output
 * @param {Object} analysis - Analysis result
 * @returns {string} Formatted summary
 */
function formatEdgeCaseSummary(analysis) {
  const lines = [];

  lines.push('');
  lines.push('Edge Case Analysis');
  lines.push('══════════════════');
  lines.push('');
  lines.push(`Functions: ${analysis.totalFunctions}`);
  lines.push(`Edge Cases: ${analysis.totalEdgeCases}`);
  lines.push('');

  // Category breakdown
  if (Object.keys(analysis.byCategory).length > 0) {
    lines.push('By Category:');
    for (const [category, count] of Object.entries(analysis.byCategory)) {
      lines.push(`  ${category}: ${count}`);
    }
    lines.push('');
  }

  // Function list
  lines.push('Functions:');
  for (const fn of analysis.functions) {
    lines.push(`  ${fn.name}(${fn.params.join(', ')}) - ${fn.edgeCases.length} edge cases`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format edge cases for selection
 * @param {Array} edgeCases - Array of edge cases
 * @returns {string} Formatted selection list
 */
function formatEdgeCaseSelection(edgeCases) {
  const lines = [];

  lines.push('');
  lines.push('Select edge cases to generate:');
  lines.push('');

  // Group by category
  const byCategory = {};
  for (const ec of edgeCases) {
    if (!byCategory[ec.category]) {
      byCategory[ec.category] = [];
    }
    byCategory[ec.category].push(ec);
  }

  let index = 1;
  for (const [category, cases] of Object.entries(byCategory)) {
    lines.push(`${category}:`);
    for (const ec of cases) {
      lines.push(`  [${index}] ${ec.description}`);
      index++;
    }
    lines.push('');
  }

  lines.push('[A] All - Generate all edge cases');
  lines.push('[N] None - Cancel');
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  analyzeTarget,
  formatEdgeCaseSummary,
  formatEdgeCaseSelection,
};
