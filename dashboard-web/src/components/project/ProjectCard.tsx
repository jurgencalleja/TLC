import { Link } from 'react-router-dom';
import { GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';

export type ProjectStatus = 'healthy' | 'failing' | 'building' | 'unknown';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  branch: string;
  tests: {
    passed: number;
    failed: number;
    total: number;
  };
  coverage: number;
  lastActivity: string;
}

export interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  className?: string;
}

const statusColors: Record<ProjectStatus, string> = {
  healthy: 'bg-success',
  failing: 'bg-error',
  building: 'bg-warning',
  unknown: 'bg-muted',
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

export function ProjectCard({ project, onClick, className = '' }: ProjectCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(project);
    }
  };

  const content = (
    <div
      data-testid="project-card"
      className={`
        p-4 bg-surface border border-border rounded-lg
        hover:border-primary/50 hover:shadow-md
        transition-all cursor-pointer
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              data-testid="status-indicator"
              className={`w-2 h-2 rounded-full ${statusColors[project.status]}`}
            />
            <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
          </div>
          <p
            data-testid="project-description"
            className="text-sm text-muted-foreground mt-1 line-clamp-2"
          >
            {project.description || 'No description'}
          </p>
        </div>
      </div>

      {/* Branch */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <GitBranch className="w-4 h-4" />
        <span>{project.branch}</span>
      </div>

      {/* Test Stats */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1 text-sm">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-success font-medium">{project.tests.passed}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <XCircle className="w-4 h-4 text-error" />
          <span className="text-error font-medium">{project.tests.failed}</span>
        </div>
      </div>

      {/* Coverage */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Coverage</span>
          <span className="font-medium text-foreground">{project.coverage}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            data-testid="coverage-bar"
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${project.coverage}%` }}
          />
        </div>
      </div>

      {/* Last Activity */}
      <div
        data-testid="last-activity"
        className="flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Clock className="w-3 h-3" />
        <span>{formatRelativeTime(project.lastActivity)}</span>
      </div>
    </div>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link to={`/project/${project.id}`} className="block">
      {content}
    </Link>
  );
}
