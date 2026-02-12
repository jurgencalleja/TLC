import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, FileText, ListTodo, Settings, GitBranch, FolderOpen } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ActivityFeed, type ActivityItem } from '../components/team/ActivityFeed';
import { useProject, useTasks } from '../hooks';
import { useUIStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspace.store';
import { api } from '../api';

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

  const { project, status, loading, fetchProject, fetchStatus } = useProject(projectId);
  const { tasks, fetchTasks } = useTasks(projectId);
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [runningTests, setRunningTests] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setActivities([]);
    setActivitiesLoading(false);
  }, []);

  useEffect(() => {
    setActiveView('dashboard');
    fetchProject();
    fetchStatus();
    fetchTasks();
    if (projectId) {
      fetchActivities();
    } else {
      setActivities([]);
      setActivitiesLoading(false);
    }
  }, [setActiveView, fetchProject, fetchStatus, fetchTasks, fetchActivities, projectId]);

  // Calculate test totals
  const testsPass = status?.testsPass ?? 0;
  const testsFail = status?.testsFail ?? 0;
  const totalTests = testsPass + testsFail;
  const coverage = status?.coverage ?? 0;

  // Calculate task counts
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  // Phase progress
  const currentPhase = project?.phase ?? 0;
  const totalPhases = project?.totalPhases ?? 10;
  const phaseProgress = totalPhases > 0 ? (currentPhase / totalPhases) * 100 : 0;

  // Quick action handlers
  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      await api.commands.runCommand('test');
    } catch {
      // Test command fires and forgets
    } finally {
      setTimeout(() => setRunningTests(false), 2000);
    }
  };

  const handleViewLogs = () => navigate(projectId ? `/projects/${projectId}/logs` : '/logs');
  const handleViewTasks = () => navigate(projectId ? `/projects/${projectId}/tasks` : '/tasks');
  const handleSettings = () => navigate('/settings');
  const handleSelectProject = () => navigate('/projects');

  // Loading state
  if (loading) {
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
  const hasNoTlcData = !project.hasTlc && !project.hasPlanning && totalPhases === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {project.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {hasNoTlcData ? (
              <p className="text-text-secondary">{project.path}</p>
            ) : (
              <p className="text-text-secondary">
                {project.phaseName || `Phase ${project.phase}`}
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
        {!hasNoTlcData && (
          <Badge variant="primary" size="lg">
            Phase {project.phase}
          </Badge>
        )}
      </div>

      {/* Non-TLC project banner */}
      {hasNoTlcData && (
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
      )}

      {!hasNoTlcData && (
        <>
          {/* Phase Progress Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Phase Progress</span>
              <span className="text-sm text-text-secondary">
                {currentPhase} of {totalPhases} phases
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={currentPhase}
              aria-valuemin={0}
              aria-valuemax={totalPhases}
              className="h-2 bg-bg-tertiary rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${phaseProgress}%` }}
              />
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-text-secondary">Tests Passing</div>
              <div className="text-3xl font-bold text-success mt-2">
                {totalTests > 0 ? testsPass : '—'}
              </div>
              {totalTests === 0 && (
                <div className="text-xs text-text-muted mt-1">Run tests to see results</div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-text-secondary">Tests Failing</div>
              <div className="text-3xl font-bold text-danger mt-2">
                {totalTests > 0 ? testsFail : '—'}
              </div>
              {totalTests === 0 && (
                <div className="text-xs text-text-muted mt-1">No test results yet</div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-text-secondary">Coverage</div>
              <div className="text-3xl font-bold text-primary mt-2">
                {totalTests > 0 ? `${coverage}%` : '—'}
              </div>
              {totalTests === 0 && (
                <div className="text-xs text-text-muted mt-1">Not measured</div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-text-secondary">Total Tests</div>
              <div className="text-3xl font-bold text-text-primary mt-2">
                {totalTests > 0 ? totalTests : '—'}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {totalTests > 0 ? `${totalTests} total tests` : 'No test data available'}
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Task Summary & Quick Actions */}
            <div className="space-y-6">
              {/* Task Summary */}
              <Card className="p-4">
                <h3 className="font-medium text-text-primary mb-4">Task Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Pending</span>
                      <Badge variant="warning" size="sm">{pendingTasks}</Badge>
                    </div>
                    <div className="text-xs text-text-muted">Tasks waiting to be started</div>
                  </div>

                  <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">In Progress</span>
                      <Badge variant="primary" size="sm">{inProgressTasks}</Badge>
                    </div>
                    <div className="text-xs text-text-muted">Tasks being worked on</div>
                  </div>

                  <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Completed</span>
                      <Badge variant="success" size="sm">{completedTasks}</Badge>
                    </div>
                    <div className="text-xs text-text-muted">Tasks finished</div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="font-medium text-text-primary mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="primary"
                    onClick={handleRunTests}
                    loading={runningTests}
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Run Tests
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleViewLogs}
                    leftIcon={<FileText className="w-4 h-4" />}
                  >
                    View Logs
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleViewTasks}
                    leftIcon={<ListTodo className="w-4 h-4" />}
                  >
                    View Tasks
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSettings}
                    leftIcon={<Settings className="w-4 h-4" />}
                  >
                    Settings
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Column - Activity Feed */}
            <div>
              <h3 className="font-medium text-text-primary mb-4">Recent Activity</h3>
              {activitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <ActivityFeed
                  activities={activities.slice(0, 5)}
                  data-testid="activity-feed"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
