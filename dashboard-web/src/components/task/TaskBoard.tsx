import { useState, useCallback } from 'react';
import { Task, TaskCard, TaskStatus } from './TaskCard';
import { Skeleton } from '../ui/Skeleton';
import { ListTodo } from 'lucide-react';

export interface TaskBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  isLoading?: boolean;
  className?: string;
}

interface Column {
  id: TaskStatus;
  title: string;
}

const columns: Column[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export function TaskBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  isLoading = false,
  className = '',
}: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<number>(0);
  const [focusedTask, setFocusedTask] = useState<number>(-1);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const handleDragStart = (task: Task) => {
    setDraggingTask(task.id);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskMove(taskId, status);
    }
    setDragOverColumn(null);
    setDraggingTask(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentColumnTasks = getTasksByStatus(columns[focusedColumn].id);

    switch (e.key) {
      case 'h':
        e.preventDefault();
        setFocusedColumn((prev) => Math.max(0, prev - 1));
        setFocusedTask(-1);
        break;
      case 'l':
        e.preventDefault();
        setFocusedColumn((prev) => Math.min(columns.length - 1, prev + 1));
        setFocusedTask(-1);
        break;
      case 'j':
        e.preventDefault();
        setFocusedTask((prev) =>
          Math.min(currentColumnTasks.length - 1, prev + 1)
        );
        break;
      case 'k':
        e.preventDefault();
        setFocusedTask((prev) => Math.max(0, prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedTask >= 0 && currentColumnTasks[focusedTask]) {
          onTaskClick?.(currentColumnTasks[focusedTask]);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div
        data-testid="task-board"
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            data-testid={`column-${column.id}`}
            className="bg-muted/30 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton height="1.25rem" className="w-24" />
              <Skeleton height="1.25rem" className="w-6" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} height="100px" className="w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        data-testid="task-board"
        className={className}
      >
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ListTodo className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
          <p className="text-muted-foreground max-w-md">
            Tasks will appear here when you run{' '}
            <code className="text-primary">/tlc:plan</code> to create a phase plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="task-board"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 outline-none ${className}`}
    >
      {columns.map((column, colIndex) => {
        const columnTasks = getTasksByStatus(column.id);
        const isColumnFocused = focusedColumn === colIndex;
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            data-testid={`column-${column.id}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragEnter={() => setDragOverColumn(column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`
              bg-muted/30 rounded-lg p-4 min-h-[400px]
              transition-all
              ${isDragOver || (isColumnFocused && focusedTask === -1) ? 'ring-2 ring-primary' : ''}
            `}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{column.title}</h3>
              <span
                data-testid={`count-${column.id}`}
                className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full text-muted-foreground"
              >
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {columnTasks.map((task, taskIndex) => {
                const isTaskFocused = isColumnFocused && focusedTask === taskIndex;
                const isTaskDragging = draggingTask === task.id;

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    onDragStart={handleDragStart}
                    isDraggable
                    isDragging={isTaskDragging}
                    className={isTaskFocused ? 'ring-2 ring-primary' : ''}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
