import { useCallback, useState } from 'react';
import { api } from '../api';

export interface Project {
  id: string;
  name: string;
  description?: string;
  branch: string;
  status: 'healthy' | 'failing' | 'building' | 'unknown';
  tests: { passed: number; failed: number; total: number };
  coverage: number;
  lastActivity: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLocalLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const data = await api.project.getProject();
      const project: Project = {
        id: data.name ?? 'default',
        name: data.name,
        description: data.description,
        branch: data.branch ?? 'main',
        status: 'healthy',
        tests: { passed: 0, failed: 0, total: 0 },
        coverage: 0,
        lastActivity: new Date().toISOString(),
      };
      setProjects([project]);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    refresh,
  };
}
