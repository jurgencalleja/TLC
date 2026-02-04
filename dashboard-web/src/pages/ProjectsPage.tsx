import { useEffect } from 'react';
import { ProjectGrid } from '../components/project/ProjectGrid';
import { useProject } from '../hooks';
import { useUIStore } from '../stores';

export function ProjectsPage() {
  const { project, status, loading, fetchProject, fetchStatus } = useProject();
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('projects');
    fetchProject();
    fetchStatus();
  }, [setActiveView, fetchProject, fetchStatus]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
        <p className="text-text-secondary mt-1">Manage your TLC projects</p>
      </div>

      <ProjectGrid
        project={project}
        status={status}
        loading={loading}
      />
    </div>
  );
}
