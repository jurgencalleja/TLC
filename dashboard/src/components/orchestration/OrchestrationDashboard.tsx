import { Box, Text } from 'ink';
import { useState } from 'react';
import { AgentList } from './AgentList.js';
import { CostMeter } from './CostMeter.js';

type AgentStatus = 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'cancelled';

interface Agent {
  id: string;
  name?: string;
  model: string;
  status: AgentStatus;
  startTime: Date;
  tokens: { input: number; output: number };
  cost: number;
}

interface CostData {
  spent: number;
  budget: number;
  breakdown?: Record<string, number>;
}

interface OrchestrationDashboardProps {
  agents: Agent[];
  cost: CostData;
  width?: number;
  error?: string;
  onConnect?: () => void;
  onSelectAgent?: (agentId: string) => void;
}

export function OrchestrationDashboard({
  agents,
  cost,
  width = 120,
  error,
  onConnect,
  onSelectAgent,
}: OrchestrationDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();

  // Handle error state
  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold color="red">Dashboard error</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  // Calculate summary stats
  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === 'running').length,
    completed: agents.filter((a) => a.status === 'completed').length,
    failed: agents.filter((a) => a.status === 'failed').length,
    queued: agents.filter((a) => a.status === 'queued').length,
  };

  const totalTokens = agents.reduce(
    (sum, a) => sum + a.tokens.input + a.tokens.output,
    0
  );

  const handleSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    onSelectAgent?.(agentId);
  };

  // Responsive layout
  const isNarrow = width < 100;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Orchestration Dashboard</Text>
        <Text dimColor> - {stats.total} agents</Text>
      </Box>

      {/* Summary Stats */}
      <Box marginBottom={1}>
        <Text color="blue">{stats.running} running</Text>
        <Text> | </Text>
        <Text color="yellow">{stats.queued} queued</Text>
        <Text> | </Text>
        <Text color="green">{stats.completed} completed</Text>
        {stats.failed > 0 && (
          <>
            <Text> | </Text>
            <Text color="red">{stats.failed} failed</Text>
          </>
        )}
        <Text dimColor> | {totalTokens.toLocaleString()} tokens</Text>
      </Box>

      {/* Main Content */}
      <Box flexDirection={isNarrow ? 'column' : 'row'}>
        {/* Agent List */}
        <Box flexDirection="column" flexGrow={1}>
          <AgentList
            agents={agents}
            selected={selectedAgent}
            onSelect={handleSelect}
          />
        </Box>

        {/* Cost Sidebar */}
        <Box
          flexDirection="column"
          marginLeft={isNarrow ? 0 : 2}
          marginTop={isNarrow ? 1 : 0}
          width={isNarrow ? '100%' : 30}
        >
          <CostMeter
            spent={cost.spent}
            budget={cost.budget}
            breakdown={cost.breakdown}
          />
        </Box>
      </Box>

      {/* Empty State */}
      {agents.length === 0 && !error && (
        <Box marginTop={1}>
          <Text dimColor>No agents currently running. Start an orchestration to see activity.</Text>
        </Box>
      )}

      {/* Keyboard Hints */}
      <Box marginTop={1}>
        <Text dimColor>
          ↑/↓ Select | Enter View | P Pause | C Cancel | R Retry | Q Quit
        </Text>
      </Box>
    </Box>
  );
}
