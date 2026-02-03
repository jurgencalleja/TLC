/**
 * Evidence Linker Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { createEvidenceLinker, linkEvidence, scanCodebase, generateEvidenceReport, validateEvidence } from './evidence-linker.js';

describe('evidence-linker', () => {
  describe('createEvidenceLinker', () => {
    it('creates evidence linker', () => {
      const linker = createEvidenceLinker();
      expect(linker.link).toBeDefined();
      expect(linker.scan).toBeDefined();
    });

    it('supports multiple evidence types', () => {
      const linker = createEvidenceLinker();
      const types = linker.getSupportedTypes();
      expect(types).toContain('code');
      expect(types).toContain('config');
      expect(types).toContain('test');
      expect(types).toContain('document');
    });
  });

  describe('linkEvidence', () => {
    it('links code to control', () => {
      const evidence = {
        controlId: 'pci-dss:req-3.4',
        type: 'code',
        file: 'src/encryption.js',
        lines: '10-25',
        description: 'AES-256 encryption implementation'
      };
      const result = linkEvidence(evidence);
      expect(result.linked).toBe(true);
      expect(result.evidenceId).toBeDefined();
    });

    it('links test to control', () => {
      const evidence = {
        controlId: 'iso27001:A.8.24',
        type: 'test',
        file: 'tests/encryption.test.js',
        description: 'Encryption tests'
      };
      const result = linkEvidence(evidence);
      expect(result.linked).toBe(true);
    });

    it('validates evidence completeness', () => {
      const evidence = { controlId: 'test' };
      const result = linkEvidence(evidence);
      expect(result.linked).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('scanCodebase', () => {
    it('scans codebase for evidence', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/auth.js', 'src/encryption.js']);
      const mockRead = vi.fn().mockResolvedValue('// @compliance pci-dss:req-8.1\nfunction authenticate() {}');

      const results = await scanCodebase({ glob: mockGlob, readFile: mockRead });
      expect(results.length).toBeGreaterThan(0);
    });

    it('identifies compliance annotations', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['test.js']);
      const mockRead = vi.fn().mockResolvedValue('// @control iso27001:A.5.15\n// @evidence access control implementation');

      const results = await scanCodebase({ glob: mockGlob, readFile: mockRead });
      expect(results[0].controlId).toBe('iso27001:A.5.15');
    });

    it('detects implicit evidence patterns', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/crypto.js']);
      const mockRead = vi.fn().mockResolvedValue('crypto.createCipheriv("aes-256-gcm", key, iv)');

      const results = await scanCodebase({ glob: mockGlob, readFile: mockRead, detectPatterns: true });
      expect(results.some(r => r.pattern === 'encryption')).toBe(true);
    });
  });

  describe('generateEvidenceReport', () => {
    it('generates evidence report for framework', () => {
      const evidence = [
        { controlId: 'req-1.1', type: 'code', file: 'firewall.js' },
        { controlId: 'req-3.4', type: 'test', file: 'encryption.test.js' }
      ];
      const report = generateEvidenceReport(evidence, { framework: 'pci-dss' });
      expect(report).toContain('Evidence Report');
      expect(report).toContain('req-1.1');
    });

    it('identifies controls without evidence', () => {
      const evidence = [{ controlId: 'req-1.1', type: 'code', file: 'test.js' }];
      const report = generateEvidenceReport(evidence, { framework: 'pci-dss', showGaps: true });
      expect(report).toContain('Missing Evidence');
    });
  });

  describe('validateEvidence', () => {
    it('validates evidence freshness', () => {
      const evidence = {
        controlId: 'test',
        file: 'test.js',
        lastModified: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      };
      const result = validateEvidence(evidence, { maxAge: 90 });
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('stale');
    });

    it('validates evidence file exists', async () => {
      const mockExists = vi.fn().mockResolvedValue(false);
      const evidence = { controlId: 'test', file: 'deleted.js' };
      const result = await validateEvidence(evidence, { checkExists: true, exists: mockExists });
      expect(result.valid).toBe(false);
    });
  });
});
