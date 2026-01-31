import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface Branch {
  name: string;
  isCurrent?: boolean;
  ahead?: number;
  behind?: number;
  lastCommit?: string;
}

export interface BranchSelectorProps {
  branches: Branch[];
  currentBranch?: string;
  initialSelected?: number;
  filter?: string;
  compact?: boolean;
  onSelect?: (branch: Branch) => void;
}

export function BranchSelector({
  branches,
  currentBranch,
  initialSelected = 0,
  filter = '',
  compact = false,
  onSelect,
}: BranchSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialSelected);

  // Filter branches
  const filteredBranches = useMemo(() => {
    if (!filter) return branches;
    const lowerFilter = filter.toLowerCase();
    return branches.filter((b) =>
      b.name.toLowerCase().includes(lowerFilter)
    );
  }, [branches, filter]);

  // Determine current branch
  const current = useMemo(() => {
    const fromProp = branches.find((b) => b.name === currentBranch);
    if (fromProp) return fromProp.name;
    const fromFlag = branches.find((b) => b.isCurrent);
    return fromFlag?.name;
  }, [branches, currentBranch]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (filteredBranches.length === 0) return;

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) =>
        Math.min(prev + 1, filteredBranches.length - 1)
      );
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (key.return && onSelect) {
      onSelect(filteredBranches[selectedIndex]);
    }
  });

  // Empty state
  if (branches.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No branches found</Text>
      </Box>
    );
  }

  // No matches for filter
  if (filteredBranches.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No branches matching "{filter}"</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text dimColor>
          {filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''}
          {filter && ` matching "${filter}"`}
        </Text>
      </Box>

      {/* Branch List */}
      {filteredBranches.map((branch, index) => {
        const isSelected = index === selectedIndex;
        const isCurrent = branch.name === current || branch.isCurrent;
        const isSynced = (branch.ahead || 0) === 0 && (branch.behind || 0) === 0;

        return (
          <Box key={branch.name} marginBottom={compact ? 0 : 1}>
            {/* Selection indicator */}
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '▶ ' : '  '}
            </Text>

            {/* Current branch marker */}
            <Text color="green">{isCurrent ? '* ' : '  '}</Text>

            {/* Branch name */}
            <Text
              bold={isSelected || isCurrent}
              color={isSelected ? 'cyan' : isCurrent ? 'green' : 'white'}
            >
              {branch.name}
            </Text>

            {/* Ahead/behind status */}
            <Box marginLeft={1}>
              {branch.ahead !== undefined && branch.ahead > 0 && (
                <Text color="green">↑{branch.ahead}</Text>
              )}
              {branch.behind !== undefined && branch.behind > 0 && (
                <Text color="yellow"> ↓{branch.behind}</Text>
              )}
              {isSynced && isCurrent && (
                <Text color="green"> ✓</Text>
              )}
            </Box>

            {/* Last commit */}
            {!compact && branch.lastCommit && (
              <Box marginLeft={1}>
                <Text dimColor>({branch.lastCommit})</Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Navigation hint */}
      <Box marginTop={1}>
        <Text dimColor>↑/k ↓/j navigate • Enter switch</Text>
      </Box>
    </Box>
  );
}
