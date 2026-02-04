import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTaskStore, type Task } from './task.store';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1',
  title: 'Test Task',
  status: 'pending',
  priority: 'medium',
  assignee: null,
  phase: 62,
  description: 'Test description',
  acceptanceCriteria: [],
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('task.store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('has empty tasks array', () => {
      const { result } = renderHook(() => useTaskStore());
      expect(result.current.tasks).toEqual([]);
    });

    it('has null selected task', () => {
      const { result } = renderHook(() => useTaskStore());
      expect(result.current.selectedTask).toBeNull();
    });

    it('has default filters', () => {
      const { result } = renderHook(() => useTaskStore());
      expect(result.current.filters).toEqual({
        status: null,
        assignee: null,
        phase: null,
        priority: null,
      });
    });

    it('has loading false', () => {
      const { result } = renderHook(() => useTaskStore());
      expect(result.current.loading).toBe(false);
    });
  });

  describe('setTasks', () => {
    it('populates task list', () => {
      const { result } = renderHook(() => useTaskStore());
      const tasks = [createMockTask({ id: '1' }), createMockTask({ id: '2' })];

      act(() => {
        result.current.setTasks(tasks);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks[0].id).toBe('1');
    });

    it('clears loading when tasks are set', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setTasks([]);
      });

      expect(result.current.loading).toBe(false);
    });

    it('replaces existing tasks', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([createMockTask({ id: '1' })]);
        result.current.setTasks([createMockTask({ id: '2' })]);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('2');
    });
  });

  describe('addTask', () => {
    it('appends new task', () => {
      const { result } = renderHook(() => useTaskStore());
      const task = createMockTask({ id: 'new' });

      act(() => {
        result.current.setTasks([createMockTask({ id: '1' })]);
        result.current.addTask(task);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks[1].id).toBe('new');
    });
  });

  describe('updateTask', () => {
    it('modifies existing task', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([createMockTask({ id: '1', title: 'Original' })]);
        result.current.updateTask('1', { title: 'Updated' });
      });

      expect(result.current.tasks[0].title).toBe('Updated');
    });

    it('preserves other task properties', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([createMockTask({ id: '1', description: 'Keep this' })]);
        result.current.updateTask('1', { title: 'New Title' });
      });

      expect(result.current.tasks[0].description).toBe('Keep this');
    });

    it('does nothing for non-existent task', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([createMockTask({ id: '1' })]);
        result.current.updateTask('non-existent', { title: 'Updated' });
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('1');
    });

    it('updates selected task if it matches', () => {
      const { result } = renderHook(() => useTaskStore());
      const task = createMockTask({ id: '1', title: 'Original' });

      act(() => {
        result.current.setTasks([task]);
        result.current.selectTask(task);
        result.current.updateTask('1', { title: 'Updated' });
      });

      expect(result.current.selectedTask?.title).toBe('Updated');
    });
  });

  describe('removeTask', () => {
    it('removes task by id', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1' }),
          createMockTask({ id: '2' }),
        ]);
        result.current.removeTask('1');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('2');
    });

    it('clears selected task if removed', () => {
      const { result } = renderHook(() => useTaskStore());
      const task = createMockTask({ id: '1' });

      act(() => {
        result.current.setTasks([task]);
        result.current.selectTask(task);
        result.current.removeTask('1');
      });

      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe('selectTask', () => {
    it('sets selected task', () => {
      const { result } = renderHook(() => useTaskStore());
      const task = createMockTask({ id: '1' });

      act(() => {
        result.current.selectTask(task);
      });

      expect(result.current.selectedTask).toEqual(task);
    });

    it('clears selected task with null', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.selectTask(createMockTask());
        result.current.selectTask(null);
      });

      expect(result.current.selectedTask).toBeNull();
    });
  });

  describe('filters', () => {
    it('filters tasks by status', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', status: 'pending' }),
          createMockTask({ id: '2', status: 'in_progress' }),
          createMockTask({ id: '3', status: 'completed' }),
        ]);
        result.current.setFilter('status', 'pending');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].status).toBe('pending');
    });

    it('filters tasks by assignee', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', assignee: 'alice' }),
          createMockTask({ id: '2', assignee: 'bob' }),
          createMockTask({ id: '3', assignee: null }),
        ]);
        result.current.setFilter('assignee', 'alice');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].assignee).toBe('alice');
    });

    it('filters tasks by phase', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', phase: 61 }),
          createMockTask({ id: '2', phase: 62 }),
        ]);
        result.current.setFilter('phase', 62);
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].phase).toBe(62);
    });

    it('filters tasks by priority', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', priority: 'high' }),
          createMockTask({ id: '2', priority: 'low' }),
        ]);
        result.current.setFilter('priority', 'high');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].priority).toBe('high');
    });

    it('combines multiple filters', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', status: 'pending', assignee: 'alice' }),
          createMockTask({ id: '2', status: 'pending', assignee: 'bob' }),
          createMockTask({ id: '3', status: 'completed', assignee: 'alice' }),
        ]);
        result.current.setFilter('status', 'pending');
        result.current.setFilter('assignee', 'alice');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe('1');
    });

    it('clears filter with null', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', status: 'pending' }),
          createMockTask({ id: '2', status: 'completed' }),
        ]);
        result.current.setFilter('status', 'pending');
        result.current.setFilter('status', null);
      });

      expect(result.current.filteredTasks).toHaveLength(2);
    });

    it('clearFilters removes all filters', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setFilter('status', 'pending');
        result.current.setFilter('assignee', 'alice');
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({
        status: null,
        assignee: null,
        phase: null,
        priority: null,
      });
    });
  });

  describe('tasksByStatus', () => {
    it('groups tasks by status', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([
          createMockTask({ id: '1', status: 'pending' }),
          createMockTask({ id: '2', status: 'pending' }),
          createMockTask({ id: '3', status: 'in_progress' }),
          createMockTask({ id: '4', status: 'completed' }),
        ]);
      });

      expect(result.current.tasksByStatus.pending).toHaveLength(2);
      expect(result.current.tasksByStatus.in_progress).toHaveLength(1);
      expect(result.current.tasksByStatus.completed).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks([createMockTask()]);
        result.current.selectTask(createMockTask());
        result.current.setFilter('status', 'pending');
        result.current.reset();
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.selectedTask).toBeNull();
      expect(result.current.filters.status).toBeNull();
    });
  });
});
