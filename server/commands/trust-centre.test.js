/**
 * Trust Centre Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createTrustCentreCommand, runComplianceCheck, generateComplianceReport, scanEvidence } from './trust-centre.js';

describe('trust-centre command', () => {
  describe('createTrustCentreCommand', () => {
    it('creates command', () => {
      const command = createTrustCentreCommand();
      expect(command.name).toBe('trust-centre');
      expect(command.execute).toBeDefined();
    });

    it('has subcommands', () => {
      const command = createTrustCentreCommand();
      expect(command.subcommands).toContain('status');
      expect(command.subcommands).toContain('scan');
      expect(command.subcommands).toContain('report');
      expect(command.subcommands).toContain('gaps');
    });
  });

  describe('runComplianceCheck', () => {
    it('runs compliance check for framework', async () => {
      const mockChecklist = {
        evaluate: vi.fn().mockResolvedValue({ score: 85, gaps: [] })
      };
      const result = await runComplianceCheck({ framework: 'pci-dss', checklist: mockChecklist });
      expect(result.framework).toBe('pci-dss');
      expect(result.score).toBe(85);
    });

    it('runs check for all frameworks', async () => {
      const mockChecklists = {
        'pci-dss': { evaluate: vi.fn().mockResolvedValue({ score: 85 }) },
        'hipaa': { evaluate: vi.fn().mockResolvedValue({ score: 90 }) }
      };
      const result = await runComplianceCheck({ framework: 'all', checklists: mockChecklists });
      expect(result['pci-dss']).toBeDefined();
      expect(result['hipaa']).toBeDefined();
    });

    it('identifies gaps', async () => {
      const mockChecklist = {
        evaluate: vi.fn().mockResolvedValue({
          score: 70,
          gaps: [{ control: 'req-3.4', description: 'Missing encryption' }]
        })
      };
      const result = await runComplianceCheck({ framework: 'pci-dss', checklist: mockChecklist });
      expect(result.gaps.length).toBe(1);
    });
  });

  describe('generateComplianceReport', () => {
    it('generates compliance report', () => {
      const status = {
        'pci-dss': { score: 85, compliant: true },
        'hipaa': { score: 90, compliant: true }
      };
      const report = generateComplianceReport(status);
      expect(report).toContain('Compliance Report');
      expect(report).toContain('PCI DSS');
    });

    it('generates framework-specific report', () => {
      const status = {
        framework: 'iso27001',
        score: 78,
        controls: [{ id: 'A.5.1', status: 'compliant' }]
      };
      const report = generateComplianceReport(status, { framework: 'iso27001' });
      expect(report).toContain('ISO 27001');
    });

    it('includes remediation plan', () => {
      const status = {
        'pci-dss': {
          score: 70,
          gaps: [{ control: 'req-3.4', remediation: 'Implement encryption' }]
        }
      };
      const report = generateComplianceReport(status, { includeRemediation: true });
      expect(report).toContain('Remediation');
      expect(report).toContain('encryption');
    });
  });

  describe('scanEvidence', () => {
    it('scans codebase for compliance evidence', async () => {
      const mockScanner = {
        scan: vi.fn().mockResolvedValue([
          { file: 'src/crypto.js', control: 'req-3.4', type: 'code' }
        ])
      };
      const result = await scanEvidence({ scanner: mockScanner });
      expect(result.length).toBeGreaterThan(0);
    });

    it('links evidence to controls', async () => {
      const mockScanner = {
        scan: vi.fn().mockResolvedValue([
          { file: 'src/auth.js', pattern: 'authentication' }
        ])
      };
      const mockLinker = {
        link: vi.fn().mockReturnValue({ controlId: 'req-8.1', linked: true })
      };
      const result = await scanEvidence({ scanner: mockScanner, linker: mockLinker });
      expect(mockLinker.link).toHaveBeenCalled();
    });

    it('outputs evidence summary', async () => {
      const mockScanner = {
        scan: vi.fn().mockResolvedValue([])
      };
      const result = await scanEvidence({ scanner: mockScanner, format: 'summary' });
      expect(result.totalEvidence).toBeDefined();
      expect(result.linkedControls).toBeDefined();
    });
  });
});
