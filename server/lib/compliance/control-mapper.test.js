/**
 * Control Mapper Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createControlMapper, mapControl, findOverlaps, generateCrossReference, importFramework } from './control-mapper.js';

describe('control-mapper', () => {
  describe('createControlMapper', () => {
    it('creates control mapper', () => {
      const mapper = createControlMapper();
      expect(mapper.map).toBeDefined();
      expect(mapper.findOverlaps).toBeDefined();
    });

    it('loads default mappings', () => {
      const mapper = createControlMapper({ loadDefaults: true });
      const mappings = mapper.getMappings();
      expect(mappings.length).toBeGreaterThan(0);
    });
  });

  describe('mapControl', () => {
    it('maps control between frameworks', () => {
      const mapping = mapControl({
        source: { framework: 'pci-dss', control: 'req-3.4' },
        target: { framework: 'iso27001' }
      });
      expect(mapping.targetControls.length).toBeGreaterThan(0);
      expect(mapping.targetControls.some(c => c.startsWith('A.8'))).toBe(true);
    });

    it('provides mapping confidence', () => {
      const mapping = mapControl({
        source: { framework: 'pci-dss', control: 'req-1.1' },
        target: { framework: 'iso27001' }
      });
      expect(mapping.confidence).toBeDefined();
      expect(mapping.confidence).toBeGreaterThan(0);
    });

    it('handles unmapped controls', () => {
      const mapping = mapControl({
        source: { framework: 'custom', control: 'unknown' },
        target: { framework: 'iso27001' }
      });
      expect(mapping.targetControls).toHaveLength(0);
      expect(mapping.unmapped).toBe(true);
    });
  });

  describe('findOverlaps', () => {
    it('finds overlapping controls', () => {
      const overlaps = findOverlaps(['pci-dss', 'iso27001', 'hipaa']);
      expect(overlaps.length).toBeGreaterThan(0);
    });

    it('identifies common control themes', () => {
      const overlaps = findOverlaps(['pci-dss', 'hipaa']);
      expect(overlaps.some(o => o.theme === 'encryption')).toBe(true);
      expect(overlaps.some(o => o.theme === 'access-control')).toBe(true);
    });

    it('calculates overlap percentage', () => {
      const overlaps = findOverlaps(['pci-dss', 'iso27001']);
      expect(overlaps[0].overlapPercentage).toBeDefined();
    });
  });

  describe('generateCrossReference', () => {
    it('generates cross-reference matrix', () => {
      const matrix = generateCrossReference(['pci-dss', 'iso27001', 'hipaa']);
      expect(matrix['pci-dss']).toBeDefined();
      expect(matrix['pci-dss']['iso27001']).toBeDefined();
    });

    it('outputs as markdown table', () => {
      const markdown = generateCrossReference(['pci-dss', 'iso27001'], { format: 'markdown' });
      expect(markdown).toContain('|');
      expect(markdown).toContain('PCI DSS');
    });

    it('outputs as CSV', () => {
      const csv = generateCrossReference(['pci-dss', 'iso27001'], { format: 'csv' });
      expect(csv).toContain(',');
    });
  });

  describe('importFramework', () => {
    it('imports custom framework', () => {
      const framework = {
        id: 'custom-framework',
        name: 'Custom Framework',
        controls: [
          { id: 'CF-1', name: 'Access Control', mappings: ['iso27001:A.5.15'] }
        ]
      };
      const result = importFramework(framework);
      expect(result.imported).toBe(true);
      expect(result.controlCount).toBe(1);
    });

    it('validates framework structure', () => {
      const invalidFramework = { controls: [] };
      expect(() => importFramework(invalidFramework)).toThrow(/id.*required/i);
    });

    it('auto-maps to existing frameworks', () => {
      const framework = {
        id: 'custom',
        name: 'Custom',
        controls: [{ id: 'C-1', keywords: ['encryption', 'data protection'] }]
      };
      const result = importFramework(framework, { autoMap: true });
      expect(result.mappingsCreated).toBeGreaterThan(0);
    });
  });
});
