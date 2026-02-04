/**
 * Cost Reports Module
 *
 * Generate cost reports by various dimensions
 */

/**
 * Generate a cost report from data
 * @param {Array} data - Cost records
 * @returns {Object} Report object
 */
function generateReport(data) {
  if (!data || data.length === 0) {
    return {
      totalCost: 0,
      recordCount: 0,
      dateRange: { start: null, end: null },
    };
  }

  const totalCost = data.reduce((sum, r) => sum + (r.cost || 0), 0);
  const dates = data.map(r => r.date).filter(Boolean).sort();

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    recordCount: data.length,
    dateRange: {
      start: dates[0] || null,
      end: dates[dates.length - 1] || null,
    },
  };
}

/**
 * Filter records by date period
 * @param {Array} data - Cost records
 * @param {Object} options - Filter options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered records
 */
function filterByPeriod(data, options) {
  const { startDate, endDate } = options;

  if (!data) return [];

  return data.filter(record => {
    if (!record.date) return false;
    return record.date >= startDate && record.date <= endDate;
  });
}

/**
 * Group costs by model
 * @param {Array} data - Cost records
 * @returns {Object} Costs grouped by model
 */
function groupByModel(data) {
  const grouped = {};

  for (const record of data || []) {
    if (record.model) {
      grouped[record.model] = (grouped[record.model] || 0) + (record.cost || 0);
    }
  }

  // Round values
  for (const key of Object.keys(grouped)) {
    grouped[key] = Math.round(grouped[key] * 100) / 100;
  }

  return grouped;
}

/**
 * Group costs by operation
 * @param {Array} data - Cost records
 * @returns {Object} Costs grouped by operation
 */
function groupByOperation(data) {
  const grouped = {};

  for (const record of data || []) {
    if (record.operation) {
      grouped[record.operation] = (grouped[record.operation] || 0) + (record.cost || 0);
    }
  }

  // Round values
  for (const key of Object.keys(grouped)) {
    grouped[key] = Math.round(grouped[key] * 100) / 100;
  }

  return grouped;
}

/**
 * Group costs by trigger
 * @param {Array} data - Cost records
 * @returns {Object} Costs grouped by trigger
 */
function groupByTrigger(data) {
  const grouped = {};

  for (const record of data || []) {
    if (record.trigger) {
      grouped[record.trigger] = (grouped[record.trigger] || 0) + (record.cost || 0);
    }
  }

  // Round values
  for (const key of Object.keys(grouped)) {
    grouped[key] = Math.round(grouped[key] * 100) / 100;
  }

  return grouped;
}

/**
 * Export data as CSV
 * @param {Array} data - Cost records
 * @returns {string} CSV formatted string
 */
function exportCSV(data) {
  if (!data || data.length === 0) {
    return 'date,model,operation,trigger,cost';
  }

  const headers = ['date', 'model', 'operation', 'trigger', 'cost'];
  const lines = [headers.join(',')];

  for (const record of data) {
    const row = [
      record.date || '',
      record.model || '',
      record.operation || '',
      record.trigger || '',
      (record.cost || 0).toFixed(2),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Export data as JSON
 * @param {Array} data - Cost records
 * @returns {string} JSON formatted string
 */
function exportJSON(data) {
  return JSON.stringify(data || [], null, 2);
}

/**
 * Analyze cost trends
 * @param {Array} data - Cost records sorted by date
 * @returns {Object} Trend analysis
 */
function analyzeTrends(data) {
  if (!data || data.length < 2) {
    return {
      direction: 'stable',
      percentChange: 0,
      dataPoints: data?.length || 0,
    };
  }

  // Get first and last values
  const firstCost = data[0].cost;
  const lastCost = data[data.length - 1].cost;

  // Calculate percent change
  const percentChange = firstCost > 0
    ? ((lastCost - firstCost) / firstCost) * 100
    : 0;

  // Determine direction
  let direction;
  if (Math.abs(percentChange) < 5) {
    direction = 'stable';
  } else if (percentChange > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  return {
    direction,
    percentChange: Math.round(percentChange * 100) / 100,
    firstValue: firstCost,
    lastValue: lastCost,
    dataPoints: data.length,
  };
}

/**
 * Compare current period to previous period
 * @param {Array} currentPeriod - Current period records
 * @param {Array} lastPeriod - Previous period records
 * @returns {Object} Comparison results
 */
function compareToLastPeriod(currentPeriod, lastPeriod) {
  const currentTotal = (currentPeriod || []).reduce((sum, r) => sum + (r.cost || 0), 0);
  const lastTotal = (lastPeriod || []).reduce((sum, r) => sum + (r.cost || 0), 0);

  const difference = currentTotal - lastTotal;
  const percentChange = lastTotal > 0
    ? ((currentTotal - lastTotal) / lastTotal) * 100
    : (currentTotal > 0 ? 100 : 0);

  return {
    currentTotal: Math.round(currentTotal * 100) / 100,
    lastTotal: Math.round(lastTotal * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
  };
}

/**
 * Format report as markdown
 * @param {Object} report - Report object
 * @returns {string} Markdown formatted report
 */
function formatReport(report) {
  const lines = [
    '# Cost Report',
    '',
    `## Summary`,
    '',
    `- **Total Cost:** $${(report.totalCost || 0).toFixed(2)}`,
    `- **Records:** ${report.recordCount || 0}`,
  ];

  if (report.dateRange?.start) {
    lines.push(`- **Period:** ${report.dateRange.start} to ${report.dateRange.end}`);
  }

  if (report.byModel && Object.keys(report.byModel).length > 0) {
    lines.push('', '## By Model', '');
    lines.push('| Model | Cost |');
    lines.push('|-------|------|');
    for (const [model, cost] of Object.entries(report.byModel)) {
      lines.push(`| ${model} | $${cost.toFixed(2)} |`);
    }
  }

  if (report.byOperation && Object.keys(report.byOperation).length > 0) {
    lines.push('', '## By Operation', '');
    lines.push('| Operation | Cost |');
    lines.push('|-----------|------|');
    for (const [op, cost] of Object.entries(report.byOperation)) {
      lines.push(`| ${op} | $${cost.toFixed(2)} |`);
    }
  }

  if (report.trend) {
    lines.push('', '## Trend', '');
    lines.push(`- **Direction:** ${report.trend.direction}`);
    lines.push(`- **Change:** ${report.trend.percentChange > 0 ? '+' : ''}${report.trend.percentChange}%`);
  }

  return lines.join('\n');
}

module.exports = {
  generateReport,
  filterByPeriod,
  groupByModel,
  groupByOperation,
  groupByTrigger,
  exportCSV,
  exportJSON,
  analyzeTrends,
  compareToLastPeriod,
  formatReport,
};
