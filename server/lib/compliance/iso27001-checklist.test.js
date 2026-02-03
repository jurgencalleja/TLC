/**
 * ISO 27001 Checklist Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createIso27001Checklist, getControls, checkControl, generateSoa, mapAnnexAControls } from './iso27001-checklist.js';

describe('iso27001-checklist', () => {
  describe('createIso27001Checklist', () => {
    it('creates ISO 27001 checklist', () => {
      const checklist = createIso27001Checklist();
      expect(checklist.evaluate).toBeDefined();
      expect(checklist.getControls).toBeDefined();
    });

    it('supports ISO 27001:2022', () => {
      const checklist = createIso27001Checklist({ version: '2022' });
      const controls = checklist.getControls();
      // 2022 version has 93 controls in 4 themes
      expect(controls.some(c => c.theme === 'organizational')).toBe(true);
    });
  });

  describe('getControls', () => {
    it('returns all Annex A controls', () => {
      const controls = getControls();
      expect(controls.length).toBeGreaterThan(0);
    });

    it('groups by control theme', () => {
      const controls = getControls({ groupBy: 'theme' });
      expect(controls.organizational).toBeDefined();
      expect(controls.people).toBeDefined();
      expect(controls.physical).toBeDefined();
      expect(controls.technological).toBeDefined();
    });

    it('includes control attributes', () => {
      const controls = getControls();
      const control = controls[0];
      expect(control.id).toBeDefined();
      expect(control.name).toBeDefined();
      expect(control.purpose).toBeDefined();
    });
  });

  describe('checkControl', () => {
    it('checks control implementation', () => {
      const evidence = { policies: { informationSecurity: true } };
      const result = checkControl('A.5.1', evidence);
      expect(result.controlId).toBe('A.5.1');
      expect(result.implemented).toBeDefined();
    });

    it('evaluates control effectiveness', () => {
      const evidence = {
        accessControl: { implemented: true, tested: true, documented: true }
      };
      const result = checkControl('A.5.15', evidence);
      expect(result.effectiveness).toBeDefined();
    });

    it('identifies missing evidence', () => {
      const result = checkControl('A.5.1', {});
      expect(result.missingEvidence.length).toBeGreaterThan(0);
    });
  });

  describe('generateSoa', () => {
    it('generates Statement of Applicability', () => {
      const assessments = [
        { controlId: 'A.5.1', applicable: true, implemented: true },
        { controlId: 'A.5.2', applicable: false, justification: 'No cloud services' }
      ];
      const soa = generateSoa(assessments);
      expect(soa).toContain('Statement of Applicability');
      expect(soa).toContain('A.5.1');
    });

    it('includes justification for excluded controls', () => {
      const assessments = [
        { controlId: 'A.7.1', applicable: false, justification: 'Remote-only company' }
      ];
      const soa = generateSoa(assessments);
      expect(soa).toContain('Remote-only company');
    });
  });

  describe('mapAnnexAControls', () => {
    it('maps to technical implementations', () => {
      const mappings = mapAnnexAControls('A.8.24');
      expect(mappings.some(m => m.type === 'encryption')).toBe(true);
    });

    it('maps to code patterns', () => {
      const mappings = mapAnnexAControls('A.8.3');
      expect(mappings.some(m => m.type === 'access-control')).toBe(true);
    });
  });
});
