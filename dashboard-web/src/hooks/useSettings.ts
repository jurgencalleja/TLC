import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

interface TlcConfig {
  project?: string;
  testFrameworks?: {
    primary?: string;
  };
  quality?: {
    coverageThreshold?: number;
    qualityScoreThreshold?: number;
  };
  [key: string]: unknown;
}

export function useSettings() {
  const [config, setConfig] = useState<TlcConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.config.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(async (newConfig: TlcConfig) => {
    setSaving(true);
    setError(null);
    try {
      await api.config.saveConfig(newConfig);
      setConfig(newConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save config';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    saving,
    error,
    saveConfig,
    refetch,
  };
}
