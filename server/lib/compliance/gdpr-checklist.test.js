/**
 * GDPR Checklist Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createGdprChecklist, getArticles, checkArticle, generateDpia, assessDataProcessing, generatePrivacyNotice } from './gdpr-checklist.js';

describe('gdpr-checklist', () => {
  describe('createGdprChecklist', () => {
    it('creates GDPR checklist', () => {
      const checklist = createGdprChecklist();
      expect(checklist.evaluate).toBeDefined();
      expect(checklist.getArticles).toBeDefined();
    });

    it('covers key GDPR principles', () => {
      const checklist = createGdprChecklist();
      const principles = checklist.getPrinciples();
      expect(principles).toContain('lawfulness');
      expect(principles).toContain('purpose-limitation');
      expect(principles).toContain('data-minimization');
      expect(principles).toContain('accuracy');
      expect(principles).toContain('storage-limitation');
      expect(principles).toContain('integrity-confidentiality');
    });
  });

  describe('getArticles', () => {
    it('returns relevant GDPR articles', () => {
      const articles = getArticles();
      expect(articles.length).toBeGreaterThan(0);
    });

    it('filters by chapter', () => {
      const chapter2 = getArticles({ chapter: 2 });
      expect(chapter2.every(a => a.chapter === 2)).toBe(true);
    });

    it('includes article requirements', () => {
      const articles = getArticles();
      const art5 = articles.find(a => a.number === 5);
      expect(art5.requirements).toBeDefined();
    });
  });

  describe('checkArticle', () => {
    it('checks article compliance', () => {
      const evidence = { lawfulBasis: 'consent', consentRecords: true };
      const result = checkArticle(6, evidence);
      expect(result.articleNumber).toBe(6);
      expect(result.compliant).toBeDefined();
    });

    it('validates data subject rights', () => {
      const evidence = {
        rightToAccess: true,
        rightToRectification: true,
        rightToErasure: true,
        rightToPortability: true
      };
      const result = checkArticle(15, evidence);
      expect(result.compliant).toBe(true);
    });

    it('checks breach notification readiness', () => {
      const evidence = { breachProcedure: true, notificationTemplate: true };
      const result = checkArticle(33, evidence);
      expect(result.compliant).toBe(true);
    });
  });

  describe('generateDpia', () => {
    it('generates Data Protection Impact Assessment', () => {
      const processing = {
        purpose: 'User analytics',
        dataTypes: ['browsing behavior', 'device info'],
        recipients: ['analytics provider'],
        retention: '2 years'
      };
      const dpia = generateDpia(processing);
      expect(dpia).toContain('Data Protection Impact Assessment');
      expect(dpia).toContain('User analytics');
    });

    it('assesses risk level', () => {
      const processing = {
        purpose: 'Health monitoring',
        dataTypes: ['health data'],
        specialCategories: true
      };
      const dpia = generateDpia(processing);
      expect(dpia).toContain('HIGH');
    });
  });

  describe('assessDataProcessing', () => {
    it('identifies personal data processing', () => {
      const codePatterns = [
        { file: 'user.js', pattern: 'user.email' },
        { file: 'analytics.js', pattern: 'ipAddress' }
      ];
      const assessment = assessDataProcessing(codePatterns);
      expect(assessment.personalDataIdentified).toBe(true);
    });

    it('classifies data categories', () => {
      const codePatterns = [{ file: 'test.js', pattern: 'healthRecords' }];
      const assessment = assessDataProcessing(codePatterns);
      expect(assessment.specialCategories).toBe(true);
    });
  });

  describe('generatePrivacyNotice', () => {
    it('generates privacy notice template', () => {
      const config = {
        controller: 'TLC Inc',
        purposes: ['Service delivery', 'Analytics'],
        lawfulBasis: 'contract'
      };
      const notice = generatePrivacyNotice(config);
      expect(notice).toContain('Privacy Notice');
      expect(notice).toContain('TLC Inc');
    });

    it('includes required information', () => {
      const notice = generatePrivacyNotice({});
      expect(notice).toContain('data controller');
      expect(notice).toContain('your rights');
      expect(notice).toContain('retention');
    });
  });
});
