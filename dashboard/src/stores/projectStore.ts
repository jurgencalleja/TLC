// Project Store - manages project list and selection

export interface ProjectPhase {
  current: number;
  total: number;
  name: string;
}

export interface ProjectTests {
  passing: number;
  failing: number;
  total: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  phase: ProjectPhase;
  tests: ProjectTests;
  coverage: number;
  lastActivity: string;
}

export interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;
}

export interface ProjectActions {
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  selectProject: (id: string) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  getFilteredProjects: (query: string) => Project[];
}

export interface ProjectStore {
  getState: () => ProjectState & ProjectActions;
  setState: (partial: Partial<ProjectState>) => void;
  subscribe: (listener: (state: ProjectState & ProjectActions) => void) => () => void;
}

export function createProjectStore(): ProjectStore {
  let state: ProjectState = {
    projects: [],
    selectedProject: null,
    loading: false,
    error: null,
  };

  const listeners = new Set<(state: ProjectState & ProjectActions) => void>();

  const notify = () => {
    const fullState = { ...state, ...actions };
    listeners.forEach(listener => listener(fullState));
  };

  const actions: ProjectActions = {
    setProjects: (projects: Project[]) => {
      state = { ...state, projects };
      notify();
    },
    addProject: (project: Project) => {
      state = { ...state, projects: [...state.projects, project] };
      notify();
    },
    removeProject: (id: string) => {
      state = { ...state, projects: state.projects.filter(p => p.id !== id) };
      notify();
    },
    updateProject: (id: string, updates: Partial<Project>) => {
      state = {
        ...state,
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      };
      notify();
    },
    selectProject: (id: string) => {
      const project = state.projects.find(p => p.id === id) || null;
      state = { ...state, selectedProject: project };
      notify();
    },
    clearSelection: () => {
      state = { ...state, selectedProject: null };
      notify();
    },
    setLoading: (loading: boolean) => {
      state = { ...state, loading };
      notify();
    },
    setError: (error: string | null) => {
      state = { ...state, error };
      notify();
    },
    clearError: () => {
      state = { ...state, error: null };
      notify();
    },
    getFilteredProjects: (query: string) => {
      if (!query) return state.projects;
      const lowerQuery = query.toLowerCase();
      return state.projects.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
      );
    },
  };

  return {
    getState: () => ({ ...state, ...actions }),
    setState: (partial: Partial<ProjectState>) => {
      state = { ...state, ...partial };
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Default singleton instance
export const projectStore = createProjectStore();
