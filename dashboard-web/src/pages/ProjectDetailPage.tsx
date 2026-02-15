import { useEffect } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { TabBar, type Tab } from '../components/layout/TabBar';
import { useWorkspaceStore } from '../stores/workspace.store';

const PROJECT_TABS: Tab[] = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'roadmap', label: 'Roadmap', path: 'roadmap' },
  { id: 'tasks', label: 'Tasks', path: 'tasks' },
  { id: 'tests', label: 'Tests', path: 'tests' },
  { id: 'bugs', label: 'Bugs', path: 'bugs' },
  { id: 'logs', label: 'Logs', path: 'logs' },
];

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const selectProject = useWorkspaceStore((s) => s.selectProject);
  const storeProjectId = useWorkspaceStore((s) => s.selectedProjectId);
  const navigate = useNavigate();

  // Sync URL project with store
  useEffect(() => {
    if (projectId && projectId !== storeProjectId) {
      selectProject(projectId);
    }
  }, [projectId, storeProjectId, selectProject]);

  // If no projectId, redirect to projects list
  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
    }
  }, [projectId, navigate]);

  if (!projectId) return null;

  const basePath = `/projects/${projectId}`;

  return (
    <div className="flex flex-col h-full" data-testid="project-detail">
      <TabBar tabs={PROJECT_TABS} basePath={basePath} />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
