/**
 * CostChart Component
 *
 * Stacked bar chart showing AI costs over time, broken down by model.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';

interface CostEntry {
  model: string;
  amount: number;
}

interface CostDataPoint {
  date: string;
  costs: CostEntry[];
}

export interface CostChartProps {
  data: CostDataPoint[];
  budget?: number;
  className?: string;
  height?: number;
}

/**
 * Color palette for different models
 */
const MODEL_COLORS: Record<string, string> = {
  Claude: '#8b5cf6',
  'GPT-4': '#10b981',
  Gemini: '#f59e0b',
  Llama: '#ef4444',
  DeepSeek: '#3b82f6',
};

const DEFAULT_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4', '#84cc16'];

function getModelColor(model: string, index: number): string {
  return MODEL_COLORS[model] || DEFAULT_COLORS[index % DEFAULT_COLORS.length] || '#8b5cf6';
}

/**
 * Extract unique model names from data
 */
function getUniqueModels(data: CostDataPoint[]): string[] {
  const models = new Set<string>();
  for (const point of data) {
    for (const cost of point.costs) {
      models.add(cost.model);
    }
  }
  return Array.from(models);
}

/**
 * Transform data for recharts: flatten costs into keyed values per model
 */
function transformData(data: CostDataPoint[], models: string[]): Record<string, unknown>[] {
  return data.map((point) => {
    const row: Record<string, unknown> = { date: point.date };
    for (const model of models) {
      const entry = point.costs.find((c) => c.model === model);
      row[model] = entry?.amount ?? 0;
    }
    return row;
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated, #fff)',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: '6px',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: entry.fill }}>{entry.name}</span>
          <span>${entry.value.toFixed(2)}</span>
        </div>
      ))}
      <div
        style={{
          borderTop: '1px solid var(--color-border, #e5e7eb)',
          marginTop: 4,
          paddingTop: 4,
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function CostChart({ data, budget, className = '', height = 300 }: CostChartProps) {
  const models = getUniqueModels(data);
  const chartData = transformData(data, models);

  if (data.length === 0) {
    return (
      <div data-testid="cost-chart" className={`cost-chart ${className}`.trim()}>
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-text-secondary">No data available</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cost-chart" className={`cost-chart ${className}`.trim()}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(value: number) => `$${value}`} />
          <Tooltip content={CustomTooltip as never} />
          <Legend />
          {models.map((model, index) => (
            <Bar
              key={model}
              dataKey={model}
              stackId="cost"
              fill={getModelColor(model, index)}
              name={model}
            />
          ))}
          {budget != null && (
            <ReferenceLine
              y={budget}
              stroke="#ef4444"
              label={{ value: `Budget: $${budget}` }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CostChart;
