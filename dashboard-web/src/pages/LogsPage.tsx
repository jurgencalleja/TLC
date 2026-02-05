import { useEffect, useMemo } from 'react';
import { LogStream, type LogEntry as StreamLogEntry } from '../components/logs/LogStream';
import { LogSearch } from '../components/logs/LogSearch';
import { useLogStore, useUIStore } from '../stores';
import { Button } from '../components/ui/Button';
import type { LogType } from '../stores/log.store';

const LOG_TYPES: { value: LogType; label: string }[] = [
  { value: 'app', label: 'Application' },
  { value: 'test', label: 'Tests' },
  { value: 'git', label: 'Git' },
  { value: 'system', label: 'System' },
];

export function LogsPage() {
  const {
    activeType,
    searchQuery,
    autoScroll,
    filteredLogs,
    setLogType,
    setSearchQuery,
    clearLogs,
    setAutoScroll,
  } = useLogStore();
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('logs');
  }, [setActiveView]);

  // Map store log entries to component log entries
  const streamLogs: StreamLogEntry[] = useMemo(() => {
    return filteredLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      message: log.text,
      source: log.source || activeType,
    }));
  }, [filteredLogs, activeType]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {LOG_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={activeType === type.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setLogType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <LogSearch
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => clearLogs(activeType)}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LogStream
          logs={streamLogs}
          autoScroll={autoScroll}
        />
      </div>
    </div>
  );
}
