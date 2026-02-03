/**
 * Dependency Scanner Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { runNpmAudit, runTrivyScan, parseVulnerabilities, checkLicenses, generateSbom, createDependencyScanner } from './dependency-scanner.js';

describe('dependency-scanner', () => {
  describe('runNpmAudit', () => {
    it('runs npm audit', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '{"vulnerabilities": {}}' });
      const result = await runNpmAudit({ exec: mockExec });
      expect(result.vulnerabilities).toBeDefined();
    });
  });

  describe('runTrivyScan', () => {
    it('runs Trivy scan', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '{"Results": []}' });
      const result = await runTrivyScan({ path: '.', exec: mockExec });
      expect(result.Results).toBeDefined();
    });
  });

  describe('parseVulnerabilities', () => {
    it('parses vulnerability results', () => {
      const results = { vulnerabilities: { lodash: { severity: 'high', via: [{ title: 'Prototype Pollution' }] } } };
      const parsed = parseVulnerabilities(results);
      expect(parsed[0].package).toBe('lodash');
      expect(parsed[0].severity).toBe('high');
    });
  });

  describe('checkLicenses', () => {
    it('checks license compliance', () => {
      const deps = [{ name: 'pkg1', license: 'MIT' }, { name: 'pkg2', license: 'GPL-3.0' }];
      const result = checkLicenses(deps, { allowed: ['MIT', 'Apache-2.0'] });
      expect(result.compliant).toBe(false);
      expect(result.violations[0].package).toBe('pkg2');
    });
  });

  describe('generateSbom', () => {
    it('generates SBOM', () => {
      const deps = [{ name: 'lodash', version: '4.17.21' }];
      const sbom = generateSbom(deps, { format: 'cyclonedx' });
      expect(sbom).toContain('bomFormat');
    });
  });

  describe('createDependencyScanner', () => {
    it('creates scanner', () => {
      const scanner = createDependencyScanner();
      expect(scanner.scan).toBeDefined();
      expect(scanner.checkLicenses).toBeDefined();
      expect(scanner.generateSbom).toBeDefined();
    });

    it('filters by severity threshold', async () => {
      const scanner = createDependencyScanner();
      const results = await scanner.scan({ severity: 'high', mockResults: [{ severity: 'high' }, { severity: 'low' }] });
      expect(results.every(r => r.severity === 'high')).toBe(true);
    });
  });
});
