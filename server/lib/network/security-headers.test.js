/**
 * Security Headers Manager Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateSecurityHeaders,
  generateCsp,
  generateHsts,
  generatePermissionsPolicy,
  generateCrossOriginHeaders,
  validateHeaders,
  HEADER_PRESETS,
  createSecurityHeadersManager,
} from './security-headers.js';

describe('security-headers', () => {
  describe('HEADER_PRESETS', () => {
    it('defines strict preset', () => {
      expect(HEADER_PRESETS.STRICT).toBeDefined();
      expect(HEADER_PRESETS.STRICT.csp).toBeDefined();
    });

    it('defines relaxed preset', () => {
      expect(HEADER_PRESETS.RELAXED).toBeDefined();
    });
  });

  describe('generateCsp', () => {
    it('generates strict CSP without unsafe-inline', () => {
      const csp = generateCsp({ strict: true });

      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('includes default-src directive', () => {
      const csp = generateCsp({});

      expect(csp).toContain("default-src 'self'");
    });

    it('configures script-src', () => {
      const csp = generateCsp({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
      });

      expect(csp).toContain('script-src');
      expect(csp).toContain('https://cdn.example.com');
    });

    it('configures style-src', () => {
      const csp = generateCsp({
        styleSrc: ["'self'"],
      });

      expect(csp).toContain('style-src');
    });

    it('adds report-uri when specified', () => {
      const csp = generateCsp({
        reportUri: 'https://example.com/csp-report',
      });

      expect(csp).toContain('report-uri https://example.com/csp-report');
    });

    it('supports frame-ancestors', () => {
      const csp = generateCsp({
        frameAncestors: ["'none'"],
      });

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('supports upgrade-insecure-requests', () => {
      const csp = generateCsp({
        upgradeInsecureRequests: true,
      });

      expect(csp).toContain('upgrade-insecure-requests');
    });
  });

  describe('generateHsts', () => {
    it('sets max-age', () => {
      const hsts = generateHsts({ maxAge: 31536000 });

      expect(hsts).toContain('max-age=31536000');
    });

    it('includes includeSubDomains', () => {
      const hsts = generateHsts({
        maxAge: 31536000,
        includeSubDomains: true,
      });

      expect(hsts).toContain('includeSubDomains');
    });

    it('includes preload directive', () => {
      const hsts = generateHsts({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      });

      expect(hsts).toContain('preload');
    });

    it('defaults to one year max-age', () => {
      const hsts = generateHsts({});

      expect(hsts).toContain('max-age=31536000');
    });
  });

  describe('generatePermissionsPolicy', () => {
    it('disables camera by default', () => {
      const policy = generatePermissionsPolicy({ strict: true });

      expect(policy).toContain('camera=()');
    });

    it('disables microphone by default', () => {
      const policy = generatePermissionsPolicy({ strict: true });

      expect(policy).toContain('microphone=()');
    });

    it('disables geolocation by default', () => {
      const policy = generatePermissionsPolicy({ strict: true });

      expect(policy).toContain('geolocation=()');
    });

    it('allows specific features when configured', () => {
      const policy = generatePermissionsPolicy({
        camera: ['self'],
        geolocation: ['self', 'https://maps.example.com'],
      });

      expect(policy).toContain('camera=(self)');
      expect(policy).toContain('geolocation=(self "https://maps.example.com")');
    });

    it('handles payment feature', () => {
      const policy = generatePermissionsPolicy({
        payment: ['self'],
      });

      expect(policy).toContain('payment=(self)');
    });
  });

  describe('generateCrossOriginHeaders', () => {
    it('generates COOP header', () => {
      const headers = generateCrossOriginHeaders({
        coopPolicy: 'same-origin',
      });

      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });

    it('generates COEP header', () => {
      const headers = generateCrossOriginHeaders({
        coepPolicy: 'require-corp',
      });

      expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });

    it('generates CORP header', () => {
      const headers = generateCrossOriginHeaders({
        corpPolicy: 'same-origin',
      });

      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });

    it('supports cross-origin-isolated', () => {
      const headers = generateCrossOriginHeaders({
        coopPolicy: 'same-origin',
        coepPolicy: 'require-corp',
      });

      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    });
  });

  describe('generateSecurityHeaders', () => {
    it('includes X-Content-Type-Options', () => {
      const headers = generateSecurityHeaders({});

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('includes X-Frame-Options', () => {
      const headers = generateSecurityHeaders({});

      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('includes Referrer-Policy', () => {
      const headers = generateSecurityHeaders({});

      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('includes all headers for strict preset', () => {
      const headers = generateSecurityHeaders({ preset: 'strict' });

      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Strict-Transport-Security']).toBeDefined();
      expect(headers['X-Content-Type-Options']).toBeDefined();
      expect(headers['X-Frame-Options']).toBeDefined();
      expect(headers['Referrer-Policy']).toBeDefined();
      expect(headers['Permissions-Policy']).toBeDefined();
    });

    it('allows custom Referrer-Policy', () => {
      const headers = generateSecurityHeaders({
        referrerPolicy: 'no-referrer',
      });

      expect(headers['Referrer-Policy']).toBe('no-referrer');
    });
  });

  describe('validateHeaders', () => {
    it('validates correct headers', () => {
      const headers = {
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
      };

      const result = validateHeaders(headers);
      expect(result.valid).toBe(true);
    });

    it('detects missing required headers', () => {
      const headers = {
        'X-Content-Type-Options': 'nosniff',
      };

      const result = validateHeaders(headers, { required: ['Content-Security-Policy'] });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('Content-Security-Policy');
    });

    it('detects unsafe CSP directives', () => {
      const headers = {
        'Content-Security-Policy': "script-src 'unsafe-inline'",
      };

      const result = validateHeaders(headers, { strict: true });
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('unsafe-inline')])
      );
    });
  });

  describe('createSecurityHeadersManager', () => {
    it('creates manager with methods', () => {
      const manager = createSecurityHeadersManager();

      expect(manager.generate).toBeDefined();
      expect(manager.validate).toBeDefined();
      expect(manager.getCsp).toBeDefined();
      expect(manager.getHsts).toBeDefined();
    });

    it('applies default preset', () => {
      const manager = createSecurityHeadersManager({
        preset: 'strict',
      });

      const headers = manager.generate({});
      expect(headers['X-Frame-Options']).toBe('DENY');
    });
  });
});
