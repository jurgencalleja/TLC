/**
 * Test Rules Tests
 *
 * Detects test files with no assertions, skipped tests, and
 * source files without corresponding test files.
 */
import { describe, it, expect } from 'vitest';

const {
  checkEmptyTests,
  checkSkippedTests,
} = require('./test-rules.js');

describe('Test Rules', () => {
  describe('checkEmptyTests', () => {
    it('detects test file with no assertions', () => {
      const code = `
describe('User', () => {
  it('should work', () => {
    const user = getUser();
  });
});`;
      const findings = checkEmptyTests('user.test.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-empty-tests');
      expect(findings[0].severity).toBe('block');
    });

    it('passes test with expect assertion', () => {
      const code = `
describe('User', () => {
  it('should work', () => {
    expect(getUser()).toBeDefined();
  });
});`;
      const findings = checkEmptyTests('user.test.js', code);
      expect(findings).toHaveLength(0);
    });

    it('passes test with assert assertion', () => {
      const code = `
describe('User', () => {
  it('should work', () => {
    assert.ok(getUser());
  });
});`;
      const findings = checkEmptyTests('user.test.js', code);
      expect(findings).toHaveLength(0);
    });

    it('skips non-test files', () => {
      const code = 'const x = 1;';
      const findings = checkEmptyTests('app.js', code);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkSkippedTests', () => {
    it('detects describe.skip', () => {
      const code = 'describe.skip("User", () => {});';
      const findings = checkSkippedTests('user.test.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-skipped-tests');
      expect(findings[0].severity).toBe('warn');
    });

    it('detects it.skip', () => {
      const code = 'it.skip("should work", () => {});';
      const findings = checkSkippedTests('user.test.js', code);
      expect(findings).toHaveLength(1);
    });

    it('detects xdescribe', () => {
      const code = 'xdescribe("User", () => {});';
      const findings = checkSkippedTests('user.test.js', code);
      expect(findings).toHaveLength(1);
    });

    it('detects xit', () => {
      const code = 'xit("should work", () => {});';
      const findings = checkSkippedTests('user.test.js', code);
      expect(findings).toHaveLength(1);
    });

    it('passes normal test', () => {
      const code = 'it("should work", () => { expect(1).toBe(1); });';
      const findings = checkSkippedTests('user.test.js', code);
      expect(findings).toHaveLength(0);
    });

    it('skips non-test files', () => {
      const code = 'describe.skip("something", () => {});';
      const findings = checkSkippedTests('app.js', code);
      expect(findings).toHaveLength(0);
    });
  });
});
