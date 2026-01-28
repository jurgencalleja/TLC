import { Box, Text } from 'ink';

interface SecurityData {
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

interface OutdatedData {
  total: number;
  major?: number;
  minor?: number;
  patch?: number;
}

interface HealthData {
  security: SecurityData;
  outdated: OutdatedData;
}

interface HealthPaneProps {
  data?: HealthData;
}

export function HealthPane({ data }: HealthPaneProps) {
  if (!data) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Project Health</Text>
        <Box marginTop={1}>
          <Text color="gray">No health data available.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:security to audit.</Text>
        </Box>
      </Box>
    );
  }

  const { security, outdated } = data;

  // Determine security status color
  const getSecurityColor = (): string => {
    if (security.critical > 0) return 'red';
    if (security.high > 0) return 'red';
    if (security.moderate > 0) return 'yellow';
    if (security.low > 0) return 'yellow';
    return 'green';
  };

  // Determine outdated status color
  const getOutdatedColor = (): string => {
    if (outdated.major && outdated.major > 0) return 'yellow';
    if (outdated.total > 10) return 'yellow';
    if (outdated.total > 0) return 'gray';
    return 'green';
  };

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Project Health</Text>

      {/* Security Section */}
      <Box marginTop={1} flexDirection="column">
        <Text bold dimColor>Security:</Text>
        {security.total === 0 ? (
          <Box>
            <Text color="green">  ✓ No vulnerabilities</Text>
          </Box>
        ) : (
          <>
            <Box>
              <Text color={getSecurityColor()}>
                  {security.total} vulnerabilities
              </Text>
            </Box>
            {security.critical > 0 && (
              <Box>
                <Text color="red">    🔴 Critical: {security.critical}</Text>
              </Box>
            )}
            {security.high > 0 && (
              <Box>
                <Text color="red">    🟠 High: {security.high}</Text>
              </Box>
            )}
            {security.moderate > 0 && (
              <Box>
                <Text color="yellow">    🟡 Moderate: {security.moderate}</Text>
              </Box>
            )}
            {security.low > 0 && (
              <Box>
                <Text color="gray">    🟢 Low: {security.low}</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Outdated Section */}
      <Box marginTop={1} flexDirection="column">
        <Text bold dimColor>Dependencies:</Text>
        {outdated.total === 0 ? (
          <Box>
            <Text color="green">  ✓ All up to date</Text>
          </Box>
        ) : (
          <>
            <Box>
              <Text color={getOutdatedColor()}>
                  {outdated.total} outdated
              </Text>
            </Box>
            {outdated.major !== undefined && outdated.major > 0 && (
              <Box>
                <Text color="yellow">    ⚠️ Major: {outdated.major}</Text>
              </Box>
            )}
            {outdated.minor !== undefined && outdated.minor > 0 && (
              <Box>
                <Text color="gray">    📦 Minor: {outdated.minor}</Text>
              </Box>
            )}
            {outdated.patch !== undefined && outdated.patch > 0 && (
              <Box>
                <Text color="gray">    🔧 Patch: {outdated.patch}</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Actions hint */}
      <Box marginTop={1}>
        <Text dimColor>
          {security.total > 0 ? '/tlc:security to fix' :
           outdated.total > 0 ? '/tlc:outdated to update' :
           'Healthy!'}
        </Text>
      </Box>
    </Box>
  );
}
