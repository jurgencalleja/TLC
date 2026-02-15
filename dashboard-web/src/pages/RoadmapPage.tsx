import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useRoadmap } from '../hooks';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import type { RoadmapPhase } from '../api/endpoints';

const statusIcon = (status: string) => {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-primary" />;
  return <Circle className="w-4 h-4 text-text-muted" />;
};

const statusVariant = (status: string): 'success' | 'primary' | 'neutral' => {
  if (status === 'done') return 'success';
  if (status === 'in_progress') return 'primary';
  return 'neutral';
};

export function RoadmapPage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  const { roadmap, loading } = useRoadmap(projectId);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [collapseAll, setCollapseAll] = useState(false);

  useEffect(() => {
    setActiveView('roadmap');
  }, [setActiveView]);

  // Auto-expand current phase
  useEffect(() => {
    if (roadmap?.currentPhase) {
      setExpandedPhases(new Set([roadmap.currentPhase.number]));
    }
  }, [roadmap?.currentPhase]);

  const togglePhase = (num: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const handleCollapseAll = () => {
    if (collapseAll) {
      // Expand all
      const allNums = new Set<number>();
      roadmap?.milestones.forEach((m) => m.phases.forEach((p) => allNums.add(p.number)));
      setExpandedPhases(allNums);
    } else {
      setExpandedPhases(new Set());
    }
    setCollapseAll(!collapseAll);
  };

  const progressPercent = useMemo(() => {
    if (!roadmap?.totalPhases) return 0;
    return Math.round((roadmap.completedPhases / roadmap.totalPhases) * 100);
  }, [roadmap]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (!roadmap || roadmap.milestones.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-8" data-testid="empty-state">
          <div className="text-center">
            <p className="text-text-secondary">No roadmap data available</p>
            <p className="text-sm text-text-muted mt-2">
              This project may not have a ROADMAP.md file configured.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Roadmap</h1>
          <p className="text-sm text-text-secondary mt-1">
            {roadmap.completedPhases}/{roadmap.totalPhases} phases complete ({progressPercent}%)
          </p>
        </div>
        <Button variant="ghost" onClick={handleCollapseAll} data-testid="collapse-all-btn">
          {collapseAll ? 'Expand All' : 'Collapse All'}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-success rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
          data-testid="progress-bar"
        />
      </div>

      {/* Milestones */}
      {roadmap.milestones.map((milestone) => (
        <div key={milestone.name}>
          <h2
            data-testid="milestone-header"
            className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 mt-6"
          >
            {milestone.name}
          </h2>

          <div className="space-y-1">
            {milestone.phases.map((phase: RoadmapPhase) => {
              const isExpanded = expandedPhases.has(phase.number);
              const isCurrent = roadmap.currentPhase?.number === phase.number;
              const progress = phase.taskCount > 0
                ? Math.round((phase.completedTaskCount / phase.taskCount) * 100)
                : 0;

              return (
                <div key={phase.number}>
                  {/* Phase Row */}
                  <div
                    data-testid="phase-row"
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-bg-tertiary transition-colors ${
                      isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-bg-secondary'
                    }`}
                    onClick={() => togglePhase(phase.number)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                      {statusIcon(phase.status)}
                      <span className="font-mono text-sm text-text-muted">{phase.number}.</span>
                      <span className="text-sm font-medium text-text-primary">{phase.name}</span>
                      <Badge variant={statusVariant(phase.status)} size="sm" data-testid="phase-status">
                        {phase.status === 'in_progress' ? 'in progress' : phase.status}
                      </Badge>
                      {phase.verified && (
                        <Badge variant="success" size="sm">verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span data-testid="phase-tasks">{phase.completedTaskCount}/{phase.taskCount} tasks</span>
                      {phase.hasTests && <span data-testid="phase-tests">{phase.testCount} tests</span>}
                      {/* Mini progress bar */}
                      <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Phase Detail */}
                  {isExpanded && (
                    <div className="ml-10 mt-2 mb-3 p-4 bg-bg-tertiary rounded-lg space-y-4" data-testid="phase-detail">
                      {/* Goal */}
                      {phase.goal && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary uppercase mb-1">Goal</h4>
                          <p data-testid="phase-goal" className="text-sm text-text-primary">{phase.goal}</p>
                        </div>
                      )}

                      {/* Deliverables */}
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-text-secondary uppercase mb-1">Deliverables</h4>
                          <ul data-testid="phase-deliverables" className="space-y-1">
                            {phase.deliverables.map((d, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                                {d.done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                )}
                                <span className={d.done ? 'line-through opacity-60' : ''}>{d.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Task Count Summary */}
                      <div className="flex items-center gap-4 text-xs text-text-muted pt-2 border-t border-border">
                        <span>{phase.taskCount} tasks total</span>
                        <span>{phase.completedTaskCount} completed</span>
                        {phase.hasTests && <span>{phase.testCount} tests / {phase.testFileCount} files</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
