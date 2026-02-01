import { Box, Text } from 'ink';

interface ModelUsage {
  daily: number;
  monthly: number;
  requests: number;
  budgetDaily: number;
  budgetMonthly: number;
}

interface UsagePaneProps {
  data?: Record<string, ModelUsage>;
  alerts?: string[];
}

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

function getUsageColor(used: number, budget: number): string {
  if (budget === 0) return 'gray';
  const percent = (used / budget) * 100;
  if (percent >= 100) return 'red';
  if (percent >= 80) return 'yellow';
  return 'green';
}

function createBar(used: number, budget: number, width: number = 15): string {
  if (budget === 0) return '░'.repeat(width);
  const percent = Math.min(used / budget, 1.5); // Cap at 150% for display
  const filled = Math.round(percent * width);
  const bar = '█'.repeat(Math.min(filled, width)) + '░'.repeat(Math.max(0, width - filled));
  return bar;
}

export function UsagePane({ data, alerts }: UsagePaneProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Box padding={1} flexDirection="column">
        <Text bold>Usage Dashboard</Text>
        <Box marginTop={1}>
          <Text color="gray">No usage data available.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run /tlc:usage to view.</Text>
        </Box>
      </Box>
    );
  }

  const models = Object.keys(data);

  // Calculate totals
  let totalDaily = 0;
  let totalMonthly = 0;
  let totalRequests = 0;
  let totalBudgetDaily = 0;
  let totalBudgetMonthly = 0;

  for (const model of models) {
    const usage = data[model];
    totalDaily += usage.daily;
    totalMonthly += usage.monthly;
    totalRequests += usage.requests;
    totalBudgetDaily += usage.budgetDaily;
    totalBudgetMonthly += usage.budgetMonthly;
  }

  const totalDailyPercent = totalBudgetDaily > 0 ? Math.round((totalDaily / totalBudgetDaily) * 100) : 0;

  return (
    <Box padding={1} flexDirection="column">
      <Text bold>Usage Dashboard</Text>

      {/* Alerts section */}
      {alerts && alerts.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {alerts.map((alert, idx) => (
            <Box key={idx}>
              <Text color="yellow">⚠ {alert}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Per-model usage */}
      <Box marginTop={1} flexDirection="column">
        {models.map((model) => {
          const usage = data[model];
          const dailyPercent = usage.budgetDaily > 0 ? Math.round((usage.daily / usage.budgetDaily) * 100) : 0;
          const isOver = usage.daily > usage.budgetDaily;
          const color = getUsageColor(usage.daily, usage.budgetDaily);

          return (
            <Box key={model} flexDirection="column" marginBottom={1}>
              <Box>
                <Text bold>{model}</Text>
                {isOver && <Text color="red"> OVER</Text>}
              </Box>
              <Box>
                <Text color={color}>[{createBar(usage.daily, usage.budgetDaily)}]</Text>
                <Text> </Text>
                <Text color={color}>{formatCurrency(usage.daily)}</Text>
                <Text dimColor> / {formatCurrency(usage.budgetDaily)}</Text>
                <Text> </Text>
                <Text color={color}>{dailyPercent}%</Text>
              </Box>
              <Box>
                <Text dimColor>  Requests: {usage.requests}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Totals */}
      <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold>Totals</Text>
        <Box>
          <Text>Daily:   </Text>
          <Text color={getUsageColor(totalDaily, totalBudgetDaily)}>
            {formatCurrency(totalDaily)}
          </Text>
          <Text dimColor> / {formatCurrency(totalBudgetDaily)}</Text>
          <Text> </Text>
          <Text color={getUsageColor(totalDaily, totalBudgetDaily)}>{totalDailyPercent}%</Text>
        </Box>
        <Box>
          <Text>Monthly: </Text>
          <Text color={getUsageColor(totalMonthly, totalBudgetMonthly)}>
            {formatCurrency(totalMonthly)}
          </Text>
          <Text dimColor> / {formatCurrency(totalBudgetMonthly)}</Text>
        </Box>
        <Box>
          <Text dimColor>Requests: {totalRequests}</Text>
        </Box>
      </Box>
    </Box>
  );
}
