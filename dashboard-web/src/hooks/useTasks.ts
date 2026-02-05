import { useCallback } from 'react';
import { useTaskStore, type Task } from '../stores/task.store';
import { api } from '../api';

export function useTasks() {
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
      const data = await api.tasks.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [setLoading, setTasks]);

  const createTask = useCallback(
    async (taskData: Partial<Task>) => {
      try {
        const created = await api.tasks.createTask(taskData);
        addTask(created);
        return created;
      } catch (err) {
        console.error('Failed to create task:', err);
        throw err;
      }
    },
    [addTask]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      try {
        const updated = await api.tasks.updateTask(id, updates);
        storeUpdateTask(id, updated);
        return updated;
      } catch (err) {
        console.error('Failed to update task:', err);
        throw err;
      }
    },
    [storeUpdateTask]
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
