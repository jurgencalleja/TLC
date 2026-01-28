import { describe, it, expect } from 'vitest';
import {
  parseTestFailure,
  matchErrorPattern,
  generateFixProposal,
  ERROR_PATTERNS,
} from './autofix-engine.js';

describe('autofix-engine', () => {
  describe('parseTestFailure', () => {
    it('extracts test name and error from Vitest output', () => {
      const output = `
 FAIL  src/auth.test.ts > login > rejects invalid password
AssertionError: expected null to be defined
    at src/auth.test.ts:15:20
      `;

      const result = parseTestFailure(output);

      expect(result).toHaveProperty('testName');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('line');
      expect(result.testName).toContain('rejects invalid password');
      expect(result.error).toContain('expected null to be defined');
      expect(result.file).toBe('src/auth.test.ts');
      expect(result.line).toBe(15);
    });

    it('extracts from Jest output format', () => {
      const output = `
  ● login › rejects invalid password

    TypeError: Cannot read properties of null (reading 'email')

      14 |     const user = await login('test@test.com', 'wrong');
      15 |     expect(user.email).toBe('test@test.com');
         |                  ^

      at Object.<anonymous> (src/__tests__/auth.test.ts:15:18)
      `;

      const result = parseTestFailure(output);

      expect(result.testName).toContain('rejects invalid password');
      expect(result.error).toContain('Cannot read properties of null');
    });

    it('extracts from Mocha output format', () => {
      const output = `
  1) login
       rejects invalid password:
     AssertionError: expected undefined to equal 'user@test.com'
      at Context.<anonymous> (test/auth.test.js:15:10)
      `;

      const result = parseTestFailure(output);

      expect(result.testName).toContain('rejects invalid password');
      expect(result.error).toContain('expected undefined to equal');
    });

    it('returns null for unparseable output', () => {
      const output = 'Some random text that is not test output';

      const result = parseTestFailure(output);

      expect(result).toBeNull();
    });
  });

  describe('matchErrorPattern', () => {
    it('matches null property access error', () => {
      const error = "TypeError: Cannot read properties of null (reading 'email')";

      const match = matchErrorPattern(error);

      expect(match).not.toBeNull();
      expect(match.pattern).toBe('null-property-access');
      expect(match.property).toBe('email');
    });

    it('matches undefined property access error', () => {
      const error = "TypeError: Cannot read properties of undefined (reading 'name')";

      const match = matchErrorPattern(error);

      expect(match).not.toBeNull();
      expect(match.pattern).toBe('undefined-property-access');
      expect(match.property).toBe('name');
    });

    it('matches expected vs actual mismatch', () => {
      const error = "AssertionError: expected undefined to equal 'test@test.com'";

      const match = matchErrorPattern(error);

      expect(match).not.toBeNull();
      expect(match.pattern).toBe('expected-value-mismatch');
    });

    it('matches import/module not found error', () => {
      const error = "Error: Cannot find module '../utils/helper'";

      const match = matchErrorPattern(error);

      expect(match).not.toBeNull();
      expect(match.pattern).toBe('module-not-found');
      expect(match.module).toBe('../utils/helper');
    });

    it('matches function not defined error', () => {
      const error = "ReferenceError: validateEmail is not defined";

      const match = matchErrorPattern(error);

      expect(match).not.toBeNull();
      expect(match.pattern).toBe('function-not-defined');
      expect(match.name).toBe('validateEmail');
    });

    it('returns null for unknown error', () => {
      const error = 'Some random error message';

      const match = matchErrorPattern(error);

      expect(match).toBeNull();
    });
  });

  describe('generateFixProposal', () => {
    it('proposes null check for null property access', () => {
      const failure = {
        testName: 'login rejects invalid password',
        error: "Cannot read properties of null (reading 'email')",
        file: 'src/auth.ts',
        line: 25,
      };
      const pattern = {
        pattern: 'null-property-access',
        property: 'email',
      };

      const proposal = generateFixProposal(failure, pattern);

      expect(proposal).toHaveProperty('description');
      expect(proposal).toHaveProperty('suggestedFix');
      expect(proposal.description).toContain('null check');
      expect(proposal.suggestedFix).toContain('if');
    });

    it('proposes return value fix for undefined mismatch', () => {
      const failure = {
        testName: 'getUser returns user object',
        error: "expected undefined to equal 'test@test.com'",
        file: 'src/user.ts',
        line: 10,
      };
      const pattern = {
        pattern: 'expected-value-mismatch',
      };

      const proposal = generateFixProposal(failure, pattern);

      expect(proposal.description).toContain('return');
    });

    it('proposes import fix for module not found', () => {
      const failure = {
        testName: 'uses helper function',
        error: "Cannot find module '../utils/helper'",
        file: 'src/service.ts',
        line: 1,
      };
      const pattern = {
        pattern: 'module-not-found',
        module: '../utils/helper',
      };

      const proposal = generateFixProposal(failure, pattern);

      expect(proposal.description).toContain('import');
      expect(proposal.suggestedFix).toContain('helper');
    });

    it('proposes function export for function not defined', () => {
      const failure = {
        testName: 'validates email format',
        error: 'validateEmail is not defined',
        file: 'src/validate.ts',
        line: 5,
      };
      const pattern = {
        pattern: 'function-not-defined',
        name: 'validateEmail',
      };

      const proposal = generateFixProposal(failure, pattern);

      expect(proposal.description).toContain('validateEmail');
    });

    it('returns generic proposal for unknown pattern', () => {
      const failure = {
        testName: 'some test',
        error: 'unknown error',
        file: 'src/unknown.ts',
        line: 1,
      };

      const proposal = generateFixProposal(failure, null);

      expect(proposal.description).toContain('manual');
    });
  });

  describe('ERROR_PATTERNS', () => {
    it('has patterns for common errors', () => {
      expect(ERROR_PATTERNS).toBeDefined();
      expect(Array.isArray(ERROR_PATTERNS)).toBe(true);
      expect(ERROR_PATTERNS.length).toBeGreaterThan(0);
    });

    it('each pattern has name and regex', () => {
      for (const pattern of ERROR_PATTERNS) {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('regex');
        expect(pattern.regex instanceof RegExp).toBe(true);
      }
    });
  });
});
