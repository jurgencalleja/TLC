import { create } from 'zustand';

export type ThemePreference = 'dark' | 'light' | 'system';
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
  themePreference: ThemePreference;
  sidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  activeView: ViewName;
  isMobileMenuOpen: boolean;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  setThemePreference: (pref: ThemePreference) => void;
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

function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore in environments without localStorage
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function resolveTheme(pref: ThemePreference): Theme {
  if (pref === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }
  return pref;
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

const initialState: UIState = {
  theme: 'dark',
  themePreference: 'system',
  sidebarCollapsed: false,
  isCommandPaletteOpen: false,
  activeView: 'dashboard',
  isMobileMenuOpen: false,
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,

  setTheme: (theme) => {
    safeSetItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme, themePreference: theme });
  },

  setThemePreference: (pref) => {
    safeSetItem(STORAGE_KEY, pref);
    const resolved = resolveTheme(pref);
    applyTheme(resolved);
    set({ themePreference: pref, theme: resolved });
  },

  toggleTheme: () => {
    set((state) => {
      // Cycle: dark → light → system → dark
      const order: ThemePreference[] = ['dark', 'light', 'system'];
      const currentIndex = order.indexOf(state.themePreference);
      const nextPref = order[(currentIndex + 1) % order.length];
      const resolved = resolveTheme(nextPref);
      safeSetItem(STORAGE_KEY, nextPref);
      applyTheme(resolved);
      return { themePreference: nextPref, theme: resolved };
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
    const stored = safeGetItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      const resolved = resolveTheme(stored as ThemePreference);
      applyTheme(resolved);
      set({ themePreference: stored as ThemePreference, theme: resolved });
    } else {
      // Default to system
      const resolved = resolveTheme('system');
      applyTheme(resolved);
      set({ themePreference: 'system', theme: resolved });
    }
  },

  reset: () => set(initialState),
}));
