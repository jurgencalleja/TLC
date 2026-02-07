/**
 * Bypass Logger Tests
 *
 * Logs when someone uses --no-verify to bypass the gate.
 * Tracks bypass frequency per user.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  logBypass,
  readBypassHistory,
  getBypassRate,
  formatBypassReport,
} = require('./bypass-logger.js');

describe('Bypass Logger', () => {
  describe('logBypass', () => {
    it('appends bypass event to audit file', () => {
      let written = '';
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        appendFileSync: vi.fn((path, data) => { written = data; }),
      };

      logBypass({
        user: 'alice',
        commitHash: 'abc123',
        filesChanged: ['src/app.js'],
        hookType: 'pre-commit',
      }, { fs: mockFs });

      const parsed = JSON.parse(written.trim());
      expect(parsed.user).toBe('alice');
      expect(parsed.commitHash).toBe('abc123');
      expect(parsed.filesChanged).toEqual(['src/app.js']);
      expect(parsed.timestamp).toBeDefined();
    });

    it('creates audit directory if missing', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
        mkdirSync: vi.fn(),
        appendFileSync: vi.fn(),
      };

      logBypass({ user: 'bob', commitHash: 'def456', filesChanged: [] }, { fs: mockFs });
      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });

    it('writes to .tlc/audit/gate-bypasses.jsonl', () => {
      let writtenPath = '';
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        appendFileSync: vi.fn((path) => { writtenPath = path; }),
      };

      logBypass({ user: 'x', commitHash: 'y', filesChanged: [] }, { fs: mockFs });
      expect(writtenPath).toContain('gate-bypasses.jsonl');
    });
  });

  describe('readBypassHistory', () => {
    it('reads and parses JSONL file', () => {
      const lines = [
        JSON.stringify({ user: 'alice', timestamp: '2024-01-01T00:00:00Z', commitHash: 'a1' }),
        JSON.stringify({ user: 'bob', timestamp: '2024-01-02T00:00:00Z', commitHash: 'b2' }),
      ].join('\n');

      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(lines),
      };

      const history = readBypassHistory('/project', { fs: mockFs });
      expect(history).toHaveLength(2);
      expect(history[0].user).toBe('alice');
    });

    it('returns empty array when no file exists', () => {
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(false),
      };

      const history = readBypassHistory('/project', { fs: mockFs });
      expect(history).toEqual([]);
    });

    it('skips malformed lines', () => {
      const lines = [
        JSON.stringify({ user: 'alice', commitHash: 'a1' }),
        'not valid json',
        JSON.stringify({ user: 'bob', commitHash: 'b2' }),
      ].join('\n');

      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(lines),
      };

      const history = readBypassHistory('/project', { fs: mockFs });
      expect(history).toHaveLength(2);
    });
  });

  describe('getBypassRate', () => {
    it('calculates bypasses per user', () => {
      const history = [
        { user: 'alice', timestamp: '2024-01-01' },
        { user: 'alice', timestamp: '2024-01-02' },
        { user: 'bob', timestamp: '2024-01-03' },
      ];

      const rates = getBypassRate(history);
      expect(rates.alice).toBe(2);
      expect(rates.bob).toBe(1);
    });

    it('returns empty object for empty history', () => {
      const rates = getBypassRate([]);
      expect(Object.keys(rates)).toHaveLength(0);
    });
  });

  describe('formatBypassReport', () => {
    it('formats bypass history as readable report', () => {
      const history = [
        { user: 'alice', timestamp: '2024-01-01T00:00:00Z', commitHash: 'abc123', hookType: 'pre-commit' },
      ];

      const report = formatBypassReport(history);
      expect(report).toContain('alice');
      expect(report).toContain('abc123');
    });

    it('shows all-clear when no bypasses', () => {
      const report = formatBypassReport([]);
      expect(report).toContain('No bypasses');
    });
  });
});
