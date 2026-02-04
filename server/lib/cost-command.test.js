/**
 * Cost Command Tests
 *
 * CLI for cost management
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  CostCommand,
  parseArgs,
  formatStatus,
} = require('./cost-command.js');

describe('Cost Command', () => {
  let command;
  let mockTracker;
  let mockPricing;
  let mockBudget;

  beforeEach(() => {
    mockTracker = {
      getDailyCost: () => 5.00,
      getMonthlyCost: () => 25.00,
      getCostByModel: () => ({ 'claude-3-opus': 15.00, 'gpt-4': 10.00 }),
    };

    mockPricing = {
      getPricing: (model) => ({ inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 }),
    };

    mockBudget = {
      getDailyBudget: () => 10.00,
      getMonthlyBudget: () => 100.00,
      budgetRemaining: () => ({ daily: 5.00, monthly: 75.00 }),
    };

    command = new CostCommand({
      tracker: mockTracker,
      pricing: mockPricing,
      budget: mockBudget,
    });
  });

  describe('execute status', () => {
    it('shows spend summary', async () => {
      const result = await command.execute('status');

      assert.ok(result.output);
      assert.ok(result.output.includes('5.00') || result.output.includes('$5'));
      assert.ok(result.output.includes('25.00') || result.output.includes('$25'));
    });

    it('shows budget remaining', async () => {
      const result = await command.execute('status');

      assert.ok(result.output.includes('remaining') || result.output.includes('left'));
    });
  });

  describe('execute budget', () => {
    it('sets daily limit', async () => {
      let setBudgetCalled = false;
      mockBudget.setBudget = ({ type, limit }) => {
        if (type === 'daily' && limit === 20.00) {
          setBudgetCalled = true;
        }
      };

      const result = await command.execute('budget --daily 20.00');

      assert.ok(setBudgetCalled);
      assert.ok(result.success);
    });

    it('sets monthly limit', async () => {
      let setBudgetCalled = false;
      mockBudget.setBudget = ({ type, limit }) => {
        if (type === 'monthly' && limit === 200.00) {
          setBudgetCalled = true;
        }
      };

      const result = await command.execute('budget --monthly 200.00');

      assert.ok(setBudgetCalled);
      assert.ok(result.success);
    });
  });

  describe('execute report', () => {
    it('generates report', async () => {
      mockTracker.getRecords = () => [
        { date: '2025-01-15', model: 'claude-3-opus', cost: 1.00 },
        { date: '2025-01-16', model: 'gpt-4', cost: 0.50 },
      ];

      const result = await command.execute('report');

      assert.ok(result.output);
      assert.ok(result.report);
    });

    it('filters by period', async () => {
      let filterStart, filterEnd;
      mockTracker.getRecords = (options) => {
        filterStart = options?.startDate;
        filterEnd = options?.endDate;
        return [];
      };

      await command.execute('report --from 2025-01-01 --to 2025-01-31');

      assert.strictEqual(filterStart, '2025-01-01');
      assert.strictEqual(filterEnd, '2025-01-31');
    });
  });

  describe('execute estimate', () => {
    it('projects cost for task', async () => {
      const result = await command.execute('estimate "Write a sorting function"');

      assert.ok(result.output);
      assert.ok(result.estimate);
      assert.ok(result.estimate.estimatedCost >= 0);
    });

    it('compares models', async () => {
      const result = await command.execute('estimate "Write a sorting function" --compare');

      assert.ok(result.output);
      assert.ok(result.comparison);
      assert.ok(Array.isArray(result.comparison));
    });
  });

  describe('execute optimize', () => {
    it('shows suggestions', async () => {
      mockTracker.getRecords = () => [
        { model: 'claude-3-opus', operation: 'chat', cost: 5.00 },
        { model: 'claude-3-opus', operation: 'chat', cost: 3.00 },
      ];

      const result = await command.execute('optimize');

      assert.ok(result.output);
      assert.ok(result.suggestions);
    });
  });

  describe('formatStatus', () => {
    it('creates readable output', () => {
      const status = {
        dailySpend: 5.00,
        monthlySpend: 25.00,
        dailyBudget: 10.00,
        monthlyBudget: 100.00,
        dailyRemaining: 5.00,
        monthlyRemaining: 75.00,
        byModel: { 'claude-3-opus': 15.00, 'gpt-4': 10.00 },
      };

      const formatted = formatStatus(status);

      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('$'));
      assert.ok(formatted.includes('claude-3-opus') || formatted.includes('Model'));
    });
  });

  describe('parseArgs', () => {
    it('parses status command', () => {
      const parsed = parseArgs('status');

      assert.strictEqual(parsed.command, 'status');
    });

    it('parses budget with flags', () => {
      const parsed = parseArgs('budget --daily 20.00 --monthly 200.00');

      assert.strictEqual(parsed.command, 'budget');
      assert.strictEqual(parsed.daily, 20.00);
      assert.strictEqual(parsed.monthly, 200.00);
    });

    it('parses report with date range', () => {
      const parsed = parseArgs('report --from 2025-01-01 --to 2025-01-31');

      assert.strictEqual(parsed.command, 'report');
      assert.strictEqual(parsed.from, '2025-01-01');
      assert.strictEqual(parsed.to, '2025-01-31');
    });

    it('parses estimate with prompt', () => {
      const parsed = parseArgs('estimate "Write a function"');

      assert.strictEqual(parsed.command, 'estimate');
      assert.strictEqual(parsed.prompt, 'Write a function');
    });
  });
});
