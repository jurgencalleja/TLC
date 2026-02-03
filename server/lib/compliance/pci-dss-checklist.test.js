/**
 * PCI DSS Checklist Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createPciDssChecklist, getRequirements, checkRequirement, generateGapReport, mapToControls } from './pci-dss-checklist.js';

describe('pci-dss-checklist', () => {
  describe('createPciDssChecklist', () => {
    it('creates PCI DSS checklist', () => {
      const checklist = createPciDssChecklist();
      expect(checklist.evaluate).toBeDefined();
      expect(checklist.getRequirements).toBeDefined();
    });

    it('supports PCI DSS v4.0', () => {
      const checklist = createPciDssChecklist({ version: '4.0' });
      const reqs = checklist.getRequirements();
      expect(reqs.some(r => r.id.startsWith('req-'))).toBe(true);
    });
  });

  describe('getRequirements', () => {
    it('returns all PCI DSS requirements', () => {
      const reqs = getRequirements();
      expect(reqs.length).toBeGreaterThan(0);
      // PCI DSS has 12 main requirements
      expect(reqs.filter(r => r.level === 'requirement').length).toBe(12);
    });

    it('includes sub-requirements', () => {
      const reqs = getRequirements({ includeSubRequirements: true });
      expect(reqs.some(r => r.parent)).toBe(true);
    });

    it('filters by SAQ type', () => {
      const reqs = getRequirements({ saqType: 'A' });
      expect(reqs.every(r => r.saqTypes.includes('A'))).toBe(true);
    });
  });

  describe('checkRequirement', () => {
    it('checks requirement compliance', () => {
      const evidence = { hasFirewall: true, firewallConfig: { rules: [] } };
      const result = checkRequirement('req-1.1', evidence);
      expect(result.requirementId).toBe('req-1.1');
      expect(result.status).toBeDefined();
    });

    it('returns evidence gaps', () => {
      const evidence = {};
      const result = checkRequirement('req-1.1', evidence);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('provides remediation guidance', () => {
      const result = checkRequirement('req-1.1', {});
      expect(result.remediation).toBeDefined();
    });
  });

  describe('generateGapReport', () => {
    it('generates gap analysis report', () => {
      const status = [
        { requirementId: 'req-1.1', status: 'compliant' },
        { requirementId: 'req-1.2', status: 'non-compliant', gaps: ['Missing firewall docs'] }
      ];
      const report = generateGapReport(status);
      expect(report).toContain('Gap Analysis');
      expect(report).toContain('req-1.2');
    });

    it('prioritizes critical gaps', () => {
      const status = [
        { requirementId: 'req-3.4', status: 'non-compliant', priority: 'critical' },
        { requirementId: 'req-1.2', status: 'non-compliant', priority: 'medium' }
      ];
      const report = generateGapReport(status);
      const criticalPos = report.indexOf('req-3.4');
      const mediumPos = report.indexOf('req-1.2');
      expect(criticalPos).toBeLessThan(mediumPos);
    });
  });

  describe('mapToControls', () => {
    it('maps PCI DSS to technical controls', () => {
      const controls = mapToControls('req-1.1');
      expect(controls.some(c => c.type === 'firewall')).toBe(true);
    });

    it('maps to code patterns', () => {
      const controls = mapToControls('req-3.4');
      expect(controls.some(c => c.type === 'encryption')).toBe(true);
    });
  });
});
