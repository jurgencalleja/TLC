import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runQualityAnalysis,
  generateQualityReport,
  formatQualityOutput,
} from './quality-command.js';

describe('quality-command', () => {
  describe('runQualityAnalysis', () => {
    it('returns score with coverage breakdown', async () => {
      const mockCoverage = {
        lines: 75,
        branches: 60,
        functions: 80,
        statements: 75,
      };
      const mockTestFiles = ['tests/auth.test.ts', 'tests/utils.test.ts'];

      const result = await runQualityAnalysis({
        coverage: mockCoverage,
        testFiles: mockTestFiles,
        testContent: {
          'tests/auth.test.ts': `
            describe('login', () => {
              it('returns user for valid credentials', () => {
                expect(login('user@test.com', 'pass')).toBeDefined();
              });
            });
          `,
          'tests/utils.test.ts': `
            describe('format', () => {
              it('handles null', () => {
                expect(format(null)).toBe('');
              });
              it('handles empty string', () => {
                expect(format('')).toBe('');
              });
            });
          `,
        },
      });

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('coverage');
      expect(result).toHaveProperty('edgeCases');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('identifies missing edge cases across test files', async () => {
      const result = await runQualityAnalysis({
        coverage: { lines: 80, branches: 80, functions: 80, statements: 80 },
        testFiles: ['tests/simple.test.ts'],
        testContent: {
          'tests/simple.test.ts': `
            describe('simple', () => {
              it('works with valid input', () => {
                expect(simple('hello')).toBe('HELLO');
              });
            });
          `,
        },
      });

      expect(result.edgeCases.missing).toContain('null-check');
      expect(result.edgeCases.missing).toContain('empty-string');
    });

    it('returns perfect edge case score when all patterns present', async () => {
      const result = await runQualityAnalysis({
        coverage: { lines: 100, branches: 100, functions: 100, statements: 100 },
        testFiles: ['tests/complete.test.ts'],
        testContent: {
          'tests/complete.test.ts': `
            describe('complete', () => {
              it('handles null', () => { expect(fn(null)).toThrow(); });
              it('handles empty string', () => { expect(fn('')).toBe(''); });
              it('handles undefined', () => { expect(fn(undefined)).toThrow(); });
              it('handles boundary 0', () => { expect(fn(0)).toBe(0); });
              it('handles error', () => { expect(() => fn()).toThrow('error'); });
            });
          `,
        },
      });

      expect(result.edgeCases.missing).toEqual([]);
    });
  });

  describe('generateQualityReport', () => {
    it('generates markdown report with correct structure', () => {
      const analysis = {
        score: 72,
        coverage: { lines: 80, branches: 70, functions: 85, statements: 78 },
        edgeCases: {
          missing: ['null-check', 'boundary'],
          covered: ['empty-string', 'undefined-check', 'error-handling'],
          total: 5,
        },
        recommendations: [
          { type: 'edge-case', priority: 'HIGH', category: 'null-check', message: 'Add null-check tests' },
          { type: 'coverage', priority: 'MEDIUM', file: 'src/api.ts', lines: [15, 16], message: 'Cover 2 lines in src/api.ts' },
        ],
        timestamp: '2024-01-15T10:30:00Z',
      };

      const report = generateQualityReport(analysis);

      expect(report).toContain('# Test Quality Report');
      expect(report).toContain('Score: 72/100');
      expect(report).toContain('## Coverage');
      expect(report).toContain('| Lines | 80% |');
      expect(report).toContain('## Edge Cases');
      expect(report).toContain('null-check');
      expect(report).toContain('## Recommendations');
      expect(report).toContain('HIGH');
    });

    it('includes uncovered files section when present', () => {
      const analysis = {
        score: 50,
        coverage: { lines: 50, branches: 50, functions: 50, statements: 50 },
        edgeCases: { missing: [], covered: ['null-check'], total: 5 },
        recommendations: [
          { type: 'coverage', priority: 'HIGH', file: 'src/auth.ts', lines: [10, 11, 12, 13, 14], message: 'Cover 5 lines' },
          { type: 'coverage', priority: 'LOW', file: 'src/utils.ts', lines: [5], message: 'Cover 1 line' },
        ],
        timestamp: '2024-01-15T10:30:00Z',
      };

      const report = generateQualityReport(analysis);

      expect(report).toContain('src/auth.ts');
      expect(report).toContain('src/utils.ts');
    });

    it('shows empty state when fully covered', () => {
      const analysis = {
        score: 100,
        coverage: { lines: 100, branches: 100, functions: 100, statements: 100 },
        edgeCases: { missing: [], covered: ['null-check', 'empty-string', 'boundary', 'undefined-check', 'error-handling'], total: 5 },
        recommendations: [],
        timestamp: '2024-01-15T10:30:00Z',
      };

      const report = generateQualityReport(analysis);

      expect(report).toContain('Score: 100/100');
      expect(report).toContain('excellent');
    });
  });

  describe('formatQualityOutput', () => {
    it('formats analysis for CLI display', () => {
      const analysis = {
        score: 72,
        coverage: { lines: 80, branches: 70, functions: 85, statements: 78 },
        edgeCases: {
          missing: ['null-check'],
          covered: ['empty-string', 'boundary'],
          total: 5,
        },
        recommendations: [
          { type: 'edge-case', priority: 'HIGH', category: 'null-check', message: 'Add null-check tests' },
        ],
      };

      const output = formatQualityOutput(analysis);

      expect(output).toContain('Quality Score: 72/100');
      expect(output).toContain('Coverage:');
      expect(output).toContain('80%');
      expect(output).toContain('Edge Cases:');
      expect(output).toContain('null-check');
    });

    it('shows progress bar for score', () => {
      const analysis = {
        score: 50,
        coverage: { lines: 50, branches: 50, functions: 50, statements: 50 },
        edgeCases: { missing: [], covered: [], total: 0 },
        recommendations: [],
      };

      const output = formatQualityOutput(analysis);

      // Should contain some visual representation of 50%
      expect(output).toContain('50');
    });

    it('lists top recommendations', () => {
      const analysis = {
        score: 60,
        coverage: { lines: 60, branches: 60, functions: 60, statements: 60 },
        edgeCases: { missing: ['null-check'], covered: [], total: 5 },
        recommendations: [
          { type: 'edge-case', priority: 'HIGH', category: 'null-check', message: 'Add null-check tests' },
          { type: 'coverage', priority: 'MEDIUM', file: 'src/api.ts', lines: [1, 2, 3], message: 'Cover 3 lines' },
          { type: 'coverage', priority: 'LOW', file: 'src/utils.ts', lines: [5], message: 'Cover 1 line' },
        ],
      };

      const output = formatQualityOutput(analysis);

      expect(output).toContain('Recommendations');
      expect(output).toContain('null-check');
    });
  });
});
