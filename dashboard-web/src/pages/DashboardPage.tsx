import { useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useProject, useTasks } from '../hooks';
import { useUIStore } from '../stores';

export function DashboardPage() {
  const { project, status, loading, fetchProject, fetchStatus } = useProject();
  const { tasks, fetchTasks } = useTasks();
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('dashboard');
    fetchProject();
    fetchStatus();
    fetchTasks();
  }, [setActiveView, fetchProject, fetchStatus, fetchTasks]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {project?.name || 'TLC Dashboard'}
          </h1>
          <p className="text-text-secondary mt-1">
            {project?.phaseName || 'Welcome to the Revolutionary Dashboard'}
          </p>
        </div>
        {project?.phase && (
          <Badge variant="primary" size="lg">
            Phase {project.phase}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Tests Passing</div>
          <div className="text-3xl font-bold text-success mt-2">
            {status?.testsPass ?? 0}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Tests Failing</div>
          <div className="text-3xl font-bold text-danger mt-2">
            {status?.testsFail ?? 0}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Coverage</div>
          <div className="text-3xl font-bold text-primary mt-2">
            {status?.coverage ?? 0}%
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-text-secondary">Current Phase</div>
          <div className="text-3xl font-bold text-text-primary mt-2">
            {project?.phase ?? '-'}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">Pending</h3>
            <Badge variant="warning">{pendingTasks}</Badge>
          </div>
          <div className="text-sm text-text-secondary">
            Tasks waiting to be started
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">In Progress</h3>
            <Badge variant="primary">{inProgressTasks}</Badge>
          </div>
          <div className="text-sm text-text-secondary">
            Tasks currently being worked on
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">Completed</h3>
            <Badge variant="success">{completedTasks}</Badge>
          </div>
          <div className="text-sm text-text-secondary">
            Tasks finished this phase
          </div>
        </Card>
      </div>
    </div>
  );
}
