import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestStatus {
  total: number;
  passed: number;
  failed: number;
  pending: number;
}

export function StatusPane() {
  const [tests, setTests] = useState<TestStatus | null>(null);
  const [lastRun, setLastRun] = useState<string>('Never');

  useEffect(() => {
    async function checkTests() {
      try {
        // Try to detect test framework and get status
        // This is a simplified version - real implementation would parse test output
        const { stdout } = await execAsync('npm test -- --reporter=json 2>/dev/null || echo "{}"', {
          timeout: 30000,
          cwd: process.cwd()
        });

        // For now, show placeholder
        setTests({ total: 0, passed: 0, failed: 0, pending: 0 });
        setLastRun(new Date().toLocaleTimeString());
      } catch (e) {
        // Tests not configured or failed to run
        setTests(null);
      }
    }

    // Check on mount
    checkTests();
  }, []);

  return (
    <Box padding={1} flexDirection="column">
      {tests ? (
        <>
          <Box>
            <Text color="green">Passed: {tests.passed}</Text>
            <Text> | </Text>
            <Text color="red">Failed: {tests.failed}</Text>
            <Text> | </Text>
            <Text color="yellow">Pending: {tests.pending}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Total: {tests.total}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Last run: {lastRun}</Text>
          </Box>
        </>
      ) : (
        <Box flexDirection="column">
          <Text color="gray">No test results.</Text>
          <Text dimColor>Run tests to see status.</Text>
        </Box>
      )}
    </Box>
  );
}
