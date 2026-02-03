/**
 * Trust Centre Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createTrustCentre, getComplianceStatus, listFrameworks, getFrameworkDetails, calculateOverallScore } from './trust-centre.js';

describe('trust-centre', () => {
  describe('createTrustCentre', () => {
    it('creates trust centre instance', () => {
      const centre = createTrustCentre();
      expect(centre.getStatus).toBeDefined();
      expect(centre.addFramework).toBeDefined();
      expect(centre.generateReport).toBeDefined();
    });

    it('initializes with default frameworks', () => {
      const centre = createTrustCentre({ defaults: true });
      const frameworks = centre.listFrameworks();
      expect(frameworks).toContain('pci-dss');
      expect(frameworks).toContain('hipaa');
      expect(frameworks).toContain('iso27001');
      expect(frameworks).toContain('gdpr');
    });
  });

  describe('getComplianceStatus', () => {
    it('returns compliance status for framework', () => {
      const status = getComplianceStatus({ framework: 'pci-dss', controls: [] });
      expect(status.framework).toBe('pci-dss');
      expect(status.compliant).toBeDefined();
      expect(status.score).toBeDefined();
    });

    it('calculates score from controls', () => {
      const controls = [
        { id: 'req-1', status: 'compliant' },
        { id: 'req-2', status: 'compliant' },
        { id: 'req-3', status: 'non-compliant' }
      ];
      const status = getComplianceStatus({ framework: 'custom', controls });
      expect(status.score).toBeCloseTo(66.67, 1);
    });
  });

  describe('listFrameworks', () => {
    it('lists available frameworks', () => {
      const frameworks = listFrameworks();
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].id).toBeDefined();
      expect(frameworks[0].name).toBeDefined();
    });

    it('includes framework metadata', () => {
      const frameworks = listFrameworks();
      const pci = frameworks.find(f => f.id === 'pci-dss');
      expect(pci.version).toBeDefined();
      expect(pci.controlCount).toBeDefined();
    });
  });

  describe('getFrameworkDetails', () => {
    it('returns framework details', () => {
      const details = getFrameworkDetails('pci-dss');
      expect(details.id).toBe('pci-dss');
      expect(details.name).toBeDefined();
      expect(details.controls).toBeDefined();
    });

    it('throws for unknown framework', () => {
      expect(() => getFrameworkDetails('unknown')).toThrow();
    });
  });

  describe('calculateOverallScore', () => {
    it('calculates weighted overall score', () => {
      const scores = [
        { framework: 'pci-dss', score: 80, weight: 2 },
        { framework: 'hipaa', score: 90, weight: 1 }
      ];
      const overall = calculateOverallScore(scores);
      expect(overall).toBeCloseTo(83.33, 1);
    });

    it('handles equal weights', () => {
      const scores = [
        { framework: 'pci-dss', score: 80 },
        { framework: 'hipaa', score: 90 }
      ];
      const overall = calculateOverallScore(scores);
      expect(overall).toBe(85);
    });
  });
});
