import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { safeFetch, type FetchError } from '../api/safeFetch.js';
import { ErrorState } from './ui/ErrorState.js';
import { EmptyState } from './ui/EmptyState.js';
import { Skeleton } from './ui/Skeleton.js';

interface ProviderInfo {
  detected: boolean;
  type: 'cli' | 'api';
  version?: string;
  capabilities?: string[];
  healthy?: boolean;
}

interface RouterApiResponse {
  providers: Record<string, ProviderInfo>;
  devserver: {
    configured: boolean;
    connected?: boolean;
    url?: string;
  };
  capabilities?: Record<string, { providers: string[] }>;
  costEstimate?: Record<string, { local: number; devserver: number }>;
}

interface RouterPaneProps {
  apiBaseUrl?: string;
  refreshInterval?: number;
}

type LoadingState = 'loading' | 'success' | 'error' | 'empty';

export function RouterPane({
  apiBaseUrl = 'http://localhost:5001',
  refreshInterval = 30000,
}: RouterPaneProps) {
  const [data, setData] = useState<RouterApiResponse | null>(null);
  const [error, setError] = useState<FetchError | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  const fetchRouterData = useCallback(async () => {
    const result = await safeFetch<RouterApiResponse>(`${apiBaseUrl}/api/router`);

    if (result.error) {
      setError(result.error);
      setLoadingState('error');
      return;
    }

    if (!result.data || Object.keys(result.data.providers || {}).length === 0) {
      setData(result.data);
      setLoadingState('empty');
      return;
    }

    setData(result.data);
    setError(null);
    setLoadingState('success');
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchRouterData();
    const interval = setInterval(fetchRouterData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchRouterData, refreshInterval]);

  // Loading state with skeleton
  if (loadingState === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model Router</Text>
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Loading...</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Skeleton.Text lines={3} width={30} />
        </Box>
      </Box>
    );
  }

  // Error state
  if (loadingState === 'error' && error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model Router</Text>
        <Box marginTop={1}>
          <ErrorState error={error} onRetry={fetchRouterData} />
        </Box>
      </Box>
    );
  }

  // Empty state
  if (loadingState === 'empty' || !data) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Model Router</Text>
        <Box marginTop={1}>
          <EmptyState type="router" />
        </Box>
      </Box>
    );
  }

  // Calculate total estimated cost
  let totalCost = 0;
  if (data.costEstimate) {
    for (const cap of Object.values(data.costEstimate)) {
      totalCost += cap.devserver || 0;
    }
  }
  const costStr = totalCost > 0 ? `$${totalCost.toFixed(2)}` : '$0.00';

  // Build routing display from capabilities
  const routingEntries: Array<{ capability: string; providers: Array<{ name: string; location: string }> }> = [];
  if (data.capabilities) {
    for (const [capability, info] of Object.entries(data.capabilities)) {
      const providers = info.providers.map((name) => {
        const providerInfo = data.providers[name];
        const location = providerInfo?.type === 'cli' && providerInfo?.detected ? 'local' : 'devserver';
        return { name, location };
      });
      routingEntries.push({ capability, providers });
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Model Router</Text>
      <Text> </Text>

      {/* Local CLIs */}
      <Text bold>Local CLIs</Text>
      {Object.entries(data.providers).map(([name, info]) => (
        <Box key={name}>
          <Text color={info.detected ? 'green' : 'gray'}>
            {info.detected ? '\u2713' : '\u25CB'} {name}
          </Text>
          {info.version && <Text dimColor> v{info.version}</Text>}
          <Text dimColor> - {info.detected ? 'available' : 'not found'}</Text>
        </Box>
      ))}

      <Text> </Text>

      {/* Devserver */}
      <Text bold>Devserver</Text>
      <Text color={data.devserver.connected ? 'green' : 'red'}>
        {data.devserver.connected ? '\u25CF Connected' : '\u25CF Disconnected'}
      </Text>

      {/* Routing Table */}
      {routingEntries.length > 0 && (
        <>
          <Text> </Text>
          <Text bold>Routing</Text>
          {routingEntries.map(({ capability, providers }) => (
            <Box key={capability}>
              <Text>{capability}: </Text>
              {providers.map((p, i) => (
                <Text key={p.name} color={p.location === 'local' ? 'cyan' : 'yellow'}>
                  {i > 0 ? ' \u2192 ' : ''}
                  {p.name} ({p.location})
                </Text>
              ))}
            </Box>
          ))}
        </>
      )}

      <Text> </Text>

      {/* Estimated Cost */}
      <Text bold>Estimated Cost</Text>
      <Text color="yellow">{costStr}/day</Text>
    </Box>
  );
}

export default RouterPane;
