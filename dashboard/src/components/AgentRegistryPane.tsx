import { Box, Text, useInput } from 'ink';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Spinner from 'ink-spinner';

// Type definitions for agent data
interface AgentState {
  current: string;
  history?: Array<{ state: string; timestamp: string }>;
}

interface AgentMetadata {
  model: string;
  tokens?: { input: number; output: number };
  cost?: number;
}

interface Agent {
  id: string;
  name: string;
  state: AgentState;
  metadata: AgentMetadata;
  createdAt?: string;
}

type LoadAgentsFn = () => Agent[];

interface AgentRegistryPaneProps {
  isActive: boolean;
  isTTY?: boolean;
  statusFilter?: string;
  modelFilter?: string;
  selectedAgentId?: string;
  refreshInterval?: number;
  onCancelAgent?: (agentId: string) => void;
  // For testing: inject agent loader function
  loadAgentsFn?: LoadAgentsFn;
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray',
};

// Default loader that uses the registry
const defaultLoadAgents: LoadAgentsFn = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const registry = require('../../../server/lib/agent-registry.js').default;
  return registry.listAgents() || [];
};

export function AgentRegistryPane({
  isActive,
  isTTY = true,
  statusFilter,
  modelFilter,
  selectedAgentId,
  refreshInterval = 2000,
  onCancelAgent,
  loadAgentsFn = defaultLoadAgents,
}: AgentRegistryPaneProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load agents from registry
  const loadAgents = useCallback(() => {
    try {
      const allAgents = loadAgentsFn();
      setAgents(allAgents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading agents');
      setAgents([]);
    }
  }, [loadAgentsFn]);

  // Initial load and refresh interval
  useEffect(() => {
    loadAgents();

    const interval = setInterval(loadAgents, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAgents, refreshInterval]);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      if (statusFilter && agent.state.current !== statusFilter) {
        return false;
      }
      if (modelFilter && agent.metadata.model !== modelFilter) {
        return false;
      }
      return true;
    });
  }, [agents, statusFilter, modelFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    running: agents.filter(a => a.state.current === 'running').length,
    completed: agents.filter(a => a.state.current === 'completed').length,
    failed: agents.filter(a => a.state.current === 'failed').length,
    pending: agents.filter(a => a.state.current === 'pending').length,
  }), [agents]);

  const hasRunningAgents = stats.running > 0;

  // Get selected agent details
  const selectedAgent = selectedAgentId
    ? agents.find(a => a.id === selectedAgentId)
    : filteredAgents[selectedIndex];

  // Handle keyboard input
  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredAgents.length - 1, prev + 1));
    } else if (input === 'c' && selectedAgent && selectedAgent.state.current === 'running') {
      onCancelAgent?.(selectedAgent.id);
    }
  }, { isActive: isTTY });

  // Error state
  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold color="red">Error: {error}</Text>
      </Box>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Agent Registry</Text>
        <Box marginTop={1}>
          <Text color="gray">No agents registered</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {/* Header with stats */}
      <Box marginBottom={1}>
        <Text bold>Agent Registry </Text>
        <Text color="gray">(</Text>
        {stats.running > 0 && <Text color="cyan">{stats.running} running</Text>}
        {stats.running > 0 && (stats.completed > 0 || stats.failed > 0) && <Text color="gray">, </Text>}
        {stats.completed > 0 && <Text color="green">{stats.completed} completed</Text>}
        {stats.completed > 0 && stats.failed > 0 && <Text color="gray">, </Text>}
        {stats.failed > 0 && <Text color="red">{stats.failed} failed</Text>}
        <Text color="gray">)</Text>
      </Box>

      {/* Agent list */}
      <Box flexDirection="column">
        {filteredAgents.map((agent, index) => (
          <Box key={agent.id} marginBottom={0}>
            <Text color={index === selectedIndex && isActive ? 'white' : 'gray'}>
              {index === selectedIndex && isActive ? '→ ' : '  '}
            </Text>
            {agent.state.current === 'running' && (
              <Text color="cyan">
                <Spinner type="dots" />
                {' '}
              </Text>
            )}
            <Text color={STATUS_COLORS[agent.state.current] || 'white'}>
              [{agent.state.current}]
            </Text>
            <Text> </Text>
            <Text>{agent.id.slice(0, 12)}</Text>
            <Text color="gray"> - {agent.name || 'unnamed'}</Text>
            <Text color="gray"> ({agent.metadata.model})</Text>
          </Box>
        ))}
      </Box>

      {/* Selected agent details */}
      {selectedAgent && selectedAgentId && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" paddingX={1}>
          <Text bold>Details: {selectedAgent.id}</Text>
          <Text>Name: {selectedAgent.name}</Text>
          <Text>Model: {selectedAgent.metadata.model}</Text>
          <Text>Status: {selectedAgent.state.current}</Text>
          {selectedAgent.metadata.tokens && (
            <Text>
              Tokens: {selectedAgent.metadata.tokens.input} in / {selectedAgent.metadata.tokens.output} out
            </Text>
          )}
        </Box>
      )}

      {/* Controls */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>
            [↑↓] Navigate
            {hasRunningAgents && ' [c] cancel'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default AgentRegistryPane;
