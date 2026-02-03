/**
 * Container Runtime Security Validator Tests
 *
 * Tests for docker-compose and container runtime security validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCompose,
  parseCompose,
  validateService,
  createRuntimeValidator,
  SEVERITY,
} from './container-runtime.js';

describe('container-runtime', () => {
  describe('parseCompose', () => {
    it('parses basic docker-compose file', () => {
      const compose = `
version: '3.8'
services:
  app:
    image: node:20-alpine
    ports:
      - "3000:3000"
  db:
    image: postgres:16
      `.trim();

      const parsed = parseCompose(compose);

      expect(parsed.version).toBe('3.8');
      expect(Object.keys(parsed.services)).toHaveLength(2);
      expect(parsed.services.app.image).toBe('node:20-alpine');
    });

    it('parses service security options', () => {
      const compose = `
services:
  app:
    image: node:20-alpine
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    user: "1000:1000"
      `.trim();

      const parsed = parseCompose(compose);
      const app = parsed.services.app;

      expect(app.cap_drop).toContain('ALL');
      expect(app.cap_add).toContain('NET_BIND_SERVICE');
      expect(app.read_only).toBe(true);
      expect(app.user).toBe('1000:1000');
    });

    it('parses network configuration', () => {
      const compose = `
services:
  app:
    image: node:20-alpine
    networks:
      - frontend
      - backend
networks:
  frontend:
  backend:
    internal: true
      `.trim();

      const parsed = parseCompose(compose);

      expect(parsed.networks).toBeDefined();
      expect(parsed.networks.backend?.internal).toBe(true);
    });
  });

  describe('validateService - privileged mode', () => {
    it('detects privileged: true', () => {
      const service = {
        image: 'node:20',
        privileged: true,
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'no-privileged')).toBe(true);
    });

    it('passes without privileged flag', () => {
      const service = {
        image: 'node:20',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'no-privileged')).toBe(false);
    });
  });

  describe('validateService - capabilities', () => {
    it('detects missing cap_drop: ALL', () => {
      const service = {
        image: 'node:20',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'require-cap-drop-all')).toBe(true);
    });

    it('passes with cap_drop: ALL', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'require-cap-drop-all')).toBe(false);
    });

    it('warns on dangerous capabilities', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        cap_add: ['SYS_ADMIN', 'NET_ADMIN'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'dangerous-capabilities')).toBe(true);
    });

    it('allows safe capabilities', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        cap_add: ['NET_BIND_SERVICE', 'CHOWN'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'dangerous-capabilities')).toBe(false);
    });
  });

  describe('validateService - network mode', () => {
    it('detects host network mode', () => {
      const service = {
        image: 'node:20',
        network_mode: 'host',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'no-host-network')).toBe(true);
    });

    it('passes with bridge network', () => {
      const service = {
        image: 'node:20',
        networks: ['app-network'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'no-host-network')).toBe(false);
    });
  });

  describe('validateService - read-only filesystem', () => {
    it('recommends read_only for stateless services', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-read-only')).toBe(true);
    });

    it('passes with read_only: true', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        read_only: true,
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-read-only')).toBe(false);
    });

    it('skips read_only check for databases', () => {
      const service = {
        image: 'postgres:16',
        cap_drop: ['ALL'],
      };

      const result = validateService('db', service);

      // Should not recommend read_only for database
      const finding = result.findings.find(f => f.rule === 'recommend-read-only');
      expect(finding).toBeUndefined();
    });
  });

  describe('validateService - user', () => {
    it('detects missing user directive', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-user')).toBe(true);
    });

    it('passes with user specified', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        user: '1000:1000',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-user')).toBe(false);
    });

    it('detects root user', () => {
      const service = {
        image: 'node:20',
        user: 'root',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'no-root-user')).toBe(true);
    });
  });

  describe('validateService - security_opt', () => {
    it('recommends no-new-privileges', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-no-new-privileges')).toBe(true);
    });

    it('passes with no-new-privileges set', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        security_opt: ['no-new-privileges:true'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-no-new-privileges')).toBe(false);
    });

    it('recommends seccomp profile', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-seccomp')).toBe(true);
    });
  });

  describe('validateService - resource limits', () => {
    it('recommends memory limits', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-resource-limits')).toBe(true);
    });

    it('passes with deploy limits', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        deploy: {
          resources: {
            limits: {
              memory: '512M',
              cpus: '0.5',
            },
          },
        },
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-resource-limits')).toBe(false);
    });

    it('passes with mem_limit', () => {
      const service = {
        image: 'node:20',
        cap_drop: ['ALL'],
        mem_limit: '512m',
      };

      const result = validateService('app', service);

      expect(result.findings.some(f => f.rule === 'recommend-resource-limits')).toBe(false);
    });
  });

  describe('validateCompose - networks', () => {
    it('warns on default bridge network', () => {
      const compose = `
services:
  app:
    image: node:20
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'use-custom-networks')).toBe(true);
    });

    it('passes with custom networks', () => {
      const compose = `
services:
  app:
    image: node:20
    networks:
      - app-network
networks:
  app-network:
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'use-custom-networks')).toBe(false);
    });

    it('recommends internal networks for databases', () => {
      const compose = `
services:
  db:
    image: postgres:16
    networks:
      - backend
networks:
  backend:
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'database-internal-network')).toBe(true);
    });

    it('passes with internal network for database', () => {
      const compose = `
services:
  db:
    image: postgres:16
    networks:
      - backend
networks:
  backend:
    internal: true
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'database-internal-network')).toBe(false);
    });
  });

  describe('validateCompose - secrets', () => {
    it('detects passwords in environment', () => {
      const compose = `
services:
  app:
    image: node:20
    environment:
      - DB_PASSWORD=secret123
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-env')).toBe(true);
    });

    it('passes with variable reference', () => {
      const compose = `
services:
  app:
    image: node:20
    environment:
      - DB_PASSWORD=\${DB_PASSWORD}
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'no-secrets-in-env')).toBe(false);
    });

    it('recommends Docker secrets for sensitive data', () => {
      const compose = `
services:
  app:
    image: node:20
    environment:
      DB_PASSWORD: "\${DB_PASSWORD}"
      `.trim();

      const result = validateCompose(compose);

      expect(result.findings.some(f => f.rule === 'recommend-docker-secrets')).toBe(true);
    });
  });

  describe('createRuntimeValidator', () => {
    it('creates validator with custom rules', () => {
      const validator = createRuntimeValidator({
        rules: {
          'recommend-read-only': 'off',
          'recommend-seccomp': 'off',
        },
      });

      const compose = `
services:
  app:
    image: node:20
    cap_drop:
      - ALL
      `.trim();

      const result = validator.validate(compose);

      expect(result.findings.some(f => f.rule === 'recommend-read-only')).toBe(false);
      expect(result.findings.some(f => f.rule === 'recommend-seccomp')).toBe(false);
    });

    it('calculates security score', () => {
      const validator = createRuntimeValidator();

      const secureCompose = `
services:
  app:
    image: node:20-alpine
    user: "1000:1000"
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
      - seccomp:default
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - app-network
networks:
  app-network:
      `.trim();

      const result = validator.validate(secureCompose);

      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('generates security recommendations', () => {
      const compose = `
services:
  app:
    image: node:20
    privileged: true
      `.trim();

      const result = validateCompose(compose);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
