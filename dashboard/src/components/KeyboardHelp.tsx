import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface Shortcut {
  key: string;
  description: string;
  context: string;
}

export interface KeyboardHelpProps {
  shortcuts: Shortcut[];
  searchQuery?: string;
  currentContext?: string;
  compact?: boolean;
  isActive?: boolean;
  onClose?: () => void;
  onSearch?: (query: string) => void;
}

interface GroupedShortcuts {
  context: string;
  shortcuts: Shortcut[];
}

function groupByContext(shortcuts: Shortcut[]): GroupedShortcuts[] {
  const groups: Record<string, Shortcut[]> = {};
  const order = ['global', 'navigation', 'actions'];

  for (const shortcut of shortcuts) {
    if (!groups[shortcut.context]) {
      groups[shortcut.context] = [];
    }
    groups[shortcut.context].push(shortcut);
  }

  // Sort by predefined order, then alphabetically
  const sortedContexts = Object.keys(groups).sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return sortedContexts.map((context) => ({
    context,
    shortcuts: groups[context],
  }));
}

export function KeyboardHelp({
  shortcuts,
  searchQuery = '',
  currentContext,
  compact = false,
  isActive = true,
  onClose,
  onSearch,
}: KeyboardHelpProps) {
  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return shortcuts;
    const query = searchQuery.toLowerCase();
    return shortcuts.filter(
      (s) =>
        s.key.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [shortcuts, searchQuery]);

  // Group shortcuts
  const groupedShortcuts = useMemo(
    () => groupByContext(filteredShortcuts),
    [filteredShortcuts]
  );

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Close on Escape or ?
      if (key.escape || input === '?') {
        onClose?.();
      }
    },
    { isActive }
  );

  // Empty state
  if (shortcuts.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Keyboard Shortcuts</Text>
        <Box marginTop={1}>
          <Text dimColor>No shortcuts configured</Text>
        </Box>
      </Box>
    );
  }

  // No matches
  if (filteredShortcuts.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Keyboard Shortcuts</Text>
        </Box>
        {searchQuery && (
          <Box marginBottom={1}>
            <Text dimColor>Search: </Text>
            <Text color="yellow">"{searchQuery}"</Text>
          </Box>
        )}
        <Text color="yellow">No shortcuts matching "{searchQuery}"</Text>
        <Box marginTop={1}>
          <Text dimColor>Esc close • / search</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Keyboard Shortcuts</Text>
        <Text dimColor> ({filteredShortcuts.length})</Text>
      </Box>

      {/* Search indicator */}
      {searchQuery && (
        <Box marginBottom={1}>
          <Text dimColor>Search: </Text>
          <Text color="yellow">"{searchQuery}"</Text>
        </Box>
      )}

      {/* Grouped shortcuts */}
      {groupedShortcuts.map((group) => {
        const isCurrentContext = group.context === currentContext;

        return (
          <Box
            key={group.context}
            flexDirection="column"
            marginBottom={compact ? 0 : 1}
          >
            {/* Context header */}
            <Box marginBottom={1}>
              <Text
                bold
                color={isCurrentContext ? 'cyan' : 'gray'}
              >
                {group.context.toUpperCase()}
                {isCurrentContext && ' (current)'}
              </Text>
            </Box>

            {/* Shortcuts in context */}
            {group.shortcuts.map((shortcut, idx) => (
              <Box key={`${group.context}-${idx}`} marginBottom={compact ? 0 : 1}>
                {/* Key */}
                <Box width={16}>
                  <Text color="yellow" bold>
                    {shortcut.key}
                  </Text>
                </Box>

                {/* Description */}
                <Text>{shortcut.description}</Text>
              </Box>
            ))}
          </Box>
        );
      })}

      {/* Navigation hints */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Esc or ? close • / search</Text>
      </Box>
    </Box>
  );
}
