import { Box, Text, useInput } from 'ink';
import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp?: string;
  service?: string;
  level?: 'error' | 'warn' | 'info' | 'debug';
  message: string;
}

interface LogsPaneProps {
  logs: LogEntry[];
  services?: string[];
  selectedService?: string;
  onServiceChange?: (service: string | undefined) => void;
  isActive: boolean;
  maxLines?: number;
}

const levelColors: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'gray',
};

const levelIcons: Record<string, string> = {
  error: '✗',
  warn: '⚠',
  info: 'ℹ',
  debug: '·',
};

export function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
}

export function filterLogsByService(
  logs: LogEntry[],
  service: string | undefined
): LogEntry[] {
  if (!service) return logs;
  return logs.filter((log) => log.service === service);
}

export function filterLogsByLevel(
  logs: LogEntry[],
  level: string | undefined
): LogEntry[] {
  if (!level) return logs;
  const levels = ['error', 'warn', 'info', 'debug'];
  const levelIndex = levels.indexOf(level);
  if (levelIndex === -1) return logs;
  return logs.filter((log) => {
    const logLevel = log.level || 'info';
    return levels.indexOf(logLevel) <= levelIndex;
  });
}

function LogLine({ entry }: { entry: LogEntry }) {
  const timestamp = formatTimestamp(entry.timestamp);
  const level = entry.level || 'info';
  const color = levelColors[level] || 'white';
  const icon = levelIcons[level] || ' ';

  return (
    <Box>
      {timestamp && (
        <Text dimColor>[{timestamp}] </Text>
      )}
      {entry.service && (
        <Text color="blue">[{entry.service}] </Text>
      )}
      <Text color={color as any}>{icon} </Text>
      <Text>{entry.message}</Text>
    </Box>
  );
}

function ServiceFilter({
  services,
  selected,
  onSelect,
}: {
  services: string[];
  selected: string | undefined;
  onSelect: (s: string | undefined) => void;
}) {
  return (
    <Box marginBottom={1}>
      <Text dimColor>Filter: </Text>
      <Text
        bold={!selected}
        color={!selected ? 'blue' : undefined}
        underline={!selected}
      >
        [All]
      </Text>
      {services.map((s) => (
        <Box key={s} marginLeft={1}>
          <Text
            bold={selected === s}
            color={selected === s ? 'blue' : undefined}
            underline={selected === s}
          >
            [{s}]
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function LogsPane({
  logs,
  services = [],
  selectedService,
  onServiceChange,
  isActive,
  maxLines = 20,
}: LogsPaneProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);

  // Filter logs
  let filteredLogs = filterLogsByService(logs, selectedService);
  filteredLogs = filterLogsByLevel(filteredLogs, levelFilter);

  // Take last N lines
  const displayLogs = filteredLogs.slice(-maxLines);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Service filter shortcuts
      if (input === '0' || input === 'a') {
        onServiceChange?.(undefined);
      } else if (input >= '1' && input <= '9') {
        const idx = parseInt(input, 10) - 1;
        if (idx < services.length) {
          onServiceChange?.(services[idx]);
        }
      }

      // Level filter shortcuts
      if (input === 'e') {
        setLevelFilter(levelFilter === 'error' ? undefined : 'error');
      } else if (input === 'w') {
        setLevelFilter(levelFilter === 'warn' ? undefined : 'warn');
      } else if (input === 'i') {
        setLevelFilter(levelFilter === 'info' ? undefined : 'info');
      } else if (input === 'd') {
        setLevelFilter(levelFilter === 'debug' ? undefined : 'debug');
      }

      // Toggle auto-scroll
      if (input === 's') {
        setAutoScroll(!autoScroll);
      }
    },
    { isActive }
  );

  if (logs.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Logs</Text>
        <Box marginTop={1}>
          <Text color="gray">No logs yet</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Start services to see logs</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Logs </Text>
        <Text dimColor>({filteredLogs.length} entries)</Text>
        {autoScroll && <Text color="green"> ↓</Text>}
      </Box>

      {services.length > 0 && (
        <ServiceFilter
          services={services}
          selected={selectedService}
          onSelect={onServiceChange || (() => {})}
        />
      )}

      {levelFilter && (
        <Box marginBottom={1}>
          <Text dimColor>Level: </Text>
          <Text color={levelColors[levelFilter] as any}>{levelFilter}</Text>
        </Box>
      )}

      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        {displayLogs.length === 0 ? (
          <Text color="gray">No matching logs</Text>
        ) : (
          displayLogs.map((log, i) => <LogLine key={i} entry={log} />)
        )}
      </Box>

      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [a] All  [1-9] Service  [e/w/i/d] Level  [s] Scroll
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default LogsPane;
