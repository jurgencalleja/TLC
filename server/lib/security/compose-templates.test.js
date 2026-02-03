/**
 * Hardened Docker Compose Templates Tests
 */
import { describe, it, expect } from 'vitest';
import {
  generateProductionCompose,
  generateSecurityCompose,
  generateDevCompose,
  mergeComposeFiles,
  SECURITY_DEFAULTS,
} from './compose-templates.js';
import { checkComposeCompliance, checkRuntimeCompliance } from './cis-benchmark.js';
describe('compose-templates', () => {
  describe('generateProductionCompose', () => {
    it('generates valid compose structure', () => {
      const compose = generateProductionCompose();
      expect(compose.version).toBeDefined();
      expect(compose.services).toBeDefined();
    });

    it('includes server service', () => {
      const compose = generateProductionCompose();
      expect(compose.services.server).toBeDefined();
    });

    it('includes dashboard service', () => {
      const compose = generateProductionCompose();
      expect(compose.services.dashboard).toBeDefined();
    });

    it('sets resource limits on all services', () => {
      const compose = generateProductionCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        const hasLimits = svc.deploy?.resources?.limits || svc.mem_limit;
        expect(hasLimits, `Service ${name} should have memory limits`).toBeTruthy();
      }
    });

    it('uses read_only filesystem where applicable', () => {
      const compose = generateProductionCompose();
      // Non-database services should be read-only
      expect(compose.services.server.read_only).toBe(true);
      expect(compose.services.dashboard.read_only).toBe(true);
    });

    it('drops ALL capabilities', () => {
      const compose = generateProductionCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        expect(svc.cap_drop, `Service ${name} should drop ALL`).toContain('ALL');
      }
    });

    it('sets no-new-privileges', () => {
      const compose = generateProductionCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        const hasNoNewPriv = svc.security_opt?.some(o => o.includes('no-new-privileges'));
        expect(hasNoNewPriv, `Service ${name} should set no-new-privileges`).toBe(true);
      }
    });

    it('uses internal network for database', () => {
      const compose = generateProductionCompose({ includeDb: true });
      if (compose.services.postgres) {
        const networks = compose.services.postgres.networks || [];
        expect(networks).toContain('internal');
      }
    });

    it('does not expose database ports to host', () => {
      const compose = generateProductionCompose({ includeDb: true });
      if (compose.services.postgres) {
        expect(compose.services.postgres.ports).toBeUndefined();
      }
    });

    it('passes CIS compliance checks', () => {
      const compose = generateProductionCompose();
      const result = checkComposeCompliance(compose);
      const criticalFindings = result.findings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBe(0);
    });

    it('passes runtime compliance checks', () => {
      const compose = generateProductionCompose();
      const result = checkRuntimeCompliance(compose);
      const highFindings = result.findings.filter(f => f.severity === 'high');
      expect(highFindings.length).toBe(0);
    });
  });

  describe('generateSecurityCompose', () => {
    it('generates overlay for security hardening', () => {
      const compose = generateSecurityCompose();
      expect(compose.version).toBeDefined();
      expect(compose.services).toBeDefined();
    });

    it('adds seccomp profiles', () => {
      const compose = generateSecurityCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        const hasSeccomp = svc.security_opt?.some(o => o.includes('seccomp'));
        expect(hasSeccomp, `Service ${name} should have seccomp`).toBe(true);
      }
    });

    it('adds AppArmor profiles when specified', () => {
      const compose = generateSecurityCompose({ apparmor: true });
      for (const [name, svc] of Object.entries(compose.services)) {
        const hasApparmor = svc.security_opt?.some(o => o.includes('apparmor'));
        expect(hasApparmor, `Service ${name} should have apparmor`).toBe(true);
      }
    });

    it('sets PID limits', () => {
      const compose = generateSecurityCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        expect(svc.pids_limit, `Service ${name} should have pids_limit`).toBeDefined();
      }
    });

    it('sets ulimits', () => {
      const compose = generateSecurityCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        expect(svc.ulimits, `Service ${name} should have ulimits`).toBeDefined();
      }
    });

    it('disables privileged mode', () => {
      const compose = generateSecurityCompose();
      for (const [name, svc] of Object.entries(compose.services)) {
        expect(svc.privileged, `Service ${name} should not be privileged`).toBeFalsy();
      }
    });
  });

  describe('generateDevCompose', () => {
    it('generates development configuration', () => {
      const compose = generateDevCompose();
      expect(compose.services).toBeDefined();
    });

    it('mounts source code volumes', () => {
      const compose = generateDevCompose();
      expect(compose.services.server.volumes).toBeDefined();
      expect(compose.services.server.volumes.some(v => v.includes(':'))).toBe(true);
    });

    it('exposes ports for development', () => {
      const compose = generateDevCompose();
      expect(compose.services.server.ports).toBeDefined();
    });

    it('still maintains basic security', () => {
      const compose = generateDevCompose();
      // Even dev should drop ALL capabilities
      for (const [name, svc] of Object.entries(compose.services)) {
        if (svc.cap_drop) {
          expect(svc.cap_drop).toContain('ALL');
        }
      }
    });
  });

  describe('mergeComposeFiles', () => {
    it('merges base and overlay', () => {
      const base = {
        version: '3.8',
        services: { app: { image: 'node:20' } },
      };
      const overlay = {
        services: { app: { read_only: true } },
      };
      const merged = mergeComposeFiles(base, overlay);
      expect(merged.services.app.image).toBe('node:20');
      expect(merged.services.app.read_only).toBe(true);
    });

    it('overlay arrays replace base arrays', () => {
      const base = {
        services: { app: { cap_drop: ['NET_RAW'] } },
      };
      const overlay = {
        services: { app: { cap_drop: ['ALL'] } },
      };
      const merged = mergeComposeFiles(base, overlay);
      expect(merged.services.app.cap_drop).toEqual(['ALL']);
    });

    it('merges networks', () => {
      const base = {
        networks: { frontend: {} },
      };
      const overlay = {
        networks: { backend: { internal: true } },
      };
      const merged = mergeComposeFiles(base, overlay);
      expect(merged.networks.frontend).toBeDefined();
      expect(merged.networks.backend).toBeDefined();
    });
  });

  describe('SECURITY_DEFAULTS', () => {
    it('defines default security settings', () => {
      expect(SECURITY_DEFAULTS.cap_drop).toContain('ALL');
      expect(SECURITY_DEFAULTS.security_opt).toBeDefined();
      expect(SECURITY_DEFAULTS.read_only).toBe(true);
    });

    it('includes memory limits', () => {
      expect(SECURITY_DEFAULTS.deploy.resources.limits.memory).toBeDefined();
    });

    it('includes restart policy', () => {
      expect(SECURITY_DEFAULTS.restart).toBe('on-failure:5');
    });
  });

  describe('integration with validators', () => {
    it('production compose passes all CIS checks', () => {
      const compose = generateProductionCompose();
      const composeResult = checkComposeCompliance(compose);
      const runtimeResult = checkRuntimeCompliance(compose);

      const allFindings = [...composeResult.findings, ...runtimeResult.findings];
      const criticalFindings = allFindings.filter(f => f.severity === 'critical');
      expect(criticalFindings.length).toBe(0);
    });
  });
});
