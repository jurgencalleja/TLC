import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { WorkspaceGroup } from '../api/endpoints';

export function useWorkspaceGroups() {
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.workspace.getGroups();
      setGroups(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspace groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, fetchGroups };
}
