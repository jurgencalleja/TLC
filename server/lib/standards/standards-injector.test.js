/**
 * Standards Injector Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  injectStandards,
  reportResults,
  hasClaudeSection,
  appendClaudeSection,
  loadTemplate
} from './standards-injector.js';

describe('standards-injector', () => {
  describe('loadTemplate', () => {
    it('loads CLAUDE.md template', async () => {
      const template = await loadTemplate('CLAUDE.md');
      expect(template).toContain('CODING-STANDARDS.md');
      expect(template).toContain('code quality');
    });

    it('loads CODING-STANDARDS.md template', async () => {
      const template = await loadTemplate('CODING-STANDARDS.md');
      expect(template).toContain('Module Structure');
      expect(template).toContain('entity');
    });

    it('throws on unknown template', async () => {
      await expect(loadTemplate('UNKNOWN.md')).rejects.toThrow();
    });
  });

  describe('hasClaudeSection', () => {
    it('returns true when TLC section exists', () => {
      const content = '# Project\n\n## TLC Standards\nSome content';
      expect(hasClaudeSection(content)).toBe(true);
    });

    it('returns false when no TLC section', () => {
      const content = '# Project\n\nSome other content';
      expect(hasClaudeSection(content)).toBe(false);
    });

    it('detects various TLC markers', () => {
      expect(hasClaudeSection('<!-- TLC-STANDARDS -->')).toBe(true);
      expect(hasClaudeSection('## TLC Coding Standards')).toBe(true);
      expect(hasClaudeSection('## Code Quality (TLC)')).toBe(true);
    });
  });

  describe('appendClaudeSection', () => {
    it('appends TLC section to existing content', () => {
      const existing = '# My Project\n\nExisting content.';
      const result = appendClaudeSection(existing);
      expect(result).toContain('# My Project');
      expect(result).toContain('Existing content');
      expect(result).toContain('TLC');
      expect(result).toContain('CODING-STANDARDS.md');
    });

    it('preserves existing content', () => {
      const existing = '# Project\n\n## Custom Section\n\nMy rules here.';
      const result = appendClaudeSection(existing);
      expect(result).toContain('## Custom Section');
      expect(result).toContain('My rules here');
    });
  });

  describe('injectStandards', () => {
    it('creates both files in empty project', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/test/project', { fs: mockFs });

      expect(results.claudeMd).toBe('created');
      expect(results.codingStandards).toBe('created');
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('appends to existing CLAUDE.md without TLC section', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('CLAUDE.md')) {
            return Promise.resolve('# Existing Project\n\nSome content.');
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/test/project', { fs: mockFs });

      expect(results.claudeMd).toBe('appended');
      const writeCall = mockFs.writeFile.mock.calls.find(c => c[0].includes('CLAUDE.md'));
      expect(writeCall[1]).toContain('# Existing Project');
      expect(writeCall[1]).toContain('TLC');
    });

    it('skips CLAUDE.md that already has TLC section', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('CLAUDE.md')) {
            return Promise.resolve('# Project\n\n## TLC Standards\n\nAlready configured.');
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/test/project', { fs: mockFs });

      expect(results.claudeMd).toBe('skipped');
    });

    it('skips existing CODING-STANDARDS.md', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockImplementation((path) => {
          if (path.includes('CODING-STANDARDS.md')) {
            return Promise.resolve('# Existing Standards');
          }
          if (path.includes('CLAUDE.md')) {
            return Promise.resolve('# Project\n\n## TLC Standards');
          }
          return Promise.reject(new Error('ENOENT'));
        }),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/test/project', { fs: mockFs });

      expect(results.codingStandards).toBe('skipped');
    });

    it('reports correct actions taken', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/test/project', { fs: mockFs });

      expect(results).toHaveProperty('claudeMd');
      expect(results).toHaveProperty('codingStandards');
      expect(results).toHaveProperty('projectPath');
      expect(['created', 'appended', 'skipped']).toContain(results.claudeMd);
      expect(['created', 'skipped']).toContain(results.codingStandards);
    });

    it('handles missing project directory', async () => {
      const mockFs = {
        access: vi.fn().mockRejectedValue(new Error('ENOENT')),
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
        writeFile: vi.fn().mockRejectedValue(new Error('ENOENT: no such directory')),
        mkdir: vi.fn().mockResolvedValue(undefined)
      };

      const results = await injectStandards('/nonexistent/path', { fs: mockFs });

      expect(results.error).toBeDefined();
    });
  });

  describe('reportResults', () => {
    it('logs created files', () => {
      const mockLogger = { log: vi.fn(), warn: vi.fn() };
      const results = {
        claudeMd: 'created',
        codingStandards: 'created',
        projectPath: '/test'
      };

      reportResults(results, { logger: mockLogger });

      expect(mockLogger.log).toHaveBeenCalled();
      const output = mockLogger.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('CLAUDE.md');
      expect(output).toContain('created');
    });

    it('logs appended files', () => {
      const mockLogger = { log: vi.fn(), warn: vi.fn() };
      const results = {
        claudeMd: 'appended',
        codingStandards: 'skipped',
        projectPath: '/test'
      };

      reportResults(results, { logger: mockLogger });

      const output = mockLogger.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('appended');
    });

    it('logs skipped files', () => {
      const mockLogger = { log: vi.fn(), warn: vi.fn() };
      const results = {
        claudeMd: 'skipped',
        codingStandards: 'skipped',
        projectPath: '/test'
      };

      reportResults(results, { logger: mockLogger });

      const output = mockLogger.log.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('skipped');
    });

    it('logs errors', () => {
      const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const results = {
        error: 'Failed to write files',
        projectPath: '/test'
      };

      reportResults(results, { logger: mockLogger });

      expect(mockLogger.error || mockLogger.warn).toHaveBeenCalled();
    });
  });
});
