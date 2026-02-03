import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, ListTodo, TestTube, ScrollText, Settings } from 'lucide-react';
import { Project, ProjectStatus } from './ProjectCard';
import { BranchSelector, Branch } from './BranchSelector';
import { Badge } from '../ui/Badge';
import { Skeleton, SkeletonText } from '../ui/Skeleton';

export interface ProjectDetailProps {
  project: Project;
  branches: Branch[];
  onBranchChange?: (branchName: string) => void;
  isLoading?: boolean;
  className?: string;
}

type TabId = 'overview' | 'tasks' | 'tests' | 'logs' | 'settings';

const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'tests', label: 'Tests', icon: TestTube },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const statusLabels: Record<ProjectStatus, string> = {
  healthy: 'Healthy',
  failing: 'Failing',
  building: 'Building',
  unknown: 'Unknown',
};

const statusVariants: Record<ProjectStatus, 'running' | 'error' | 'building' | 'stopped'> = {
  healthy: 'running',
  failing: 'error',
  building: 'building',
  unknown: 'stopped',
};

export function ProjectDetail({
  project,
  branches,
  onBranchChange,
  isLoading = false,
  className = '',
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      tabRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      tabRefs.current[prevIndex]?.focus();
    }
  };

  if (isLoading) {
    return (
      <div data-testid="project-detail" className={className}>
        <div className="flex items-center gap-4 mb-6">
          <Skeleton variant="circular" width="32px" height="32px" />
          <Skeleton height="2rem" className="w-48" />
        </div>
        <SkeletonText lines={3} />
      </div>
    );
  }

  return (
    <div data-testid="project-detail" className={className}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/"
              aria-label="Back to projects"
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge
              data-testid="status-badge"
              variant={statusVariants[project.status]}
            >
              {statusLabels[project.status]}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground ml-9">{project.description}</p>
          )}
        </div>
        <BranchSelector
          branches={branches}
          currentBranch={project.branch}
          onBranchChange={(branch) => onBranchChange?.(branch)}
          showSearch={branches.length > 5}
        />
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        className="flex border-b border-border mb-6"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[index] = el)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                flex items-center gap-2 px-4 py-3
                text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div
          id="overview-panel"
          data-testid="overview-panel"
          role="tabpanel"
          aria-labelledby="overview-tab"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Test Stats Card */}
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Test Results
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {project.tests.passed}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-error" />
                  <div>
                    <div className="text-2xl font-bold text-error">
                      {project.tests.failed}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Card */}
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Coverage
              </h3>
              <div className="text-3xl font-bold text-foreground mb-2">
                {project.coverage}%
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${project.coverage}%` }}
                />
              </div>
            </div>

            {/* Activity Card */}
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Last Activity
              </h3>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">
                  {new Date(project.lastActivity).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div
          id="tasks-panel"
          data-testid="tasks-panel"
          role="tabpanel"
          aria-labelledby="tasks-tab"
        >
          <p className="text-muted-foreground">Task board will be implemented in Phase 42</p>
        </div>
      )}

      {activeTab === 'tests' && (
        <div
          id="tests-panel"
          data-testid="tests-panel"
          role="tabpanel"
          aria-labelledby="tests-tab"
        >
          <p className="text-muted-foreground">Test results will be implemented in Phase 47</p>
        </div>
      )}

      {activeTab === 'logs' && (
        <div
          id="logs-panel"
          data-testid="logs-panel"
          role="tabpanel"
          aria-labelledby="logs-tab"
        >
          <p className="text-muted-foreground">Log viewer will be implemented in Phase 43</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div
          id="settings-panel"
          data-testid="settings-panel"
          role="tabpanel"
          aria-labelledby="settings-tab"
        >
          <p className="text-muted-foreground">Settings will be implemented in Phase 45</p>
        </div>
      )}
    </div>
  );
}
