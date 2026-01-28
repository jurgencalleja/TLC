import { describe, it, expect } from 'vitest';
import {
  COVERAGE_FORMATS,
  parseIstanbulSummary,
  parseVitestCoverage,
  parsePytestCoverage,
  parseGoCoverage,
  parseCoverage,
  checkThresholds,
  formatThresholdResult,
  createCoverageChecker,
} from './coverage-threshold.js';

describe('coverage-threshold', () => {
  describe('COVERAGE_FORMATS', () => {
    it('defines format constants', () => {
      expect(COVERAGE_FORMATS.ISTANBUL).toBe('istanbul');
      expect(COVERAGE_FORMATS.VITEST).toBe('vitest');
      expect(COVERAGE_FORMATS.PYTEST).toBe('pytest');
      expect(COVERAGE_FORMATS.GO).toBe('go');
    });
  });

  describe('parseIstanbulSummary', () => {
    it('parses Istanbul coverage summary', () => {
      const summary = {
        total: {
          lines: { pct: 85.5 },
          statements: { pct: 84.2 },
          functions: { pct: 90.1 },
          branches: { pct: 75.3 },
        },
      };

      const result = parseIstanbulSummary(summary);

      expect(result.format).toBe('istanbul');
      expect(result.lines).toBe(85.5);
      expect(result.statements).toBe(84.2);
      expect(result.functions).toBe(90.1);
      expect(result.branches).toBe(75.3);
    });

    it('parses file-level coverage', () => {
      const summary = {
        total: {
          lines: { pct: 85 },
          statements: { pct: 85 },
          functions: { pct: 85 },
          branches: { pct: 85 },
        },
        'src/app.js': {
          lines: { pct: 90 },
          statements: { pct: 88 },
          functions: { pct: 100 },
          branches: { pct: 80 },
        },
      };

      const result = parseIstanbulSummary(summary);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].file).toBe('src/app.js');
      expect(result.files[0].lines).toBe(90);
    });

    it('returns null for empty summary', () => {
      expect(parseIstanbulSummary(null)).toBeNull();
      expect(parseIstanbulSummary({})).toBeNull();
    });

    it('handles missing metrics', () => {
      const summary = {
        total: {
          lines: { pct: 80 },
        },
      };

      const result = parseIstanbulSummary(summary);

      expect(result.lines).toBe(80);
      expect(result.statements).toBe(0);
    });
  });

  describe('parseVitestCoverage', () => {
    it('parses Istanbul-compatible format', () => {
      const report = {
        total: {
          lines: { pct: 90 },
          statements: { pct: 88 },
          functions: { pct: 85 },
          branches: { pct: 75 },
        },
      };

      const result = parseVitestCoverage(report);

      expect(result.lines).toBe(90);
      expect(result.statements).toBe(88);
    });

    it('parses coverage-final.json format', () => {
      const report = {
        'src/app.js': {
          s: { 0: 1, 1: 1, 2: 0 }, // 2/3 statements covered
          f: { 0: 1, 1: 0 }, // 1/2 functions covered
          b: { 0: [1, 0] }, // 1/2 branches covered
        },
      };

      const result = parseVitestCoverage(report);

      expect(result.format).toBe('vitest');
      expect(result.statements).toBeCloseTo(66.67, 1);
      expect(result.functions).toBe(50);
      expect(result.branches).toBe(50);
    });

    it('returns null for invalid input', () => {
      expect(parseVitestCoverage(null)).toBeNull();
    });

    it('handles files with no coverage data', () => {
      const report = {
        'src/empty.js': {},
      };

      const result = parseVitestCoverage(report);

      expect(result.files).toHaveLength(0);
    });
  });

  describe('parsePytestCoverage', () => {
    it('parses pytest-cov output', () => {
      const output = `
Name                      Stmts   Miss  Cover
---------------------------------------------
src/app.py                   50     10    80%
src/utils.py                 30      5    83%
---------------------------------------------
TOTAL                        80     15    81%
`;

      const result = parsePytestCoverage(output);

      expect(result.format).toBe('pytest');
      expect(result.lines).toBe(81);
      expect(result.files).toHaveLength(2);
    });

    it('extracts file-level coverage', () => {
      const output = `
Name                      Stmts   Miss  Cover
src/app.py                   100     20    80%
TOTAL                        100     20    80%
`;

      const result = parsePytestCoverage(output);

      expect(result.files[0].file).toBe('src/app.py');
      expect(result.files[0].statements).toBe(80);
    });

    it('returns null for invalid input', () => {
      expect(parsePytestCoverage(null)).toBeNull();
      expect(parsePytestCoverage('')).toBeNull();
    });

    it('handles output without TOTAL line', () => {
      const output = `
Name                      Stmts   Miss  Cover
src/app.py                   50     10    80%
`;

      const result = parsePytestCoverage(output);

      expect(result.lines).toBe(0);
    });
  });

  describe('parseGoCoverage', () => {
    it('parses go cover output', () => {
      const output = `
github.com/user/pkg/app.go:10:	main		100.0%
github.com/user/pkg/app.go:20:	handler		85.7%
total:					(statements)	92.5%
`;

      const result = parseGoCoverage(output);

      expect(result.format).toBe('go');
      expect(result.lines).toBe(92.5);
    });

    it('extracts file coverage', () => {
      const output = `
pkg/app.go:10:	FuncA		100.0%
pkg/app.go:20:	FuncB		100.0%
pkg/util.go:5:	Helper		50.0%
total:					(statements)	83.3%
`;

      const result = parseGoCoverage(output);

      expect(result.files.length).toBeGreaterThan(0);
    });

    it('returns null for invalid input', () => {
      expect(parseGoCoverage(null)).toBeNull();
      expect(parseGoCoverage('')).toBeNull();
    });
  });

  describe('parseCoverage', () => {
    it('auto-detects Istanbul format', () => {
      const input = {
        total: { lines: { pct: 80 }, statements: { pct: 80 }, functions: { pct: 80 }, branches: { pct: 80 } },
      };

      const result = parseCoverage(input);

      expect(result.format).toBe('istanbul');
    });

    it('auto-detects Vitest format', () => {
      const input = {
        'src/app.js': {
          s: { 0: 1 },
          f: { 0: 1 },
        },
      };

      const result = parseCoverage(input);

      expect(result.format).toBe('vitest');
    });

    it('auto-detects pytest format', () => {
      const input = `
Name                      Stmts   Miss  Cover
TOTAL                        80     20    75%
`;

      const result = parseCoverage(input);

      expect(result.format).toBe('pytest');
    });

    it('auto-detects go format', () => {
      const input = `total:					(statements)	80.0%`;

      const result = parseCoverage(input);

      expect(result.format).toBe('go');
    });

    it('returns null for unknown format', () => {
      expect(parseCoverage(null)).toBeNull();
      expect(parseCoverage('random text')).toBeNull();
    });
  });

  describe('checkThresholds', () => {
    const baseCoverage = {
      lines: 80,
      statements: 75,
      functions: 90,
      branches: 60,
      files: [
        { file: 'src/a.js', lines: 85 },
        { file: 'src/b.js', lines: 50 },
      ],
    };

    it('passes when all thresholds met', () => {
      const result = checkThresholds(baseCoverage, { lines: 80 });

      expect(result.pass).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('fails when threshold not met', () => {
      const result = checkThresholds(baseCoverage, { lines: 90 });

      expect(result.pass).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].metric).toBe('lines');
      expect(result.failures[0].threshold).toBe(90);
      expect(result.failures[0].actual).toBe(80);
    });

    it('checks multiple metrics', () => {
      const result = checkThresholds(baseCoverage, {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      });

      expect(result.pass).toBe(false);
      expect(result.failures).toHaveLength(2); // statements and branches fail
    });

    it('tracks passes', () => {
      const result = checkThresholds(baseCoverage, { lines: 70, functions: 80 });

      expect(result.passes).toHaveLength(2);
    });

    it('checks per-file thresholds', () => {
      const result = checkThresholds(baseCoverage, { perFile: 60 });

      expect(result.pass).toBe(false);
      expect(result.fileFailures).toHaveLength(1);
      expect(result.fileFailures[0].file).toBe('src/b.js');
    });

    it('passes with no thresholds', () => {
      const result = checkThresholds(baseCoverage, {});

      expect(result.pass).toBe(true);
    });

    it('includes coverage in result', () => {
      const result = checkThresholds(baseCoverage, {});

      expect(result.coverage).toBe(baseCoverage);
    });
  });

  describe('formatThresholdResult', () => {
    it('formats passing result', () => {
      const result = {
        pass: true,
        failures: [],
        passes: [{ metric: 'lines', threshold: 80, actual: 85 }],
        fileFailures: [],
        coverage: { lines: 85, statements: 85, functions: 90, branches: 80 },
      };

      const formatted = formatThresholdResult(result);

      expect(formatted).toContain('PASSED');
      expect(formatted).toContain('thresholds met');
    });

    it('formats failing result', () => {
      const result = {
        pass: false,
        failures: [{ metric: 'lines', threshold: 80, actual: 70 }],
        passes: [],
        fileFailures: [],
        coverage: { lines: 70, statements: 70, functions: 70, branches: 70 },
      };

      const formatted = formatThresholdResult(result);

      expect(formatted).toContain('FAILED');
      expect(formatted).toContain('lines');
      expect(formatted).toContain('70');
      expect(formatted).toContain('80');
    });

    it('includes file failures', () => {
      const result = {
        pass: false,
        failures: [],
        passes: [],
        fileFailures: [{ file: 'src/bad.js', threshold: 80, actual: 50 }],
        coverage: { lines: 80, statements: 80, functions: 80, branches: 80 },
      };

      const formatted = formatThresholdResult(result);

      expect(formatted).toContain('src/bad.js');
      expect(formatted).toContain('50');
    });

    it('includes coverage summary table', () => {
      const result = {
        pass: true,
        failures: [],
        passes: [],
        fileFailures: [],
        coverage: { lines: 85.5, statements: 84.2, functions: 90.1, branches: 75.3 },
      };

      const formatted = formatThresholdResult(result);

      expect(formatted).toContain('Coverage Summary');
      expect(formatted).toContain('85.50%');
      expect(formatted).toContain('84.20%');
    });
  });

  describe('createCoverageChecker', () => {
    it('creates checker with methods', () => {
      const checker = createCoverageChecker();

      expect(checker.parse).toBeDefined();
      expect(checker.check).toBeDefined();
      expect(checker.format).toBeDefined();
      expect(checker.parseAndCheck).toBeDefined();
    });

    it('uses provided thresholds', () => {
      const checker = createCoverageChecker({ thresholds: { lines: 90 } });
      const coverage = { lines: 80, statements: 80, functions: 80, branches: 80 };
      const result = checker.check(coverage);

      expect(result.pass).toBe(false);
      expect(result.failures[0].threshold).toBe(90);
    });

    it('parseAndCheck combines parse and check', () => {
      const checker = createCoverageChecker({ thresholds: { lines: 70 } });
      const input = {
        total: {
          lines: { pct: 80 },
          statements: { pct: 80 },
          functions: { pct: 80 },
          branches: { pct: 80 },
        },
      };

      const result = checker.parseAndCheck(input);

      expect(result.pass).toBe(true);
    });

    it('parseAndCheck returns error for invalid input', () => {
      const checker = createCoverageChecker({ thresholds: { lines: 80 } });
      const result = checker.parseAndCheck('invalid data');

      expect(result.pass).toBe(false);
      expect(result.error).toContain('parse');
    });
  });
});
