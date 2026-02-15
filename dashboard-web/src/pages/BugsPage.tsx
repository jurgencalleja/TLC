import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Bug, Plus, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useBugs } from '../hooks/useBugs';

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'open' | 'fixed' | 'closed';

const SEVERITY_COLORS: Record<SeverityLevel, 'danger' | 'warning' | 'neutral' | 'info'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'neutral',
  low: 'info',
};

export function BugsPage() {
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

  const { bugs, loading, error, fetchBugs, createBug, updateBugStatus } = useBugs(projectId);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedBug, setExpandedBug] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', severity: 'medium' as SeverityLevel, description: '', url: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActiveView('bugs');
    fetchBugs();
  }, [setActiveView, fetchBugs, projectId]);

  const filteredBugs = useMemo(() => {
    if (statusFilter === 'all') return bugs;
    return bugs.filter((b) => b.status === statusFilter);
  }, [bugs, statusFilter]);

  const openCount = useMemo(() => bugs.filter((b) => b.status === 'open').length, [bugs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;
    setSubmitting(true);
    try {
      await createBug({
        title: formData.title,
        severity: formData.severity,
        description: formData.description,
        url: formData.url || undefined,
      });
      setFormData({ title: '', severity: 'medium', description: '', url: '' });
      setShowForm(false);
    } catch {
      // Error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (bugId: string, newStatus: string) => {
    try {
      await updateBugStatus(bugId, newStatus);
    } catch {
      // Error handled by hook
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-primary">Bugs</h1>
          {openCount > 0 && (
            <Badge data-testid="open-count" variant="danger">{openCount} open</Badge>
          )}
        </div>
        <Button
          data-testid="report-bug-btn"
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Report Bug
        </Button>
      </div>

      {error && (
        <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">{error}</div>
      )}

      {/* Bug Report Form */}
      {showForm && (
        <Card className="p-6" data-testid="bug-form">
          <h2 className="text-lg font-medium text-text-primary mb-4">Report a Bug</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bug-title" className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
              <input
                id="bug-title"
                data-testid="bug-title-input"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief summary of the bug"
              />
            </div>
            <div>
              <label htmlFor="bug-severity" className="block text-sm font-medium text-text-secondary mb-1">Severity *</label>
              <select
                id="bug-severity"
                data-testid="bug-severity-select"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as SeverityLevel })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="bug-description" className="block text-sm font-medium text-text-secondary mb-1">Steps to Reproduce *</label>
              <textarea
                id="bug-description"
                data-testid="bug-description-input"
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1. Go to...\n2. Click on...\n3. Observe..."
              />
            </div>
            <div>
              <label htmlFor="bug-url" className="block text-sm font-medium text-text-secondary mb-1">URL (optional)</label>
              <input
                id="bug-url"
                data-testid="bug-url-input"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="http://localhost:3000/page-with-bug"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" loading={submitting} disabled={!formData.title || !formData.description}>
                Submit Bug Report
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2" data-testid="status-filters">
        {(['all', 'open', 'fixed', 'closed'] as const).map((s) => (
          <button
            key={s}
            data-testid={`filter-${s}`}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusFilter === s
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-tertiary'
            }`}
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Bug List */}
      {filteredBugs.length === 0 ? (
        <Card className="p-8" data-testid="empty-state">
          <div className="text-center">
            <Bug className="w-12 h-12 mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">
              {statusFilter === 'all' ? 'No bugs reported yet' : `No ${statusFilter} bugs`}
            </p>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => setShowForm(true)}
            >
              Report a Bug
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredBugs.map((bug) => {
            const isExpanded = expandedBug === bug.id;
            const severity = (bug.severity || 'medium') as SeverityLevel;
            return (
              <div key={bug.id} data-testid="bug-card">
                <div
                  className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg cursor-pointer hover:bg-bg-tertiary transition-colors"
                  onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                    <span className="font-mono text-xs text-text-muted" data-testid="bug-id">{bug.id}</span>
                    <span className="font-medium text-text-primary" data-testid="bug-title">{bug.description || bug.id}</span>
                    <Badge variant={SEVERITY_COLORS[severity]} size="sm" data-testid="bug-severity">
                      {severity}
                    </Badge>
                  </div>
                  <Badge
                    variant={bug.status === 'open' ? 'warning' : bug.status === 'fixed' ? 'success' : 'neutral'}
                    size="sm"
                    data-testid="bug-status"
                  >
                    {bug.status}
                  </Badge>
                </div>

                {isExpanded && (
                  <div className="ml-10 mt-2 mb-3 p-4 bg-bg-tertiary rounded-lg space-y-3">
                    <p className="text-sm text-text-secondary whitespace-pre-line">{bug.description}</p>
                    {bug.createdAt && (
                      <p className="text-xs text-text-muted">Reported: {bug.createdAt}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {bug.status === 'open' && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleStatusChange(bug.id, 'fixed')}>
                            Mark Fixed
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleStatusChange(bug.id, 'closed')}>
                            Close
                          </Button>
                        </>
                      )}
                      {bug.status === 'fixed' && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(bug.id, 'closed')}>
                          Close
                        </Button>
                      )}
                      {bug.status === 'closed' && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(bug.id, 'open')}>
                          Reopen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<ExternalLink className="w-3 h-3" />}
                        onClick={() => {
                          navigator.clipboard.writeText(`tlc://discuss?bug=${bug.id}`);
                        }}
                      >
                        Discuss in CLI
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
