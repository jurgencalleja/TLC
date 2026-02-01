import { Box, Text } from 'ink';

interface RepoInfo {
  name: string;
  path: string;
  status: 'ready' | 'needs-init';
  packageName?: string;
  tests?: {
    passed: number;
    failed: number;
  };
}

interface WorkspacePaneProps {
  repos?: RepoInfo[];
  dependencyGraph?: string;
  loading?: boolean;
  initialized?: boolean;
}

export function WorkspacePane({
  repos = [],
  dependencyGraph,
  loading = false,
  initialized = true,
}: WorkspacePaneProps) {
  if (loading) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="yellow">Loading workspace...</Text>
      </Box>
    );
  }

  if (!initialized) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No repos found.</Text>
        <Text dimColor>Initialize workspace with /tlc:workspace --init</Text>
      </Box>
    );
  }

  if (repos.length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="gray">No repos in workspace.</Text>
        <Text dimColor>Add repos with /tlc:workspace --add path</Text>
      </Box>
    );
  }

  // Calculate aggregates
  const totalPassed = repos.reduce((sum, r) => sum + (r.tests?.passed || 0), 0);
  const totalFailed = repos.reduce((sum, r) => sum + (r.tests?.failed || 0), 0);

  return (
    <Box padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>Workspace Repos</Text>
        <Text color="gray"> ({repos.length})</Text>
      </Box>

      {/* Repo List */}
      <Box flexDirection="column">
        {repos.map(repo => (
          <Box key={repo.name}>
            <Box width={20}>
              <Text color={repo.tests?.failed ? 'red' : 'green'}>
                {repo.status === 'ready' ? '●' : '○'} {repo.name}
              </Text>
            </Box>
            {repo.tests && (
              <Box>
                <Text color="green">{repo.tests.passed}</Text>
                <Text color="gray">/</Text>
                <Text color={repo.tests.failed > 0 ? 'red' : 'gray'}>
                  {repo.tests.failed}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Aggregate */}
      {(totalPassed > 0 || totalFailed > 0) && (
        <Box marginTop={1}>
          <Text color="gray">Total: </Text>
          <Text color="green">{totalPassed} passed</Text>
          {totalFailed > 0 && (
            <>
              <Text color="gray">, </Text>
              <Text color="red">{totalFailed} failed</Text>
            </>
          )}
        </Box>
      )}

      {/* Dependency Graph */}
      {dependencyGraph && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">Dependencies</Text>
          <Text dimColor>Run /tlc:workspace --graph for Mermaid diagram</Text>
        </Box>
      )}
    </Box>
  );
}
