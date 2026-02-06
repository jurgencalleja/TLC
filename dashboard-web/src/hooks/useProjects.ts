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
      const [data, status] = await Promise.all([
        api.project.getProject(),
        api.project.getStatus().catch(() => null),
      ]);

      const testsPass = status?.testsPass ?? 0;
      const testsFail = status?.testsFail ?? 0;
      const coverage = status?.coverage ?? 0;

      const project: Project = {
        id: data.name ?? 'default',
        name: data.name,
        description: data.description,
        branch: data.branch ?? 'main',
        status: testsFail > 0 ? 'failing' : 'healthy',
        tests: { passed: testsPass, failed: testsFail, total: testsPass + testsFail },
        coverage,
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
