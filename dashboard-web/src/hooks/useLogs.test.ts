import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLogs } from './useLogs';
import { useLogStore } from '../stores/log.store';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    logs: {
      getLogs: vi.fn(),
      clearLogs: vi.fn(),
    },
  },
}));

describe('useLogs', () => {
  beforeEach(() => {
    useLogStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns logs from store', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.logs).toEqual([]);
      expect(result.current.filteredLogs).toEqual([]);
    });

    it('returns loading state as false initially', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.loading).toBe(false);
    });

    it('returns error as null initially', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.error).toBeNull();
    });

    it('returns activeType from store', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.activeType).toBe('app');
    });

    it('returns searchQuery from store', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('fetchLogs', () => {
    it('fetches and stores logs for active type', async () => {
      const logs = [
        { id: '1', text: 'Log 1', level: 'info', timestamp: '2024-01-01T00:00:00Z', type: 'app' },
        { id: '2', text: 'Log 2', level: 'error', timestamp: '2024-01-01T00:01:00Z', type: 'app' },
      ];
      vi.mocked(api.logs.getLogs).mockResolvedValueOnce(logs);

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(api.logs.getLogs).toHaveBeenCalledWith('app');
      expect(result.current.logs).toHaveLength(2);
    });

    it('sets loading to true while fetching', async () => {
      vi.mocked(api.logs.getLogs).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const { result } = renderHook(() => useLogs());

      act(() => {
        result.current.fetchLogs();
      });

      expect(result.current.loading).toBe(true);
    });

    it('sets loading to false after fetch completes', async () => {
      vi.mocked(api.logs.getLogs).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.loading).toBe(false);
    });

    it('sets error on fetch failure', async () => {
      vi.mocked(api.logs.getLogs).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.error).toBe('Failed to fetch logs');
      expect(result.current.loading).toBe(false);
    });

    it('clears error on successful fetch', async () => {
      vi.mocked(api.logs.getLogs).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.error).toBe('Failed to fetch logs');

      vi.mocked(api.logs.getLogs).mockResolvedValueOnce([]);

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setLogType', () => {
    it('changes active log type in store', async () => {
      const { result } = renderHook(() => useLogs());

      act(() => {
        result.current.setLogType('test');
      });

      expect(result.current.activeType).toBe('test');
    });

    it('fetches logs for new type', async () => {
      const testLogs = [
        { id: '1', text: 'Test Log 1', level: 'info', timestamp: '2024-01-01T00:00:00Z', type: 'test' },
      ];
      vi.mocked(api.logs.getLogs).mockResolvedValueOnce(testLogs);

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.setLogType('test');
      });

      expect(api.logs.getLogs).toHaveBeenCalledWith('test');
    });
  });

  describe('setSearch', () => {
    it('updates search query in store', () => {
      const { result } = renderHook(() => useLogs());

      act(() => {
        result.current.setSearch('error');
      });

      expect(result.current.searchQuery).toBe('error');
    });

    it('filters logs by search query', async () => {
      // First add some logs to the store
      const logs = [
        { id: '1', text: 'Info message', level: 'info', timestamp: '2024-01-01T00:00:00Z', type: 'app' },
        { id: '2', text: 'Error occurred', level: 'error', timestamp: '2024-01-01T00:01:00Z', type: 'app' },
      ];
      vi.mocked(api.logs.getLogs).mockResolvedValueOnce(logs);

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      act(() => {
        result.current.setSearch('error');
      });

      expect(result.current.filteredLogs).toHaveLength(1);
      expect(result.current.filteredLogs[0].text).toBe('Error occurred');
    });
  });

  describe('clearLogs', () => {
    it('clears logs for active type in store', async () => {
      const logs = [
        { id: '1', text: 'Log 1', level: 'info', timestamp: '2024-01-01T00:00:00Z', type: 'app' },
      ];
      vi.mocked(api.logs.getLogs).mockResolvedValueOnce(logs);

      const { result } = renderHook(() => useLogs());

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.logs).toHaveLength(1);

      act(() => {
        result.current.clearLogs();
      });

      expect(result.current.logs).toHaveLength(0);
    });

    it('clears logs for specific type', async () => {
      // Add logs for both app and test types
      act(() => {
        useLogStore.getState().addLog({
          id: '1',
          text: 'App log',
          level: 'info',
          timestamp: '2024-01-01T00:00:00Z',
          type: 'app',
        });
        useLogStore.getState().addLog({
          id: '2',
          text: 'Test log',
          level: 'info',
          timestamp: '2024-01-01T00:00:00Z',
          type: 'test',
        });
      });

      const { result } = renderHook(() => useLogs());

      act(() => {
        result.current.clearLogs('test');
      });

      // App logs should still exist
      expect(result.current.logs).toHaveLength(1);

      // Test logs should be cleared
      act(() => {
        result.current.setLogType('test');
      });

      expect(result.current.logs).toHaveLength(0);
    });
  });

  describe('autoScroll', () => {
    it('returns autoScroll state from store', () => {
      const { result } = renderHook(() => useLogs());

      expect(result.current.autoScroll).toBe(true);
    });

    it('toggles autoScroll', () => {
      const { result } = renderHook(() => useLogs());

      act(() => {
        result.current.setAutoScroll(false);
      });

      expect(result.current.autoScroll).toBe(false);
    });
  });

  describe('store integration', () => {
    it('reflects logs added to store via addLog', () => {
      const { result } = renderHook(() => useLogs());

      act(() => {
        useLogStore.getState().addLog({
          id: '1',
          text: 'New log entry',
          level: 'info',
          timestamp: '2024-01-01T00:00:00Z',
          type: 'app',
        });
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].text).toBe('New log entry');
    });

    it('reflects batch logs added to store', () => {
      const { result } = renderHook(() => useLogs());

      act(() => {
        useLogStore.getState().addBatchLogs([
          { id: '1', text: 'Log 1', level: 'info', timestamp: '2024-01-01T00:00:00Z', type: 'app' },
          { id: '2', text: 'Log 2', level: 'warn', timestamp: '2024-01-01T00:01:00Z', type: 'app' },
        ]);
      });

      expect(result.current.logs).toHaveLength(2);
    });
  });
});
