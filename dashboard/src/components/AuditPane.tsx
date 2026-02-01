import { Box, Text, useInput } from 'ink';
import { useState } from 'react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  severity: 'error' | 'warn' | 'info' | 'debug';
  details: string;
}

export interface AuditPaneProps {
  entries?: AuditEntry[];
  users?: string[];
  actions?: string[];
  userFilter?: string;
  actionFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  expandedId?: string;
  integrityStatus?: 'valid' | 'invalid' | 'unknown';
  isActive?: boolean;
  maxLines?: number;
  onUserFilterChange?: (user: string | undefined) => void;
  onActionFilterChange?: (action: string | undefined) => void;
  onExpandEntry?: (id: string | undefined) => void;
}

const severityColors: Record<string, string> = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'gray',
};

const severityIcons: Record<string, string> = {
  error: 'x',
  warn: '!',
  info: 'i',
  debug: '.',
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

export function filterByUser(
  entries: AuditEntry[],
  user: string | undefined
): AuditEntry[] {
  if (!user) return entries;
  return entries.filter((entry) => entry.user === user);
}

export function filterByAction(
  entries: AuditEntry[],
  action: string | undefined
): AuditEntry[] {
  if (!action) return entries;
  return entries.filter((entry) => entry.action === action);
}

export function filterByDateRange(
  entries: AuditEntry[],
  from: string | undefined,
  to: string | undefined
): AuditEntry[] {
  if (!from && !to) return entries;
  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    if (from && entryDate < new Date(from)) return false;
    if (to && entryDate > new Date(to)) return false;
    return true;
  });
}

function IntegrityIndicator({ status }: { status?: 'valid' | 'invalid' | 'unknown' }) {
  if (!status) return null;

  let color: string;
  let label: string;

  switch (status) {
    case 'valid':
      color = 'green';
      label = 'OK';
      break;
    case 'invalid':
      color = 'red';
      label = 'FAILED';
      break;
    default:
      color = 'gray';
      label = '?';
  }

  return (
    <Box>
      <Text dimColor>Integrity: </Text>
      <Text color={color as any}>{label}</Text>
    </Box>
  );
}

function AuditEntryLine({
  entry,
  expanded,
}: {
  entry: AuditEntry;
  expanded: boolean;
}) {
  const timestamp = formatTimestamp(entry.timestamp);
  const color = severityColors[entry.severity] || 'white';
  const icon = severityIcons[entry.severity] || ' ';

  return (
    <Box flexDirection="column">
      <Box>
        {timestamp && <Text dimColor>[{timestamp}] </Text>}
        <Text color={color as any}>[{entry.severity}] </Text>
        <Text color={color as any}>{icon} </Text>
        <Text color="blue">{entry.user}</Text>
        <Text> </Text>
        <Text>{entry.action}</Text>
      </Box>
      {expanded && (
        <Box marginLeft={2}>
          <Text dimColor>{entry.details}</Text>
        </Box>
      )}
    </Box>
  );
}

function FilterDisplay({
  users,
  actions,
  userFilter,
  actionFilter,
}: {
  users: string[];
  actions: string[];
  userFilter?: string;
  actionFilter?: string;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {users.length > 0 && (
        <Box>
          <Text dimColor>Users: </Text>
          <Text bold={!userFilter} color={!userFilter ? 'blue' : undefined}>
            [All]
          </Text>
          {users.map((u) => (
            <Box key={u} marginLeft={1}>
              <Text
                bold={userFilter === u}
                color={userFilter === u ? 'blue' : undefined}
              >
                [{u}]
              </Text>
            </Box>
          ))}
        </Box>
      )}
      {actions.length > 0 && (
        <Box>
          <Text dimColor>Actions: </Text>
          <Text bold={!actionFilter} color={!actionFilter ? 'blue' : undefined}>
            [All]
          </Text>
          {actions.map((a) => (
            <Box key={a} marginLeft={1}>
              <Text
                bold={actionFilter === a}
                color={actionFilter === a ? 'blue' : undefined}
              >
                [{a}]
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function AuditPane({
  entries = [],
  users = [],
  actions = [],
  userFilter,
  actionFilter,
  dateFrom,
  dateTo,
  expandedId,
  integrityStatus,
  isActive = false,
  maxLines = 20,
  onUserFilterChange,
  onActionFilterChange,
  onExpandEntry,
}: AuditPaneProps) {
  const [localExpandedId, setLocalExpandedId] = useState<string | undefined>(
    expandedId
  );

  const effectiveExpandedId = expandedId !== undefined ? expandedId : localExpandedId;

  // Apply filters
  let filteredEntries = filterByUser(entries, userFilter);
  filteredEntries = filterByAction(filteredEntries, actionFilter);
  filteredEntries = filterByDateRange(filteredEntries, dateFrom, dateTo);

  // Take last N lines for display
  const displayEntries = filteredEntries.slice(-maxLines);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // User filter shortcuts (1-9 for users)
      if (input === '0' || input === 'u') {
        onUserFilterChange?.(undefined);
      } else if (input >= '1' && input <= '9') {
        const idx = parseInt(input, 10) - 1;
        if (idx < users.length) {
          onUserFilterChange?.(users[idx]);
        }
      }

      // Action filter
      if (input === 'a') {
        onActionFilterChange?.(undefined);
      }

      // Toggle expand
      if (key.return && displayEntries.length > 0) {
        const firstEntry = displayEntries[0];
        if (effectiveExpandedId === firstEntry.id) {
          setLocalExpandedId(undefined);
          onExpandEntry?.(undefined);
        } else {
          setLocalExpandedId(firstEntry.id);
          onExpandEntry?.(firstEntry.id);
        }
      }
    },
    { isActive }
  );

  if (entries.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Audit Log</Text>
        <Box marginTop={1}>
          <Text color="gray">No audit entries</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Audit events will appear here</Text>
        </Box>
        {integrityStatus && (
          <Box marginTop={1}>
            <IntegrityIndicator status={integrityStatus} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Audit Log </Text>
        <Text dimColor>({filteredEntries.length} of {entries.length} entries)</Text>
      </Box>

      {/* Integrity Status */}
      {integrityStatus && (
        <Box marginBottom={1}>
          <IntegrityIndicator status={integrityStatus} />
        </Box>
      )}

      {/* Filters */}
      {(users.length > 0 || actions.length > 0) && (
        <FilterDisplay
          users={users}
          actions={actions}
          userFilter={userFilter}
          actionFilter={actionFilter}
        />
      )}

      {/* Entries List */}
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        {displayEntries.length === 0 ? (
          <Text color="gray">No matching entries</Text>
        ) : (
          displayEntries.map((entry) => (
            <AuditEntryLine
              key={entry.id}
              entry={entry}
              expanded={effectiveExpandedId === entry.id}
            />
          ))
        )}
      </Box>

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [0] All users  [1-9] Select user  [a] All actions  [Enter] Expand
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default AuditPane;
