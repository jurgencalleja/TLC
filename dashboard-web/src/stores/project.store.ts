import { create } from 'zustand';

export interface ProjectInfo {
  name: string;
  description?: string;
  phase?: number;
  phaseName?: string;
  branch?: string;
  totalPhases?: number;
}

export interface ProjectStatus {
  testsPass?: number;
  testsFail?: number;
  coverage?: number;
  phase?: number;
}

interface ProjectState {
  project: ProjectInfo | null;
  status: ProjectStatus | null;
  loading: boolean;
  error: string | null;
}

interface ProjectActions {
  setProject: (project: ProjectInfo | null) => void;
  setStatus: (status: ProjectStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState: ProjectState = {
  project: null,
  status: null,
  loading: false,
  error: null,
};

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  ...initialState,

  setProject: (project) => set({ project, loading: false, error: null }),

  setStatus: (status) => set({ status }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
