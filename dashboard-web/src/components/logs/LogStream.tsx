import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowDown, ScrollText } from 'lucide-react';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string;
}

export interface LogStreamProps {
  logs: LogEntry[];
  autoScroll?: boolean;
  showFilters?: boolean;
  showCount?: boolean;
  virtualized?: boolean;
  copyOnClick?: boolean;
  className?: string;
}

const levelColors: Record<LogLevel, string> = {
  info: 'text-info',
  warn: 'text-warning',
  error: 'text-error',
  debug: 'text-muted-foreground',
};

const levelLabels: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export function LogStream({
  logs,
  autoScroll = true,
  showFilters = false,
  showCount = false,
  virtualized = false,
  copyOnClick = false,
  className = '',
}: LogStreamProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [levelFilters, setLevelFilters] = useState<Set<LogLevel>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Filter logs
  const filteredLogs =
    levelFilters.size > 0
      ? logs.filter((log) => levelFilters.has(log.level))
      : logs;

  // Virtualization - only render visible logs
  const displayLogs = virtualized ? filteredLogs.slice(-50) : filteredLogs;

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && !isPaused && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !autoScroll) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    // Pause if user scrolled up
    if (scrollTop < lastScrollTop.current && !isAtBottom) {
      setIsPaused(true);
    }

    lastScrollTop.current = scrollTop;
  }, [autoScroll]);

  const handleScrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsPaused(false);
    }
  };

  const toggleFilter = (level: LogLevel) => {
    setLevelFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleLogClick = (log: LogEntry) => {
    if (copyOnClick && navigator.clipboard) {
      navigator.clipboard.writeText(`[${log.timestamp}] [${log.level}] ${log.message}`);
    }
  };

  if (logs.length === 0) {
    return (
      <div
        data-testid="log-stream"
        className={`bg-surface border border-border rounded-lg ${className}`}
      >
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ScrollText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No logs yet</h3>
          <p className="text-muted-foreground">
            Logs will appear here when your services start running.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="log-stream"
      className={`bg-surface border border-border rounded-lg flex flex-col ${className}`}
    >
      {/* Header */}
      {(showFilters || showCount) && (
        <div className="flex items-center justify-between p-3 border-b border-border">
          {showFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              {(['error', 'warn', 'info', 'debug'] as LogLevel[]).map((level) => (
                <button
                  key={level}
                  data-testid={`filter-${level}`}
                  onClick={() => toggleFilter(level)}
                  className={`
                    px-2 py-1 text-xs font-medium rounded
                    transition-colors
                    ${
                      levelFilters.has(level)
                        ? `${levelColors[level]} bg-current/10`
                        : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {levelLabels[level]}
                </button>
              ))}
            </div>
          )}
          {showCount && (
            <span
              data-testid="log-count"
              className="text-sm text-muted-foreground"
            >
              {filteredLogs.length}
            </span>
          )}
        </div>
      )}

      {/* Log Container */}
      <div
        ref={containerRef}
        data-testid="log-container"
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono text-sm p-2 max-h-[400px]"
      >
        {displayLogs.map((log) => (
          <div
            key={log.id}
            data-testid="log-entry"
            onClick={() => handleLogClick(log)}
            className={`
              flex items-start gap-2 py-1 px-2 rounded
              hover:bg-muted/50
              ${copyOnClick ? 'cursor-pointer' : ''}
            `}
          >
            <span
              data-testid="log-timestamp"
              className="text-muted-foreground flex-shrink-0"
            >
              {formatTimestamp(log.timestamp)}
            </span>
            <span
              data-testid={`level-${log.level}`}
              className={`w-12 flex-shrink-0 ${levelColors[log.level]}`}
            >
              {levelLabels[log.level]}
            </span>
            <span className="text-foreground break-all">{log.message}</span>
          </div>
        ))}
      </div>

      {/* Scroll Controls */}
      {isPaused && (
        <div className="flex items-center justify-center p-2 border-t border-border">
          <span data-testid="scroll-paused" className="text-xs text-muted-foreground mr-2">
            Auto-scroll paused
          </span>
          <button
            onClick={handleScrollToBottom}
            aria-label="Scroll to bottom"
            className="
              flex items-center gap-1 px-2 py-1
              text-xs text-primary hover:underline
            "
          >
            <ArrowDown className="w-3 h-3" />
            Resume
          </button>
        </div>
      )}
    </div>
  );
}
