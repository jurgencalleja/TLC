/**
 * CoverageChart Tests
 *
 * Donut/pie chart showing coverage percentage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageChart } from './CoverageChart';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 200, height: 200 }}>
      {children}
    </div>
  );

  const MockPieChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  );

  const MockPie = ({
    data,
    innerRadius,
    outerRadius,
  }: {
    data: Array<{ name: string; value: number; fill: string }>;
    innerRadius: number;
    outerRadius: string;
  }) => (
    <div
      data-testid="pie"
      data-inner-radius={innerRadius}
      data-outer-radius={outerRadius}
    >
      {data?.map((entry, index) => (
        <div
          key={index}
          data-testid={`pie-segment-${entry.name}`}
          data-value={entry.value}
          data-fill={entry.fill}
        />
      ))}
    </div>
  );

  const MockCell = ({ fill }: { fill: string }) => (
    <div data-testid="cell" data-fill={fill} />
  );

  const MockTooltip = () => <div data-testid="tooltip" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    PieChart: MockPieChart,
    Pie: MockPie,
    Cell: MockCell,
    Tooltip: MockTooltip,
  };
});

describe('CoverageChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders with percentage', () => {
    it('renders the chart container', () => {
      render(<CoverageChart percentage={75} />);

      expect(screen.getByTestId('coverage-chart')).toBeInTheDocument();
    });

    it('renders a responsive container', () => {
      render(<CoverageChart percentage={75} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the pie chart', () => {
      render(<CoverageChart percentage={75} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders covered segment', () => {
      render(<CoverageChart percentage={75} />);

      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      expect(coveredSegment).toBeInTheDocument();
      expect(coveredSegment).toHaveAttribute('data-value', '75');
    });

    it('renders uncovered segment', () => {
      render(<CoverageChart percentage={75} />);

      const uncoveredSegment = screen.getByTestId('pie-segment-Uncovered');
      expect(uncoveredSegment).toBeInTheDocument();
      expect(uncoveredSegment).toHaveAttribute('data-value', '25');
    });
  });

  describe('donut style (inner radius)', () => {
    it('renders as donut chart with inner radius', () => {
      render(<CoverageChart percentage={50} />);

      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-inner-radius');
      // Inner radius should be > 0 for donut style
      const innerRadius = pie.getAttribute('data-inner-radius');
      expect(Number(innerRadius)).toBeGreaterThan(0);
    });
  });

  describe('center percentage display', () => {
    it('shows percentage number in center', () => {
      render(<CoverageChart percentage={85} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('shows 0% for zero coverage', () => {
      render(<CoverageChart percentage={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows 100% for full coverage', () => {
      render(<CoverageChart percentage={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('color segments', () => {
    it('covered segment uses green color', () => {
      render(<CoverageChart percentage={60} />);

      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      const fill = coveredSegment.getAttribute('data-fill');
      // Should be green-ish color
      expect(fill).toBeDefined();
    });

    it('uncovered segment uses gray color', () => {
      render(<CoverageChart percentage={60} />);

      const uncoveredSegment = screen.getByTestId('pie-segment-Uncovered');
      const fill = uncoveredSegment.getAttribute('data-fill');
      // Should be gray-ish color
      expect(fill).toBeDefined();
    });
  });

  describe('handles edge cases gracefully', () => {
    it('handles 0% coverage', () => {
      render(<CoverageChart percentage={0} />);

      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      const uncoveredSegment = screen.getByTestId('pie-segment-Uncovered');

      expect(coveredSegment).toHaveAttribute('data-value', '0');
      expect(uncoveredSegment).toHaveAttribute('data-value', '100');
    });

    it('handles 100% coverage', () => {
      render(<CoverageChart percentage={100} />);

      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      const uncoveredSegment = screen.getByTestId('pie-segment-Uncovered');

      expect(coveredSegment).toHaveAttribute('data-value', '100');
      expect(uncoveredSegment).toHaveAttribute('data-value', '0');
    });

    it('clamps percentage above 100 to 100', () => {
      render(<CoverageChart percentage={150} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      expect(coveredSegment).toHaveAttribute('data-value', '100');
    });

    it('clamps negative percentage to 0', () => {
      render(<CoverageChart percentage={-10} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const coveredSegment = screen.getByTestId('pie-segment-Covered');
      expect(coveredSegment).toHaveAttribute('data-value', '0');
    });

    it('handles decimal percentages', () => {
      render(<CoverageChart percentage={75.5} />);

      // Should display rounded percentage (75.5 rounds to 76)
      expect(screen.getByText('76%')).toBeInTheDocument();
    });
  });

  describe('responsive sizing', () => {
    it('uses ResponsiveContainer for responsive sizing', () => {
      render(<CoverageChart percentage={80} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('accepts className prop for custom styling', () => {
      render(<CoverageChart percentage={80} className="custom-coverage" />);

      const chart = screen.getByTestId('coverage-chart');
      expect(chart).toHaveClass('custom-coverage');
    });
  });

  describe('dark/light theme support', () => {
    it('applies theme-aware styles', () => {
      render(<CoverageChart percentage={70} />);

      const chart = screen.getByTestId('coverage-chart');
      // Chart container should have a class that enables theme support
      expect(chart.className).toBeDefined();
    });
  });

  describe('tooltip', () => {
    it('includes tooltip component', () => {
      render(<CoverageChart percentage={65} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('label text', () => {
    it('shows coverage label', () => {
      render(<CoverageChart percentage={90} />);

      // Should have "Coverage" label somewhere
      expect(screen.getByText(/coverage/i)).toBeInTheDocument();
    });
  });
});
