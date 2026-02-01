/**
 * Budget Alerts - Alert system for budget thresholds
 */

/**
 * Default thresholds for budget alerts (50%, 80%, 100%)
 */
const DEFAULT_THRESHOLDS = [0.5, 0.8, 1.0];

/**
 * BudgetAlerts class - tracks and fires alerts when budget thresholds are crossed
 */
class BudgetAlerts {
  /**
   * @param {number[]} thresholds - Array of threshold percentages (0-1)
   */
  constructor(thresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = [...thresholds].sort((a, b) => a - b);
    this.firedAlerts = {}; // { model: Set(threshold1, threshold2, ...) }
  }

  /**
   * Check thresholds and fire alerts for crossed thresholds
   * @param {string} model - Model name
   * @param {Object} usage - Usage object { daily, monthly }
   * @param {Object} config - Config object { budgetDaily }
   * @returns {Object[]} Array of fired alerts
   */
  checkThresholds(model, usage, config) {
    if (!this.firedAlerts[model]) {
      this.firedAlerts[model] = new Set();
    }

    const percentUsed = usage.daily / config.budgetDaily;
    const fired = [];

    for (const threshold of this.thresholds) {
      // Check if threshold is crossed and not already fired
      if (percentUsed >= threshold && !this.firedAlerts[model].has(threshold)) {
        this.firedAlerts[model].add(threshold);
        fired.push(createAlert(model, threshold, usage.daily, config.budgetDaily));
      }
    }

    return fired;
  }

  /**
   * Reset alerts for a model (e.g., on daily reset)
   * @param {string} model - Model name
   */
  resetAlerts(model) {
    if (this.firedAlerts[model]) {
      this.firedAlerts[model].clear();
    }
  }

  /**
   * Check if a specific threshold has already fired for a model
   * @param {string} model - Model name
   * @param {number} threshold - Threshold value
   * @returns {boolean}
   */
  hasFired(model, threshold) {
    if (!this.firedAlerts[model]) {
      return false;
    }
    return this.firedAlerts[model].has(threshold);
  }

  /**
   * Get list of fired thresholds for a model
   * @param {string} model - Model name
   * @returns {number[]} Array of fired threshold values
   */
  getFiredAlerts(model) {
    if (!this.firedAlerts[model]) {
      return [];
    }
    return Array.from(this.firedAlerts[model]);
  }
}

/**
 * Create an alert object
 * @param {string} model - Model name
 * @param {number} threshold - Threshold value (0-1)
 * @param {number} currentSpend - Current spending amount
 * @param {number} budgetLimit - Budget limit
 * @returns {Object} Alert object
 */
function createAlert(model, threshold, currentSpend, budgetLimit) {
  const percentUsed = Math.round((currentSpend / budgetLimit) * 100);

  let severity;
  if (threshold >= 1.0) {
    severity = 'critical';
  } else if (threshold >= 0.8) {
    severity = 'caution';
  } else {
    severity = 'warning';
  }

  return {
    model,
    threshold,
    currentSpend,
    budgetLimit,
    percentUsed,
    severity,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format an alert into a human-readable message
 * @param {Object} alert - Alert object from createAlert
 * @returns {string} Formatted message
 */
function formatAlertMessage(alert) {
  const thresholdPercent = Math.round(alert.threshold * 100);
  const spent = `$${alert.currentSpend.toFixed(2)}`;
  const limit = `$${alert.budgetLimit.toFixed(2)}`;

  if (alert.threshold >= 1.0) {
    return `!! CRITICAL !! Budget EXCEEDED for ${alert.model}: ${alert.percentUsed}% used (${spent} of ${limit})`;
  }

  const severityPrefix = alert.severity === 'caution' ? '!' : '';
  return `${severityPrefix}Budget Alert: ${alert.model} has reached ${thresholdPercent}% of daily budget (${spent} of ${limit})`;
}

module.exports = {
  BudgetAlerts,
  createAlert,
  formatAlertMessage,
  DEFAULT_THRESHOLDS,
};
