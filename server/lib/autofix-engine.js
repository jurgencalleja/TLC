/**
 * AutoFix Engine - Analyze and fix failing tests automatically
 */

/**
 * Error patterns for common test failures
 */
const ERROR_PATTERNS = [
  {
    name: 'null-property-access',
    regex: /Cannot read propert(?:y|ies) of null \(reading '([^']+)'\)/,
    extract: (match) => ({ property: match[1] }),
  },
  {
    name: 'undefined-property-access',
    regex: /Cannot read propert(?:y|ies) of undefined \(reading '([^']+)'\)/,
    extract: (match) => ({ property: match[1] }),
  },
  {
    name: 'expected-value-mismatch',
    regex: /expected (undefined|null|'[^']*'|\d+) to (?:equal|be|match|contain)/i,
    extract: (match) => ({ actual: match[1] }),
  },
  {
    name: 'module-not-found',
    regex: /Cannot find module '([^']+)'/,
    extract: (match) => ({ module: match[1] }),
  },
  {
    name: 'function-not-defined',
    regex: /(\w+) is not defined/,
    extract: (match) => ({ name: match[1] }),
  },
  {
    name: 'function-not-a-function',
    regex: /(\w+) is not a function/,
    extract: (match) => ({ name: match[1] }),
  },
  {
    name: 'timeout',
    regex: /Timeout of \d+ms exceeded/,
    extract: () => ({}),
  },
];

/**
 * Parse test failure from test runner output
 * Supports Vitest, Jest, and Mocha formats
 * @param {string} output - Test runner output
 * @returns {Object|null} Parsed failure info
 */
function parseTestFailure(output) {
  // Try Vitest format first
  // FAIL  src/auth.test.ts > login > rejects invalid password
  const vitestMatch = output.match(/FAIL\s+(\S+)\s+>\s+(.+)/);
  if (vitestMatch) {
    const file = vitestMatch[1];
    const testPath = vitestMatch[2];
    const testName = testPath.split(' > ').pop();

    // Extract error message
    const errorMatch = output.match(/(AssertionError|TypeError|ReferenceError|Error):\s*(.+)/);
    const error = errorMatch ? errorMatch[2].trim() : '';

    // Extract line number
    const lineMatch = output.match(new RegExp(`at ${file.replace(/\./g, '\\.')}:(\\d+)`));
    const line = lineMatch ? parseInt(lineMatch[1], 10) : null;

    return { testName, error, file, line };
  }

  // Try Jest format
  // ● login › rejects invalid password
  const jestMatch = output.match(/●\s+(.+?)\s+›\s+(.+)/);
  if (jestMatch) {
    const testName = jestMatch[2].trim();

    // Extract error
    const errorMatch = output.match(/(TypeError|ReferenceError|AssertionError|Error):\s*(.+)/);
    const error = errorMatch ? errorMatch[2].trim() : '';

    // Extract file and line
    const locMatch = output.match(/at .+? \((.+?):(\d+):\d+\)/);
    const file = locMatch ? locMatch[1] : null;
    const line = locMatch ? parseInt(locMatch[2], 10) : null;

    return { testName, error, file, line };
  }

  // Try Mocha format
  // 1) login
  //    rejects invalid password:
  const mochaMatch = output.match(/\d+\)\s+(.+)\n\s+(.+):/);
  if (mochaMatch) {
    const testName = mochaMatch[2].trim();

    // Extract error
    const errorMatch = output.match(/(AssertionError|TypeError|ReferenceError|Error):\s*(.+)/);
    const error = errorMatch ? errorMatch[2].trim() : '';

    // Extract file and line
    const locMatch = output.match(/at .+? \((.+?):(\d+):\d+\)/);
    const file = locMatch ? locMatch[1] : null;
    const line = locMatch ? parseInt(locMatch[2], 10) : null;

    return { testName, error, file, line };
  }

  return null;
}

/**
 * Match error message against known patterns
 * @param {string} error - Error message
 * @returns {Object|null} Matched pattern info
 */
function matchErrorPattern(error) {
  for (const pattern of ERROR_PATTERNS) {
    const match = error.match(pattern.regex);
    if (match) {
      const extracted = pattern.extract ? pattern.extract(match) : {};
      return {
        pattern: pattern.name,
        ...extracted,
      };
    }
  }
  return null;
}

/**
 * Generate fix proposal based on failure and pattern
 * @param {Object} failure - Parsed failure info
 * @param {Object|null} pattern - Matched pattern
 * @returns {Object} Fix proposal
 */
function generateFixProposal(failure, pattern) {
  if (!pattern) {
    return {
      description: 'Unable to auto-fix. manual investigation required.',
      suggestedFix: null,
      confidence: 'low',
    };
  }

  switch (pattern.pattern) {
    case 'null-property-access':
    case 'undefined-property-access':
      return {
        description: `Add null check before accessing '${pattern.property}'`,
        suggestedFix: `if (obj != null) { /* access ${pattern.property} */ }`,
        confidence: 'medium',
        location: { file: failure.file, line: failure.line },
      };

    case 'expected-value-mismatch':
      return {
        description: 'Function may not be returning expected value. Check return statement.',
        suggestedFix: 'Ensure function returns the expected value',
        confidence: 'low',
        location: { file: failure.file, line: failure.line },
      };

    case 'module-not-found':
      return {
        description: `Add missing import for module '${pattern.module}'`,
        suggestedFix: `import { ... } from '${pattern.module}';`,
        confidence: 'high',
        location: { file: failure.file, line: 1 },
      };

    case 'function-not-defined':
      return {
        description: `Function '${pattern.name}' is not defined. Add import or define it.`,
        suggestedFix: `import { ${pattern.name} } from './module'; // or define function`,
        confidence: 'medium',
        location: { file: failure.file, line: failure.line },
      };

    case 'function-not-a-function':
      return {
        description: `'${pattern.name}' is not a function. Check import/export.`,
        suggestedFix: `Verify ${pattern.name} is exported as a function`,
        confidence: 'medium',
        location: { file: failure.file, line: failure.line },
      };

    case 'timeout':
      return {
        description: 'Test timed out. Check for missing async/await or increase timeout.',
        suggestedFix: 'Add await or increase test timeout',
        confidence: 'medium',
        location: { file: failure.file, line: failure.line },
      };

    default:
      return {
        description: 'Unable to auto-fix. manual investigation required.',
        suggestedFix: null,
        confidence: 'low',
      };
  }
}

module.exports = {
  parseTestFailure,
  matchErrorPattern,
  generateFixProposal,
  ERROR_PATTERNS,
};
