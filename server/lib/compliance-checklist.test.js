import { describe, it, expect, beforeEach } from 'vitest';
import {
  TSC_CATEGORIES,
  getSOC2Checklist,
  getControlStatus,
  linkControlToEvidence,
  getCompliancePercentage,
  getComplianceGaps,
  generateRemediationPlan,
  updateControlStatus,
  getControlsByCategory,
  exportChecklist,
  importChecklist,
  createComplianceChecklist,
} from './compliance-checklist.js';

describe('compliance-checklist', () => {
  let checklist;

  beforeEach(() => {
    checklist = createComplianceChecklist();
  });

  describe('TSC_CATEGORIES', () => {
    it('defines all five Trust Service Categories', () => {
      expect(TSC_CATEGORIES.SECURITY).toBe('Security');
      expect(TSC_CATEGORIES.AVAILABILITY).toBe('Availability');
      expect(TSC_CATEGORIES.PROCESSING_INTEGRITY).toBe('Processing Integrity');
      expect(TSC_CATEGORIES.CONFIDENTIALITY).toBe('Confidentiality');
      expect(TSC_CATEGORIES.PRIVACY).toBe('Privacy');
    });
  });

  describe('getSOC2Checklist', () => {
    it('returns all criteria', () => {
      const result = getSOC2Checklist(checklist);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns controls with required properties', () => {
      const result = getSOC2Checklist(checklist);
      const control = result[0];
      expect(control).toHaveProperty('id');
      expect(control).toHaveProperty('category');
      expect(control).toHaveProperty('name');
      expect(control).toHaveProperty('description');
      expect(control).toHaveProperty('status');
      expect(control).toHaveProperty('evidence');
    });

    it('returns controls from all TSC categories', () => {
      const result = getSOC2Checklist(checklist);
      const categories = new Set(result.map((c) => c.category));
      expect(categories.has(TSC_CATEGORIES.SECURITY)).toBe(true);
      expect(categories.has(TSC_CATEGORIES.AVAILABILITY)).toBe(true);
      expect(categories.has(TSC_CATEGORIES.CONFIDENTIALITY)).toBe(true);
    });

    it('includes Common Criteria (CC) controls', () => {
      const result = getSOC2Checklist(checklist);
      const ccControls = result.filter((c) => c.id.startsWith('CC'));
      expect(ccControls.length).toBeGreaterThan(0);
    });
  });

  describe('getControlStatus', () => {
    it('returns implemented for implemented controls', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const result = getControlStatus(checklist, 'CC1.1');
      expect(result.status).toBe('implemented');
    });

    it('returns not_implemented for controls not implemented', () => {
      const result = getControlStatus(checklist, 'CC1.1');
      expect(result.status).toBe('not_implemented');
    });

    it('returns partial for partially implemented controls', () => {
      updateControlStatus(checklist, 'CC1.2', 'partial');
      const result = getControlStatus(checklist, 'CC1.2');
      expect(result.status).toBe('partial');
    });

    it('returns not_applicable for N/A controls', () => {
      updateControlStatus(checklist, 'CC1.3', 'not_applicable');
      const result = getControlStatus(checklist, 'CC1.3');
      expect(result.status).toBe('not_applicable');
    });

    it('includes control metadata in response', () => {
      const result = getControlStatus(checklist, 'CC1.1');
      expect(result).toHaveProperty('id', 'CC1.1');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('category');
    });

    it('returns null for unknown control ID', () => {
      const result = getControlStatus(checklist, 'UNKNOWN-99');
      expect(result).toBeNull();
    });
  });

  describe('linkControlToEvidence', () => {
    it('associates evidence with a control', () => {
      const result = linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      expect(result.success).toBe(true);
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.evidence).toContain('policy-001');
    });

    it('allows multiple evidence items per control', () => {
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      linkControlToEvidence(checklist, 'CC1.1', 'audit-log-001');
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.evidence).toContain('policy-001');
      expect(control.evidence).toContain('audit-log-001');
    });

    it('does not duplicate evidence items', () => {
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      const control = getControlStatus(checklist, 'CC1.1');
      const policyCount = control.evidence.filter((e) => e === 'policy-001').length;
      expect(policyCount).toBe(1);
    });

    it('returns error for unknown control ID', () => {
      const result = linkControlToEvidence(checklist, 'UNKNOWN-99', 'evidence-001');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('allows adding notes with evidence', () => {
      const result = linkControlToEvidence(checklist, 'CC1.1', 'policy-001', {
        notes: 'Code of conduct policy document',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getCompliancePercentage', () => {
    it('calculates completion percentage', () => {
      const allControls = getSOC2Checklist(checklist);
      const totalControls = allControls.length;

      // Mark some as implemented
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'implemented');

      const result = getCompliancePercentage(checklist);
      expect(result.percentage).toBeCloseTo((2 / totalControls) * 100, 1);
    });

    it('returns 0% when nothing is implemented', () => {
      const result = getCompliancePercentage(checklist);
      expect(result.percentage).toBe(0);
    });

    it('returns 100% when all controls are implemented', () => {
      const allControls = getSOC2Checklist(checklist);
      allControls.forEach((control) => {
        updateControlStatus(checklist, control.id, 'implemented');
      });
      const result = getCompliancePercentage(checklist);
      expect(result.percentage).toBe(100);
    });

    it('treats partial as 50% contribution', () => {
      // Mark all but one as implemented, one as partial
      const allControls = getSOC2Checklist(checklist);
      allControls.forEach((control, index) => {
        if (index === 0) {
          updateControlStatus(checklist, control.id, 'partial');
        } else {
          updateControlStatus(checklist, control.id, 'implemented');
        }
      });
      const result = getCompliancePercentage(checklist);
      const expectedPct = ((allControls.length - 0.5) / allControls.length) * 100;
      expect(result.percentage).toBeCloseTo(expectedPct, 1);
    });

    it('excludes not_applicable from calculation', () => {
      const allControls = getSOC2Checklist(checklist);
      updateControlStatus(checklist, allControls[0].id, 'not_applicable');
      updateControlStatus(checklist, allControls[1].id, 'implemented');

      const result = getCompliancePercentage(checklist);
      // 1 implemented out of (total - 1 N/A)
      const applicableControls = allControls.length - 1;
      expect(result.percentage).toBeCloseTo((1 / applicableControls) * 100, 1);
    });

    it('includes breakdown by category', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const result = getCompliancePercentage(checklist);
      expect(result).toHaveProperty('byCategory');
      expect(result.byCategory).toHaveProperty(TSC_CATEGORIES.SECURITY);
    });
  });

  describe('getComplianceGaps', () => {
    it('returns unimplemented controls', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const result = getComplianceGaps(checklist);
      expect(Array.isArray(result)).toBe(true);
      const implementedIds = result.map((c) => c.id);
      expect(implementedIds).not.toContain('CC1.1');
    });

    it('includes partial controls in gaps', () => {
      updateControlStatus(checklist, 'CC1.1', 'partial');
      const result = getComplianceGaps(checklist);
      const partialControl = result.find((c) => c.id === 'CC1.1');
      expect(partialControl).toBeDefined();
      expect(partialControl.status).toBe('partial');
    });

    it('excludes not_applicable from gaps', () => {
      updateControlStatus(checklist, 'CC1.1', 'not_applicable');
      const result = getComplianceGaps(checklist);
      const naIds = result.map((c) => c.id);
      expect(naIds).not.toContain('CC1.1');
    });

    it('returns empty array when fully compliant', () => {
      const allControls = getSOC2Checklist(checklist);
      allControls.forEach((control) => {
        updateControlStatus(checklist, control.id, 'implemented');
      });
      const result = getComplianceGaps(checklist);
      expect(result).toHaveLength(0);
    });

    it('can filter gaps by category', () => {
      const result = getComplianceGaps(checklist, {
        category: TSC_CATEGORIES.SECURITY,
      });
      result.forEach((control) => {
        expect(control.category).toBe(TSC_CATEGORIES.SECURITY);
      });
    });

    it('includes gap severity based on control importance', () => {
      const result = getComplianceGaps(checklist);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('gapSeverity');
        expect(['high', 'medium', 'low']).toContain(result[0].gapSeverity);
      }
    });
  });

  describe('generateRemediationPlan', () => {
    it('creates task list from gaps', () => {
      const result = generateRemediationPlan(checklist);
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('prioritizes tasks by severity', () => {
      const result = generateRemediationPlan(checklist);
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < result.tasks.length; i++) {
        const prevPriority = severityOrder[result.tasks[i - 1].priority];
        const currPriority = severityOrder[result.tasks[i].priority];
        expect(currPriority).toBeGreaterThanOrEqual(prevPriority);
      }
    });

    it('includes estimated effort per task', () => {
      const result = generateRemediationPlan(checklist);
      if (result.tasks.length > 0) {
        expect(result.tasks[0]).toHaveProperty('estimatedEffort');
      }
    });

    it('groups tasks by category when requested', () => {
      const result = generateRemediationPlan(checklist, { groupByCategory: true });
      expect(result).toHaveProperty('byCategory');
    });

    it('includes total estimated effort', () => {
      const result = generateRemediationPlan(checklist);
      expect(result).toHaveProperty('totalEstimatedEffort');
    });

    it('generates actionable task descriptions', () => {
      const result = generateRemediationPlan(checklist);
      if (result.tasks.length > 0) {
        expect(result.tasks[0]).toHaveProperty('description');
        expect(result.tasks[0]).toHaveProperty('controlId');
        expect(result.tasks[0].description.length).toBeGreaterThan(10);
      }
    });
  });

  describe('updateControlStatus', () => {
    it('marks control as complete', () => {
      const result = updateControlStatus(checklist, 'CC1.1', 'implemented');
      expect(result.success).toBe(true);
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.status).toBe('implemented');
    });

    it('sets implementation date when marking implemented', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.implementationDate).toBeDefined();
    });

    it('allows adding notes when updating status', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented', {
        notes: 'Implemented via code of conduct policy',
      });
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.notes).toContain('code of conduct');
    });

    it('validates status values', () => {
      const result = updateControlStatus(checklist, 'CC1.1', 'invalid_status');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('returns error for unknown control ID', () => {
      const result = updateControlStatus(checklist, 'UNKNOWN-99', 'implemented');
      expect(result.success).toBe(false);
    });

    it('tracks status change history', () => {
      updateControlStatus(checklist, 'CC1.1', 'partial');
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const control = getControlStatus(checklist, 'CC1.1');
      expect(control.history).toBeDefined();
      expect(control.history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getControlsByCategory', () => {
    it('groups controls by TSC category', () => {
      const result = getControlsByCategory(checklist);
      expect(result).toHaveProperty(TSC_CATEGORIES.SECURITY);
      expect(result).toHaveProperty(TSC_CATEGORIES.AVAILABILITY);
      expect(Array.isArray(result[TSC_CATEGORIES.SECURITY])).toBe(true);
    });

    it('returns all controls when no category specified', () => {
      const result = getControlsByCategory(checklist);
      const allFromGrouped = Object.values(result).flat();
      const allControls = getSOC2Checklist(checklist);
      expect(allFromGrouped.length).toBe(allControls.length);
    });

    it('can filter to single category', () => {
      const result = getControlsByCategory(checklist, TSC_CATEGORIES.SECURITY);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty(TSC_CATEGORIES.SECURITY);
    });

    it('includes status in grouped controls', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const result = getControlsByCategory(checklist);
      const securityControls = result[TSC_CATEGORIES.SECURITY];
      const cc11 = securityControls.find((c) => c.id === 'CC1.1');
      expect(cc11.status).toBe('implemented');
    });
  });

  describe('exportChecklist', () => {
    it('generates audit-ready format', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      const result = exportChecklist(checklist);
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('controls');
    });

    it('includes version information', () => {
      const result = exportChecklist(checklist);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('version');
    });

    it('includes compliance summary', () => {
      const result = exportChecklist(checklist);
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('summary');
      expect(parsed.summary).toHaveProperty('totalControls');
      expect(parsed.summary).toHaveProperty('implemented');
      expect(parsed.summary).toHaveProperty('compliancePercentage');
    });

    it('exports in specified format (json)', () => {
      const result = exportChecklist(checklist, { format: 'json' });
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('exports in specified format (csv)', () => {
      const result = exportChecklist(checklist, { format: 'csv' });
      expect(result).toContain(',');
      expect(result).toContain('id');
    });

    it('preserves evidence links in export', () => {
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      const result = exportChecklist(checklist);
      const parsed = JSON.parse(result);
      const cc11 = parsed.controls.find((c) => c.id === 'CC1.1');
      expect(cc11.evidence).toContain('policy-001');
    });
  });

  describe('importChecklist', () => {
    it('loads saved progress', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'policy-001');
      const exported = exportChecklist(checklist);

      const newChecklist = createComplianceChecklist();
      const result = importChecklist(newChecklist, exported);

      expect(result.success).toBe(true);
      const control = getControlStatus(newChecklist, 'CC1.1');
      expect(control.status).toBe('implemented');
      expect(control.evidence).toContain('policy-001');
    });

    it('validates import format', () => {
      const newChecklist = createComplianceChecklist();
      const result = importChecklist(newChecklist, 'invalid json');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('handles version mismatches gracefully', () => {
      const oldFormat = JSON.stringify({
        version: '0.1.0',
        controls: [{ id: 'CC1.1', status: 'implemented' }],
      });
      const newChecklist = createComplianceChecklist();
      const result = importChecklist(newChecklist, oldFormat);
      // Should either succeed with migration or warn about version
      expect(result).toHaveProperty('success');
    });

    it('merges with existing progress when specified', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const exported = exportChecklist(checklist);

      const newChecklist = createComplianceChecklist();
      updateControlStatus(newChecklist, 'CC1.2', 'implemented');

      const result = importChecklist(newChecklist, exported, { merge: true });
      expect(result.success).toBe(true);

      const cc11 = getControlStatus(newChecklist, 'CC1.1');
      const cc12 = getControlStatus(newChecklist, 'CC1.2');
      expect(cc11.status).toBe('implemented');
      expect(cc12.status).toBe('implemented');
    });

    it('preserves status history on import', () => {
      updateControlStatus(checklist, 'CC1.1', 'partial');
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const exported = exportChecklist(checklist);

      const newChecklist = createComplianceChecklist();
      importChecklist(newChecklist, exported);

      const control = getControlStatus(newChecklist, 'CC1.1');
      expect(control.history.length).toBeGreaterThanOrEqual(2);
    });
  });
});
