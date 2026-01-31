import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from './ui/Badge.js';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  description?: string;
  tests?: {
    passing: number;
    failing: number;
  };
  isSelected?: boolean;
  compact?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

const priorityLabels: Record<TaskPriority, string> = {
  high: '! high',
  medium: 'medium',
  low: 'low',
};

const statusIndicators: Record<TaskStatus, { symbol: string; color: string }> = {
  pending: { symbol: '○', color: 'gray' },
  in_progress: { symbol: '◐', color: 'yellow' },
  completed: { symbol: '✓', color: 'green' },
};

const statusLabels: Record<TaskStatus, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
};

export function TaskCard({
  title,
  status,
  priority,
  assignee,
  description,
  tests,
  isSelected = false,
  compact = false,
}: TaskCardProps) {
  const statusInfo = statusIndicators[status];

  return (
    <Box flexDirection="column">
      {/* Main row */}
      <Box>
        {/* Selection indicator */}
        <Text color={isSelected ? 'cyan' : undefined}>
          {isSelected ? '▶ ' : '  '}
        </Text>

        {/* Status indicator */}
        <Text color={statusInfo.color}>{statusInfo.symbol} </Text>

        {/* Title */}
        <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'}>
          {title}
        </Text>

        {/* Priority */}
        {priority && (
          <Box marginLeft={1}>
            <Text color={priorityColors[priority]}>
              [{priorityLabels[priority]}]
            </Text>
          </Box>
        )}

        {/* Assignee */}
        {assignee && (
          <Box marginLeft={1}>
            <Text dimColor>@{assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Description (non-compact only) */}
      {description && !compact && (
        <Box marginLeft={4}>
          <Text dimColor wrap="truncate-end">
            {description}
          </Text>
        </Box>
      )}

      {/* Description (compact - truncated) */}
      {description && compact && (
        <Box marginLeft={4}>
          <Text dimColor>
            {description.length > 40
              ? description.substring(0, 40) + '...'
              : description}
          </Text>
        </Box>
      )}

      {/* Status and tests row */}
      <Box marginLeft={4}>
        <Text dimColor>{statusLabels[status]}</Text>

        {/* Test status */}
        {tests && (
          <Box marginLeft={1}>
            {tests.failing > 0 ? (
              <Badge variant="error" size="sm">
                {tests.failing} fail
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                {tests.passing} ✓
              </Badge>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
