import { useCallback } from 'react';
import { useProjectStore } from '../stores/project.store';
import { api } from '../api';

export function useProject(projectId?: string) {
  const { project, status, loading, error, setProject, setStatus, setLoading, setError } =
    useProjectStore();

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = projectId
        ? await api.projects.getById(projectId)
        : await api.project.getProject();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    }
  }, [projectId, setLoading, setProject, setError]);

  const fetchStatus = useCallback(async () => {
    try {
      const data = projectId
        ? await api.projects.getStatus(projectId)
        : await api.project.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, [projectId, setStatus, setError]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchProject(), fetchStatus()]);
  }, [fetchProject, fetchStatus]);

  return {
    project,
    status,
    loading,
    error,
    fetchProject,
    fetchStatus,
    refresh,
  };
}
