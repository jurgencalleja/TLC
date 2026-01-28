import { describe, it, expect } from 'vitest';
import {
  parseCoverageData,
  detectEdgeCasesFromContent,
  calculateScore,
  generateRecommendations,
} from './quality-scorer.js';

describe('quality-scorer', () => {
  describe('parseCoverageData', () => {
    it('extracts coverage percentages from Istanbul format', () => {
      const coverageData = {
        total: {
          lines: { pct: 78.5 },
          branches: { pct: 65.2 },
          functions: { pct: 82.1 },
          statements: { pct: 77.8 },
        },
      };

      const result = parseCoverageData(coverageData);

      expect(result.lines).toBe(78.5);
      expect(result.branches).toBe(65.2);
      expect(result.functions).toBe(82.1);
      expect(result.statements).toBe(77.8);
    });

    it('handles Vitest coverage-final.json format', () => {
      const vitestCoverage = {
        '/project/src/App.tsx': {
          path: '/project/src/App.tsx',
          statementMap: {},
          s: { 0: 1, 1: 1, 2: 0 },
          branchMap: {},
          b: {},
          fnMap: {},
          f: { 0: 1, 1: 0 },
        },
      };

      const result = parseCoverageData(vitestCoverage);

      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('statements');
      expect(typeof result.statements).toBe('number');
      // 2 of 3 statements covered = 66.67%
      expect(result.statements).toBeCloseTo(66.67, 1);
    });

    it('returns zeros for empty coverage', () => {
      const result = parseCoverageData({});

      expect(result.lines).toBe(0);
      expect(result.branches).toBe(0);
      expect(result.functions).toBe(0);
      expect(result.statements).toBe(0);
    });
  });

  describe('detectEdgeCasesFromContent', () => {
    it('finds missing null checks in test files', () => {
      const testContent = `
        describe('login', () => {
          it('returns user for valid credentials', () => {
            expect(login('user@test.com', 'pass')).toBeDefined();
          });
        });
      `;

      const result = detectEdgeCasesFromContent(testContent);

      expect(result).toContain('null-check');
    });

    it('finds missing empty string checks', () => {
      const testContent = `
        describe('validate', () => {
          it('validates email format', () => {
            expect(validate('user@test.com')).toBe(true);
          });
        });
      `;

      const result = detectEdgeCasesFromContent(testContent);

      expect(result).toContain('empty-string');
    });

    it('finds missing boundary tests', () => {
      const testContent = `
        describe('paginate', () => {
          it('returns page 1 results', () => {
            expect(paginate(data, 1)).toHaveLength(10);
          });
        });
      `;

      const result = detectEdgeCasesFromContent(testContent);

      expect(result).toContain('boundary');
    });

    it('returns empty array when all edge cases covered', () => {
      const testContent = `
        describe('login', () => {
          it('throws for null email', () => {
            expect(() => login(null, 'pass')).toThrow();
          });
          it('throws for empty email', () => {
            expect(() => login('', 'pass')).toThrow();
          });
          it('throws for undefined password', () => {
            expect(() => login('user@test.com', undefined)).toThrow();
          });
          it('handles boundary case page 0', () => {
            expect(paginate(data, 0)).toEqual([]);
          });
          it('handles negative page', () => {
            expect(paginate(data, -1)).toEqual([]);
          });
          it('handles error', () => {
            expect(() => fn()).toThrow('error');
          });
        });
      `;

      const result = detectEdgeCasesFromContent(testContent);

      expect(result).toEqual([]);
    });
  });

  describe('calculateScore', () => {
    it('returns weighted score between 0-100', () => {
      const coverage = { lines: 80, branches: 70, functions: 90, statements: 80 };
      const edgeCasesMissing = 2;
      const edgeCasesTotal = 6;

      const score = calculateScore(coverage, edgeCasesMissing, edgeCasesTotal);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('weights coverage at 40%', () => {
      const coverage = { lines: 100, branches: 100, functions: 100, statements: 100 };

      const score = calculateScore(coverage, 0, 0);

      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('weights edge cases at 30%', () => {
      const coverage = { lines: 0, branches: 0, functions: 0, statements: 0 };
      const score = calculateScore(coverage, 0, 6);

      expect(score).toBe(30);
    });

    it('returns 0 for no coverage and all edge cases missing', () => {
      const coverage = { lines: 0, branches: 0, functions: 0, statements: 0 };
      const score = calculateScore(coverage, 6, 6);

      expect(score).toBe(0);
    });

    it('calculates partial scores correctly', () => {
      // 50% coverage = 20 pts, 50% edge cases (3 of 6 missing) = 15 pts
      const coverage = { lines: 50, branches: 50, functions: 50, statements: 50 };
      const score = calculateScore(coverage, 3, 6);

      expect(score).toBe(35); // 20 + 15
    });
  });

  describe('generateRecommendations', () => {
    it('prioritizes recommendations by impact', () => {
      const coverage = { lines: 50, branches: 40, functions: 60, statements: 50 };
      const missingEdgeCases = ['null-check', 'empty-string', 'boundary'];
      const uncoveredFiles = [
        { file: 'src/auth/login.ts', lines: [15, 16, 17, 18, 19, 20] },
        { file: 'src/utils/format.ts', lines: [5] },
      ];

      const recommendations = generateRecommendations(coverage, missingEdgeCases, uncoveredFiles);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].priority).toBe('HIGH');
      expect(recommendations.some(r => r.file === 'src/auth/login.ts')).toBe(true);
    });

    it('includes edge case recommendations', () => {
      const coverage = { lines: 80, branches: 70, functions: 90, statements: 80 };
      const missingEdgeCases = ['null-check'];
      const uncoveredFiles = [];

      const recommendations = generateRecommendations(coverage, missingEdgeCases, uncoveredFiles);

      expect(recommendations.some(r => r.type === 'edge-case' && r.category === 'null-check')).toBe(true);
    });

    it('returns empty array when fully covered', () => {
      const coverage = { lines: 100, branches: 100, functions: 100, statements: 100 };
      const missingEdgeCases = [];
      const uncoveredFiles = [];

      const recommendations = generateRecommendations(coverage, missingEdgeCases, uncoveredFiles);

      expect(recommendations).toEqual([]);
    });

    it('sorts files by uncovered lines (most first)', () => {
      const coverage = { lines: 50, branches: 50, functions: 50, statements: 50 };
      const uncoveredFiles = [
        { file: 'small.ts', lines: [1] },
        { file: 'large.ts', lines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
        { file: 'medium.ts', lines: [1, 2, 3, 4, 5] },
      ];

      const recommendations = generateRecommendations(coverage, [], uncoveredFiles);

      const coverageRecs = recommendations.filter(r => r.type === 'coverage');
      expect(coverageRecs[0].file).toBe('large.ts');
      expect(coverageRecs[1].file).toBe('medium.ts');
      expect(coverageRecs[2].file).toBe('small.ts');
    });
  });
});
