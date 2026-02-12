import { create } from 'zustand';

const STORAGE_KEY = 'tlc-selected-project-id';

export interface WorkspaceProject {
  id: string;
  name: string;
  path: string;
  hasTlc?: boolean;
  hasPlanning?: boolean;
  version?: string;
  phase?: number | null;
  phaseName?: string | null;
  totalPhases?: number;
  completedPhases?: number;
}

interface WorkspaceState {
  roots: string[];
  projects: WorkspaceProject[];
  selectedProjectId: string | null;
  isConfigured: boolean;
  isScanning: boolean;
  lastScan: string | null;
}

interface WorkspaceActions {
  setRoots: (roots: string[]) => void;
  setProjects: (projects: WorkspaceProject[]) => void;
  selectProject: (id: string | null) => void;
  restoreSelectedProject: () => void;
  setIsScanning: (isScanning: boolean) => void;
  setLastScan: (lastScan: string | null) => void;
  reset: () => void;
}

const initialState: WorkspaceState = {
  roots: [],
  projects: [],
  selectedProjectId: null,
  isConfigured: false,
  isScanning: false,
  lastScan: null,
};

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>((set) => ({
  ...initialState,

  setRoots: (roots) => set({ roots, isConfigured: roots.length > 0 }),

  setProjects: (projects) => set({ projects }),

  selectProject: (id) => {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
    set({ selectedProjectId: id });
  },

  restoreSelectedProject: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      set({ selectedProjectId: saved });
    }
  },

  setIsScanning: (isScanning) => set({ isScanning }),

  setLastScan: (lastScan) => set({ lastScan }),

  reset: () => set(initialState),
}));
