import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  category?: string;
}

export interface CommandPaletteProps {
  commands: Command[];
  query?: string;
  recentIds?: string[];
  isActive?: boolean;
  onSelect: (command: Command) => void;
  onQueryChange?: (query: string) => void;
  onClose?: () => void;
}

interface GroupedCommands {
  category: string;
  commands: Command[];
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  return lowerText.includes(lowerQuery);
}

function groupByCategory(commands: Command[]): GroupedCommands[] {
  const groups: Record<string, Command[]> = {};

  for (const cmd of commands) {
    const category = cmd.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(cmd);
  }

  return Object.entries(groups).map(([category, commands]) => ({
    category,
    commands,
  }));
}

export function CommandPalette({
  commands,
  query = '',
  recentIds = [],
  isActive = true,
  onSelect,
  onQueryChange,
  onClose,
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [internalQuery, setInternalQuery] = useState(query);

  const effectiveQuery = query || internalQuery;

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!effectiveQuery) return commands;
    return commands.filter(
      (cmd) =>
        fuzzyMatch(cmd.name, effectiveQuery) ||
        fuzzyMatch(cmd.description, effectiveQuery) ||
        fuzzyMatch(cmd.id, effectiveQuery)
    );
  }, [commands, effectiveQuery]);

  // Sort with recent commands first
  const sortedCommands = useMemo(() => {
    if (recentIds.length === 0) return filteredCommands;

    const recent: Command[] = [];
    const others: Command[] = [];

    for (const cmd of filteredCommands) {
      if (recentIds.includes(cmd.id)) {
        recent.push(cmd);
      } else {
        others.push(cmd);
      }
    }

    return [...recent, ...others];
  }, [filteredCommands, recentIds]);

  // Group commands
  const groupedCommands = useMemo(() => {
    if (recentIds.length > 0 && !effectiveQuery) {
      // Show recent section separately
      const recent = sortedCommands.filter((c) => recentIds.includes(c.id));
      const others = sortedCommands.filter((c) => !recentIds.includes(c.id));
      const groups: GroupedCommands[] = [];

      if (recent.length > 0) {
        groups.push({ category: 'recent', commands: recent });
      }

      groups.push(...groupByCategory(others));
      return groups;
    }

    return groupByCategory(sortedCommands);
  }, [sortedCommands, recentIds, effectiveQuery]);

  // Flatten for navigation
  const flatCommands = sortedCommands;

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Close on Escape
      if (key.escape) {
        onClose?.();
        return;
      }

      // Execute on Enter
      if (key.return && flatCommands[selectedIndex]) {
        onSelect(flatCommands[selectedIndex]);
        return;
      }

      // Navigation
      if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) =>
          Math.min(prev + 1, flatCommands.length - 1)
        );
      } else if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }

      // Backspace
      else if (key.backspace || key.delete) {
        const newQuery = internalQuery.slice(0, -1);
        setInternalQuery(newQuery);
        onQueryChange?.(newQuery);
        setSelectedIndex(0);
      }

      // Regular character input
      else if (input && !key.ctrl && !key.meta && input.length === 1) {
        const newQuery = internalQuery + input;
        setInternalQuery(newQuery);
        onQueryChange?.(newQuery);
        setSelectedIndex(0);
      }
    },
    { isActive }
  );

  // Empty commands
  if (commands.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Command Palette</Text>
        </Box>
        <Text dimColor>No commands available</Text>
      </Box>
    );
  }

  // No matches
  if (filteredCommands.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        {/* Search input */}
        <Box marginBottom={1}>
          <Text color="cyan">&gt; </Text>
          <Text>{effectiveQuery}</Text>
          <Text color="cyan">▏</Text>
        </Box>

        <Text color="yellow">No commands matching "{effectiveQuery}"</Text>

        <Box marginTop={1}>
          <Text dimColor>Esc close</Text>
        </Box>
      </Box>
    );
  }

  let commandIndex = 0;

  return (
    <Box flexDirection="column">
      {/* Search input */}
      <Box marginBottom={1}>
        <Text color="cyan">&gt; </Text>
        <Text>{effectiveQuery}</Text>
        <Text color="cyan">▏</Text>
        {effectiveQuery && (
          <Text dimColor> ({filteredCommands.length} commands)</Text>
        )}
      </Box>

      {/* Grouped commands */}
      {groupedCommands.map((group) => (
        <Box key={group.category} flexDirection="column" marginBottom={1}>
          {/* Category header */}
          <Box marginBottom={1}>
            <Text bold color="gray">
              {group.category.toUpperCase()}
            </Text>
          </Box>

          {/* Commands in category */}
          {group.commands.map((cmd) => {
            const isSelected = commandIndex === selectedIndex;
            const currentIndex = commandIndex;
            commandIndex++;

            return (
              <Box key={cmd.id} marginBottom={1}>
                {/* Selection indicator */}
                <Text color={isSelected ? 'cyan' : undefined}>
                  {isSelected ? '▶ ' : '  '}
                </Text>

                {/* Shortcut */}
                {cmd.shortcut && (
                  <Text color="yellow">[{cmd.shortcut}] </Text>
                )}

                {/* Name */}
                <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'}>
                  {cmd.name}
                </Text>

                {/* Description */}
                <Text dimColor> - {cmd.description}</Text>
              </Box>
            );
          })}
        </Box>
      ))}

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>↑/k ↓/j navigate • Enter execute • Esc close</Text>
      </Box>
    </Box>
  );
}
