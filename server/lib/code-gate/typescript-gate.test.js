/**
 * TypeScript Compilation Gate Tests
 *
 * Integrates tsc --noEmit as an optional push gate check.
 * Catches type errors that compile silently with esbuild/Vite.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  detectTypeScript,
  parseTscOutput,
  runTypeScriptGate,
  createTypeScriptGate,
} = require('./typescript-gate.js');

describe('TypeScript Gate', () => {
  describe('detectTypeScript', () => {
    it('returns true when tsconfig.json exists', () => {
      const mockFs = { existsSync: vi.fn().mockReturnValue(true) };
      expect(detectTypeScript('/project', { fs: mockFs })).toBe(true);
    });

    it('returns false when no tsconfig.json', () => {
      const mockFs = { existsSync: vi.fn().mockReturnValue(false) };
      expect(detectTypeScript('/project', { fs: mockFs })).toBe(false);
    });
  });

  describe('parseTscOutput', () => {
    it('parses single TS error into finding', () => {
      const output = 'src/api/users.ts(12,5): error TS2322: Type \'string\' is not assignable to type \'number\'.';
      const findings = parseTscOutput(output);
      expect(findings).toHaveLength(1);
      expect(findings[0].file).toBe('src/api/users.ts');
      expect(findings[0].line).toBe(12);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('typescript-error');
      expect(findings[0].message).toContain('TS2322');
    });

    it('handles zero-error output', () => {
      const findings = parseTscOutput('');
      expect(findings).toHaveLength(0);
    });

    it('parses multiple errors across files', () => {
      const output = [
        'src/api/users.ts(12,5): error TS2322: Type mismatch.',
        'src/api/leads.ts(45,10): error TS2345: Argument type error.',
        'src/lib/utils.ts(3,1): error TS7006: Parameter implicitly has any type.',
      ].join('\n');
      const findings = parseTscOutput(output);
      expect(findings).toHaveLength(3);
      expect(findings[0].file).toBe('src/api/users.ts');
      expect(findings[1].file).toBe('src/api/leads.ts');
      expect(findings[2].file).toBe('src/lib/utils.ts');
    });

    it('extracts error code from message', () => {
      const output = 'src/app.ts(1,1): error TS2304: Cannot find name \'foo\'.';
      const findings = parseTscOutput(output);
      expect(findings[0].message).toContain('TS2304');
      expect(findings[0].message).toContain('Cannot find name');
    });

    it('maps all TS errors to severity block', () => {
      const output = 'src/a.ts(1,1): error TS1234: Some error.';
      const findings = parseTscOutput(output);
      expect(findings[0].severity).toBe('block');
    });

    it('ignores non-error lines in output', () => {
      const output = [
        'Version 5.3.3',
        'src/app.ts(1,1): error TS2304: Missing.',
        '',
        'Found 1 error.',
      ].join('\n');
      const findings = parseTscOutput(output);
      expect(findings).toHaveLength(1);
    });
  });

  describe('runTypeScriptGate', () => {
    it('returns passed: true when no errors', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
      const result = await runTypeScriptGate('/project', { exec: mockExec });
      expect(result.passed).toBe(true);
      expect(result.findings).toHaveLength(0);
    });

    it('returns passed: false when errors found', async () => {
      const output = 'src/app.ts(1,1): error TS2304: Cannot find name.';
      const mockExec = vi.fn().mockResolvedValue({ stdout: output, stderr: '', exitCode: 2 });
      const result = await runTypeScriptGate('/project', { exec: mockExec });
      expect(result.passed).toBe(false);
      expect(result.findings).toHaveLength(1);
    });

    it('reports error count in summary', async () => {
      const output = [
        'src/a.ts(1,1): error TS1: err1.',
        'src/b.ts(2,2): error TS2: err2.',
      ].join('\n');
      const mockExec = vi.fn().mockResolvedValue({ stdout: output, stderr: '', exitCode: 2 });
      const result = await runTypeScriptGate('/project', { exec: mockExec });
      expect(result.summary.total).toBe(2);
      expect(result.summary.block).toBe(2);
    });

    it('skips gracefully when exec fails (tsc not installed)', async () => {
      const mockExec = vi.fn().mockRejectedValue(new Error('command not found: tsc'));
      const result = await runTypeScriptGate('/project', { exec: mockExec });
      expect(result.passed).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe('createTypeScriptGate', () => {
    it('creates gate with default options', () => {
      const gate = createTypeScriptGate();
      expect(gate).toBeDefined();
      expect(gate.enabled).toBe(true);
    });

    it('can be disabled via config', () => {
      const gate = createTypeScriptGate({ enabled: false });
      expect(gate.enabled).toBe(false);
    });
  });
});
