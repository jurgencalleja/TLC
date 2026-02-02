import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectCLI,
  detectAllCLIs,
  clearCache,
  getCapabilities,
  CLI_TOOLS,
} from './cli-detector.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
}));

import { execSync } from 'child_process';

describe('cli-detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  describe('detectCLI', () => {
    it('finds claude when installed', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('which claude') || cmd.includes('where claude')) {
          return Buffer.from('/usr/local/bin/claude\n');
        }
        if (cmd.includes('--version')) {
          return Buffer.from('claude v4.2.1\n');
        }
        throw new Error('Command not found');
      });

      const result = await detectCLI('claude');

      expect(result).not.toBeNull();
      expect(result.name).toBe('claude');
      expect(result.path).toContain('claude');
    });

    it('returns null when CLI not installed', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = await detectCLI('claude');

      expect(result).toBeNull();
    });

    it('gets version string', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('which') || cmd.includes('where')) {
          return Buffer.from('/usr/local/bin/claude\n');
        }
        if (cmd.includes('--version')) {
          return Buffer.from('claude v4.2.1\n');
        }
        return Buffer.from('');
      });

      const result = await detectCLI('claude');

      expect(result.version).toBe('v4.2.1');
    });

    it('detects codex CLI', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('which codex') || cmd.includes('where codex')) {
          return Buffer.from('/usr/local/bin/codex\n');
        }
        if (cmd.includes('--version')) {
          return Buffer.from('codex 1.3.0\n');
        }
        throw new Error('not found');
      });

      const result = await detectCLI('codex');

      expect(result).not.toBeNull();
      expect(result.name).toBe('codex');
    });

    it('detects gemini CLI', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('which gemini') || cmd.includes('where gemini')) {
          return Buffer.from('/usr/local/bin/gemini\n');
        }
        if (cmd.includes('--version')) {
          return Buffer.from('gemini 0.9.2\n');
        }
        throw new Error('not found');
      });

      const result = await detectCLI('gemini');

      expect(result).not.toBeNull();
      expect(result.name).toBe('gemini');
    });
  });

  describe('detectAllCLIs', () => {
    it('returns map of detected CLIs', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('claude')) {
          if (cmd.includes('which') || cmd.includes('where')) {
            return Buffer.from('/usr/local/bin/claude\n');
          }
          return Buffer.from('v4.2.1\n');
        }
        throw new Error('not found');
      });

      const result = await detectAllCLIs();

      expect(result).toBeInstanceOf(Map);
      expect(result.has('claude')).toBe(true);
    });

    it('caches results', async () => {
      let callCount = 0;
      execSync.mockImplementation((cmd) => {
        callCount++;
        if (cmd.includes('which') || cmd.includes('where')) {
          return Buffer.from('/path/to/cli\n');
        }
        return Buffer.from('v1.0.0\n');
      });

      await detectAllCLIs();
      const initialCount = callCount;

      await detectAllCLIs();

      // Should not have called execSync again
      expect(callCount).toBe(initialCount);
    });
  });

  describe('clearCache', () => {
    it('forces re-detection', async () => {
      let callCount = 0;
      execSync.mockImplementation((cmd) => {
        callCount++;
        if (cmd.includes('which') || cmd.includes('where')) {
          return Buffer.from('/path/to/cli\n');
        }
        return Buffer.from('v1.0.0\n');
      });

      await detectAllCLIs();
      const countAfterFirst = callCount;

      clearCache();
      await detectAllCLIs();

      // Should have called again after cache clear
      expect(callCount).toBeGreaterThan(countAfterFirst);
    });
  });

  describe('getCapabilities', () => {
    it('returns CLI capabilities for claude', () => {
      const caps = getCapabilities('claude');

      expect(caps).toContain('review');
      expect(caps).toContain('code-gen');
      expect(caps).toContain('refactor');
    });

    it('returns CLI capabilities for codex', () => {
      const caps = getCapabilities('codex');

      expect(caps).toContain('review');
      expect(caps).toContain('code-gen');
    });

    it('returns CLI capabilities for gemini', () => {
      const caps = getCapabilities('gemini');

      expect(caps).toContain('design');
      expect(caps).toContain('vision');
      expect(caps).toContain('review');
    });

    it('returns empty array for unknown CLI', () => {
      const caps = getCapabilities('unknown');

      expect(caps).toEqual([]);
    });
  });

  describe('CLI_TOOLS', () => {
    it('exports claude tool config', () => {
      expect(CLI_TOOLS.claude).toBeDefined();
      expect(CLI_TOOLS.claude.command).toBe('claude');
    });

    it('exports codex tool config', () => {
      expect(CLI_TOOLS.codex).toBeDefined();
      expect(CLI_TOOLS.codex.command).toBe('codex');
    });

    it('exports gemini tool config', () => {
      expect(CLI_TOOLS.gemini).toBeDefined();
      expect(CLI_TOOLS.gemini.command).toBe('gemini');
    });

    it('includes headless args for each tool', () => {
      expect(CLI_TOOLS.claude.headlessArgs).toBeDefined();
      expect(CLI_TOOLS.codex.headlessArgs).toBeDefined();
      expect(CLI_TOOLS.gemini.headlessArgs).toBeDefined();
    });
  });

  describe('Windows compatibility', () => {
    it('handles Windows command extensions', async () => {
      // Simulate Windows where 'where' is used instead of 'which'
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('where')) {
          return Buffer.from('C:\\Program Files\\claude\\claude.exe\n');
        }
        return Buffer.from('v1.0.0\n');
      });

      const result = await detectCLI('claude');

      // Restore
      Object.defineProperty(process, 'platform', { value: originalPlatform });

      expect(result).not.toBeNull();
    });
  });

  describe('PATH variations', () => {
    it('handles CLI in non-standard paths', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('which') || cmd.includes('where')) {
          return Buffer.from('/opt/custom/bin/claude\n');
        }
        return Buffer.from('v4.0.0\n');
      });

      const result = await detectCLI('claude');

      expect(result.path).toBe('/opt/custom/bin/claude');
    });
  });

  describe('timeout handling', () => {
    it('handles slow detection with timeout', async () => {
      execSync.mockImplementation(() => {
        // Simulate timeout by throwing
        const error = new Error('Command timed out');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const result = await detectCLI('claude');

      expect(result).toBeNull();
    });
  });
});
