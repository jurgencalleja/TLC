import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';
import type { RoadmapData } from '../api/endpoints';

export function useRoadmap(projectId?: string) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmap = useCallback(async () => {
    if (!projectId) {
      setRoadmap(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.getRoadmap(projectId);
      setRoadmap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch roadmap');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  return { roadmap, loading, error, refresh: fetchRoadmap };
}
