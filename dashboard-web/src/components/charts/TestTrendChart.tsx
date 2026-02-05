/**
 * TestTrendChart Component
 *
 * Line chart showing test results over time with passed (green) and failed (red) lines
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface TestTrendChartProps {
  data: { date: string; passed: number; failed: number }[];
  className?: string;
}

/**
 * Theme-aware colors for the chart
 * Uses CSS custom properties for dark/light mode support
 */
const COLORS = {
  passed: '#22c55e', // green-500
  failed: '#ef4444', // red-500
  grid: '#e5e7eb', // gray-200
  text: '#6b7280', // gray-500
};

/**
 * TestTrendChart displays test results over time as a line chart
 *
 * Features:
 * - Two lines: passed (green) and failed (red)
 * - X-axis: date/time
 * - Y-axis: count
 * - Tooltip on hover
 * - Responsive sizing
 * - Dark/light theme support
 */
export function TestTrendChart({ data, className = '' }: TestTrendChartProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <div
      data-testid="test-trend-chart"
      className={`test-trend-chart ${className}`.trim()}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-full min-h-[200px] text-text-muted">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="date"
              stroke={COLORS.text}
              tick={{ fill: COLORS.text, fontSize: 12 }}
            />
            <YAxis
              stroke={COLORS.text}
              tick={{ fill: COLORS.text, fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-elevated, #fff)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
              }}
              labelStyle={{
                color: 'var(--color-text-primary, #111827)',
                fontWeight: 600,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="passed"
              stroke={COLORS.passed}
              strokeWidth={2}
              dot={{ fill: COLORS.passed, r: 4 }}
              activeDot={{ r: 6 }}
              name="Passed"
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke={COLORS.failed}
              strokeWidth={2}
              dot={{ fill: COLORS.failed, r: 4 }}
              activeDot={{ r: 6 }}
              name="Failed"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TestTrendChart;
