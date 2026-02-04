/**
 * Cost Command Module
 *
 * CLI interface for cost management
 */

const { projectCost, compareModels } = require('./cost-projections.js');
const { generateReport, groupByModel, groupByOperation, formatReport } = require('./cost-reports.js');
const { analyzeUsage, suggestCheaperModel, createOptimizer, formatSuggestions } = require('./cost-optimizer.js');

/**
 * Parse command line arguments
 * @param {string} input - Command input string
 * @returns {Object} Parsed arguments
 */
function parseArgs(input) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  // Parse respecting quotes
  for (const char of input) {
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  const result = {
    command: parts[0] || 'status',
  };

  // Parse flags
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--daily' && parts[i + 1]) {
      result.daily = parseFloat(parts[i + 1]);
      i++;
    } else if (part === '--monthly' && parts[i + 1]) {
      result.monthly = parseFloat(parts[i + 1]);
      i++;
    } else if (part === '--from' && parts[i + 1]) {
      result.from = parts[i + 1];
      i++;
    } else if (part === '--to' && parts[i + 1]) {
      result.to = parts[i + 1];
      i++;
    } else if (part === '--compare') {
      result.compare = true;
    } else if (!part.startsWith('--')) {
      result.prompt = part;
    }
  }

  return result;
}

/**
 * Format status output
 * @param {Object} status - Status data
 * @returns {string} Formatted output
 */
function formatStatus(status) {
  const lines = [
    'Cost Status',
    '═'.repeat(40),
    '',
    `Daily:   $${status.dailySpend.toFixed(2)} / $${status.dailyBudget.toFixed(2)} ($${status.dailyRemaining.toFixed(2)} remaining)`,
    `Monthly: $${status.monthlySpend.toFixed(2)} / $${status.monthlyBudget.toFixed(2)} ($${status.monthlyRemaining.toFixed(2)} remaining)`,
  ];

  if (status.byModel && Object.keys(status.byModel).length > 0) {
    lines.push('', 'By Model:');
    for (const [model, cost] of Object.entries(status.byModel)) {
      lines.push(`  ${model}: $${cost.toFixed(2)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Cost Command class
 */
class CostCommand {
  /**
   * Create a cost command instance
   * @param {Object} options - Dependencies
   * @param {Object} options.tracker - Cost tracker instance
   * @param {Object} options.pricing - Pricing module
   * @param {Object} options.budget - Budget manager
   */
  constructor(options) {
    this.tracker = options.tracker;
    this.pricing = options.pricing;
    this.budget = options.budget;
    this.optimizer = createOptimizer();
  }

  /**
   * Execute a command
   * @param {string} input - Command input
   * @returns {Object} Execution result
   */
  async execute(input) {
    const args = parseArgs(input);

    switch (args.command) {
      case 'status':
        return this.executeStatus();

      case 'budget':
        return this.executeBudget(args);

      case 'report':
        return this.executeReport(args);

      case 'estimate':
        return this.executeEstimate(args);

      case 'optimize':
        return this.executeOptimize();

      default:
        return {
          success: false,
          output: `Unknown command: ${args.command}`,
        };
    }
  }

  /**
   * Execute status command
   * @returns {Object} Status result
   */
  executeStatus() {
    const today = new Date().toISOString().split('T')[0];

    const status = {
      dailySpend: this.tracker.getDailyCost(today),
      monthlySpend: this.tracker.getMonthlyCost(),
      dailyBudget: this.budget.getDailyBudget() || 0,
      monthlyBudget: this.budget.getMonthlyBudget() || 0,
      byModel: this.tracker.getCostByModel(),
    };

    const remaining = this.budget.budgetRemaining({
      currentSpend: status.dailySpend,
    });

    status.dailyRemaining = remaining.daily || 0;
    status.monthlyRemaining = remaining.monthly || 0;

    return {
      success: true,
      output: formatStatus(status),
      status,
    };
  }

  /**
   * Execute budget command
   * @param {Object} args - Parsed arguments
   * @returns {Object} Budget result
   */
  executeBudget(args) {
    if (args.daily !== undefined) {
      this.budget.setBudget({ type: 'daily', limit: args.daily });
    }

    if (args.monthly !== undefined) {
      this.budget.setBudget({ type: 'monthly', limit: args.monthly });
    }

    return {
      success: true,
      output: `Budget updated${args.daily ? ` - Daily: $${args.daily}` : ''}${args.monthly ? ` - Monthly: $${args.monthly}` : ''}`,
    };
  }

  /**
   * Execute report command
   * @param {Object} args - Parsed arguments
   * @returns {Object} Report result
   */
  executeReport(args) {
    const records = this.tracker.getRecords?.({
      startDate: args.from,
      endDate: args.to,
    }) || [];

    const report = generateReport(records);
    report.byModel = groupByModel(records);
    report.byOperation = groupByOperation(records);

    return {
      success: true,
      output: formatReport(report),
      report,
    };
  }

  /**
   * Execute estimate command
   * @param {Object} args - Parsed arguments
   * @returns {Object} Estimate result
   */
  executeEstimate(args) {
    const prompt = args.prompt || '';
    const model = 'claude-3-sonnet'; // Default model

    if (args.compare) {
      const models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-4o'];
      const comparison = compareModels({ prompt, taskType: 'code-generation', models });

      const lines = ['Cost Comparison:', ''];
      for (const proj of comparison) {
        lines.push(`${proj.model}: $${proj.estimatedCost.toFixed(4)}`);
      }

      return {
        success: true,
        output: lines.join('\n'),
        comparison,
      };
    }

    const estimate = projectCost({
      prompt,
      model,
      taskType: 'code-generation',
    });

    return {
      success: true,
      output: `Estimated cost for "${prompt.substring(0, 30)}...": $${estimate.estimatedCost.toFixed(4)}`,
      estimate,
    };
  }

  /**
   * Execute optimize command
   * @returns {Object} Optimization result
   */
  executeOptimize() {
    const records = this.tracker.getRecords?.() || [];
    const analysis = analyzeUsage(this.optimizer, records);

    const suggestions = [];

    // Check for expensive operations using high-cost models
    for (const op of analysis.expensiveOperations.slice(0, 3)) {
      const suggestion = suggestCheaperModel(this.optimizer, {
        currentModel: op.model,
        taskType: op.operation || 'code-generation',
      });

      if (suggestion) {
        suggestions.push({
          type: 'model',
          current: op.model,
          suggested: suggestion.alternativeModel,
          savings: suggestion.estimatedSavings,
        });
      }
    }

    return {
      success: true,
      output: formatSuggestions(suggestions),
      suggestions,
    };
  }
}

module.exports = {
  CostCommand,
  parseArgs,
  formatStatus,
};
