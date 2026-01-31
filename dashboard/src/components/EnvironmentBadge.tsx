import React from 'react';
import { Box, Text } from 'ink';

export type Environment = 'local' | 'vps' | 'staging' | 'production';

export interface EnvironmentBadgeProps {
  environment: Environment;
  branch?: string;
  version?: string;
  commit?: string;
  url?: string;
  connected?: boolean;
  compact?: boolean;
}

const envConfig: Record<Environment, { label: string; color: string; icon: string }> = {
  local: { label: 'local', color: 'green', icon: '◆' },
  vps: { label: 'vps', color: 'cyan', icon: '◈' },
  staging: { label: 'staging', color: 'yellow', icon: '◇' },
  production: { label: 'PROD', color: 'red', icon: '⚠' },
};

export function EnvironmentBadge({
  environment,
  branch,
  version,
  commit,
  url,
  connected,
  compact = false,
}: EnvironmentBadgeProps) {
  const config = envConfig[environment];
  const isProduction = environment === 'production';

  if (compact) {
    return (
      <Box>
        <Text color={config.color as any} bold>
          [{config.label}]
        </Text>
        {connected !== undefined && (
          <Text color={connected ? 'green' : 'red'}>
            {connected ? ' ●' : ' ○'}
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Environment badge */}
      <Box>
        <Text color={config.color as any} bold>
          {config.icon} {config.label}
        </Text>

        {/* Production warning */}
        {isProduction && (
          <Text color="red" bold> ⚠ CAUTION</Text>
        )}

        {/* Connection status */}
        {connected !== undefined && (
          <Text color={connected ? 'green' : 'red'}>
            {connected ? ' ● connected' : ' ○ disconnected'}
          </Text>
        )}
      </Box>

      {/* Branch/version info */}
      <Box marginTop={1}>
        {branch && (
          <Box marginRight={2}>
            <Text dimColor>branch: </Text>
            <Text color="cyan">{branch}</Text>
          </Box>
        )}

        {version && (
          <Box marginRight={2}>
            <Text dimColor>v</Text>
            <Text>{version}</Text>
          </Box>
        )}

        {commit && (
          <Box>
            <Text dimColor>@</Text>
            <Text color="yellow">{commit.slice(0, 7)}</Text>
          </Box>
        )}
      </Box>

      {/* URL */}
      {url && (
        <Box marginTop={1}>
          <Text dimColor>url: </Text>
          <Text color="blue">{url}</Text>
        </Box>
      )}
    </Box>
  );
}
