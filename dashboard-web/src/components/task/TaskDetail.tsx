import { X, User, CheckCircle, XCircle, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { Task } from './TaskCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface AcceptanceCriterion {
  id: string;
  text: string;
  completed: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'status_change' | 'comment' | 'assigned' | 'completed';
  user: string;
  message: string;
  timestamp: string;
}

export interface TaskDetailProps {
  task: Task;
  acceptanceCriteria: AcceptanceCriterion[];
  activity: ActivityItem[];
  onClose: () => void;
  onCriteriaToggle?: (criterionId: string, completed: boolean) => void;
  onClaim?: (taskId: string) => void;
  onRelease?: (taskId: string) => void;
  currentUserId?: string;
}

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

const priorityColors: Record<string, string> = {
  high: 'bg-error text-white',
  medium: 'bg-warning text-white',
  low: 'bg-info text-white',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TaskDetail({
  task,
  acceptanceCriteria,
  activity,
  onClose,
  onCriteriaToggle,
  onClaim,
  onRelease,
  currentUserId,
}: TaskDetailProps) {
  const canRelease = task.assignee?.id === currentUserId;
  const canClaim = !task.assignee;

  return (
    <div className="bg-surface border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="stopped">{statusLabels[task.status]}</Badge>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
            <span className="text-xs text-muted-foreground">Phase {task.phase}</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        )}

        {/* Assignee */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Assignee</h3>
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm text-primary font-medium">
                  {task.assignee.name[0]}
                </span>
              </div>
              <span className="text-sm text-foreground">{task.assignee.name}</span>
              {canRelease && onRelease && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRelease(task.id)}
                >
                  Release
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unassigned</span>
              {canClaim && onClaim && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onClaim(task.id)}
                >
                  Claim Task
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Test Status */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Test Status</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-foreground">{task.testStatus.passed} passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-error" />
              <span className="text-sm text-foreground">{task.testStatus.failed} failed</span>
            </div>
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            Acceptance Criteria ({acceptanceCriteria.filter((c) => c.completed).length}/
            {acceptanceCriteria.length})
          </h3>
          <div className="space-y-2">
            {acceptanceCriteria.map((criterion) => (
              <label
                key={criterion.id}
                className="flex items-start gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={criterion.completed}
                  onChange={(e) => onCriteriaToggle?.(criterion.id, e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <span
                  className={`text-sm ${
                    criterion.completed
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {criterion.text}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Activity</h3>
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.type === 'comment' ? (
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  ) : item.type === 'status_change' ? (
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <User className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.user}</span>{' '}
                    <span className="text-muted-foreground">{item.message}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
