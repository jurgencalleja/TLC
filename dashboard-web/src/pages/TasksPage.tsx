import { useEffect, useState, useCallback, useMemo } from 'react';
import { TaskBoard } from '../components/task/TaskBoard';
import { TaskFilter, type TaskFilterValues, type Assignee } from '../components/task/TaskFilter';
import { TaskDetail, type AcceptanceCriterion, type ActivityItem } from '../components/task/TaskDetail';
import { useUIStore } from '../stores';
import { useTasks } from '../hooks/useTasks';
import type { Task as ComponentTask, TaskStatus } from '../components/task/TaskCard';
import type { Task as StoreTask } from '../stores/task.store';
import { Skeleton } from '../components/ui/Skeleton';

// Transform server task format to component format
function transformTask(task: StoreTask): ComponentTask {
  return {
    id: task.id,
    title: task.subject || task.title || 'Untitled',
    description: task.goal || task.description || '',
    status: mapStatus(task.status),
    priority: task.priority || 'medium',
    assignee: task.owner ? { id: task.owner, name: task.owner } : undefined,
    testStatus: task.testStatus || { passed: 0, failed: 0, total: 0 },
    phase: task.phase || 0,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
  };
}

function mapStatus(status: string): TaskStatus {
  switch (status) {
    case 'completed':
    case 'done':
      return 'done';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'todo';
  }
}

// Extract unique assignees from tasks
function extractAssignees(tasks: ComponentTask[]): Assignee[] {
  const seen = new Set<string>();
  const assignees: Assignee[] = [];

  for (const task of tasks) {
    if (task.assignee && !seen.has(task.assignee.id)) {
      seen.add(task.assignee.id);
      assignees.push(task.assignee);
    }
  }

  return assignees;
}

const defaultActivity: ActivityItem[] = [];

// Derive acceptance criteria from actual task data instead of using hardcoded defaults
function getAcceptanceCriteria(task: ComponentTask, storeTasks: StoreTask[]): AcceptanceCriterion[] {
  const storeTask = storeTasks.find((t) => t.id === task.id);
  if (storeTask?.acceptanceCriteria && storeTask.acceptanceCriteria.length > 0) {
    return storeTask.acceptanceCriteria.map((text, index) => ({
      id: String(index + 1),
      text,
      completed: task.status === 'done',
    }));
  }
  return [];
}

export function TasksPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const { tasks: storeTasks, loading, fetchTasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<ComponentTask | null>(null);
  const [filters, setFilters] = useState<TaskFilterValues>({ assignees: [], priorities: [] });

  useEffect(() => {
    setActiveView('tasks');
    fetchTasks();
  }, [setActiveView, fetchTasks]);

  // Transform store tasks to component tasks
  const tasks = useMemo(() => {
    return storeTasks.map(transformTask);
  }, [storeTasks]);

  // Extract assignees from tasks
  const assignees = useMemo(() => extractAssignees(tasks), [tasks]);

  const handleFilterChange = useCallback((newFilters: TaskFilterValues) => {
    setFilters(newFilters);
  }, []);

  const handleTaskClick = useCallback((task: ComponentTask) => {
    setSelectedTask(task);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Map component status back to server status
    const serverStatus = newStatus === 'done' ? 'completed' : newStatus;
    try {
      await updateTask(taskId, { status: serverStatus });
    } catch {
      // Task already updated optimistically, refresh on error
      fetchTasks();
    }
  }, [updateTask, fetchTasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.assignees.length > 0 && task.assignee) {
        if (!filters.assignees.includes(task.assignee.id)) {
          return false;
        }
      }
      if (filters.priorities.length > 0) {
        if (!filters.priorities.includes(task.priority)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, filters]);

  if (loading && tasks.length === 0) {
    return (
      <div className="h-full p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-text-primary">Tasks</h1>
            <TaskFilter
              assignees={assignees}
              onFilterChange={handleFilterChange}
              initialFilters={filters}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-text-secondary mb-2">No tasks found</p>
              <p className="text-sm text-text-muted">
                Tasks are loaded from .planning/phases/*-PLAN.md files
              </p>
            </div>
          ) : (
            <TaskBoard
              tasks={filteredTasks}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
            />
          )}
        </div>
      </div>

      {selectedTask && (
        <div className="w-96 border-l border-border">
          <TaskDetail
            task={selectedTask}
            acceptanceCriteria={getAcceptanceCriteria(selectedTask, storeTasks)}
            activity={defaultActivity}
            onClose={handleCloseDetail}
          />
        </div>
      )}
    </div>
  );
}
