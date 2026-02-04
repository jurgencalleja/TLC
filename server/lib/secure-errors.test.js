/**
 * Secure Errors Tests
 *
 * Secure error handling patterns for code generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createSecureErrors,
  generateErrorHandler,
  generateStructuredLogging,
  generateGracefulDegradation,
  sanitizeErrorMessage,
  generateErrorCode,
} = require('./secure-errors.js');

describe('Secure Errors', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = createSecureErrors();
  });

  describe('createSecureErrors', () => {
    it('creates handler with default config', () => {
      assert.ok(errorHandler);
      assert.ok(errorHandler.production !== undefined);
    });

    it('hides stack traces in production', () => {
      const prod = createSecureErrors({ production: true });

      assert.strictEqual(prod.showStack, false);
    });

    it('shows stack traces in development', () => {
      const dev = createSecureErrors({ production: false });

      assert.strictEqual(dev.showStack, true);
    });
  });

  describe('generateErrorHandler', () => {
    it('generates Express error handler', () => {
      const code = generateErrorHandler({
        framework: 'express',
        language: 'javascript',
      });

      assert.ok(code.includes('err') && code.includes('req') && code.includes('res'));
    });

    it('hides internal errors in production', () => {
      const code = generateErrorHandler({
        production: true,
      });

      assert.ok(code.includes('Internal') || code.includes('generic') || code.includes('production'));
    });

    it('includes error ID for support', () => {
      const code = generateErrorHandler({
        includeErrorId: true,
      });

      assert.ok(code.includes('errorId') || code.includes('requestId') || code.includes('uuid'));
    });

    it('generates status code mapping', () => {
      const code = generateErrorHandler({
        statusCodes: true,
      });

      assert.ok(code.includes('400') || code.includes('500') || code.includes('status'));
    });

    it('generates Fastify error handler', () => {
      const code = generateErrorHandler({
        framework: 'fastify',
      });

      assert.ok(code.includes('request') || code.includes('reply'));
    });

    it('generates async error handler', () => {
      const code = generateErrorHandler({
        async: true,
      });

      assert.ok(code.includes('async') || code.includes('Promise'));
    });
  });

  describe('generateStructuredLogging', () => {
    it('generates JSON log format', () => {
      const code = generateStructuredLogging({
        format: 'json',
      });

      assert.ok(code.includes('JSON') || code.includes('stringify'));
    });

    it('excludes sensitive fields', () => {
      const code = generateStructuredLogging({
        excludeFields: ['password', 'token', 'secret'],
      });

      assert.ok(code.includes('password') || code.includes('redact') || code.includes('exclude'));
    });

    it('includes request context', () => {
      const code = generateStructuredLogging({
        includeContext: true,
      });

      assert.ok(code.includes('requestId') || code.includes('userId') || code.includes('context'));
    });

    it('generates log levels', () => {
      const code = generateStructuredLogging({
        levels: ['error', 'warn', 'info', 'debug'],
      });

      assert.ok(code.includes('error') && code.includes('warn'));
    });

    it('generates Pino logger', () => {
      const code = generateStructuredLogging({
        library: 'pino',
      });

      assert.ok(code.includes('pino'));
    });

    it('generates Winston logger', () => {
      const code = generateStructuredLogging({
        library: 'winston',
      });

      assert.ok(code.includes('winston'));
    });

    it('redacts PII', () => {
      const code = generateStructuredLogging({
        redactPii: true,
      });

      assert.ok(code.includes('email') || code.includes('redact') || code.includes('mask'));
    });
  });

  describe('generateGracefulDegradation', () => {
    it('generates fallback response', () => {
      const code = generateGracefulDegradation({
        type: 'fallback',
      });

      assert.ok(code.includes('fallback') || code.includes('default'));
    });

    it('generates circuit breaker', () => {
      const code = generateGracefulDegradation({
        type: 'circuit-breaker',
      });

      assert.ok(code.includes('circuit') || code.includes('breaker') || code.includes('state'));
    });

    it('generates retry logic', () => {
      const code = generateGracefulDegradation({
        type: 'retry',
        maxRetries: 3,
      });

      assert.ok(code.includes('retry') || code.includes('attempt'));
    });

    it('generates timeout handling', () => {
      const code = generateGracefulDegradation({
        type: 'timeout',
        timeoutMs: 5000,
      });

      assert.ok(code.includes('timeout') || code.includes('5000'));
    });

    it('generates cache fallback', () => {
      const code = generateGracefulDegradation({
        type: 'cache-fallback',
      });

      assert.ok(code.includes('cache') || code.includes('stale'));
    });

    it('generates health check based routing', () => {
      const code = generateGracefulDegradation({
        type: 'health-routing',
      });

      assert.ok(code.includes('health') || code.includes('healthy'));
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('removes file paths', () => {
      const message = 'Error at /home/user/app/src/index.js:42';

      const result = sanitizeErrorMessage(message);

      assert.ok(!result.includes('/home/user'));
    });

    it('removes IP addresses', () => {
      const message = 'Connection from 192.168.1.100 failed';

      const result = sanitizeErrorMessage(message);

      assert.ok(!result.includes('192.168.1.100'));
    });

    it('removes database connection strings', () => {
      const message = 'postgres://user:pass@localhost:5432/db connection failed';

      const result = sanitizeErrorMessage(message);

      assert.ok(!result.includes('pass'));
    });

    it('removes email addresses', () => {
      const message = 'User user@example.com not found';

      const result = sanitizeErrorMessage(message);

      assert.ok(!result.includes('user@example.com'));
    });

    it('removes stack traces', () => {
      const message = 'Error\n    at Function.Module._load\n    at Object.<anonymous>';

      const result = sanitizeErrorMessage(message);

      assert.ok(!result.includes('Module._load'));
    });

    it('preserves error type', () => {
      const message = 'TypeError: Cannot read property';

      const result = sanitizeErrorMessage(message);

      assert.ok(result.includes('TypeError') || result.includes('error'));
    });
  });

  describe('generateErrorCode', () => {
    it('generates complete error handling module', () => {
      const code = generateErrorCode({
        language: 'javascript',
        features: ['handler', 'logging', 'degradation'],
      });

      assert.ok(code.includes('function') || code.includes('class'));
    });

    it('generates TypeScript error handling', () => {
      const code = generateErrorCode({
        language: 'typescript',
      });

      assert.ok(code.includes('interface') || code.includes(':'));
    });

    it('generates Python error handling', () => {
      const code = generateErrorCode({
        language: 'python',
      });

      assert.ok(code.includes('def') || code.includes('class'));
    });

    it('includes error types', () => {
      const code = generateErrorCode({
        errorTypes: ['ValidationError', 'AuthError', 'NotFoundError'],
      });

      assert.ok(code.includes('ValidationError') || code.includes('Error'));
    });

    it('generates HTTP error responses', () => {
      const code = generateErrorCode({
        httpErrors: true,
      });

      assert.ok(code.includes('400') || code.includes('404') || code.includes('500'));
    });
  });
});
