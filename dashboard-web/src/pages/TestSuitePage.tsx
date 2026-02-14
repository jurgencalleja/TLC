import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useTestSuite } from '../hooks';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';

export function TestSuitePage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  // URL takes precedence; sync to store
  const projectId = urlProjectId ?? storeProjectId ?? undefined;
  useEffect(() => {
    if (urlProjectId && urlProjectId !== storeProjectId) {
      selectProject(urlProjectId);
    }
  }, [urlProjectId, storeProjectId, selectProject]);

  useEffect(() => {
    setActiveView('test-suite');
  }, [setActiveView]);

  const { inventory, loading, runTests } = useTestSuite(projectId);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [runningTests, setRunningTests] = useState(false);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    if (!inventory?.groups) return [];
    const groups = [...inventory.groups];

    // Filter by search query
    const filtered = searchQuery
      ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : groups;

    // Sort by test count descending
    return filtered.sort((a, b) => b.testCount - a.testCount);
  }, [inventory?.groups, searchQuery]);

  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      await runTests();
    } catch {
      // fire and forget
    } finally {
      setRunningTests(false);
    }
  };

  const handleToggleGroup = (groupName: string) => {
    setExpandedGroup((prev) => (prev === groupName ? null : groupName));
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="loading-skeleton">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!inventory || (inventory.totalFiles === 0 && inventory.groups.length === 0)) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Test Suite</h1>
          <Button
            data-testid="run-tests-btn"
            variant="primary"
            onClick={handleRunTests}
            loading={runningTests}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Run Tests
          </Button>
        </div>
        <Card className="p-8" data-testid="empty-state">
          <div className="text-center">
            <p className="text-text-secondary text-lg">No test files found</p>
            <p className="text-text-muted text-sm mt-2">
              Add test files to your project to see them here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    return (ms / 1000).toFixed(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Test Suite</h1>
        <Button
          data-testid="run-tests-btn"
          variant="primary"
          onClick={handleRunTests}
          loading={runningTests}
          leftIcon={<Play className="w-4 h-4" />}
        >
          Run Tests
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Files</div>
          <div className="text-3xl font-bold text-text-primary mt-1" data-testid="summary-files">
            {inventory.totalFiles}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Tests</div>
          <div className="text-3xl font-bold text-text-primary mt-1" data-testid="summary-tests">
            {inventory.totalTests}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Groups</div>
          <div className="text-3xl font-bold text-text-primary mt-1" data-testid="summary-groups">
            {inventory.groups.length}
          </div>
        </Card>
      </div>

      {/* Last Run Results */}
      {inventory.lastRun && (
        <Card className="p-4" data-testid="last-run">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-secondary">Last Run:</span>
            <Badge variant="success">{inventory.lastRun.passed} passed</Badge>
            <Badge variant="danger">{inventory.lastRun.failed} failed</Badge>
            <span className="text-text-muted">
              ({formatDuration(inventory.lastRun.duration)}s)
            </span>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search test files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroup === group.name;
          return (
            <div key={group.name}>
              <div
                data-testid="group-row"
                className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg cursor-pointer hover:bg-bg-tertiary transition-colors"
                onClick={() => handleToggleGroup(group.name)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  )}
                  <span className="font-medium text-text-primary" data-testid="group-name">
                    {group.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span data-testid="group-files">{group.fileCount} files</span>
                  <span data-testid="group-tests">{group.testCount} tests</span>
                </div>
              </div>

              {/* Expanded file list */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {group.files.map((file) => (
                    <div
                      key={file.relativePath}
                      data-testid="file-row"
                      className="flex items-center justify-between p-2 text-sm rounded hover:bg-bg-tertiary"
                    >
                      <span className="text-text-secondary" data-testid="file-name">
                        {file.relativePath}
                      </span>
                      <span className="text-text-muted" data-testid="file-tests">
                        {file.testCount} tests
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
