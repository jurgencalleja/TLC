/**
 * CostPane Component
 *
 * Dashboard component for cost visibility
 */

import React from 'react';

interface TrendPoint {
  date: string;
  cost: number;
}

interface Suggestion {
  type: string;
  message: string;
  savings: number;
}

interface CostPaneProps {
  dailySpend: number;
  monthlySpend: number;
  dailyBudget: number;
  monthlyBudget: number;
  byModel: Record<string, number>;
  trend: TrendPoint[];
  suggestions: Suggestion[];
  onConfigureBudget: () => void;
  isLoading?: boolean;
}

/**
 * Get progress bar class based on percentage
 */
function getProgressClass(percentage: number): string {
  if (percentage >= 100) {
    return 'progress-bar danger';
  }
  if (percentage >= 50) {
    return 'progress-bar warning';
  }
  return 'progress-bar';
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Sparkline component for trend visualization
 */
function Sparkline({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return <div data-testid="cost-trend" className="sparkline empty">No data</div>;
  }

  const costs = data.map(d => d.cost);
  const max = Math.max(...costs);
  const min = Math.min(...costs);
  const range = max - min || 1;

  const width = 100;
  const height = 30;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.cost - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div data-testid="cost-trend" className="sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
}

/**
 * Skeleton loader for loading state
 */
function CostPaneSkeleton() {
  return (
    <div data-testid="cost-pane-skeleton" className="cost-pane skeleton">
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
    </div>
  );
}

/**
 * CostPane component
 */
export function CostPane({
  dailySpend,
  monthlySpend,
  dailyBudget,
  monthlyBudget,
  byModel,
  trend,
  suggestions,
  onConfigureBudget,
  isLoading,
}: CostPaneProps) {
  if (isLoading) {
    return <CostPaneSkeleton />;
  }

  const dailyPercentage = dailyBudget > 0 ? Math.round((dailySpend / dailyBudget) * 100) : 0;
  const monthlyPercentage = monthlyBudget > 0 ? Math.round((monthlySpend / monthlyBudget) * 100) : 0;

  const modelEntries = Object.entries(byModel || {});

  return (
    <div className="cost-pane">
      <div className="cost-pane-header">
        <h3>Cost Overview</h3>
        <button
          type="button"
          onClick={onConfigureBudget}
          className="configure-button"
        >
          Configure
        </button>
      </div>

      {/* Daily Budget */}
      <div className="budget-section">
        <div className="budget-label">
          <span>Daily</span>
          <span>{formatCurrency(dailySpend)} / {formatCurrency(dailyBudget)}</span>
        </div>
        <div
          data-testid="daily-progress"
          className={getProgressClass(dailyPercentage)}
          role="progressbar"
          aria-valuenow={dailyPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-fill"
            style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Monthly Budget */}
      <div className="budget-section">
        <div className="budget-label">
          <span>Monthly</span>
          <span>{formatCurrency(monthlySpend)} / {formatCurrency(monthlyBudget)}</span>
        </div>
        <div
          data-testid="monthly-progress"
          className={getProgressClass(monthlyPercentage)}
          role="progressbar"
          aria-valuenow={monthlyPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-fill"
            style={{ width: `${Math.min(monthlyPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Trend */}
      <div className="trend-section">
        <h4>Trend</h4>
        <Sparkline data={trend} />
      </div>

      {/* Model Breakdown */}
      <div className="breakdown-section">
        <h4>By Model</h4>
        {modelEntries.length === 0 ? (
          <p className="empty-state">No cost data</p>
        ) : (
          <ul className="model-list">
            {modelEntries.map(([model, cost]) => (
              <li key={model} className="model-item">
                <span className="model-name">{model}</span>
                <span className="model-cost">{formatCurrency(cost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Suggestions */}
      <div className="suggestions-section">
        <h4>Optimization Suggestions</h4>
        {suggestions.length === 0 ? (
          <p className="empty-state">No suggestions available</p>
        ) : (
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="suggestion-item">
                <span className="suggestion-message">{suggestion.message}</span>
                <span className="suggestion-savings">Save {formatCurrency(suggestion.savings)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CostPane;
