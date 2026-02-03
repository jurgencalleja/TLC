import { useState } from 'react';
import { ClipboardCheck, FileCode, Clock, CheckCircle2, User } from 'lucide-react';
import { Badge } from '../ui/Badge';

export type QATaskType = 'verification' | 'test_review';
export type QATaskStatus = 'pending' | 'in_progress' | 'completed';

export interface QATask {
  id: string;
  type: QATaskType;
  title: string;
  phase: string;
  requestedBy: string;
  createdAt: string;
  status: QATaskStatus;
}

export interface QATaskQueueProps {
  tasks: QATask[];
  onTaskSelect: (task: QATask) => void;
  className?: string;
}

const taskTypeIcons: Record<QATaskType, React.ReactNode> = {
  verification: <ClipboardCheck className="w-4 h-4" />,
  test_review: <FileCode className="w-4 h-4" />,
};

const statusColors: Record<QATaskStatus, string> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
};

export function QATaskQueue({
  tasks,
  onTaskSelect,
  className = '',
}: QATaskQueueProps) {
  const [typeFilter, setTypeFilter] = useState<QATaskType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<QATaskStatus | 'all'>('all');

  const filteredTasks = tasks.filter((task) => {
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    return true;
  });

  if (tasks.length === 0) {
    return (
      <div
        data-testid="qa-task-queue"
        className={`bg-surface border border-border rounded-lg p-6 ${className}`}
      >
        <div data-testid="empty-state" className="text-center text-muted-foreground">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No tasks in queue</h3>
          <p>Verification tasks will appear here when developers run /tlc:verify</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="qa-task-queue"
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">QA Task Queue</h2>
          <Badge data-testid="task-count" variant="secondary">
            {tasks.length}
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            data-testid="filter-verification"
            onClick={() => setTypeFilter(typeFilter === 'verification' ? 'all' : 'verification')}
            className={`px-2 py-1 text-xs rounded ${
              typeFilter === 'verification' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Verification
          </button>
          <button
            data-testid="filter-test_review"
            onClick={() => setTypeFilter(typeFilter === 'test_review' ? 'all' : 'test_review')}
            className={`px-2 py-1 text-xs rounded ${
              typeFilter === 'test_review' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Test Review
          </button>
          <button
            data-testid="filter-completed"
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={`px-2 py-1 text-xs rounded ${
              statusFilter === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-border">
        {filteredTasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onTaskSelect(task)}
            className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-0.5">
                {taskTypeIcons[task.type]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{task.title}</span>
                  <Badge variant={statusColors[task.status] as 'success' | 'warning' | 'info'} size="sm">
                    {task.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{task.phase}</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.requestedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
