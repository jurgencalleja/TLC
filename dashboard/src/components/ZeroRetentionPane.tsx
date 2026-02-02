import { Box, Text, useInput } from 'ink';

export interface RetentionRule {
  retention: string;
  persist: boolean;
}

export interface RetentionPolicy {
  retention?: string;
  persist?: boolean;
  sensitivityLevels?: Record<string, RetentionRule>;
  dataTypes?: Record<string, RetentionRule>;
}

export interface PurgeEntry {
  id: string;
  timestamp: string;
  itemCount: number;
  dataTypes: string[];
}

export interface SensitiveDataInfo {
  detected: boolean;
  count: number;
  types: string[];
}

export interface SubsystemStatus {
  ephemeralStorage?: boolean;
  sessionPurge?: boolean;
  memoryExclusion?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
}

export interface ZeroRetentionPaneProps {
  enabled?: boolean;
  policy?: RetentionPolicy;
  purgeHistory?: PurgeEntry[];
  sensitiveDataDetected?: SensitiveDataInfo;
  subsystems?: SubsystemStatus;
  validation?: ValidationResult;
  isActive?: boolean;
  onToggle?: () => void;
  onPurge?: () => void;
}

function formatTimestamp(ts: string | undefined): string {
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

function StatusIndicator({ enabled }: { enabled: boolean }) {
  return (
    <Box>
      <Text dimColor>Status: </Text>
      <Text color={enabled ? 'green' : 'gray'} bold>
        {enabled ? 'ENABLED' : 'DISABLED'}
      </Text>
    </Box>
  );
}

function SubsystemsList({ subsystems }: { subsystems: SubsystemStatus }) {
  const items = [
    { key: 'ephemeralStorage', label: 'Ephemeral Storage' },
    { key: 'sessionPurge', label: 'Session Purge' },
    { key: 'memoryExclusion', label: 'Memory Exclusion' },
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Subsystems:</Text>
      {items.map((item) => {
        const active = subsystems[item.key as keyof SubsystemStatus];
        return (
          <Box key={item.key}>
            <Text color={active ? 'green' : 'gray'}>
              {active ? '  [x]' : '  [ ]'} {item.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function PolicySummary({ policy }: { policy: RetentionPolicy }) {
  const rules: Array<{ label: string; value: string }> = [];

  if (policy.retention) {
    rules.push({ label: 'Default', value: policy.retention });
  }

  if (policy.sensitivityLevels) {
    Object.entries(policy.sensitivityLevels).forEach(([level, rule]) => {
      rules.push({ label: level, value: rule.retention });
    });
  }

  if (policy.dataTypes) {
    Object.entries(policy.dataTypes).forEach(([type, rule]) => {
      rules.push({ label: type, value: rule.retention });
    });
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Policy:</Text>
      {rules.length === 0 ? (
        <Text color="gray">  No policy rules configured</Text>
      ) : (
        rules.slice(0, 5).map((rule, idx) => (
          <Box key={idx}>
            <Text dimColor>  {rule.label}: </Text>
            <Text color={rule.value === 'immediate' ? 'cyan' : 'white'}>
              {rule.value}
            </Text>
          </Box>
        ))
      )}
      {rules.length > 5 && (
        <Text dimColor>  ... and {rules.length - 5} more rules</Text>
      )}
    </Box>
  );
}

function PurgeHistory({ entries }: { entries: PurgeEntry[] }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Recent Purge Activity:</Text>
      {entries.length === 0 ? (
        <Text color="gray">  No purge history - none yet</Text>
      ) : (
        entries.slice(0, 5).map((entry) => {
          const timestamp = formatTimestamp(entry.timestamp);
          return (
            <Box key={entry.id}>
              {timestamp && <Text dimColor>  [{timestamp}] </Text>}
              <Text>Purged {entry.itemCount} items </Text>
              <Text dimColor>({entry.dataTypes.join(', ')})</Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}

function SensitiveWarning({ info }: { info: SensitiveDataInfo }) {
  if (!info.detected || info.count === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1}>
      <Box>
        <Text color="yellow" bold>Warning: Sensitive Data Detected</Text>
      </Box>
      <Box>
        <Text color="yellow">
          Found {info.count} sensitive item(s): {info.types.join(', ')}
        </Text>
      </Box>
      <Box>
        <Text dimColor>Enable zero-retention mode to protect this data</Text>
      </Box>
    </Box>
  );
}

function ValidationStatus({ validation }: { validation: ValidationResult }) {
  if (validation.valid && validation.warnings.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="green">Configuration: Valid and OK</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {validation.conflicts.length > 0 && (
        <Box flexDirection="column">
          <Text color="red" bold>Conflicts:</Text>
          {validation.conflicts.map((conflict, idx) => (
            <Text key={idx} color="red">  - {conflict}</Text>
          ))}
        </Box>
      )}
      {validation.warnings.length > 0 && (
        <Box flexDirection="column">
          <Text color="yellow" bold>Warnings:</Text>
          {validation.warnings.map((warning, idx) => (
            <Text key={idx} color="yellow">  - {warning}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function ZeroRetentionPane({
  enabled = false,
  policy,
  purgeHistory = [],
  sensitiveDataDetected,
  subsystems,
  validation,
  isActive = false,
  onToggle,
  onPurge,
}: ZeroRetentionPaneProps) {
  useInput(
    (input, _key) => {
      if (!isActive) return;

      // Toggle with 't'
      if (input === 't' && onToggle) {
        onToggle();
      }

      // Force purge with 'p'
      if (input === 'p' && onPurge) {
        onPurge();
      }
    },
    { isActive }
  );

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Zero-Retention Mode</Text>
      </Box>

      {/* Status */}
      <StatusIndicator enabled={enabled} />

      {/* Sensitive Data Warning */}
      {sensitiveDataDetected && (
        <SensitiveWarning info={sensitiveDataDetected} />
      )}

      {/* Validation Status */}
      {validation && <ValidationStatus validation={validation} />}

      {/* Subsystems */}
      {subsystems && <SubsystemsList subsystems={subsystems} />}

      {/* Policy Summary */}
      {policy && <PolicySummary policy={policy} />}

      {/* Purge History */}
      <PurgeHistory entries={purgeHistory} />

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [t] Toggle {enabled ? 'disable' : 'enable'}
            {enabled && '  [p] Force purge'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default ZeroRetentionPane;
