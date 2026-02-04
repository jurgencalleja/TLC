import { Box, Text } from 'ink';

type AgentStatus = 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'cancelled';

interface TimelineEntry {
  state: string;
  timestamp: Date;
}

interface AgentError {
  message: string;
  code?: string;
  stack?: string;
}

interface Agent {
  id: string;
  name?: string;
  model: string;
  status: AgentStatus;
  startTime: Date;
  endTime?: Date;
  tokens: { input: number; output: number };
  cost: number;
  output?: string;
  error?: AgentError;
  timeline?: TimelineEntry[];
}

interface AgentDetailProps {
  agent?: Agent;
  loading?: boolean;
  showStack?: boolean;
  onClose?: () => void;
  onRetry?: () => void;
}

export function AgentDetail({
  agent,
  loading,
  showStack,
  onClose,
  onRetry,
}: AgentDetailProps) {
  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading agent details...</Text>
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box padding={1}>
        <Text dimColor>No agent selected</Text>
      </Box>
    );
  }

  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'running': return 'blue';
      case 'queued': return 'yellow';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'paused': return 'yellow';
      case 'cancelled': return 'gray';
      default: return 'white';
    }
  };

  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const ms = new Date(endTime).getTime() - new Date(start).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Agent Details</Text>
        {onClose && (
          <Text dimColor> [← Close]</Text>
        )}
      </Box>

      {/* Metadata */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>ID: </Text>
          <Text>{agent.id}</Text>
        </Box>
        {agent.name && (
          <Box>
            <Text dimColor>Name: </Text>
            <Text>{agent.name}</Text>
          </Box>
        )}
        <Box>
          <Text dimColor>Model: </Text>
          <Text color="cyan">{agent.model}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={getStatusColor(agent.status)}>{agent.status}</Text>
        </Box>
        <Box>
          <Text dimColor>Duration: </Text>
          <Text>{formatDuration(agent.startTime, agent.endTime)}</Text>
        </Box>
      </Box>

      {/* Token Breakdown */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold dimColor>Tokens</Text>
        <Box>
          <Text dimColor>  Input: </Text>
          <Text>{agent.tokens.input.toLocaleString()}</Text>
        </Box>
        <Box>
          <Text dimColor>  Output: </Text>
          <Text>{agent.tokens.output.toLocaleString()}</Text>
        </Box>
        <Box>
          <Text dimColor>  Total: </Text>
          <Text>{(agent.tokens.input + agent.tokens.output).toLocaleString()}</Text>
        </Box>
      </Box>

      {/* Cost Breakdown */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold dimColor>Cost</Text>
        <Box>
          <Text dimColor>  Total: </Text>
          <Text color="yellow">${agent.cost.toFixed(4)}</Text>
        </Box>
      </Box>

      {/* Timeline */}
      {agent.timeline && agent.timeline.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold dimColor>Timeline</Text>
          {agent.timeline.map((entry, i) => (
            <Box key={i}>
              <Text dimColor>  {formatTimestamp(entry.timestamp)} </Text>
              <Text>{entry.state}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Output Preview */}
      {agent.output && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold dimColor>Output Preview</Text>
          <Box borderStyle="single" padding={1}>
            <Text>
              {agent.output.length > 200
                ? agent.output.substring(0, 200) + '...'
                : agent.output}
            </Text>
          </Box>
        </Box>
      )}

      {/* Error Details */}
      {agent.status === 'failed' && agent.error && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="red">Error</Text>
          <Box>
            <Text dimColor>  Message: </Text>
            <Text color="red">{agent.error.message}</Text>
          </Box>
          {agent.error.code && (
            <Box>
              <Text dimColor>  Code: </Text>
              <Text>{agent.error.code}</Text>
            </Box>
          )}
          {showStack && agent.error.stack && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Stack Trace:</Text>
              <Text dimColor>{agent.error.stack}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Actions */}
      <Box marginTop={1}>
        {(agent.status === 'failed' || agent.status === 'cancelled') && (
          <Box marginRight={1}>
            <Text color="blue">[↻ Retry]</Text>
          </Box>
        )}
        {onClose && (
          <Text dimColor>[Close]</Text>
        )}
      </Box>
    </Box>
  );
}
