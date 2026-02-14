import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitBranch, FolderOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useProject, useTasks, useRoadmap } from '../hooks';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';

export function DashboardPage() {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);

  // URL takes precedence; sync to store
  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  const { project, loading, fetchProject, fetchStatus } = useProject(projectId);
  const { fetchTasks } = useTasks(projectId);
  const { roadmap, loading: roadmapLoading } = useRoadmap(projectId);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  useEffect(() => {
    setActiveView('dashboard');
    fetchProject();
    fetchStatus();
    fetchTasks();
  }, [setActiveView, fetchProject, fetchStatus, fetchTasks, projectId]);

  const handleSelectProject = () => navigate('/projects');

  // Loading state
  if (loading || roadmapLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Empty state - no project selected
  if (!project) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No Project Selected
            </h2>
            <p className="text-text-secondary mb-6">
              Select a project to view its dashboard and start working.
            </p>
            <Button onClick={handleSelectProject}>
              Get Started
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Project selected but no TLC configured
  const hasNoTlcData = !project.hasTlc && !project.hasPlanning && (project.totalPhases ?? 0) === 0;

  if (hasNoTlcData) {
    return (
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {project.name}
            </h1>
            <p className="text-text-secondary mt-1">{project.path}</p>
          </div>
        </div>

        {/* Non-TLC banner */}
        <Card className="p-6">
          <div className="text-center">
            <p className="text-text-secondary mb-2">
              This project doesn&apos;t have TLC configured yet.
            </p>
            <p className="text-sm text-text-muted mb-4">
              Run <code className="px-1 py-0.5 bg-bg-tertiary rounded">/tlc:init</code> in the project directory to start tracking phases, tasks, and tests.
            </p>
            <p className="text-xs text-text-muted">
              Version: {project.version || 'unknown'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Status chip variant mapping
  const statusVariant = (status: string): 'success' | 'primary' | 'neutral' => {
    if (status === 'done') return 'success';
    if (status === 'in_progress') return 'primary';
    return 'neutral';
  };

  const toggleExpand = (phaseNum: number) => {
    setExpandedPhase((prev) => (prev === phaseNum ? null : phaseNum));
  };

  // Roadmap-derived data
  const completedPhases = roadmap?.completedPhases ?? 0;
  const totalPhases = roadmap?.totalPhases ?? 0;
  const totalTests = roadmap?.testSummary?.totalTests ?? 0;
  const totalFiles = roadmap?.testSummary?.totalFiles ?? 0;
  const currentPhaseNum = roadmap?.currentPhase?.number ?? 0;
  const projectInfo = roadmap?.projectInfo;
  const recentCommits = roadmap?.recentCommits ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 data-testid="project-name" className="text-2xl font-semibold text-text-primary">
              {projectInfo?.name ?? project.name}
            </h1>
            <span data-testid="project-version" className="text-sm text-text-secondary font-mono">
              v{projectInfo?.version ?? project.version ?? '0.0.0'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {roadmap?.currentPhase && (
              <p className="text-text-secondary">
                Phase {roadmap.currentPhase.number}: {roadmap.currentPhase.name}
              </p>
            )}
            {project.branch && (
              <span className="flex items-center gap-1 text-text-secondary text-sm">
                <GitBranch className="w-4 h-4" />
                {project.branch}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Phases</div>
          <div data-testid="stat-phases" className="text-3xl font-bold text-text-primary mt-2">
            {completedPhases}/{totalPhases}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Tests</div>
          <div data-testid="stat-tests" className="text-3xl font-bold text-success mt-2">
            {totalTests}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Test Files</div>
          <div data-testid="stat-files" className="text-3xl font-bold text-primary mt-2">
            {totalFiles}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Current Phase</div>
          <div data-testid="stat-current-phase" className="text-3xl font-bold text-text-primary mt-2">
            #{currentPhaseNum}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Roadmap */}
        <div className="space-y-4">
          <h3 className="font-medium text-text-primary">Roadmap</h3>
          {roadmap?.milestones.map((milestone) => (
            <div key={milestone.name}>
              <h4 data-testid="milestone-header" className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                {milestone.name}
              </h4>
              <div className="space-y-1">
                {milestone.phases.map((phase) => {
                  const isCurrent = roadmap.currentPhase?.number === phase.number;
                  const isExpanded = expandedPhase === phase.number;
                  return (
                    <div key={phase.number}>
                      <div
                        data-testid="phase-row"
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-bg-tertiary ${isCurrent ? 'current-phase bg-primary/5 border border-primary/20' : ''}`}
                        onClick={() => toggleExpand(phase.number)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-text-muted">{phase.number}.</span>
                          <span className="text-sm text-text-primary">{phase.name}</span>
                          <Badge
                            data-testid="phase-status"
                            variant={statusVariant(phase.status)}
                            size="sm"
                          >
                            {phase.status}
                          </Badge>
                        </div>
                        <span data-testid="phase-tasks" className="text-xs text-text-muted font-mono">
                          {phase.completedTaskCount}/{phase.taskCount}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="ml-6 pl-3 border-l border-border mt-1 mb-2">
                          <p data-testid="phase-goal" className="text-sm text-text-secondary mb-2">
                            {phase.goal}
                          </p>
                          <ul data-testid="phase-deliverables" className="space-y-1">
                            {phase.deliverables.map((d, i) => (
                              <li key={i} className="text-sm text-text-secondary flex items-center gap-2">
                                <span>{d.done ? '\u2713' : '\u25CB'}</span>
                                <span>{d.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Recent Commits */}
        <div>
          <h3 className="font-medium text-text-primary mb-4">Recent Activity</h3>
          <div data-testid="recent-commits" className="space-y-2">
            {recentCommits.length === 0 && (
              <p className="text-sm text-text-muted">No recent commits</p>
            )}
            {recentCommits.map((commit) => (
              <div key={commit.hash} className="flex items-start gap-2 text-sm">
                <code data-testid="commit-hash" className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                  {commit.hash.slice(0, 7)}
                </code>
                <span data-testid="commit-message" className="text-text-secondary truncate">
                  {commit.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
