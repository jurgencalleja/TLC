import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogType = 'app' | 'test' | 'git' | 'system';

export const MAX_LOGS = 1000;

export interface LogEntry {
  id: string;
  text: string;
  level: LogLevel;
  timestamp: string;
  type: LogType;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface LogsByType {
  app: LogEntry[];
  test: LogEntry[];
  git: LogEntry[];
  system: LogEntry[];
}

interface LogState {
  logs: LogsByType;
  activeType: LogType;
  searchQuery: string;
  autoScroll: boolean;
  currentLogs: LogEntry[];
  filteredLogs: LogEntry[];
}

interface LogActions {
  addLog: (log: LogEntry) => void;
  addBatchLogs: (logs: LogEntry[]) => void;
  setLogType: (type: LogType) => void;
  clearLogs: (type: LogType) => void;
  clearAllLogs: () => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setAutoScroll: (enabled: boolean) => void;
  reset: () => void;
}

const initialLogs: LogsByType = {
  app: [],
  test: [],
  git: [],
  system: [],
};

const initialState = {
  logs: initialLogs,
  activeType: 'app' as LogType,
  searchQuery: '',
  autoScroll: true,
};

const generateId = () => Math.random().toString(36).slice(2);

const addLogsToType = (
  logs: LogsByType,
  type: LogType,
  newLogs: LogEntry[]
): LogsByType => {
  const current = logs[type];
  const combined = [...current, ...newLogs];
  const trimmed =
    combined.length > MAX_LOGS
      ? combined.slice(combined.length - MAX_LOGS)
      : combined;
  return { ...logs, [type]: trimmed };
};

const computeCurrentLogs = (logs: LogsByType, activeType: LogType): LogEntry[] => {
  return logs[activeType];
};

const computeFilteredLogs = (
  logs: LogsByType,
  activeType: LogType,
  searchQuery: string
): LogEntry[] => {
  const current = logs[activeType];
  if (!searchQuery) return current;
  const query = searchQuery.toLowerCase();
  return current.filter((log) => log.text.toLowerCase().includes(query));
};

export const useLogStore = create<LogState & LogActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    currentLogs: [],
    filteredLogs: [],

    addLog: (log) =>
      set((state) => {
        const entry: LogEntry = {
          ...log,
          id: log.id || generateId(),
          timestamp: log.timestamp || new Date().toISOString(),
        };
        const logs = addLogsToType(state.logs, log.type, [entry]);
        return {
          logs,
          currentLogs: computeCurrentLogs(logs, state.activeType),
          filteredLogs: computeFilteredLogs(logs, state.activeType, state.searchQuery),
        };
      }),

    addBatchLogs: (logsToAdd) =>
      set((state) => {
        const byType: Partial<Record<LogType, LogEntry[]>> = {};

        for (const log of logsToAdd) {
          const entry: LogEntry = {
            ...log,
            id: log.id || generateId(),
            timestamp: log.timestamp || new Date().toISOString(),
          };
          if (!byType[log.type]) {
            byType[log.type] = [];
          }
          byType[log.type]!.push(entry);
        }

        let newLogs = { ...state.logs };
        for (const [type, entries] of Object.entries(byType)) {
          newLogs = addLogsToType(newLogs, type as LogType, entries);
        }

        return {
          logs: newLogs,
          currentLogs: computeCurrentLogs(newLogs, state.activeType),
          filteredLogs: computeFilteredLogs(newLogs, state.activeType, state.searchQuery),
        };
      }),

    setLogType: (type) =>
      set((state) => ({
        activeType: type,
        currentLogs: computeCurrentLogs(state.logs, type),
        filteredLogs: computeFilteredLogs(state.logs, type, state.searchQuery),
      })),

    clearLogs: (type) =>
      set((state) => {
        const logs = { ...state.logs, [type]: [] };
        return {
          logs,
          currentLogs: computeCurrentLogs(logs, state.activeType),
          filteredLogs: computeFilteredLogs(logs, state.activeType, state.searchQuery),
        };
      }),

    clearAllLogs: () =>
      set((state) => ({
        logs: initialLogs,
        currentLogs: [],
        filteredLogs: [],
      })),

    setSearchQuery: (query) =>
      set((state) => ({
        searchQuery: query,
        filteredLogs: computeFilteredLogs(state.logs, state.activeType, query),
      })),

    clearSearch: () =>
      set((state) => ({
        searchQuery: '',
        filteredLogs: computeFilteredLogs(state.logs, state.activeType, ''),
      })),

    setAutoScroll: (enabled) => set({ autoScroll: enabled }),

    reset: () =>
      set({
        ...initialState,
        currentLogs: [],
        filteredLogs: [],
      }),
  }))
);
