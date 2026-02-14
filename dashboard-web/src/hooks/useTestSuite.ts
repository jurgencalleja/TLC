import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import type { TestInventoryData } from '../api/endpoints';

export function useTestSuite(projectId?: string) {
  const [inventory, setInventory] = useState<TestInventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!projectId) {
      setInventory(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.getTestInventory(projectId);
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch test inventory');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const runTests = useCallback(async () => {
    if (!projectId) return;
    await api.projects.runTests(projectId);
  }, [projectId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { inventory, loading, error, refresh: fetchInventory, runTests };
}
