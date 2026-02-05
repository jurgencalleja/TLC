import { useEffect, useState } from 'react';
import { ProjectGrid } from '../components/project/ProjectGrid';
import { useUIStore } from '../stores';
import type { Project } from '../components/project/ProjectCard';

// Mock data - will be replaced with API calls
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'TLC Dashboard',
    description: 'Revolutionary TLC Dashboard v2.0',
    status: 'healthy',
    branch: 'main',
    tests: { passed: 801, failed: 0, total: 801 },
    coverage: 85,
    lastActivity: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'TLC Server',
    description: 'Backend API server',
    status: 'healthy',
    branch: 'main',
    tests: { passed: 245, failed: 0, total: 245 },
    coverage: 78,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
  },
];

export function ProjectsPage() {
  const setActiveView = useUIStore((state) => state.setActiveView);
  const [projects] = useState<Project[]>(mockProjects);
  const [isLoading] = useState(false);

  useEffect(() => {
    setActiveView('projects');
  }, [setActiveView]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
        <p className="text-text-secondary mt-1">Manage your TLC projects</p>
      </div>

      <ProjectGrid
        projects={projects}
        isLoading={isLoading}
      />
    </div>
  );
}
