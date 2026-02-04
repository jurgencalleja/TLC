import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLogStore, type LogEntry, type LogType, MAX_LOGS } from './log.store';

const createMockLog = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  id: Math.random().toString(36).slice(2),
  text: 'Test log message',
  level: 'info',
  timestamp: new Date().toISOString(),
  type: 'app',
  ...overrides,
});

describe('log.store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useLogStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('has empty logs for all types', () => {
      const { result } = renderHook(() => useLogStore());
      expect(result.current.logs.app).toEqual([]);
      expect(result.current.logs.test).toEqual([]);
      expect(result.current.logs.git).toEqual([]);
      expect(result.current.logs.system).toEqual([]);
    });

    it('has app as active type', () => {
      const { result } = renderHook(() => useLogStore());
      expect(result.current.activeType).toBe('app');
    });

    it('has empty search query', () => {
      const { result } = renderHook(() => useLogStore());
      expect(result.current.searchQuery).toBe('');
    });

    it('has autoScroll enabled', () => {
      const { result } = renderHook(() => useLogStore());
      expect(result.current.autoScroll).toBe(true);
    });
  });

  describe('addLog', () => {
    it('appends log entry to correct type', () => {
      const { result } = renderHook(() => useLogStore());
      const log = createMockLog({ type: 'app' });

      act(() => {
        result.current.addLog(log);
      });

      expect(result.current.logs.app).toHaveLength(1);
      expect(result.current.logs.app[0]).toEqual(log);
    });

    it('adds to test logs', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'test' }));
      });

      expect(result.current.logs.test).toHaveLength(1);
    });

    it('adds to git logs', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'git' }));
      });

      expect(result.current.logs.git).toHaveLength(1);
    });

    it('adds to system logs', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'system' }));
      });

      expect(result.current.logs.system).toHaveLength(1);
    });

    it('limits logs to MAX_LOGS per type', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        // Add MAX_LOGS + 10 entries
        for (let i = 0; i < MAX_LOGS + 10; i++) {
          result.current.addLog(createMockLog({ id: `log-${i}`, type: 'app' }));
        }
      });

      expect(result.current.logs.app).toHaveLength(MAX_LOGS);
      // Oldest logs should be removed (first 10)
      expect(result.current.logs.app[0].id).toBe('log-10');
    });

    it('generates id if not provided', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog({ text: 'Test', level: 'info', type: 'app' } as LogEntry);
      });

      expect(result.current.logs.app[0].id).toBeDefined();
    });

    it('generates timestamp if not provided', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog({ text: 'Test', level: 'info', type: 'app' } as LogEntry);
      });

      expect(result.current.logs.app[0].timestamp).toBeDefined();
    });
  });

  describe('addBatchLogs', () => {
    it('adds multiple logs at once', () => {
      const { result } = renderHook(() => useLogStore());
      const logs = [
        createMockLog({ id: '1', type: 'app' }),
        createMockLog({ id: '2', type: 'app' }),
        createMockLog({ id: '3', type: 'app' }),
      ];

      act(() => {
        result.current.addBatchLogs(logs);
      });

      expect(result.current.logs.app).toHaveLength(3);
    });

    it('respects MAX_LOGS limit', () => {
      const { result } = renderHook(() => useLogStore());
      const logs = Array.from({ length: MAX_LOGS + 50 }, (_, i) =>
        createMockLog({ id: `log-${i}`, type: 'app' })
      );

      act(() => {
        result.current.addBatchLogs(logs);
      });

      expect(result.current.logs.app).toHaveLength(MAX_LOGS);
    });
  });

  describe('setLogType', () => {
    it('changes active type', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.setLogType('test');
      });

      expect(result.current.activeType).toBe('test');
    });

    it('accepts all valid types', () => {
      const { result } = renderHook(() => useLogStore());
      const types: LogType[] = ['app', 'test', 'git', 'system'];

      types.forEach(type => {
        act(() => {
          result.current.setLogType(type);
        });
        expect(result.current.activeType).toBe(type);
      });
    });
  });

  describe('clearLogs', () => {
    it('removes all logs for a type', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.clearLogs('app');
      });

      expect(result.current.logs.app).toEqual([]);
    });

    it('does not affect other types', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.addLog(createMockLog({ type: 'test' }));
        result.current.clearLogs('app');
      });

      expect(result.current.logs.test).toHaveLength(1);
    });

    it('clears all types when no type specified', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.addLog(createMockLog({ type: 'test' }));
        result.current.addLog(createMockLog({ type: 'git' }));
        result.current.clearAllLogs();
      });

      expect(result.current.logs.app).toEqual([]);
      expect(result.current.logs.test).toEqual([]);
      expect(result.current.logs.git).toEqual([]);
    });
  });

  describe('search', () => {
    it('sets search query', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.setSearchQuery('error');
      });

      expect(result.current.searchQuery).toBe('error');
    });

    it('filters logs by search query', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ text: 'Error: Something failed', type: 'app' }));
        result.current.addLog(createMockLog({ text: 'Info: All good', type: 'app' }));
        result.current.addLog(createMockLog({ text: 'Error: Another failure', type: 'app' }));
        result.current.setSearchQuery('error');
      });

      expect(result.current.filteredLogs).toHaveLength(2);
    });

    it('search is case insensitive', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ text: 'ERROR: uppercase', type: 'app' }));
        result.current.addLog(createMockLog({ text: 'error: lowercase', type: 'app' }));
        result.current.setSearchQuery('Error');
      });

      expect(result.current.filteredLogs).toHaveLength(2);
    });

    it('returns all logs when search is empty', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.setSearchQuery('');
      });

      expect(result.current.filteredLogs).toHaveLength(2);
    });

    it('clears search query', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.setSearchQuery('test');
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('autoScroll', () => {
    it('toggles autoScroll', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.setAutoScroll(false);
      });

      expect(result.current.autoScroll).toBe(false);
    });

    it('can be re-enabled', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.setAutoScroll(false);
        result.current.setAutoScroll(true);
      });

      expect(result.current.autoScroll).toBe(true);
    });
  });

  describe('currentLogs', () => {
    it('returns logs for active type', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app', text: 'app log' }));
        result.current.addLog(createMockLog({ type: 'test', text: 'test log' }));
        result.current.setLogType('test');
      });

      expect(result.current.currentLogs).toHaveLength(1);
      expect(result.current.currentLogs[0].text).toBe('test log');
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      const { result } = renderHook(() => useLogStore());

      act(() => {
        result.current.addLog(createMockLog({ type: 'app' }));
        result.current.setLogType('test');
        result.current.setSearchQuery('error');
        result.current.setAutoScroll(false);
        result.current.reset();
      });

      expect(result.current.logs.app).toEqual([]);
      expect(result.current.activeType).toBe('app');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.autoScroll).toBe(true);
    });
  });
});
