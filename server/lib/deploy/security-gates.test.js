/**
 * Security Gates Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  runSecurityGate,
  runAllGates,
  getGatesForTier,
  createGateResult,
  GATE_TYPES,
  GATE_STATUS,
  createSecurityGates,
} from './security-gates.js';

describe('security-gates', () => {
  describe('GATE_TYPES', () => {
    it('defines all gate types', () => {
      expect(GATE_TYPES.SAST).toBe('sast');
      expect(GATE_TYPES.DAST).toBe('dast');
      expect(GATE_TYPES.DEPENDENCIES).toBe('dependencies');
      expect(GATE_TYPES.CONTAINER).toBe('container');
      expect(GATE_TYPES.SECRETS).toBe('secrets');
    });
  });

  describe('GATE_STATUS', () => {
    it('defines status constants', () => {
      expect(GATE_STATUS.PASSED).toBe('passed');
      expect(GATE_STATUS.FAILED).toBe('failed');
      expect(GATE_STATUS.SKIPPED).toBe('skipped');
      expect(GATE_STATUS.ERROR).toBe('error');
    });
  });

  describe('getGatesForTier', () => {
    it('returns basic gates for feature tier', () => {
      const gates = getGatesForTier('feature');
      expect(gates).toContain('sast');
      expect(gates).toContain('dependencies');
      expect(gates).not.toContain('dast');
    });

    it('returns full gates for dev tier', () => {
      const gates = getGatesForTier('dev');
      expect(gates).toContain('sast');
      expect(gates).toContain('dast');
      expect(gates).toContain('container');
    });

    it('returns all gates for stable tier', () => {
      const gates = getGatesForTier('stable');
      expect(gates).toContain('sast');
      expect(gates).toContain('dast');
      expect(gates).toContain('container');
      expect(gates).toContain('secrets');
    });

    it('uses custom gate config', () => {
      const config = { feature: ['sast'] };
      const gates = getGatesForTier('feature', config);
      expect(gates).toEqual(['sast']);
    });
  });

  describe('createGateResult', () => {
    it('creates passed result', () => {
      const result = createGateResult('sast', GATE_STATUS.PASSED);
      expect(result.gate).toBe('sast');
      expect(result.status).toBe('passed');
      expect(result.passed).toBe(true);
    });

    it('creates failed result with findings', () => {
      const findings = [{ severity: 'high', message: 'SQL injection' }];
      const result = createGateResult('sast', GATE_STATUS.FAILED, { findings });
      expect(result.passed).toBe(false);
      expect(result.findings).toEqual(findings);
    });

    it('includes duration', () => {
      const result = createGateResult('sast', GATE_STATUS.PASSED, { duration: 1500 });
      expect(result.duration).toBe(1500);
    });
  });

  describe('runSecurityGate', () => {
    it('runs SAST gate', async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        passed: true,
        findings: [],
      });
      const result = await runSecurityGate('sast', {
        projectPath: '/test',
        runners: { sast: mockRunner },
      });
      expect(result.status).toBe('passed');
      expect(mockRunner).toHaveBeenCalledWith('/test', expect.any(Object));
    });

    it('handles gate failure', async () => {
      const mockRunner = vi.fn().mockResolvedValue({
        passed: false,
        findings: [{ severity: 'critical' }],
      });
      const result = await runSecurityGate('sast', {
        projectPath: '/test',
        runners: { sast: mockRunner },
      });
      expect(result.status).toBe('failed');
      expect(result.findings).toHaveLength(1);
    });

    it('handles runner error', async () => {
      const mockRunner = vi.fn().mockRejectedValue(new Error('Scanner failed'));
      const result = await runSecurityGate('sast', {
        projectPath: '/test',
        runners: { sast: mockRunner },
      });
      expect(result.status).toBe('error');
      expect(result.error).toContain('Scanner failed');
    });

    it('skips unknown gate type', async () => {
      const result = await runSecurityGate('unknown-gate', {
        projectPath: '/test',
        runners: {},
      });
      expect(result.status).toBe('skipped');
    });
  });

  describe('runAllGates', () => {
    it('runs all gates for tier', async () => {
      const mockSast = vi.fn().mockResolvedValue({ passed: true, findings: [] });
      const mockDeps = vi.fn().mockResolvedValue({ passed: true, findings: [] });

      const results = await runAllGates('feature', {
        projectPath: '/test',
        runners: { sast: mockSast, dependencies: mockDeps },
      });

      expect(results.passed).toBe(true);
      expect(results.gates.sast.status).toBe('passed');
      expect(results.gates.dependencies.status).toBe('passed');
    });

    it('fails if any gate fails', async () => {
      const mockSast = vi.fn().mockResolvedValue({ passed: false, findings: [{}] });
      const mockDeps = vi.fn().mockResolvedValue({ passed: true, findings: [] });

      const results = await runAllGates('feature', {
        projectPath: '/test',
        runners: { sast: mockSast, dependencies: mockDeps },
      });

      expect(results.passed).toBe(false);
    });

    it('runs gates in parallel', async () => {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const mockSast = vi.fn().mockImplementation(async () => {
        await delay(50);
        return { passed: true, findings: [] };
      });
      const mockDeps = vi.fn().mockImplementation(async () => {
        await delay(50);
        return { passed: true, findings: [] };
      });

      const start = Date.now();
      await runAllGates('feature', {
        projectPath: '/test',
        runners: { sast: mockSast, dependencies: mockDeps },
      });
      const duration = Date.now() - start;

      // Should be ~50ms (parallel) not ~100ms (sequential)
      expect(duration).toBeLessThan(80);
    });

    it('collects all findings', async () => {
      const mockSast = vi.fn().mockResolvedValue({
        passed: false,
        findings: [{ id: 1 }],
      });
      const mockDeps = vi.fn().mockResolvedValue({
        passed: false,
        findings: [{ id: 2 }],
      });

      const results = await runAllGates('feature', {
        projectPath: '/test',
        runners: { sast: mockSast, dependencies: mockDeps },
      });

      expect(results.allFindings).toHaveLength(2);
    });
  });

  describe('createSecurityGates', () => {
    it('creates gates manager', () => {
      const gates = createSecurityGates();
      expect(gates.run).toBeDefined();
      expect(gates.runAll).toBeDefined();
      expect(gates.getGatesForTier).toBeDefined();
    });

    it('accepts custom runners', () => {
      const customRunner = vi.fn().mockResolvedValue({ passed: true, findings: [] });
      const gates = createSecurityGates({
        runners: { custom: customRunner },
      });
      expect(gates.hasRunner('custom')).toBe(true);
    });

    it('has built-in runners for dependencies and secrets', () => {
      const gates = createSecurityGates();
      expect(gates.hasRunner('dependencies')).toBe(true);
      expect(gates.hasRunner('secrets')).toBe(true);
    });

    it('skips SAST/DAST/container without custom runners', () => {
      const gates = createSecurityGates();
      expect(gates.hasRunner('sast')).toBe(false);
      expect(gates.hasRunner('dast')).toBe(false);
      expect(gates.hasRunner('container')).toBe(false);
    });
  });
});
