/**
 * @file bug-writer.test.js
 * @description Tests for the Bug Writer module (Phase 76, Task 6).
 *
 * Tests the factory function `createBugWriter(deps)` which accepts injected
 * dependencies (fs) and returns functions for updating bug status and content
 * in BUGS.md files.
 *
 * TDD: RED phase — these tests are written BEFORE the implementation.
 */
import { describe, it, expect, vi } from 'vitest';
import { createBugWriter } from './bug-writer.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockFs(files = {}) {
  const store = { ...files };
  return {
    existsSync: vi.fn((p) => p in store),
    readFileSync: vi.fn((p) => {
      if (p in store) return store[p];
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }),
    writeFileSync: vi.fn((p, content) => {
      store[p] = content;
    }),
    renameSync: vi.fn((src, dest) => {
      if (src in store) {
        store[dest] = store[src];
        delete store[src];
      }
    }),
    mkdirSync: vi.fn(),
    _store: store,
  };
}

// ---------------------------------------------------------------------------
// Sample BUGS.md content
// ---------------------------------------------------------------------------

const SAMPLE_BUGS = `# Bugs

### BUG-001: Login page crashes on empty email [open]

**Severity:** high
**Reported:** 2026-02-10

Steps to reproduce:
1. Go to login page
2. Click submit without entering email
3. Page crashes with TypeError

---

### BUG-002: Dashboard loads slowly [fixed]

**Severity:** medium
**Reported:** 2026-02-08

The dashboard takes 5+ seconds to load.

---

### BUG-003: Sidebar menu overlaps content on mobile [open]

**Severity:** low
**Reported:** 2026-02-12

On iPhone 12 the sidebar pushes content off screen.

---
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bug-writer', () => {
  describe('updateBugStatus', () => {
    it('changes [open] to [fixed] in heading', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugStatus('/project/BUGS.md', 'BUG-001', 'fixed');

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-001: Login page crashes on empty email [fixed]');
      expect(updated).not.toContain('BUG-001: Login page crashes on empty email [open]');
    });

    it('changes [open] to [closed]', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugStatus('/project/BUGS.md', 'BUG-003', 'closed');

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-003: Sidebar menu overlaps content on mobile [closed]');
    });

    it('changes [fixed] to [open] (reopen)', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugStatus('/project/BUGS.md', 'BUG-002', 'open');

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-002: Dashboard loads slowly [open]');
    });

    it('preserves other bugs when updating one', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugStatus('/project/BUGS.md', 'BUG-001', 'fixed');

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-002: Dashboard loads slowly [fixed]');
      expect(updated).toContain('### BUG-003: Sidebar menu overlaps content on mobile [open]');
    });

    it('writes atomically (temp file + rename)', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugStatus('/project/BUGS.md', 'BUG-001', 'fixed');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('throws for invalid bug ID', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      expect(() => {
        writer.updateBugStatus('/project/BUGS.md', 'BUG-999', 'fixed');
      }).toThrow(/bug.*BUG-999.*not found/i);
    });
  });

  describe('updateBugContent', () => {
    it('updates bug title', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugContent('/project/BUGS.md', 'BUG-001', {
        title: 'Login crashes on empty form submission',
      });

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-001: Login crashes on empty form submission [open]');
    });

    it('updates severity line', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugContent('/project/BUGS.md', 'BUG-001', {
        severity: 'critical',
      });

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('**Severity:** critical');
      // Verify the old severity is replaced, not duplicated
      expect(updated.match(/\*\*Severity:\*\*/g)?.length).toBe(3); // 3 bugs, each has severity
    });

    it('updates description', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.updateBugContent('/project/BUGS.md', 'BUG-002', {
        description: 'Dashboard API calls take too long due to N+1 queries.',
      });

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('Dashboard API calls take too long due to N+1 queries.');
    });

    it('throws for invalid bug ID', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      expect(() => {
        writer.updateBugContent('/project/BUGS.md', 'BUG-999', { title: 'New' });
      }).toThrow(/bug.*BUG-999.*not found/i);
    });
  });

  describe('createBug', () => {
    it('appends new bug with correct format', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      const result = writer.createBug('/project/BUGS.md', {
        title: 'Button color wrong on hover',
        severity: 'low',
        description: 'The primary button turns grey instead of blue on hover.',
        url: 'http://localhost:3000/settings',
      });

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-004: Button color wrong on hover [open]');
      expect(updated).toContain('**Severity:** low');
      expect(updated).toContain('**URL:** http://localhost:3000/settings');
      expect(updated).toContain('The primary button turns grey instead of blue on hover.');
      expect(result.id).toBe('BUG-004');
    });

    it('generates next bug ID correctly', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      const result = writer.createBug('/project/BUGS.md', {
        title: 'New bug',
        severity: 'medium',
        description: 'Something is wrong.',
      });

      expect(result.id).toBe('BUG-004');
    });

    it('creates bug in empty BUGS.md', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': '# Bugs\n' });
      const writer = createBugWriter({ fs: mockFs });

      const result = writer.createBug('/project/BUGS.md', {
        title: 'First bug',
        severity: 'high',
        description: 'The first reported bug.',
      });

      const updated = mockFs._store['/project/BUGS.md'];
      expect(updated).toContain('### BUG-001: First bug [open]');
      expect(result.id).toBe('BUG-001');
    });

    it('creates BUGS.md if it does not exist', () => {
      const mockFs = createMockFs({});
      const writer = createBugWriter({ fs: mockFs });

      const result = writer.createBug('/project/BUGS.md', {
        title: 'First bug ever',
        severity: 'medium',
        description: 'No BUGS.md existed.',
      });

      expect(mockFs._store['/project/BUGS.md']).toBeDefined();
      expect(mockFs._store['/project/BUGS.md']).toContain('### BUG-001: First bug ever [open]');
      expect(result.id).toBe('BUG-001');
    });

    it('writes atomically', () => {
      const mockFs = createMockFs({ '/project/BUGS.md': SAMPLE_BUGS });
      const writer = createBugWriter({ fs: mockFs });

      writer.createBug('/project/BUGS.md', {
        title: 'New bug',
        severity: 'low',
        description: 'desc',
      });

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
      expect(mockFs.renameSync).toHaveBeenCalled();
    });
  });
});
