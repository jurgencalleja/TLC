import { describe, it, expect } from 'vitest';
import {
  isTestFile,
  formatReviewMarkdown,
} from './pr-reviewer.js';

describe('pr-reviewer', () => {
  describe('isTestFile', () => {
    it('identifies JavaScript test files', () => {
      expect(isTestFile('src/auth.test.js')).toBe(true);
      expect(isTestFile('src/auth.spec.js')).toBe(true);
      expect(isTestFile('src/__tests__/auth.js')).toBe(true);
    });

    it('identifies TypeScript test files', () => {
      expect(isTestFile('src/auth.test.ts')).toBe(true);
      expect(isTestFile('src/auth.spec.tsx')).toBe(true);
    });

    it('identifies Python test files', () => {
      expect(isTestFile('test_auth.py')).toBe(true);
      expect(isTestFile('auth_test.py')).toBe(true);
      expect(isTestFile('tests/test_login.py')).toBe(true);
    });

    it('identifies Go test files', () => {
      expect(isTestFile('auth_test.go')).toBe(true);
      expect(isTestFile('pkg/auth.test.go')).toBe(true);
    });

    it('identifies Ruby spec files', () => {
      expect(isTestFile('spec/auth_spec.rb')).toBe(true);
    });

    it('identifies files in test directories', () => {
      expect(isTestFile('test/helpers.js')).toBe(true);
      expect(isTestFile('tests/utils.js')).toBe(true);
    });

    it('returns false for implementation files', () => {
      expect(isTestFile('src/auth.js')).toBe(false);
      expect(isTestFile('lib/utils.ts')).toBe(false);
      expect(isTestFile('main.py')).toBe(false);
    });

    it('returns false for config files', () => {
      expect(isTestFile('package.json')).toBe(false);
      expect(isTestFile('.eslintrc.js')).toBe(false);
      expect(isTestFile('tsconfig.json')).toBe(false);
    });

    it('returns false for documentation', () => {
      expect(isTestFile('README.md')).toBe(false);
      expect(isTestFile('docs/api.md')).toBe(false);
    });
  });

  describe('formatReviewMarkdown', () => {
    it('formats passing review', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: true,
        verdict: 'APPROVED',
        summary: ['✅ All tests pass'],
        details: {
          fileCount: 5,
          coverage: { implFiles: 3, testFiles: 2, missingTests: 0, issues: [] },
          commits: { commits: 2, tddScore: 100, violations: [] },
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('# Code Review Report');
      expect(markdown).toContain('APPROVED');
      expect(markdown).toContain('✅ All tests pass');
      expect(markdown).toContain('main');
      expect(markdown).toContain('feature');
    });

    it('formats failing review with missing tests', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: false,
        verdict: 'CHANGES_REQUESTED',
        summary: ['❌ 2 files missing tests'],
        details: {
          fileCount: 5,
          coverage: {
            implFiles: 3,
            testFiles: 1,
            missingTests: 2,
            issues: [
              { file: 'src/a.js', suggestions: ['src/a.test.js'] },
              { file: 'src/b.js', suggestions: ['src/b.test.js'] },
            ],
          },
          commits: { commits: 1, tddScore: 50, violations: [] },
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('CHANGES_REQUESTED');
      expect(markdown).toContain('Missing Tests');
      expect(markdown).toContain('src/a.js');
      expect(markdown).toContain('src/b.js');
    });

    it('formats failing review with TDD violations', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: false,
        verdict: 'CHANGES_REQUESTED',
        summary: ['❌ TDD violations'],
        details: {
          fileCount: 3,
          coverage: { implFiles: 2, testFiles: 1, missingTests: 0, issues: [] },
          commits: {
            commits: 2,
            tddScore: 0,
            violations: [
              { commit: 'abc1234', message: 'feat: add feature', reason: 'No tests' },
            ],
          },
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('TDD Violations');
      expect(markdown).toContain('abc1234');
      expect(markdown).toContain('No tests');
    });

    it('formats failing review with security issues', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: false,
        verdict: 'CHANGES_REQUESTED',
        summary: ['❌ Security issues'],
        details: {
          fileCount: 2,
          coverage: { implFiles: 1, testFiles: 1, missingTests: 0, issues: [] },
          commits: { commits: 1, tddScore: 100, violations: [] },
          security: [
            { type: 'hardcoded-password', severity: 'high', line: 'password = "secret"' },
            { type: 'eval-usage', severity: 'medium', line: 'eval(input)' },
          ],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('Security Issues');
      expect(markdown).toContain('HIGH');
      expect(markdown).toContain('hardcoded-password');
      expect(markdown).toContain('MEDIUM');
      expect(markdown).toContain('eval-usage');
    });

    it('includes PR number when present', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        prNumber: 42,
        passed: true,
        verdict: 'APPROVED',
        summary: [],
        details: {
          fileCount: 0,
          coverage: { implFiles: 0, testFiles: 0, missingTests: 0, issues: [] },
          commits: {},
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('**PR:** #42');
    });

    it('includes statistics', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: true,
        verdict: 'APPROVED',
        summary: [],
        details: {
          fileCount: 10,
          coverage: { implFiles: 6, testFiles: 4, missingTests: 0, issues: [] },
          commits: { commits: 5, tddScore: 80, violations: [] },
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('Statistics');
      expect(markdown).toContain('Files changed: 10');
      expect(markdown).toContain('Implementation files: 6');
      expect(markdown).toContain('Test files: 4');
      expect(markdown).toContain('Commits: 5');
      expect(markdown).toContain('TDD Score: 80%');
    });

    it('handles empty report gracefully', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'HEAD',
        passed: true,
        verdict: 'APPROVED',
        summary: [],
        details: {
          fileCount: 0,
          coverage: { implFiles: 0, testFiles: 0, missingTests: 0, issues: [] },
          commits: {},
          security: [],
        },
      };

      const markdown = formatReviewMarkdown(report);

      expect(markdown).toContain('# Code Review Report');
      expect(markdown).toContain('APPROVED');
    });

    it('skips low severity security issues in table', () => {
      const report = {
        timestamp: '2024-01-01T00:00:00Z',
        base: 'main',
        head: 'feature',
        passed: true,
        verdict: 'APPROVED',
        summary: [],
        details: {
          fileCount: 1,
          coverage: { implFiles: 1, testFiles: 0, missingTests: 0, issues: [] },
          commits: {},
          security: [
            { type: 'console-log', severity: 'low', line: 'console.log("debug")' },
            { type: 'todo-comment', severity: 'info', line: '// TODO: fix later' },
          ],
        },
      };

      const markdown = formatReviewMarkdown(report);

      // Low severity issues should not appear in the Security Issues section
      expect(markdown).not.toContain('Security Issues');
    });
  });
});
