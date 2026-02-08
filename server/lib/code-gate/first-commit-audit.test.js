/**
 * First-Commit Audit Hook Tests
 *
 * Auto-runs architectural audit on first commit to catch
 * AI-generated code issues before they accumulate.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createFirstCommitAudit,
  hasFirstAuditRun,
  convertAuditToFindings,
  runFirstCommitAudit,
} = require('./first-commit-audit.js');

describe('First-Commit Audit Hook', () => {
  describe('hasFirstAuditRun', () => {
    it('returns false when no marker exists', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
      };
      const result = await hasFirstAuditRun('/project', { fs: mockFs });
      expect(result).toBe(false);
    });

    it('returns true when marker exists', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined),
      };
      const result = await hasFirstAuditRun('/project', { fs: mockFs });
      expect(result).toBe(true);
    });
  });

  describe('convertAuditToFindings', () => {
    it('converts audit issues to gate findings with severity warn', () => {
      const auditResults = {
        hardcodedUrls: {
          passed: false,
          issues: [
            { type: 'hardcoded-url', file: 'src/api.js', value: 'http://localhost:3000' },
          ],
        },
        flatFolders: {
          passed: false,
          issues: [
            { type: 'flat-folder', folder: 'services' },
          ],
        },
        summary: { totalIssues: 2, passed: false },
      };

      const findings = convertAuditToFindings(auditResults);
      expect(findings).toHaveLength(2);
      expect(findings[0].severity).toBe('warn');
      expect(findings[1].severity).toBe('warn');
    });

    it('returns correct severity for all findings', () => {
      const auditResults = {
        magicStrings: {
          passed: false,
          issues: [
            { type: 'magic-string', file: 'src/auth.js', value: 'admin' },
          ],
        },
        summary: { totalIssues: 1, passed: false },
      };

      const findings = convertAuditToFindings(auditResults);
      expect(findings.every(f => f.severity === 'warn')).toBe(true);
    });

    it('includes fix suggestions from audit', () => {
      const auditResults = {
        hardcodedUrls: {
          passed: false,
          issues: [
            { type: 'hardcoded-url', file: 'src/api.js', value: 'http://localhost:3000' },
          ],
        },
        summary: { totalIssues: 1, passed: false },
      };

      const findings = convertAuditToFindings(auditResults);
      expect(findings[0].fix).toBeDefined();
      expect(findings[0].fix.length).toBeGreaterThan(0);
    });

    it('returns empty array for clean audit', () => {
      const auditResults = {
        hardcodedUrls: { passed: true, issues: [] },
        flatFolders: { passed: true, issues: [] },
        summary: { totalIssues: 0, passed: true },
      };

      const findings = convertAuditToFindings(auditResults);
      expect(findings).toHaveLength(0);
    });

    it('handles multiple issues from same category', () => {
      const auditResults = {
        hardcodedUrls: {
          passed: false,
          issues: [
            { type: 'hardcoded-url', file: 'src/api.js', value: 'http://localhost:3000' },
            { type: 'hardcoded-url', file: 'src/config.js', value: 'http://localhost:5000' },
            { type: 'hardcoded-port', file: 'src/server.js', value: '8080' },
          ],
        },
        summary: { totalIssues: 3, passed: false },
      };

      const findings = convertAuditToFindings(auditResults);
      expect(findings).toHaveLength(3);
    });
  });

  describe('runFirstCommitAudit', () => {
    it('runs audit when no marker exists', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      };
      const mockAuditProject = vi.fn().mockResolvedValue({
        hardcodedUrls: { passed: true, issues: [] },
        summary: { totalIssues: 0, passed: true },
      });

      const result = await runFirstCommitAudit('/project', {
        fs: mockFs,
        auditProject: mockAuditProject,
      });

      expect(mockAuditProject).toHaveBeenCalledWith('/project', { fs: mockFs });
      expect(result.findings).toBeDefined();
    });

    it('skips audit when marker exists', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined),
      };
      const mockAuditProject = vi.fn();

      const result = await runFirstCommitAudit('/project', {
        fs: mockFs,
        auditProject: mockAuditProject,
      });

      expect(mockAuditProject).not.toHaveBeenCalled();
      expect(result.skipped).toBe(true);
    });

    it('creates marker after successful run', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      };
      const mockAuditProject = vi.fn().mockResolvedValue({
        summary: { totalIssues: 0, passed: true },
      });

      await runFirstCommitAudit('/project', {
        fs: mockFs,
        auditProject: mockAuditProject,
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('first-audit-done'),
        expect.any(String)
      );
    });

    it('respects enabled/disabled config', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
      };
      const mockAuditProject = vi.fn();

      const result = await runFirstCommitAudit('/project', {
        fs: mockFs,
        auditProject: mockAuditProject,
        config: { firstCommitAudit: false },
      });

      expect(mockAuditProject).not.toHaveBeenCalled();
      expect(result.skipped).toBe(true);
    });
  });

  describe('createFirstCommitAudit', () => {
    it('works with injectable dependencies', () => {
      const audit = createFirstCommitAudit({
        fs: {},
        auditProject: vi.fn(),
      });
      expect(audit).toBeDefined();
      expect(audit.run).toBeDefined();
    });
  });
});
