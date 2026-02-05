import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCommandPalette,
  CommandCategory,
  CommandDefinition,
  fuzzyMatch,
  createCommandRegistry,
} from './useCommandPalette';
import { useUIStore } from '../stores/ui.store';

// Mock useUIStore
vi.mock('../stores/ui.store', () => ({
  useUIStore: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useCommandPalette', () => {
  const mockOpenCommandPalette = vi.fn();
  const mockCloseCommandPalette = vi.fn();
  const mockToggleCommandPalette = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.mocked(useUIStore).mockReturnValue({
      isCommandPaletteOpen: false,
      openCommandPalette: mockOpenCommandPalette,
      closeCommandPalette: mockCloseCommandPalette,
      toggleCommandPalette: mockToggleCommandPalette,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('keyboard shortcut', () => {
    it('opens on Cmd+K (Mac)', () => {
      renderHook(() => useCommandPalette());

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
          })
        );
      });

      expect(mockToggleCommandPalette).toHaveBeenCalled();
    });

    it('opens on Ctrl+K (Windows/Linux)', () => {
      renderHook(() => useCommandPalette());

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true,
          })
        );
      });

      expect(mockToggleCommandPalette).toHaveBeenCalled();
    });

    it('closes on Escape when open', () => {
      vi.mocked(useUIStore).mockReturnValue({
        isCommandPaletteOpen: true,
        openCommandPalette: mockOpenCommandPalette,
        closeCommandPalette: mockCloseCommandPalette,
        toggleCommandPalette: mockToggleCommandPalette,
      });

      renderHook(() => useCommandPalette());

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
          })
        );
      });

      expect(mockCloseCommandPalette).toHaveBeenCalled();
    });

    it('does not close on Escape when already closed', () => {
      vi.mocked(useUIStore).mockReturnValue({
        isCommandPaletteOpen: false,
        openCommandPalette: mockOpenCommandPalette,
        closeCommandPalette: mockCloseCommandPalette,
        toggleCommandPalette: mockToggleCommandPalette,
      });

      renderHook(() => useCommandPalette());

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
          })
        );
      });

      expect(mockCloseCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe('fuzzy search', () => {
    it('matches exact text', () => {
      expect(fuzzyMatch('dashboard', 'Go to Dashboard')).toBe(true);
    });

    it('matches partial text (e.g., "tsk" matches "Tasks")', () => {
      expect(fuzzyMatch('tsk', 'Go to Tasks')).toBe(true);
    });

    it('matches non-contiguous characters', () => {
      expect(fuzzyMatch('gtd', 'Go to Dashboard')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(fuzzyMatch('TASK', 'Go to Tasks')).toBe(true);
      expect(fuzzyMatch('task', 'Go to TASKS')).toBe(true);
    });

    it('does not match when characters are out of order', () => {
      expect(fuzzyMatch('kst', 'Go to Tasks')).toBe(false);
    });

    it('handles empty query', () => {
      expect(fuzzyMatch('', 'Go to Tasks')).toBe(true);
    });
  });

  describe('command filtering', () => {
    it('returns all commands when query is empty', () => {
      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.filteredCommands.length).toBeGreaterThan(0);
    });

    it('filters commands by fuzzy search', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.setQuery('tsk');
      });

      const labels = result.current.filteredCommands.map((c) => c.label);
      expect(labels.some((l) => l.includes('Tasks'))).toBe(true);
    });
  });

  describe('command execution', () => {
    it('executes selected command on Enter', () => {
      const mockAction = vi.fn();
      const testCommands: CommandDefinition[] = [
        {
          id: 'test-cmd',
          label: 'Test Command',
          category: 'actions',
          action: mockAction,
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: testCommands })
      );

      // Find the test command
      const testCmd = result.current.filteredCommands.find(
        (c) => c.id === 'test-cmd'
      );
      expect(testCmd).toBeDefined();

      act(() => {
        result.current.executeCommand(testCmd!);
      });

      expect(mockAction).toHaveBeenCalled();
    });

    it('closes palette after command execution', () => {
      const mockAction = vi.fn();
      const testCommands: CommandDefinition[] = [
        {
          id: 'test-cmd',
          label: 'Test Command',
          category: 'actions',
          action: mockAction,
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: testCommands })
      );

      const testCmd = result.current.filteredCommands.find(
        (c) => c.id === 'test-cmd'
      );

      act(() => {
        result.current.executeCommand(testCmd!);
      });

      expect(mockCloseCommandPalette).toHaveBeenCalled();
    });
  });

  describe('recent commands', () => {
    it('stores executed commands in recent list', () => {
      const mockAction = vi.fn();
      const testCommands: CommandDefinition[] = [
        {
          id: 'test-cmd',
          label: 'Test Command',
          category: 'actions',
          action: mockAction,
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: testCommands })
      );

      const testCmd = result.current.filteredCommands.find(
        (c) => c.id === 'test-cmd'
      );

      act(() => {
        result.current.executeCommand(testCmd!);
      });

      expect(result.current.recentCommandIds).toContain('test-cmd');
    });

    it('persists recent commands to localStorage', () => {
      const mockAction = vi.fn();
      const testCommands: CommandDefinition[] = [
        {
          id: 'test-cmd',
          label: 'Test Command',
          category: 'actions',
          action: mockAction,
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: testCommands })
      );

      const testCmd = result.current.filteredCommands.find(
        (c) => c.id === 'test-cmd'
      );

      act(() => {
        result.current.executeCommand(testCmd!);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'tlc-recent-commands',
        expect.any(String)
      );
    });

    it('loads recent commands from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(['nav-dashboard', 'nav-tasks'])
      );

      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.recentCommandIds).toEqual([
        'nav-dashboard',
        'nav-tasks',
      ]);
    });

    it('shows recent commands first when no query', () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify(['nav-tasks'])
      );

      const { result } = renderHook(() => useCommandPalette());

      // Recent commands should appear first
      const firstCmd = result.current.filteredCommands[0];
      expect(firstCmd.id).toBe('nav-tasks');
    });

    it('limits recent commands to 5', () => {
      const mockAction = vi.fn();
      const testCommands: CommandDefinition[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `test-cmd-${i}`,
          label: `Test Command ${i}`,
          category: 'actions' as CommandCategory,
          action: mockAction,
        })
      );

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: testCommands })
      );

      // Execute 7 commands
      for (let i = 0; i < 7; i++) {
        const cmd = result.current.filteredCommands.find(
          (c) => c.id === `test-cmd-${i}`
        );
        act(() => {
          result.current.executeCommand(cmd!);
        });
      }

      expect(result.current.recentCommandIds.length).toBeLessThanOrEqual(5);
    });
  });

  describe('categories', () => {
    it('groups commands by category', () => {
      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.commandsByCategory.navigation).toBeDefined();
      expect(result.current.commandsByCategory.actions).toBeDefined();
      expect(result.current.commandsByCategory.settings).toBeDefined();
    });

    it('includes navigation commands', () => {
      const { result } = renderHook(() => useCommandPalette());

      const navCommands = result.current.commandsByCategory.navigation || [];
      const labels = navCommands.map((c) => c.label);

      expect(labels).toContain('Go to Dashboard');
      expect(labels).toContain('Go to Tasks');
      expect(labels).toContain('Go to Logs');
      expect(labels).toContain('Go to Settings');
      expect(labels).toContain('Go to Team');
    });

    it('includes action commands', () => {
      const { result } = renderHook(() => useCommandPalette());

      const actionCommands = result.current.commandsByCategory.actions || [];
      const labels = actionCommands.map((c) => c.label);

      expect(labels).toContain('Run Tests');
      expect(labels).toContain('Clear Logs');
      expect(labels).toContain('Refresh');
    });

    it('includes settings commands', () => {
      const { result } = renderHook(() => useCommandPalette());

      const settingsCommands = result.current.commandsByCategory.settings || [];
      const labels = settingsCommands.map((c) => c.label);

      expect(labels).toContain('Toggle Theme');
      expect(labels).toContain('Toggle Sidebar');
    });
  });

  describe('keyboard navigation', () => {
    it('tracks selected index', () => {
      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.selectedIndex).toBe(0);
    });

    it('moves selection down with ArrowDown', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.moveSelectionDown();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('moves selection up with ArrowUp', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.moveSelectionDown();
        result.current.moveSelectionDown();
        result.current.moveSelectionUp();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('does not go below 0', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.moveSelectionUp();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('does not go beyond last command', () => {
      const { result } = renderHook(() => useCommandPalette());

      const maxIndex = result.current.filteredCommands.length - 1;

      // Move down many times
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.moveSelectionDown();
        });
      }

      expect(result.current.selectedIndex).toBe(maxIndex);
    });

    it('resets selection when query changes', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.moveSelectionDown();
        result.current.moveSelectionDown();
      });

      expect(result.current.selectedIndex).toBe(2);

      act(() => {
        result.current.setQuery('task');
      });

      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe('command registry', () => {
    it('creates registry with default commands', () => {
      const registry = createCommandRegistry();

      expect(registry.length).toBeGreaterThan(0);
    });

    it('allows adding custom commands', () => {
      const customCommand: CommandDefinition = {
        id: 'custom-cmd',
        label: 'Custom Command',
        category: 'actions',
        action: vi.fn(),
      };

      const { result } = renderHook(() =>
        useCommandPalette({ additionalCommands: [customCommand] })
      );

      const found = result.current.filteredCommands.find(
        (c) => c.id === 'custom-cmd'
      );
      expect(found).toBeDefined();
    });

    it('supports command shortcuts', () => {
      const { result } = renderHook(() => useCommandPalette());

      const dashboardCmd = result.current.filteredCommands.find(
        (c) => c.id === 'nav-dashboard'
      );
      expect(dashboardCmd?.shortcut).toBeDefined();
    });
  });

  describe('isOpen state', () => {
    it('reflects UI store state', () => {
      vi.mocked(useUIStore).mockReturnValue({
        isCommandPaletteOpen: true,
        openCommandPalette: mockOpenCommandPalette,
        closeCommandPalette: mockCloseCommandPalette,
        toggleCommandPalette: mockToggleCommandPalette,
      });

      const { result } = renderHook(() => useCommandPalette());

      expect(result.current.isOpen).toBe(true);
    });

    it('provides open and close functions', () => {
      const { result } = renderHook(() => useCommandPalette());

      act(() => {
        result.current.open();
      });
      expect(mockOpenCommandPalette).toHaveBeenCalled();

      act(() => {
        result.current.close();
      });
      expect(mockCloseCommandPalette).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useCommandPalette());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });
});
