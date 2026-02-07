import { Box, Text, useInput } from 'ink';

export interface DockerfileFinding {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  message: string;
  fix: string;
}

export interface RuntimeFinding {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service: string;
  message: string;
  fix: string;
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface CisBenchmarkResult {
  level1Score: number;
  passed: boolean;
  findings: Array<{ cis: string; severity: string; message: string }>;
}

export interface ContainerSecurityPaneProps {
  dockerfileLintScore: number;
  dockerfileFindings: DockerfileFinding[];
  runtimeScore: number;
  runtimeFindings: RuntimeFinding[];
  networkScore: number;
  vulnerabilities: VulnerabilitySummary;
  cisBenchmark: CisBenchmarkResult;
  secretsScore: number;
  onRescan?: () => void;
  loading?: boolean;
  error?: string | null;
  isActive?: boolean;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'magenta';
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'cyan';
    default:
      return 'white';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);

  return (
    <Box>
      <Box width={22}>
        <Text>{label}</Text>
      </Box>
      <Text color={getScoreColor(score)}>{bar}</Text>
      <Text> {score}%</Text>
    </Box>
  );
}

export function ContainerSecurityPane({
  dockerfileLintScore,
  dockerfileFindings,
  runtimeScore,
  runtimeFindings,
  networkScore,
  vulnerabilities,
  cisBenchmark,
  secretsScore,
  onRescan,
  loading = false,
  error = null,
  isActive = false,
}: ContainerSecurityPaneProps) {
  useInput(
    (input) => {
      if (input === 'r' && onRescan) {
        onRescan();
      }
    },
    { isActive }
  );

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          Container Security Error
        </Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Container Security</Text>
        <Text dimColor>Scanning containers...</Text>
      </Box>
    );
  }

  const overallScore = Math.round(
    (dockerfileLintScore + runtimeScore + networkScore + secretsScore) / 4
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Container Security</Text>
      <Text dimColor>CIS Docker Benchmark compliance and security analysis</Text>
      <Box marginTop={1} />

      {/* Overall Score */}
      <Box flexDirection="column">
        <Text bold>Overall Score: <Text color={getScoreColor(overallScore)}>{overallScore}%</Text></Text>
        <Box marginTop={1} />
        <ScoreBar label="Dockerfile Lint" score={dockerfileLintScore} />
        <ScoreBar label="Runtime Security" score={runtimeScore} />
        <ScoreBar label="Network Policy" score={networkScore} />
        <ScoreBar label="Secrets Management" score={secretsScore} />
      </Box>
      <Box marginTop={1} />

      {/* CIS Benchmark */}
      <Box flexDirection="column">
        <Text bold>CIS Docker Benchmark Level 1</Text>
        <Text>
          Score: <Text color={cisBenchmark.passed ? 'green' : 'red'}>{cisBenchmark.level1Score}%</Text>
          {' '}
          {cisBenchmark.passed ? '\u2713 PASSED' : '\u2717 FAILED'}
        </Text>
      </Box>
      <Box marginTop={1} />

      {/* Vulnerability Summary */}
      <Box flexDirection="column">
        <Text bold>Image Vulnerabilities</Text>
        <Box>
          <Text color="magenta">Critical: {vulnerabilities.critical}</Text>
          <Text> | </Text>
          <Text color="red">High: {vulnerabilities.high}</Text>
          <Text> | </Text>
          <Text color="yellow">Medium: {vulnerabilities.medium}</Text>
          <Text> | </Text>
          <Text color="cyan">Low: {vulnerabilities.low}</Text>
        </Box>
      </Box>
      <Box marginTop={1} />

      {/* Dockerfile Findings */}
      {dockerfileFindings.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Dockerfile Findings ({dockerfileFindings.length})</Text>
          {dockerfileFindings.slice(0, 5).map((f, i) => (
            <Box key={`df-${i}`}>
              <Text color={getSeverityColor(f.severity)}>[{f.severity.toUpperCase()}]</Text>
              <Text> {f.message}</Text>
            </Box>
          ))}
          {dockerfileFindings.length > 5 && (
            <Text dimColor>...and {dockerfileFindings.length - 5} more</Text>
          )}
        </Box>
      )}

      {/* Runtime Findings */}
      {runtimeFindings.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Runtime Findings ({runtimeFindings.length})</Text>
          {runtimeFindings.slice(0, 5).map((f, i) => (
            <Box key={`rt-${i}`}>
              <Text color={getSeverityColor(f.severity)}>[{f.severity.toUpperCase()}]</Text>
              <Text> {f.service}: {f.message}</Text>
            </Box>
          ))}
          {runtimeFindings.length > 5 && (
            <Text dimColor>...and {runtimeFindings.length - 5} more</Text>
          )}
        </Box>
      )}

      {/* Rescan hint */}
      {isActive && (
        <Box marginTop={1}>
          <Text dimColor>Press [r] to rescan</Text>
        </Box>
      )}
    </Box>
  );
}
