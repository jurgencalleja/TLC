import { Box, Text, useApp, useInput } from 'ink';
import { useState, useCallback } from 'react';
import { ChatPane } from './components/ChatPane.js';
import { PlanView } from './components/PlanView.js';
import { PreviewPane } from './components/PreviewPane.js';
import { AgentsPane } from './components/AgentsPane.js';
import { GitHubPane } from './components/GitHubPane.js';
import { markIssueComplete, markIssueInProgress } from './components/PlanSync.js';

type Pane = 'chat' | 'plan' | 'github' | 'agents' | 'preview';

interface AppProps {
  isTTY?: boolean;
}

export function App({ isTTY = true }: AppProps) {
  const { exit } = useApp();
  const [activePane, setActivePane] = useState<Pane>('chat');
  const [pendingTasks, setPendingTasks] = useState<Map<number, string>>(new Map());

  useInput((input, key) => {
    if (input === 'q' && key.ctrl) {
      exit();
    }
    if (key.tab) {
      setActivePane(prev => {
        const panes: Pane[] = ['chat', 'plan', 'github', 'agents', 'preview'];
        const idx = panes.indexOf(prev);
        return panes[(idx + 1) % panes.length];
      });
    }
    // Number keys to quick-switch panes
    if (input === '1') setActivePane('chat');
    if (input === '2') setActivePane('plan');
    if (input === '3') setActivePane('github');
    if (input === '4') setActivePane('agents');
    if (input === '5') setActivePane('preview');
  }, { isActive: isTTY });

  const handleAssignToAgent = useCallback(async (issue: { number: number; title: string }) => {
    await markIssueInProgress(issue.number);
    setPendingTasks(prev => new Map(prev).set(issue.number, issue.title));
    // Agent assignment happens in AgentsPane
  }, []);

  const handleTaskComplete = useCallback(async (issueNumber: number) => {
    await markIssueComplete(issueNumber);
    setPendingTasks(prev => {
      const next = new Map(prev);
      next.delete(issueNumber);
      return next;
    });
  }, []);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box borderStyle="single" paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">TLC Dashboard</Text>
          <Text color="gray"> | </Text>
          <Text color={activePane === 'chat' ? 'cyan' : 'gray'}>[1]Chat </Text>
          <Text color={activePane === 'plan' ? 'cyan' : 'gray'}>[2]Plan </Text>
          <Text color={activePane === 'github' ? 'cyan' : 'gray'}>[3]GitHub </Text>
          <Text color={activePane === 'agents' ? 'cyan' : 'gray'}>[4]Agents </Text>
          <Text color={activePane === 'preview' ? 'cyan' : 'gray'}>[5]Preview</Text>
        </Box>
        <Box>
          <Text color="cyan" bold>{"| TLC |"}</Text>
        </Box>
      </Box>

      {/* Main content - 2 columns */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left column: Chat (60%) */}
        <Box
          flexDirection="column"
          width="60%"
          borderStyle="single"
          borderColor={activePane === 'chat' ? 'cyan' : 'gray'}
        >
          <Box paddingX={1} borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
            <Text bold color={activePane === 'chat' ? 'cyan' : 'white'}>Chat</Text>
          </Box>
          <ChatPane isActive={activePane === 'chat'} isTTY={isTTY} />
        </Box>

        {/* Right column: GitHub + Agents + Status + Preview (40%) */}
        <Box flexDirection="column" width="40%">
          {/* GitHub Issues */}
          <Box
            flexDirection="column"
            height="30%"
            borderStyle="single"
            borderColor={activePane === 'github' ? 'cyan' : 'gray'}
          >
            <Box paddingX={1} borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
              <Text bold color={activePane === 'github' ? 'cyan' : 'white'}>GitHub Issues</Text>
            </Box>
            <GitHubPane isActive={activePane === 'github'} isTTY={isTTY} onAssignToAgent={handleAssignToAgent} />
          </Box>

          {/* Agents */}
          <Box
            flexDirection="column"
            height="30%"
            borderStyle="single"
            borderColor={activePane === 'agents' ? 'cyan' : 'gray'}
          >
            <Box paddingX={1} borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
              <Text bold color={activePane === 'agents' ? 'cyan' : 'white'}>Agents</Text>
            </Box>
            <AgentsPane isActive={activePane === 'agents'} isTTY={isTTY} onTaskComplete={handleTaskComplete} />
          </Box>

          {/* Plan */}
          <Box
            flexDirection="column"
            height="20%"
            borderStyle="single"
            borderColor={activePane === 'plan' ? 'cyan' : 'gray'}
          >
            <Box paddingX={1} borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
              <Text bold color={activePane === 'plan' ? 'cyan' : 'white'}>Plan</Text>
            </Box>
            <PlanView />
          </Box>

          {/* Preview */}
          <Box
            flexDirection="column"
            flexGrow={1}
            borderStyle="single"
            borderColor={activePane === 'preview' ? 'cyan' : 'gray'}
          >
            <Box paddingX={1} borderStyle="single" borderBottom borderLeft={false} borderRight={false} borderTop={false}>
              <Text bold color={activePane === 'preview' ? 'cyan' : 'white'}>Preview</Text>
            </Box>
            <PreviewPane isActive={activePane === 'preview'} isTTY={isTTY} />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="single" paddingX={1}>
        <Text dimColor>Tab: cycle panes | 1-5: jump to pane | Ctrl+Q: quit</Text>
      </Box>
    </Box>
  );
}
