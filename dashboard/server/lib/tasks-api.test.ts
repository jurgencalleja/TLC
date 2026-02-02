import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTasks, Task } from './tasks-api.js';
import { vol } from 'memfs';

// Mock fs modules
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('tasks-api', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTasks', () => {
    it('returns empty array when no PLAN.md exists', async () => {
      // No .planning directory at all
      vol.fromJSON({});

      const tasks = await getTasks('/project');

      expect(tasks).toEqual([]);
    });

    it('returns empty array when phases directory is empty', async () => {
      vol.fromJSON({
        '/project/.planning/phases/.gitkeep': '',
      });

      const tasks = await getTasks('/project');

      expect(tasks).toEqual([]);
    });

    it('parses tasks from PLAN.md correctly', async () => {
      vol.fromJSON({
        '/project/.planning/phases/39-fix-api/39-PLAN.md': `# Phase 39: Fix API

### Task 1: Create tasks-api.js [ ]

Description here.

### Task 2: Add tests [ ]

More description.
`,
      });

      const tasks = await getTasks('/project');

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({
        id: '39-1',
        title: 'Create tasks-api.js',
        status: 'pending',
        owner: null,
        phase: 39,
      });
      expect(tasks[1]).toEqual({
        id: '39-2',
        title: 'Add tests',
        status: 'pending',
        owner: null,
        phase: 39,
      });
    });

    it('extracts status from markers', async () => {
      vol.fromJSON({
        '/project/.planning/phases/01-setup/01-PLAN.md': `# Phase 1: Setup

### Task 1: Pending task [ ]

### Task 2: In progress task [>]

### Task 3: Completed task [x]
`,
      });

      const tasks = await getTasks('/project');

      expect(tasks).toHaveLength(3);
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('in_progress');
      expect(tasks[2].status).toBe('completed');
    });

    it('extracts owner from @username', async () => {
      vol.fromJSON({
        '/project/.planning/phases/05-auth/05-PLAN.md': `# Phase 5: Auth

### Task 1: No owner [ ]

### Task 2: Has owner [>@alice]

### Task 3: Completed with owner [x@bob]
`,
      });

      const tasks = await getTasks('/project');

      expect(tasks).toHaveLength(3);
      expect(tasks[0].owner).toBeNull();
      expect(tasks[1].owner).toBe('alice');
      expect(tasks[2].owner).toBe('bob');
    });

    it('handles multiple phases (scans all *-PLAN.md files)', async () => {
      vol.fromJSON({
        '/project/.planning/phases/01-setup/01-PLAN.md': `# Phase 1: Setup

### Task 1: Init [ ]
`,
        '/project/.planning/phases/02-core/02-PLAN.md': `# Phase 2: Core

### Task 1: Build API [>@alice]

### Task 2: Add routes [x]
`,
        '/project/.planning/phases/03-testing/03-PLAN.md': `# Phase 3: Testing

### Task 1: Unit tests [ ]
`,
      });

      const tasks = await getTasks('/project');

      expect(tasks).toHaveLength(4);

      // Check that tasks from different phases have correct phase numbers
      const phase1Tasks = tasks.filter((t: Task) => t.phase === 1);
      const phase2Tasks = tasks.filter((t: Task) => t.phase === 2);
      const phase3Tasks = tasks.filter((t: Task) => t.phase === 3);

      expect(phase1Tasks).toHaveLength(1);
      expect(phase2Tasks).toHaveLength(2);
      expect(phase3Tasks).toHaveLength(1);

      // Verify task IDs include phase
      expect(tasks.map((t: Task) => t.id).sort()).toEqual(['1-1', '2-1', '2-2', '3-1']);
    });

    it('handles malformed PLAN.md gracefully', async () => {
      vol.fromJSON({
        '/project/.planning/phases/10-broken/10-PLAN.md': `# Some random content

Not a task at all

### Task without status marker

### Task 1: Valid task [ ]

### Task: Missing number [ ]

### Task 2 No colon [x]

Random text between

### Task 3: Another valid [>@dev]
`,
      });

      const tasks = await getTasks('/project');

      // Should only parse the valid tasks
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual({
        id: '10-1',
        title: 'Valid task',
        status: 'pending',
        owner: null,
        phase: 10,
      });
      expect(tasks[1]).toEqual({
        id: '10-3',
        title: 'Another valid',
        status: 'in_progress',
        owner: 'dev',
        phase: 10,
      });
    });

    it('handles tasks without explicit markers (defaults to pending)', async () => {
      vol.fromJSON({
        '/project/.planning/phases/07-feature/07-PLAN.md': `# Phase 7: Feature

### Task 1: Has marker [x]

### Task 2: No marker
`,
      });

      const tasks = await getTasks('/project');

      // Task 2 without marker should not be parsed as a task
      // Only properly formatted tasks with markers are valid
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Has marker');
    });

    it('handles empty PLAN.md files', async () => {
      vol.fromJSON({
        '/project/.planning/phases/99-empty/99-PLAN.md': '',
      });

      const tasks = await getTasks('/project');

      expect(tasks).toEqual([]);
    });

    it('ignores non-PLAN.md files in phases directory', async () => {
      vol.fromJSON({
        '/project/.planning/phases/01-setup/01-PLAN.md': `### Task 1: Real task [ ]`,
        '/project/.planning/phases/01-setup/01-SUMMARY.md': `### Task 1: Summary fake task [ ]`,
        '/project/.planning/phases/01-setup/notes.txt': `### Task 1: Notes fake task [ ]`,
      });

      const tasks = await getTasks('/project');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Real task');
    });

    it('sorts tasks by phase number then task number', async () => {
      vol.fromJSON({
        '/project/.planning/phases/10-later/10-PLAN.md': `### Task 2: Ten-Two [ ]
### Task 1: Ten-One [ ]`,
        '/project/.planning/phases/02-early/02-PLAN.md': `### Task 1: Two-One [ ]`,
      });

      const tasks = await getTasks('/project');

      expect(tasks.map((t: Task) => t.id)).toEqual(['2-1', '10-1', '10-2']);
    });
  });
});
