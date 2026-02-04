/**
 * Budget Limits Tests
 *
 * Configurable budget limits with enforcement
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const {
  createBudgetManager,
  setBudget,
  checkBudget,
  enforceBudget,
  getDailyBudget,
  getMonthlyBudget,
  getModelBudget,
  resetBudget,
  budgetRemaining,
} = require('./budget-limits.js');

describe('Budget Limits', () => {
  let manager;

  beforeEach(() => {
    manager = createBudgetManager();
  });

  describe('setBudget', () => {
    it('configures daily limit', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const daily = getDailyBudget(manager);
      assert.strictEqual(daily, 10.00);
    });

    it('configures monthly limit', () => {
      setBudget(manager, { type: 'monthly', limit: 100.00 });

      const monthly = getMonthlyBudget(manager);
      assert.strictEqual(monthly, 100.00);
    });

    it('configures per-model limit', () => {
      setBudget(manager, { type: 'model', model: 'gpt-4', limit: 25.00 });

      const modelBudget = getModelBudget(manager, 'gpt-4');
      assert.strictEqual(modelBudget, 25.00);
    });
  });

  describe('checkBudget', () => {
    it('returns ok under limit', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = checkBudget(manager, { currentSpend: 5.00 });

      assert.strictEqual(result.status, 'ok');
    });

    it('returns warning at 50% threshold', () => {
      setBudget(manager, { type: 'daily', limit: 10.00, warnAt: [0.5, 0.8] });

      const result = checkBudget(manager, { currentSpend: 5.00 });

      assert.strictEqual(result.status, 'warning');
      assert.ok(result.message.includes('50%'));
    });

    it('returns warning at 80% threshold', () => {
      setBudget(manager, { type: 'daily', limit: 10.00, warnAt: [0.5, 0.8] });

      const result = checkBudget(manager, { currentSpend: 8.00 });

      assert.strictEqual(result.status, 'warning');
      assert.ok(result.message.includes('80%'));
    });

    it('returns exceeded at limit', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = checkBudget(manager, { currentSpend: 10.00 });

      assert.strictEqual(result.status, 'exceeded');
    });

    it('returns exceeded over limit', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = checkBudget(manager, { currentSpend: 15.00 });

      assert.strictEqual(result.status, 'exceeded');
    });
  });

  describe('enforceBudget', () => {
    it('blocks when exceeded', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = enforceBudget(manager, {
        currentSpend: 10.00,
        projectedCost: 1.00,
      });

      assert.strictEqual(result.allowed, false);
      assert.ok(result.reason.includes('budget'));
    });

    it('allows with admin override', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = enforceBudget(manager, {
        currentSpend: 10.00,
        projectedCost: 1.00,
        override: true,
      });

      assert.strictEqual(result.allowed, true);
    });

    it('allows when under budget', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const result = enforceBudget(manager, {
        currentSpend: 5.00,
        projectedCost: 1.00,
      });

      assert.strictEqual(result.allowed, true);
    });
  });

  describe('getDailyBudget', () => {
    it('returns configured daily limit', () => {
      setBudget(manager, { type: 'daily', limit: 15.00 });

      const budget = getDailyBudget(manager);
      assert.strictEqual(budget, 15.00);
    });

    it('returns null if not set', () => {
      const budget = getDailyBudget(manager);
      assert.strictEqual(budget, null);
    });
  });

  describe('getMonthlyBudget', () => {
    it('returns configured monthly limit', () => {
      setBudget(manager, { type: 'monthly', limit: 150.00 });

      const budget = getMonthlyBudget(manager);
      assert.strictEqual(budget, 150.00);
    });

    it('returns null if not set', () => {
      const budget = getMonthlyBudget(manager);
      assert.strictEqual(budget, null);
    });
  });

  describe('getModelBudget', () => {
    it('returns per-model budget', () => {
      setBudget(manager, { type: 'model', model: 'claude-3-opus', limit: 50.00 });

      const budget = getModelBudget(manager, 'claude-3-opus');
      assert.strictEqual(budget, 50.00);
    });

    it('returns null for model without budget', () => {
      const budget = getModelBudget(manager, 'unknown-model');
      assert.strictEqual(budget, null);
    });
  });

  describe('resetBudget', () => {
    it('clears spend to zero', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      // Simulate some spend by checking budget
      const beforeReset = budgetRemaining(manager, { currentSpend: 7.00 });

      resetBudget(manager, { type: 'daily' });

      const afterReset = budgetRemaining(manager, { currentSpend: 0 });
      assert.strictEqual(afterReset.daily, 10.00);
    });
  });

  describe('budgetRemaining', () => {
    it('calculates remaining daily budget', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const remaining = budgetRemaining(manager, { currentSpend: 3.00 });

      assert.strictEqual(remaining.daily, 7.00);
    });

    it('calculates remaining monthly budget', () => {
      setBudget(manager, { type: 'monthly', limit: 100.00 });

      const remaining = budgetRemaining(manager, { currentSpend: 25.00 });

      assert.strictEqual(remaining.monthly, 75.00);
    });

    it('returns 0 when exceeded', () => {
      setBudget(manager, { type: 'daily', limit: 10.00 });

      const remaining = budgetRemaining(manager, { currentSpend: 15.00 });

      assert.strictEqual(remaining.daily, 0);
    });
  });
});
