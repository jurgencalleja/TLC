import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';

interface Provider {
  type: 'cli' | 'api';
  detected?: boolean;
  version?: string;
  healthy?: boolean;
  capabilities?: string[];
}

interface DevserverStatus {
  configured: boolean;
  connected?: boolean;
  url?: string;
}

interface CostEstimate {
  [capability: string]: {
    local: number;
    devserver: number;
  };
}

interface RouterStatus {
  providers: Record<string, Provider>;
  devserver: DevserverStatus;
  capabilities?: Record<string, { providers: string[] }>;
  costEstimate?: CostEstimate;
}

interface RouterPaneProps {
  apiUrl?: string;
}

export default function RouterPane({ apiUrl = '/api/router/status' }: RouterPaneProps) {
  const [status, setStatus] = useState<RouterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [apiUrl]);

  if (loading) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Model Router</Text>
        <Box marginTop={1}>
          <Text color="gray">Loading router status...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Model Router</Text>
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      </Box>
    );
  }

  if (!status) {
    return null;
  }

  const providers = Object.entries(status.providers);
  const capabilities = Object.entries(status.capabilities || {});

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Model Router</Text>

      {/* Providers Section */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">Providers</Text>
        <Box marginTop={1} flexDirection="column">
          {providers.map(([name, provider]) => (
            <ProviderRow key={name} name={name} provider={provider} />
          ))}
          {providers.length === 0 && (
            <Text color="gray">No providers configured</Text>
          )}
        </Box>
      </Box>

      {/* Devserver Section */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">Devserver</Text>
        <DevserverRow devserver={status.devserver} />
      </Box>

      {/* Routing Table */}
      {capabilities.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">Routing</Text>
          <Box marginTop={1} flexDirection="column">
            {capabilities.map(([name, cap]) => (
              <CapabilityRow
                key={name}
                name={name}
                providers={cap.providers}
                allProviders={status.providers}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Cost Estimates */}
      {status.costEstimate && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">Cost Estimates (Monthly)</Text>
          <Box marginTop={1} flexDirection="column">
            {Object.entries(status.costEstimate).map(([name, costs]) => (
              <Box key={name}>
                <Text>{name.padEnd(12)}</Text>
                <Text color="green">local: $0.00</Text>
                <Text>  </Text>
                <Text color="yellow">devserver: ${costs.devserver.toFixed(2)}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ProviderRow({ name, provider }: { name: string; provider: Provider }) {
  const isLocal = provider.type === 'cli' && provider.detected;
  const healthIndicator = provider.healthy !== false ? '●' : '○';
  const healthColor = provider.healthy !== false ? 'green' : 'red';
  const routingBadge = isLocal ? 'local' : 'devserver';
  const badgeColor = isLocal ? 'green' : 'yellow';

  return (
    <Box>
      <Text color={healthColor}>{healthIndicator} </Text>
      <Text bold>{name.padEnd(10)}</Text>
      {provider.version && <Text color="gray"> {provider.version.padEnd(10)}</Text>}
      <Text color={badgeColor}>[{routingBadge}]</Text>
      {provider.capabilities && provider.capabilities.length > 0 && (
        <Text color="gray"> ({provider.capabilities.join(', ')})</Text>
      )}
    </Box>
  );
}

function DevserverRow({ devserver }: { devserver: DevserverStatus }) {
  if (!devserver.configured) {
    return (
      <Box marginTop={1}>
        <Text color="gray">Not configured - run </Text>
        <Text color="cyan">tlc router setup</Text>
      </Box>
    );
  }

  const statusText = devserver.connected ? 'Connected' : 'Disconnected';
  const statusColor = devserver.connected ? 'green' : 'red';
  const indicator = devserver.connected ? '●' : '○';

  return (
    <Box marginTop={1} flexDirection="column">
      <Box>
        <Text color={statusColor}>{indicator} {statusText}</Text>
      </Box>
      {devserver.url && (
        <Box>
          <Text color="gray">{devserver.url}</Text>
        </Box>
      )}
    </Box>
  );
}

function CapabilityRow({
  name,
  providers,
  allProviders,
}: {
  name: string;
  providers: string[];
  allProviders: Record<string, Provider>;
}) {
  return (
    <Box>
      <Text color="white">{name.padEnd(12)}</Text>
      <Text>→ </Text>
      {providers.map((p, idx) => {
        const provider = allProviders[p];
        const isLocal = provider?.type === 'cli' && provider?.detected;
        const color = isLocal ? 'green' : 'yellow';
        return (
          <Text key={p}>
            <Text color={color}>{p}</Text>
            {idx < providers.length - 1 && <Text>, </Text>}
          </Text>
        );
      })}
    </Box>
  );
}
