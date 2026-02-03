/**
 * CORS Validator Tests
 *
 * Tests for strict CORS configuration.
 */

import { describe, it, expect } from 'vitest';
import {
  validateOrigin,
  generateCorsHeaders,
  handlePreflight,
  createCorsValidator,
  CorsSecurityError,
} from './cors-validator.js';

describe('cors-validator', () => {
  describe('validateOrigin', () => {
    it('allows whitelisted origin', () => {
      const result = validateOrigin('https://example.com', {
        allowedOrigins: ['https://example.com', 'https://app.example.com'],
      });

      expect(result.allowed).toBe(true);
    });

    it('rejects non-whitelisted origin', () => {
      const result = validateOrigin('https://evil.com', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in whitelist');
    });

    it('rejects wildcard (*) in production mode', () => {
      expect(() => {
        validateOrigin('https://example.com', {
          allowedOrigins: ['*'],
          production: true,
        });
      }).toThrow(CorsSecurityError);
    });

    it('allows wildcard in development mode', () => {
      const result = validateOrigin('https://anything.com', {
        allowedOrigins: ['*'],
        production: false,
      });

      expect(result.allowed).toBe(true);
    });

    it('supports pattern matching for subdomains', () => {
      const result = validateOrigin('https://api.example.com', {
        allowedOrigins: ['https://*.example.com'],
      });

      expect(result.allowed).toBe(true);
    });

    it('rejects null origin by default', () => {
      const result = validateOrigin(null, {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
    });

    it('allows null origin when explicitly configured', () => {
      const result = validateOrigin(null, {
        allowedOrigins: ['https://example.com'],
        allowNull: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('validates origin protocol', () => {
      const result = validateOrigin('http://example.com', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
    });

    it('validates origin port', () => {
      const result = validateOrigin('https://example.com:8080', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('generateCorsHeaders', () => {
    it('generates Access-Control-Allow-Origin header', () => {
      const headers = generateCorsHeaders({
        origin: 'https://example.com',
        allowedOrigins: ['https://example.com'],
      });

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('generates Vary: Origin header', () => {
      const headers = generateCorsHeaders({
        origin: 'https://example.com',
        allowedOrigins: ['https://example.com'],
      });

      expect(headers['Vary']).toContain('Origin');
    });

    it('sets Access-Control-Allow-Credentials when configured', () => {
      const headers = generateCorsHeaders({
        origin: 'https://example.com',
        allowedOrigins: ['https://example.com'],
        credentials: true,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('does not set credentials header when not configured', () => {
      const headers = generateCorsHeaders({
        origin: 'https://example.com',
        allowedOrigins: ['https://example.com'],
        credentials: false,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
    });

    it('sets Access-Control-Expose-Headers', () => {
      const headers = generateCorsHeaders({
        origin: 'https://example.com',
        allowedOrigins: ['https://example.com'],
        exposeHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
      });

      expect(headers['Access-Control-Expose-Headers']).toContain('X-Request-Id');
      expect(headers['Access-Control-Expose-Headers']).toContain('X-RateLimit-Remaining');
    });

    it('returns empty object for disallowed origin', () => {
      const headers = generateCorsHeaders({
        origin: 'https://evil.com',
        allowedOrigins: ['https://example.com'],
      });

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('handlePreflight', () => {
    it('returns correct headers for OPTIONS request', () => {
      const headers = handlePreflight({
        origin: 'https://example.com',
        requestMethod: 'POST',
        requestHeaders: ['Content-Type', 'Authorization'],
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    });

    it('sets Access-Control-Max-Age', () => {
      const headers = handlePreflight({
        origin: 'https://example.com',
        requestMethod: 'POST',
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['POST'],
        maxAge: 86400,
      });

      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });

    it('rejects disallowed method', () => {
      const headers = handlePreflight({
        origin: 'https://example.com',
        requestMethod: 'DELETE',
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST'],
      });

      expect(headers['Access-Control-Allow-Methods']).not.toContain('DELETE');
    });

    it('rejects disallowed headers', () => {
      const headers = handlePreflight({
        origin: 'https://example.com',
        requestMethod: 'POST',
        requestHeaders: ['X-Custom-Header'],
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['POST'],
        allowedHeaders: ['Content-Type'],
      });

      expect(headers['Access-Control-Allow-Headers']).not.toContain('X-Custom-Header');
    });

    it('always allows simple headers', () => {
      const headers = handlePreflight({
        origin: 'https://example.com',
        requestMethod: 'POST',
        requestHeaders: ['Accept', 'Content-Language'],
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['POST'],
        allowedHeaders: [],
      });

      // Simple headers should be implicitly allowed
      expect(headers['Access-Control-Allow-Headers']).toBeDefined();
    });
  });

  describe('createCorsValidator', () => {
    it('creates reusable validator with config', () => {
      const cors = createCorsValidator({
        allowedOrigins: ['https://example.com', 'https://app.example.com'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400,
      });

      const result = cors.validate('https://example.com');
      expect(result.allowed).toBe(true);
    });

    it('validates methods', () => {
      const cors = createCorsValidator({
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST'],
      });

      expect(cors.isMethodAllowed('GET')).toBe(true);
      expect(cors.isMethodAllowed('DELETE')).toBe(false);
    });

    it('validates headers', () => {
      const cors = createCorsValidator({
        allowedOrigins: ['https://example.com'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });

      expect(cors.isHeaderAllowed('Content-Type')).toBe(true);
      expect(cors.isHeaderAllowed('X-Custom')).toBe(false);
    });

    it('generates middleware function', () => {
      const cors = createCorsValidator({
        allowedOrigins: ['https://example.com'],
      });

      const middleware = cors.middleware();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('security edge cases', () => {
    it('rejects origins with credentials in URL', () => {
      const result = validateOrigin('https://user:pass@example.com', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
    });

    it('handles case-insensitive origin matching', () => {
      const result = validateOrigin('https://EXAMPLE.COM', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(true);
    });

    it('rejects origins with trailing slashes', () => {
      const result = validateOrigin('https://example.com/', {
        allowedOrigins: ['https://example.com'],
      });

      // Origins should not have trailing slashes
      expect(result.allowed).toBe(false);
    });

    it('rejects origins with path components', () => {
      const result = validateOrigin('https://example.com/path', {
        allowedOrigins: ['https://example.com'],
      });

      expect(result.allowed).toBe(false);
    });

    it('validates against regex patterns safely', () => {
      // Ensure regex patterns don't cause ReDoS
      const result = validateOrigin('https://a'.repeat(1000) + '.example.com', {
        allowedOrigins: ['https://*.example.com'],
      });

      // Should complete quickly and reject
      expect(result.allowed).toBe(false);
    });
  });
});
