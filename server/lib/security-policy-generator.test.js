/**
 * Security Policy Generator Tests
 *
 * Tests for generating security policy documents from configuration.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  generateAccessControlPolicy,
  generateDataProtectionPolicy,
  generateIncidentResponsePolicy,
  generateAuthPolicy,
  generateAcceptableUsePolicy,
  loadPolicyConfig,
  exportAsMarkdown,
  exportAsHtml,
  POLICY_TEMPLATES,
  DEFAULT_POLICY_CONFIG,
} from './security-policy-generator.js';

describe('security-policy-generator', () => {
  let testDir;
  let tlcJsonPath;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-security-policy-test-'));
    tlcJsonPath = path.join(testDir, '.tlc.json');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('POLICY_TEMPLATES', () => {
    it('exports policy templates object', () => {
      expect(POLICY_TEMPLATES).toBeDefined();
      expect(typeof POLICY_TEMPLATES).toBe('object');
    });

    it('includes access control template', () => {
      expect(POLICY_TEMPLATES.accessControl).toBeDefined();
    });

    it('includes data protection template', () => {
      expect(POLICY_TEMPLATES.dataProtection).toBeDefined();
    });

    it('includes incident response template', () => {
      expect(POLICY_TEMPLATES.incidentResponse).toBeDefined();
    });

    it('includes auth template', () => {
      expect(POLICY_TEMPLATES.auth).toBeDefined();
    });

    it('includes acceptable use template', () => {
      expect(POLICY_TEMPLATES.acceptableUse).toBeDefined();
    });
  });

  describe('DEFAULT_POLICY_CONFIG', () => {
    it('exports default configuration', () => {
      expect(DEFAULT_POLICY_CONFIG).toBeDefined();
      expect(DEFAULT_POLICY_CONFIG.organization).toBeDefined();
      expect(DEFAULT_POLICY_CONFIG.version).toBeDefined();
    });
  });

  describe('generateAccessControlPolicy', () => {
    it('creates policy document with standard structure', () => {
      const policy = generateAccessControlPolicy();

      expect(policy.title).toBe('Access Control Policy');
      expect(policy.version).toBeDefined();
      expect(policy.effectiveDate).toBeDefined();
      expect(policy.sections).toBeInstanceOf(Array);
      expect(policy.sections.length).toBeGreaterThan(0);
    });

    it('includes required sections', () => {
      const policy = generateAccessControlPolicy();
      const headings = policy.sections.map(s => s.heading);

      expect(headings).toContain('Purpose');
      expect(headings).toContain('Scope');
      expect(headings).toContain('Policy');
      expect(headings).toContain('Procedures');
      expect(headings).toContain('Enforcement');
    });

    it('includes RBAC content', () => {
      const policy = generateAccessControlPolicy();
      const policySection = policy.sections.find(s => s.heading === 'Policy');

      expect(policySection.content).toMatch(/role|permission|access/i);
    });

    it('customizes with organization name', () => {
      const policy = generateAccessControlPolicy({ organization: 'Acme Corp' });

      expect(policy.organization).toBe('Acme Corp');
    });

    it('sets effective date', () => {
      const policy = generateAccessControlPolicy({ effectiveDate: '2026-03-01' });

      expect(policy.effectiveDate).toBe('2026-03-01');
    });

    it('sets review date', () => {
      const policy = generateAccessControlPolicy({ reviewDate: '2027-03-01' });

      expect(policy.reviewDate).toBe('2027-03-01');
    });
  });

  describe('generateDataProtectionPolicy', () => {
    it('creates policy document', () => {
      const policy = generateDataProtectionPolicy();

      expect(policy.title).toBe('Data Protection Policy');
      expect(policy.sections).toBeInstanceOf(Array);
    });

    it('includes data classification section', () => {
      const policy = generateDataProtectionPolicy();
      const sections = policy.sections.map(s => s.heading.toLowerCase());

      expect(sections.some(h => h.includes('classification') || h.includes('data'))).toBe(true);
    });

    it('includes encryption requirements', () => {
      const policy = generateDataProtectionPolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/encrypt/i);
    });

    it('includes retention policies', () => {
      const policy = generateDataProtectionPolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/retention|retain|delete/i);
    });

    it('customizes with organization name', () => {
      const policy = generateDataProtectionPolicy({ organization: 'Test Org' });

      expect(policy.organization).toBe('Test Org');
    });
  });

  describe('generateIncidentResponsePolicy', () => {
    it('creates policy document', () => {
      const policy = generateIncidentResponsePolicy();

      expect(policy.title).toBe('Incident Response Policy');
      expect(policy.sections).toBeInstanceOf(Array);
    });

    it('includes incident classification', () => {
      const policy = generateIncidentResponsePolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/severity|classification|priority/i);
    });

    it('includes response procedures', () => {
      const policy = generateIncidentResponsePolicy();
      const headings = policy.sections.map(s => s.heading.toLowerCase());

      expect(headings.some(h => h.includes('response') || h.includes('procedure'))).toBe(true);
    });

    it('includes escalation matrix', () => {
      const policy = generateIncidentResponsePolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/escalat|notify|contact/i);
    });

    it('customizes with organization name', () => {
      const policy = generateIncidentResponsePolicy({ organization: 'Security Inc' });

      expect(policy.organization).toBe('Security Inc');
    });
  });

  describe('generateAuthPolicy', () => {
    it('creates policy document', () => {
      const policy = generateAuthPolicy();

      expect(policy.title).toBe('Authentication and Authorization Policy');
      expect(policy.sections).toBeInstanceOf(Array);
    });

    it('includes MFA requirements', () => {
      const policy = generateAuthPolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/MFA|multi-factor|two-factor|2FA/i);
    });

    it('includes password requirements', () => {
      const policy = generateAuthPolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/password/i);
    });

    it('includes session management', () => {
      const policy = generateAuthPolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/session|timeout|expir/i);
    });

    it('customizes with organization name', () => {
      const policy = generateAuthPolicy({ organization: 'Auth Corp' });

      expect(policy.organization).toBe('Auth Corp');
    });

    it('allows custom password requirements', () => {
      const policy = generateAuthPolicy({
        passwordMinLength: 16,
        passwordRequireSpecial: true,
      });

      const content = policy.sections.map(s => s.content).join(' ');
      expect(content).toMatch(/16|special/i);
    });
  });

  describe('generateAcceptableUsePolicy', () => {
    it('creates policy document', () => {
      const policy = generateAcceptableUsePolicy();

      expect(policy.title).toBe('Acceptable Use Policy');
      expect(policy.sections).toBeInstanceOf(Array);
    });

    it('includes acceptable use guidelines', () => {
      const policy = generateAcceptableUsePolicy();
      const headings = policy.sections.map(s => s.heading.toLowerCase());

      expect(headings.some(h => h.includes('acceptable') || h.includes('permitted'))).toBe(true);
    });

    it('includes prohibited activities', () => {
      const policy = generateAcceptableUsePolicy();
      const content = policy.sections.map(s => s.content).join(' ');

      expect(content).toMatch(/prohibit|forbidden|not allowed|unauthorized/i);
    });

    it('customizes with organization name', () => {
      const policy = generateAcceptableUsePolicy({ organization: 'Use Corp' });

      expect(policy.organization).toBe('Use Corp');
    });
  });

  describe('customizes policy with organization name', () => {
    it('applies organization to all policy types', () => {
      const orgName = 'Global Security Inc';
      const options = { organization: orgName };

      expect(generateAccessControlPolicy(options).organization).toBe(orgName);
      expect(generateDataProtectionPolicy(options).organization).toBe(orgName);
      expect(generateIncidentResponsePolicy(options).organization).toBe(orgName);
      expect(generateAuthPolicy(options).organization).toBe(orgName);
      expect(generateAcceptableUsePolicy(options).organization).toBe(orgName);
    });
  });

  describe('customizes policy with custom sections', () => {
    it('adds custom sections to policy', () => {
      const customSections = [
        { heading: 'Custom Section', content: 'Custom content for this organization.' },
      ];

      const policy = generateAccessControlPolicy({ customSections });

      const headings = policy.sections.map(s => s.heading);
      expect(headings).toContain('Custom Section');
    });

    it('appends custom sections after standard sections', () => {
      const customSections = [
        { heading: 'Additional Requirements', content: 'Extra requirements.' },
      ];

      const policy = generateAccessControlPolicy({ customSections });

      const lastSection = policy.sections[policy.sections.length - 1];
      expect(lastSection.heading).toBe('Additional Requirements');
    });

    it('supports multiple custom sections', () => {
      const customSections = [
        { heading: 'Section A', content: 'Content A' },
        { heading: 'Section B', content: 'Content B' },
        { heading: 'Section C', content: 'Content C' },
      ];

      const policy = generateDataProtectionPolicy({ customSections });

      const headings = policy.sections.map(s => s.heading);
      expect(headings).toContain('Section A');
      expect(headings).toContain('Section B');
      expect(headings).toContain('Section C');
    });
  });

  describe('exports as Markdown format', () => {
    it('exports policy as Markdown string', () => {
      const policy = generateAccessControlPolicy({ organization: 'Test Org' });
      const markdown = exportAsMarkdown(policy);

      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# Access Control Policy');
    });

    it('includes organization in header', () => {
      const policy = generateAccessControlPolicy({ organization: 'Markdown Corp' });
      const markdown = exportAsMarkdown(policy);

      expect(markdown).toContain('Markdown Corp');
    });

    it('includes version and dates', () => {
      const policy = generateAccessControlPolicy({
        version: '2.0',
        effectiveDate: '2026-02-02',
        reviewDate: '2027-02-02',
      });
      const markdown = exportAsMarkdown(policy);

      expect(markdown).toContain('2.0');
      expect(markdown).toContain('2026-02-02');
      expect(markdown).toContain('2027-02-02');
    });

    it('formats sections with headers', () => {
      const policy = generateAccessControlPolicy();
      const markdown = exportAsMarkdown(policy);

      expect(markdown).toContain('## Purpose');
      expect(markdown).toContain('## Scope');
      expect(markdown).toContain('## Policy');
    });

    it('includes approval information', () => {
      const policy = generateAccessControlPolicy({ approvedBy: 'Security Team' });
      const markdown = exportAsMarkdown(policy);

      expect(markdown).toContain('Security Team');
    });
  });

  describe('exports as HTML format', () => {
    it('exports policy as HTML string', () => {
      const policy = generateAccessControlPolicy({ organization: 'Test Org' });
      const html = exportAsHtml(policy);

      expect(typeof html).toBe('string');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('includes proper HTML structure', () => {
      const policy = generateAccessControlPolicy();
      const html = exportAsHtml(policy);

      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('<title>');
    });

    it('includes CSS for print styling', () => {
      const policy = generateAccessControlPolicy();
      const html = exportAsHtml(policy);

      expect(html).toContain('<style>');
      expect(html).toMatch(/@media print|print-friendly|page-break/i);
    });

    it('formats title as h1', () => {
      const policy = generateAccessControlPolicy();
      const html = exportAsHtml(policy);

      expect(html).toContain('<h1>');
      expect(html).toContain('Access Control Policy');
    });

    it('formats sections with h2', () => {
      const policy = generateAccessControlPolicy();
      const html = exportAsHtml(policy);

      expect(html).toContain('<h2>');
    });

    it('includes meta information', () => {
      const policy = generateAccessControlPolicy({
        organization: 'HTML Corp',
        version: '1.0',
        effectiveDate: '2026-02-02',
      });
      const html = exportAsHtml(policy);

      expect(html).toContain('HTML Corp');
      expect(html).toContain('1.0');
      expect(html).toContain('2026-02-02');
    });
  });

  describe('loadPolicyConfig', () => {
    it('reads from .tlc.json', async () => {
      const config = {
        project: 'TestProject',
        security: {
          policies: {
            organization: 'Config Org',
            version: '1.0',
          },
        },
      };
      fs.writeFileSync(tlcJsonPath, JSON.stringify(config, null, 2));

      const policyConfig = await loadPolicyConfig(testDir);

      expect(policyConfig.organization).toBe('Config Org');
      expect(policyConfig.version).toBe('1.0');
    });

    it('returns defaults when no config exists', async () => {
      const policyConfig = await loadPolicyConfig(testDir);

      expect(policyConfig).toEqual(DEFAULT_POLICY_CONFIG);
    });

    it('returns defaults when security.policies not set', async () => {
      const config = {
        project: 'TestProject',
      };
      fs.writeFileSync(tlcJsonPath, JSON.stringify(config, null, 2));

      const policyConfig = await loadPolicyConfig(testDir);

      expect(policyConfig).toEqual(DEFAULT_POLICY_CONFIG);
    });

    it('merges config with defaults', async () => {
      const config = {
        security: {
          policies: {
            organization: 'Partial Org',
          },
        },
      };
      fs.writeFileSync(tlcJsonPath, JSON.stringify(config, null, 2));

      const policyConfig = await loadPolicyConfig(testDir);

      expect(policyConfig.organization).toBe('Partial Org');
      expect(policyConfig.version).toBe(DEFAULT_POLICY_CONFIG.version);
    });
  });

  describe('merges custom policies with templates', () => {
    it('merges custom content into template sections', () => {
      const policy = generateAccessControlPolicy({
        sectionOverrides: {
          Purpose: 'Our custom purpose statement for access control.',
        },
      });

      const purposeSection = policy.sections.find(s => s.heading === 'Purpose');
      expect(purposeSection.content).toBe('Our custom purpose statement for access control.');
    });

    it('preserves template sections not overridden', () => {
      const defaultPolicy = generateAccessControlPolicy();
      const customPolicy = generateAccessControlPolicy({
        sectionOverrides: {
          Purpose: 'Custom purpose',
        },
      });

      const defaultScope = defaultPolicy.sections.find(s => s.heading === 'Scope');
      const customScope = customPolicy.sections.find(s => s.heading === 'Scope');

      expect(customScope.content).toBe(defaultScope.content);
    });

    it('allows complete template replacement', () => {
      const customSections = [
        { heading: 'Introduction', content: 'Completely custom intro.' },
        { heading: 'Rules', content: 'Custom rules.' },
      ];

      const policy = generateAccessControlPolicy({
        replaceTemplate: true,
        customSections,
      });

      expect(policy.sections).toHaveLength(2);
      expect(policy.sections[0].heading).toBe('Introduction');
      expect(policy.sections[1].heading).toBe('Rules');
    });
  });

  describe('policy structure', () => {
    it('matches expected structure', () => {
      const policy = generateAccessControlPolicy({
        organization: 'Acme Corp',
        version: '1.0',
        effectiveDate: '2026-02-02',
        reviewDate: '2027-02-02',
        approvedBy: 'Security Team',
      });

      expect(policy).toMatchObject({
        title: 'Access Control Policy',
        version: '1.0',
        effectiveDate: '2026-02-02',
        organization: 'Acme Corp',
        approvedBy: 'Security Team',
        reviewDate: '2027-02-02',
      });

      expect(policy.sections).toBeInstanceOf(Array);
      expect(policy.sections[0]).toMatchObject({
        heading: expect.any(String),
        content: expect.any(String),
      });
    });
  });
});
