import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Brain, Lightbulb, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useMemory } from '../hooks/useMemory';

export function MemoryPage() {
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

  const { decisions, gotchas, stats, loading, error } = useMemory(projectId);

  useEffect(() => {
    setActiveView('memory');
  }, [setActiveView]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const isEmpty = decisions.length === 0 && gotchas.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-semibold text-text-primary">Memory</h1>
          {stats && (
            <Badge variant="neutral">{stats.totalEntries} entries</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">{error}</div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{stats.totalEntries}</div>
            <div className="text-sm text-text-secondary">Total Entries</div>
          </Card>
          {stats.decisions != null && (
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">{stats.decisions}</div>
              <div className="text-sm text-text-secondary">Decisions</div>
            </Card>
          )}
          {stats.gotchas != null && (
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{stats.gotchas}</div>
              <div className="text-sm text-text-secondary">Gotchas</div>
            </Card>
          )}
          {stats.conversations != null && (
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-text-primary">{stats.conversations}</div>
              <div className="text-sm text-text-secondary">Conversations</div>
            </Card>
          )}
        </div>
      )}

      {isEmpty ? (
        <Card className="p-8" data-testid="empty-state">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">No memory entries found for this project.</p>
            <p className="text-text-muted text-sm mt-1">
              Decisions and gotchas are captured automatically during TLC sessions.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decisions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-medium text-text-primary">Decisions</h2>
              <Badge variant="neutral" size="sm">{decisions.length}</Badge>
            </div>
            <div className="space-y-2">
              {decisions.map((d) => (
                <Card key={d.id} className="p-3">
                  <p className="text-sm text-text-primary">{d.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {d.context && (
                      <Badge variant="info" size="sm">{d.context}</Badge>
                    )}
                    {d.timestamp && (
                      <span className="text-xs text-text-muted">{d.timestamp}</span>
                    )}
                  </div>
                </Card>
              ))}
              {decisions.length === 0 && (
                <p className="text-sm text-text-muted">No decisions recorded yet.</p>
              )}
            </div>
          </div>

          {/* Gotchas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-medium text-text-primary">Gotchas</h2>
              <Badge variant="warning" size="sm">{gotchas.length}</Badge>
            </div>
            <div className="space-y-2">
              {gotchas.map((g) => (
                <Card key={g.id} className="p-3 border-warning/30">
                  <p className="text-sm text-text-primary">{g.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {g.context && (
                      <Badge variant="warning" size="sm">{g.context}</Badge>
                    )}
                    {g.timestamp && (
                      <span className="text-xs text-text-muted">{g.timestamp}</span>
                    )}
                  </div>
                </Card>
              ))}
              {gotchas.length === 0 && (
                <p className="text-sm text-text-muted">No gotchas recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
