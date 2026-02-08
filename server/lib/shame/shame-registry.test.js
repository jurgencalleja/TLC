/**
 * Wall of Shame Registry Tests
 *
 * Document bugs with root causes, creating a project-level learning registry.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  createShameRegistry,
  addEntry,
  loadEntries,
  saveEntries,
  categorizeEntry,
  generateReport,
  suggestGateRules,
  trackRecurrence,
  SHAME_CATEGORIES,
} = require('./shame-registry.js');

describe('Wall of Shame Registry', () => {
  describe('addEntry', () => {
    it('adds shame entry with all fields', () => {
      const entries = [];
      const entry = addEntry(entries, {
        title: 'API returns 500 on empty body',
        rootCause: 'No input validation on POST handler',
        category: 'architecture',
        fix: 'Added Zod schema validation middleware',
        lesson: 'Always validate input at API boundaries',
      });

      expect(entry.title).toBe('API returns 500 on empty body');
      expect(entry.rootCause).toBeDefined();
      expect(entry.category).toBe('architecture');
      expect(entry.fix).toBeDefined();
      expect(entry.lesson).toBeDefined();
    });

    it('entry includes timestamp and ID', () => {
      const entries = [];
      const entry = addEntry(entries, {
        title: 'Test bug',
        rootCause: 'Reason',
        category: 'type-safety',
        fix: 'Fixed it',
        lesson: 'Learned something',
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.id).toBe('string');
    });
  });

  describe('loadEntries', () => {
    it('loads entries from file', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(JSON.stringify([
          { id: '1', title: 'Bug A', category: 'architecture' },
          { id: '2', title: 'Bug B', category: 'security' },
        ])),
      };

      const entries = await loadEntries('/project', { fs: mockFs });
      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('Bug A');
    });

    it('handles empty registry', async () => {
      const mockFs = {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      };

      const entries = await loadEntries('/project', { fs: mockFs });
      expect(entries).toHaveLength(0);
    });

    it('handles malformed file gracefully', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('not json {{{'),
      };

      const entries = await loadEntries('/project', { fs: mockFs });
      expect(entries).toHaveLength(0);
    });
  });

  describe('saveEntries', () => {
    it('saves entries to file', async () => {
      const mockFs = {
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      };

      const entries = [
        { id: '1', title: 'Bug', category: 'architecture' },
      ];

      await saveEntries('/project', entries, { fs: mockFs });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('shame.json'),
        expect.any(String)
      );
    });
  });

  describe('categorizeEntry', () => {
    it('categorizes entries correctly', () => {
      expect(SHAME_CATEGORIES).toContain('architecture');
      expect(SHAME_CATEGORIES).toContain('type-safety');
      expect(SHAME_CATEGORIES).toContain('duplication');
      expect(SHAME_CATEGORIES).toContain('docker');
      expect(SHAME_CATEGORIES).toContain('security');
      expect(SHAME_CATEGORIES).toContain('data-loss');
    });

    it('validates category is in allowed list', () => {
      const result = categorizeEntry('architecture');
      expect(result.valid).toBe(true);

      const invalid = categorizeEntry('invalid-category');
      expect(invalid.valid).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('generates markdown report', () => {
      const entries = [
        { id: '1', title: 'Bug A', rootCause: 'Cause A', category: 'architecture', fix: 'Fix A', lesson: 'Lesson A', timestamp: '2024-01-01' },
        { id: '2', title: 'Bug B', rootCause: 'Cause B', category: 'security', fix: 'Fix B', lesson: 'Lesson B', timestamp: '2024-01-02' },
      ];

      const report = generateReport(entries);
      expect(report).toContain('Bug A');
      expect(report).toContain('Bug B');
      expect(report).toContain('architecture');
      expect(report).toContain('security');
    });

    it('report groups by category', () => {
      const entries = [
        { id: '1', title: 'Bug A', category: 'architecture', rootCause: 'r', fix: 'f', lesson: 'l', timestamp: '2024-01-01' },
        { id: '2', title: 'Bug B', category: 'architecture', rootCause: 'r', fix: 'f', lesson: 'l', timestamp: '2024-01-02' },
        { id: '3', title: 'Bug C', category: 'security', rootCause: 'r', fix: 'f', lesson: 'l', timestamp: '2024-01-03' },
      ];

      const report = generateReport(entries);
      // architecture section should come before its entries
      const archIndex = report.indexOf('architecture');
      const bugAIndex = report.indexOf('Bug A');
      const secIndex = report.indexOf('security');
      expect(archIndex).toBeLessThan(bugAIndex);
      expect(archIndex).toBeLessThan(secIndex);
    });
  });

  describe('suggestGateRules', () => {
    it('suggests gate rules for architecture category', () => {
      const rules = suggestGateRules('architecture');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toMatchObject({
        rule: expect.any(String),
        description: expect.any(String),
      });
    });

    it('suggests gate rules for type-safety category', () => {
      const rules = suggestGateRules('type-safety');
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('trackRecurrence', () => {
    it('tracks recurrence count per category', () => {
      const entries = [
        { id: '1', category: 'architecture' },
        { id: '2', category: 'architecture' },
        { id: '3', category: 'security' },
        { id: '4', category: 'architecture' },
      ];

      const recurrence = trackRecurrence(entries);
      expect(recurrence.architecture).toBe(3);
      expect(recurrence.security).toBe(1);
    });
  });

  describe('createShameRegistry', () => {
    it('creates registry with injectable dependencies', () => {
      const registry = createShameRegistry({
        fs: { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() },
      });

      expect(registry).toBeDefined();
      expect(registry.add).toBeDefined();
      expect(registry.load).toBeDefined();
      expect(registry.save).toBeDefined();
      expect(registry.report).toBeDefined();
    });
  });
});
