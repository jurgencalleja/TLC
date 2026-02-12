import { useCallback, useState } from 'react';
import { useLogStore, type LogType, type LogLevel } from '../stores/log.store';
import { api } from '../api';

export function useLogs() {
  const {
    activeType,
    searchQuery,
    autoScroll,
    currentLogs,
    filteredLogs,
    addBatchLogs,
    setLogType: storeSetLogType,
    clearLogs: storeClearLogs,
    setSearchQuery,
    setAutoScroll,
  } = useLogStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (type?: LogType) => {
      const logType = type ?? activeType;
      setLoading(true);
      setError(null);
      try {
        const data = await api.logs.getLogs(logType);
        const mapped = data.map((entry: { text?: string; level?: string; time?: string }) => ({
          id: '',
          text: entry.text ?? '',
          level: (['error', 'warn', 'info', 'debug'].includes(entry.level ?? '')
            ? entry.level
            : 'info') as LogLevel,
          timestamp: entry.time ?? new Date().toISOString(),
          type: logType,
        }));
        addBatchLogs(mapped);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setError('Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    },
    [activeType, addBatchLogs]
  );

  const setLogType = useCallback(
    async (type: LogType) => {
      storeSetLogType(type);
      await fetchLogs(type);
    },
    [storeSetLogType, fetchLogs]
  );

  const setSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  const clearLogs = useCallback(
    (type?: LogType) => {
      storeClearLogs(type ?? activeType);
    },
    [storeClearLogs, activeType]
  );

  return {
    logs: currentLogs,
    filteredLogs,
    activeType,
    searchQuery,
    autoScroll,
    loading,
    error,
    fetchLogs,
    setLogType,
    setSearch,
    clearLogs,
    setAutoScroll,
  };
}
