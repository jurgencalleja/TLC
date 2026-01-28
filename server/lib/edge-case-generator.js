/**
 * Edge Case Generator - Generate edge case tests from code analysis
 */

/**
 * Edge case types by parameter type
 */
const EDGE_CASE_TYPES = {
  string: [
    { input: null, category: 'null-check', description: 'handles null' },
    { input: undefined, category: 'undefined-check', description: 'handles undefined' },
    { input: '', category: 'empty-string', description: 'handles empty string' },
    { input: '   ', category: 'whitespace', description: 'handles whitespace-only string' },
    { input: 'x'.repeat(10000), category: 'boundary', description: 'handles very long string' },
  ],
  number: [
    { input: null, category: 'null-check', description: 'handles null' },
    { input: undefined, category: 'undefined-check', description: 'handles undefined' },
    { input: 0, category: 'boundary', description: 'handles zero' },
    { input: -1, category: 'boundary', description: 'handles negative' },
    { input: Number.MAX_SAFE_INTEGER, category: 'boundary', description: 'handles max int' },
    { input: NaN, category: 'boundary', description: 'handles NaN' },
    { input: Infinity, category: 'boundary', description: 'handles Infinity' },
  ],
  array: [
    { input: null, category: 'null-check', description: 'handles null' },
    { input: undefined, category: 'undefined-check', description: 'handles undefined' },
    { input: [], category: 'empty', description: 'handles empty array' },
    { input: ['single'], category: 'boundary', description: 'handles single element' },
    { input: Array(1000).fill('x'), category: 'boundary', description: 'handles large array' },
  ],
  object: [
    { input: null, category: 'null-check', description: 'handles null' },
    { input: undefined, category: 'undefined-check', description: 'handles undefined' },
    { input: {}, category: 'empty', description: 'handles empty object' },
  ],
  boolean: [
    { input: true, category: 'truthy', description: 'handles true' },
    { input: false, category: 'falsy', description: 'handles false' },
    { input: null, category: 'null-check', description: 'handles null' },
  ],
  security: [
    { input: "'; DROP TABLE users; --", category: 'security', description: 'rejects SQL injection' },
    { input: '<script>alert("xss")</script>', category: 'security', description: 'rejects XSS' },
    { input: '../../../etc/passwd', category: 'security', description: 'rejects path traversal' },
    { input: '{{7*7}}', category: 'security', description: 'rejects template injection' },
  ],
};

/**
 * Parse function from code to extract metadata
 * @param {string} code - Source code containing function
 * @returns {Object|null} Function metadata
 */
function parseFunction(code) {
  // Try regular function
  const fnMatch = code.match(
    /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/
  );

  // Try arrow function
  const arrowMatch = code.match(
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/
  );

  const match = fnMatch || arrowMatch;
  if (!match) return null;

  const name = match[1];
  const paramsStr = match[2];
  const isAsync = code.includes('async');

  // Parse parameters
  const params = [];
  const types = {};

  if (paramsStr.trim()) {
    const paramList = paramsStr.split(',').map(p => p.trim());
    for (const param of paramList) {
      // Handle TypeScript typed params: name: type
      const typeMatch = param.match(/(\w+)\s*:\s*(\w+)/);
      if (typeMatch) {
        params.push(typeMatch[1]);
        types[typeMatch[1]] = typeMatch[2];
      } else {
        // Plain param name
        const plainMatch = param.match(/^(\w+)/);
        if (plainMatch) {
          params.push(plainMatch[1]);
        }
      }
    }
  }

  return {
    name,
    params,
    types,
    async: isAsync,
  };
}

/**
 * Generate edge cases for a function
 * @param {Object} fn - Parsed function metadata
 * @param {Object} options - Generation options
 * @returns {Array} Array of edge case objects
 */
function generateEdgeCases(fn, options = {}) {
  const { maxCases = 20 } = options;
  const cases = [];

  for (const param of fn.params) {
    const type = fn.types[param] || 'string'; // Default to string

    // Get type-specific cases
    const typeCases = EDGE_CASE_TYPES[type] || EDGE_CASE_TYPES.string;
    for (const edgeCase of typeCases) {
      cases.push({
        ...edgeCase,
        param,
        expected: 'throws', // Default expectation
      });
    }
  }

  // Add security cases for any string parameters
  const hasStringParam = fn.params.some(p => {
    const type = fn.types[p];
    return !type || type === 'string';
  });

  if (hasStringParam) {
    for (const secCase of EDGE_CASE_TYPES.security) {
      cases.push({
        ...secCase,
        param: fn.params.find(p => !fn.types[p] || fn.types[p] === 'string'),
        expected: 'throws',
      });
    }
  }

  // Limit cases
  return cases.slice(0, maxCases);
}

/**
 * Format edge case as test code
 * @param {Object} fn - Function metadata
 * @param {Object} edgeCase - Edge case to format
 * @param {string} framework - Test framework (vitest, mocha, jest)
 * @returns {string} Test code
 */
function formatTestCode(fn, edgeCase, framework = 'vitest') {
  const { name, async: isAsync } = fn;
  const { input, description, expected } = edgeCase;

  // Format input value
  let inputStr;
  if (input === null) {
    inputStr = 'null';
  } else if (input === undefined) {
    inputStr = 'undefined';
  } else if (typeof input === 'string') {
    // Escape quotes and special chars
    inputStr = JSON.stringify(input);
  } else if (Array.isArray(input)) {
    inputStr = JSON.stringify(input);
  } else if (typeof input === 'number') {
    if (Number.isNaN(input)) {
      inputStr = 'NaN';
    } else if (!Number.isFinite(input)) {
      inputStr = 'Infinity';
    } else {
      inputStr = String(input);
    }
  } else {
    inputStr = JSON.stringify(input);
  }

  // Generate test body based on expectation
  let body;
  if (expected === 'throws') {
    if (isAsync) {
      body = `await expect(${name}(${inputStr})).rejects.toThrow();`;
    } else {
      body = `expect(() => ${name}(${inputStr})).toThrow();`;
    }
  } else {
    if (isAsync) {
      body = `const result = await ${name}(${inputStr});\n    expect(result).toBeDefined();`;
    } else {
      body = `const result = ${name}(${inputStr});\n    expect(result).toBeDefined();`;
    }
  }

  // Format as test
  const asyncKeyword = isAsync ? 'async ' : '';
  return `it('${description}', ${asyncKeyword}() => {
    ${body}
  });`;
}

module.exports = {
  parseFunction,
  generateEdgeCases,
  formatTestCode,
  EDGE_CASE_TYPES,
};
