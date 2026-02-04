/**
 * Budget Limits Module
 *
 * Configurable budget limits with enforcement
 */

/**
 * Create a budget manager instance
 * @returns {Object} Budget manager
 */
function createBudgetManager() {
  return {
    daily: null,
    monthly: null,
    byModel: {},
    warnThresholds: [0.5, 0.8],
  };
}

/**
 * Set a budget limit
 * @param {Object} manager - Budget manager instance
 * @param {Object} options - Budget options
 * @param {string} options.type - Budget type: 'daily', 'monthly', or 'model'
 * @param {number} options.limit - Budget limit in dollars
 * @param {string} [options.model] - Model name (for model budgets)
 * @param {number[]} [options.warnAt] - Warning thresholds (e.g., [0.5, 0.8])
 */
function setBudget(manager, options) {
  const { type, limit, model, warnAt } = options;

  if (type === 'daily') {
    manager.daily = limit;
  } else if (type === 'monthly') {
    manager.monthly = limit;
  } else if (type === 'model' && model) {
    manager.byModel[model] = limit;
  }

  if (warnAt) {
    manager.warnThresholds = warnAt;
  }
}

/**
 * Check budget status
 * @param {Object} manager - Budget manager instance
 * @param {Object} options - Check options
 * @param {number} options.currentSpend - Current spend amount
 * @param {string} [options.type='daily'] - Budget type to check
 * @param {string} [options.model] - Model to check (for model budgets)
 * @returns {Object} Status result
 */
function checkBudget(manager, options) {
  const { currentSpend, type = 'daily', model } = options;

  let limit;
  if (type === 'model' && model) {
    limit = manager.byModel[model];
  } else if (type === 'monthly') {
    limit = manager.monthly;
  } else {
    limit = manager.daily;
  }

  if (limit === null || limit === undefined) {
    return { status: 'ok', message: 'No budget set' };
  }

  const percentage = currentSpend / limit;

  if (percentage >= 1) {
    return {
      status: 'exceeded',
      message: `Budget exceeded: $${currentSpend.toFixed(2)} / $${limit.toFixed(2)}`,
      percentage: percentage * 100,
    };
  }

  // Check warning thresholds (in reverse order to get highest matching)
  for (let i = manager.warnThresholds.length - 1; i >= 0; i--) {
    const threshold = manager.warnThresholds[i];
    if (percentage >= threshold) {
      return {
        status: 'warning',
        message: `${Math.round(threshold * 100)}% of budget used: $${currentSpend.toFixed(2)} / $${limit.toFixed(2)}`,
        percentage: percentage * 100,
      };
    }
  }

  return {
    status: 'ok',
    message: `Under budget: $${currentSpend.toFixed(2)} / $${limit.toFixed(2)}`,
    percentage: percentage * 100,
  };
}

/**
 * Enforce budget (determine if operation should proceed)
 * @param {Object} manager - Budget manager instance
 * @param {Object} options - Enforcement options
 * @param {number} options.currentSpend - Current spend
 * @param {number} options.projectedCost - Cost of planned operation
 * @param {boolean} [options.override] - Admin override flag
 * @param {string} [options.type='daily'] - Budget type
 * @returns {Object} Enforcement result
 */
function enforceBudget(manager, options) {
  const { currentSpend, projectedCost, override, type = 'daily' } = options;

  if (override) {
    return { allowed: true, reason: 'Admin override' };
  }

  let limit;
  if (type === 'monthly') {
    limit = manager.monthly;
  } else {
    limit = manager.daily;
  }

  if (limit === null || limit === undefined) {
    return { allowed: true, reason: 'No budget set' };
  }

  const totalAfter = currentSpend + projectedCost;

  if (currentSpend >= limit) {
    return {
      allowed: false,
      reason: `Daily budget exceeded: $${currentSpend.toFixed(2)} >= $${limit.toFixed(2)}`,
    };
  }

  if (totalAfter > limit) {
    return {
      allowed: false,
      reason: `Operation would exceed budget: $${totalAfter.toFixed(2)} > $${limit.toFixed(2)}`,
    };
  }

  return { allowed: true, reason: 'Within budget' };
}

/**
 * Get daily budget limit
 * @param {Object} manager - Budget manager instance
 * @returns {number|null} Daily budget or null if not set
 */
function getDailyBudget(manager) {
  return manager.daily;
}

/**
 * Get monthly budget limit
 * @param {Object} manager - Budget manager instance
 * @returns {number|null} Monthly budget or null if not set
 */
function getMonthlyBudget(manager) {
  return manager.monthly;
}

/**
 * Get budget for a specific model
 * @param {Object} manager - Budget manager instance
 * @param {string} model - Model name
 * @returns {number|null} Model budget or null if not set
 */
function getModelBudget(manager, model) {
  return manager.byModel[model] || null;
}

/**
 * Reset budget spend tracking
 * @param {Object} manager - Budget manager instance
 * @param {Object} options - Reset options
 * @param {string} options.type - Budget type to reset
 */
function resetBudget(manager, options) {
  // Note: The tracker handles actual spend tracking
  // This is mainly for admin operations
  const { type } = options;

  // Budgets themselves remain, just the tracking resets
  // This is handled by the cost tracker, not here
}

/**
 * Calculate remaining budget
 * @param {Object} manager - Budget manager instance
 * @param {Object} options - Options with current spend
 * @param {number} options.currentSpend - Current spend amount
 * @returns {Object} Remaining amounts
 */
function budgetRemaining(manager, options) {
  const { currentSpend } = options;

  const result = {};

  if (manager.daily !== null) {
    result.daily = Math.max(0, manager.daily - currentSpend);
  }

  if (manager.monthly !== null) {
    result.monthly = Math.max(0, manager.monthly - currentSpend);
  }

  return result;
}

module.exports = {
  createBudgetManager,
  setBudget,
  checkBudget,
  enforceBudget,
  getDailyBudget,
  getMonthlyBudget,
  getModelBudget,
  resetBudget,
  budgetRemaining,
};
