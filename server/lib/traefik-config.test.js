/**
 * Traefik Config Generator Tests
 */

import { describe, it, expect } from 'vitest';

describe('TraefikConfig', () => {
  describe('generateTraefikYml', () => {
    it('generates valid traefik.yml structure', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user', 'order'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateTraefikYml(config);

      expect(result).toContain('entryPoints:');
      expect(result).toContain('api:');
      expect(result).toContain('providers:');
    });

    it('entrypoint web on port 80', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateTraefikYml(config);

      expect(result).toContain('web:');
      expect(result).toContain(':80');
    });

    it('entrypoint websecure when tls enabled', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'example.com',
        tls: true,
      };

      const result = traefik.generateTraefikYml(config);

      expect(result).toContain('websecure:');
      expect(result).toContain(':443');
    });

    it('docker provider configured', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateTraefikYml(config);

      expect(result).toContain('docker:');
      expect(result).toContain('exposedByDefault: false');
    });

    it('API dashboard enabled', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateTraefikYml(config);

      expect(result).toContain('api:');
      expect(result).toContain('dashboard: true');
    });
  });

  describe('generateDynamicConfig', () => {
    it('routes /api/user to user-service', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user', 'order'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('user-router:');
      expect(result).toContain('PathPrefix(`/api/user`)');
    });

    it('routes /api/order to order-service', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user', 'order'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('order-router:');
      expect(result).toContain('PathPrefix(`/api/order`)');
    });

    it('health check middleware included', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('middlewares:');
    });

    it('rate limiting middleware configured', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('rate-limit:');
      expect(result).toContain('rateLimit:');
    });
  });

  describe('generateServiceRouter', () => {
    it('generates router with PathPrefix rule', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateServiceRouter('user', 3000);

      expect(result).toContain('user-router:');
      expect(result).toContain('PathPrefix(`/api/user`)');
    });

    it('includes strip prefix middleware', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateServiceRouter('user', 3000);

      expect(result).toContain('middlewares:');
      expect(result).toContain('strip-user');
    });

    it('configures service backend with port', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateServiceRouter('user', 3001);

      expect(result).toContain('user-service:');
      expect(result).toContain('http://user-service:3001');
    });

    it('handles custom service port', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateServiceRouter('order', 4000);

      expect(result).toContain('http://order-service:4000');
    });
  });

  describe('generateMiddlewares', () => {
    it('rate limit average 100', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateMiddlewares();

      expect(result).toContain('rate-limit:');
      expect(result).toContain('average: 100');
    });

    it('rate limit burst 50', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateMiddlewares();

      expect(result).toContain('burst: 50');
    });

    it('strip prefix middleware', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateMiddlewares();

      expect(result).toContain('stripPrefix:');
    });

    it('security headers middleware', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateMiddlewares();

      expect(result).toContain('headers:');
      expect(result).toContain('customResponseHeaders:');
    });
  });

  describe('generateTlsConfig', () => {
    it('TLS config generated when enabled', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateTlsConfig('example.com');

      expect(result).toContain('certificatesResolvers:');
    });

    it('uses Let\'s Encrypt resolver', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateTlsConfig('example.com');

      expect(result).toContain('letsencrypt:');
      expect(result).toContain('acme:');
    });

    it('includes certificate storage', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateTlsConfig('example.com');

      expect(result).toContain('storage:');
      expect(result).toContain('acme.json');
    });

    it('domain configurable', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const result = traefik.generateTlsConfig('myapp.example.com');

      expect(result).toContain('myapp.example.com');
    });
  });

  describe('edge cases', () => {
    it('handles single service', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['api'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('api-router:');
      expect(result).toContain('PathPrefix(`/api/api`)');
    });

    it('handles multiple services', async () => {
      const { TraefikConfig } = await import('./traefik-config.js');
      const traefik = new TraefikConfig();

      const config = {
        services: ['user', 'order', 'notification', 'payment'],
        domain: 'localhost',
        tls: false,
      };

      const result = traefik.generateDynamicConfig(config);

      expect(result).toContain('user-router:');
      expect(result).toContain('order-router:');
      expect(result).toContain('notification-router:');
      expect(result).toContain('payment-router:');
    });
  });
});
