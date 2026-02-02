import { Box, Text, useInput } from 'ink';

export interface Provider {
  name: string;
  type: 'oauth' | 'saml';
  status: 'connected' | 'error';
  lastSync?: string;
  error?: string;
}

export interface RoleMapping {
  providerGroup: string;
  localRole: string;
}

export interface SessionSummary {
  active: number;
  total: number;
  byProvider: Record<string, number>;
}

export interface MfaStats {
  enrolled: number;
  total: number;
  pending: number;
  methods: string[];
}

export interface SSOPaneProps {
  providers: Provider[];
  roleMappings: RoleMapping[];
  sessions: SessionSummary;
  mfaStats: MfaStats;
  onAddProvider?: () => void;
  onRemoveProvider?: (name: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  isActive?: boolean;
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

function ProvidersList({ providers }: { providers: Provider[] }) {
  if (providers.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold dimColor>Identity Providers:</Text>
        <Text color="gray">  No providers configured</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Identity Providers:</Text>
      {providers.map((provider) => {
        const statusColor = provider.status === 'connected' ? 'green' : 'red';
        const statusLabel = provider.status === 'connected' ? 'connected' : 'error';
        const timestamp = formatTimestamp(provider.lastSync);

        return (
          <Box key={provider.name} flexDirection="column">
            <Box>
              <Text>  </Text>
              <Text bold>{provider.name}</Text>
              <Text dimColor> ({provider.type}) </Text>
              <Text color={statusColor as any}>[{statusLabel}]</Text>
              {timestamp && <Text dimColor> Last sync: {timestamp}</Text>}
            </Box>
            {provider.error && (
              <Box marginLeft={4}>
                <Text color="red">{provider.error}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function RoleMappingTable({ mappings }: { mappings: RoleMapping[] }) {
  if (mappings.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Role Mapping:</Text>
      {mappings.map((mapping, idx) => (
        <Box key={idx}>
          <Text dimColor>  </Text>
          <Text>{mapping.providerGroup}</Text>
          <Text dimColor> -&gt; </Text>
          <Text color="cyan">{mapping.localRole}</Text>
        </Box>
      ))}
    </Box>
  );
}

function SessionsDisplay({ sessions }: { sessions: SessionSummary }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>Sessions:</Text>
      <Box>
        <Text dimColor>  Active: </Text>
        <Text color="green">{sessions.active}</Text>
        <Text dimColor> / Total: </Text>
        <Text>{sessions.total}</Text>
      </Box>
      {Object.keys(sessions.byProvider).length > 0 && (
        <Box>
          <Text dimColor>  By provider: </Text>
          <Text>
            {Object.entries(sessions.byProvider)
              .map(([name, count]) => `${name}: ${count}`)
              .join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function MfaDisplay({ stats }: { stats: MfaStats }) {
  const percentage = stats.total > 0 ? Math.round((stats.enrolled / stats.total) * 100) : 0;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold dimColor>MFA Enrollment:</Text>
      <Box>
        <Text dimColor>  Enrolled: </Text>
        <Text color={percentage >= 80 ? 'green' : percentage >= 50 ? 'yellow' : 'red'}>
          {stats.enrolled}
        </Text>
        <Text dimColor> / </Text>
        <Text>{stats.total}</Text>
        <Text dimColor> ({percentage}%)</Text>
      </Box>
      {stats.pending > 0 && (
        <Box>
          <Text dimColor>  Pending: </Text>
          <Text color="yellow">{stats.pending}</Text>
        </Box>
      )}
      {stats.methods.length > 0 && (
        <Box>
          <Text dimColor>  Methods: </Text>
          <Text>{stats.methods.join(', ')}</Text>
        </Box>
      )}
    </Box>
  );
}

function LoadingIndicator() {
  return (
    <Box marginTop={1}>
      <Text color="cyan">Loading SSO configuration...</Text>
    </Box>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>Error</Text>
      <Text color="red">{error}</Text>
    </Box>
  );
}

export function SSOPane({
  providers,
  roleMappings,
  sessions,
  mfaStats,
  onAddProvider,
  onRemoveProvider,
  onRefresh,
  loading = false,
  error = null,
  isActive = false,
}: SSOPaneProps) {
  useInput(
    (input, _key) => {
      if (!isActive) return;

      // Add provider with 'a'
      if (input === 'a' && onAddProvider) {
        onAddProvider();
      }

      // Delete/remove provider with 'd'
      if (input === 'd' && onRemoveProvider && providers.length > 0) {
        // Remove first provider for simplicity; in real app would have selection
        onRemoveProvider(providers[0].name);
      }

      // Refresh with 'r'
      if (input === 'r' && onRefresh) {
        onRefresh();
      }
    },
    { isActive }
  );

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>SSO Management</Text>
        {providers.length > 0 && (
          <Text dimColor> ({providers.length} provider{providers.length !== 1 ? 's' : ''})</Text>
        )}
      </Box>

      {/* Loading State */}
      {loading && <LoadingIndicator />}

      {/* Error State */}
      {error && <ErrorDisplay error={error} />}

      {/* Main Content (only when not loading) */}
      {!loading && (
        <>
          {/* Providers List */}
          <ProvidersList providers={providers} />

          {/* Role Mappings */}
          <RoleMappingTable mappings={roleMappings} />

          {/* Sessions */}
          <SessionsDisplay sessions={sessions} />

          {/* MFA Stats */}
          <MfaDisplay stats={mfaStats} />
        </>
      )}

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            {onAddProvider && '[a] Add provider  '}
            {onRemoveProvider && providers.length > 0 && '[d] Remove provider  '}
            {onRefresh && '[r] Refresh'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default SSOPane;
