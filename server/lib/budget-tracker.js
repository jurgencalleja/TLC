/**
 * Budget Tracker - Track and limit API spending across models
 */

const fs = require('fs');
const path = require('path');

class BudgetTracker {
  constructor(configPath = '.tlc/usage.json') {
    this.configPath = configPath;
    this.usage = {};
    this.load();
  }

  /**
   * Load usage from file
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.usage = JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load usage:', err.message);
      this.usage = {};
    }

    // Initialize missing models
    this.initializeModel('openai');
    this.initializeModel('deepseek');

    this.checkResets();
    this.save();
  }

  /**
   * Initialize model with default values
   */
  initializeModel(model) {
    if (!this.usage[model]) {
      this.usage[model] = {
        daily: 0,
        monthly: 0,
        requests: 0,
        lastDailyReset: new Date().toISOString(),
        lastMonthlyReset: new Date().toISOString(),
      };
    }
  }

  /**
   * Save usage to file
   */
  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.usage, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save usage:', err.message);
    }
  }

  /**
   * Check and perform resets if needed
   */
  checkResets() {
    const now = new Date();

    for (const model of Object.keys(this.usage)) {
      const usage = this.usage[model];

      // Daily reset
      const lastDaily = new Date(usage.lastDailyReset);
      if (lastDaily.toDateString() !== now.toDateString()) {
        usage.daily = 0;
        usage.lastDailyReset = now.toISOString();
      }

      // Monthly reset
      const lastMonthly = new Date(usage.lastMonthlyReset);
      if (lastMonthly.getMonth() !== now.getMonth() || lastMonthly.getFullYear() !== now.getFullYear()) {
        usage.monthly = 0;
        usage.lastMonthlyReset = now.toISOString();
      }
    }
  }

  /**
   * Check if can spend amount
   * @param {string} model - Model name
   * @param {number} amount - Amount in USD
   * @param {Object} config - Budget config { budgetDaily, budgetMonthly }
   * @returns {boolean}
   */
  canSpend(model, amount, config) {
    this.initializeModel(model);
    const usage = this.usage[model];

    const withinDaily = (usage.daily + amount) <= config.budgetDaily;
    const withinMonthly = (usage.monthly + amount) <= config.budgetMonthly;

    return withinDaily && withinMonthly;
  }

  /**
   * Record spending
   * @param {string} model - Model name
   * @param {number} amount - Amount in USD
   */
  record(model, amount) {
    this.initializeModel(model);
    this.usage[model].daily += amount;
    this.usage[model].monthly += amount;
    this.usage[model].requests = (this.usage[model].requests || 0) + 1;
    this.save();
  }

  /**
   * Check if should alert about budget
   * @param {string} model - Model name
   * @param {Object} config - Budget config { budgetDaily, alertThreshold }
   * @returns {boolean}
   */
  shouldAlert(model, config) {
    this.initializeModel(model);
    const usage = this.usage[model];
    const percentUsed = usage.daily / config.budgetDaily;
    return percentUsed >= (config.alertThreshold || 0.8);
  }

  /**
   * Get usage for model
   * @param {string} model - Model name
   * @returns {Object} Usage { daily, monthly, requests }
   */
  getUsage(model) {
    if (!this.usage[model]) {
      return { daily: 0, monthly: 0, requests: 0 };
    }
    return {
      daily: this.usage[model].daily || 0,
      monthly: this.usage[model].monthly || 0,
      requests: this.usage[model].requests || 0,
    };
  }

  /**
   * Reset usage for model (admin)
   * @param {string} model - Model name
   */
  reset(model) {
    this.usage[model] = {
      daily: 0,
      monthly: 0,
      requests: 0,
      lastDailyReset: new Date().toISOString(),
      lastMonthlyReset: new Date().toISOString(),
    };
    this.save();
  }
}

module.exports = {
  BudgetTracker,
};
