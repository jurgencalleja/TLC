import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useRoadmap, useTasks } from '../hooks';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import type { RoadmapPhase } from '../api/endpoints';

const statusIcon = (status: string) => {
  if (status === 'done' || status === 'completed') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-primary" />;
  return <Circle className="w-4 h-4 text-text-muted" />;
};

const statusVariant = (status: string): 'success' | 'primary' | 'neutral' => {
  if (status === 'done' || status === 'completed') return 'success';
  if (status === 'in_progress') return 'primary';
  return 'neutral';
};

const statusLabel = (status: string): string => {
  if (status === 'in_progress') return 'in progress';
  if (status === 'completed') return 'done';
  return status;
};

export function PhaseDetailPage() {
  const { projectId: urlProjectId, phaseNumber: phaseParam } = useParams<{
    projectId: string;
    phaseNumber: string;
  }>();
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  const phaseNumber = phaseParam ? parseInt(phaseParam, 10) : NaN;

  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  useEffect(() => {
    setActiveView('roadmap');
  }, [setActiveView]);

  const { roadmap, loading: roadmapLoading } = useRoadmap(projectId);
  const { tasks } = useTasks(projectId);

  const phase: RoadmapPhase | undefined = useMemo(() => {
    if (!roadmap || isNaN(phaseNumber)) return undefined;
    for (const milestone of roadmap.milestones) {
      const found = milestone.phases.find((p) => p.number === phaseNumber);
      if (found) return found;
    }
    return undefined;
  }, [roadmap, phaseNumber]);

  const phaseTasks = useMemo(() => {
    if (!tasks || isNaN(phaseNumber)) return [];
    return tasks.filter((t: any) => t.phase === phaseNumber);
  }, [tasks, phaseNumber]);

  if (roadmapLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="phase-detail-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="p-6" data-testid="phase-not-found">
        <Card className="p-8">
          <div className="text-center">
            <p className="text-text-secondary">Phase not found</p>
            <p className="text-sm text-text-muted mt-2">
              Phase {phaseParam} does not exist in this project's roadmap.
            </p>
            <Link
              to={projectId ? `/projects/${projectId}/roadmap` : '/roadmap'}
              className="text-sm text-primary mt-4 inline-block hover:underline"
              data-testid="back-to-roadmap"
            >
              Back to Roadmap
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const progress = phase.taskCount > 0
    ? Math.round((phase.completedTaskCount / phase.taskCount) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link
        to={projectId ? `/projects/${projectId}/roadmap` : '/roadmap'}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        data-testid="back-to-roadmap"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Roadmap
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">
          Phase {phase.number}: {phase.name}
        </h1>
        <Badge variant={statusVariant(phase.status)} data-testid="phase-status-badge">
          {statusLabel(phase.status)}
        </Badge>
        {phase.verified && <Badge variant="success">verified</Badge>}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>{phase.completedTaskCount}/{phase.taskCount} tasks complete ({progress}%)</span>
        {phase.hasTests && <span>{phase.testCount} tests / {phase.testFileCount} files</span>}
      </div>
      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Goal */}
      {phase.goal && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Goal</h3>
          <p className="text-sm text-text-primary">{phase.goal}</p>
        </Card>
      )}

      {/* Deliverables */}
      {phase.deliverables && phase.deliverables.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Deliverables</h3>
          <ul className="space-y-2">
            {phase.deliverables.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                {d.done ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-text-muted shrink-0" />
                )}
                <span className={d.done ? 'line-through opacity-60' : ''}>{d.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tasks */}
      <div>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-3">Tasks</h3>
        {phaseTasks.length === 0 ? (
          <p className="text-sm text-text-muted">No tasks found for this phase.</p>
        ) : (
          <div className="space-y-1">
            {phaseTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(task.status)}
                  <span className="text-sm font-medium text-text-primary">{task.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <Badge variant={statusVariant(task.status)} size="sm">
                    {statusLabel(task.status)}
                  </Badge>
                  {task.owner && <span>{task.owner}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
