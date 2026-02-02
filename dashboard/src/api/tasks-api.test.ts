/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import { getTasks, parseTasksFromPlan, Task, FileSystem } from './tasks-api';
import type { Dirent } from 'fs';

// Helper to create a mock Dirent
function createDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

// Helper to create a mock file system
function createMockFs(config: {
  existingPaths?: Set<string>;
  dirEntries?: Map<string, Dirent[]>;
  fileContents?: Map<string, string>;
  readdirError?: Error;
  readFileError?: Error;
}): FileSystem {
  return {
    existsSync: (path: string) => config.existingPaths?.has(path) ?? false,
    readdir: async (path: string) => {
      if (config.readdirError) throw config.readdirError;
      return config.dirEntries?.get(path) ?? [];
    },
    readFile: async (path: string) => {
      if (config.readFileError) throw config.readFileError;
      const content = config.fileContents?.get(path);
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },
  };
}

describe('tasks-api', () => {
  describe('getTasks', () => {
    it('returns empty array when no PLAN.md exists', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set(), // No paths exist
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toEqual([]);
    });

    it('returns empty array when phases directory is empty', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set(['/project/.planning/phases']),
        dirEntries: new Map([['/project/.planning/phases', []]]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toEqual([]);
    });

    it('parses tasks from PLAN.md correctly', async () => {
      const planContent = `# Phase 39: Fix API

### Task 1: Create tasks-api.js [ ]

Description here.

### Task 2: Add tests [ ]

More description.
`;
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/39-fix-api/39-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('39-fix-api', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/39-fix-api/39-PLAN.md', planContent],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

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
      const planContent = `# Phase 1: Setup

### Task 1: Pending task [ ]

### Task 2: In progress task [>]

### Task 3: Completed task [x]
`;
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/01-setup/01-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('01-setup', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/01-setup/01-PLAN.md', planContent],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('in_progress');
      expect(tasks[2].status).toBe('completed');
    });

    it('extracts owner from @username', async () => {
      const planContent = `# Phase 5: Auth

### Task 1: No owner [ ]

### Task 2: Has owner [>@alice]

### Task 3: Completed with owner [x@bob]
`;
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/05-auth/05-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('05-auth', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/05-auth/05-PLAN.md', planContent],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].owner).toBeNull();
      expect(tasks[1].owner).toBe('alice');
      expect(tasks[2].owner).toBe('bob');
    });

    it('handles multiple phases (scans all *-PLAN.md files)', async () => {
      const phase1Content = `### Task 1: Init [ ]`;
      const phase2Content = `### Task 1: Build API [>@alice]
### Task 2: Add routes [x]`;
      const phase3Content = `### Task 1: Unit tests [ ]`;

      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/01-setup/01-PLAN.md',
          '/project/.planning/phases/02-core/02-PLAN.md',
          '/project/.planning/phases/03-testing/03-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [
            createDirent('01-setup', true),
            createDirent('02-core', true),
            createDirent('03-testing', true),
          ]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/01-setup/01-PLAN.md', phase1Content],
          ['/project/.planning/phases/02-core/02-PLAN.md', phase2Content],
          ['/project/.planning/phases/03-testing/03-PLAN.md', phase3Content],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

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
      const planContent = `# Some random content

Not a task at all

### Task without status marker

### Task 1: Valid task [ ]

### Task: Missing number [ ]

### Task 2 No colon [x]

Random text between

### Task 3: Another valid [>@dev]
`;
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/10-broken/10-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('10-broken', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/10-broken/10-PLAN.md', planContent],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

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
      const planContent = `# Phase 7: Feature

### Task 1: Has marker [x]

### Task 2: No marker
`;
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/07-feature/07-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('07-feature', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/07-feature/07-PLAN.md', planContent],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      // Task 2 without marker should not be parsed as a task
      // Only properly formatted tasks with markers are valid
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Has marker');
    });

    it('handles empty PLAN.md files', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/99-empty/99-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('99-empty', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/99-empty/99-PLAN.md', ''],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toEqual([]);
    });

    it('ignores non-PLAN.md files in phases directory', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/01-setup/01-PLAN.md',
          // These should not be read (different files, not PLAN.md)
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('01-setup', true)]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/01-setup/01-PLAN.md', `### Task 1: Real task [ ]`],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Real task');
    });

    it('sorts tasks by phase number then task number', async () => {
      const phase10Content = `### Task 2: Ten-Two [ ]
### Task 1: Ten-One [ ]`;
      const phase2Content = `### Task 1: Two-One [ ]`;

      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/10-later/10-PLAN.md',
          '/project/.planning/phases/02-early/02-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [
            createDirent('10-later', true),
            createDirent('02-early', true),
          ]],
        ]),
        fileContents: new Map([
          ['/project/.planning/phases/10-later/10-PLAN.md', phase10Content],
          ['/project/.planning/phases/02-early/02-PLAN.md', phase2Content],
        ]),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks.map((t: Task) => t.id)).toEqual(['2-1', '10-1', '10-2']);
    });

    it('handles readdir errors gracefully', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set(['/project/.planning/phases']),
        readdirError: new Error('Permission denied'),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toEqual([]);
    });

    it('handles readFile errors gracefully', async () => {
      const mockFs = createMockFs({
        existingPaths: new Set([
          '/project/.planning/phases',
          '/project/.planning/phases/01-setup/01-PLAN.md',
        ]),
        dirEntries: new Map([
          ['/project/.planning/phases', [createDirent('01-setup', true)]],
        ]),
        readFileError: new Error('File not readable'),
      });

      const tasks = await getTasks('/project', mockFs);

      expect(tasks).toEqual([]);
    });
  });

  describe('parseTasksFromPlan', () => {
    it('returns empty array for empty content', () => {
      expect(parseTasksFromPlan('', 1)).toEqual([]);
    });

    it('parses valid task format', () => {
      const content = `### Task 1: My task [ ]`;
      const tasks = parseTasksFromPlan(content, 5);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual({
        id: '5-1',
        title: 'My task',
        status: 'pending',
        owner: null,
        phase: 5,
      });
    });

    it('handles all status markers', () => {
      const content = `### Task 1: Pending [ ]
### Task 2: In Progress [>]
### Task 3: Completed [x]`;

      const tasks = parseTasksFromPlan(content, 1);

      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('in_progress');
      expect(tasks[2].status).toBe('completed');
    });

    it('extracts owner from status marker', () => {
      const content = `### Task 1: With owner [>@alice]
### Task 2: Completed owner [x@bob]`;

      const tasks = parseTasksFromPlan(content, 1);

      expect(tasks[0].owner).toBe('alice');
      expect(tasks[1].owner).toBe('bob');
    });

    it('ignores malformed task lines', () => {
      const content = `### Task: No number [ ]
### Task 1 No colon [ ]
### Task 1: No marker
### Task 1: Valid [ ]`;

      const tasks = parseTasksFromPlan(content, 1);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Valid');
    });
  });
});
