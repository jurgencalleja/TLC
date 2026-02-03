/**
 * Secret Scanner Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { runGitleaks, scanHistory, detectPatterns, generateReport, createSecretScanner } from './secret-scanner.js';

describe('secret-scanner', () => {
  describe('runGitleaks', () => {
    it('runs GitLeaks scan', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '[]' });
      const result = await runGitleaks({ path: '.', exec: mockExec });
      expect(result).toBeDefined();
    });
  });

  describe('scanHistory', () => {
    it('scans commit history', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '[]' });
      const result = await scanHistory({ depth: 100, exec: mockExec });
      expect(result).toBeDefined();
    });
  });

  describe('detectPatterns', () => {
    it('detects common secret patterns', () => {
      const content = 'API_KEY=sk-1234567890abcdef';
      const findings = detectPatterns(content);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].type).toContain('key');
    });

    it('detects AWS keys', () => {
      const content = 'AKIA1234567890ABCDEF';
      const findings = detectPatterns(content);
      expect(findings.some(f => f.type.includes('aws'))).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('generates findings report', () => {
      const findings = [{ file: '.env', line: 1, secret: 'API_KEY=...', type: 'api_key' }];
      const report = generateReport(findings);
      expect(report).toContain('.env');
    });
  });

  describe('createSecretScanner', () => {
    it('creates scanner', () => {
      const scanner = createSecretScanner();
      expect(scanner.scan).toBeDefined();
      expect(scanner.scanHistory).toBeDefined();
    });

    it('supports custom patterns', () => {
      const scanner = createSecretScanner();
      scanner.addPattern({ name: 'custom', regex: /CUSTOM_[A-Z0-9]+/ });
      expect(scanner.getPatterns()).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'custom' })]));
    });

    it('excludes allowlisted patterns', () => {
      const scanner = createSecretScanner({ allowlist: ['test-key'] });
      const findings = scanner.scan({ content: 'API_KEY=test-key' });
      expect(findings).toHaveLength(0);
    });
  });
});
