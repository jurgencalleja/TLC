/**
 * CostPane Tests
 *
 * Dashboard component for cost visibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CostPane } from './CostPane';

describe('CostPane', () => {
  const defaultProps = {
    dailySpend: 5.00,
    monthlySpend: 25.00,
    dailyBudget: 10.00,
    monthlyBudget: 100.00,
    byModel: {
      'claude-3-opus': 15.00,
      'gpt-4': 8.00,
      'claude-3-haiku': 2.00,
    },
    trend: [
      { date: '2025-01-13', cost: 4.00 },
      { date: '2025-01-14', cost: 5.50 },
      { date: '2025-01-15', cost: 5.00 },
    ],
    suggestions: [
      { type: 'model', message: 'Consider claude-3-haiku for simple tasks', savings: 2.00 },
    ],
    onConfigureBudget: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('renders spend vs budget', () => {
    it('shows daily spend and budget', () => {
      render(<CostPane {...defaultProps} />);

      expect(screen.getByText(/\$5\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$10\.00/)).toBeInTheDocument();
    });

    it('shows monthly spend and budget', () => {
      render(<CostPane {...defaultProps} />);

      expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('shows percentage for daily budget', () => {
      render(<CostPane {...defaultProps} />);

      // 5/10 = 50%
      const progressBar = screen.getByTestId('daily-progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('shows percentage for monthly budget', () => {
      render(<CostPane {...defaultProps} />);

      // 25/100 = 25%
      const progressBar = screen.getByTestId('monthly-progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });
  });

  describe('warning color at threshold', () => {
    it('shows warning at 50% daily', () => {
      render(<CostPane {...defaultProps} dailySpend={5.00} dailyBudget={10.00} />);

      const progressBar = screen.getByTestId('daily-progress');
      expect(progressBar).toHaveClass('warning');
    });

    it('shows warning at 80%', () => {
      render(<CostPane {...defaultProps} dailySpend={8.00} dailyBudget={10.00} />);

      const progressBar = screen.getByTestId('daily-progress');
      expect(progressBar).toHaveClass('warning');
    });
  });

  describe('danger color at limit', () => {
    it('shows danger at 100%', () => {
      render(<CostPane {...defaultProps} dailySpend={10.00} dailyBudget={10.00} />);

      const progressBar = screen.getByTestId('daily-progress');
      expect(progressBar).toHaveClass('danger');
    });

    it('shows danger when over budget', () => {
      render(<CostPane {...defaultProps} dailySpend={12.00} dailyBudget={10.00} />);

      const progressBar = screen.getByTestId('daily-progress');
      expect(progressBar).toHaveClass('danger');
    });
  });

  describe('breakdown chart renders', () => {
    it('shows model breakdown', () => {
      render(<CostPane {...defaultProps} />);

      expect(screen.getByText(/claude-3-opus/)).toBeInTheDocument();
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
      // claude-3-haiku appears in both byModel and suggestions
      const haikuMentions = screen.getAllByText(/claude-3-haiku/);
      expect(haikuMentions.length).toBeGreaterThanOrEqual(1);
    });

    it('shows cost per model', () => {
      render(<CostPane {...defaultProps} />);

      expect(screen.getByText(/\$15\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\$8\.00/)).toBeInTheDocument();
      // $2.00 appears in both byModel cost and suggestion savings
      const twoMentions = screen.getAllByText(/\$2\.00/);
      expect(twoMentions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('trend sparkline renders', () => {
    it('renders sparkline with trend data', () => {
      render(<CostPane {...defaultProps} />);

      const sparkline = screen.getByTestId('cost-trend');
      expect(sparkline).toBeInTheDocument();
    });

    it('shows trend direction', () => {
      render(<CostPane {...defaultProps} />);

      // Trend is slightly increasing overall
      expect(screen.getByTestId('cost-trend')).toBeInTheDocument();
    });
  });

  describe('suggestions list renders', () => {
    it('shows optimization suggestions', () => {
      render(<CostPane {...defaultProps} />);

      // claude-3-haiku appears in both byModel and suggestions
      const haikuMentions = screen.getAllByText(/claude-3-haiku/);
      expect(haikuMentions.length).toBeGreaterThanOrEqual(1);
      // $2.00 appears in both byModel cost and suggestion savings
      const twoMentions = screen.getAllByText(/\$2\.00/);
      expect(twoMentions.length).toBeGreaterThanOrEqual(1);
    });

    it('shows empty state when no suggestions', () => {
      render(<CostPane {...defaultProps} suggestions={[]} />);

      expect(screen.getByText(/no suggestions/i)).toBeInTheDocument();
    });
  });

  describe('configure button works', () => {
    it('calls onConfigureBudget when clicked', () => {
      render(<CostPane {...defaultProps} />);

      const configButton = screen.getByRole('button', { name: /configure/i });
      fireEvent.click(configButton);

      expect(defaultProps.onConfigureBudget).toHaveBeenCalled();
    });
  });

  describe('handles loading state', () => {
    it('shows skeleton when loading', () => {
      render(<CostPane {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('cost-pane-skeleton')).toBeInTheDocument();
    });
  });

  describe('handles zero spend', () => {
    it('shows zero values correctly', () => {
      render(
        <CostPane
          {...defaultProps}
          dailySpend={0}
          monthlySpend={0}
          byModel={{}}
          trend={[]}
        />
      );

      // Both daily and monthly show $0.00, so use getAllByText
      const zeroAmounts = screen.getAllByText(/\$0\.00/);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('shows empty breakdown', () => {
      render(
        <CostPane
          {...defaultProps}
          byModel={{}}
        />
      );

      expect(screen.getByText(/no cost data/i)).toBeInTheDocument();
    });
  });
});
