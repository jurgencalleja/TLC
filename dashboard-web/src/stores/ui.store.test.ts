import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import after mock setup
import { useUIStore } from './ui.store';

describe('ui.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Reset store state
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('theme', () => {
    it('has dark as default theme', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.theme).toBe('dark');
    });

    it('cycles theme preference: dark → light → system → dark', () => {
      const { result } = renderHook(() => useUIStore());

      // Default themePreference is 'system', so first toggle goes to next after system
      // But after reset(), themePreference is 'system'. Let's set it to dark first.
      act(() => {
        result.current.setThemePreference('dark');
      });
      expect(result.current.themePreference).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.themePreference).toBe('light');
      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.themePreference).toBe('system');
      // System resolves based on matchMedia (dark in jsdom)

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.themePreference).toBe('dark');
      expect(result.current.theme).toBe('dark');
    });

    it('sets theme directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });
      expect(result.current.theme).toBe('light');
    });

    it('persists theme to localStorage', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setTheme('light');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('tlc-theme', 'light');
    });

    it('loads theme from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValue('light');

      // Force re-initialization
      const { result } = renderHook(() => useUIStore());
      act(() => {
        result.current.initFromStorage();
      });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('sidebar', () => {
    it('has sidebar expanded by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('toggles sidebar collapsed state', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });
      expect(result.current.sidebarCollapsed).toBe(false);
    });

    it('sets sidebar state directly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setSidebarCollapsed(true);
      });
      expect(result.current.sidebarCollapsed).toBe(true);
    });
  });

  describe('command palette', () => {
    it('has command palette closed by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.isCommandPaletteOpen).toBe(false);
    });

    it('opens command palette', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openCommandPalette();
      });
      expect(result.current.isCommandPaletteOpen).toBe(true);
    });

    it('closes command palette', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openCommandPalette();
        result.current.closeCommandPalette();
      });
      expect(result.current.isCommandPaletteOpen).toBe(false);
    });

    it('toggles command palette', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleCommandPalette();
      });
      expect(result.current.isCommandPaletteOpen).toBe(true);

      act(() => {
        result.current.toggleCommandPalette();
      });
      expect(result.current.isCommandPaletteOpen).toBe(false);
    });
  });

  describe('active view', () => {
    it('has dashboard as default active view', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.activeView).toBe('dashboard');
    });

    it('sets active view', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setActiveView('tasks');
      });
      expect(result.current.activeView).toBe('tasks');
    });

    it('accepts all valid view names', () => {
      const { result } = renderHook(() => useUIStore());
      const views = ['dashboard', 'projects', 'tasks', 'logs', 'preview', 'settings', 'team', 'agents', 'health'];

      views.forEach(view => {
        act(() => {
          result.current.setActiveView(view);
        });
        expect(result.current.activeView).toBe(view);
      });
    });
  });

  describe('mobile menu', () => {
    it('has mobile menu closed by default', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.isMobileMenuOpen).toBe(false);
    });

    it('toggles mobile menu', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleMobileMenu();
      });
      expect(result.current.isMobileMenuOpen).toBe(true);
    });

    it('closes mobile menu explicitly', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleMobileMenu();
        result.current.closeMobileMenu();
      });
      expect(result.current.isMobileMenuOpen).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all UI state to defaults', () => {
      const { result } = renderHook(() => useUIStore());

      // Modify all state
      act(() => {
        result.current.setTheme('light');
        result.current.setSidebarCollapsed(true);
        result.current.openCommandPalette();
        result.current.setActiveView('tasks');
        result.current.toggleMobileMenu();
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.sidebarCollapsed).toBe(false);
      expect(result.current.isCommandPaletteOpen).toBe(false);
      expect(result.current.activeView).toBe('dashboard');
      expect(result.current.isMobileMenuOpen).toBe(false);
    });
  });
});
