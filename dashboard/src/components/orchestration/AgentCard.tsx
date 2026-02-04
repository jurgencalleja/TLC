import { Box, Text } from 'ink';

type AgentStatus = 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'cancelled';

interface AgentTokens {
  input: number;
  output: number;
}

interface QualityInfo {
  score: number;
  pass: boolean;
}

interface Agent {
  id: string;
  name?: string;
  model: string;
  status: AgentStatus;
  startTime: Date;
  tokens: AgentTokens;
  cost: number;
  quality?: QualityInfo;
}

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  selected?: boolean;
}

export function AgentCard({ agent, onClick, selected }: AgentCardProps) {
  const { id, model, status, tokens, cost, quality } = agent;

  const getStatusColor = (s: AgentStatus): string => {
    switch (s) {
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'queued':
        return 'yellow';
      case 'paused':
        return 'gray';
      case 'cancelled':
        return 'gray';
      default:
        return 'white';
    }
  };

  const getStatusIcon = (s: AgentStatus): string => {
    switch (s) {
      case 'running':
        return '●';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'queued':
        return '○';
      case 'paused':
        return '⏸';
      case 'cancelled':
        return '⊘';
      default:
        return '?';
    }
  };

  const getModelIcon = (m: string): string => {
    if (m.includes('gpt')) return '🤖';
    if (m.includes('claude')) return '🔮';
    if (m.includes('gemini')) return '✨';
    return '🔧';
  };

  const formatCost = (c: number): string => {
    return `$${c.toFixed(4)}`;
  };

  const formatElapsed = (): string => {
    const elapsed = Math.floor((Date.now() - agent.startTime.getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? 'double' : 'single'}
      borderColor={selected ? 'cyan' : 'gray'}
      paddingX={1}
      marginBottom={1}
    >
      {/* Header: ID and Status */}
      <Box justifyContent="space-between">
        <Text bold>{id}</Text>
        <Text color={getStatusColor(status)}>
          {getStatusIcon(status)} {status}
        </Text>
      </Box>

      {/* Model */}
      <Box>
        <Text dimColor>Model: </Text>
        <Text>{getModelIcon(model)} {model}</Text>
      </Box>

      {/* Stats Row */}
      <Box marginTop={1} gap={2}>
        <Box>
          <Text dimColor>Time: </Text>
          <Text>{formatElapsed()}</Text>
        </Box>
        <Box>
          <Text dimColor>Tokens: </Text>
          <Text>{tokens.input + tokens.output}</Text>
        </Box>
        <Box>
          <Text dimColor>Cost: </Text>
          <Text color="yellow">{formatCost(cost)}</Text>
        </Box>
      </Box>

      {/* Quality (if available) */}
      {quality && (
        <Box>
          <Text dimColor>Quality: </Text>
          <Text color={quality.pass ? 'green' : 'red'}>
            {quality.score}% {quality.pass ? '✓' : '✗'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
