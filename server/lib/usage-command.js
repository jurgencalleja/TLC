/**
 * Usage Command - /tlc:usage command implementation
 */

const { BudgetTracker } = require('./budget-tracker.js');
const { UsageHistory } = require('./usage-history.js');
const { formatUsageSummary } = require('./usage-formatter.js');
const { BudgetAlerts, formatAlertMessage } = require('./budget-alerts.js');

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  const result = {
    reset: false,
    model: null,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--reset') {
      result.reset = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--model') {
      result.model = args[i + 1];
      i++;
    } else if (arg.startsWith('--model=')) {
      result.model = arg.split('=')[1];
    }
  }

  return result;
}

/**
 * UsageCommand class - handles /tlc:usage command
 */
class UsageCommand {
  constructor(options = {}) {
    this.budgetTracker = options.budgetTracker || new BudgetTracker();
    this.usageHistory = options.usageHistory || new UsageHistory();
    this.budgetAlerts = options.budgetAlerts || new BudgetAlerts();
  }

  /**
   * Execute the usage command
   * @param {string[]} args - Command arguments
   * @param {Object} config - Budget config per model { model: { budgetDaily, budgetMonthly } }
   * @returns {Object} Result { success, output, json?, alerts?, error? }
   */
  execute(args, config) {
    const options = parseArgs(args);

    // Determine which models to process
    let models = Object.keys(config);

    if (options.model) {
      if (!config[options.model]) {
        return {
          success: false,
          error: `Unknown model: ${options.model}. Available: ${models.join(', ')}`,
        };
      }
      models = [options.model];
    }

    // Handle reset
    if (options.reset) {
      return this.handleReset(models, options);
    }

    // Collect data
    const usageData = this.getUsageData(models);
    const historyData = this.getHistoryData(models);
    const alerts = this.checkAlerts(models, usageData, config);
    const alertMessages = alerts.map(a => formatAlertMessage(a));

    // JSON output
    if (options.json) {
      return {
        success: true,
        json: {
          models: usageData,
          history: historyData,
          alerts: alerts,
          totals: this.calculateTotals(usageData, config),
        },
        alerts: alertMessages,
      };
    }

    // Text output
    const output = formatUsageSummary(usageData, config, historyData);

    return {
      success: true,
      output,
      alerts: alertMessages,
    };
  }

  /**
   * Handle --reset flag
   * @param {string[]} models - Models to reset
   * @param {Object} options - Parsed options
   * @returns {Object} Result
   */
  handleReset(models, options) {
    for (const model of models) {
      this.budgetTracker.reset(model);
      this.budgetAlerts.resetAlerts(model);
    }

    const modelList = models.join(', ');
    return {
      success: true,
      output: `Usage reset for: ${modelList}`,
    };
  }

  /**
   * Collect usage data from all specified models
   * @param {string[]} models - Model names
   * @returns {Object} Usage data per model
   */
  getUsageData(models) {
    const data = {};

    for (const model of models) {
      data[model] = this.budgetTracker.getUsage(model);
    }

    return data;
  }

  /**
   * Collect history data from all specified models
   * @param {string[]} models - Model names
   * @returns {Object} History data per model
   */
  getHistoryData(models) {
    const data = {};

    for (const model of models) {
      data[model] = this.usageHistory.getHistory(model);
    }

    return data;
  }

  /**
   * Check alerts for all models
   * @param {string[]} models - Model names
   * @param {Object} usageData - Usage data per model
   * @param {Object} config - Budget config per model
   * @returns {Object[]} Array of fired alerts
   */
  checkAlerts(models, usageData, config) {
    const allAlerts = [];

    for (const model of models) {
      const usage = usageData[model];
      const modelConfig = config[model];

      if (usage && modelConfig) {
        const alerts = this.budgetAlerts.checkThresholds(model, usage, modelConfig);
        allAlerts.push(...alerts);
      }
    }

    return allAlerts;
  }

  /**
   * Calculate totals across all models
   * @param {Object} usageData - Usage data per model
   * @param {Object} config - Budget config per model
   * @returns {Object} Totals
   */
  calculateTotals(usageData, config) {
    let totalDaily = 0;
    let totalMonthly = 0;
    let totalRequests = 0;
    let totalBudgetDaily = 0;
    let totalBudgetMonthly = 0;

    for (const model of Object.keys(usageData)) {
      const usage = usageData[model];
      const modelConfig = config[model] || {};

      totalDaily += usage.daily || 0;
      totalMonthly += usage.monthly || 0;
      totalRequests += usage.requests || 0;
      totalBudgetDaily += modelConfig.budgetDaily || 0;
      totalBudgetMonthly += modelConfig.budgetMonthly || 0;
    }

    return {
      daily: totalDaily,
      monthly: totalMonthly,
      requests: totalRequests,
      budgetDaily: totalBudgetDaily,
      budgetMonthly: totalBudgetMonthly,
      remainingDaily: Math.max(0, totalBudgetDaily - totalDaily),
      remainingMonthly: Math.max(0, totalBudgetMonthly - totalMonthly),
    };
  }
}

module.exports = {
  UsageCommand,
  parseArgs,
};
