/**
 * Error Sanitizer Tests
 *
 * Tests for sanitizing error messages for production.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeError,
  createErrorSanitizer,
  formatErrorResponse,
  isOperationalError,
} from './error-sanitizer.js';

describe('error-sanitizer', () => {
  describe('sanitizeError', () => {
    it('removes stack trace in production', () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at /app/src/handler.js:42:15';

      const result = sanitizeError(error, { production: true });

      expect(result.stack).toBeUndefined();
    });

    it('preserves stack trace in development', () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at /app/src/handler.js:42:15';

      const result = sanitizeError(error, { production: false });

      expect(result.stack).toBeDefined();
      expect(result.stack).toContain('handler.js');
    });

    it('removes file paths from error message', () => {
      const error = new Error('Failed to read /home/user/app/secrets/config.json');

      const result = sanitizeError(error, { production: true });

      expect(result.message).not.toContain('/home/user');
      expect(result.message).not.toContain('secrets');
    });

    it('removes Windows file paths', () => {
      const error = new Error('Cannot find C:\\Users\\admin\\app\\config.json');

      const result = sanitizeError(error, { production: true });

      expect(result.message).not.toContain('C:\\Users');
    });

    it('genericizes database errors', () => {
      const error = new Error('ECONNREFUSED 127.0.0.1:5432 - PostgreSQL connection failed');

      const result = sanitizeError(error, { production: true });

      expect(result.message).toBe('A database error occurred');
      expect(result.message).not.toContain('127.0.0.1');
      expect(result.message).not.toContain('5432');
    });

    it('genericizes SQL syntax errors', () => {
      const error = new Error("syntax error at or near 'SELECT' at position 42");

      const result = sanitizeError(error, { production: true });

      expect(result.message).toBe('A database error occurred');
    });

    it('preserves user-friendly message', () => {
      const error = new Error('Invalid email address');
      error.isUserFriendly = true;

      const result = sanitizeError(error, { production: true });

      expect(result.message).toBe('Invalid email address');
    });

    it('returns error ID for support reference', () => {
      const error = new Error('Internal error');

      const result = sanitizeError(error, { production: true });

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[a-z0-9-]+$/);
    });

    it('handles nested error.cause', () => {
      const cause = new Error('Database timeout at /app/db/pool.js:123');
      const error = new Error('Request failed');
      error.cause = cause;

      const result = sanitizeError(error, { production: true });

      expect(result.message).not.toContain('/app/db');
      expect(result.cause).toBeUndefined(); // Cause should be removed in production
    });

    it('preserves cause in development', () => {
      const cause = new Error('Database timeout');
      const error = new Error('Request failed');
      error.cause = cause;

      const result = sanitizeError(error, { production: false });

      expect(result.cause).toBeDefined();
    });

    it('handles circular references', () => {
      const error = new Error('Circular error');
      error.circular = error;

      expect(() => {
        sanitizeError(error, { production: true });
      }).not.toThrow();
    });

    it('removes sensitive property names', () => {
      const error = new Error('Auth failed');
      error.password = 'secret123';
      error.apiKey = 'sk_live_xxx';
      error.token = 'jwt_token_here';

      const result = sanitizeError(error, { production: true });

      expect(result.password).toBeUndefined();
      expect(result.apiKey).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });

  describe('createErrorSanitizer', () => {
    it('creates sanitizer with custom patterns', () => {
      const sanitizer = createErrorSanitizer({
        production: true,
        redactPatterns: [/SECRET_\w+/gi],
      });

      const error = new Error('Key is SECRET_ABC123');
      const result = sanitizer.sanitize(error);

      expect(result.message).not.toContain('SECRET_ABC123');
    });

    it('creates sanitizer with custom generic messages', () => {
      const sanitizer = createErrorSanitizer({
        production: true,
        genericMessages: {
          database: 'Database is temporarily unavailable',
          auth: 'Authentication error',
        },
      });

      const error = new Error('ECONNREFUSED PostgreSQL');
      const result = sanitizer.sanitize(error);

      expect(result.message).toBe('Database is temporarily unavailable');
    });

    it('logs original error before sanitization', () => {
      const logger = vi.fn();
      const sanitizer = createErrorSanitizer({
        production: true,
        logger,
      });

      const error = new Error('Sensitive internal error');
      sanitizer.sanitize(error);

      expect(logger).toHaveBeenCalledWith(expect.objectContaining({
        originalMessage: 'Sensitive internal error',
      }));
    });
  });

  describe('formatErrorResponse', () => {
    it('formats error for HTTP response', () => {
      const error = new Error('Not found');
      error.statusCode = 404;

      const response = formatErrorResponse(error, { production: true });

      expect(response).toEqual({
        error: {
          message: 'Not found',
          code: 'NOT_FOUND',
          id: expect.any(String),
        },
      });
    });

    it('includes status code', () => {
      const error = new Error('Bad request');
      error.statusCode = 400;

      const response = formatErrorResponse(error, {
        production: true,
        includeStatus: true,
      });

      expect(response.error.status).toBe(400);
    });

    it('maps error codes correctly', () => {
      const testCases = [
        { statusCode: 400, expectedCode: 'BAD_REQUEST' },
        { statusCode: 401, expectedCode: 'UNAUTHORIZED' },
        { statusCode: 403, expectedCode: 'FORBIDDEN' },
        { statusCode: 404, expectedCode: 'NOT_FOUND' },
        { statusCode: 409, expectedCode: 'CONFLICT' },
        { statusCode: 422, expectedCode: 'UNPROCESSABLE_ENTITY' },
        { statusCode: 429, expectedCode: 'TOO_MANY_REQUESTS' },
        { statusCode: 500, expectedCode: 'INTERNAL_ERROR' },
        { statusCode: 502, expectedCode: 'BAD_GATEWAY' },
        { statusCode: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
      ];

      for (const { statusCode, expectedCode } of testCases) {
        const error = new Error('Error');
        error.statusCode = statusCode;

        const response = formatErrorResponse(error, { production: true });

        expect(response.error.code).toBe(expectedCode);
      }
    });

    it('includes validation errors for 400', () => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be positive' },
      ];

      const response = formatErrorResponse(error, { production: true });

      expect(response.error.details).toEqual([
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be positive' },
      ]);
    });

    it('includes stack in development', () => {
      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n    at test.js:1';

      const response = formatErrorResponse(error, { production: false });

      expect(response.error.stack).toBeDefined();
    });
  });

  describe('isOperationalError', () => {
    it('identifies validation errors as operational', () => {
      const error = new Error('Invalid input');
      error.statusCode = 400;

      expect(isOperationalError(error)).toBe(true);
    });

    it('identifies auth errors as operational', () => {
      const error = new Error('Unauthorized');
      error.statusCode = 401;

      expect(isOperationalError(error)).toBe(true);
    });

    it('identifies 5xx errors as non-operational', () => {
      const error = new Error('Server error');
      error.statusCode = 500;

      expect(isOperationalError(error)).toBe(false);
    });

    it('identifies programmer errors as non-operational', () => {
      const error = new TypeError('Cannot read property of undefined');

      expect(isOperationalError(error)).toBe(false);
    });

    it('identifies custom operational errors', () => {
      const error = new Error('Business rule violation');
      error.isOperational = true;

      expect(isOperationalError(error)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles null error', () => {
      const result = sanitizeError(null, { production: true });

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles undefined error', () => {
      const result = sanitizeError(undefined, { production: true });

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles non-Error objects', () => {
      const result = sanitizeError('string error', { production: true });

      expect(result.message).toBe('An error occurred');
    });

    it('handles error with no message', () => {
      const error = new Error();

      const result = sanitizeError(error, { production: true });

      expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles deeply nested errors', () => {
      let error = new Error('Deep error');
      for (let i = 0; i < 10; i++) {
        const wrapper = new Error(`Wrapper ${i}`);
        wrapper.cause = error;
        error = wrapper;
      }

      expect(() => {
        sanitizeError(error, { production: true });
      }).not.toThrow();
    });
  });
});
