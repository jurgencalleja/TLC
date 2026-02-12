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
      if (!projectId) {
        setLoading(false);
        return;
      }
      // Workspace mode: merge project + status into expected shapes
      const [projectData, statusData] = await Promise.all([
        api.projects.getById(projectId),
        api.projects.getStatus(projectId).catch(() => null),
      ]);

      const mergedPhase =
        statusData?.currentPhase ?? projectData.phase ?? 0;
      const mergedPhaseName =
        statusData?.phaseName ?? projectData.phaseName ?? undefined;
      const mergedTotalPhases =
        statusData?.totalPhases ?? projectData.totalPhases ?? 0;
      const mergedCompletedPhases =
        statusData?.completedPhases ?? projectData.completedPhases ?? 0;

      setProject({
        id: projectData.id,
        name: projectData.name ?? 'Unknown',
        path: projectData.path,
        hasTlc: projectData.hasTlc,
        hasPlanning: projectData.hasPlanning,
        version: projectData.version,
        phase: mergedPhase,
        phaseName: mergedPhaseName,
        totalPhases: mergedTotalPhases,
        completedPhases: mergedCompletedPhases,
      });
      setStatus({
        currentPhase: statusData?.currentPhase ?? mergedPhase,
        phaseName: statusData?.phaseName ?? mergedPhaseName,
        totalPhases: statusData?.totalPhases ?? mergedTotalPhases,
        completedPhases: statusData?.completedPhases ?? mergedCompletedPhases,
        exists: statusData?.exists,
        hasTlc: statusData?.hasTlc,
        hasPlanning: statusData?.hasPlanning,
        testsPass: statusData?.testsPass ?? 0,
        testsFail: statusData?.testsFail ?? 0,
        coverage: statusData?.coverage ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    }
  }, [projectId, setLoading, setProject, setStatus, setError]);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return; // No project selected in workspace mode
    // Workspace status is fetched in fetchProject
  }, [projectId]);

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
