import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import type { MemoryDecision, MemoryGotcha, MemoryStats } from '../api/endpoints';

export function useMemory(projectId?: string) {
  const [decisions, setDecisions] = useState<MemoryDecision[]>([]);
  const [gotchas, setGotchas] = useState<MemoryGotcha[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    if (!projectId) {
      setDecisions([]);
      setGotchas([]);
      setStats(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [d, g, s] = await Promise.all([
        api.projects.getMemoryDecisions(projectId),
        api.projects.getMemoryGotchas(projectId),
        api.projects.getMemoryStats(projectId),
      ]);
      setDecisions(d);
      setGotchas(g);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memory');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  return { decisions, gotchas, stats, loading, error, refresh: fetchMemory };
}
