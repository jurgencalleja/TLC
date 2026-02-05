/**
 * CoverageChart Component
 *
 * Donut/pie chart showing coverage percentage with center percentage display
 */

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export interface CoverageChartProps {
  percentage: number;
  className?: string;
}

/**
 * Theme-aware colors for the chart
 */
const COLORS = {
  covered: '#22c55e', // green-500
  uncovered: '#d1d5db', // gray-300
};

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * CoverageChart displays test coverage as a donut chart
 *
 * Features:
 * - Donut style with inner radius
 * - Center shows percentage number
 * - Segments: covered (green), uncovered (gray)
 * - Responsive sizing
 * - Dark/light theme support
 */
export function CoverageChart({ percentage, className = '' }: CoverageChartProps) {
  // Clamp percentage to valid range 0-100
  const clampedPercentage = clamp(Math.round(percentage), 0, 100);
  const uncoveredPercentage = 100 - clampedPercentage;

  const data = [
    { name: 'Covered', value: clampedPercentage, fill: COLORS.covered },
    { name: 'Uncovered', value: uncoveredPercentage, fill: COLORS.uncovered },
  ];

  return (
    <div
      data-testid="coverage-chart"
      className={`coverage-chart relative ${className}`.trim()}
    >
      <div className="text-center mb-2 text-sm text-text-secondary">
        Coverage
      </div>
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius="80%"
              paddingAngle={0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}%`, 'Coverage']}
              contentStyle={{
                backgroundColor: 'var(--color-bg-elevated, #fff)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center percentage display */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: 0 }}
        >
          <span className="text-3xl font-bold text-text-primary">
            {clampedPercentage}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default CoverageChart;
