import React from 'react';
import { Box, Text, useInput } from 'ink';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface ConnectionStatusProps {
  state: ConnectionState;
  serverUrl?: string;
  lastConnected?: string;
  latencyMs?: number;
  errorMessage?: string;
  autoReconnect?: boolean;
  reconnectIn?: number;
  attemptCount?: number;
  compact?: boolean;
  isActive?: boolean;
  onReconnect?: () => void;
  onCancel?: () => void;
}

const stateConfig: Record<
  ConnectionState,
  { icon: string; color: string; label: string }
> = {
  connected: { icon: '●', color: 'green', label: 'connected' },
  connecting: { icon: '◐', color: 'yellow', label: 'connecting' },
  disconnected: { icon: '○', color: 'red', label: 'disconnected' },
};

export function ConnectionStatus({
  state,
  serverUrl,
  lastConnected,
  latencyMs,
  errorMessage,
  autoReconnect = false,
  reconnectIn,
  attemptCount,
  compact = false,
  isActive = true,
  onReconnect,
  onCancel,
}: ConnectionStatusProps) {
  const config = stateConfig[state];

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Manual reconnect
      if (input === 'r' && state === 'disconnected' && onReconnect) {
        onReconnect();
      }

      // Cancel reconnect
      if (key.escape && autoReconnect && state === 'disconnected' && onCancel) {
        onCancel();
      }
    },
    { isActive }
  );

  // Compact mode
  if (compact) {
    return (
      <Box>
        <Text color={config.color as any}>{config.icon}</Text>
        <Text color={config.color as any}> {config.label}</Text>
        {state === 'connected' && latencyMs !== undefined && (
          <Text dimColor> ({latencyMs}ms)</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Status line */}
      <Box>
        <Text color={config.color as any} bold>
          {config.icon} {config.label}
        </Text>

        {/* Latency for connected */}
        {state === 'connected' && latencyMs !== undefined && (
          <Text dimColor> ({latencyMs}ms)</Text>
        )}

        {/* Attempt count for connecting */}
        {state === 'connecting' && attemptCount !== undefined && (
          <Text dimColor> (attempt {attemptCount})</Text>
        )}
      </Box>

      {/* Server URL */}
      {serverUrl && (
        <Box marginTop={1}>
          <Text dimColor>Server: </Text>
          <Text color="cyan">{serverUrl}</Text>
        </Box>
      )}

      {/* Last connected (for disconnected state) */}
      {state !== 'connected' && lastConnected && (
        <Box marginTop={1}>
          <Text dimColor>Last connected: </Text>
          <Text>{lastConnected}</Text>
        </Box>
      )}

      {/* Connected timestamp */}
      {state === 'connected' && lastConnected && (
        <Box marginTop={1}>
          <Text dimColor>Connected: </Text>
          <Text>{lastConnected}</Text>
        </Box>
      )}

      {/* Error message */}
      {state === 'disconnected' && errorMessage && (
        <Box marginTop={1}>
          <Text color="red">Error: {errorMessage}</Text>
        </Box>
      )}

      {/* Auto-reconnect countdown */}
      {state === 'disconnected' && autoReconnect && reconnectIn !== undefined && (
        <Box marginTop={1}>
          <Text color="yellow">
            Reconnecting in {reconnectIn}s...
          </Text>
        </Box>
      )}

      {/* Action hints */}
      {state === 'disconnected' && (
        <Box marginTop={1}>
          <Text dimColor>
            r reconnect
            {autoReconnect && ' • Esc cancel'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
