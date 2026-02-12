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
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  // Fetch config on mount and restore selected project
  useEffect(() => {
    restoreSelectedProject();

    api.workspace.getConfig()
      .then((config) => {
        setRoots(config.roots);
        if (config.lastScans && Object.keys(config.lastScans).length > 0) {
          const scanValues = Object.values(config.lastScans).filter(
            (value): value is number => typeof value === 'number'
          );
          if (scanValues.length > 0) {
            const latestScan = Math.max(...scanValues);
            if (!Number.isNaN(latestScan)) {
              setLastScan(new Date(latestScan).toISOString());
            }
          }
        }
        if (config.roots.length > 0) {
          return api.workspace.getProjects();
        }
        setProjects([]);
        setProjectsLoaded(true);
        return null;
      })
      .then((fetchedProjects) => {
        if (fetchedProjects) {
          setProjects(fetchedProjects);
          setProjectsLoaded(true);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch workspace config');
        setProjectsLoaded(true);
      });
  }, [setRoots, setProjects, restoreSelectedProject, setLastScan]);

  const selectProject = useCallback(
    (id: string) => {
      storeSelectProject(id);
    },
    [storeSelectProject]
  );

  // Only clear invalid selection after projects have actually been fetched
  useEffect(() => {
    if (projectsLoaded && selectedProjectId && projects.length > 0 &&
        !projects.some((p) => p.id === selectedProjectId)) {
      storeSelectProject(null);
    }
  }, [projectsLoaded, projects, selectedProjectId, storeSelectProject]);

  const scan = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    try {
      const result = await api.workspace.scan();
      if (result?.projects) {
        setProjects(result.projects);
      } else {
        const updatedProjects = await api.workspace.getProjects();
        setProjects(updatedProjects);
      }
      if (result?.scannedAt) {
        setLastScan(new Date(result.scannedAt).toISOString());
      } else {
        setLastScan(new Date().toISOString());
      }
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
