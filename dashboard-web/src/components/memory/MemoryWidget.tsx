import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useMemory } from '../../hooks/useMemory';
import { useWorkspaceStore } from '../../stores/workspace.store';

export function MemoryWidget() {
  const projectId = useWorkspaceStore((s) => s.selectedProjectId) ?? undefined;
  const { decisions, stats, loading } = useMemory(projectId);

  if (loading) {
    return (
      <Card className="p-4" data-testid="widget-loading">
        <Skeleton className="h-6 w-32 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
    );
  }

  const totalEntries = stats?.totalEntries ?? 0;
  const healthStatus = totalEntries > 0 ? 'healthy' : 'empty';
  const recentDecisions = decisions.slice(0, 3);
  const memoryPath = projectId ? `/projects/${projectId}/memory` : '/memory';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Memory</h3>
        </div>
        <div
          data-testid="memory-health"
          data-status={healthStatus}
          className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-success' : 'bg-danger'}`}
        />
      </div>

      <p className="text-2xl font-bold text-text-primary">{totalEntries}</p>
      <p className="text-xs text-text-muted mb-3">memories indexed</p>

      {recentDecisions.length > 0 && (
        <div className="space-y-1 mb-3">
          {recentDecisions.map((d) => (
            <p key={d.id} className="text-xs text-text-secondary truncate">
              {d.text}
            </p>
          ))}
        </div>
      )}

      <Link
        to={memoryPath}
        className="text-xs text-accent hover:underline"
      >
        View All
      </Link>
    </Card>
  );
}
