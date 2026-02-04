import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type ViewName =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'logs'
  | 'preview'
  | 'settings'
  | 'team'
  | 'agents'
  | 'health';

interface UIState {
  theme: Theme;
  sidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  activeView: ViewName;
  isMobileMenuOpen: boolean;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setActiveView: (view: ViewName | string) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  initFromStorage: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'tlc-theme';

const initialState: UIState = {
  theme: 'dark',
  sidebarCollapsed: false,
  isCommandPaletteOpen: false,
  activeView: 'dashboard',
  isMobileMenuOpen: false,
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, newTheme);
      return { theme: newTheme };
    });
  },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openCommandPalette: () => set({ isCommandPaletteOpen: true }),

  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),

  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  setActiveView: (view) => set({ activeView: view as ViewName }),

  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  closeMobileMenu: () => set({ isMobileMenuOpen: false }),

  initFromStorage: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      set({ theme: stored });
    }
  },

  reset: () => set(initialState),
}));
