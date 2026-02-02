import { Box, Text } from 'ink';
import type { DiagnosticCheck, DiagnosticsResult } from '../api/health-diagnostics.js';

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
  diagnostics?: DiagnosticsResult;
}

/**
 * Returns the appropriate icon for a diagnostic check status
 */
function getStatusIcon(status: DiagnosticCheck['status']): string {
  switch (status) {
    case 'ok': return '[ok]';
    case 'warning': return '[!]';
    case 'error': return '[X]';
    case 'unknown': return '[?]';
    default: return '[?]';
  }
}

/**
 * Returns the color for a diagnostic check status
 */
function getStatusColor(status: DiagnosticCheck['status']): string {
  switch (status) {
    case 'ok': return 'green';
    case 'warning': return 'yellow';
    case 'error': return 'red';
    case 'unknown': return 'gray';
    default: return 'gray';
  }
}

/**
 * Renders the diagnostics section with health checks
 */
function DiagnosticsSection({ diagnostics }: { diagnostics: DiagnosticsResult }) {
  const overallColor = diagnostics.overall === 'healthy' ? 'green' :
                       diagnostics.overall === 'degraded' ? 'yellow' : 'red';

  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold dimColor>System Diagnostics:</Text>
      <Box>
        <Text color={overallColor}>  Status: {diagnostics.overall}</Text>
      </Box>
      {diagnostics.checks.map((check, index) => (
        <Box key={index} flexDirection="column">
          <Box>
            <Text color={getStatusColor(check.status)}>
              {'  '}{getStatusIcon(check.status)} {check.name}: {check.message}
            </Text>
          </Box>
          {check.fix && (
            <Box>
              <Text dimColor>      Fix: {check.fix}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function HealthPane({ data, diagnostics }: HealthPaneProps) {
  if (!data && !diagnostics) {
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

  // Determine security status color
  const getSecurityColor = (): string => {
    if (!data) return 'gray';
    const { security } = data;
    if (security.critical > 0) return 'red';
    if (security.high > 0) return 'red';
    if (security.moderate > 0) return 'yellow';
    if (security.low > 0) return 'yellow';
    return 'green';
  };

  // Determine outdated status color
  const getOutdatedColor = (): string => {
    if (!data) return 'gray';
    const { outdated } = data;
    if (outdated.major && outdated.major > 0) return 'yellow';
    if (outdated.total > 10) return 'yellow';
    if (outdated.total > 0) return 'gray';
    return 'green';
  };

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Project Health</Text>

      {/* Diagnostics Section */}
      {diagnostics && <DiagnosticsSection diagnostics={diagnostics} />}

      {/* Security Section */}
      {data && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Security:</Text>
          {data.security.total === 0 ? (
            <Box>
              <Text color="green">  [ok] No vulnerabilities</Text>
            </Box>
          ) : (
            <>
              <Box>
                <Text color={getSecurityColor()}>
                    {data.security.total} vulnerabilities
                </Text>
              </Box>
              {data.security.critical > 0 && (
                <Box>
                  <Text color="red">    [!!] Critical: {data.security.critical}</Text>
                </Box>
              )}
              {data.security.high > 0 && (
                <Box>
                  <Text color="red">    [!] High: {data.security.high}</Text>
                </Box>
              )}
              {data.security.moderate > 0 && (
                <Box>
                  <Text color="yellow">    [~] Moderate: {data.security.moderate}</Text>
                </Box>
              )}
              {data.security.low > 0 && (
                <Box>
                  <Text color="gray">    [-] Low: {data.security.low}</Text>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Outdated Section */}
      {data && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Dependencies:</Text>
          {data.outdated.total === 0 ? (
            <Box>
              <Text color="green">  [ok] All up to date</Text>
            </Box>
          ) : (
            <>
              <Box>
                <Text color={getOutdatedColor()}>
                    {data.outdated.total} outdated
                </Text>
              </Box>
              {data.outdated.major !== undefined && data.outdated.major > 0 && (
                <Box>
                  <Text color="yellow">    [!] Major: {data.outdated.major}</Text>
                </Box>
              )}
              {data.outdated.minor !== undefined && data.outdated.minor > 0 && (
                <Box>
                  <Text color="gray">    [~] Minor: {data.outdated.minor}</Text>
                </Box>
              )}
              {data.outdated.patch !== undefined && data.outdated.patch > 0 && (
                <Box>
                  <Text color="gray">    [-] Patch: {data.outdated.patch}</Text>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Actions hint */}
      <Box marginTop={1}>
        <Text dimColor>
          {data && data.security.total > 0 ? '/tlc:security to fix' :
           data && data.outdated.total > 0 ? '/tlc:outdated to update' :
           diagnostics && diagnostics.overall !== 'healthy' ? 'Fix issues above' :
           'Healthy!'}
        </Text>
      </Box>
    </Box>
  );
}
