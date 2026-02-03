/**
 * SAST Runner Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { runSemgrep, parseSemgrepOutput, filterBySeverity, generatePrComment, createSastRunner } from './sast-runner.js';

describe('sast-runner', () => {
  describe('runSemgrep', () => {
    it('runs Semgrep scan', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '{"results": []}' });
      const result = await runSemgrep({ path: './src', exec: mockExec });
      expect(result.results).toBeDefined();
    });
  });

  describe('parseSemgrepOutput', () => {
    it('parses Semgrep JSON output', () => {
      const output = { results: [{ check_id: 'xss', path: 'app.js', start: { line: 10 }, extra: { severity: 'ERROR' } }] };
      const parsed = parseSemgrepOutput(output);
      expect(parsed[0].ruleId).toBe('xss');
      expect(parsed[0].severity).toBe('error');
    });
  });

  describe('filterBySeverity', () => {
    it('filters by severity', () => {
      const findings = [{ severity: 'error' }, { severity: 'warning' }, { severity: 'info' }];
      const filtered = filterBySeverity(findings, 'error');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('generatePrComment', () => {
    it('generates PR comments', () => {
      const findings = [{ ruleId: 'xss', path: 'app.js', line: 10, message: 'XSS vulnerability' }];
      const comment = generatePrComment(findings);
      expect(comment).toContain('XSS');
      expect(comment).toContain('app.js');
    });
  });

  describe('createSastRunner', () => {
    it('creates runner', () => {
      const runner = createSastRunner();
      expect(runner.scan).toBeDefined();
      expect(runner.addRule).toBeDefined();
    });

    it('supports custom rules', () => {
      const runner = createSastRunner();
      runner.addRule({ id: 'custom-rule', pattern: 'eval($X)' });
      expect(runner.getRules()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'custom-rule' })]));
    });

    it('caches scan results', async () => {
      const runner = createSastRunner({ cache: true });
      const scan1 = await runner.scan({ path: './src', mockResults: [] });
      const scan2 = await runner.scan({ path: './src', mockResults: [] });
      expect(scan1).toEqual(scan2);
    });
  });
});
