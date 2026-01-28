import { describe, it, expect } from 'vitest';
import {
  parseNpmAuditOutput,
  parsePipAuditOutput,
  formatSecurityReport,
  categorizeBySeverity,
  generateFixSuggestions,
} from './security-audit.js';

describe('security-audit', () => {
  describe('parseNpmAuditOutput', () => {
    it('parses npm audit JSON output', () => {
      const auditOutput = {
        vulnerabilities: {
          lodash: {
            name: 'lodash',
            severity: 'high',
            via: [{ title: 'Prototype Pollution', url: 'https://npmjs.com/advisories/1065' }],
            fixAvailable: { name: 'lodash', version: '4.17.21' },
          },
          axios: {
            name: 'axios',
            severity: 'moderate',
            via: [{ title: 'Server-Side Request Forgery' }],
            fixAvailable: true,
          },
        },
        metadata: {
          vulnerabilities: { total: 2, high: 1, moderate: 1 },
        },
      };

      const result = parseNpmAuditOutput(JSON.stringify(auditOutput));

      expect(result.vulnerabilities).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.high).toBe(1);
    });

    it('handles clean audit (no vulnerabilities)', () => {
      const auditOutput = {
        vulnerabilities: {},
        metadata: {
          vulnerabilities: { total: 0 },
        },
      };

      const result = parseNpmAuditOutput(JSON.stringify(auditOutput));

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('returns null for invalid JSON', () => {
      const result = parseNpmAuditOutput('not json');

      expect(result).toBeNull();
    });
  });

  describe('parsePipAuditOutput', () => {
    it('parses pip-audit JSON output', () => {
      const auditOutput = [
        {
          name: 'requests',
          version: '2.25.0',
          vulns: [
            { id: 'PYSEC-2021-123', fix_versions: ['2.26.0'], description: 'SSRF vulnerability' },
          ],
        },
      ];

      const result = parsePipAuditOutput(JSON.stringify(auditOutput));

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].package).toBe('requests');
      expect(result.vulnerabilities[0].fixVersion).toBe('2.26.0');
    });

    it('handles clean audit', () => {
      const result = parsePipAuditOutput('[]');

      expect(result.vulnerabilities).toHaveLength(0);
    });
  });

  describe('categorizeBySeverity', () => {
    it('groups vulnerabilities by severity', () => {
      const vulns = [
        { package: 'a', severity: 'critical' },
        { package: 'b', severity: 'high' },
        { package: 'c', severity: 'high' },
        { package: 'd', severity: 'moderate' },
        { package: 'e', severity: 'low' },
      ];

      const result = categorizeBySeverity(vulns);

      expect(result.critical).toHaveLength(1);
      expect(result.high).toHaveLength(2);
      expect(result.moderate).toHaveLength(1);
      expect(result.low).toHaveLength(1);
    });

    it('handles empty array', () => {
      const result = categorizeBySeverity([]);

      expect(result.critical).toHaveLength(0);
      expect(result.high).toHaveLength(0);
    });
  });

  describe('generateFixSuggestions', () => {
    it('suggests npm update for fixable packages', () => {
      const vuln = {
        package: 'lodash',
        severity: 'high',
        fixAvailable: true,
        fixVersion: '4.17.21',
      };

      const suggestion = generateFixSuggestions(vuln, 'npm');

      expect(suggestion.command).toContain('npm');
      expect(suggestion.command).toContain('lodash');
      expect(suggestion.safe).toBeDefined();
    });

    it('marks major version bumps as unsafe', () => {
      const vuln = {
        package: 'react',
        severity: 'moderate',
        currentVersion: '16.14.0',
        fixVersion: '18.2.0',
        fixAvailable: true,
      };

      const suggestion = generateFixSuggestions(vuln, 'npm');

      expect(suggestion.safe).toBe(false);
      expect(suggestion.reason).toContain('major');
    });

    it('marks minor/patch updates as safe', () => {
      const vuln = {
        package: 'lodash',
        severity: 'high',
        currentVersion: '4.17.15',
        fixVersion: '4.17.21',
        fixAvailable: true,
      };

      const suggestion = generateFixSuggestions(vuln, 'npm');

      expect(suggestion.safe).toBe(true);
    });

    it('returns no-fix suggestion when not fixable', () => {
      const vuln = {
        package: 'legacy-lib',
        severity: 'high',
        fixAvailable: false,
      };

      const suggestion = generateFixSuggestions(vuln, 'npm');

      expect(suggestion.command).toBeNull();
      expect(suggestion.reason).toContain('no fix');
    });
  });

  describe('formatSecurityReport', () => {
    it('formats report with vulnerability counts', () => {
      const auditResult = {
        vulnerabilities: [
          { package: 'lodash', severity: 'high', title: 'Prototype Pollution' },
          { package: 'axios', severity: 'moderate', title: 'SSRF' },
        ],
        summary: { total: 2, critical: 0, high: 1, moderate: 1, low: 0 },
      };

      const report = formatSecurityReport(auditResult);

      expect(report).toContain('2');
      expect(report).toContain('High');  // Section header
      expect(report).toContain('lodash');
    });

    it('shows clean status when no vulnerabilities', () => {
      const auditResult = {
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
      };

      const report = formatSecurityReport(auditResult);

      expect(report.toLowerCase()).toContain('no vulnerabilities');
    });

    it('highlights critical vulnerabilities', () => {
      const auditResult = {
        vulnerabilities: [
          { package: 'critical-pkg', severity: 'critical', title: 'RCE' },
        ],
        summary: { total: 1, critical: 1, high: 0, moderate: 0, low: 0 },
      };

      const report = formatSecurityReport(auditResult);

      expect(report).toContain('critical');
      expect(report).toContain('critical-pkg');
    });
  });
});
