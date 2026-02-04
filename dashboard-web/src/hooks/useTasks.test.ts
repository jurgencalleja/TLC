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
      const tasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'completed' },
      ];
      vi.mocked(api.tasks.getTasks).mockResolvedValueOnce(tasks);

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.fetchTasks();
      });

      expect(result.current.tasks).toHaveLength(2);
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
      const tasks = [{ id: '1', title: 'Task 1', status: 'pending' }];
      vi.mocked(api.tasks.getTasks).mockResolvedValueOnce(tasks);
      vi.mocked(api.tasks.updateTask).mockResolvedValueOnce({
        id: '1',
        title: 'Task 1',
        status: 'completed',
      });

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.fetchTasks();
        await result.current.updateTask('1', { status: 'completed' });
      });

      expect(result.current.tasks[0].status).toBe('completed');
    });
  });

  describe('deleteTask', () => {
    it('removes task from store', async () => {
      const tasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'pending' },
      ];
      vi.mocked(api.tasks.getTasks).mockResolvedValueOnce(tasks);
      vi.mocked(api.tasks.deleteTask).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.fetchTasks();
        await result.current.deleteTask('1');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('2');
    });
  });

  describe('filtering', () => {
    it('filters tasks by status', async () => {
      const tasks = [
        { id: '1', title: 'Task 1', status: 'pending' },
        { id: '2', title: 'Task 2', status: 'completed' },
      ];
      vi.mocked(api.tasks.getTasks).mockResolvedValueOnce(tasks);

      const { result } = renderHook(() => useTasks());

      await act(async () => {
        await result.current.fetchTasks();
        result.current.setFilter('status', 'pending');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].status).toBe('pending');
    });
  });
});
