import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useWorkspaceGroups } from '../hooks/useWorkspaceGroups';
import { Skeleton } from '../components/ui/Skeleton';
import { Search, FolderKanban, ArrowLeft, ChevronRight } from 'lucide-react';
import type { WorkspaceGroup } from '../api/endpoints';

export function ProjectsPage() {
  const navigate = useNavigate();
  const setActiveView = useUIStore((state) => state.setActiveView);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const { groups, loading, error } = useWorkspaceGroups();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<WorkspaceGroup | null>(null);

  useEffect(() => {
    setActiveView('projects');
  }, [setActiveView]);

  const filteredGroups = groups.filter((g) =>
    searchQuery
      ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.repos.some((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  const handleGroupClick = (group: WorkspaceGroup) => {
    if (group.repoCount === 1) {
      // Single-repo group — navigate directly
      const repo = group.repos[0]!;
      selectProject(repo.id);
      navigate(`/projects/${repo.id}`);
    } else {
      setExpandedGroup(group);
    }
  };

  const handleRepoClick = (repo: { id: string }) => {
    selectProject(repo.id);
    navigate(`/projects/${repo.id}`);
  };

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">Manage your TLC projects</p>
        </div>
        <div className="text-error p-4">Failed to load projects: {error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">Manage your TLC projects</p>
        </div>
        <div data-testid="loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Expanded group view — show repos within the selected workspace
  if (expandedGroup) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mb-6">
          <button
            data-testid="back-to-groups"
            onClick={() => setExpandedGroup(null)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Workspaces</span>
          </button>
          <h1 className="text-2xl font-semibold text-text-primary">{expandedGroup.name}</h1>
          <p className="text-text-secondary mt-1">{expandedGroup.repoCount} repositories</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expandedGroup.repos.map((repo) => (
            <div
              key={repo.id}
              onClick={() => handleRepoClick(repo)}
              className="p-4 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-text-primary truncate">{repo.name}</h3>
                <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
              </div>
              {repo.hasTlc && (
                <div className="flex items-center gap-2 text-sm">
                  <span data-testid="tlc-badge" className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">TLC</span>
                  {repo.phaseName && (
                    <span className="text-text-secondary">Phase {repo.phase}: {repo.phaseName}</span>
                  )}
                </div>
              )}
              {!repo.hasTlc && (
                <span className="text-sm text-text-muted">No TLC</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main workspace groups view
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
        <p className="text-text-secondary mt-1">Manage your TLC projects</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search workspaces and projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-bg-secondary border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div data-testid="empty-state" className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No workspaces found</h3>
          <p className="text-text-secondary max-w-md">
            Configure workspace roots in Settings to discover projects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.name}
              onClick={() => handleGroupClick(group)}
              className="p-5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FolderKanban className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{group.name}</h3>
                    <span data-testid={`group-count-${group.name}`} className="text-sm text-text-secondary">
                      {group.repoCount}
                    </span>
                    <span className="text-sm text-text-secondary"> {group.repoCount === 1 ? 'repo' : 'repos'}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted" />
              </div>

              <div className="flex items-center gap-2">
                {group.hasTlc && (
                  <span data-testid="tlc-badge" className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">TLC</span>
                )}
                {group.repos.some((r) => r.phaseName) && (
                  <span className="text-xs text-text-muted">
                    {group.repos.filter((r) => r.phaseName).length} active
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
