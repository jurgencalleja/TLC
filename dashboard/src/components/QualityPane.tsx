import { Box, Text } from 'ink';

interface QualityData {
  score: number;
  coverage: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  edgeCases: {
    covered: number;
    total: number;
  };
}

interface QualityPaneProps {
  data?: QualityData;
}

export function QualityPane({ data }: QualityPaneProps) {
  if (!data) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Quality Score</Text>
        <Box marginTop={1}>
          <Text color="gray">No quality data available.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:quality to analyze.</Text>
        </Box>
      </Box>
    );
  }

  const { score, coverage, edgeCases } = data;

  // Determine color based on score
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'green';
    if (s >= 60) return 'yellow';
    return 'red';
  };

  // Create visual progress bar
  const barLength = 20;
  const filledLength = Math.round((score / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Quality Score</Text>

      {/* Score with progress bar */}
      <Box marginTop={1}>
        <Text color={getScoreColor(score)}>{score}/100</Text>
      </Box>
      <Box>
        <Text color={getScoreColor(score)}>[{bar}]</Text>
      </Box>

      {/* Coverage breakdown */}
      <Box marginTop={1} flexDirection="column">
        <Text bold dimColor>Coverage:</Text>
        <Box>
          <Text>  Lines: </Text>
          <Text color={coverage.lines >= 80 ? 'green' : coverage.lines >= 60 ? 'yellow' : 'red'}>
            {coverage.lines}%
          </Text>
        </Box>
        <Box>
          <Text>  Branches: </Text>
          <Text color={coverage.branches >= 80 ? 'green' : coverage.branches >= 60 ? 'yellow' : 'red'}>
            {coverage.branches}%
          </Text>
        </Box>
        <Box>
          <Text>  Functions: </Text>
          <Text color={coverage.functions >= 80 ? 'green' : coverage.functions >= 60 ? 'yellow' : 'red'}>
            {coverage.functions}%
          </Text>
        </Box>
        <Box>
          <Text>  Statements: </Text>
          <Text color={coverage.statements >= 80 ? 'green' : coverage.statements >= 60 ? 'yellow' : 'red'}>
            {coverage.statements}%
          </Text>
        </Box>
      </Box>

      {/* Edge cases */}
      <Box marginTop={1} flexDirection="column">
        <Text bold dimColor>Edge Cases:</Text>
        <Box>
          <Text>  Covered: </Text>
          <Text color={edgeCases.covered === edgeCases.total ? 'green' : 'yellow'}>
            {edgeCases.covered}/{edgeCases.total}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
