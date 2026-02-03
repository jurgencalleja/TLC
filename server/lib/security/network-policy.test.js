/**
 * Network Security Policy Tests
 */
import { describe, it, expect } from 'vitest';
import {
  validateNetworkConfig,
  analyzeNetworkTopology,
  detectExposedPorts,
  createNetworkValidator,
} from './network-policy.js';

describe('network-policy', () => {
  describe('validateNetworkConfig', () => {
    it('detects default bridge network usage', () => {
      const config = { services: { app: { image: 'node:20' } }, networks: {} };
      const result = validateNetworkConfig(config);
      expect(result.findings.some(f => f.rule === 'no-default-bridge')).toBe(true);
    });

    it('passes with custom networks', () => {
      const config = {
        services: { app: { image: 'node:20', networks: ['custom'] } },
        networks: { custom: {} },
      };
      const result = validateNetworkConfig(config);
      expect(result.findings.some(f => f.rule === 'no-default-bridge')).toBe(false);
    });

    it('detects database on external network', () => {
      const config = {
        services: { db: { image: 'postgres:16', networks: ['public'] } },
        networks: { public: {} },
      };
      const result = validateNetworkConfig(config);
      expect(result.findings.some(f => f.rule === 'database-internal-only')).toBe(true);
    });

    it('passes with database on internal network', () => {
      const config = {
        services: { db: { image: 'postgres:16', networks: ['backend'] } },
        networks: { backend: { internal: true } },
      };
      const result = validateNetworkConfig(config);
      expect(result.findings.some(f => f.rule === 'database-internal-only')).toBe(false);
    });

    it('warns on service with no network isolation', () => {
      const config = {
        services: {
          app: { image: 'node:20', networks: ['shared'] },
          db: { image: 'postgres:16', networks: ['shared'] },
          cache: { image: 'redis:7', networks: ['shared'] },
        },
        networks: { shared: {} },
      };
      const result = validateNetworkConfig(config);
      expect(result.findings.some(f => f.rule === 'recommend-network-segmentation')).toBe(true);
    });
  });

  describe('analyzeNetworkTopology', () => {
    it('identifies service connectivity', () => {
      const config = {
        services: {
          app: { image: 'node:20', networks: ['frontend', 'backend'] },
          db: { image: 'postgres:16', networks: ['backend'] },
        },
        networks: { frontend: {}, backend: { internal: true } },
      };
      const topology = analyzeNetworkTopology(config);
      expect(topology.services.app.networks).toContain('frontend');
      expect(topology.services.app.canReach).toContain('db');
    });

    it('identifies isolated services', () => {
      const config = {
        services: {
          app: { image: 'node:20', networks: ['frontend'] },
          db: { image: 'postgres:16', networks: ['backend'] },
        },
        networks: { frontend: {}, backend: { internal: true } },
      };
      const topology = analyzeNetworkTopology(config);
      expect(topology.services.app.canReach).not.toContain('db');
    });

    it('identifies external access points', () => {
      const config = {
        services: { app: { image: 'node:20', ports: ['3000:3000'], networks: ['public'] } },
        networks: { public: {} },
      };
      const topology = analyzeNetworkTopology(config);
      expect(topology.externalAccessPoints).toContain('app');
    });
  });

  describe('detectExposedPorts', () => {
    it('detects unnecessarily exposed database ports', () => {
      const config = {
        services: { db: { image: 'postgres:16', ports: ['5432:5432'] } },
        networks: {},
      };
      const result = detectExposedPorts(config);
      expect(result.findings.some(f => f.rule === 'database-port-exposed')).toBe(true);
    });

    it('passes with internal-only database', () => {
      const config = {
        services: { db: { image: 'postgres:16', expose: ['5432'] } },
        networks: {},
      };
      const result = detectExposedPorts(config);
      expect(result.findings.some(f => f.rule === 'database-port-exposed')).toBe(false);
    });

    it('warns on binding to 0.0.0.0', () => {
      const config = {
        services: { app: { image: 'node:20', ports: ['0.0.0.0:3000:3000'] } },
        networks: {},
      };
      const result = detectExposedPorts(config);
      expect(result.findings.some(f => f.rule === 'avoid-bind-all-interfaces')).toBe(true);
    });

    it('passes with localhost binding', () => {
      const config = {
        services: { app: { image: 'node:20', ports: ['127.0.0.1:3000:3000'] } },
        networks: {},
      };
      const result = detectExposedPorts(config);
      expect(result.findings.some(f => f.rule === 'avoid-bind-all-interfaces')).toBe(false);
    });
  });

  describe('createNetworkValidator', () => {
    it('calculates network security score', () => {
      const validator = createNetworkValidator();
      const secureConfig = {
        services: {
          app: { image: 'node:20', networks: ['frontend', 'backend'] },
          db: { image: 'postgres:16', networks: ['backend'] },
        },
        networks: { frontend: {}, backend: { internal: true } },
      };
      const result = validator.validate(secureConfig);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('generates network topology diagram data', () => {
      const validator = createNetworkValidator();
      const config = {
        services: {
          app: { image: 'node:20', networks: ['web'] },
          api: { image: 'node:20', networks: ['web', 'data'] },
          db: { image: 'postgres:16', networks: ['data'] },
        },
        networks: { web: {}, data: { internal: true } },
      };
      const result = validator.validate(config);
      expect(result.topology).toBeDefined();
      expect(result.topology.nodes.length).toBe(3);
    });
  });
});
