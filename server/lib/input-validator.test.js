/**
 * Input Validator Tests
 *
 * Input sanitization and validation patterns for secure code generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createInputValidator,
  sanitizeString,
  validateEmail,
  validatePath,
  validateUrl,
  preventSqlInjection,
  preventCommandInjection,
  generateValidationCode,
} = require('./input-validator.js');

describe('Input Validator', () => {
  let validator;

  beforeEach(() => {
    validator = createInputValidator();
  });

  describe('createInputValidator', () => {
    it('creates validator with default config', () => {
      assert.ok(validator);
      assert.ok(validator.rules);
    });

    it('accepts custom rules', () => {
      const custom = createInputValidator({
        rules: {
          maxLength: 100,
        },
      });

      assert.strictEqual(custom.rules.maxLength, 100);
    });
  });

  describe('sanitizeString', () => {
    it('removes null bytes', () => {
      const result = sanitizeString('hello\x00world');

      assert.strictEqual(result, 'helloworld');
    });

    it('trims whitespace', () => {
      const result = sanitizeString('  hello  ');

      assert.strictEqual(result, 'hello');
    });

    it('escapes HTML entities', () => {
      const result = sanitizeString('<script>alert("xss")</script>', { escapeHtml: true });

      assert.ok(!result.includes('<script>'));
      assert.ok(result.includes('&lt;'));
    });

    it('enforces max length', () => {
      const result = sanitizeString('a'.repeat(1000), { maxLength: 100 });

      assert.strictEqual(result.length, 100);
    });

    it('handles unicode normalization', () => {
      const result = sanitizeString('café', { normalize: true });

      assert.ok(result.includes('caf'));
    });
  });

  describe('validateEmail', () => {
    it('accepts valid email', () => {
      const result = validateEmail('user@example.com');

      assert.ok(result.valid);
    });

    it('rejects invalid email', () => {
      const result = validateEmail('not-an-email');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    it('rejects email with dangerous characters', () => {
      const result = validateEmail('user"@example.com');

      assert.strictEqual(result.valid, false);
    });

    it('handles internationalized domains', () => {
      const result = validateEmail('user@münchen.de');

      assert.ok(result.valid);
    });
  });

  describe('validatePath', () => {
    it('accepts valid path', () => {
      const result = validatePath('/var/data/file.txt', { basePath: '/var/data' });

      assert.ok(result.valid);
    });

    it('rejects path traversal', () => {
      const result = validatePath('/var/data/../etc/passwd', { basePath: '/var/data' });

      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('traversal'));
    });

    it('rejects null bytes in path', () => {
      const result = validatePath('/var/data/file.txt\x00.jpg', { basePath: '/var/data' });

      assert.strictEqual(result.valid, false);
    });

    it('normalizes path before validation', () => {
      const result = validatePath('/var/data/./subdir/../file.txt', { basePath: '/var/data' });

      assert.ok(result.valid);
      assert.strictEqual(result.normalized, '/var/data/file.txt');
    });

    it('rejects paths outside base', () => {
      const result = validatePath('/etc/passwd', { basePath: '/var/data' });

      assert.strictEqual(result.valid, false);
    });
  });

  describe('validateUrl', () => {
    it('accepts valid HTTPS URL', () => {
      const result = validateUrl('https://example.com/path');

      assert.ok(result.valid);
    });

    it('rejects javascript protocol', () => {
      const result = validateUrl('javascript:alert(1)');

      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('protocol'));
    });

    it('rejects data protocol', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');

      assert.strictEqual(result.valid, false);
    });

    it('validates allowed hosts', () => {
      const result = validateUrl('https://evil.com', {
        allowedHosts: ['example.com', 'trusted.com'],
      });

      assert.strictEqual(result.valid, false);
    });

    it('blocks private IP addresses', () => {
      const result = validateUrl('http://192.168.1.1', { blockPrivate: true });

      assert.strictEqual(result.valid, false);
    });
  });

  describe('preventSqlInjection', () => {
    it('detects SQL injection patterns', () => {
      const result = preventSqlInjection("'; DROP TABLE users; --");

      assert.ok(result.dangerous);
      assert.ok(result.patterns.length > 0);
    });

    it('allows safe strings', () => {
      const result = preventSqlInjection('John Doe');

      assert.strictEqual(result.dangerous, false);
    });

    it('detects union-based injection', () => {
      const result = preventSqlInjection('1 UNION SELECT * FROM users');

      assert.ok(result.dangerous);
    });

    it('generates parameterized query suggestion', () => {
      const result = preventSqlInjection("user_id = '" + "123" + "'");

      assert.ok(result.suggestion);
      assert.ok(result.suggestion.includes('parameterized'));
    });
  });

  describe('preventCommandInjection', () => {
    it('detects command chaining', () => {
      const result = preventCommandInjection('file.txt; rm -rf /');

      assert.ok(result.dangerous);
    });

    it('detects pipe injection', () => {
      const result = preventCommandInjection('file.txt | cat /etc/passwd');

      assert.ok(result.dangerous);
    });

    it('detects backtick injection', () => {
      const result = preventCommandInjection('`cat /etc/passwd`');

      assert.ok(result.dangerous);
    });

    it('detects $() injection', () => {
      const result = preventCommandInjection('$(cat /etc/passwd)');

      assert.ok(result.dangerous);
    });

    it('allows safe filenames', () => {
      const result = preventCommandInjection('document.pdf');

      assert.strictEqual(result.dangerous, false);
    });

    it('suggests safe alternatives', () => {
      const result = preventCommandInjection('user-input');

      assert.ok(result.safePattern);
    });
  });

  describe('generateValidationCode', () => {
    it('generates JavaScript validation function', () => {
      const code = generateValidationCode({
        type: 'email',
        language: 'javascript',
      });

      assert.ok(code.includes('function'));
      assert.ok(code.includes('email'));
    });

    it('generates TypeScript validation function', () => {
      const code = generateValidationCode({
        type: 'email',
        language: 'typescript',
      });

      assert.ok(code.includes('string'));
      assert.ok(code.includes(':'));
    });

    it('generates Python validation function', () => {
      const code = generateValidationCode({
        type: 'email',
        language: 'python',
      });

      assert.ok(code.includes('def'));
    });

    it('includes error messages', () => {
      const code = generateValidationCode({
        type: 'path',
        language: 'javascript',
        includeErrors: true,
      });

      assert.ok(code.includes('error') || code.includes('Error'));
    });

    it('generates validation for custom rules', () => {
      const code = generateValidationCode({
        type: 'custom',
        language: 'javascript',
        rules: {
          minLength: 8,
          maxLength: 100,
          pattern: '^[a-zA-Z0-9]+$',
        },
      });

      assert.ok(code.includes('8'));
      assert.ok(code.includes('100'));
    });
  });
});
