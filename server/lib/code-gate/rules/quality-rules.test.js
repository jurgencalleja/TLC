/**
 * Quality Rules Tests
 *
 * Detects hardcoded values, oversized functions, console.log leftovers,
 * TODO without issue refs, and other code quality issues.
 */
import { describe, it, expect } from 'vitest';

const {
  checkHardcodedUrls,
  checkHardcodedSecrets,
  checkConsoleLogs,
  checkFunctionLength,
  checkFileLength,
  checkTodoWithoutRef,
} = require('./quality-rules.js');

describe('Quality Rules', () => {
  describe('checkHardcodedUrls', () => {
    it('detects http:// URLs in code', () => {
      const findings = checkHardcodedUrls('app.js', 'const url = "http://localhost:3000";');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-hardcoded-urls');
      expect(findings[0].severity).toBe('block');
      expect(findings[0].fix).toBeDefined();
    });

    it('detects https:// URLs in code', () => {
      const findings = checkHardcodedUrls('app.js', 'const api = "https://api.example.com";');
      expect(findings).toHaveLength(1);
    });

    it('passes clean code using env vars', () => {
      const findings = checkHardcodedUrls('app.js', 'const url = process.env.API_URL;');
      expect(findings).toHaveLength(0);
    });

    it('ignores URLs in comments', () => {
      const findings = checkHardcodedUrls('app.js', '// See https://docs.example.com for details');
      expect(findings).toHaveLength(0);
    });

    it('ignores URLs in test files', () => {
      const findings = checkHardcodedUrls('app.test.js', 'const url = "http://localhost:3000";');
      expect(findings).toHaveLength(0);
    });

    it('detects hardcoded IPs', () => {
      const findings = checkHardcodedUrls('app.js', 'const host = "192.168.1.100";');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-hardcoded-urls');
    });

    it('detects hardcoded ports', () => {
      const code = 'const port = 3000;\napp.listen(port);';
      const findings = checkHardcodedUrls('server.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-hardcoded-urls');
    });
  });

  describe('checkHardcodedSecrets', () => {
    it('detects API keys', () => {
      const code = 'const apiKey = "sk-1234567890abcdef";';
      const findings = checkHardcodedSecrets('config.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-hardcoded-secrets');
      expect(findings[0].severity).toBe('block');
    });

    it('detects passwords in assignments', () => {
      const code = 'const password = "super-secret-123";';
      const findings = checkHardcodedSecrets('auth.js', code);
      expect(findings).toHaveLength(1);
    });

    it('detects tokens', () => {
      const code = 'const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";';
      const findings = checkHardcodedSecrets('api.js', code);
      expect(findings).toHaveLength(1);
    });

    it('passes env var references', () => {
      const code = 'const apiKey = process.env.API_KEY;';
      const findings = checkHardcodedSecrets('config.js', code);
      expect(findings).toHaveLength(0);
    });

    it('ignores test files', () => {
      const code = 'const token = "test-token-12345";';
      const findings = checkHardcodedSecrets('auth.test.js', code);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkConsoleLogs', () => {
    it('detects console.log in production code', () => {
      const findings = checkConsoleLogs('app.js', 'console.log("debug");');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-console-log');
      expect(findings[0].severity).toBe('warn');
    });

    it('detects console.warn', () => {
      const findings = checkConsoleLogs('app.js', 'console.warn("oops");');
      expect(findings).toHaveLength(1);
    });

    it('detects console.debug', () => {
      const findings = checkConsoleLogs('app.js', 'console.debug("trace");');
      expect(findings).toHaveLength(1);
    });

    it('allows console.error', () => {
      const findings = checkConsoleLogs('app.js', 'console.error("critical failure");');
      expect(findings).toHaveLength(0);
    });

    it('ignores test files', () => {
      const findings = checkConsoleLogs('app.test.js', 'console.log("test output");');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkFunctionLength', () => {
    it('detects functions over 50 lines', () => {
      const lines = ['function longFunc() {'];
      for (let i = 0; i < 55; i++) {
        lines.push(`  const x${i} = ${i};`);
      }
      lines.push('}');
      const findings = checkFunctionLength('app.js', lines.join('\n'));
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('max-function-length');
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].message).toContain('longFunc');
    });

    it('passes short functions', () => {
      const code = 'function short() {\n  return 1;\n}';
      const findings = checkFunctionLength('app.js', code);
      expect(findings).toHaveLength(0);
    });

    it('detects arrow functions over limit', () => {
      const lines = ['const longArrow = () => {'];
      for (let i = 0; i < 55; i++) {
        lines.push(`  const x${i} = ${i};`);
      }
      lines.push('};');
      const findings = checkFunctionLength('app.js', lines.join('\n'));
      expect(findings).toHaveLength(1);
    });
  });

  describe('checkFileLength', () => {
    it('detects files over 300 lines', () => {
      const lines = Array.from({ length: 310 }, (_, i) => `const x${i} = ${i};`);
      const findings = checkFileLength('app.js', lines.join('\n'));
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('max-file-length');
      expect(findings[0].severity).toBe('warn');
    });

    it('passes files under limit', () => {
      const findings = checkFileLength('app.js', 'const x = 1;');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkTodoWithoutRef', () => {
    it('detects TODO without issue reference', () => {
      const findings = checkTodoWithoutRef('app.js', '// TODO: fix this later');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('todo-needs-ref');
      expect(findings[0].severity).toBe('warn');
    });

    it('detects FIXME without reference', () => {
      const findings = checkTodoWithoutRef('app.js', '// FIXME: broken');
      expect(findings).toHaveLength(1);
    });

    it('detects HACK without reference', () => {
      const findings = checkTodoWithoutRef('app.js', '// HACK: workaround');
      expect(findings).toHaveLength(1);
    });

    it('passes TODO with issue reference', () => {
      const findings = checkTodoWithoutRef('app.js', '// TODO(#123): fix this later');
      expect(findings).toHaveLength(0);
    });

    it('passes TODO with ticket reference', () => {
      const findings = checkTodoWithoutRef('app.js', '// TODO [JIRA-456]: fix');
      expect(findings).toHaveLength(0);
    });
  });
});
