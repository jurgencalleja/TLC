/**
 * Security Headers Generator Tests
 *
 * Tests for generating secure HTTP headers.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSecurityHeaders,
  generateCsp,
  generateHsts,
  generatePermissionsPolicy,
  createHeadersGenerator,
} from './headers-generator.js';

describe('headers-generator', () => {
  describe('generateSecurityHeaders', () => {
    it('generates all required security headers', () => {
      const headers = generateSecurityHeaders();

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');
    });

    it('includes Cross-Origin policies', () => {
      const headers = generateSecurityHeaders();

      expect(headers).toHaveProperty('Cross-Origin-Opener-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Embedder-Policy');
    });

    it('sets X-Content-Type-Options to nosniff', () => {
      const headers = generateSecurityHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('sets X-Frame-Options to DENY by default', () => {
      const headers = generateSecurityHeaders();

      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('allows X-Frame-Options SAMEORIGIN when configured', () => {
      const headers = generateSecurityHeaders({
        frameOptions: 'SAMEORIGIN',
      });

      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });

    it('sets Referrer-Policy to strict-origin-when-cross-origin', () => {
      const headers = generateSecurityHeaders();

      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('allows custom Referrer-Policy', () => {
      const headers = generateSecurityHeaders({
        referrerPolicy: 'no-referrer',
      });

      expect(headers['Referrer-Policy']).toBe('no-referrer');
    });
  });

  describe('generateCsp', () => {
    it('generates CSP with strict defaults', () => {
      const csp = generateCsp();

      expect(csp).toContain("default-src 'self'");
    });

    it('does not include unsafe-inline by default', () => {
      const csp = generateCsp();

      expect(csp).not.toContain("'unsafe-inline'");
    });

    it('does not include unsafe-eval by default', () => {
      const csp = generateCsp();

      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('includes script-src with nonce support', () => {
      const csp = generateCsp({ useNonce: true, nonce: 'abc123' });

      expect(csp).toContain("'nonce-abc123'");
    });

    it('allows configured script sources', () => {
      const csp = generateCsp({
        scriptSrc: ['https://cdn.example.com'],
      });

      expect(csp).toContain('https://cdn.example.com');
    });

    it('includes style-src', () => {
      const csp = generateCsp();

      expect(csp).toContain('style-src');
    });

    it('includes img-src', () => {
      const csp = generateCsp();

      expect(csp).toContain('img-src');
    });

    it('includes connect-src for API calls', () => {
      const csp = generateCsp({
        connectSrc: ['https://api.example.com'],
      });

      expect(csp).toContain("connect-src 'self' https://api.example.com");
    });

    it('includes frame-ancestors none by default', () => {
      const csp = generateCsp();

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('allows frame-ancestors self', () => {
      const csp = generateCsp({
        frameAncestors: ["'self'"],
      });

      expect(csp).toContain("frame-ancestors 'self'");
    });

    it('includes upgrade-insecure-requests', () => {
      const csp = generateCsp();

      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('includes block-all-mixed-content', () => {
      const csp = generateCsp();

      expect(csp).toContain('block-all-mixed-content');
    });

    it('includes report-uri when configured', () => {
      const csp = generateCsp({
        reportUri: 'https://example.com/csp-report',
      });

      expect(csp).toContain('report-uri https://example.com/csp-report');
    });

    it('includes report-to when configured', () => {
      const csp = generateCsp({
        reportTo: 'csp-endpoint',
      });

      expect(csp).toContain('report-to csp-endpoint');
    });

    it('generates valid CSP for SPA with inline scripts', () => {
      const csp = generateCsp({
        mode: 'spa',
        useNonce: true,
        nonce: 'random123',
      });

      expect(csp).toContain("'nonce-random123'");
      expect(csp).toContain("'strict-dynamic'");
    });
  });

  describe('generateHsts', () => {
    it('sets max-age to 1 year (31536000 seconds)', () => {
      const hsts = generateHsts();

      expect(hsts).toContain('max-age=31536000');
    });

    it('includes includeSubDomains by default', () => {
      const hsts = generateHsts();

      expect(hsts).toContain('includeSubDomains');
    });

    it('allows disabling includeSubDomains', () => {
      const hsts = generateHsts({ includeSubDomains: false });

      expect(hsts).not.toContain('includeSubDomains');
    });

    it('includes preload when configured', () => {
      const hsts = generateHsts({ preload: true });

      expect(hsts).toContain('preload');
    });

    it('allows custom max-age', () => {
      const hsts = generateHsts({ maxAge: 86400 });

      expect(hsts).toContain('max-age=86400');
    });

    it('rejects max-age less than minimum for preload', () => {
      expect(() => {
        generateHsts({ preload: true, maxAge: 86400 });
      }).toThrow();
    });
  });

  describe('generatePermissionsPolicy', () => {
    it('disables camera by default', () => {
      const policy = generatePermissionsPolicy();

      expect(policy).toContain('camera=()');
    });

    it('disables microphone by default', () => {
      const policy = generatePermissionsPolicy();

      expect(policy).toContain('microphone=()');
    });

    it('disables geolocation by default', () => {
      const policy = generatePermissionsPolicy();

      expect(policy).toContain('geolocation=()');
    });

    it('disables payment by default', () => {
      const policy = generatePermissionsPolicy();

      expect(policy).toContain('payment=()');
    });

    it('allows enabling specific features for self', () => {
      const policy = generatePermissionsPolicy({
        camera: ['self'],
      });

      expect(policy).toContain('camera=(self)');
    });

    it('allows enabling features for specific origins', () => {
      const policy = generatePermissionsPolicy({
        camera: ['https://video.example.com'],
      });

      expect(policy).toContain('camera=("https://video.example.com")');
    });

    it('includes interest-cohort opt-out', () => {
      const policy = generatePermissionsPolicy();

      expect(policy).toContain('interest-cohort=()');
    });
  });

  describe('createHeadersGenerator', () => {
    it('creates reusable generator with config', () => {
      const generator = createHeadersGenerator({
        csp: {
          scriptSrc: ['https://cdn.example.com'],
        },
        hsts: {
          preload: true,
        },
      });

      const headers = generator.generate();

      expect(headers['Content-Security-Policy']).toContain('https://cdn.example.com');
      expect(headers['Strict-Transport-Security']).toContain('preload');
    });

    it('supports per-route overrides', () => {
      const generator = createHeadersGenerator({
        csp: {
          scriptSrc: ["'self'"],
        },
      });

      const defaultHeaders = generator.generate();
      const adminHeaders = generator.generate({
        route: '/admin',
        overrides: {
          csp: {
            scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for admin panel
          },
        },
      });

      expect(defaultHeaders['Content-Security-Policy']).not.toContain("'unsafe-inline'");
      expect(adminHeaders['Content-Security-Policy']).toContain("'unsafe-inline'");
    });

    it('generates nonce for each request', () => {
      const generator = createHeadersGenerator({
        csp: {
          useNonce: true,
        },
      });

      const headers1 = generator.generate();
      const headers2 = generator.generate();

      const nonce1 = headers1['Content-Security-Policy'].match(/'nonce-([^']+)'/)?.[1];
      const nonce2 = headers2['Content-Security-Policy'].match(/'nonce-([^']+)'/)?.[1];

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
    });

    it('provides nonce for script injection', () => {
      const generator = createHeadersGenerator({
        csp: {
          useNonce: true,
        },
      });

      const { headers, nonce } = generator.generateWithNonce();

      expect(nonce).toBeDefined();
      expect(headers['Content-Security-Policy']).toContain(`'nonce-${nonce}'`);
    });

    it('supports report-only mode', () => {
      const generator = createHeadersGenerator({
        csp: {
          reportOnly: true,
        },
      });

      const headers = generator.generate();

      expect(headers).toHaveProperty('Content-Security-Policy-Report-Only');
      expect(headers).not.toHaveProperty('Content-Security-Policy');
    });

    it('supports both enforce and report-only simultaneously', () => {
      const generator = createHeadersGenerator({
        csp: {
          scriptSrc: ["'self'"],
        },
        cspReportOnly: {
          scriptSrc: ["'self'", "'strict-dynamic'"],
          reportUri: 'https://example.com/csp-report',
        },
      });

      const headers = generator.generate();

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('Content-Security-Policy-Report-Only');
    });
  });

  describe('edge cases', () => {
    it('escapes special characters in CSP directives', () => {
      const csp = generateCsp({
        scriptSrc: ["https://example.com/path?param=value&other=test"],
      });

      // Should not break the CSP syntax
      expect(csp).toContain('https://example.com/path');
    });

    it('handles empty arrays gracefully', () => {
      const csp = generateCsp({
        scriptSrc: [],
      });

      expect(csp).toContain("script-src 'self'");
    });

    it('validates CSP directive names', () => {
      expect(() => {
        generateCsp({
          'invalid-directive': ['value'],
        });
      }).toThrow();
    });

    it('validates Permissions-Policy feature names', () => {
      expect(() => {
        generatePermissionsPolicy({
          'invalid-feature': ['self'],
        });
      }).toThrow();
    });
  });
});
