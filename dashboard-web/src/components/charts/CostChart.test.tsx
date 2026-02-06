/**
 * CostChart Tests
 *
 * Stacked bar chart showing AI costs over time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CostChart } from './CostChart';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
      {children}
    </div>
  );

  const MockBarChart = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: unknown[];
  }) => (
    <div data-testid="bar-chart" data-bar-count={data?.length || 0}>
      {children}
    </div>
  );

  const MockBar = ({
    dataKey,
    fill,
    stackId,
    name,
  }: {
    dataKey: string;
    fill: string;
    stackId?: string;
    name?: string;
  }) => (
    <div
      data-testid={`bar-${dataKey}`}
      data-fill={fill}
      data-stack-id={stackId}
      data-name={name}
    />
  );

  const MockXAxis = ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  );

  const MockYAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis" data-has-formatter={!!tickFormatter} />
  );

  const MockTooltip = ({
    content,
  }: {
    content?: React.ComponentType<{ active?: boolean; payload?: unknown[]; label?: string }> | ((props: { active?: boolean; payload?: unknown[]; label?: string }) => React.ReactNode);
  }) => {
    // Render custom tooltip content for testing
    const tooltipProps = {
      active: true,
      payload: [
        { name: 'Claude', value: 10.5, fill: '#8b5cf6' },
        { name: 'GPT-4', value: 5.25, fill: '#10b981' },
      ],
      label: '2025-01-15',
    };
    return (
      <div data-testid="tooltip" data-has-custom-content={!!content}>
        {typeof content === 'function' && content(tooltipProps)}
      </div>
    );
  };

  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />;

  const MockLegend = () => <div data-testid="legend" />;

  const MockReferenceLine = ({
    y,
    stroke,
    label,
  }: {
    y: number;
    stroke: string;
    label?: { value: string };
  }) => (
    <div
      data-testid="reference-line"
      data-y={y}
      data-stroke={stroke}
      data-label={label?.value}
    />
  );

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: MockBar,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    CartesianGrid: MockCartesianGrid,
    Legend: MockLegend,
    ReferenceLine: MockReferenceLine,
  };
});

describe('CostChart', () => {
  const sampleData = [
    {
      date: '2025-01-13',
      costs: [
        { model: 'Claude', amount: 12.5 },
        { model: 'GPT-4', amount: 8.0 },
      ],
    },
    {
      date: '2025-01-14',
      costs: [
        { model: 'Claude', amount: 15.0 },
        { model: 'GPT-4', amount: 5.5 },
      ],
    },
    {
      date: '2025-01-15',
      costs: [
        { model: 'Claude', amount: 10.0 },
        { model: 'GPT-4', amount: 6.25 },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders with sample data', () => {
    it('renders the chart container', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('cost-chart')).toBeInTheDocument();
    });

    it('renders a responsive container', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the bar chart', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('shows correct number of bars', () => {
    it('renders correct number of data points', () => {
      render(<CostChart data={sampleData} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-bar-count', '3');
    });

    it('renders bars for each model', () => {
      render(<CostChart data={sampleData} />);

      // Should have a bar for Claude and GPT-4
      expect(screen.getByTestId('bar-Claude')).toBeInTheDocument();
      expect(screen.getByTestId('bar-GPT-4')).toBeInTheDocument();
    });

    it('renders stacked bars with same stackId', () => {
      render(<CostChart data={sampleData} />);

      const claudeBar = screen.getByTestId('bar-Claude');
      const gpt4Bar = screen.getByTestId('bar-GPT-4');

      expect(claudeBar).toHaveAttribute('data-stack-id', 'cost');
      expect(gpt4Bar).toHaveAttribute('data-stack-id', 'cost');
    });
  });

  describe('colors different per model', () => {
    it('uses different colors for different models', () => {
      render(<CostChart data={sampleData} />);

      const claudeBar = screen.getByTestId('bar-Claude');
      const gpt4Bar = screen.getByTestId('bar-GPT-4');

      const claudeColor = claudeBar.getAttribute('data-fill');
      const gpt4Color = gpt4Bar.getAttribute('data-fill');

      expect(claudeColor).not.toBe(gpt4Color);
    });

    it('assigns a color to each model', () => {
      render(<CostChart data={sampleData} />);

      const claudeBar = screen.getByTestId('bar-Claude');
      const gpt4Bar = screen.getByTestId('bar-GPT-4');

      expect(claudeBar.getAttribute('data-fill')).toBeTruthy();
      expect(gpt4Bar.getAttribute('data-fill')).toBeTruthy();
    });
  });

  describe('budget line', () => {
    it('renders budget line when budget is provided', () => {
      render(<CostChart data={sampleData} budget={50} />);

      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine).toBeInTheDocument();
      expect(referenceLine).toHaveAttribute('data-y', '50');
    });

    it('does not render budget line when budget is not provided', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
    });

    it('budget line has label', () => {
      render(<CostChart data={sampleData} budget={100} />);

      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine).toHaveAttribute('data-label', 'Budget: $100');
    });

    it('budget line uses distinct color', () => {
      render(<CostChart data={sampleData} budget={75} />);

      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine.getAttribute('data-stroke')).toBeTruthy();
    });
  });

  describe('handles empty data gracefully', () => {
    it('renders empty state when data is empty array', () => {
      render(<CostChart data={[]} />);

      expect(screen.getByTestId('cost-chart')).toBeInTheDocument();
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('shows message for no cost data', () => {
      render(<CostChart data={[]} />);

      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('does not render bar chart when data is empty', () => {
      render(<CostChart data={[]} />);

      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('tooltip shows on hover', () => {
    it('includes tooltip component', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('tooltip has custom content for showing totals', () => {
      render(<CostChart data={sampleData} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-has-custom-content', 'true');
    });

    it('custom tooltip shows total cost', () => {
      render(<CostChart data={sampleData} />);

      // The custom tooltip should display total
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });
  });

  describe('responsive sizing', () => {
    it('uses ResponsiveContainer for responsive sizing', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('accepts className prop for custom styling', () => {
      render(<CostChart data={sampleData} className="custom-cost-chart" />);

      const chart = screen.getByTestId('cost-chart');
      expect(chart).toHaveClass('custom-cost-chart');
    });

    it('accepts height prop', () => {
      render(<CostChart data={sampleData} height={400} />);

      // Should render without error with custom height
      expect(screen.getByTestId('cost-chart')).toBeInTheDocument();
    });
  });

  describe('theme support', () => {
    it('applies theme-aware styles to container', () => {
      render(<CostChart data={sampleData} />);

      const chart = screen.getByTestId('cost-chart');
      expect(chart.className).toBeDefined();
    });

    it('renders cartesian grid', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });
  });

  describe('axes configuration', () => {
    it('renders X axis with date key', () => {
      render(<CostChart data={sampleData} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
      expect(xAxis).toHaveAttribute('data-key', 'date');
    });

    it('renders Y axis for cost', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('Y axis has currency formatter', () => {
      render(<CostChart data={sampleData} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-has-formatter', 'true');
    });
  });

  describe('legend', () => {
    it('renders legend component', () => {
      render(<CostChart data={sampleData} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('handles various data scenarios', () => {
    it('handles single day data', () => {
      const singleDay = [
        {
          date: '2025-01-13',
          costs: [{ model: 'Claude', amount: 10.0 }],
        },
      ];

      render(<CostChart data={singleDay} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-bar-count', '1');
    });

    it('handles data with many models', () => {
      const multiModel = [
        {
          date: '2025-01-13',
          costs: [
            { model: 'Claude', amount: 10.0 },
            { model: 'GPT-4', amount: 8.0 },
            { model: 'Gemini', amount: 5.0 },
            { model: 'Llama', amount: 2.0 },
          ],
        },
      ];

      render(<CostChart data={multiModel} />);

      expect(screen.getByTestId('bar-Claude')).toBeInTheDocument();
      expect(screen.getByTestId('bar-GPT-4')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Gemini')).toBeInTheDocument();
      expect(screen.getByTestId('bar-Llama')).toBeInTheDocument();
    });

    it('handles 7-day data range', () => {
      const sevenDays = Array.from({ length: 7 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        costs: [{ model: 'Claude', amount: 10 + i }],
      }));

      render(<CostChart data={sevenDays} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-bar-count', '7');
    });

    it('handles 30-day data range', () => {
      const thirtyDays = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        costs: [{ model: 'Claude', amount: 10 + Math.random() * 5 }],
      }));

      render(<CostChart data={thirtyDays} />);

      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-bar-count', '30');
    });

    it('handles zero cost amounts', () => {
      const zeroCost = [
        {
          date: '2025-01-13',
          costs: [
            { model: 'Claude', amount: 0 },
            { model: 'GPT-4', amount: 5.0 },
          ],
        },
      ];

      render(<CostChart data={zeroCost} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('handles day with no costs', () => {
      const noCosts = [
        {
          date: '2025-01-13',
          costs: [],
        },
      ];

      render(<CostChart data={noCosts} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});
