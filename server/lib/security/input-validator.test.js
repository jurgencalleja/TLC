/**
 * Input Validator Tests
 *
 * Tests for input validation and sanitization to prevent injection attacks.
 */

import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateEmail,
  validateUrl,
  validateNumeric,
  validateUuid,
  sanitizeHtml,
  detectSqlInjection,
  detectCommandInjection,
  createValidator,
} from './input-validator.js';

describe('input-validator', () => {
  describe('validateString', () => {
    it('validates string within max length', () => {
      const result = validateString('hello', { maxLength: 10 });
      expect(result.valid).toBe(true);
    });

    it('rejects string exceeding max length', () => {
      const result = validateString('hello world', { maxLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('rejects string below min length', () => {
      const result = validateString('hi', { minLength: 5 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('validates string matching pattern', () => {
      const result = validateString('abc123', { pattern: /^[a-z0-9]+$/ });
      expect(result.valid).toBe(true);
    });

    it('rejects string not matching pattern', () => {
      const result = validateString('abc@123', { pattern: /^[a-z0-9]+$/ });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('pattern');
    });

    it('trims whitespace when configured', () => {
      const result = validateString('  hello  ', { trim: true, maxLength: 5 });
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });
  });

  describe('detectSqlInjection', () => {
    it('detects UNION SELECT pattern', () => {
      const result = detectSqlInjection("' UNION SELECT * FROM users--");
      expect(result.detected).toBe(true);
      expect(result.threat).toBe('sql_injection');
      expect(result.pattern).toContain('UNION');
    });

    it('detects OR 1=1 pattern', () => {
      const result = detectSqlInjection("' OR 1=1--");
      expect(result.detected).toBe(true);
      expect(result.threat).toBe('sql_injection');
    });

    it('detects DROP TABLE pattern', () => {
      const result = detectSqlInjection("'; DROP TABLE users;--");
      expect(result.detected).toBe(true);
      expect(result.threat).toBe('sql_injection');
    });

    it('detects comment injection', () => {
      const result = detectSqlInjection("admin'--");
      expect(result.detected).toBe(true);
    });

    it('allows normal input', () => {
      const result = detectSqlInjection('John Smith');
      expect(result.detected).toBe(false);
    });

    it('detects hex-encoded injection', () => {
      const result = detectSqlInjection('0x27204f52203127');
      expect(result.detected).toBe(true);
    });
  });

  describe('detectCommandInjection', () => {
    it('detects semicolon command chaining', () => {
      const result = detectCommandInjection('file.txt; rm -rf /');
      expect(result.detected).toBe(true);
      expect(result.threat).toBe('command_injection');
    });

    it('detects pipe command chaining', () => {
      const result = detectCommandInjection('input | cat /etc/passwd');
      expect(result.detected).toBe(true);
      expect(result.threat).toBe('command_injection');
    });

    it('detects backtick execution', () => {
      const result = detectCommandInjection('`whoami`');
      expect(result.detected).toBe(true);
    });

    it('detects $() execution', () => {
      const result = detectCommandInjection('$(cat /etc/passwd)');
      expect(result.detected).toBe(true);
    });

    it('detects && chaining', () => {
      const result = detectCommandInjection('file && rm -rf /');
      expect(result.detected).toBe(true);
    });

    it('allows normal filenames', () => {
      const result = detectCommandInjection('my-document.pdf');
      expect(result.detected).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('removes script tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('removes onclick handlers', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">click</div>');
      expect(result).not.toContain('onclick');
    });

    it('removes javascript: URLs', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
      expect(result).not.toContain('javascript:');
    });

    it('preserves safe HTML when configured', () => {
      const result = sanitizeHtml('<p>Hello <b>world</b></p>', { allowTags: ['p', 'b'] });
      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
    });

    it('removes style tags', () => {
      const result = sanitizeHtml('<style>body{display:none}</style>');
      expect(result).not.toContain('<style');
    });

    it('removes data: URLs in images', () => {
      const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
      expect(result).not.toContain('data:');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('validates email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.valid).toBe(true);
    });

    it('validates email with plus addressing', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.valid).toBe(true);
    });

    it('rejects email without @', () => {
      const result = validateEmail('userexample.com');
      expect(result.valid).toBe(false);
    });

    it('rejects email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
    });

    it('rejects email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('validates HTTPS URL', () => {
      const result = validateUrl('https://example.com/path');
      expect(result.valid).toBe(true);
    });

    it('validates HTTP URL when allowed', () => {
      const result = validateUrl('http://example.com', { allowHttp: true });
      expect(result.valid).toBe(true);
    });

    it('rejects HTTP URL by default', () => {
      const result = validateUrl('http://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('rejects javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
    });

    it('rejects data: protocol', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    it('validates URL with query parameters', () => {
      const result = validateUrl('https://example.com/search?q=test&page=1');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNumeric', () => {
    it('validates integer within range', () => {
      const result = validateNumeric(50, { min: 0, max: 100 });
      expect(result.valid).toBe(true);
    });

    it('rejects number below minimum', () => {
      const result = validateNumeric(-5, { min: 0 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum');
    });

    it('rejects number above maximum', () => {
      const result = validateNumeric(150, { max: 100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum');
    });

    it('validates float when allowed', () => {
      const result = validateNumeric(3.14, { allowFloat: true });
      expect(result.valid).toBe(true);
    });

    it('rejects float when integer required', () => {
      const result = validateNumeric(3.14, { allowFloat: false });
      expect(result.valid).toBe(false);
    });

    it('rejects NaN', () => {
      const result = validateNumeric(NaN);
      expect(result.valid).toBe(false);
    });

    it('rejects Infinity', () => {
      const result = validateNumeric(Infinity);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('validates v4 UUID', () => {
      const result = validateUuid('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid UUID format', () => {
      const result = validateUuid('not-a-uuid');
      expect(result.valid).toBe(false);
    });

    it('rejects UUID with wrong length', () => {
      const result = validateUuid('550e8400-e29b-41d4-a716');
      expect(result.valid).toBe(false);
    });
  });

  describe('createValidator', () => {
    it('creates reusable validator with rules', () => {
      const validator = createValidator({
        username: { type: 'string', minLength: 3, maxLength: 20, pattern: /^[a-z0-9_]+$/ },
        email: { type: 'email' },
        age: { type: 'numeric', min: 0, max: 150 },
      });

      const result = validator.validate({
        username: 'john_doe',
        email: 'john@example.com',
        age: 25,
      });

      expect(result.valid).toBe(true);
    });

    it('returns all validation errors', () => {
      const validator = createValidator({
        username: { type: 'string', minLength: 3 },
        email: { type: 'email' },
      });

      const result = validator.validate({
        username: 'ab',
        email: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('username');
      expect(result.errors).toHaveProperty('email');
    });

    it('stops on first error when configured', () => {
      const validator = createValidator({
        field1: { type: 'string', minLength: 10 },
        field2: { type: 'string', minLength: 10 },
      }, { stopOnFirst: true });

      const result = validator.validate({
        field1: 'short',
        field2: 'short',
      });

      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(1);
    });
  });
});
