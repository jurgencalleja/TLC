import { useEffect } from 'react';
import { ProjectGrid } from '../components/project/ProjectGrid';
import { useUIStore } from '../stores';
import { useProjects } from '../hooks';
import { Skeleton } from '../components/ui/Skeleton';

export function ProjectsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const { projects, loading, error, fetchProjects } = useProjects();

  useEffect(() => {
    setActiveView('projects');
    fetchProjects();
  }, [setActiveView, fetchProjects]);

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <p className="text-text-secondary mt-1">Manage your TLC projects</p>
        </div>
        <div className="text-danger p-4">Failed to load projects: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
        <p className="text-text-secondary mt-1">Manage your TLC projects</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <ProjectGrid
          projects={projects}
          isLoading={false}
        />
      )}
    </div>
  );
}
