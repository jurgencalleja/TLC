import { Box, Text } from 'ink';

type Period = 'daily' | 'monthly';

interface CostMeterProps {
  spent: number;
  budget: number;
  period?: Period;
  breakdown?: Record<string, number>;
  daysElapsed?: number;
  totalDays?: number;
}

export function CostMeter({
  spent,
  budget,
  period = 'monthly',
  breakdown,
  daysElapsed,
  totalDays,
}: CostMeterProps) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);

  const getColor = (pct: number): string => {
    if (pct >= 80) return 'red';
    if (pct >= 50) return 'yellow';
    return 'green';
  };

  const barLength = 20;
  const filledLength = Math.round((percentage / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  // Calculate projection
  let projection = null;
  if (daysElapsed && totalDays && daysElapsed > 0) {
    const dailyRate = spent / daysElapsed;
    projection = dailyRate * totalDays;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Cost Budget ({period})</Text>

      {/* Progress bar */}
      <Box marginTop={1}>
        <Text color={getColor(percentage)}>[{bar}]</Text>
        <Text> {percentage.toFixed(0)}%</Text>
      </Box>

      {/* Spent / Budget */}
      <Box marginTop={1}>
        <Text dimColor>Spent: </Text>
        <Text color={getColor(percentage)}>{formatCurrency(spent)}</Text>
        <Text dimColor> / {formatCurrency(budget)}</Text>
      </Box>

      {/* Remaining */}
      <Box>
        <Text dimColor>Remaining: </Text>
        <Text color={remaining > 0 ? 'green' : 'red'}>{formatCurrency(remaining)}</Text>
      </Box>

      {/* Projection */}
      {projection !== null && (
        <Box>
          <Text dimColor>Projected: </Text>
          <Text color={projection > budget ? 'red' : 'green'}>
            {formatCurrency(projection)}
          </Text>
        </Box>
      )}

      {/* Model breakdown */}
      {breakdown && Object.keys(breakdown).length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>By Model:</Text>
          {Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([model, cost]) => (
              <Box key={model}>
                <Text dimColor>  {model}: </Text>
                <Text>{formatCurrency(cost)}</Text>
              </Box>
            ))}
        </Box>
      )}
    </Box>
  );
}
