import { Box, Text, useInput } from 'ink';
import { useState, useCallback } from 'react';
import Spinner from 'ink-spinner';
import { spawn, ChildProcess } from 'child_process';

type AgentStatus = 'idle' | 'working' | 'done' | 'error';

interface Agent {
  id: number;
  status: AgentStatus;
  task: string | null;
  issueNumber: number | null;
  output: string[];
  process: ChildProcess | null;
}

interface AgentsPaneProps {
  isActive: boolean;
  isTTY?: boolean;
  onTaskComplete?: (issueNumber: number) => void;
}

const MAX_AGENTS = 3;

export function AgentsPane({ isActive, isTTY = true, onTaskComplete }: AgentsPaneProps) {
  const [agents, setAgents] = useState<Agent[]>([
    { id: 1, status: 'idle', task: null, issueNumber: null, output: [], process: null },
    { id: 2, status: 'idle', task: null, issueNumber: null, output: [], process: null },
    { id: 3, status: 'idle', task: null, issueNumber: null, output: [], process: null },
  ]);

  const assignTask = useCallback((agentId: number, task: string, issueNumber: number) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== agentId) return agent;

      // Spawn Claude Code process for this task
      const proc = spawn('claude', ['-p', `Work on task: ${task}. When done, output TASK_COMPLETE.`], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const output: string[] = [];

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        output.push(text);

        // Check if task is complete
        if (text.includes('TASK_COMPLETE')) {
          setAgents(prev => prev.map(a =>
            a.id === agentId ? { ...a, status: 'done', output } : a
          ));
          onTaskComplete?.(issueNumber);
        }
      });

      proc.stderr?.on('data', (data) => {
        output.push(`[ERROR] ${data.toString()}`);
      });

      proc.on('close', (code) => {
        setAgents(prev => prev.map(a =>
          a.id === agentId ? {
            ...a,
            status: code === 0 ? 'done' : 'error',
            process: null
          } : a
        ));
      });

      return {
        ...agent,
        status: 'working' as AgentStatus,
        task,
        issueNumber,
        output: [],
        process: proc
      };
    }));
  }, [onTaskComplete]);

  const stopAgent = useCallback((agentId: number) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== agentId) return agent;
      agent.process?.kill();
      return { ...agent, status: 'idle', task: null, issueNumber: null, process: null };
    }));
  }, []);

  useInput((input, key) => {
    if (!isActive) return;

    // 1, 2, 3 to select agent
    // s to stop selected agent
    const agentNum = parseInt(input);
    if (agentNum >= 1 && agentNum <= 3) {
      const agent = agents[agentNum - 1];
      if (agent.status === 'working') {
        stopAgent(agentNum);
      }
    }
  }, { isActive: isTTY });

  return (
    <Box padding={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Agents ({agents.filter(a => a.status === 'working').length}/{MAX_AGENTS} active)</Text>
      </Box>

      {agents.map((agent) => (
        <Box key={agent.id} marginBottom={1}>
          <Text color="gray">[{agent.id}] </Text>
          {agent.status === 'idle' && (
            <Text color="gray">Idle</Text>
          )}
          {agent.status === 'working' && (
            <>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text color="cyan"> #{agent.issueNumber}: </Text>
              <Text>{agent.task?.slice(0, 30)}...</Text>
            </>
          )}
          {agent.status === 'done' && (
            <>
              <Text color="green">Done </Text>
              <Text color="gray">#{agent.issueNumber}</Text>
            </>
          )}
          {agent.status === 'error' && (
            <Text color="red">Error</Text>
          )}
        </Box>
      ))}

      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>[1-3] Stop agent</Text>
        </Box>
      )}
    </Box>
  );
}

export function getIdleAgent(agents: Agent[]): Agent | undefined {
  return agents.find(a => a.status === 'idle');
}
