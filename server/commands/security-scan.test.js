/**
 * Security Scan Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createSecurityScanCommand, runScan, formatResults, generateReport } from './security-scan.js';

describe('security-scan command', () => {
  describe('createSecurityScanCommand', () => {
    it('creates command', () => {
      const command = createSecurityScanCommand();
      expect(command.name).toBe('security-scan');
      expect(command.execute).toBeDefined();
    });

    it('has subcommands', () => {
      const command = createSecurityScanCommand();
      expect(command.subcommands).toContain('sast');
      expect(command.subcommands).toContain('dast');
      expect(command.subcommands).toContain('deps');
      expect(command.subcommands).toContain('secrets');
      expect(command.subcommands).toContain('all');
    });
  });

  describe('runScan', () => {
    it('runs SAST scan', async () => {
      const mockRunner = {
        runSemgrep: vi.fn().mockResolvedValue({ results: [] })
      };
      const result = await runScan({ type: 'sast', runner: mockRunner });
      expect(result.type).toBe('sast');
      expect(result.findings).toBeDefined();
    });

    it('runs DAST scan', async () => {
      const mockRunner = {
        runZapBaseline: vi.fn().mockResolvedValue({ alerts: [] })
      };
      const result = await runScan({ type: 'dast', target: 'http://localhost', runner: mockRunner });
      expect(result.type).toBe('dast');
    });

    it('runs dependency scan', async () => {
      const mockRunner = {
        runNpmAudit: vi.fn().mockResolvedValue({ vulnerabilities: {} })
      };
      const result = await runScan({ type: 'deps', runner: mockRunner });
      expect(result.type).toBe('deps');
    });

    it('runs all scans', async () => {
      const mockRunners = {
        sast: { runSemgrep: vi.fn().mockResolvedValue({ results: [] }) },
        dast: { runZapBaseline: vi.fn().mockResolvedValue({ alerts: [] }) },
        deps: { runNpmAudit: vi.fn().mockResolvedValue({ vulnerabilities: {} }) },
        secrets: { runGitleaks: vi.fn().mockResolvedValue([]) }
      };
      const result = await runScan({ type: 'all', runners: mockRunners });
      expect(result.sast).toBeDefined();
      expect(result.dast).toBeDefined();
      expect(result.deps).toBeDefined();
      expect(result.secrets).toBeDefined();
    });
  });

  describe('formatResults', () => {
    it('formats as table', () => {
      const findings = [{ rule: 'xss', severity: 'high', file: 'app.js' }];
      const output = formatResults(findings, { format: 'table' });
      expect(output).toContain('xss');
      expect(output).toContain('high');
    });

    it('formats as JSON', () => {
      const findings = [{ rule: 'xss' }];
      const output = formatResults(findings, { format: 'json' });
      expect(JSON.parse(output)).toEqual(findings);
    });

    it('formats as SARIF', () => {
      const findings = [{ rule: 'xss', file: 'app.js' }];
      const output = formatResults(findings, { format: 'sarif' });
      const sarif = JSON.parse(output);
      expect(sarif.$schema).toContain('sarif');
    });
  });

  describe('generateReport', () => {
    it('generates HTML report', () => {
      const findings = [{ rule: 'test', severity: 'medium' }];
      const html = generateReport(findings, { format: 'html' });
      expect(html).toContain('<html');
      expect(html).toContain('Security Scan Report');
    });

    it('generates markdown report', () => {
      const findings = [{ rule: 'test', severity: 'medium' }];
      const md = generateReport(findings, { format: 'markdown' });
      expect(md).toContain('# Security Scan Report');
    });
  });
});
