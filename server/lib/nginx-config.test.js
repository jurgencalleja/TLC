import { describe, it, expect } from 'vitest';

const { generateSiteConfig, generateWildcardConfig, generateSslConfig } = await import('./nginx-config.js');

describe('Nginx Config Generator', () => {
  describe('generateSiteConfig', () => {
    it('produces valid Nginx server block', () => {
      const config = generateSiteConfig({
        domain: 'myapp.dev',
        port: 3000,
        proxyPass: 'http://127.0.0.1:3000',
      });
      expect(config).toContain('server {');
      expect(config).toContain('server_name myapp.dev');
      expect(config).toContain('proxy_pass http://127.0.0.1:3000');
    });

    it('includes proxy headers', () => {
      const config = generateSiteConfig({
        domain: 'myapp.dev',
        port: 3000,
        proxyPass: 'http://127.0.0.1:3000',
      });
      expect(config).toContain('proxy_set_header Host');
      expect(config).toContain('proxy_set_header X-Real-IP');
      expect(config).toContain('proxy_set_header X-Forwarded-For');
    });

    it('includes WebSocket upgrade headers', () => {
      const config = generateSiteConfig({
        domain: 'myapp.dev',
        port: 3000,
        proxyPass: 'http://127.0.0.1:3000',
      });
      expect(config).toContain('proxy_http_version 1.1');
      expect(config).toContain('Upgrade');
      expect(config).toContain('Connection');
    });

    it('listens on port 80 by default', () => {
      const config = generateSiteConfig({
        domain: 'myapp.dev',
        port: 3000,
        proxyPass: 'http://127.0.0.1:3000',
      });
      expect(config).toContain('listen 80');
    });
  });

  describe('generateWildcardConfig', () => {
    it('routes subdomains to container ports', () => {
      const config = generateWildcardConfig('myapp.dev', {
        branches: [
          { subdomain: 'feat-login', port: 4001 },
          { subdomain: 'main', port: 4000 },
        ],
      });
      expect(config).toContain('*.myapp.dev');
      expect(config).toContain('feat-login');
      expect(config).toContain('4001');
    });

    it('includes default server for unknown subdomains', () => {
      const config = generateWildcardConfig('myapp.dev', { branches: [] });
      expect(config).toContain('default_server');
    });
  });

  describe('generateSslConfig', () => {
    it('references Lets Encrypt certificate paths', () => {
      const config = generateSslConfig('myapp.dev');
      expect(config).toContain('ssl_certificate');
      expect(config).toContain('/etc/letsencrypt');
      expect(config).toContain('myapp.dev');
    });

    it('includes SSL security settings', () => {
      const config = generateSslConfig('myapp.dev');
      expect(config).toContain('ssl_protocols');
    });
  });
});
