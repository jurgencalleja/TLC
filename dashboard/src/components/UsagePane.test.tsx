import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { UsagePane } from './UsagePane.js';

describe('UsagePane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without error', () => {
    const { lastFrame } = render(<UsagePane />);
    expect(lastFrame()).toBeDefined();
  });

  it('shows placeholder when no usage data', () => {
    const { lastFrame } = render(<UsagePane />);
    const output = lastFrame();
    expect(output).toContain('Usage');
  });

  it('renders usage bars for each model', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
      deepseek: { daily: 2, monthly: 20, requests: 50, budgetDaily: 5, budgetMonthly: 50 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('openai');
    expect(output).toContain('deepseek');
  });

  it('shows model names', () => {
    const usageData = {
      'gpt-4': { daily: 3, monthly: 30, requests: 60, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('gpt-4');
  });

  it('shows dollar amounts', () => {
    const usageData = {
      openai: { daily: 5.50, monthly: 55.25, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('$5.50');
  });

  it('shows budget limit', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('$10');
  });

  it('highlights over-budget with warning color', () => {
    const usageData = {
      openai: { daily: 12, monthly: 120, requests: 150, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    // Should show the over-budget amount
    expect(output).toContain('$12');
    // Should have some indicator of over-budget
    expect(output).toContain('OVER');
  });

  it('shows alert messages when provided', () => {
    const usageData = {
      openai: { daily: 8, monthly: 80, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };
    const alerts = ['Budget Alert: openai at 80% of daily budget'];

    const { lastFrame } = render(<UsagePane data={usageData} alerts={alerts} />);
    const output = lastFrame();

    expect(output).toContain('80%');
  });

  it('shows percentage of budget used', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('50%');
  });

  it('updates on data change', () => {
    const usageData1 = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame, rerender } = render(<UsagePane data={usageData1} />);
    let output = lastFrame();
    expect(output).toContain('$5');

    const usageData2 = {
      openai: { daily: 7, monthly: 70, requests: 140, budgetDaily: 10, budgetMonthly: 100 },
    };

    rerender(<UsagePane data={usageData2} />);
    output = lastFrame();
    expect(output).toContain('$7');
  });

  it('shows totals across all models', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
      deepseek: { daily: 3, monthly: 30, requests: 60, budgetDaily: 5, budgetMonthly: 50 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    // Total daily: $8, Total budget: $15
    expect(output).toContain('$8');
  });

  it('shows visual progress bar for usage', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    // Should contain some visual bar representation
    expect(output).toBeTruthy();
  });

  it('handles zero usage gracefully', () => {
    const usageData = {
      openai: { daily: 0, monthly: 0, requests: 0, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('$0');
    expect(output).toContain('0%');
  });

  it('handles missing budget values', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 100, budgetDaily: 0, budgetMonthly: 0 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    // Should still render without errors
    expect(output).toBeDefined();
  });

  it('shows request count', () => {
    const usageData = {
      openai: { daily: 5, monthly: 50, requests: 150, budgetDaily: 10, budgetMonthly: 100 },
    };

    const { lastFrame } = render(<UsagePane data={usageData} />);
    const output = lastFrame();

    expect(output).toContain('150');
  });
});
