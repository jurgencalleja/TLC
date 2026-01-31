import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Card } from './ui/Card.js';
import { Badge } from './ui/Badge.js';
import { TaskStatus, TaskPriority } from './TaskCard.js';

export interface Activity {
  id: string;
  type: 'status_change' | 'comment' | 'test_run' | 'file_change';
  timestamp: string;
  user?: string;
  detail: string;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskDetailData {
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
  activity: Activity[];
  files: string[];
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface TaskDetailProps {
  task: TaskDetailData;
  onBack?: () => void;
  onClaim?: () => void;
  onRelease?: () => void;
  onStatusChange?: (newStatus: TaskStatus) => void;
}

const statusLabels: Record<TaskStatus, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
};

const priorityColors: Record<TaskPriority, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

export function TaskDetail({
  task,
  onBack,
  onClaim,
  onRelease,
  onStatusChange,
}: TaskDetailProps) {
  useInput((input, key) => {
    if (key.escape && onBack) {
      onBack();
    } else if (input === 'c' && onClaim && !task.assignee) {
      onClaim();
    } else if (input === 'r' && onRelease && task.assignee) {
      onRelease();
    } else if (input === 'd' && onStatusChange && task.status !== 'completed') {
      onStatusChange('completed');
    } else if (input === 's' && onStatusChange && task.status === 'pending') {
      onStatusChange('in_progress');
    }
  });

  const completedCriteria = task.acceptanceCriteria.filter((c) => c.done).length;
  const totalCriteria = task.acceptanceCriteria.length;
  const totalTests = task.tests ? task.tests.passing + task.tests.failing : 0;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">{task.title}</Text>
      </Box>

      {/* Status row */}
      <Box marginBottom={1}>
        <Badge
          variant={
            task.status === 'completed'
              ? 'success'
              : task.status === 'in_progress'
              ? 'warning'
              : 'neutral'
          }
        >
          {statusLabels[task.status]}
        </Badge>

        {task.priority && (
          <Box marginLeft={1}>
            <Text color={priorityColors[task.priority]}>
              [{task.priority}]
            </Text>
          </Box>
        )}

        {task.assignee && (
          <Box marginLeft={1}>
            <Text dimColor>@{task.assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Description */}
      {task.description && (
        <Card variant="outlined">
          <Text>{task.description}</Text>
        </Card>
      )}

      {/* Acceptance Criteria */}
      {task.acceptanceCriteria.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold>Acceptance Criteria </Text>
            <Text dimColor>({completedCriteria}/{totalCriteria})</Text>
          </Box>
          {task.acceptanceCriteria.map((criterion) => (
            <Box key={criterion.id}>
              <Text color={criterion.done ? 'green' : 'gray'}>
                {criterion.done ? '[x] ' : '[ ] '}
              </Text>
              <Text color={criterion.done ? 'green' : undefined}>
                {criterion.text}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Test Status */}
      {task.tests && (
        <Box marginTop={1}>
          <Text bold>Tests: </Text>
          <Badge variant={task.tests.failing > 0 ? 'error' : 'success'}>
            {task.tests.passing}/{totalTests}
          </Badge>
          {task.tests.failing > 0 && (
            <Box marginLeft={1}>
              <Text color="red">{task.tests.failing} ✗ failing</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Files */}
      {task.files.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold>Files</Text>
          </Box>
          {task.files.map((file, i) => (
            <Box key={i}>
              <Text dimColor>• {file}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Activity */}
      {task.activity.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text bold>Activity</Text>
          </Box>
          {task.activity.map((entry) => (
            <Box key={entry.id}>
              <Text dimColor>{entry.timestamp}</Text>
              {entry.user && <Text color="cyan"> @{entry.user}</Text>}
              <Text>: {entry.detail}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Actions */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Actions: </Text>
        {!task.assignee ? (
          <Text color="green">[c]laim </Text>
        ) : (
          <Text color="yellow">[r]elease </Text>
        )}
        {task.status === 'pending' && <Text>[s]tart </Text>}
        {task.status !== 'completed' && <Text>[d]one </Text>}
        <Text dimColor>| Esc back</Text>
      </Box>
    </Box>
  );
}
