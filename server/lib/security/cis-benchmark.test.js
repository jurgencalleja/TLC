/**
 * CIS Docker Benchmark Tests
 */
import { describe, it, expect } from 'vitest';
import {
  checkDockerfileCompliance,
  checkComposeCompliance,
  checkRuntimeCompliance,
  generateComplianceReport,
  createCisBenchmark,
  CIS_CHECKS,
} from './cis-benchmark.js';

describe('cis-benchmark', () => {
  describe('checkDockerfileCompliance', () => {
    it('checks for USER directive (CIS 4.1)', () => {
      const dockerfile = 'FROM node:20\nCMD ["node", "app.js"]';
      const result = checkDockerfileCompliance(dockerfile);
      expect(result.findings.some(f => f.cis === '4.1')).toBe(true);
    });

    it('passes with USER directive', () => {
      const dockerfile = 'FROM node:20\nUSER node\nCMD ["node", "app.js"]';
      const result = checkDockerfileCompliance(dockerfile);
      expect(result.findings.some(f => f.cis === '4.1')).toBe(false);
    });

    it('checks for HEALTHCHECK (CIS 4.6)', () => {
      const dockerfile = 'FROM node:20\nUSER node';
      const result = checkDockerfileCompliance(dockerfile);
      expect(result.findings.some(f => f.cis === '4.6')).toBe(true);
    });

    it('checks for content trust labels', () => {
      const dockerfile = 'FROM node:20\nUSER node';
      const result = checkDockerfileCompliance(dockerfile);
      expect(result.findings.some(f => f.cis === '4.8')).toBe(true);
    });
  });

  describe('checkComposeCompliance', () => {
    it('checks privileged mode (CIS 5.4)', () => {
      const compose = { services: { app: { privileged: true } } };
      const result = checkComposeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.4')).toBe(true);
    });

    it('checks capabilities (CIS 5.3)', () => {
      const compose = { services: { app: { image: 'node:20' } } };
      const result = checkComposeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.3')).toBe(true);
    });

    it('checks resource limits (CIS 5.10)', () => {
      const compose = { services: { app: { image: 'node:20', cap_drop: ['ALL'] } } };
      const result = checkComposeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.10')).toBe(true);
    });

    it('passes with proper security config', () => {
      const compose = {
        services: {
          app: {
            image: 'node:20',
            cap_drop: ['ALL'],
            read_only: true,
            user: '1000:1000',
            security_opt: ['no-new-privileges:true'],
            deploy: { resources: { limits: { memory: '512M' } } },
          },
        },
      };
      const result = checkComposeCompliance(compose);
      expect(result.findings.filter(f => f.severity === 'high').length).toBe(0);
    });
  });

  describe('checkRuntimeCompliance', () => {
    it('checks for PID limits (CIS 5.11)', () => {
      const compose = { services: { app: { image: 'node:20' } } };
      const result = checkRuntimeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.11')).toBe(true);
    });

    it('checks network mode (CIS 5.13)', () => {
      const compose = { services: { app: { network_mode: 'host' } } };
      const result = checkRuntimeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.13')).toBe(true);
    });

    it('checks for restart policy (CIS 5.14)', () => {
      const compose = { services: { app: { restart: 'always' } } };
      const result = checkRuntimeCompliance(compose);
      expect(result.findings.some(f => f.cis === '5.14')).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    it('generates Level 1 compliance report', () => {
      const dockerfile = 'FROM node:20\nUSER node\nHEALTHCHECK CMD curl -f http://localhost/';
      const compose = {
        services: { app: { cap_drop: ['ALL'], user: '1000', deploy: { resources: { limits: { memory: '512M' } } } } },
      };
      const report = generateComplianceReport({ dockerfile, compose });
      expect(report.level1Score).toBeDefined();
      expect(report.level1Score).toBeGreaterThan(0);
    });

    it('categorizes findings by CIS section', () => {
      const dockerfile = 'FROM node:20';
      const compose = { services: { app: { privileged: true } } };
      const report = generateComplianceReport({ dockerfile, compose });
      expect(report.bySection).toBeDefined();
      expect(report.bySection['4']).toBeDefined();
      expect(report.bySection['5']).toBeDefined();
    });
  });

  describe('createCisBenchmark', () => {
    it('creates benchmark checker', () => {
      const checker = createCisBenchmark();
      expect(checker.checkDockerfile).toBeDefined();
      expect(checker.checkCompose).toBeDefined();
      expect(checker.generateReport).toBeDefined();
    });

    it('calculates overall score', () => {
      const checker = createCisBenchmark();
      const dockerfile = 'FROM node:20\nUSER node\nHEALTHCHECK CMD true';
      const compose = { services: { app: { cap_drop: ['ALL'] } } };
      const result = checker.audit({ dockerfile, compose });
      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
