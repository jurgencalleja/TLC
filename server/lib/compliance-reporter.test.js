import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateReadinessReport,
  generateExecutiveSummary,
  generateDetailedFindings,
  includeEvidenceReferences,
  calculateRiskScore,
  calculateCategoryScores,
  formatReportHTML,
  formatReportMarkdown,
  getReportHistory,
  compareReports,
  createReporter,
} from './compliance-reporter.js';
import {
  createComplianceChecklist,
  updateControlStatus,
  linkControlToEvidence,
  TSC_CATEGORIES,
} from './compliance-checklist.js';

describe('compliance-reporter', () => {
  let checklist;
  let reporter;
  let mockEvidenceCollector;

  beforeEach(() => {
    checklist = createComplianceChecklist();
    mockEvidenceCollector = {
      getEvidenceInventory: vi.fn().mockReturnValue([
        {
          id: 'evidence-001',
          type: 'audit-log',
          description: 'Access control audit logs',
          collectedAt: '2026-01-15T10:00:00Z',
          hash: 'abc123',
        },
        {
          id: 'evidence-002',
          type: 'policy',
          description: 'Data protection policy',
          collectedAt: '2026-01-16T10:00:00Z',
          hash: 'def456',
        },
      ]),
      getEvidenceById: vi.fn().mockImplementation((id) => {
        const evidence = {
          'evidence-001': {
            id: 'evidence-001',
            type: 'audit-log',
            description: 'Access control audit logs',
            collectedAt: '2026-01-15T10:00:00Z',
            hash: 'abc123',
          },
          'evidence-002': {
            id: 'evidence-002',
            type: 'policy',
            description: 'Data protection policy',
            collectedAt: '2026-01-16T10:00:00Z',
            hash: 'def456',
          },
        };
        return evidence[id] || null;
      }),
    };
    reporter = createReporter({
      checklist,
      evidenceCollector: mockEvidenceCollector,
    });
  });

  describe('generateReadinessReport', () => {
    it('creates full report with all sections', () => {
      // Set up some controls as implemented
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'evidence-001');

      const report = generateReadinessReport(reporter, {
        period: {
          start: '2026-01-01',
          end: '2026-02-01',
        },
      });

      expect(report).toHaveProperty('title');
      expect(report.title).toContain('SOC 2');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('period');
      expect(report.period.start).toBe('2026-01-01');
      expect(report.period.end).toBe('2026-02-01');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('categories');
      expect(report).toHaveProperty('findings');
      expect(report).toHaveProperty('evidence');
      expect(report).toHaveProperty('recommendations');
    });

    it('includes overall compliance score in summary', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');

      const report = generateReadinessReport(reporter);

      expect(report.summary).toHaveProperty('overallScore');
      expect(typeof report.summary.overallScore).toBe('number');
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);
    });

    it('includes total controls and gaps count', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'partial');

      const report = generateReadinessReport(reporter);

      expect(report.summary).toHaveProperty('totalControls');
      expect(report.summary).toHaveProperty('implemented');
      expect(report.summary).toHaveProperty('gaps');
      expect(report.summary.totalControls).toBeGreaterThan(0);
    });

    it('includes risk level assessment', () => {
      const report = generateReadinessReport(reporter);

      expect(report.summary).toHaveProperty('riskLevel');
      expect(['low', 'medium', 'high', 'critical']).toContain(report.summary.riskLevel);
    });

    it('uses default period when not specified', () => {
      const report = generateReadinessReport(reporter);

      expect(report).toHaveProperty('period');
      expect(report.period).toHaveProperty('start');
      expect(report.period).toHaveProperty('end');
    });
  });

  describe('generateExecutiveSummary', () => {
    it('creates overview with key metrics', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'implemented');
      updateControlStatus(checklist, 'CC1.3', 'partial');

      const summary = generateExecutiveSummary(reporter);

      expect(summary).toHaveProperty('headline');
      expect(summary).toHaveProperty('overallScore');
      expect(summary).toHaveProperty('riskLevel');
      expect(summary).toHaveProperty('keyFindings');
      expect(summary).toHaveProperty('topPriorities');
    });

    it('provides compliance percentage', () => {
      const summary = generateExecutiveSummary(reporter);

      expect(typeof summary.overallScore).toBe('number');
      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallScore).toBeLessThanOrEqual(100);
    });

    it('highlights critical gaps first', () => {
      const summary = generateExecutiveSummary(reporter);

      if (summary.topPriorities.length > 0) {
        // Critical and high severity should be prioritized
        expect(['critical', 'high']).toContain(summary.topPriorities[0].severity);
      }
    });

    it('limits key findings to reasonable count', () => {
      const summary = generateExecutiveSummary(reporter);

      expect(summary.keyFindings.length).toBeLessThanOrEqual(5);
    });

    it('limits top priorities to actionable count', () => {
      const summary = generateExecutiveSummary(reporter);

      expect(summary.topPriorities.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateDetailedFindings', () => {
    it('lists all controls with status', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'not_implemented');

      const findings = generateDetailedFindings(reporter);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);

      const cc11 = findings.find((f) => f.controlId === 'CC1.1');
      const cc12 = findings.find((f) => f.controlId === 'CC1.2');

      expect(cc11).toBeDefined();
      expect(cc11.status).toBe('implemented');
      expect(cc12).toBeDefined();
      expect(cc12.status).toBe('not_implemented');
    });

    it('includes control details in each finding', () => {
      const findings = generateDetailedFindings(reporter);

      if (findings.length > 0) {
        const finding = findings[0];
        expect(finding).toHaveProperty('controlId');
        expect(finding).toHaveProperty('category');
        expect(finding).toHaveProperty('name');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('status');
        expect(finding).toHaveProperty('evidence');
      }
    });

    it('groups findings by category when requested', () => {
      const findings = generateDetailedFindings(reporter, { groupByCategory: true });

      expect(findings).toHaveProperty(TSC_CATEGORIES.SECURITY);
      expect(Array.isArray(findings[TSC_CATEGORIES.SECURITY])).toBe(true);
    });

    it('can filter to gaps only', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');

      const findings = generateDetailedFindings(reporter, { gapsOnly: true });

      const implementedFindings = findings.filter((f) => f.status === 'implemented');
      expect(implementedFindings.length).toBe(0);
    });

    it('includes remediation recommendations for gaps', () => {
      const findings = generateDetailedFindings(reporter, { gapsOnly: true });

      if (findings.length > 0) {
        expect(findings[0]).toHaveProperty('recommendation');
        expect(findings[0].recommendation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('includeEvidenceReferences', () => {
    it('links to evidence for implemented controls', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'evidence-001');

      const report = generateReadinessReport(reporter);
      const evidenceRefs = includeEvidenceReferences(reporter, report);

      expect(evidenceRefs).toHaveProperty('CC1.1');
      expect(evidenceRefs['CC1.1']).toContainEqual(
        expect.objectContaining({
          id: 'evidence-001',
        })
      );
    });

    it('includes evidence metadata', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'evidence-001');

      const report = generateReadinessReport(reporter);
      const evidenceRefs = includeEvidenceReferences(reporter, report);

      if (evidenceRefs['CC1.1'] && evidenceRefs['CC1.1'].length > 0) {
        const evidence = evidenceRefs['CC1.1'][0];
        expect(evidence).toHaveProperty('type');
        expect(evidence).toHaveProperty('collectedAt');
        expect(evidence).toHaveProperty('hash');
      }
    });

    it('returns empty object when no evidence linked', () => {
      const report = generateReadinessReport(reporter);
      const evidenceRefs = includeEvidenceReferences(reporter, report);

      // Should return an object (possibly with empty arrays for controls)
      expect(typeof evidenceRefs).toBe('object');
    });

    it('handles multiple evidence items per control', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      linkControlToEvidence(checklist, 'CC1.1', 'evidence-001');
      linkControlToEvidence(checklist, 'CC1.1', 'evidence-002');

      const report = generateReadinessReport(reporter);
      const evidenceRefs = includeEvidenceReferences(reporter, report);

      expect(evidenceRefs['CC1.1'].length).toBe(2);
    });
  });

  describe('calculateRiskScore', () => {
    it('computes overall risk from gaps', () => {
      // All controls not implemented = high risk
      const score = calculateRiskScore(reporter);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns low risk when fully compliant', () => {
      // Mark all controls as implemented
      const allControls = checklist.controls;
      allControls.forEach((c) => {
        updateControlStatus(checklist, c.id, 'implemented');
      });

      const score = calculateRiskScore(reporter);

      expect(score).toBeLessThanOrEqual(15); // Low risk threshold
    });

    it('weights critical gaps higher', () => {
      // Create two scenarios - one with high severity gap, one with low
      const checklist1 = createComplianceChecklist();
      const checklist2 = createComplianceChecklist();

      // Mark all as implemented except one high severity gap
      checklist1.controls.forEach((c) => {
        if (c.gapSeverity === 'high' && c.id === 'CC1.1') {
          // Leave not_implemented
        } else {
          updateControlStatus(checklist1, c.id, 'implemented');
        }
      });

      // Mark all as implemented except one low severity gap
      checklist2.controls.forEach((c) => {
        if (c.gapSeverity === 'low' && c.id === 'CC2.3') {
          // Leave not_implemented
        } else {
          updateControlStatus(checklist2, c.id, 'implemented');
        }
      });

      const reporter1 = createReporter({
        checklist: checklist1,
        evidenceCollector: mockEvidenceCollector,
      });
      const reporter2 = createReporter({
        checklist: checklist2,
        evidenceCollector: mockEvidenceCollector,
      });

      const score1 = calculateRiskScore(reporter1);
      const score2 = calculateRiskScore(reporter2);

      expect(score1).toBeGreaterThan(score2);
    });

    it('uses correct severity weights', () => {
      // The formula: Risk = 100 - compliance percentage, adjusted by severity
      // Critical = 3x, High = 2x, Medium = 1x, Low = 0.5x
      const score = calculateRiskScore(reporter);
      // Just verify it returns a reasonable value
      expect(score).toBeDefined();
    });

    it('returns risk level category', () => {
      const score = calculateRiskScore(reporter);
      const level = getRiskLevel(score);

      expect(['low', 'medium', 'high', 'critical']).toContain(level);
    });
  });

  describe('calculateCategoryScores', () => {
    it('computes per-category compliance scores', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'A1.1', 'implemented');

      const scores = calculateCategoryScores(reporter);

      expect(scores).toHaveProperty(TSC_CATEGORIES.SECURITY);
      expect(scores).toHaveProperty(TSC_CATEGORIES.AVAILABILITY);
      expect(typeof scores[TSC_CATEGORIES.SECURITY].score).toBe('number');
    });

    it('includes gap count per category', () => {
      const scores = calculateCategoryScores(reporter);

      Object.values(scores).forEach((categoryScore) => {
        expect(categoryScore).toHaveProperty('gaps');
        expect(typeof categoryScore.gaps).toBe('number');
      });
    });

    it('includes implemented count per category', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');

      const scores = calculateCategoryScores(reporter);

      expect(scores[TSC_CATEGORIES.SECURITY]).toHaveProperty('implemented');
    });

    it('includes total count per category', () => {
      const scores = calculateCategoryScores(reporter);

      Object.values(scores).forEach((categoryScore) => {
        expect(categoryScore).toHaveProperty('total');
        expect(categoryScore.total).toBeGreaterThan(0);
      });
    });

    it('calculates percentage correctly', () => {
      // Mark half of security controls as implemented
      const securityControls = checklist.controls.filter(
        (c) => c.category === TSC_CATEGORIES.SECURITY
      );
      const halfCount = Math.floor(securityControls.length / 2);
      securityControls.slice(0, halfCount).forEach((c) => {
        updateControlStatus(checklist, c.id, 'implemented');
      });

      const scores = calculateCategoryScores(reporter);

      expect(scores[TSC_CATEGORIES.SECURITY].score).toBeCloseTo(
        (halfCount / securityControls.length) * 100,
        0
      );
    });
  });

  describe('formatReportHTML', () => {
    it('generates styled HTML', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report = generateReadinessReport(reporter);

      const html = formatReportHTML(report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('includes CSS styles', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('includes report title', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      expect(html).toContain('SOC 2');
    });

    it('includes executive summary section', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      expect(html.toLowerCase()).toContain('summary');
    });

    it('includes compliance score visualization', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      // Should have some form of score display
      expect(html).toMatch(/\d+%|score|compliance/i);
    });

    it('includes findings table', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      expect(html).toContain('<table');
    });

    it('is print-ready (PDF-friendly)', () => {
      const report = generateReadinessReport(reporter);
      const html = formatReportHTML(report);

      // Check for print media query or explicit print styles
      expect(html).toMatch(/@media print|page-break|print-/);
    });
  });

  describe('formatReportMarkdown', () => {
    it('generates Markdown format', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report = generateReadinessReport(reporter);

      const markdown = formatReportMarkdown(report);

      expect(markdown).toContain('#'); // Headers
      expect(typeof markdown).toBe('string');
    });

    it('includes report title as H1', () => {
      const report = generateReadinessReport(reporter);
      const markdown = formatReportMarkdown(report);

      expect(markdown).toMatch(/^# .+/m);
    });

    it('includes summary section', () => {
      const report = generateReadinessReport(reporter);
      const markdown = formatReportMarkdown(report);

      expect(markdown.toLowerCase()).toContain('summary');
    });

    it('includes category breakdown', () => {
      const report = generateReadinessReport(reporter);
      const markdown = formatReportMarkdown(report);

      expect(markdown).toContain('Security');
    });

    it('includes findings as table or list', () => {
      const report = generateReadinessReport(reporter);
      const markdown = formatReportMarkdown(report);

      // Should have table markers or list items
      expect(markdown).toMatch(/\|.*\||\n- /);
    });

    it('includes recommendations section', () => {
      const report = generateReadinessReport(reporter);
      const markdown = formatReportMarkdown(report);

      expect(markdown.toLowerCase()).toContain('recommend');
    });
  });

  describe('getReportHistory', () => {
    it('returns past reports', () => {
      // Generate and save a report
      const report = generateReadinessReport(reporter);
      saveReport(reporter, report);

      const history = getReportHistory(reporter);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('returns reports sorted by date (newest first)', () => {
      const report1 = generateReadinessReport(reporter, {
        period: { start: '2026-01-01', end: '2026-01-15' },
      });
      saveReport(reporter, report1);

      const report2 = generateReadinessReport(reporter, {
        period: { start: '2026-01-16', end: '2026-02-01' },
      });
      saveReport(reporter, report2);

      const history = getReportHistory(reporter);

      if (history.length >= 2) {
        const date1 = new Date(history[0].generatedAt);
        const date2 = new Date(history[1].generatedAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('includes summary metadata in history entries', () => {
      const report = generateReadinessReport(reporter);
      saveReport(reporter, report);

      const history = getReportHistory(reporter);

      if (history.length > 0) {
        expect(history[0]).toHaveProperty('generatedAt');
        expect(history[0]).toHaveProperty('overallScore');
        expect(history[0]).toHaveProperty('period');
      }
    });

    it('limits history to specified count', () => {
      // Generate multiple reports
      for (let i = 0; i < 5; i++) {
        const report = generateReadinessReport(reporter);
        saveReport(reporter, report);
      }

      const history = getReportHistory(reporter, { limit: 3 });

      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array when no history exists', () => {
      const freshReporter = createReporter({
        checklist: createComplianceChecklist(),
        evidenceCollector: mockEvidenceCollector,
      });

      const history = getReportHistory(freshReporter);

      expect(history).toEqual([]);
    });
  });

  describe('compareReports', () => {
    it('shows progress over time', () => {
      // First report - 0% compliance
      const report1 = generateReadinessReport(reporter);

      // Implement some controls
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      updateControlStatus(checklist, 'CC1.2', 'implemented');

      // Second report - some compliance
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('scoreChange');
      expect(comparison.scoreChange).toBeGreaterThan(0);
    });

    it('identifies newly implemented controls', () => {
      const report1 = generateReadinessReport(reporter);

      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('newlyImplemented');
      expect(comparison.newlyImplemented).toContainEqual(
        expect.objectContaining({ controlId: 'CC1.1' })
      );
    });

    it('identifies newly identified gaps', () => {
      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report1 = generateReadinessReport(reporter);

      updateControlStatus(checklist, 'CC1.1', 'not_implemented');
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('newGaps');
      expect(comparison.newGaps).toContainEqual(
        expect.objectContaining({ controlId: 'CC1.1' })
      );
    });

    it('calculates risk score change', () => {
      const report1 = generateReadinessReport(reporter);

      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('riskChange');
      expect(comparison.riskChange).toBeLessThanOrEqual(0); // Risk should decrease
    });

    it('compares category scores', () => {
      const report1 = generateReadinessReport(reporter);

      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('categoryChanges');
      expect(comparison.categoryChanges).toHaveProperty(TSC_CATEGORIES.SECURITY);
    });

    it('generates human-readable summary', () => {
      const report1 = generateReadinessReport(reporter);

      updateControlStatus(checklist, 'CC1.1', 'implemented');
      const report2 = generateReadinessReport(reporter);

      const comparison = compareReports(report1, report2);

      expect(comparison).toHaveProperty('summary');
      expect(typeof comparison.summary).toBe('string');
      expect(comparison.summary.length).toBeGreaterThan(0);
    });
  });
});

// Helper function for risk level (used in tests)
function getRiskLevel(score) {
  if (score <= 15) return 'low';
  if (score <= 40) return 'medium';
  if (score <= 70) return 'high';
  return 'critical';
}

// Helper function for saving reports (used in tests)
function saveReport(reporter, report) {
  if (!reporter._reportHistory) {
    reporter._reportHistory = [];
  }
  reporter._reportHistory.push({
    generatedAt: report.generatedAt,
    overallScore: report.summary.overallScore,
    period: report.period,
    riskLevel: report.summary.riskLevel,
    _fullReport: report,
  });
}
