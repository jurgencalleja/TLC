import { useCallback } from 'react';
import { useProjectStore } from '../stores/project.store';
import { api } from '../api';

export function useProject(projectId?: string) {
  const { project, status, loading, error, setProject, setStatus, setLoading, setError } =
    useProjectStore();

  const fetchProject = useCallback(async () => {
    setProject(null);
    setStatus(null);
    setLoading(true);
    try {
      if (projectId) {
        // Workspace mode: merge project + status into expected shapes
        const [projectData, statusData] = await Promise.all([
          api.projects.getById(projectId),
          api.projects.getStatus(projectId).catch(() => null),
        ]);
        const s = statusData as any;
        setProject({
          name: (projectData as any).name ?? 'Unknown',
          phase: s?.currentPhase ?? 0,
          phaseName: s?.phaseName ?? undefined,
          totalPhases: s?.totalPhases ?? 0,
        });
        setStatus({
          phase: s?.currentPhase ?? 0,
          testsPass: s?.testsPass ?? 0,
          testsFail: s?.testsFail ?? 0,
          coverage: s?.coverage ?? 0,
        });
      } else {
        const data = await api.project.getProject();
        setProject(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    }
  }, [projectId, setLoading, setProject, setStatus, setError]);

  const fetchStatus = useCallback(async () => {
    if (projectId) return; // Already fetched in fetchProject for workspace mode
    try {
      const data = await api.project.getStatus();
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
