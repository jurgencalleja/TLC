import { Box, Text } from 'ink';

type AgentStatus = 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'cancelled';

interface AgentControlsProps {
  status: AgentStatus;
  transitioning?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function AgentControls({
  status,
  transitioning,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: AgentControlsProps) {
  const isDisabled = transitioning;

  const renderButton = (label: string, icon: string, color: string, enabled: boolean) => {
    if (!enabled) return null;

    return (
      <Box marginRight={1}>
        <Text color={isDisabled ? 'gray' : color} dimColor={isDisabled}>
          [{icon} {label}]
        </Text>
      </Box>
    );
  };

  // Determine which buttons to show based on status
  const showPause = status === 'running';
  const showResume = status === 'paused';
  const showCancel = status === 'running' || status === 'queued' || status === 'paused';
  const showRetry = status === 'failed' || status === 'cancelled';

  // If completed, no actions available
  if (status === 'completed') {
    return (
      <Box>
        <Text dimColor>No actions available</Text>
      </Box>
    );
  }

  return (
    <Box>
      {showPause && renderButton('Pause', '⏸', 'yellow', true)}
      {showResume && renderButton('Resume', '▶', 'green', true)}
      {showCancel && renderButton('Cancel', '✗', 'red', true)}
      {showRetry && renderButton('Retry', '↻', 'blue', true)}
    </Box>
  );
}
