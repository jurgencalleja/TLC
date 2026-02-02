// UI Store - manages UI state like theme, sidebar, active view
// Using a simple store pattern (compatible with Zustand interface)

export type Theme = 'dark' | 'light';
export type ViewName = 'projects' | 'tasks' | 'chat' | 'agents' | 'preview' | 'logs' | 'github' | 'health' | 'router' | 'settings';

export interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  activeView: ViewName;
  commandPaletteOpen: boolean;
  helpOpen: boolean;
  isMobile: boolean;
}

export interface UIActions {
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: ViewName | string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  toggleHelp: () => void;
  setMobile: (isMobile: boolean) => void;
}

export interface UIStore {
  getState: () => UIState & UIActions;
  setState: (partial: Partial<UIState>) => void;
  subscribe: (listener: (state: UIState & UIActions) => void) => () => void;
}

export function createUIStore(): UIStore {
  let state: UIState = {
    theme: 'dark',
    sidebarOpen: true,
    activeView: 'projects',
    commandPaletteOpen: false,
    helpOpen: false,
    isMobile: false,
  };

  const listeners = new Set<(state: UIState & UIActions) => void>();

  const notify = () => {
    const fullState = { ...state, ...actions };
    listeners.forEach(listener => listener(fullState));
  };

  const actions: UIActions = {
    toggleTheme: () => {
      state = { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
      notify();
    },
    setTheme: (theme: Theme) => {
      state = { ...state, theme };
      notify();
    },
    toggleSidebar: () => {
      state = { ...state, sidebarOpen: !state.sidebarOpen };
      notify();
    },
    setSidebarOpen: (open: boolean) => {
      state = { ...state, sidebarOpen: open };
      notify();
    },
    setActiveView: (view: ViewName | string) => {
      state = { ...state, activeView: view as ViewName };
      notify();
    },
    openCommandPalette: () => {
      state = { ...state, commandPaletteOpen: true };
      notify();
    },
    closeCommandPalette: () => {
      state = { ...state, commandPaletteOpen: false };
      notify();
    },
    toggleCommandPalette: () => {
      state = { ...state, commandPaletteOpen: !state.commandPaletteOpen };
      notify();
    },
    toggleHelp: () => {
      state = { ...state, helpOpen: !state.helpOpen };
      notify();
    },
    setMobile: (isMobile: boolean) => {
      state = { ...state, isMobile };
      notify();
    },
  };

  return {
    getState: () => ({ ...state, ...actions }),
    setState: (partial: Partial<UIState>) => {
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
export const uiStore = createUIStore();
