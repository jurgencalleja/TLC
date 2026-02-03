/**
 * Notes API Module Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { getNotes, updateNotes, getBugs, addBug, createNotesApi } from './notes-api.js';

describe('notes-api', () => {
  describe('getNotes', () => {
    it('returns PROJECT.md content', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('# Project\n\nDescription')
      };
      const notes = await getNotes({ fs: mockFs, basePath: '/test' });
      expect(notes.content).toContain('Project');
      expect(notes.type).toBe('project');
    });

    it('includes last modified time', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('content'),
        stat: vi.fn().mockResolvedValue({ mtime: new Date() })
      };
      const notes = await getNotes({ fs: mockFs, basePath: '/test' });
      expect(notes.lastModified).toBeDefined();
    });

    it('handles missing file', async () => {
      const mockFs = {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT'))
      };
      const notes = await getNotes({ fs: mockFs, basePath: '/test' });
      expect(notes.content).toBe('');
      expect(notes.exists).toBe(false);
    });
  });

  describe('updateNotes', () => {
    it('writes PROJECT.md content', async () => {
      const mockFs = {
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await updateNotes('# Updated', { fs: mockFs, basePath: '/test' });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('PROJECT.md'),
        '# Updated'
      );
    });

    it('creates backup before update', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('old content'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await updateNotes('new content', { fs: mockFs, basePath: '/test', backup: true });
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // backup + main
    });

    it('validates markdown format', async () => {
      const mockFs = { writeFile: vi.fn() };
      await expect(updateNotes('', { fs: mockFs, validate: true }))
        .rejects.toThrow(/empty/i);
    });
  });

  describe('getBugs', () => {
    it('returns BUGS.md content', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('## Bug 1\nDescription')
      };
      const bugs = await getBugs({ fs: mockFs, basePath: '/test' });
      expect(bugs.content).toContain('Bug 1');
    });

    it('parses bug entries', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(`
## Bug: Login fails
**Severity:** High
**Status:** Open

## Bug: Slow load
**Severity:** Low
**Status:** Fixed
`)
      };
      const bugs = await getBugs({ fs: mockFs, basePath: '/test', parse: true });
      expect(bugs.entries.length).toBe(2);
      expect(bugs.entries[0].title).toBe('Login fails');
      expect(bugs.entries[0].severity).toBe('High');
    });
  });

  describe('addBug', () => {
    it('appends bug to BUGS.md', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('# Bugs\n'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await addBug({
        title: 'New bug',
        description: 'Bug description',
        severity: 'High'
      }, { fs: mockFs, basePath: '/test' });
      const content = mockFs.writeFile.mock.calls[0][1];
      expect(content).toContain('New bug');
      expect(content).toContain('High');
    });

    it('validates required fields', async () => {
      await expect(addBug({ description: 'No title' }, {}))
        .rejects.toThrow(/title.*required/i);
    });

    it('adds timestamp', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(''),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await addBug({ title: 'Bug', severity: 'Low' }, { fs: mockFs, basePath: '/test' });
      const content = mockFs.writeFile.mock.calls[0][1];
      expect(content).toMatch(/\d{4}-\d{2}-\d{2}/); // date format
    });
  });

  describe('createNotesApi', () => {
    it('creates API handlers', () => {
      const api = createNotesApi({ basePath: '/test' });
      expect(api.getNotes).toBeDefined();
      expect(api.updateNotes).toBeDefined();
      expect(api.getBugs).toBeDefined();
      expect(api.addBug).toBeDefined();
    });
  });
});
