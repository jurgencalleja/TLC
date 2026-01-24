import { Box, Text, useInput } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Issue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee: string | null;
}

interface GitHubPaneProps {
  isActive: boolean;
  onAssignToAgent?: (issue: Issue) => void;
}

export function GitHubPane({ isActive, onAssignToAgent }: GitHubPaneProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchIssues = useCallback(async () => {
    try {
      // Use gh CLI to fetch issues
      const { stdout } = await execAsync(
        'gh issue list --label "tdd" --state open --json number,title,state,labels,assignee --limit 20',
        { cwd: process.cwd() }
      );

      const parsed = JSON.parse(stdout || '[]');
      setIssues(parsed.map((i: any) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels?.map((l: any) => l.name) || [],
        assignee: i.assignee?.login || null
      })));
      setError(null);
    } catch (e) {
      // Try without label filter
      try {
        const { stdout } = await execAsync(
          'gh issue list --state open --json number,title,state,labels,assignee --limit 10',
          { cwd: process.cwd() }
        );
        const parsed = JSON.parse(stdout || '[]');
        setIssues(parsed.map((i: any) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          labels: i.labels?.map((l: any) => l.name) || [],
          assignee: i.assignee?.login || null
        })));
        setError(null);
      } catch (e2) {
        setError('gh CLI not available or not in a repo');
        setIssues([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchIssues]);

  const createIssue = useCallback(async (title: string, body: string) => {
    try {
      await execAsync(
        `gh issue create --title "${title}" --body "${body}" --label "tdd"`,
        { cwd: process.cwd() }
      );
      fetchIssues();
    } catch (e) {
      setError('Failed to create issue');
    }
  }, [fetchIssues]);

  const closeIssue = useCallback(async (number: number) => {
    try {
      await execAsync(`gh issue close ${number}`, { cwd: process.cwd() });
      fetchIssues();
    } catch (e) {
      setError('Failed to close issue');
    }
  }, [fetchIssues]);

  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(prev => prev - 1);
    }
    if (key.downArrow && selectedIndex < issues.length - 1) {
      setSelectedIndex(prev => prev + 1);
    }
    if (input === 'a' && issues[selectedIndex]) {
      onAssignToAgent?.(issues[selectedIndex]);
    }
    if (input === 'c' && issues[selectedIndex]) {
      closeIssue(issues[selectedIndex].number);
    }
    if (input === 'r') {
      setLoading(true);
      fetchIssues();
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="gray">Loading issues...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">{error}</Text>
        <Text dimColor>Make sure gh CLI is installed and authenticated.</Text>
      </Box>
    );
  }

  if (issues.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No open issues.</Text>
        <Text dimColor>Create issues with 'gh issue create'</Text>
      </Box>
    );
  }

  return (
    <Box padding={1} flexDirection="column">
      {issues.slice(0, 6).map((issue, idx) => (
        <Box key={issue.number}>
          <Text color={idx === selectedIndex && isActive ? 'cyan' : 'white'}>
            {idx === selectedIndex && isActive ? '> ' : '  '}
          </Text>
          <Text color="green">#{issue.number} </Text>
          <Text>{issue.title.slice(0, 35)}{issue.title.length > 35 ? '...' : ''}</Text>
          {issue.labels.includes('in-progress') && (
            <Text color="yellow"> [WIP]</Text>
          )}
        </Box>
      ))}

      {isActive && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>[a] Assign to agent | [c] Close | [r] Refresh</Text>
        </Box>
      )}
    </Box>
  );
}

// Helper to sync a task to GitHub
export async function syncTaskToGitHub(title: string, body: string): Promise<number | null> {
  try {
    const { stdout } = await promisify(exec)(
      `gh issue create --title "${title}" --body "${body}" --label "tdd" --json number`,
      { cwd: process.cwd() }
    );
    const parsed = JSON.parse(stdout);
    return parsed.number;
  } catch (e) {
    return null;
  }
}

export async function markIssueComplete(number: number): Promise<void> {
  try {
    await promisify(exec)(`gh issue close ${number} --comment "Completed by TDD agent"`, {
      cwd: process.cwd()
    });
  } catch (e) {
    // Ignore errors
  }
}
