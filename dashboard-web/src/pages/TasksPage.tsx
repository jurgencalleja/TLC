import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TaskBoard } from '../components/task/TaskBoard';
import { TaskFilter, type TaskFilterValues, type Assignee } from '../components/task/TaskFilter';
import { TaskDetail, type AcceptanceCriterion, type ActivityItem } from '../components/task/TaskDetail';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useTasks } from '../hooks/useTasks';
import type { Task as ComponentTask, TaskStatus } from '../components/task/TaskCard';
import type { Task as StoreTask } from '../stores/task.store';
import { Skeleton } from '../components/ui/Skeleton';
import { Plus, X } from 'lucide-react';

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

// Derive acceptance criteria from actual task data
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
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);

  // URL takes precedence; sync to store
  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  const selectedProject = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === (urlProjectId ?? storeProjectId))
  );
  const { tasks: storeTasks, loading, fetchTasks, updateTaskStatus, createTask } = useTasks(projectId);
  const [selectedTask, setSelectedTask] = useState<ComponentTask | null>(null);
  const [filters, setFilters] = useState<TaskFilterValues>({ assignees: [], priorities: [] });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createGoal, setCreateGoal] = useState('');

  useEffect(() => {
    setActiveView('tasks');
    fetchTasks();
  }, [setActiveView, fetchTasks, projectId]);

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
    const serverStatus = newStatus === 'done' ? 'completed' : newStatus;
    try {
      await updateTaskStatus(taskId, serverStatus);
    } catch {
      fetchTasks();
    }
  }, [updateTaskStatus, fetchTasks]);

  const handleClaim = useCallback(async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'in_progress');
      fetchTasks();
    } catch {
      // Ignore errors
    }
  }, [updateTaskStatus, fetchTasks]);

  const handleComplete = useCallback(async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'done');
      fetchTasks();
    } catch {
      // Ignore errors
    }
  }, [updateTaskStatus, fetchTasks]);

  const handleCreateSubmit = useCallback(async () => {
    if (!createTitle.trim()) return;
    try {
      await createTask({ title: createTitle, goal: createGoal, description: createGoal });
      setCreateTitle('');
      setCreateGoal('');
      setShowCreateForm(false);
    } catch {
      // Ignore errors
    }
  }, [createTask, createTitle, createGoal]);

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
            <div className="flex items-center gap-2">
              <button
                data-testid="create-task-btn"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
              <TaskFilter
                assignees={assignees}
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </div>
          </div>
        </div>

        {/* Create Task Form */}
        {showCreateForm && (
          <div data-testid="task-create-form" className="p-4 border-b border-border bg-bg-secondary">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">New Task</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded hover:bg-bg-tertiary transition-colors"
              >
                <X className="h-4 w-4 text-text-muted" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                data-testid="task-title-input"
                type="text"
                placeholder="Task title..."
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <textarea
                data-testid="task-goal-input"
                placeholder="Goal / description..."
                value={createGoal}
                onChange={(e) => setCreateGoal(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
              <button
                data-testid="task-submit-btn"
                disabled={!createTitle.trim()}
                onClick={handleCreateSubmit}
                className="px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {selectedProject && !selectedProject.hasPlanning ? (
                <>
                  <p className="text-text-secondary mb-2">No TLC planning configured</p>
                  <p className="text-sm text-text-muted mb-4">
                    This project doesn&apos;t have a <code className="px-1 py-0.5 bg-bg-tertiary rounded">.planning/</code> directory.
                  </p>
                  <p className="text-sm text-text-muted">
                    Run <code className="px-1 py-0.5 bg-bg-tertiary rounded">/tlc:init</code> in the project to start tracking tasks.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-text-secondary mb-2">No tasks found</p>
                  <p className="text-sm text-text-muted mb-4">
                    {selectedProject?.hasPlanning
                      ? 'No tasks in current phase plan files (.planning/phases/*-PLAN.md)'
                      : 'Select a project with TLC configured to view tasks'}
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Task
                  </button>
                </>
              )}
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
            onClaim={handleClaim}
            onRelease={handleCloseDetail}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
}
