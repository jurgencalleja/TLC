import { useCallback, useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { api } from '../api';

/**
 * Hook for workspace-aware routing and navigation.
 * Fetches workspace configuration on mount, provides project selection,
 * and workspace scanning capabilities.
 */
export function useWorkspace() {
  const {
    isConfigured,
    projects,
    selectedProjectId,
    isScanning,
    lastScan,
    setRoots,
    setProjects,
    selectProject: storeSelectProject,
    restoreSelectedProject,
    setIsScanning,
    setLastScan,
  } = useWorkspaceStore();

  const [error, setError] = useState<string | null>(null);

  // Fetch config on mount and restore selected project
  useEffect(() => {
    restoreSelectedProject();

    api.workspace.getConfig()
      .then((config) => {
        setRoots(config.roots);
        if (config.roots.length > 0) {
          return api.workspace.getProjects();
        }
        return null;
      })
      .then((fetchedProjects) => {
        if (fetchedProjects) {
          setProjects(fetchedProjects);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch workspace config');
      });
  }, [setRoots, setProjects, restoreSelectedProject]);

  const selectProject = useCallback(
    (id: string) => {
      storeSelectProject(id);
    },
    [storeSelectProject]
  );

  const scan = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    try {
      await api.workspace.scan();
      const updatedProjects = await api.workspace.getProjects();
      setProjects(updatedProjects);
      setLastScan(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [setIsScanning, setProjects, setLastScan]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return {
    isConfigured,
    projects,
    selectedProject,
    selectProject,
    scan,
    isScanning,
    lastScan: lastScan ? new Date(lastScan).getTime() : null,
    error,
  };
}
