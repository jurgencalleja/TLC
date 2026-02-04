import { useCallback } from 'react';
import { useProjectStore } from '../stores/project.store';
import { api } from '../api';

export function useProject() {
  const { project, status, loading, error, setProject, setStatus, setLoading, setError } =
    useProjectStore();

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.project.getProject();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    }
  }, [setLoading, setProject, setError]);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.project.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, [setStatus, setError]);

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
