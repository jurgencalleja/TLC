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
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, setTasks]);

  const createTask = useCallback(
    async (taskData: Partial<Task>) => {
      if (projectId) {
        // Use workspace API for project-scoped task creation
        try {
          const result = await api.projects.createTask(projectId, {
            title: taskData.title || taskData.subject || 'Untitled',
            goal: taskData.goal || taskData.description || '',
          });
          await fetchTasks(); // Refresh to get server-assigned numbers
          return result.task;
        } catch (err) {
          console.error('Failed to create task:', err);
          throw err;
        }
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
    [addTask, projectId, fetchTasks]
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: string, owner?: string) => {
      if (projectId) {
        try {
          const result = await api.projects.updateTaskStatus(
            projectId,
            parseInt(taskId, 10),
            newStatus,
            owner
          );
          // Update local store optimistically
          storeUpdateTask(taskId, { status: newStatus === 'done' ? 'completed' : newStatus, owner: owner ?? null });
          return result.task;
        } catch (err) {
          console.error('Failed to update task status:', err);
          throw err;
        }
      }
      // Fallback to old API
      try {
        const updated = await api.tasks.updateTask(taskId, { status: newStatus });
        storeUpdateTask(taskId, updated);
        return updated;
      } catch (err) {
        console.error('Failed to update task:', err);
        throw err;
      }
    },
    [storeUpdateTask, projectId]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (projectId) {
        try {
          const result = await api.projects.updateTask(projectId, parseInt(id, 10), updates);
          storeUpdateTask(id, result.task);
          return result.task;
        } catch (err) {
          console.error('Failed to update task:', err);
          throw err;
        }
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
      try {
        await api.tasks.deleteTask(id);
        removeTask(id);
      } catch (err) {
        console.error('Failed to delete task:', err);
        throw err;
      }
    },
    [removeTask]
  );

  return {
    tasks,
    selectedTask,
    filters,
    loading,
    isReadOnly: false, // No longer read-only — workspace API supports writes
    filteredTasks,
    tasksByStatus,
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    selectTask,
    setFilter,
    clearFilters,
  };
}
