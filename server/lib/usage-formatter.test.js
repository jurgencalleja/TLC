import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatUsageTable,
  formatBudgetPercentage,
  generateBarChart,
  formatUsageSummary,
} from './usage-formatter.js';

describe('usage-formatter', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts with dollar sign and 2 decimals', () => {
      expect(formatCurrency(5.5)).toBe('$5.50');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0.05)).toBe('$0.05');
    });

    it('formats zero as $0.00', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles large amounts with commas', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(10000)).toBe('$10,000.00');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatCurrency(5.555)).toBe('$5.56');
      expect(formatCurrency(5.554)).toBe('$5.55');
    });
  });

  describe('formatUsageTable', () => {
    it('formats single model usage', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
      };

      const table = formatUsageTable(usageData, budgets);

      expect(table).toContain('openai');
      expect(table).toContain('$5.00');
      expect(table).toContain('$50.00');
      expect(table).toContain('100');
    });

    it('formats multiple models', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
        deepseek: { daily: 2.00, monthly: 20.00, requests: 50 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
        deepseek: { budgetDaily: 5.00, budgetMonthly: 50.00 },
      };

      const table = formatUsageTable(usageData, budgets);

      expect(table).toContain('openai');
      expect(table).toContain('deepseek');
      expect(table).toContain('$5.00');
      expect(table).toContain('$2.00');
    });

    it('handles zero usage', () => {
      const usageData = {
        openai: { daily: 0, monthly: 0, requests: 0 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
      };

      const table = formatUsageTable(usageData, budgets);

      expect(table).toContain('openai');
      expect(table).toContain('$0.00');
      expect(table).toContain('0%');
    });

    it('includes table headers', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
      };

      const table = formatUsageTable(usageData, budgets);

      expect(table).toContain('Model');
      expect(table).toContain('Daily');
      expect(table).toContain('Monthly');
      expect(table).toContain('Requests');
    });
  });

  describe('formatBudgetPercentage', () => {
    it('calculates percentage of daily budget used', () => {
      const result = formatBudgetPercentage(5.00, 10.00);
      expect(result).toBe('50%');
    });

    it('shows 100% when at budget limit', () => {
      const result = formatBudgetPercentage(10.00, 10.00);
      expect(result).toBe('100%');
    });

    it('shows over 100% when exceeding budget', () => {
      const result = formatBudgetPercentage(15.00, 10.00);
      expect(result).toBe('150%');
    });

    it('handles zero budget gracefully', () => {
      const result = formatBudgetPercentage(5.00, 0);
      expect(result).toBe('N/A');
    });

    it('shows 0% for zero usage', () => {
      const result = formatBudgetPercentage(0, 10.00);
      expect(result).toBe('0%');
    });

    it('rounds to whole number', () => {
      const result = formatBudgetPercentage(3.33, 10.00);
      expect(result).toBe('33%');
    });
  });

  describe('generateBarChart', () => {
    it('generates 7-day bar chart', () => {
      const history = [
        { date: '2026-01-10', daily: 2.00 },
        { date: '2026-01-11', daily: 4.00 },
        { date: '2026-01-12', daily: 6.00 },
        { date: '2026-01-13', daily: 8.00 },
        { date: '2026-01-14', daily: 10.00 },
        { date: '2026-01-15', daily: 5.00 },
        { date: '2026-01-16', daily: 3.00 },
      ];

      const chart = generateBarChart(history, 10.00);

      expect(chart).toContain('01-10');
      expect(chart).toContain('01-16');
      // Should have bar characters (Unicode block character)
      expect(chart).toMatch(/\u2588+/);
    });

    it('handles zero usage days', () => {
      const history = [
        { date: '2026-01-15', daily: 0 },
        { date: '2026-01-16', daily: 5.00 },
      ];

      const chart = generateBarChart(history, 10.00);

      expect(chart).toContain('01-15');
      expect(chart).toContain('01-16');
    });

    it('scales bars relative to budget', () => {
      const history = [
        { date: '2026-01-15', daily: 5.00 },  // 50% of budget
        { date: '2026-01-16', daily: 10.00 }, // 100% of budget
      ];

      const chart = generateBarChart(history, 10.00);

      // The 100% day should have more bar characters than 50% day
      const lines = chart.split('\n');
      const line15 = lines.find(l => l.includes('01-15'));
      const line16 = lines.find(l => l.includes('01-16'));

      // Count bar characters
      const bars15 = (line15.match(/\u2588/g) || []).length;
      const bars16 = (line16.match(/\u2588/g) || []).length;

      expect(bars16).toBeGreaterThan(bars15);
    });

    it('returns empty message for no history', () => {
      const chart = generateBarChart([], 10.00);
      expect(chart).toContain('No usage history');
    });

    it('marks days over budget', () => {
      const history = [
        { date: '2026-01-15', daily: 5.00 },
        { date: '2026-01-16', daily: 15.00 }, // Over budget
      ];

      const chart = generateBarChart(history, 10.00);

      // Should have some indicator for over budget
      expect(chart).toMatch(/!|\*|>|OVER/i);
    });
  });

  describe('formatUsageSummary', () => {
    it('formats complete usage summary with all models', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
        deepseek: { daily: 2.00, monthly: 20.00, requests: 50 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
        deepseek: { budgetDaily: 5.00, budgetMonthly: 50.00 },
      };
      const history = {
        openai: [
          { date: '2026-01-15', daily: 5.00, monthly: 50.00 },
        ],
        deepseek: [
          { date: '2026-01-15', daily: 2.00, monthly: 20.00 },
        ],
      };

      const summary = formatUsageSummary(usageData, budgets, history);

      expect(summary).toContain('Usage Summary');
      expect(summary).toContain('openai');
      expect(summary).toContain('deepseek');
      expect(summary).toContain('$5.00');
      expect(summary).toContain('50%');
    });

    it('includes totals section', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
        deepseek: { daily: 2.00, monthly: 20.00, requests: 50 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
        deepseek: { budgetDaily: 5.00, budgetMonthly: 50.00 },
      };

      const summary = formatUsageSummary(usageData, budgets, {});

      // Total daily: 5 + 2 = 7
      expect(summary).toContain('$7.00');
      // Total monthly: 50 + 20 = 70
      expect(summary).toContain('$70.00');
    });

    it('handles empty usage data', () => {
      const summary = formatUsageSummary({}, {}, {});
      expect(summary).toContain('No usage data');
    });

    it('shows budget remaining', () => {
      const usageData = {
        openai: { daily: 5.00, monthly: 50.00, requests: 100 },
      };
      const budgets = {
        openai: { budgetDaily: 10.00, budgetMonthly: 100.00 },
      };

      const summary = formatUsageSummary(usageData, budgets, {});

      // Should show remaining: 10 - 5 = 5 daily, 100 - 50 = 50 monthly
      expect(summary).toContain('Remaining');
    });
  });
});
