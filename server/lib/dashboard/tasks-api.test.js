/**
 * Tasks API Module Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { getTasks, createTask, updateTask, deleteTask, parseTasksFromPlan, formatTaskForApi, createTasksApi } from './tasks-api.js';

describe('tasks-api', () => {
  describe('getTasks', () => {
    it('returns tasks from current phase', async () => {
      const mockIntrospection = {
        getCurrentPhase: vi.fn().mockReturnValue({ number: 1 })
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue(`
### Task 1: Test task [ ]
**Goal:** Do something
### Task 2: Done task [x]
**Goal:** Did something
`)
      };
      const tasks = await getTasks({ introspection: mockIntrospection, fs: mockFs });
      expect(tasks.length).toBe(2);
      expect(tasks[0].subject).toBe('Test task');
      expect(tasks[0].status).toBe('pending');
      expect(tasks[1].status).toBe('completed');
    });

    it('returns flat array format', async () => {
      const mockIntrospection = {
        getCurrentPhase: vi.fn().mockReturnValue({ number: 1 })
      };
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('### Task 1: Test [ ]')
      };
      const tasks = await getTasks({ introspection: mockIntrospection, fs: mockFs });
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks[0].id).toBeDefined();
    });
  });

  describe('createTask', () => {
    it('creates task with required fields', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('## Tasks\n'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      const task = await createTask({
        subject: 'New task',
        description: 'Task description',
        phase: 1
      }, { fs: mockFs });
      expect(task.id).toBeDefined();
      expect(task.subject).toBe('New task');
      expect(task.status).toBe('pending');
    });

    it('validates required fields', async () => {
      await expect(createTask({ description: 'No subject' }, {}))
        .rejects.toThrow(/subject.*required/i);
    });

    it('appends to PLAN.md', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('## Tasks\n'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await createTask({ subject: 'Test', phase: 1 }, { fs: mockFs });
      expect(mockFs.writeFile).toHaveBeenCalled();
      const content = mockFs.writeFile.mock.calls[0][1];
      expect(content).toContain('Test');
    });
  });

  describe('updateTask', () => {
    it('updates task status', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('### Task 1: Test [ ]'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      const task = await updateTask('task-1', { status: 'completed' }, { fs: mockFs });
      expect(task.status).toBe('completed');
    });

    it('updates task subject', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('### Task 1: Test [ ]'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      const task = await updateTask('task-1', { subject: 'Updated' }, { fs: mockFs });
      expect(task.subject).toBe('Updated');
    });

    it('throws for non-existent task', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('### Task 1: Test [ ]')
      };
      await expect(updateTask('task-99', {}, { fs: mockFs }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deleteTask', () => {
    it('removes task from plan', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('### Task 1: Test [ ]\n### Task 2: Keep [ ]'),
        writeFile: vi.fn().mockResolvedValue(undefined)
      };
      await deleteTask('task-1', { fs: mockFs });
      const content = mockFs.writeFile.mock.calls[0][1];
      expect(content).not.toContain('Task 1');
      expect(content).toContain('Task 2');
    });
  });

  describe('parseTasksFromPlan', () => {
    it('parses task format', () => {
      const content = `
### Task 1: First task [ ]
**Goal:** Do first thing
### Task 2: Second task [x@alice]
**Goal:** Do second thing
`;
      const tasks = parseTasksFromPlan(content);
      expect(tasks.length).toBe(2);
      expect(tasks[0].subject).toBe('First task');
      expect(tasks[1].owner).toBe('alice');
    });

    it('handles in-progress marker', () => {
      const content = '### Task 1: Working [>@bob]';
      const tasks = parseTasksFromPlan(content);
      expect(tasks[0].status).toBe('in_progress');
      expect(tasks[0].owner).toBe('bob');
    });
  });

  describe('formatTaskForApi', () => {
    it('formats task with all fields', () => {
      const task = {
        number: 1,
        subject: 'Test',
        status: 'pending',
        goal: 'Do something',
        owner: null
      };
      const formatted = formatTaskForApi(task, 5);
      expect(formatted.id).toBe('phase-5-task-1');
      expect(formatted.phase).toBe(5);
    });
  });

  describe('createTasksApi', () => {
    it('creates API handlers', () => {
      const api = createTasksApi({ basePath: '/test' });
      expect(api.get).toBeDefined();
      expect(api.post).toBeDefined();
      expect(api.patch).toBeDefined();
      expect(api.delete).toBeDefined();
    });
  });
});
