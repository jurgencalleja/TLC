/**
 * Gate Reporter Tests
 *
 * Formats gate results into clear, actionable terminal output
 * with severity badges, fix suggestions, and summary.
 */
import { describe, it, expect } from 'vitest';

const {
  formatReport,
  formatSummary,
  formatFinding,
  groupByFile,
} = require('./gate-reporter.js');

describe('Gate Reporter', () => {
  describe('formatFinding', () => {
    it('formats a block finding with line number', () => {
      const finding = {
        severity: 'block',
        rule: 'no-eval',
        file: 'src/app.js',
        line: 12,
        message: "eval() is not allowed",
        fix: 'Use a safe alternative',
      };
      const output = formatFinding(finding);
      expect(output).toContain('[BLOCK]');
      expect(output).toContain('no-eval');
      expect(output).toContain('line 12');
      expect(output).toContain('eval()');
      expect(output).toContain('Use a safe alternative');
    });

    it('formats a warn finding', () => {
      const finding = {
        severity: 'warn',
        rule: 'max-function-length',
        file: 'src/big.js',
        line: 45,
        message: 'Function too long',
        fix: 'Extract helper functions',
      };
      const output = formatFinding(finding);
      expect(output).toContain('[WARN]');
    });

    it('formats info finding', () => {
      const finding = {
        severity: 'info',
        rule: 'docs-hint',
        file: 'src/x.js',
        message: 'Consider adding docs',
        fix: 'Add JSDoc',
      };
      const output = formatFinding(finding);
      expect(output).toContain('[INFO]');
    });

    it('handles finding without line number', () => {
      const finding = {
        severity: 'block',
        rule: 'require-test-file',
        file: 'src/x.js',
        message: 'No test file found',
        fix: 'Create test file',
      };
      const output = formatFinding(finding);
      expect(output).not.toContain('line');
    });
  });

  describe('groupByFile', () => {
    it('groups findings by file path', () => {
      const findings = [
        { file: 'a.js', rule: 'r1', severity: 'block', message: 'A' },
        { file: 'b.js', rule: 'r2', severity: 'warn', message: 'B' },
        { file: 'a.js', rule: 'r3', severity: 'info', message: 'C' },
      ];
      const groups = groupByFile(findings);
      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups['a.js']).toHaveLength(2);
      expect(groups['b.js']).toHaveLength(1);
    });
  });

  describe('formatSummary', () => {
    it('shows blocking count and pass status', () => {
      const summary = { total: 0, block: 0, warn: 0, info: 0 };
      const output = formatSummary(summary, true);
      expect(output).toContain('passed');
    });

    it('shows blocking message when blocked', () => {
      const summary = { total: 3, block: 2, warn: 1, info: 0 };
      const output = formatSummary(summary, false);
      expect(output).toContain('2 blocking');
      expect(output).toContain('1 warning');
      expect(output).toContain('blocked');
    });
  });

  describe('formatReport', () => {
    it('formats complete report with header', () => {
      const result = {
        passed: false,
        findings: [
          { file: 'src/app.js', severity: 'block', rule: 'no-eval', line: 5, message: 'eval found', fix: 'Remove eval' },
        ],
        summary: { total: 1, block: 1, warn: 0, info: 0 },
      };
      const output = formatReport(result);
      expect(output).toContain('Code Gate');
      expect(output).toContain('src/app.js');
      expect(output).toContain('[BLOCK]');
      expect(output).toContain('blocked');
    });

    it('formats all-clear report', () => {
      const result = {
        passed: true,
        findings: [],
        summary: { total: 0, block: 0, warn: 0, info: 0 },
      };
      const output = formatReport(result);
      expect(output).toContain('passed');
    });

    it('groups findings by file in report', () => {
      const result = {
        passed: false,
        findings: [
          { file: 'a.js', severity: 'block', rule: 'r1', message: 'X', fix: 'Y' },
          { file: 'b.js', severity: 'block', rule: 'r2', message: 'X', fix: 'Y' },
          { file: 'a.js', severity: 'warn', rule: 'r3', message: 'X', fix: 'Y' },
        ],
        summary: { total: 3, block: 2, warn: 1, info: 0 },
      };
      const output = formatReport(result);
      // a.js should appear before its findings
      const aIndex = output.indexOf('a.js');
      const bIndex = output.indexOf('b.js');
      expect(aIndex).toBeGreaterThan(-1);
      expect(bIndex).toBeGreaterThan(-1);
    });

    it('includes bypass hint in blocked report', () => {
      const result = {
        passed: false,
        findings: [
          { file: 'x.js', severity: 'block', rule: 'r1', message: 'Bad', fix: 'Fix' },
        ],
        summary: { total: 1, block: 1, warn: 0, info: 0 },
      };
      const output = formatReport(result);
      expect(output).toContain('--no-verify');
    });
  });
});
