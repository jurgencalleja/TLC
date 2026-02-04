import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  phase: number;
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt?: string;
}

interface TaskFilters {
  status: TaskStatus | null;
  assignee: string | null;
  phase: number | null;
  priority: TaskPriority | null;
}

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  filters: TaskFilters;
  loading: boolean;
  filteredTasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
}

interface TaskActions {
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  selectTask: (task: Task | null) => void;
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialFilters: TaskFilters = {
  status: null,
  assignee: null,
  phase: null,
  priority: null,
};

const computeFilteredTasks = (tasks: Task[], filters: TaskFilters): Task[] => {
  return tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignee && task.assignee !== filters.assignee) return false;
    if (filters.phase && task.phase !== filters.phase) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    return true;
  });
};

const computeTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]> => {
  return {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };
};

const initialState: Omit<TaskState, 'filteredTasks' | 'tasksByStatus'> = {
  tasks: [],
  selectedTask: null,
  filters: initialFilters,
  loading: false,
};

export const useTaskStore = create<TaskState & TaskActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    filteredTasks: [],
    tasksByStatus: { pending: [], in_progress: [], completed: [] },

    setTasks: (tasks) =>
      set({
        tasks,
        loading: false,
        filteredTasks: computeFilteredTasks(tasks, initialFilters),
        tasksByStatus: computeTasksByStatus(tasks),
      }),

    addTask: (task) =>
      set((state) => {
        const tasks = [...state.tasks, task];
        return {
          tasks,
          filteredTasks: computeFilteredTasks(tasks, state.filters),
          tasksByStatus: computeTasksByStatus(tasks),
        };
      }),

    updateTask: (id, updates) =>
      set((state) => {
        const tasks = state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        );
        const selectedTask =
          state.selectedTask?.id === id
            ? { ...state.selectedTask, ...updates }
            : state.selectedTask;
        return {
          tasks,
          selectedTask,
          filteredTasks: computeFilteredTasks(tasks, state.filters),
          tasksByStatus: computeTasksByStatus(tasks),
        };
      }),

    removeTask: (id) =>
      set((state) => {
        const tasks = state.tasks.filter((task) => task.id !== id);
        return {
          tasks,
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
          filteredTasks: computeFilteredTasks(tasks, state.filters),
          tasksByStatus: computeTasksByStatus(tasks),
        };
      }),

    selectTask: (task) => set({ selectedTask: task }),

    setFilter: (key, value) =>
      set((state) => {
        const filters = { ...state.filters, [key]: value };
        return {
          filters,
          filteredTasks: computeFilteredTasks(state.tasks, filters),
        };
      }),

    clearFilters: () =>
      set((state) => ({
        filters: initialFilters,
        filteredTasks: computeFilteredTasks(state.tasks, initialFilters),
      })),

    setLoading: (loading) => set({ loading }),

    reset: () =>
      set({
        ...initialState,
        filteredTasks: [],
        tasksByStatus: { pending: [], in_progress: [], completed: [] },
      }),
  }))
);
