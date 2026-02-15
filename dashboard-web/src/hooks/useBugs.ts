import { useCallback, useState } from 'react';
import { api } from '../api';
import type { Bug } from '../api/endpoints';

export function useBugs(projectId?: string) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBugs = useCallback(async () => {
    if (!projectId) {
      setBugs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.getBugs(projectId);
      setBugs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bugs');
      setBugs([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createBug = useCallback(
    async (bugData: Record<string, unknown>) => {
      if (!projectId) throw new Error('No project selected');
      const result = await api.projects.createBug(projectId, bugData);
      // Refresh the list
      await fetchBugs();
      return result;
    },
    [projectId, fetchBugs]
  );

  const updateBugStatus = useCallback(
    async (bugId: string, status: string) => {
      if (!projectId) throw new Error('No project selected');
      const result = await api.projects.updateBugStatus(projectId, bugId, status);
      await fetchBugs();
      return result;
    },
    [projectId, fetchBugs]
  );

  return { bugs, loading, error, fetchBugs, createBug, updateBugStatus };
}
