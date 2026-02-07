/**
 * Quality Gate Scorer Tests
 *
 * Tests for scoring output quality on multiple dimensions
 */

import { describe, it, beforeEach } from 'vitest';
const assert = require('node:assert');

const {
  createQualityScorer,
  scoreCodeStyle,
  scoreCompleteness,
  scoreTestCoverage,
  scoreCorrectness,
  scoreDocumentation,
  calculateComposite,
  parseRequirements,
} = require('./quality-gate-scorer.js');

describe('Quality Gate Scorer', () => {
  describe('createQualityScorer', () => {
    it('creates scorer with default options', () => {
      const scorer = createQualityScorer();
      assert.ok(scorer);
      assert.ok(scorer.options);
    });

    it('accepts custom linter config', () => {
      const scorer = createQualityScorer({ linter: 'eslint' });
      assert.strictEqual(scorer.options.linter, 'eslint');
    });

    it('accepts custom weights', () => {
      const weights = { style: 0.3, completeness: 0.3, coverage: 0.4 };
      const scorer = createQualityScorer({ weights });
      assert.deepStrictEqual(scorer.options.weights, weights);
    });
  });

  describe('scoreCodeStyle', () => {
    it('returns score between 0 and 100', async () => {
      const code = 'const x = 1;\nconsole.log(x);';
      const score = await scoreCodeStyle(code);
      assert.ok(score >= 0 && score <= 100);
    });

    it('returns high score for well-formatted code', async () => {
      const code = `
function greet(name) {
  return 'Hello, ' + name;
}
`;
      const score = await scoreCodeStyle(code);
      assert.ok(score >= 70, `Expected >= 70, got ${score}`);
    });

    it('returns low score for poorly formatted code', async () => {
      const code = 'function x(){var a=1;var b=2;return a+b}';
      const score = await scoreCodeStyle(code);
      assert.ok(score < 80, `Expected < 80, got ${score}`);
    });

    it('checks indentation consistency', async () => {
      const goodCode = '  const a = 1;\n  const b = 2;';
      const badCode = '  const a = 1;\n    const b = 2;';
      const goodScore = await scoreCodeStyle(goodCode);
      const badScore = await scoreCodeStyle(badCode);
      assert.ok(goodScore >= badScore);
    });

    it('returns result with breakdown', async () => {
      const code = 'const x = 1;';
      const result = await scoreCodeStyle(code, { breakdown: true });
      assert.ok(result.score >= 0);
      assert.ok(result.breakdown);
    });
  });

  describe('scoreCompleteness', () => {
    it('returns score between 0 and 100', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const requirements = ['add function'];
      const score = await scoreCompleteness(code, requirements);
      assert.ok(score >= 0 && score <= 100);
    });

    it('returns 100 when all requirements met', async () => {
      const code = `
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
`;
      const requirements = ['add function', 'subtract function'];
      const score = await scoreCompleteness(code, requirements);
      assert.strictEqual(score, 100);
    });

    it('returns partial score for partial completion', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const requirements = ['add function', 'subtract function'];
      const score = await scoreCompleteness(code, requirements);
      assert.strictEqual(score, 50);
    });

    it('returns 0 when no requirements met', async () => {
      const code = 'const x = 1;';
      const requirements = ['add function', 'subtract function'];
      const score = await scoreCompleteness(code, requirements);
      assert.strictEqual(score, 0);
    });

    it('handles empty requirements', async () => {
      const code = 'const x = 1;';
      const score = await scoreCompleteness(code, []);
      assert.strictEqual(score, 100);
    });

    it('returns which requirements are missing', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const requirements = ['add function', 'subtract function'];
      const result = await scoreCompleteness(code, requirements, { details: true });
      assert.ok(result.missing);
      assert.ok(result.missing.includes('subtract function'));
    });
  });

  describe('scoreTestCoverage', () => {
    it('returns score between 0 and 100', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const tests = 'it("adds", () => {})';
      const score = await scoreTestCoverage(code, tests);
      assert.ok(score >= 0 && score <= 100);
    });

    it('returns high score when tests cover functions', async () => {
      const code = `
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
`;
      const tests = `
describe('math', () => {
  it('adds numbers', () => { add(1, 2); });
  it('subtracts numbers', () => { subtract(2, 1); });
});
`;
      const score = await scoreTestCoverage(code, tests);
      assert.ok(score >= 80, `Expected >= 80, got ${score}`);
    });

    it('returns low score when tests missing', async () => {
      const code = `
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
`;
      const tests = 'it("adds", () => { add(1, 2); });';
      const score = await scoreTestCoverage(code, tests);
      assert.ok(score < 50, `Expected < 50, got ${score}`);
    });

    it('returns 0 when no tests', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const score = await scoreTestCoverage(code, '');
      assert.strictEqual(score, 0);
    });

    it('returns coverage report', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const tests = 'it("adds", () => { add(1, 2); });';
      const result = await scoreTestCoverage(code, tests, { report: true });
      assert.ok(result.score >= 0);
      assert.ok(result.coverage);
    });
  });

  describe('scoreCorrectness', () => {
    it('returns score between 0 and 100', async () => {
      const testResults = { passed: 5, failed: 0, total: 5 };
      const score = await scoreCorrectness(testResults);
      assert.ok(score >= 0 && score <= 100);
    });

    it('returns 100 when all tests pass', async () => {
      const testResults = { passed: 10, failed: 0, total: 10 };
      const score = await scoreCorrectness(testResults);
      assert.strictEqual(score, 100);
    });

    it('returns partial score for some failures', async () => {
      const testResults = { passed: 7, failed: 3, total: 10 };
      const score = await scoreCorrectness(testResults);
      assert.strictEqual(score, 70);
    });

    it('returns 0 when all tests fail', async () => {
      const testResults = { passed: 0, failed: 10, total: 10 };
      const score = await scoreCorrectness(testResults);
      assert.strictEqual(score, 0);
    });

    it('handles no tests', async () => {
      const testResults = { passed: 0, failed: 0, total: 0 };
      const score = await scoreCorrectness(testResults);
      assert.strictEqual(score, 0);
    });

    it('includes failed test names', async () => {
      const testResults = {
        passed: 2,
        failed: 1,
        total: 3,
        failures: ['test xyz failed'],
      };
      const result = await scoreCorrectness(testResults, { details: true });
      assert.ok(result.failures);
      assert.ok(result.failures.includes('test xyz failed'));
    });
  });

  describe('scoreDocumentation', () => {
    it('returns score between 0 and 100', async () => {
      const code = 'function add(a, b) { return a + b; }';
      const score = await scoreDocumentation(code);
      assert.ok(score >= 0 && score <= 100);
    });

    it('returns high score for documented code', async () => {
      const code = `
/**
 * Adds two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
  return a + b;
}
`;
      const score = await scoreDocumentation(code);
      assert.ok(score >= 80, `Expected >= 80, got ${score}`);
    });

    it('returns low score for undocumented code', async () => {
      const code = `
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
`;
      const score = await scoreDocumentation(code);
      assert.ok(score < 50, `Expected < 50, got ${score}`);
    });

    it('checks for JSDoc comments', async () => {
      const withJsdoc = '/** Adds numbers */ function add(a, b) { return a + b; }';
      const without = 'function add(a, b) { return a + b; }';
      const withScore = await scoreDocumentation(withJsdoc);
      const withoutScore = await scoreDocumentation(without);
      assert.ok(withScore > withoutScore);
    });

    it('checks for type annotations', async () => {
      const withTypes = 'function add(a: number, b: number): number { return a + b; }';
      const without = 'function add(a, b) { return a + b; }';
      const withScore = await scoreDocumentation(withTypes);
      const withoutScore = await scoreDocumentation(without);
      assert.ok(withScore > withoutScore);
    });

    it('returns breakdown of documentation', async () => {
      const code = '/** Docs */ function add(a, b) { return a + b; }';
      const result = await scoreDocumentation(code, { breakdown: true });
      assert.ok(result.score >= 0);
      assert.ok(result.breakdown);
    });
  });

  describe('calculateComposite', () => {
    it('calculates weighted average', () => {
      const scores = {
        style: 80,
        completeness: 90,
        coverage: 70,
        correctness: 100,
        documentation: 60,
      };
      const composite = calculateComposite(scores);
      assert.ok(composite >= 0 && composite <= 100);
    });

    it('uses default weights', () => {
      const scores = {
        style: 100,
        completeness: 100,
        coverage: 100,
        correctness: 100,
        documentation: 100,
      };
      const composite = calculateComposite(scores);
      assert.strictEqual(composite, 100);
    });

    it('accepts custom weights', () => {
      const scores = {
        style: 100,
        completeness: 0,
        coverage: 0,
        correctness: 0,
        documentation: 0,
      };
      const weights = { style: 1.0, completeness: 0, coverage: 0, correctness: 0, documentation: 0 };
      const composite = calculateComposite(scores, weights);
      assert.strictEqual(composite, 100);
    });

    it('handles missing scores', () => {
      const scores = { style: 80, completeness: 90 };
      const composite = calculateComposite(scores);
      assert.ok(composite >= 0);
    });

    it('returns individual contributions', () => {
      const scores = { style: 80, completeness: 90 };
      const result = calculateComposite(scores, null, { breakdown: true });
      assert.ok(result.composite >= 0);
      assert.ok(result.contributions);
    });
  });

  describe('parseRequirements', () => {
    it('extracts requirements from prompt', () => {
      const prompt = 'Create a function that adds two numbers and returns the result';
      const requirements = parseRequirements(prompt);
      assert.ok(Array.isArray(requirements));
      assert.ok(requirements.length > 0);
    });

    it('extracts numbered requirements', () => {
      const prompt = `
Create:
1. An add function
2. A subtract function
3. A multiply function
`;
      const requirements = parseRequirements(prompt);
      assert.ok(requirements.length >= 3);
    });

    it('extracts bullet requirements', () => {
      const prompt = `
Create:
- An add function
- A subtract function
`;
      const requirements = parseRequirements(prompt);
      assert.ok(requirements.length >= 2);
    });

    it('handles natural language', () => {
      const prompt = 'Build a calculator with add, subtract, and multiply operations';
      const requirements = parseRequirements(prompt);
      assert.ok(requirements.length > 0);
    });

    it('returns empty array for empty prompt', () => {
      const requirements = parseRequirements('');
      assert.deepStrictEqual(requirements, []);
    });

    it('deduplicates requirements', () => {
      const prompt = 'Add function. Add function. Subtract function.';
      const requirements = parseRequirements(prompt);
      const uniqueCount = new Set(requirements).size;
      assert.strictEqual(requirements.length, uniqueCount);
    });
  });
});
