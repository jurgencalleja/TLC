/**
 * HIPAA Checklist Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createHipaaChecklist, getSafeguards, checkSafeguard, generateBaaTemplate, assessPhiHandling } from './hipaa-checklist.js';

describe('hipaa-checklist', () => {
  describe('createHipaaChecklist', () => {
    it('creates HIPAA checklist', () => {
      const checklist = createHipaaChecklist();
      expect(checklist.evaluate).toBeDefined();
      expect(checklist.getSafeguards).toBeDefined();
    });

    it('covers all safeguard categories', () => {
      const checklist = createHipaaChecklist();
      const categories = checklist.getCategories();
      expect(categories).toContain('administrative');
      expect(categories).toContain('physical');
      expect(categories).toContain('technical');
    });
  });

  describe('getSafeguards', () => {
    it('returns all HIPAA safeguards', () => {
      const safeguards = getSafeguards();
      expect(safeguards.length).toBeGreaterThan(0);
    });

    it('filters by category', () => {
      const technical = getSafeguards({ category: 'technical' });
      expect(technical.every(s => s.category === 'technical')).toBe(true);
    });

    it('distinguishes required vs addressable', () => {
      const safeguards = getSafeguards();
      expect(safeguards.some(s => s.type === 'required')).toBe(true);
      expect(safeguards.some(s => s.type === 'addressable')).toBe(true);
    });
  });

  describe('checkSafeguard', () => {
    it('checks safeguard implementation', () => {
      const evidence = { accessControls: { enabled: true } };
      const result = checkSafeguard('access-control', evidence);
      expect(result.safeguardId).toBe('access-control');
      expect(result.implemented).toBeDefined();
    });

    it('checks encryption requirements', () => {
      const evidence = { encryption: { atRest: true, inTransit: true } };
      const result = checkSafeguard('encryption', evidence);
      expect(result.implemented).toBe(true);
    });

    it('validates audit controls', () => {
      const evidence = { auditLogs: { enabled: true, retention: '6years' } };
      const result = checkSafeguard('audit-controls', evidence);
      expect(result.implemented).toBe(true);
    });
  });

  describe('generateBaaTemplate', () => {
    it('generates Business Associate Agreement template', () => {
      const baa = generateBaaTemplate({ coveredEntity: 'Hospital', businessAssociate: 'TLC Inc' });
      expect(baa).toContain('Business Associate Agreement');
      expect(baa).toContain('Hospital');
      expect(baa).toContain('TLC Inc');
    });

    it('includes required provisions', () => {
      const baa = generateBaaTemplate({});
      expect(baa).toContain('permitted uses');
      expect(baa).toContain('safeguards');
      expect(baa).toContain('breach notification');
    });
  });

  describe('assessPhiHandling', () => {
    it('assesses PHI data handling', () => {
      const codePatterns = [
        { file: 'patient.js', pattern: 'patient.ssn' },
        { file: 'records.js', pattern: 'medicalRecord' }
      ];
      const assessment = assessPhiHandling(codePatterns);
      expect(assessment.phiIdentified).toBe(true);
      expect(assessment.dataElements.length).toBeGreaterThan(0);
    });

    it('identifies PHI data elements', () => {
      const codePatterns = [{ file: 'test.js', pattern: 'patient.dateOfBirth' }];
      const assessment = assessPhiHandling(codePatterns);
      expect(assessment.dataElements).toContain('dateOfBirth');
    });

    it('suggests protection measures', () => {
      const assessment = assessPhiHandling([{ file: 'test.js', pattern: 'ssn' }]);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });
  });
});
