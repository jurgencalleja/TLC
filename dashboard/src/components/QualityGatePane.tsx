import { Box, Text } from 'ink';

interface ThresholdConfig {
  default: number;
  dimensions?: Record<string, number>;
}

interface QualityGateConfig {
  preset: string;
  thresholds: ThresholdConfig;
}

interface EvaluationResult {
  file: string;
  pass: boolean;
  composite: number;
  scores?: Record<string, number>;
  failed?: string[];
}

interface TrendData {
  direction: 'improving' | 'declining' | 'stable';
  slope: number;
}

interface HistoryRecord {
  composite: number;
  timestamp?: Date;
}

interface QualityGatePaneProps {
  config?: QualityGateConfig;
  evaluations?: EvaluationResult[];
  currentEvaluation?: EvaluationResult;
  history?: HistoryRecord[];
  trend?: TrendData;
  presets?: string[];
  loading?: boolean;
  error?: string;
  onConfigure?: () => void;
  onChangePreset?: (preset: string) => void;
  onRetry?: () => void;
}

export function QualityGatePane({
  config,
  evaluations = [],
  currentEvaluation,
  history = [],
  trend,
  presets = ['fast', 'balanced', 'thorough', 'critical'],
  loading,
  error,
  onConfigure,
  onChangePreset,
  onRetry,
}: QualityGatePaneProps) {
  if (loading) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Quality Gate</Text>
        <Box marginTop={1}>
          <Text color="gray">Loading...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Quality Gate</Text>
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      </Box>
    );
  }

  const getScoreColor = (score: number, threshold: number = 70): string => {
    if (score >= threshold) return 'green';
    if (score >= threshold - 15) return 'yellow';
    return 'red';
  };

  const getTrendArrow = (direction: string): string => {
    switch (direction) {
      case 'improving':
        return '↑';
      case 'declining':
        return '↓';
      default:
        return '→';
    }
  };

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Quality Gate</Text>

      {/* Current Preset */}
      {config && (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text dimColor>Preset: </Text>
            <Text color="cyan">{config.preset}</Text>
          </Box>
          <Box>
            <Text dimColor>Threshold: </Text>
            <Text>{config.thresholds.default}%</Text>
          </Box>
        </Box>
      )}

      {/* Threshold Bars */}
      {config?.thresholds?.dimensions && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Dimension Thresholds:</Text>
          {Object.entries(config.thresholds.dimensions).map(([dim, threshold]) => (
            <Box key={dim}>
              <Text>  {dim}: </Text>
              <Text color="gray">{threshold}%</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Current Evaluation */}
      {currentEvaluation && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Current Evaluation:</Text>
          <Box>
            <Text>  {currentEvaluation.file}: </Text>
            <Text color={currentEvaluation.pass ? 'green' : 'red'}>
              {currentEvaluation.composite}% {currentEvaluation.pass ? '✓' : '✗'}
            </Text>
          </Box>

          {currentEvaluation.scores && (
            <Box flexDirection="column" marginLeft={2}>
              {Object.entries(currentEvaluation.scores).map(([dim, score]) => {
                const isFailing = currentEvaluation.failed?.includes(dim);
                return (
                  <Box key={dim}>
                    <Text color={isFailing ? 'red' : 'gray'}>
                      {dim}: {score}%
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {!currentEvaluation.pass && onRetry && (
            <Box marginTop={1}>
              <Text color="yellow">[Retry] ↻</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Recent Evaluations */}
      {evaluations.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Recent Evaluations:</Text>
          {evaluations.slice(0, 5).map((evalResult, idx) => (
            <Box key={idx}>
              <Text color={evalResult.pass ? 'green' : 'red'}>
                {evalResult.pass ? '✓' : '✗'}
              </Text>
              <Text> {evalResult.file.split('/').pop()}: </Text>
              <Text color={getScoreColor(evalResult.composite, config?.thresholds?.default || 70)}>
                {evalResult.composite}%
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Trend */}
      {trend && (
        <Box marginTop={1}>
          <Text dimColor>Trend: </Text>
          <Text color={trend.direction === 'improving' ? 'green' : trend.direction === 'declining' ? 'red' : 'gray'}>
            {getTrendArrow(trend.direction)} {trend.direction}
          </Text>
        </Box>
      )}

      {/* Actions */}
      <Box marginTop={1}>
        {onConfigure && (
          <Text color="blue">[Configure]</Text>
        )}
      </Box>
    </Box>
  );
}
