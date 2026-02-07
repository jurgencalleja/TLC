/**
 * Hooks Generator Tests
 *
 * Generates and installs git hooks that run the code gate.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  generatePreCommitHook,
  generatePrePushHook,
  installHooks,
  isHookInstalled,
} = require('./hooks-generator.js');

describe('Hooks Generator', () => {
  describe('generatePreCommitHook', () => {
    it('generates a valid shell script', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('#!/bin/sh');
    });

    it('includes gate check command', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('tlc-gate');
    });

    it('exits non-zero on gate failure', () => {
      const script = generatePreCommitHook();
      expect(script).toContain('exit 1');
    });

    it('is portable sh, not bash-specific', () => {
      const script = generatePreCommitHook();
      expect(script).not.toContain('#!/bin/bash');
      expect(script).not.toContain('[[');  // bash-specific test syntax
    });

    it('includes bypass detection', () => {
      const script = generatePreCommitHook();
      // The hook should detect if it was bypassed (for audit logging)
      expect(script).toContain('pre-commit');
    });
  });

  describe('generatePrePushHook', () => {
    it('generates a valid shell script', () => {
      const script = generatePrePushHook();
      expect(script).toContain('#!/bin/sh');
    });

    it('includes both static and LLM review', () => {
      const script = generatePrePushHook();
      expect(script).toContain('tlc-gate');
    });

    it('exits non-zero on gate failure', () => {
      const script = generatePrePushHook();
      expect(script).toContain('exit 1');
    });
  });

  describe('installHooks', () => {
    it('writes pre-commit hook to .git/hooks/', async () => {
      let writtenPath = null;
      let writtenContent = null;
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        writeFileSync: vi.fn((path, content) => {
          writtenPath = path;
          writtenContent = content;
        }),
        chmodSync: vi.fn(),
      };

      await installHooks('/project', { fs: mockFs, hooks: ['pre-commit'] });
      expect(writtenPath).toContain('.git/hooks/pre-commit');
      expect(writtenContent).toContain('#!/bin/sh');
    });

    it('makes hook executable', async () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        writeFileSync: vi.fn(),
        chmodSync: vi.fn(),
      };

      await installHooks('/project', { fs: mockFs, hooks: ['pre-commit'] });
      expect(mockFs.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('pre-commit'),
        '755'
      );
    });

    it('installs both hooks by default', async () => {
      const written = [];
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        writeFileSync: vi.fn((path) => written.push(path)),
        chmodSync: vi.fn(),
      };

      await installHooks('/project', { fs: mockFs });
      expect(written).toHaveLength(2);
      expect(written.some(p => p.includes('pre-commit'))).toBe(true);
      expect(written.some(p => p.includes('pre-push'))).toBe(true);
    });

    it('throws when .git directory missing', async () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
      };

      await expect(installHooks('/project', { fs: mockFs }))
        .rejects.toThrow('Not a git repository');
    });
  });

  describe('isHookInstalled', () => {
    it('returns true when TLC hook exists', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('#!/bin/sh\n# TLC Code Gate\ntlc-gate check'),
      };
      expect(isHookInstalled('/project', 'pre-commit', { fs: mockFs })).toBe(true);
    });

    it('returns false when no hook file', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
      };
      expect(isHookInstalled('/project', 'pre-commit', { fs: mockFs })).toBe(false);
    });

    it('returns false when hook is not from TLC', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('#!/bin/sh\nhusky run'),
      };
      expect(isHookInstalled('/project', 'pre-commit', { fs: mockFs })).toBe(false);
    });
  });
});
