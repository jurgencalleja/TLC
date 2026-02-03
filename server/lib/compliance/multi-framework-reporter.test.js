/**
 * Multi-Framework Reporter Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createMultiFrameworkReporter, generateConsolidatedReport, generateFrameworkReport, compareFrameworks, exportReport } from './multi-framework-reporter.js';

describe('multi-framework-reporter', () => {
  describe('createMultiFrameworkReporter', () => {
    it('creates multi-framework reporter', () => {
      const reporter = createMultiFrameworkReporter();
      expect(reporter.generate).toBeDefined();
      expect(reporter.compare).toBeDefined();
    });

    it('supports multiple frameworks', () => {
      const reporter = createMultiFrameworkReporter();
      reporter.addFramework('pci-dss');
      reporter.addFramework('hipaa');
      reporter.addFramework('iso27001');
      expect(reporter.getFrameworks().length).toBe(3);
    });
  });

  describe('generateConsolidatedReport', () => {
    it('generates consolidated compliance report', () => {
      const status = {
        'pci-dss': { score: 85, gaps: 5 },
        'hipaa': { score: 90, gaps: 3 },
        'iso27001': { score: 78, gaps: 10 }
      };
      const report = generateConsolidatedReport(status);
      expect(report).toContain('Compliance Dashboard');
      expect(report).toContain('PCI DSS');
      expect(report).toContain('HIPAA');
    });

    it('highlights common gaps', () => {
      const status = {
        'pci-dss': { gaps: [{ area: 'encryption' }] },
        'iso27001': { gaps: [{ area: 'encryption' }] }
      };
      const report = generateConsolidatedReport(status, { highlightCommon: true });
      expect(report).toContain('Common Gaps');
      expect(report).toContain('encryption');
    });

    it('includes executive summary', () => {
      const report = generateConsolidatedReport({}, { includeSummary: true });
      expect(report).toContain('Executive Summary');
    });
  });

  describe('generateFrameworkReport', () => {
    it('generates single framework report', () => {
      const status = {
        framework: 'pci-dss',
        score: 85,
        controls: [
          { id: 'req-1.1', status: 'compliant' },
          { id: 'req-3.4', status: 'non-compliant' }
        ]
      };
      const report = generateFrameworkReport(status);
      expect(report).toContain('PCI DSS');
      expect(report).toContain('85%');
    });

    it('groups by control category', () => {
      const status = {
        framework: 'iso27001',
        controls: [
          { id: 'A.5.1', category: 'organizational' },
          { id: 'A.8.1', category: 'technological' }
        ]
      };
      const report = generateFrameworkReport(status, { groupBy: 'category' });
      expect(report).toContain('Organizational');
      expect(report).toContain('Technological');
    });
  });

  describe('compareFrameworks', () => {
    it('compares compliance across frameworks', () => {
      const status = {
        'pci-dss': { score: 85 },
        'hipaa': { score: 90 }
      };
      const comparison = compareFrameworks(status);
      expect(comparison.highest).toBe('hipaa');
      expect(comparison.lowest).toBe('pci-dss');
    });

    it('identifies unique requirements', () => {
      const comparison = compareFrameworks({}, { frameworks: ['pci-dss', 'hipaa'] });
      expect(comparison.uniqueRequirements['pci-dss']).toBeDefined();
      expect(comparison.uniqueRequirements['hipaa']).toBeDefined();
    });
  });

  describe('exportReport', () => {
    it('exports as PDF', async () => {
      const report = { content: 'Test report' };
      const mockPdfGenerator = vi.fn().mockResolvedValue(Buffer.from('PDF'));
      const result = await exportReport(report, { format: 'pdf', pdfGenerator: mockPdfGenerator });
      expect(result.format).toBe('pdf');
      expect(mockPdfGenerator).toHaveBeenCalled();
    });

    it('exports as HTML', () => {
      const report = { content: 'Test report' };
      const result = exportReport(report, { format: 'html' });
      expect(result.content).toContain('<html');
    });

    it('exports as JSON', () => {
      const report = { score: 85, gaps: [] };
      const result = exportReport(report, { format: 'json' });
      expect(JSON.parse(result.content)).toEqual(report);
    });

    it('exports as markdown', () => {
      const report = { content: 'Test report', title: 'Compliance Report' };
      const result = exportReport(report, { format: 'markdown' });
      expect(result.content).toContain('# Compliance Report');
    });
  });
});
