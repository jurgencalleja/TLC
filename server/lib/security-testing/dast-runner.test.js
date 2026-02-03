/**
 * DAST Runner Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { runZapBaseline, runZapFullScan, parseZapReport, configureScanPolicy, generateHtmlReport, createDastRunner } from './dast-runner.js';

describe('dast-runner', () => {
  describe('runZapBaseline', () => {
    it('runs ZAP baseline scan', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '{"alerts": []}' });
      const result = await runZapBaseline({ target: 'http://localhost:3000', exec: mockExec });
      expect(result.alerts).toBeDefined();
    });
  });

  describe('runZapFullScan', () => {
    it('runs ZAP full scan', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '{"alerts": []}' });
      const result = await runZapFullScan({ target: 'http://localhost:3000', exec: mockExec });
      expect(result).toBeDefined();
    });
  });

  describe('parseZapReport', () => {
    it('parses ZAP JSON report', () => {
      const report = { site: [{ alerts: [{ alert: 'XSS', riskcode: '3', instances: [{ uri: '/test' }] }] }] };
      const parsed = parseZapReport(report);
      expect(parsed[0].name).toBe('XSS');
      expect(parsed[0].risk).toBe('high');
    });
  });

  describe('configureScanPolicy', () => {
    it('configures scan policy', () => {
      const policy = configureScanPolicy({ strength: 'high', threshold: 'medium' });
      expect(policy.strength).toBe('high');
    });
  });

  describe('generateHtmlReport', () => {
    it('generates HTML report', () => {
      const alerts = [{ name: 'XSS', risk: 'high', description: 'Cross-site scripting' }];
      const html = generateHtmlReport(alerts);
      expect(html).toContain('<html');
      expect(html).toContain('XSS');
    });
  });

  describe('createDastRunner', () => {
    it('creates runner', () => {
      const runner = createDastRunner();
      expect(runner.baseline).toBeDefined();
      expect(runner.fullScan).toBeDefined();
    });

    it('supports authenticated scanning', async () => {
      const runner = createDastRunner();
      const result = await runner.baseline({ target: 'http://localhost', auth: { username: 'test', password: 'test' }, mockResults: { alerts: [] } });
      expect(result).toBeDefined();
    });
  });
});
