import { Box, Text } from 'ink';
import { AgentCard } from './AgentCard.js';

type AgentStatus = 'running' | 'queued' | 'completed' | 'failed' | 'paused' | 'cancelled';
type SortField = 'startTime' | 'cost' | 'model' | 'status';

interface Agent {
  id: string;
  name?: string;
  model: string;
  status: AgentStatus;
  startTime: Date;
  tokens: { input: number; output: number };
  cost: number;
  quality?: { score: number; pass: boolean };
}

interface AgentListProps {
  agents: Agent[];
  filter?: AgentStatus | 'all';
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  page?: number;
  loading?: boolean;
  selected?: string;
  onSelect?: (agentId: string) => void;
}

export function AgentList({
  agents,
  filter = 'all',
  sortBy = 'startTime',
  sortOrder = 'desc',
  pageSize = 10,
  page = 1,
  loading,
  selected,
  onSelect,
}: AgentListProps) {
  if (loading) {
    return (
      <Box padding={1}>
        <Text>Loading agents...</Text>
      </Box>
    );
  }

  // Filter
  let filteredAgents = filter === 'all'
    ? agents
    : agents.filter((a) => a.status === filter);

  // Sort
  filteredAgents = [...filteredAgents].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'startTime':
        cmp = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        break;
      case 'cost':
        cmp = a.cost - b.cost;
        break;
      case 'model':
        cmp = a.model.localeCompare(b.model);
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // Paginate
  const totalPages = Math.ceil(filteredAgents.length / pageSize);
  const startIdx = (page - 1) * pageSize;
  const paginatedAgents = filteredAgents.slice(startIdx, startIdx + pageSize);

  // Empty state
  if (agents.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Agents</Text>
        <Text dimColor>No agents running</Text>
      </Box>
    );
  }

  // Count by status
  const counts = {
    running: agents.filter((a) => a.status === 'running').length,
    queued: agents.filter((a) => a.status === 'queued').length,
    completed: agents.filter((a) => a.status === 'completed').length,
    failed: agents.filter((a) => a.status === 'failed').length,
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header with status counts */}
      <Box marginBottom={1}>
        <Text bold>Agents </Text>
        <Text color="blue">{counts.running} running</Text>
        <Text> | </Text>
        <Text color="yellow">{counts.queued} queued</Text>
        <Text> | </Text>
        <Text color="green">{counts.completed} completed</Text>
        {counts.failed > 0 && (
          <>
            <Text> | </Text>
            <Text color="red">{counts.failed} failed</Text>
          </>
        )}
      </Box>

      {/* Agent cards */}
      {paginatedAgents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          selected={selected === agent.id}
          onClick={() => onSelect?.(agent.id)}
        />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box marginTop={1}>
          <Text dimColor>Page {page} of {totalPages}</Text>
          {page > 1 && <Text> [← Prev]</Text>}
          {page < totalPages && <Text> [Next →]</Text>}
        </Box>
      )}
    </Box>
  );
}
