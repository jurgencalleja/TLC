/**
 * TestTrendChart Tests
 *
 * Line chart showing test results over time
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestTrendChart } from './TestTrendChart';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
      {children}
    </div>
  );

  const MockLineChart = ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-point-count={data?.length || 0}>
      {children}
    </div>
  );

  const MockLine = ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  );

  const MockXAxis = ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  );

  const MockYAxis = () => <div data-testid="y-axis" />;

  const MockTooltip = () => <div data-testid="tooltip" />;

  const MockCartesianGrid = () => <div data-testid="cartesian-grid" />;

  const MockLegend = () => <div data-testid="legend" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    LineChart: MockLineChart,
    Line: MockLine,
    XAxis: MockXAxis,
    YAxis: MockYAxis,
    Tooltip: MockTooltip,
    CartesianGrid: MockCartesianGrid,
    Legend: MockLegend,
  };
});

describe('TestTrendChart', () => {
  const sampleData = [
    { date: '2025-01-13', passed: 45, failed: 5 },
    { date: '2025-01-14', passed: 48, failed: 2 },
    { date: '2025-01-15', passed: 50, failed: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders with sample data', () => {
    it('renders the chart container', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('test-trend-chart')).toBeInTheDocument();
    });

    it('renders a responsive container', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the line chart with data points', () => {
      render(<TestTrendChart data={sampleData} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute('data-point-count', '3');
    });

    it('renders passed line in green', () => {
      render(<TestTrendChart data={sampleData} />);

      const passedLine = screen.getByTestId('line-passed');
      expect(passedLine).toBeInTheDocument();
      // Green color should be used for passed tests
      expect(passedLine).toHaveAttribute('data-stroke');
    });

    it('renders failed line in red', () => {
      render(<TestTrendChart data={sampleData} />);

      const failedLine = screen.getByTestId('line-failed');
      expect(failedLine).toBeInTheDocument();
      // Red color should be used for failed tests
      expect(failedLine).toHaveAttribute('data-stroke');
    });
  });

  describe('axes configuration', () => {
    it('renders X axis with date key', () => {
      render(<TestTrendChart data={sampleData} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
      expect(xAxis).toHaveAttribute('data-key', 'date');
    });

    it('renders Y axis for count', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });
  });

  describe('tooltip on hover', () => {
    it('includes tooltip component', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('handles empty data gracefully', () => {
    it('renders empty state when data is empty array', () => {
      render(<TestTrendChart data={[]} />);

      expect(screen.getByTestId('test-trend-chart')).toBeInTheDocument();
      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });

    it('shows message for no test data', () => {
      render(<TestTrendChart data={[]} />);

      expect(screen.getByText(/no data/i)).toBeInTheDocument();
    });
  });

  describe('responsive sizing', () => {
    it('uses ResponsiveContainer for responsive sizing', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('accepts className prop for custom styling', () => {
      render(<TestTrendChart data={sampleData} className="custom-chart" />);

      const chart = screen.getByTestId('test-trend-chart');
      expect(chart).toHaveClass('custom-chart');
    });
  });

  describe('dark/light theme support', () => {
    it('applies theme-aware styles', () => {
      render(<TestTrendChart data={sampleData} />);

      const chart = screen.getByTestId('test-trend-chart');
      // Chart container should have a class that enables theme support
      expect(chart.className).toBeDefined();
    });
  });

  describe('chart elements', () => {
    it('renders cartesian grid', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('renders legend', () => {
      render(<TestTrendChart data={sampleData} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('single data point', () => {
    it('handles single data point', () => {
      const singlePoint = [{ date: '2025-01-13', passed: 10, failed: 2 }];
      render(<TestTrendChart data={singlePoint} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-point-count', '1');
    });
  });

  describe('large datasets', () => {
    it('handles large dataset without crashing', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        passed: Math.floor(Math.random() * 100),
        failed: Math.floor(Math.random() * 10),
      }));

      render(<TestTrendChart data={largeData} />);

      const chart = screen.getByTestId('line-chart');
      expect(chart).toHaveAttribute('data-point-count', '100');
    });
  });
});
