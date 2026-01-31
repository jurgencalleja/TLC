import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { TaskCard, TaskStatus, TaskPriority } from './TaskCard.js';

export interface Task {
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
}

export interface TaskBoardProps {
  tasks: Task[];
  initialColumn?: number;
  initialRow?: number;
  compact?: boolean;
  onSelect?: (task: Task) => void;
  onMove?: (task: Task, newStatus: TaskStatus) => void;
}

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const priorityOrder: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function TaskBoard({
  tasks,
  initialColumn = 0,
  initialRow = 0,
  compact = false,
  onSelect,
  onMove,
}: TaskBoardProps) {
  const [activeColumn, setActiveColumn] = useState(initialColumn);
  const [activeRow, setActiveRow] = useState(initialRow);
  const [moveMode, setMoveMode] = useState(false);

  // Group and sort tasks by status
  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    // Sort by priority within each column
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort((a, b) => {
        const aPriority = a.priority ? priorityOrder[a.priority] : 999;
        const bPriority = b.priority ? priorityOrder[b.priority] : 999;
        return aPriority - bPriority;
      });
    }

    return grouped;
  }, [tasks]);

  // Get current column tasks
  const currentColumnTasks = tasksByColumn[columns[activeColumn].key];
  const currentTask = currentColumnTasks[activeRow];

  // Handle keyboard input
  useInput((input, key) => {
    if (tasks.length === 0) return;

    // Move mode: select target column
    if (moveMode) {
      if (input === '1') {
        handleMove('pending');
      } else if (input === '2') {
        handleMove('in_progress');
      } else if (input === '3') {
        handleMove('completed');
      } else if (key.escape) {
        setMoveMode(false);
      }
      return;
    }

    // Horizontal navigation (columns)
    if (key.rightArrow || input === 'l') {
      setActiveColumn((prev) => Math.min(prev + 1, columns.length - 1));
      setActiveRow(0); // Reset row when changing column
    } else if (key.leftArrow || input === 'h') {
      setActiveColumn((prev) => Math.max(prev - 1, 0));
      setActiveRow(0);
    }

    // Vertical navigation (tasks within column)
    else if (key.downArrow || input === 'j') {
      setActiveRow((prev) =>
        Math.min(prev + 1, currentColumnTasks.length - 1)
      );
    } else if (key.upArrow || input === 'k') {
      setActiveRow((prev) => Math.max(prev - 1, 0));
    }

    // Select task
    else if (key.return && currentTask && onSelect) {
      onSelect(currentTask);
    }

    // Enter move mode
    else if (input === 'm' && currentTask) {
      setMoveMode(true);
    }
  });

  const handleMove = (newStatus: TaskStatus) => {
    if (currentTask && onMove) {
      onMove(currentTask, newStatus);
    }
    setMoveMode(false);
  };

  // Empty state
  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No tasks found</Text>
        <Text dimColor>Run /tlc:plan to create tasks</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Move mode overlay */}
      {moveMode && (
        <Box marginBottom={1}>
          <Text color="yellow">
            Move "{currentTask?.title}" to: [1] Pending [2] In Progress [3] Completed
          </Text>
        </Box>
      )}

      {/* Columns */}
      <Box>
        {columns.map((column, colIndex) => {
          const columnTasks = tasksByColumn[column.key];
          const isActiveColumn = colIndex === activeColumn;

          return (
            <Box
              key={column.key}
              flexDirection="column"
              width="33%"
              marginRight={1}
              borderStyle={isActiveColumn ? 'double' : 'single'}
              borderColor={isActiveColumn ? 'cyan' : 'gray'}
            >
              {/* Column header */}
              <Box marginBottom={1} paddingX={1}>
                <Text bold color={isActiveColumn ? 'cyan' : 'white'}>
                  {column.label}
                </Text>
                <Text dimColor> ({columnTasks.length})</Text>
              </Box>

              {/* Column tasks */}
              <Box flexDirection="column" paddingX={1}>
                {columnTasks.length === 0 ? (
                  <Text dimColor>- empty -</Text>
                ) : (
                  columnTasks.map((task, rowIndex) => (
                    <Box key={task.id} marginBottom={compact ? 0 : 1}>
                      <TaskCard
                        {...task}
                        isSelected={isActiveColumn && rowIndex === activeRow}
                        compact={compact}
                      />
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Navigation hints */}
      <Box marginTop={1}>
        <Text dimColor>
          h/l ←/→ columns • j/k ↑/↓ tasks • Enter select • m move
        </Text>
      </Box>
    </Box>
  );
}
