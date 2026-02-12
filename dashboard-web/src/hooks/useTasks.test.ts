import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';
import { useTaskStore } from '../stores/task.store';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    tasks: {
      getTasks: vi.fn(),
      getTask: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    },
    projects: {
      getTasks: vi.fn(),
    },
  },
}));

describe('useTasks', () => {
  beforeEach(() => {
    useTaskStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTasks', () => {
    it('fetches and stores tasks', async () => {
      const rawTasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'done' },
      ];
      vi.mocked(api.projects.getTasks).mockResolvedValueOnce(rawTasks);

      const { result } = renderHook(() => useTasks('proj-1'));

      await act(async () => {
        await result.current.fetchTasks();
      });

      expect(result.current.tasks).toHaveLength(2);
      // Implementation maps 'done' -> 'completed' and adds priority/owner/subject
      expect(result.current.tasks[0]).toMatchObject({
        id: '1',
        title: 'Task 1',
        status: 'pending',
        priority: 'medium',
      });
      expect(result.current.tasks[1]).toMatchObject({
        id: '2',
        title: 'Task 2',
        status: 'completed',
        priority: 'medium',
      });
    });
  });

  describe('createTask', () => {
    it('creates and adds task to store', async () => {
      const newTask = { id: '3', title: 'New Task', status: 'pending' };
      vi.mocked(api.tasks.createTask).mockResolvedValueOnce(newTask);

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.createTask({ title: 'New Task' });
      });

      expect(result.current.tasks).toContainEqual(expect.objectContaining({ id: '3' }));
    });
  });

  describe('updateTask', () => {
    it('updates task in store', async () => {
      // Pre-populate store directly since fetchTasks requires projectId
      // but updateTask rejects when projectId is set (read-only mode)
      useTaskStore.getState().setTasks([
        { id: '1', title: 'Task 1', status: 'pending', priority: 'medium' },
      ]);
      vi.mocked(api.tasks.updateTask).mockResolvedValueOnce({
        id: '1',
        title: 'Task 1',
        status: 'completed',
      });

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.updateTask('1', { status: 'completed' });
      });

      expect(result.current.tasks[0].status).toBe('completed');
    });
  });

  describe('deleteTask', () => {
    it('removes task from store', async () => {
      // Pre-populate store directly since fetchTasks requires projectId
      // but deleteTask rejects when projectId is set (read-only mode)
      useTaskStore.getState().setTasks([
        { id: '1', title: 'Task 1', status: 'pending', priority: 'medium' },
        { id: '2', title: 'Task 2', status: 'pending', priority: 'medium' },
      ]);
      vi.mocked(api.tasks.deleteTask).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.deleteTask('1');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('2');
    });
  });

  describe('filtering', () => {
    it('filters tasks by status', async () => {
      const rawTasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'done' },
      ];
      vi.mocked(api.projects.getTasks).mockResolvedValueOnce(rawTasks);

      const { result } = renderHook(() => useTasks('proj-1'));

      await act(async () => {
        await result.current.fetchTasks();
      });

      await act(async () => {
        result.current.setFilter('status', 'pending');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].status).toBe('pending');
    });
  });
});
