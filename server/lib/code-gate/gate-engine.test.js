/**
 * Gate Engine Tests
 *
 * The gate engine accepts changed files and runs configurable rule sets
 * against each file, returning pass/fail with detailed findings.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const {
  createGateEngine,
  runGate,
  aggregateFindings,
  calculateScore,
  SEVERITY,
} = require('./gate-engine.js');

describe('Gate Engine', () => {
  describe('SEVERITY', () => {
    it('defines all severity levels', () => {
      expect(SEVERITY.BLOCK).toBe('block');
      expect(SEVERITY.WARN).toBe('warn');
      expect(SEVERITY.INFO).toBe('info');
    });
  });

  describe('createGateEngine', () => {
    it('creates engine with default options', () => {
      const engine = createGateEngine();
      expect(engine).toBeDefined();
      expect(engine.rules).toEqual([]);
      expect(engine.options).toBeDefined();
    });

    it('creates engine with custom rules', () => {
      const mockRule = { id: 'test-rule', check: () => [] };
      const engine = createGateEngine({ rules: [mockRule] });
      expect(engine.rules).toHaveLength(1);
      expect(engine.rules[0].id).toBe('test-rule');
    });

    it('accepts ignore patterns', () => {
      const engine = createGateEngine({ ignore: ['*.md', 'dist/*'] });
      expect(engine.options.ignore).toEqual(['*.md', 'dist/*']);
    });
  });

  describe('runGate', () => {
    let engine;

    beforeEach(() => {
      engine = createGateEngine();
    });

    it('returns pass for empty changeset', async () => {
      const result = await runGate(engine, []);
      expect(result.passed).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it('runs rules against each file', async () => {
      const ruleCallCount = { count: 0 };
      const mockRule = {
        id: 'counter-rule',
        check: (file, content) => {
          ruleCallCount.count++;
          return [];
        },
      };
      engine = createGateEngine({ rules: [mockRule] });

      const files = [
        { path: 'src/a.js', content: 'const a = 1;' },
        { path: 'src/b.js', content: 'const b = 2;' },
      ];

      await runGate(engine, files);
      expect(ruleCallCount.count).toBe(2);
    });

    it('collects findings from all rules', async () => {
      const rule1 = {
        id: 'rule-a',
        check: () => [
          { severity: 'block', rule: 'rule-a', line: 1, message: 'Issue A', fix: 'Fix A' },
        ],
      };
      const rule2 = {
        id: 'rule-b',
        check: () => [
          { severity: 'warn', rule: 'rule-b', line: 5, message: 'Issue B', fix: 'Fix B' },
        ],
      };
      engine = createGateEngine({ rules: [rule1, rule2] });

      const result = await runGate(engine, [{ path: 'src/a.js', content: 'code' }]);
      expect(result.findings).toHaveLength(2);
    });

    it('fails when any finding has block severity', async () => {
      const rule = {
        id: 'blocker',
        check: () => [
          { severity: 'block', rule: 'blocker', line: 1, message: 'Blocked', fix: 'Fix it' },
        ],
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'src/a.js', content: 'code' }]);
      expect(result.passed).toBe(false);
    });

    it('passes when findings are warn-only', async () => {
      const rule = {
        id: 'warner',
        check: () => [
          { severity: 'warn', rule: 'warner', line: 1, message: 'Warning', fix: 'Maybe fix' },
        ],
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'src/a.js', content: 'code' }]);
      expect(result.passed).toBe(true);
    });

    it('passes when findings are info-only', async () => {
      const rule = {
        id: 'informer',
        check: () => [
          { severity: 'info', rule: 'informer', line: 1, message: 'FYI', fix: 'Optional' },
        ],
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'src/a.js', content: 'code' }]);
      expect(result.passed).toBe(true);
    });

    it('attaches file path to each finding', async () => {
      const rule = {
        id: 'path-test',
        check: () => [
          { severity: 'warn', rule: 'path-test', line: 1, message: 'X', fix: 'Y' },
        ],
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'src/deep/file.js', content: 'x' }]);
      expect(result.findings[0].file).toBe('src/deep/file.js');
    });

    it('skips files matching ignore patterns', async () => {
      const rule = {
        id: 'skip-test',
        check: () => [
          { severity: 'block', rule: 'skip-test', line: 1, message: 'Bad', fix: 'Fix' },
        ],
      };
      engine = createGateEngine({ rules: [rule], ignore: ['*.md', '*.json'] });

      const files = [
        { path: 'README.md', content: '# Hello' },
        { path: 'package.json', content: '{}' },
        { path: 'src/app.js', content: 'code' },
      ];

      const result = await runGate(engine, files);
      // Only src/app.js should be checked
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].file).toBe('src/app.js');
    });

    it('includes summary with counts per severity', async () => {
      const rule = {
        id: 'multi',
        check: () => [
          { severity: 'block', rule: 'multi', line: 1, message: 'A', fix: 'A' },
          { severity: 'warn', rule: 'multi', line: 2, message: 'B', fix: 'B' },
          { severity: 'info', rule: 'multi', line: 3, message: 'C', fix: 'C' },
        ],
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'x.js', content: '' }]);
      expect(result.summary.total).toBe(3);
      expect(result.summary.block).toBe(1);
      expect(result.summary.warn).toBe(1);
      expect(result.summary.info).toBe(1);
    });

    it('handles rule that throws gracefully', async () => {
      const rule = {
        id: 'crasher',
        check: () => { throw new Error('Rule crashed'); },
      };
      engine = createGateEngine({ rules: [rule] });

      const result = await runGate(engine, [{ path: 'x.js', content: '' }]);
      // Should not throw - engine catches rule errors
      expect(result).toBeDefined();
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].rule).toBe('crasher');
      expect(result.findings[0].severity).toBe('warn');
      expect(result.findings[0].message).toContain('Rule crashed');
    });

    it('measures execution duration', async () => {
      engine = createGateEngine();
      const result = await runGate(engine, []);
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('aggregateFindings', () => {
    it('groups findings by file', () => {
      const findings = [
        { file: 'a.js', rule: 'r1', severity: 'block', message: 'A' },
        { file: 'b.js', rule: 'r2', severity: 'warn', message: 'B' },
        { file: 'a.js', rule: 'r3', severity: 'info', message: 'C' },
      ];
      const grouped = aggregateFindings(findings);
      expect(grouped['a.js']).toHaveLength(2);
      expect(grouped['b.js']).toHaveLength(1);
    });

    it('returns empty object for no findings', () => {
      const grouped = aggregateFindings([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });

  describe('calculateScore', () => {
    it('returns 100 for no findings', () => {
      expect(calculateScore([])).toBe(100);
    });

    it('deducts points for block findings', () => {
      const findings = [
        { severity: 'block' },
      ];
      const score = calculateScore(findings);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('deducts fewer points for warnings', () => {
      const blockFindings = [{ severity: 'block' }];
      const warnFindings = [{ severity: 'warn' }];
      expect(calculateScore(warnFindings)).toBeGreaterThan(calculateScore(blockFindings));
    });

    it('floors at zero', () => {
      const manyFindings = Array.from({ length: 50 }, () => ({ severity: 'block' }));
      expect(calculateScore(manyFindings)).toBe(0);
    });
  });
});
