import { User, TestTube } from 'lucide-react';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface TaskTestStatus {
  passed: number;
  failed: number;
  total: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: TaskAssignee;
  testStatus: TaskTestStatus;
  phase: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onDragStart?: (task: Task) => void;
  isDraggable?: boolean;
  isDragging?: boolean;
  className?: string;
}

const priorityClasses: Record<TaskPriority, string> = {
  high: 'bg-error text-white',
  medium: 'bg-warning text-white',
  low: 'bg-info text-white',
};

export function TaskCard({
  task,
  onClick,
  onDragStart,
  isDraggable = false,
  isDragging = false,
  className = '',
}: TaskCardProps) {
  const handleClick = () => {
    onClick?.(task);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer?.setData('text/plain', task.id);
    onDragStart?.(task);
  };

  const testIndicatorClass =
    task.testStatus.total === 0
      ? 'bg-muted'
      : task.testStatus.failed > 0
      ? 'bg-error'
      : 'bg-success';

  return (
    <div
      data-testid="task-card"
      onClick={handleClick}
      onDragStart={handleDragStart}
      draggable={isDraggable}
      className={`
        p-3 bg-surface border border-border rounded-lg
        hover:border-primary/50 hover:shadow-sm
        transition-all cursor-pointer
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-foreground text-sm line-clamp-2">
          {task.title}
        </h4>
        <span
          data-testid="priority-badge"
          className={`
            px-1.5 py-0.5 text-xs font-medium rounded
            ${priorityClasses[task.priority]}
          `}
        >
          {task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <>
              {task.assignee.avatar ? (
                <img
                  data-testid="assignee-avatar"
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div
                  data-testid="assignee-avatar"
                  className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <span className="text-xs text-primary font-medium">
                    {task.assignee.name[0]}
                  </span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {task.assignee.name}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-xs">Unassigned</span>
            </div>
          )}
        </div>

        {/* Test Status & Phase */}
        <div className="flex items-center gap-3">
          <div
            data-testid="test-status"
            className="flex items-center gap-1"
          >
            <div
              data-testid="test-indicator"
              className={`w-2 h-2 rounded-full ${testIndicatorClass}`}
            />
            <TestTube className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {task.testStatus.passed}/{task.testStatus.total}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Phase {task.phase}
          </span>
        </div>
      </div>
    </div>
  );
}
