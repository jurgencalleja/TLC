import { Box, Text } from 'ink';

interface QualityIndicatorProps {
  score?: number;
  threshold?: number;
  dimensions?: Record<string, number>;
  history?: number[];
  showThreshold?: boolean;
  showRetryHint?: boolean;
  loading?: boolean;
}

export function QualityIndicator({
  score,
  threshold = 70,
  dimensions,
  history,
  showThreshold,
  showRetryHint,
  loading,
}: QualityIndicatorProps) {
  if (loading) {
    return (
      <Box padding={1}>
        <Text dimColor>Loading quality data...</Text>
      </Box>
    );
  }

  if (score === undefined) {
    return (
      <Box padding={1}>
        <Text dimColor>No quality data</Text>
      </Box>
    );
  }

  const pass = score >= threshold;

  const getScoreColor = (s: number, t: number): string => {
    if (s >= t + 10) return 'green';
    if (s >= t) return 'yellow';
    return 'red';
  };

  // Create simple gauge
  const gaugeLength = 20;
  const filledLength = Math.round((score / 100) * gaugeLength);
  const thresholdPos = Math.round((threshold / 100) * gaugeLength);
  const gauge = '█'.repeat(filledLength) + '░'.repeat(gaugeLength - filledLength);

  // Create sparkline from history
  const renderSparkline = (data: number[]): string => {
    if (!data || data.length === 0) return '';
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data.map((v) => {
      const idx = Math.round(((v - min) / range) * 7);
      return blocks[idx];
    }).join('');
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Quality Score</Text>

      {/* Main score */}
      <Box marginTop={1}>
        <Text color={getScoreColor(score, threshold)} bold>
          {score}%
        </Text>
        <Text> </Text>
        <Text color={pass ? 'green' : 'red'}>
          {pass ? '✓ PASS' : '✗ FAIL'}
        </Text>
      </Box>

      {/* Gauge */}
      <Box>
        <Text color={getScoreColor(score, threshold)}>[{gauge}]</Text>
      </Box>

      {/* Threshold line */}
      {showThreshold && (
        <Box>
          <Text dimColor>Threshold: {threshold}%</Text>
        </Box>
      )}

      {/* Dimensions breakdown */}
      {dimensions && Object.keys(dimensions).length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Dimensions:</Text>
          {Object.entries(dimensions).map(([dim, dimScore]) => (
            <Box key={dim}>
              <Text dimColor>  {dim}: </Text>
              <Text color={getScoreColor(dimScore, threshold)}>{dimScore}%</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* History sparkline */}
      {history && history.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>Trend: </Text>
          <Text color="cyan">{renderSparkline(history)}</Text>
        </Box>
      )}

      {/* Retry hint */}
      {!pass && showRetryHint && (
        <Box marginTop={1}>
          <Text color="yellow">Consider retry with a better model</Text>
        </Box>
      )}
    </Box>
  );
}
