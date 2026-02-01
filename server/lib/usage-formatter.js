/**
 * Usage Formatter - Format usage data for display
 */

const BAR_WIDTH = 20;
const BAR_CHAR = '\u2588'; // Full block character

/**
 * Format amount as currency with dollar sign and 2 decimals
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format budget percentage
 * @param {number} used - Amount used
 * @param {number} budget - Budget limit
 * @returns {string} Percentage string
 */
function formatBudgetPercentage(used, budget) {
  if (budget === 0) {
    return 'N/A';
  }
  const percentage = Math.round((used / budget) * 100);
  return `${percentage}%`;
}

/**
 * Format usage data as a table
 * @param {Object} usageData - Usage data per model { model: { daily, monthly, requests } }
 * @param {Object} budgets - Budget config per model { model: { budgetDaily, budgetMonthly } }
 * @returns {string} Formatted table
 */
function formatUsageTable(usageData, budgets) {
  const models = Object.keys(usageData);
  if (models.length === 0) {
    return 'No usage data available.';
  }

  // Calculate column widths
  const headers = ['Model', 'Daily', 'Budget %', 'Monthly', 'Budget %', 'Requests'];
  const rows = [];

  for (const model of models) {
    const usage = usageData[model];
    const budget = budgets[model] || { budgetDaily: 0, budgetMonthly: 0 };

    rows.push([
      model,
      formatCurrency(usage.daily),
      formatBudgetPercentage(usage.daily, budget.budgetDaily),
      formatCurrency(usage.monthly),
      formatBudgetPercentage(usage.monthly, budget.budgetMonthly),
      String(usage.requests),
    ]);
  }

  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const dataWidths = rows.map(r => r[i].length);
    return Math.max(h.length, ...dataWidths);
  });

  // Build table
  const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const formatRow = (cols) => '| ' + cols.map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |';

  const lines = [
    separator,
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
    separator,
  ];

  return lines.join('\n');
}

/**
 * Generate ASCII bar chart for usage history
 * @param {Array} history - Array of { date, daily } snapshots
 * @param {number} budgetDaily - Daily budget for scaling
 * @returns {string} ASCII bar chart
 */
function generateBarChart(history, budgetDaily) {
  if (!history || history.length === 0) {
    return 'No usage history available.';
  }

  const lines = [];
  lines.push('7-Day Usage History:');
  lines.push('');

  // Find max for scaling (use budget or max daily, whichever is larger)
  const maxDaily = Math.max(...history.map(h => h.daily), budgetDaily);

  for (const entry of history) {
    const dateLabel = entry.date.slice(5); // MM-DD format
    const percentage = maxDaily > 0 ? entry.daily / maxDaily : 0;
    const barLength = Math.round(percentage * BAR_WIDTH);
    const bar = BAR_CHAR.repeat(barLength);
    const amount = formatCurrency(entry.daily);

    // Mark over budget
    const overBudget = entry.daily > budgetDaily;
    const indicator = overBudget ? ' OVER!' : '';

    lines.push(`${dateLabel} ${bar.padEnd(BAR_WIDTH)} ${amount}${indicator}`);
  }

  return lines.join('\n');
}

/**
 * Format complete usage summary
 * @param {Object} usageData - Usage data per model
 * @param {Object} budgets - Budget config per model
 * @param {Object} history - History per model { model: [snapshots] }
 * @returns {string} Complete formatted summary
 */
function formatUsageSummary(usageData, budgets, history) {
  const models = Object.keys(usageData);

  if (models.length === 0) {
    return 'No usage data available.';
  }

  const lines = [];
  lines.push('='.repeat(50));
  lines.push('Usage Summary');
  lines.push('='.repeat(50));
  lines.push('');

  // Usage table
  lines.push(formatUsageTable(usageData, budgets));
  lines.push('');

  // Calculate totals
  let totalDaily = 0;
  let totalMonthly = 0;
  let totalBudgetDaily = 0;
  let totalBudgetMonthly = 0;

  for (const model of models) {
    const usage = usageData[model];
    const budget = budgets[model] || { budgetDaily: 0, budgetMonthly: 0 };

    totalDaily += usage.daily;
    totalMonthly += usage.monthly;
    totalBudgetDaily += budget.budgetDaily;
    totalBudgetMonthly += budget.budgetMonthly;
  }

  // Totals section
  lines.push('Totals:');
  lines.push(`  Daily:   ${formatCurrency(totalDaily)} / ${formatCurrency(totalBudgetDaily)} (${formatBudgetPercentage(totalDaily, totalBudgetDaily)})`);
  lines.push(`  Monthly: ${formatCurrency(totalMonthly)} / ${formatCurrency(totalBudgetMonthly)} (${formatBudgetPercentage(totalMonthly, totalBudgetMonthly)})`);
  lines.push('');

  // Remaining budget
  lines.push('Remaining:');
  lines.push(`  Daily:   ${formatCurrency(Math.max(0, totalBudgetDaily - totalDaily))}`);
  lines.push(`  Monthly: ${formatCurrency(Math.max(0, totalBudgetMonthly - totalMonthly))}`);
  lines.push('');

  // History charts per model
  for (const model of models) {
    const modelHistory = history[model] || [];
    if (modelHistory.length > 0) {
      const budget = budgets[model] || { budgetDaily: 10 };
      lines.push(`${model}:`);
      lines.push(generateBarChart(modelHistory, budget.budgetDaily));
      lines.push('');
    }
  }

  return lines.join('\n');
}

module.exports = {
  formatCurrency,
  formatUsageTable,
  formatBudgetPercentage,
  generateBarChart,
  formatUsageSummary,
};
