/**
 * @file plan-writer.test.js
 * @description Tests for the Plan Writer module (Phase 76, Task 5).
 *
 * Tests the factory function `createPlanWriter(deps)` which accepts injected
 * dependencies (fs) and returns functions for updating task status, content,
 * and creating new tasks in PLAN.md files.
 *
 * TDD: RED phase — these tests are written BEFORE the implementation.
 */
import { describe, it, expect, vi } from 'vitest';
import { createPlanWriter } from './plan-writer.js';

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
// Sample PLAN.md content
// ---------------------------------------------------------------------------

const SAMPLE_PLAN = `# Phase 5: User Dashboard - Plan

## Overview

Build the user dashboard.

## Tasks

### Task 1: Create layout component [ ]

**Goal:** Build the main layout

**Acceptance Criteria:**
- [ ] Has sidebar
- [ ] Has header
- [ ] Responsive on mobile

---

### Task 2: Implement data fetching [>@alice]

**Goal:** Fetch user data from API

**Acceptance Criteria:**
- [ ] Fetches on mount
- [ ] Shows loading state

---

### Task 3: Build stat cards [x@bob]

**Goal:** Display statistics

**Acceptance Criteria:**
- [x] Shows user count
- [x] Shows revenue

---

## Dependencies

Task 2 depends on Task 1.
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('plan-writer', () => {
  describe('updateTaskStatus', () => {
    it('changes [ ] to [>@alice] in heading', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskStatus('/project/PLAN.md', 1, 'in_progress', 'alice');

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 1: Create layout component [>@alice]');
      expect(updated).not.toContain('### Task 1: Create layout component [ ]');
    });

    it('changes [>@alice] to [x@alice] in heading', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskStatus('/project/PLAN.md', 2, 'done', 'alice');

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 2: Implement data fetching [x@alice]');
      expect(updated).not.toContain('[>@alice]');
    });

    it('changes [x@bob] back to [ ] (reset)', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskStatus('/project/PLAN.md', 3, 'pending', null);

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 3: Build stat cards [ ]');
    });

    it('preserves other tasks when updating one', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskStatus('/project/PLAN.md', 1, 'in_progress', 'alice');

      const updated = mockFs._store['/project/PLAN.md'];
      // Other tasks unchanged
      expect(updated).toContain('### Task 2: Implement data fetching [>@alice]');
      expect(updated).toContain('### Task 3: Build stat cards [x@bob]');
    });

    it('writes atomically (temp file + rename)', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskStatus('/project/PLAN.md', 1, 'in_progress', 'alice');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        'utf-8'
      );
      expect(mockFs.renameSync).toHaveBeenCalled();
    });

    it('throws for invalid task number', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      expect(() => {
        writer.updateTaskStatus('/project/PLAN.md', 99, 'done', 'alice');
      }).toThrow(/task.*99.*not found/i);
    });

    it('throws for nonexistent file', () => {
      const mockFs = createMockFs({});
      const writer = createPlanWriter({ fs: mockFs });

      expect(() => {
        writer.updateTaskStatus('/project/PLAN.md', 1, 'done', 'alice');
      }).toThrow();
    });
  });

  describe('updateTaskContent', () => {
    it('updates task title', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskContent('/project/PLAN.md', 1, {
        title: 'Create responsive layout',
      });

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 1: Create responsive layout [ ]');
      expect(updated).not.toContain('Create layout component');
    });

    it('updates acceptance criteria', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskContent('/project/PLAN.md', 1, {
        acceptanceCriteria: ['Has sidebar', 'Has header', 'Has footer', 'Responsive on mobile'],
      });

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('- [ ] Has footer');
      expect(updated).toContain('- [ ] Has sidebar');
    });

    it('preserves surrounding markdown structure', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.updateTaskContent('/project/PLAN.md', 1, {
        title: 'Updated title',
      });

      const updated = mockFs._store['/project/PLAN.md'];
      // Header and footer sections still present
      expect(updated).toContain('# Phase 5: User Dashboard - Plan');
      expect(updated).toContain('## Dependencies');
      expect(updated).toContain('Task 2 depends on Task 1.');
    });

    it('throws for invalid task number', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      expect(() => {
        writer.updateTaskContent('/project/PLAN.md', 99, { title: 'New' });
      }).toThrow(/task.*99.*not found/i);
    });
  });

  describe('createTask', () => {
    it('appends new task with correct format', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      const result = writer.createTask('/project/PLAN.md', {
        title: 'Add loading states',
        goal: 'Show loading spinners during data fetch',
        acceptanceCriteria: ['Spinner shown on mount', 'Spinner hidden after load'],
        testCases: ['Loading state renders spinner', 'Spinner disappears after data loads'],
      });

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 4: Add loading states [ ]');
      expect(updated).toContain('**Goal:** Show loading spinners during data fetch');
      expect(updated).toContain('- [ ] Spinner shown on mount');
      expect(updated).toContain('- Spinner disappears after data loads');
      expect(result.num).toBe(4);
    });

    it('generates next task number correctly', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      const result = writer.createTask('/project/PLAN.md', {
        title: 'New task',
        goal: 'Do something',
      });

      expect(result.num).toBe(4); // 3 existing tasks, so next is 4
    });

    it('creates task in empty plan', () => {
      const emptyPlan = `# Phase 1: Setup - Plan

## Overview

Initial setup.

## Tasks

## Dependencies

None.
`;
      const mockFs = createMockFs({ '/project/PLAN.md': emptyPlan });
      const writer = createPlanWriter({ fs: mockFs });

      const result = writer.createTask('/project/PLAN.md', {
        title: 'First task',
        goal: 'Get started',
      });

      const updated = mockFs._store['/project/PLAN.md'];
      expect(updated).toContain('### Task 1: First task [ ]');
      expect(result.num).toBe(1);
    });

    it('writes atomically', () => {
      const mockFs = createMockFs({ '/project/PLAN.md': SAMPLE_PLAN });
      const writer = createPlanWriter({ fs: mockFs });

      writer.createTask('/project/PLAN.md', {
        title: 'New task',
        goal: 'Do something',
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
