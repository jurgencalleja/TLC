import { useCallback } from 'react';
import { useTaskStore, type Task } from '../stores/task.store';
import { api } from '../api';

export function useTasks(projectId?: string) {
  const {
    tasks,
    selectedTask,
    filters,
    loading,
    filteredTasks,
    tasksByStatus,
    setTasks,
    addTask,
    updateTask: storeUpdateTask,
    removeTask,
    selectTask,
    setFilter,
    clearFilters,
    setLoading,
  } = useTaskStore();

  const isReadOnly = Boolean(projectId);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (!projectId) {
        setTasks([]);
        return;
      }
      const raw = await api.projects.getTasks(projectId);
      const projectTasks = Array.isArray(raw) ? raw : [];
      const data: Task[] = projectTasks.map((t) => ({
        id: String(t.num ?? t.number ?? t.id ?? ''),
        title: t.title ?? t.subject ?? 'Untitled',
        subject: t.title ?? t.subject ?? 'Untitled',
        status: t.status === 'done' ? 'completed' : t.status ?? 'pending',
        owner: t.owner ?? null,
        priority: 'medium',
      }));
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setTasks([]);
    }
  }, [projectId, setLoading, setTasks]);

  const createTask = useCallback(
    async (taskData: Partial<Task>) => {
      if (projectId) {
        const err = new Error('Tasks are read-only in workspace mode.');
        console.warn(err.message);
        return Promise.reject(err);
      }
      try {
        const created = await api.tasks.createTask(taskData);
        addTask(created);
        return created;
      } catch (err) {
        console.error('Failed to create task:', err);
        throw err;
      }
    },
    [addTask, projectId]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (projectId) {
        const err = new Error('Tasks are read-only in workspace mode.');
        console.warn(err.message);
        return Promise.reject(err);
      }
      try {
        const updated = await api.tasks.updateTask(id, updates);
        storeUpdateTask(id, updated);
        return updated;
      } catch (err) {
        console.error('Failed to update task:', err);
        throw err;
      }
    },
    [storeUpdateTask, projectId]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (projectId) {
        const err = new Error('Tasks are read-only in workspace mode.');
        console.warn(err.message);
        return Promise.reject(err);
      }
      try {
        await api.tasks.deleteTask(id);
        removeTask(id);
      } catch (err) {
        console.error('Failed to delete task:', err);
        throw err;
      }
    },
    [removeTask, projectId]
  );

  return {
    tasks,
    selectedTask,
    filters,
    loading,
    isReadOnly,
    filteredTasks,
    tasksByStatus,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    selectTask,
    setFilter,
    clearFilters,
  };
}
