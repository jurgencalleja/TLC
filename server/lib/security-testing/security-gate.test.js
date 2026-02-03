/**
 * Security Gate Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { evaluateGate, checkThresholds, createPolicy, loadPolicies, createSecurityGate } from './security-gate.js';

describe('security-gate', () => {
  describe('evaluateGate', () => {
    it('passes when no critical findings', () => {
      const findings = [{ severity: 'low' }, { severity: 'medium' }];
      const policy = { maxCritical: 0, maxHigh: 5 };
      const result = evaluateGate(findings, policy);
      expect(result.passed).toBe(true);
    });

    it('fails when critical findings exceed threshold', () => {
      const findings = [{ severity: 'critical' }];
      const policy = { maxCritical: 0 };
      const result = evaluateGate(findings, policy);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('critical');
    });
  });

  describe('checkThresholds', () => {
    it('checks severity thresholds', () => {
      const findings = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'high' }
      ];
      const thresholds = { critical: 0, high: 1 };
      const result = checkThresholds(findings, thresholds);
      expect(result.violations).toContain('critical');
      expect(result.violations).toContain('high');
    });

    it('passes when within thresholds', () => {
      const findings = [{ severity: 'low' }];
      const thresholds = { critical: 0, high: 5, medium: 10 };
      const result = checkThresholds(findings, thresholds);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('createPolicy', () => {
    it('creates policy from config', () => {
      const config = {
        name: 'production',
        thresholds: { critical: 0, high: 0 },
        requiredScans: ['sast', 'dast']
      };
      const policy = createPolicy(config);
      expect(policy.name).toBe('production');
      expect(policy.evaluate).toBeDefined();
    });

    it('supports baseline comparison', () => {
      const config = {
        name: 'pr-check',
        baseline: 'main',
        allowNewFindings: false
      };
      const policy = createPolicy(config);
      expect(policy.baseline).toBe('main');
    });
  });

  describe('loadPolicies', () => {
    it('loads policies from file', async () => {
      const mockRead = vi.fn().mockResolvedValue(JSON.stringify({
        policies: [{ name: 'default', thresholds: {} }]
      }));
      const policies = await loadPolicies({ readFile: mockRead });
      expect(policies.length).toBeGreaterThan(0);
    });

    it('returns default policy if no file', async () => {
      const mockRead = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const policies = await loadPolicies({ readFile: mockRead });
      expect(policies[0].name).toBe('default');
    });
  });

  describe('createSecurityGate', () => {
    it('creates gate', () => {
      const gate = createSecurityGate();
      expect(gate.evaluate).toBeDefined();
      expect(gate.setPolicy).toBeDefined();
    });

    it('evaluates findings against policy', () => {
      const gate = createSecurityGate();
      gate.setPolicy({ maxCritical: 0, maxHigh: 2 });

      const result = gate.evaluate([{ severity: 'critical' }]);
      expect(result.passed).toBe(false);
    });

    it('supports CI/CD integration', () => {
      const gate = createSecurityGate({ ci: true });
      const result = gate.evaluate([{ severity: 'critical' }]);
      expect(result.exitCode).toBe(1);
    });

    it('generates gate report', () => {
      const gate = createSecurityGate();
      gate.setPolicy({ maxCritical: 0 });

      const result = gate.evaluate([{ severity: 'high' }]);
      const report = gate.generateReport(result);
      expect(report).toContain('PASSED');
    });
  });
});
