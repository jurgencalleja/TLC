import { describe, it, expect } from 'vitest';
import {
  analyzeFailures,
  formatFixProgress,
  formatFixSummary,
} from './autofix-command.js';

describe('autofix-command', () => {
  describe('analyzeFailures', () => {
    it('parses multiple test failures', () => {
      const testOutput = `
 FAIL  src/auth.test.ts > login > rejects invalid password
TypeError: Cannot read properties of null (reading 'email')
    at src/auth.test.ts:15:20

 FAIL  src/user.test.ts > getUser > returns user object
AssertionError: expected undefined to equal 'test@test.com'
    at src/user.test.ts:25:10
      `;

      const result = analyzeFailures(testOutput);

      expect(result.failures).toHaveLength(2);
      expect(result.failures[0].testName).toContain('rejects invalid password');
      expect(result.failures[1].testName).toContain('returns user object');
    });

    it('includes fix proposals for each failure', () => {
      const testOutput = `
 FAIL  src/auth.test.ts > login > rejects invalid password
TypeError: Cannot read properties of null (reading 'email')
    at src/auth.test.ts:15:20
      `;

      const result = analyzeFailures(testOutput);

      expect(result.failures[0]).toHaveProperty('proposal');
      expect(result.failures[0].proposal.description).toContain('null check');
    });

    it('returns empty array for passing tests', () => {
      const testOutput = `
 ✓ src/auth.test.ts > login > accepts valid password
 ✓ src/user.test.ts > getUser > returns user object

 Test Files  1 passed
 Tests       2 passed
      `;

      const result = analyzeFailures(testOutput);

      expect(result.failures).toHaveLength(0);
    });

    it('categorizes failures by fixability', () => {
      const testOutput = `
 FAIL  src/auth.test.ts > login > rejects invalid password
TypeError: Cannot read properties of null (reading 'email')
    at src/auth.test.ts:15:20

 FAIL  src/weird.test.ts > some test > unknown error
Some random error without a known pattern
    at src/weird.test.ts:10:5
      `;

      const result = analyzeFailures(testOutput);

      expect(result.fixable.length).toBeGreaterThanOrEqual(1);
      expect(result.unfixable.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatFixProgress', () => {
    it('formats progress indicator', () => {
      const output = formatFixProgress(2, 5, 'Fixing null check in auth.ts');

      expect(output).toContain('2');
      expect(output).toContain('5');
      expect(output).toContain('auth.ts');
    });

    it('shows percentage', () => {
      const output = formatFixProgress(1, 4, 'Working...');

      expect(output).toContain('25%') || expect(output).toContain('1/4');
    });
  });

  describe('formatFixSummary', () => {
    it('shows success count with checkmarks', () => {
      const results = {
        total: 4,
        fixed: 3,
        failed: 1,
        details: [
          { testName: 'test1', status: 'fixed', description: 'Added null check' },
          { testName: 'test2', status: 'fixed', description: 'Added import' },
          { testName: 'test3', status: 'fixed', description: 'Fixed return' },
          { testName: 'test4', status: 'failed', reason: 'Unknown pattern' },
        ],
      };

      const output = formatFixSummary(results);

      expect(output).toContain('3');
      expect(output).toContain('fixed');
      expect(output).toContain('1');
      expect(output).toContain('failed');
    });

    it('lists unfixable tests with reasons', () => {
      const results = {
        total: 2,
        fixed: 0,
        failed: 2,
        details: [
          { testName: 'complex test', status: 'failed', reason: 'Unknown pattern' },
          { testName: 'another test', status: 'failed', reason: 'Timeout issue' },
        ],
      };

      const output = formatFixSummary(results);

      expect(output).toContain('complex test');
      expect(output).toContain('Unknown pattern');
    });

    it('shows commit prompt when fixes applied', () => {
      const results = {
        total: 2,
        fixed: 2,
        failed: 0,
        details: [
          { testName: 'test1', status: 'fixed', description: 'Fix 1' },
          { testName: 'test2', status: 'fixed', description: 'Fix 2' },
        ],
      };

      const output = formatFixSummary(results);

      expect(output).toContain('commit') || expect(output).toContain('Commit');
    });

    it('shows no changes message when nothing to fix', () => {
      const results = {
        total: 0,
        fixed: 0,
        failed: 0,
        details: [],
      };

      const output = formatFixSummary(results);

      expect(output).toContain('No') || expect(output).toContain('0');
    });
  });
});
