import { describe, it, expect } from 'vitest';
import {
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
} from './pr-report.js';

describe('pr-report', () => {
  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('formats seconds', () => {
      expect(formatDuration(2500)).toBe('2.50s');
    });

    it('formats minutes', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
    });

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0ms');
    });
  });

  describe('getStatusEmoji', () => {
    it('returns checkmark for passed', () => {
      expect(getStatusEmoji('passed')).toBe('✅');
      expect(getStatusEmoji('pass')).toBe('✅');
    });

    it('returns X for failed', () => {
      expect(getStatusEmoji('failed')).toBe('❌');
      expect(getStatusEmoji('fail')).toBe('❌');
    });

    it('returns skip emoji for skipped', () => {
      expect(getStatusEmoji('skipped')).toBe('⏭️');
      expect(getStatusEmoji('skip')).toBe('⏭️');
    });

    it('returns pending emoji', () => {
      expect(getStatusEmoji('pending')).toBe('⏳');
    });

    it('returns question for unknown', () => {
      expect(getStatusEmoji('unknown')).toBe('❓');
    });
  });

  describe('parseVitestOutput', () => {
    it('parses Vitest JSON output', () => {
      const output = {
        testResults: [
          {
            name: 'tests/app.test.js',
            assertionResults: [
              { title: 'should work', status: 'passed', duration: 10 },
              { title: 'should fail', status: 'failed', duration: 5, failureMessages: ['Error: oops'] },
            ],
          },
        ],
        startTime: Date.now() - 1000,
      };

      const result = parseVitestOutput(output);

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.total).toBe(2);
      expect(result.suites).toHaveLength(1);
    });

    it('extracts failure messages', () => {
      const output = {
        testResults: [
          {
            name: 'test.js',
            assertionResults: [
              { title: 'test', status: 'failed', failureMessages: ['Error: something broke'] },
            ],
          },
        ],
      };

      const result = parseVitestOutput(output);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].message).toContain('something broke');
    });

    it('returns null for invalid input', () => {
      expect(parseVitestOutput(null)).toBeNull();
      expect(parseVitestOutput({})).toBeNull();
    });

    it('handles skipped tests', () => {
      const output = {
        testResults: [
          {
            name: 'test.js',
            assertionResults: [
              { title: 'test', status: 'skipped' },
            ],
          },
        ],
      };

      const result = parseVitestOutput(output);

      expect(result.skipped).toBe(1);
    });
  });

  describe('parsePytestOutput', () => {
    it('parses pytest JSON output', () => {
      const output = {
        tests: [
          { nodeid: 'tests/test_app.py::test_one', outcome: 'passed', duration: 0.1 },
          { nodeid: 'tests/test_app.py::test_two', outcome: 'failed', duration: 0.2, message: 'AssertionError' },
        ],
        summary: { passed: 1, failed: 1, skipped: 0, total: 2 },
        duration: 0.3,
      };

      const result = parsePytestOutput(output);

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.suites).toHaveLength(1);
    });

    it('extracts failure info', () => {
      const output = {
        tests: [
          { nodeid: 'tests/test.py::test_fail', outcome: 'failed', longrepr: 'AssertionError: expected true' },
        ],
        summary: { passed: 0, failed: 1, total: 1 },
      };

      const result = parsePytestOutput(output);

      expect(result.failures[0].message).toContain('AssertionError');
    });

    it('returns null for invalid input', () => {
      expect(parsePytestOutput(null)).toBeNull();
      expect(parsePytestOutput({})).toBeNull();
    });

    it('groups tests by file', () => {
      const output = {
        tests: [
          { nodeid: 'tests/a.py::test_a', outcome: 'passed' },
          { nodeid: 'tests/b.py::test_b', outcome: 'passed' },
        ],
        summary: { passed: 2, failed: 0, total: 2 },
      };

      const result = parsePytestOutput(output);

      expect(result.suites).toHaveLength(2);
    });
  });

  describe('parseGoTestOutput', () => {
    it('parses Go test JSON lines', () => {
      const output = `
{"Action":"pass","Package":"pkg","Test":"TestOne","Elapsed":0.1}
{"Action":"fail","Package":"pkg","Test":"TestTwo","Elapsed":0.2}
{"Action":"skip","Package":"pkg","Test":"TestThree"}
`.trim();

      const result = parseGoTestOutput(output);

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('groups by package', () => {
      const output = `
{"Action":"pass","Package":"pkg/a","Test":"TestA"}
{"Action":"pass","Package":"pkg/b","Test":"TestB"}
`.trim();

      const result = parseGoTestOutput(output);

      expect(result.suites).toHaveLength(2);
    });

    it('returns null for invalid input', () => {
      expect(parseGoTestOutput(null)).toBeNull();
      expect(parseGoTestOutput('')).toBeNull();
    });

    it('skips non-JSON lines', () => {
      const output = `
not json
{"Action":"pass","Package":"pkg","Test":"Test"}
also not json
`.trim();

      const result = parseGoTestOutput(output);

      expect(result.passed).toBe(1);
    });
  });

  describe('parseTestResults', () => {
    it('auto-detects Vitest format', () => {
      const output = {
        testResults: [{ name: 'test.js', assertionResults: [] }],
      };

      const result = parseTestResults(output);

      expect(result).toBeDefined();
    });

    it('auto-detects pytest format', () => {
      const output = {
        tests: [],
        summary: {},
      };

      const result = parseTestResults(output);

      expect(result).toBeDefined();
    });

    it('auto-detects Go format', () => {
      const output = '{"Action":"pass","Package":"pkg","Test":"Test"}';

      const result = parseTestResults(output);

      expect(result).toBeDefined();
    });

    it('returns null for unknown format', () => {
      expect(parseTestResults(null)).toBeNull();
      expect(parseTestResults('random text')).toBeNull();
    });
  });

  describe('generatePRComment', () => {
    const baseResults = {
      passed: 10,
      failed: 2,
      skipped: 1,
      total: 13,
      duration: 5000,
      suites: [
        { name: 'tests/app.test.js', passed: 5, failed: 1, skipped: 0, tests: [] },
        { name: 'tests/util.test.js', passed: 5, failed: 1, skipped: 1, tests: [] },
      ],
      failures: [
        { file: 'tests/app.test.js', test: 'should work', message: 'Expected true got false' },
      ],
    };

    it('generates markdown comment', () => {
      const comment = generatePRComment(baseResults);

      expect(comment).toContain('Test Results');
      expect(comment).toContain('10');
      expect(comment).toContain('2');
    });

    it('shows failure emoji when tests fail', () => {
      const comment = generatePRComment(baseResults);

      expect(comment).toContain('❌');
    });

    it('shows success emoji when all pass', () => {
      const results = { ...baseResults, failed: 0, failures: [] };
      const comment = generatePRComment(results);

      expect(comment).toContain('✅');
    });

    it('includes duration', () => {
      const comment = generatePRComment(baseResults);

      expect(comment).toContain('5.00s');
    });

    it('includes coverage when provided', () => {
      const comment = generatePRComment(baseResults, {
        coverage: { lines: 85.5, statements: 84.2, functions: 90.1, branches: 75.3 },
      });

      expect(comment).toContain('Coverage');
      expect(comment).toContain('85.5%');
    });

    it('shows failure details', () => {
      const comment = generatePRComment(baseResults);

      expect(comment).toContain('Failed Tests');
      expect(comment).toContain('should work');
    });

    it('limits failures shown', () => {
      const results = {
        ...baseResults,
        failures: Array(10).fill({ file: 'test.js', test: 'test', message: 'error' }),
      };

      const comment = generatePRComment(results, { maxFailures: 3 });

      expect(comment).toContain('7 more failures');
    });

    it('includes suite details in collapsible', () => {
      const comment = generatePRComment(baseResults);

      expect(comment).toContain('<details>');
      expect(comment).toContain('Test Suites');
    });

    it('uses custom title', () => {
      const comment = generatePRComment(baseResults, { title: 'Unit Tests' });

      expect(comment).toContain('Unit Tests');
    });

    it('hides details when disabled', () => {
      const comment = generatePRComment(baseResults, { showDetails: false });

      expect(comment).not.toContain('Test Suites');
    });
  });

  describe('generateStepSummary', () => {
    it('generates step summary markdown', () => {
      const results = {
        passed: 5,
        failed: 0,
        skipped: 0,
        total: 5,
        duration: 1000,
        suites: [],
        failures: [],
      };

      const summary = generateStepSummary(results);

      expect(summary).toContain('Test Results');
      expect(summary).toContain('5');
    });
  });

  describe('generateStatusLine', () => {
    it('generates passing status', () => {
      const results = { passed: 10, failed: 0, total: 10 };
      const line = generateStatusLine(results);

      expect(line).toContain('✅');
      expect(line).toContain('10/10');
      expect(line).toContain('passed');
    });

    it('generates failing status', () => {
      const results = { passed: 8, failed: 2, total: 10 };
      const line = generateStatusLine(results);

      expect(line).toContain('❌');
      expect(line).toContain('8/10');
      expect(line).toContain('failed');
    });
  });

  describe('createPRReportGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createPRReportGenerator();

      expect(generator.parseResults).toBeDefined();
      expect(generator.parseVitest).toBeDefined();
      expect(generator.parsePytest).toBeDefined();
      expect(generator.parseGo).toBeDefined();
      expect(generator.generateComment).toBeDefined();
      expect(generator.generateSummary).toBeDefined();
      expect(generator.generateStatusLine).toBeDefined();
    });

    it('uses provided options', () => {
      const generator = createPRReportGenerator({ title: 'My Tests' });
      const results = { passed: 1, failed: 0, total: 1, duration: 0, suites: [], failures: [] };
      const comment = generator.generateComment(results);

      expect(comment).toContain('My Tests');
    });

    it('allows option override', () => {
      const generator = createPRReportGenerator({ title: 'Default' });
      const results = { passed: 1, failed: 0, total: 1, duration: 0, suites: [], failures: [] };
      const comment = generator.generateComment(results, { title: 'Override' });

      expect(comment).toContain('Override');
    });
  });
});
