/**
 * Gate Configuration Tests
 *
 * Reads gate config from .tlc.json, supports rule enable/disable,
 * severity overrides, ignore patterns, and strictness levels.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  loadGateConfig,
  getDefaultGateConfig,
  mergeGateConfig,
  resolveRuleSeverity,
  shouldIgnoreFile,
  STRICTNESS,
} = require('./gate-config.js');

describe('Gate Configuration', () => {
  describe('STRICTNESS', () => {
    it('defines all strictness levels', () => {
      expect(STRICTNESS.RELAXED).toBe('relaxed');
      expect(STRICTNESS.STANDARD).toBe('standard');
      expect(STRICTNESS.STRICT).toBe('strict');
    });
  });

  describe('getDefaultGateConfig', () => {
    it('returns default config with strict mode', () => {
      const config = getDefaultGateConfig();
      expect(config.enabled).toBe(true);
      expect(config.strictness).toBe('strict');
      expect(config.preCommit).toBe(true);
      expect(config.prePush).toBe(true);
    });

    it('includes default ignore patterns', () => {
      const config = getDefaultGateConfig();
      expect(config.ignore).toContain('*.md');
      expect(config.ignore).toContain('*.json');
    });

    it('has empty rules override by default', () => {
      const config = getDefaultGateConfig();
      expect(config.rules).toEqual({});
    });
  });

  describe('loadGateConfig', () => {
    it('returns defaults when no .tlc.json exists', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
      };
      const config = loadGateConfig('/project', { fs: mockFs });
      expect(config.enabled).toBe(true);
      expect(config.strictness).toBe('strict');
    });

    it('reads gate section from .tlc.json', () => {
      const tlcJson = {
        gate: {
          enabled: true,
          strictness: 'standard',
          rules: { 'no-hardcoded-urls': 'warn' },
        },
      };
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify(tlcJson)),
      };
      const config = loadGateConfig('/project', { fs: mockFs });
      expect(config.strictness).toBe('standard');
      expect(config.rules['no-hardcoded-urls']).toBe('warn');
    });

    it('merges user config with defaults', () => {
      const tlcJson = {
        gate: {
          strictness: 'relaxed',
        },
      };
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify(tlcJson)),
      };
      const config = loadGateConfig('/project', { fs: mockFs });
      // User override
      expect(config.strictness).toBe('relaxed');
      // Defaults preserved
      expect(config.enabled).toBe(true);
      expect(config.preCommit).toBe(true);
    });

    it('handles malformed .tlc.json gracefully', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue('not valid json{{{'),
      };
      const config = loadGateConfig('/project', { fs: mockFs });
      expect(config.enabled).toBe(true);
      expect(config.strictness).toBe('strict');
    });

    it('handles missing gate section gracefully', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(JSON.stringify({ project: 'test' })),
      };
      const config = loadGateConfig('/project', { fs: mockFs });
      expect(config.strictness).toBe('strict');
    });
  });

  describe('mergeGateConfig', () => {
    it('overrides defaults with user values', () => {
      const defaults = getDefaultGateConfig();
      const userConfig = { strictness: 'relaxed', prePush: false };
      const merged = mergeGateConfig(defaults, userConfig);
      expect(merged.strictness).toBe('relaxed');
      expect(merged.prePush).toBe(false);
      expect(merged.preCommit).toBe(true);
    });

    it('merges rules as override map', () => {
      const defaults = getDefaultGateConfig();
      const userConfig = { rules: { 'no-eval': 'warn', 'no-hardcoded-urls': 'info' } };
      const merged = mergeGateConfig(defaults, userConfig);
      expect(merged.rules['no-eval']).toBe('warn');
      expect(merged.rules['no-hardcoded-urls']).toBe('info');
    });

    it('concatenates ignore arrays', () => {
      const defaults = getDefaultGateConfig();
      const userConfig = { ignore: ['migrations/*', 'generated/*'] };
      const merged = mergeGateConfig(defaults, userConfig);
      expect(merged.ignore).toContain('*.md');
      expect(merged.ignore).toContain('migrations/*');
      expect(merged.ignore).toContain('generated/*');
    });
  });

  describe('resolveRuleSeverity', () => {
    it('returns rule default when no override', () => {
      const config = getDefaultGateConfig();
      expect(resolveRuleSeverity('no-eval', 'block', config)).toBe('block');
    });

    it('returns override when configured', () => {
      const config = { ...getDefaultGateConfig(), rules: { 'no-eval': 'warn' } };
      expect(resolveRuleSeverity('no-eval', 'block', config)).toBe('warn');
    });

    it('disables rule when override is false', () => {
      const config = { ...getDefaultGateConfig(), rules: { 'no-eval': false } };
      expect(resolveRuleSeverity('no-eval', 'block', config)).toBe(false);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('ignores files matching patterns', () => {
      const config = { ignore: ['*.md', 'dist/*'] };
      expect(shouldIgnoreFile('README.md', config)).toBe(true);
      expect(shouldIgnoreFile('dist/bundle.js', config)).toBe(true);
    });

    it('does not ignore non-matching files', () => {
      const config = { ignore: ['*.md'] };
      expect(shouldIgnoreFile('src/app.js', config)).toBe(false);
    });

    it('handles empty ignore list', () => {
      const config = { ignore: [] };
      expect(shouldIgnoreFile('anything.js', config)).toBe(false);
    });

    it('matches nested glob patterns', () => {
      const config = { ignore: ['**/*.test.js'] };
      expect(shouldIgnoreFile('src/deep/file.test.js', config)).toBe(true);
      expect(shouldIgnoreFile('src/deep/file.js', config)).toBe(false);
    });
  });
});
