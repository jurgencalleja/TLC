import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  id: string;
  timestamp?: string;
  level?: LogLevel;
  service?: string;
  message: string;
}

export interface LogStreamProps {
  logs: LogEntry[];
  pageSize?: number;
  autoScroll?: boolean;
  searchQuery?: string;
  levelFilter?: LogLevel;
  serviceFilter?: string;
  isActive?: boolean;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  onAutoScrollToggle?: (enabled: boolean) => void;
}

const levelColors: Record<LogLevel, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'gray',
};

const levelIcons: Record<LogLevel, string> = {
  error: '✗',
  warn: '⚠',
  info: 'ℹ',
  debug: '·',
};

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
}

export function LogStream({
  logs,
  pageSize = 20,
  autoScroll = true,
  searchQuery = '',
  levelFilter,
  serviceFilter,
  isActive = true,
  onPageChange,
  onSearch,
  onAutoScrollToggle,
}: LogStreamProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [internalAutoScroll, setInternalAutoScroll] = useState(autoScroll);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Level filter
    if (levelFilter) {
      const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
      const levelIndex = levels.indexOf(levelFilter);
      result = result.filter((log) => {
        const logLevel = log.level || 'info';
        return levels.indexOf(logLevel) <= levelIndex;
      });
    }

    // Service filter
    if (serviceFilter) {
      result = result.filter((log) => log.service === serviceFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((log) =>
        log.message.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, levelFilter, serviceFilter, searchQuery]);

  // Match count for search
  const matchCount = searchQuery ? filteredLogs.length : 0;

  // Calculate pages
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const effectivePage = internalAutoScroll ? totalPages - 1 : currentPage;
  const startIndex = effectivePage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const visibleLogs = filteredLogs.slice(startIndex, endIndex);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!isActive) return;

      // Page navigation
      if (key.pageDown || input === 'j' && key.ctrl) {
        const newPage = Math.min(currentPage + 1, totalPages - 1);
        setCurrentPage(newPage);
        setInternalAutoScroll(false);
        onPageChange?.(newPage);
      } else if (key.pageUp || input === 'k' && key.ctrl) {
        const newPage = Math.max(currentPage - 1, 0);
        setCurrentPage(newPage);
        setInternalAutoScroll(false);
        onPageChange?.(newPage);
      }

      // Jump to top/bottom
      else if (input === 'g') {
        setCurrentPage(0);
        setInternalAutoScroll(false);
        onPageChange?.(0);
      } else if (input === 'G') {
        setCurrentPage(totalPages - 1);
        setInternalAutoScroll(true);
        onPageChange?.(totalPages - 1);
      }

      // Toggle auto-scroll
      else if (input === 's') {
        const newAutoScroll = !internalAutoScroll;
        setInternalAutoScroll(newAutoScroll);
        if (newAutoScroll) {
          setCurrentPage(totalPages - 1);
        }
        onAutoScrollToggle?.(newAutoScroll);
      }

      // Search trigger
      else if (input === '/') {
        onSearch?.('');
      }
    },
    { isActive }
  );

  // Empty state
  if (logs.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Logs</Text>
        <Box marginTop={1}>
          <Text dimColor>No logs available</Text>
        </Box>
      </Box>
    );
  }

  // No matches
  if (searchQuery && filteredLogs.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Logs</Text>
          <Text dimColor> - searching: "{searchQuery}"</Text>
        </Box>
        <Box>
          <Text color="yellow">0 matches found</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to clear search</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Logs </Text>
        <Text dimColor>
          ({startIndex + 1}-{endIndex} of {filteredLogs.length})
        </Text>
        {internalAutoScroll && <Text color="green"> ↓ auto</Text>}
        {!internalAutoScroll && <Text dimColor> ⏸ paused</Text>}
      </Box>

      {/* Search indicator */}
      {searchQuery && (
        <Box marginBottom={1}>
          <Text dimColor>Search: </Text>
          <Text color="yellow">"{searchQuery}"</Text>
          <Text dimColor> ({matchCount} matches)</Text>
        </Box>
      )}

      {/* Level filter indicator */}
      {levelFilter && (
        <Box marginBottom={1}>
          <Text dimColor>Level: </Text>
          <Text color={levelColors[levelFilter]}>{levelFilter}+</Text>
        </Box>
      )}

      {/* Service filter indicator */}
      {serviceFilter && (
        <Box marginBottom={1}>
          <Text dimColor>Service: </Text>
          <Text color="blue">{serviceFilter}</Text>
        </Box>
      )}

      {/* Log entries */}
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        {visibleLogs.map((log) => {
          const timestamp = formatTimestamp(log.timestamp);
          const level = log.level || 'info';
          const color = levelColors[level];
          const icon = levelIcons[level];

          return (
            <Box key={log.id}>
              {timestamp && <Text dimColor>[{timestamp}] </Text>}
              {log.service && <Text color="blue">[{log.service}] </Text>}
              <Text color={color as any}>{icon} </Text>
              <Text>{log.message}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          PgUp/PgDn page • g top • G bottom • s scroll • / search
        </Text>
      </Box>
    </Box>
  );
}
