import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUIStore } from '../stores/ui.store';

export type CommandCategory = 'navigation' | 'actions' | 'settings';

export interface CommandDefinition {
  id: string;
  label: string;
  category: CommandCategory;
  action: () => void;
  shortcut?: string;
}

export interface UseCommandPaletteOptions {
  additionalCommands?: CommandDefinition[];
  onNavigate?: (path: string) => void;
}

const RECENT_COMMANDS_KEY = 'tlc-recent-commands';
const MAX_RECENT_COMMANDS = 5;

/**
 * Fuzzy match algorithm - checks if all characters in query appear in text in order
 */
export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

/**
 * Creates the default command registry with navigation, action, and settings commands
 */
export function createCommandRegistry(
  onNavigate?: (path: string) => void,
  actions?: {
    toggleTheme?: () => void;
    toggleSidebar?: () => void;
    runTests?: () => void;
    clearLogs?: () => void;
    refresh?: () => void;
  }
): CommandDefinition[] {
  const navigate = onNavigate || (() => {});

  return [
    // Navigation commands
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'navigation',
      shortcut: 'g d',
      action: () => navigate('/'),
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      category: 'navigation',
      shortcut: 'g t',
      action: () => navigate('/tasks'),
    },
    {
      id: 'nav-logs',
      label: 'Go to Logs',
      category: 'navigation',
      shortcut: 'g l',
      action: () => navigate('/logs'),
    },
    {
      id: 'nav-preview',
      label: 'Go to Preview',
      category: 'navigation',
      shortcut: 'g v',
      action: () => navigate('/preview'),
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      category: 'navigation',
      shortcut: 'g s',
      action: () => navigate('/settings'),
    },
    {
      id: 'nav-team',
      label: 'Go to Team',
      category: 'navigation',
      shortcut: 'g m',
      action: () => navigate('/team'),
    },
    // Action commands
    {
      id: 'action-run-tests',
      label: 'Run Tests',
      category: 'actions',
      shortcut: 'r t',
      action: actions?.runTests || (() => console.log('Run Tests')),
    },
    {
      id: 'action-clear-logs',
      label: 'Clear Logs',
      category: 'actions',
      shortcut: 'c l',
      action: actions?.clearLogs || (() => console.log('Clear Logs')),
    },
    {
      id: 'action-refresh',
      label: 'Refresh',
      category: 'actions',
      shortcut: 'r r',
      action: actions?.refresh || (() => window.location.reload()),
    },
    // Settings commands
    {
      id: 'settings-toggle-theme',
      label: 'Toggle Theme',
      category: 'settings',
      shortcut: 't t',
      action: actions?.toggleTheme || (() => {}),
    },
    {
      id: 'settings-toggle-sidebar',
      label: 'Toggle Sidebar',
      category: 'settings',
      shortcut: 't s',
      action: actions?.toggleSidebar || (() => {}),
    },
  ];
}

function loadRecentCommands(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}

function saveRecentCommands(ids: string[]): void {
  localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids));
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const { additionalCommands = [], onNavigate } = options;

  const {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
  } = useUIStore();

  const { toggleTheme, toggleSidebar } = useUIStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() =>
    loadRecentCommands()
  );

  // Build command registry
  const allCommands = useMemo(() => {
    const defaultCommands = createCommandRegistry(onNavigate, {
      toggleTheme,
      toggleSidebar,
    });
    return [...defaultCommands, ...additionalCommands];
  }, [onNavigate, additionalCommands, toggleTheme, toggleSidebar]);

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const grouped: Record<CommandCategory, CommandDefinition[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };

    for (const cmd of allCommands) {
      grouped[cmd.category].push(cmd);
    }

    return grouped;
  }, [allCommands]);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    let filtered = allCommands;

    // Apply fuzzy search if there's a query
    if (query) {
      filtered = allCommands.filter((cmd) => fuzzyMatch(query, cmd.label));
    }

    // Sort: recent commands first (only when no query)
    if (!query && recentCommandIds.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const aIndex = recentCommandIds.indexOf(a.id);
        const bIndex = recentCommandIds.indexOf(b.id);

        // If both are recent, sort by recency
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // Recent commands come first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });
    }

    return filtered;
  }, [allCommands, query, recentCommandIds]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Add command to recent list
  const addToRecent = useCallback((commandId: string) => {
    setRecentCommandIds((prev) => {
      // Remove if already exists
      const filtered = prev.filter((id) => id !== commandId);
      // Add to front
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      saveRecentCommands(updated);
      return updated;
    });
  }, []);

  // Execute a command
  const executeCommand = useCallback(
    (command: CommandDefinition) => {
      command.action();
      addToRecent(command.id);
      closeCommandPalette();
    },
    [addToRecent, closeCommandPalette]
  );

  // Keyboard navigation
  const moveSelectionDown = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
  }, [filteredCommands.length]);

  const moveSelectionUp = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to toggle
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Escape to close (only when open)
      if (event.key === 'Escape' && isCommandPaletteOpen) {
        event.preventDefault();
        closeCommandPalette();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCommandPaletteOpen, toggleCommandPalette, closeCommandPalette]);

  // Reset query when palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  return {
    // State
    isOpen: isCommandPaletteOpen,
    query,
    selectedIndex,
    recentCommandIds,

    // Commands
    filteredCommands,
    commandsByCategory,

    // Actions
    setQuery,
    executeCommand,
    moveSelectionDown,
    moveSelectionUp,
    open: openCommandPalette,
    close: closeCommandPalette,
  };
}
