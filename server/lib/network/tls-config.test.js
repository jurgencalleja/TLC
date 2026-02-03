/**
 * TLS Configuration Manager Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateTlsConfig,
  generateCaddyTls,
  generateNginxTls,
  generateLetsEncryptConfig,
  generateCaaRecord,
  TLS_VERSIONS,
  CIPHER_SUITES,
  createTlsConfigManager,
} from './tls-config.js';

describe('tls-config', () => {
  describe('TLS_VERSIONS', () => {
    it('defines TLS version constants', () => {
      expect(TLS_VERSIONS.TLS_1_2).toBe('1.2');
      expect(TLS_VERSIONS.TLS_1_3).toBe('1.3');
    });
  });

  describe('CIPHER_SUITES', () => {
    it('defines strong cipher suites', () => {
      expect(CIPHER_SUITES.MODERN).toContain('TLS_AES_256_GCM_SHA384');
      expect(CIPHER_SUITES.MODERN).toContain('TLS_CHACHA20_POLY1305_SHA256');
    });

    it('excludes weak ciphers', () => {
      expect(CIPHER_SUITES.MODERN).not.toContain('RC4');
      expect(CIPHER_SUITES.MODERN).not.toContain('DES');
      expect(CIPHER_SUITES.MODERN).not.toContain('MD5');
    });
  });

  describe('generateCaddyTls', () => {
    it('generates valid Caddyfile TLS block', () => {
      const config = generateCaddyTls({ domain: 'example.com' });

      expect(config).toContain('example.com');
      expect(config).toContain('tls');
    });

    it('enforces TLS 1.3 minimum when specified', () => {
      const config = generateCaddyTls({
        domain: 'example.com',
        minVersion: '1.3',
      });

      expect(config).toContain('protocols tls1.3');
    });

    it('configures OCSP stapling', () => {
      const config = generateCaddyTls({
        domain: 'example.com',
        ocspStapling: true,
      });

      expect(config).toContain('ocsp_stapling');
    });

    it('configures Let\'s Encrypt email', () => {
      const config = generateCaddyTls({
        domain: 'example.com',
        email: 'admin@example.com',
      });

      expect(config).toContain('admin@example.com');
    });
  });

  describe('generateNginxTls', () => {
    it('generates valid Nginx SSL config', () => {
      const config = generateNginxTls({ domain: 'example.com' });

      expect(config).toContain('ssl_certificate');
      expect(config).toContain('ssl_certificate_key');
    });

    it('enforces TLS 1.3 only when specified', () => {
      const config = generateNginxTls({
        domain: 'example.com',
        minVersion: '1.3',
      });

      expect(config).toContain('ssl_protocols TLSv1.3');
      expect(config).not.toContain('TLSv1.2');
    });

    it('configures strong cipher suites', () => {
      const config = generateNginxTls({
        domain: 'example.com',
        ciphers: 'modern',
      });

      expect(config).toContain('ssl_ciphers');
      expect(config).toContain('ECDHE');
    });

    it('enables OCSP stapling', () => {
      const config = generateNginxTls({
        domain: 'example.com',
        ocspStapling: true,
      });

      expect(config).toContain('ssl_stapling on');
      expect(config).toContain('ssl_stapling_verify on');
    });

    it('sets session timeout and cache', () => {
      const config = generateNginxTls({ domain: 'example.com' });

      expect(config).toContain('ssl_session_timeout');
      expect(config).toContain('ssl_session_cache');
    });
  });

  describe('generateLetsEncryptConfig', () => {
    it('generates certbot config', () => {
      const config = generateLetsEncryptConfig({
        domain: 'example.com',
        email: 'admin@example.com',
      });

      expect(config).toContain('example.com');
      expect(config).toContain('admin@example.com');
    });

    it('supports wildcard domains', () => {
      const config = generateLetsEncryptConfig({
        domain: '*.example.com',
        email: 'admin@example.com',
        wildcard: true,
      });

      expect(config).toContain('*.example.com');
      expect(config).toContain('dns');
    });

    it('configures auto-renewal', () => {
      const config = generateLetsEncryptConfig({
        domain: 'example.com',
        email: 'admin@example.com',
        autoRenew: true,
      });

      expect(config).toContain('renew');
    });

    it('supports staging environment', () => {
      const config = generateLetsEncryptConfig({
        domain: 'example.com',
        email: 'admin@example.com',
        staging: true,
      });

      expect(config).toContain('staging');
    });
  });

  describe('generateCaaRecord', () => {
    it('generates CAA record for Let\'s Encrypt', () => {
      const record = generateCaaRecord({
        domain: 'example.com',
        ca: 'letsencrypt.org',
      });

      expect(record).toContain('CAA');
      expect(record).toContain('letsencrypt.org');
      expect(record).toContain('issue');
    });

    it('supports issuewild for wildcards', () => {
      const record = generateCaaRecord({
        domain: 'example.com',
        ca: 'letsencrypt.org',
        wildcard: true,
      });

      expect(record).toContain('issuewild');
    });

    it('adds iodef for reporting', () => {
      const record = generateCaaRecord({
        domain: 'example.com',
        ca: 'letsencrypt.org',
        reportEmail: 'security@example.com',
      });

      expect(record).toContain('iodef');
      expect(record).toContain('security@example.com');
    });
  });

  describe('generateTlsConfig', () => {
    it('generates config for specified server type', () => {
      const caddyConfig = generateTlsConfig({
        serverType: 'caddy',
        domain: 'example.com',
      });
      expect(caddyConfig).toContain('tls');

      const nginxConfig = generateTlsConfig({
        serverType: 'nginx',
        domain: 'example.com',
      });
      expect(nginxConfig).toContain('ssl_');
    });

    it('includes all security options', () => {
      const config = generateTlsConfig({
        serverType: 'nginx',
        domain: 'example.com',
        minVersion: '1.3',
        ocspStapling: true,
        hsts: true,
      });

      expect(config).toContain('TLSv1.3');
      expect(config).toContain('ssl_stapling');
    });
  });

  describe('createTlsConfigManager', () => {
    it('creates manager with methods', () => {
      const manager = createTlsConfigManager();

      expect(manager.generateCaddy).toBeDefined();
      expect(manager.generateNginx).toBeDefined();
      expect(manager.generateLetsEncrypt).toBeDefined();
      expect(manager.generateCaa).toBeDefined();
    });

    it('uses default options from config', () => {
      const manager = createTlsConfigManager({
        defaults: {
          minVersion: '1.3',
          ocspStapling: true,
        },
      });

      const config = manager.generateNginx({ domain: 'example.com' });
      expect(config).toContain('TLSv1.3');
      expect(config).toContain('ssl_stapling');
    });
  });
});
