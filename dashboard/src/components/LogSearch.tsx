import React from 'react';
import { Box, Text, useInput } from 'ink';

export interface LogSearchProps {
  query: string;
  matchCount?: number;
  currentMatch?: number;
  caseSensitive?: boolean;
  isActive?: boolean;
  onChange: (query: string) => void;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onToggleCase?: () => void;
}

export function LogSearch({
  query,
  matchCount = 0,
  currentMatch = 0,
  caseSensitive = false,
  isActive = true,
  onChange,
  onClose,
  onNext,
  onPrev,
  onToggleCase,
}: LogSearchProps) {
  useInput(
    (input, key) => {
      if (!isActive) return;

      // Close on Escape
      if (key.escape) {
        onClose();
        return;
      }

      // Submit on Enter (just keeps current search)
      if (key.return) {
        return;
      }

      // Next/Prev match
      if (input === 'n' && !key.ctrl && matchCount > 0) {
        onNext?.();
        return;
      }
      if (input === 'N' && matchCount > 0) {
        onPrev?.();
        return;
      }

      // Toggle case sensitivity
      if (key.ctrl && input === 'c') {
        onToggleCase?.();
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        onChange(query.slice(0, -1));
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        onChange(query + input);
      }
    },
    { isActive }
  );

  const hasMatches = matchCount > 0;
  const showMatchCount = query.length > 0;

  return (
    <Box flexDirection="column">
      {/* Search input row */}
      <Box>
        <Text color="yellow">/</Text>
        <Text>{query}</Text>
        <Text color="cyan">▏</Text>

        {/* Match count */}
        {showMatchCount && (
          <Box marginLeft={1}>
            <Text color={hasMatches ? 'green' : 'red'}>
              {currentMatch > 0 ? `${currentMatch} of ${matchCount}` : `${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
            </Text>
          </Box>
        )}

        {/* Case indicator */}
        {caseSensitive && (
          <Box marginLeft={1}>
            <Text color="magenta">[Aa]</Text>
          </Box>
        )}
      </Box>

      {/* Placeholder when empty */}
      {query.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>Type to search logs...</Text>
        </Box>
      )}

      {/* No matches warning */}
      {query.length > 0 && matchCount === 0 && (
        <Box marginTop={1}>
          <Text color="yellow">No matches found</Text>
        </Box>
      )}

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          Enter search • Esc close
          {matchCount > 1 && ' • n/N next/prev'}
        </Text>
      </Box>
    </Box>
  );
}
