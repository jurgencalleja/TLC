/**
 * Security Reporter Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { generateSecurityReport, formatSarif, formatHtml, formatJson, aggregateFindings, calculateRiskScore, createSecurityReporter } from './security-reporter.js';

describe('security-reporter', () => {
  describe('generateSecurityReport', () => {
    it('generates comprehensive security report', () => {
      const findings = {
        sast: [{ rule: 'xss', severity: 'high' }],
        dast: [{ alert: 'sqli', risk: 'critical' }],
        dependencies: [{ package: 'lodash', severity: 'medium' }],
        secrets: []
      };
      const report = generateSecurityReport(findings);
      expect(report.summary).toBeDefined();
      expect(report.findings).toBeDefined();
      expect(report.riskScore).toBeDefined();
    });
  });

  describe('formatSarif', () => {
    it('formats findings as SARIF', () => {
      const findings = [{ rule: 'xss', file: 'app.js', line: 10 }];
      const sarif = formatSarif(findings);
      expect(sarif.$schema).toContain('sarif');
      expect(sarif.runs).toBeDefined();
    });
  });

  describe('formatHtml', () => {
    it('formats findings as HTML', () => {
      const findings = [{ rule: 'xss', severity: 'high' }];
      const html = formatHtml(findings, { title: 'Security Report' });
      expect(html).toContain('<html');
      expect(html).toContain('xss');
    });
  });

  describe('formatJson', () => {
    it('formats findings as JSON', () => {
      const findings = [{ rule: 'xss' }];
      const json = formatJson(findings);
      expect(JSON.parse(json)).toEqual(findings);
    });
  });

  describe('aggregateFindings', () => {
    it('aggregates findings from multiple sources', () => {
      const sources = {
        sast: [{ id: 1, severity: 'high' }],
        dast: [{ id: 2, severity: 'critical' }]
      };
      const aggregated = aggregateFindings(sources);
      expect(aggregated.length).toBe(2);
      expect(aggregated.some(f => f.source === 'sast')).toBe(true);
    });

    it('deduplicates similar findings', () => {
      const sources = {
        sast: [{ file: 'app.js', line: 10, rule: 'xss' }],
        dast: [{ file: 'app.js', line: 10, rule: 'xss' }]
      };
      const aggregated = aggregateFindings(sources, { deduplicate: true });
      expect(aggregated.length).toBe(1);
    });
  });

  describe('calculateRiskScore', () => {
    it('calculates risk score from findings', () => {
      const findings = [
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' }
      ];
      const score = calculateRiskScore(findings);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for no findings', () => {
      const score = calculateRiskScore([]);
      expect(score).toBe(0);
    });
  });

  describe('createSecurityReporter', () => {
    it('creates reporter', () => {
      const reporter = createSecurityReporter();
      expect(reporter.generate).toBeDefined();
      expect(reporter.export).toBeDefined();
    });

    it('supports multiple output formats', () => {
      const reporter = createSecurityReporter();
      const findings = [{ rule: 'test', severity: 'low' }];

      const sarif = reporter.export(findings, { format: 'sarif' });
      expect(sarif.$schema).toBeDefined();

      const html = reporter.export(findings, { format: 'html' });
      expect(html).toContain('<html');
    });

    it('generates executive summary', () => {
      const reporter = createSecurityReporter();
      const findings = [{ severity: 'high' }, { severity: 'low' }];
      const summary = reporter.executiveSummary(findings);
      expect(summary.totalFindings).toBe(2);
      expect(summary.bySeverity.high).toBe(1);
    });
  });
});
