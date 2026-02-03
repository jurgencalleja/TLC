/**
 * Caddy Configuration Tests
 */
import { describe, it, expect } from 'vitest';
import { generateCaddyfile, generateReverseProxy, generateSecurityHeaders, createCaddyConfig } from './caddy-config.js';

describe('caddy-config', () => {
  describe('generateCaddyfile', () => {
    it('generates Caddyfile for single domain', () => {
      const config = generateCaddyfile({ domain: 'example.com', upstream: 'localhost:3000' });
      expect(config).toContain('example.com');
      expect(config).toContain('reverse_proxy');
    });

    it('configures automatic HTTPS', () => {
      const config = generateCaddyfile({ domain: 'example.com' });
      expect(config).toContain('tls');
    });

    it('supports wildcard subdomains', () => {
      const config = generateCaddyfile({ domain: '*.example.com' });
      expect(config).toContain('*.example.com');
    });
  });

  describe('generateReverseProxy', () => {
    it('generates proxy config', () => {
      const config = generateReverseProxy({ upstream: 'localhost:3000' });
      expect(config).toContain('reverse_proxy localhost:3000');
    });
  });

  describe('generateSecurityHeaders', () => {
    it('includes security headers', () => {
      const config = generateSecurityHeaders({});
      expect(config).toContain('header');
      expect(config).toContain('X-Frame-Options');
    });
  });

  describe('createCaddyConfig', () => {
    it('creates config manager', () => {
      const manager = createCaddyConfig();
      expect(manager.generate).toBeDefined();
      expect(manager.addSite).toBeDefined();
    });
  });
});
