import { Box, Text, useInput } from 'ink';
import { useState, useCallback } from 'react';
import Spinner from 'ink-spinner';

type ContainerStatus = 'stopped' | 'starting' | 'running' | 'error';

interface PreviewPaneProps {
  isActive: boolean;
}

export function PreviewPane({ isActive }: PreviewPaneProps) {
  const [status, setStatus] = useState<ContainerStatus>('stopped');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startContainer = useCallback(async () => {
    setStatus('starting');
    setError(null);

    try {
      // TODO: Integrate with dockerode
      // For now, simulate container start
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStatus('running');
      setUrl('http://localhost:3000');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Failed to start container');
    }
  }, []);

  const stopContainer = useCallback(async () => {
    setStatus('stopped');
    setUrl(null);
  }, []);

  useInput((input, key) => {
    if (!isActive) return;

    if (input === 's' && status === 'stopped') {
      startContainer();
    } else if (input === 'x' && status === 'running') {
      stopContainer();
    } else if (input === 'r' && status === 'running') {
      // Restart
      stopContainer().then(startContainer);
    }
  });

  return (
    <Box padding={1} flexDirection="column">
      <Box>
        <Text>Status: </Text>
        {status === 'stopped' && <Text color="gray">Stopped</Text>}
        {status === 'starting' && (
          <>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow"> Starting...</Text>
          </>
        )}
        {status === 'running' && <Text color="green">Running</Text>}
        {status === 'error' && <Text color="red">Error</Text>}
      </Box>

      {url && (
        <Box marginTop={1}>
          <Text color="cyan">{url}</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {status === 'stopped' && isActive && '[s] Start'}
          {status === 'running' && isActive && '[x] Stop | [r] Restart'}
          {!isActive && 'Tab to this pane for controls'}
        </Text>
      </Box>
    </Box>
  );
}
