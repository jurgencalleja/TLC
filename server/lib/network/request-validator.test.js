/**
 * Request Validator Tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateRequestSize,
  validateContentType,
  validateJsonDepth,
  validateQueryString,
  validateHeaders,
  validatePath,
  REQUEST_LIMITS,
  createRequestValidator,
} from './request-validator.js';

describe('request-validator', () => {
  describe('REQUEST_LIMITS', () => {
    it('defines default limits', () => {
      expect(REQUEST_LIMITS.MAX_BODY_SIZE).toBeDefined();
      expect(REQUEST_LIMITS.MAX_JSON_DEPTH).toBeDefined();
      expect(REQUEST_LIMITS.MAX_QUERY_LENGTH).toBeDefined();
      expect(REQUEST_LIMITS.MAX_HEADER_SIZE).toBeDefined();
    });
  });

  describe('validateRequestSize', () => {
    it('accepts requests under limit', () => {
      const result = validateRequestSize({
        contentLength: 1000,
        maxSize: 10000,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects oversized requests', () => {
      const result = validateRequestSize({
        contentLength: 20000,
        maxSize: 10000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });

    it('uses default limit when not specified', () => {
      const result = validateRequestSize({
        contentLength: 1000,
      });

      expect(result.valid).toBe(true);
    });

    it('handles missing content-length', () => {
      const result = validateRequestSize({
        maxSize: 10000,
      });

      expect(result.valid).toBe(true);
      expect(result.warning).toContain('Content-Length');
    });
  });

  describe('validateContentType', () => {
    it('accepts valid JSON content type', () => {
      const result = validateContentType({
        contentType: 'application/json',
        allowedTypes: ['application/json'],
      });

      expect(result.valid).toBe(true);
    });

    it('accepts content type with charset', () => {
      const result = validateContentType({
        contentType: 'application/json; charset=utf-8',
        allowedTypes: ['application/json'],
      });

      expect(result.valid).toBe(true);
    });

    it('rejects invalid content type', () => {
      const result = validateContentType({
        contentType: 'text/plain',
        allowedTypes: ['application/json'],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content-Type');
    });

    it('supports multiple allowed types', () => {
      const result = validateContentType({
        contentType: 'application/xml',
        allowedTypes: ['application/json', 'application/xml'],
      });

      expect(result.valid).toBe(true);
    });

    it('handles wildcard types', () => {
      const result = validateContentType({
        contentType: 'image/png',
        allowedTypes: ['image/*'],
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateJsonDepth', () => {
    it('accepts JSON within depth limit', () => {
      const json = { a: { b: { c: 'value' } } };
      const result = validateJsonDepth({
        json,
        maxDepth: 5,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects deeply nested JSON', () => {
      const json = { a: { b: { c: { d: { e: { f: 'value' } } } } } };
      const result = validateJsonDepth({
        json,
        maxDepth: 3,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('depth');
    });

    it('handles arrays in depth calculation', () => {
      const json = { a: [{ b: [{ c: 'value' }] }] };
      const result = validateJsonDepth({
        json,
        maxDepth: 5,
      });

      expect(result.valid).toBe(true);
      expect(result.depth).toBe(5);
    });

    it('returns actual depth', () => {
      const json = { a: { b: 'value' } };
      const result = validateJsonDepth({
        json,
        maxDepth: 10,
      });

      expect(result.depth).toBe(2);
    });
  });

  describe('validateQueryString', () => {
    it('accepts query string under length limit', () => {
      const result = validateQueryString({
        queryString: 'foo=bar&baz=qux',
        maxLength: 1000,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects query string over length limit', () => {
      const result = validateQueryString({
        queryString: 'a'.repeat(2000),
        maxLength: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('query');
    });

    it('limits parameter count', () => {
      const params = Array.from({ length: 200 }, (_, i) => `p${i}=v${i}`).join('&');
      const result = validateQueryString({
        queryString: params,
        maxParams: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('parameters');
    });

    it('detects duplicate parameters', () => {
      const result = validateQueryString({
        queryString: 'foo=bar&foo=baz',
        allowDuplicates: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('duplicate');
    });
  });

  describe('validateHeaders', () => {
    it('accepts headers under size limit', () => {
      const result = validateHeaders({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
        },
        maxSize: 8000,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects headers over size limit', () => {
      const result = validateHeaders({
        headers: {
          'X-Large-Header': 'a'.repeat(10000),
        },
        maxSize: 8000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('header');
    });

    it('limits individual header size', () => {
      const result = validateHeaders({
        headers: {
          'X-Large-Header': 'a'.repeat(5000),
        },
        maxHeaderSize: 4000,
      });

      expect(result.valid).toBe(false);
    });

    it('validates header name format', () => {
      const result = validateHeaders({
        headers: {
          'Invalid Header Name': 'value',
        },
        validateNames: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid');
    });
  });

  describe('validatePath', () => {
    it('accepts valid paths', () => {
      const result = validatePath({
        path: '/api/users/123',
      });

      expect(result.valid).toBe(true);
    });

    it('blocks path traversal attempts', () => {
      const result = validatePath({
        path: '/api/files/../../../etc/passwd',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('traversal');
    });

    it('blocks encoded path traversal', () => {
      const result = validatePath({
        path: '/api/files/%2e%2e%2f%2e%2e%2fetc/passwd',
      });

      expect(result.valid).toBe(false);
    });

    it('blocks double-encoded traversal', () => {
      const result = validatePath({
        path: '/api/files/%252e%252e%252f',
      });

      expect(result.valid).toBe(false);
    });

    it('blocks null bytes', () => {
      const result = validatePath({
        path: '/api/files/test%00.txt',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('null');
    });

    it('validates against allowed paths', () => {
      const result = validatePath({
        path: '/admin/secret',
        allowedPaths: ['/api/*', '/public/*'],
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('createRequestValidator', () => {
    it('creates validator with methods', () => {
      const validator = createRequestValidator();

      expect(validator.validate).toBeDefined();
      expect(validator.validateSize).toBeDefined();
      expect(validator.validateContentType).toBeDefined();
      expect(validator.validateJson).toBeDefined();
      expect(validator.validatePath).toBeDefined();
    });

    it('validates full request', () => {
      const validator = createRequestValidator({
        maxBodySize: 10000,
        maxJsonDepth: 5,
        allowedContentTypes: ['application/json'],
      });

      const result = validator.validate({
        contentLength: 1000,
        contentType: 'application/json',
        path: '/api/users',
        body: { name: 'test' },
      });

      expect(result.valid).toBe(true);
    });

    it('returns all validation errors', () => {
      const validator = createRequestValidator({
        maxBodySize: 100,
        maxJsonDepth: 2,
      });

      const result = validator.validate({
        contentLength: 10000,
        contentType: 'application/json',
        path: '/api/../etc/passwd',
        body: { a: { b: { c: { d: 'value' } } } },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
