/**
 * Agents List Command
 * Lists all agents with filtering capabilities
 */

/**
 * Parse time string to milliseconds
 * @param {string} timeStr - Time string like '1h', '30m', '2d'
 * @returns {number} Milliseconds
 */
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/**
 * Filter agents by criteria
 * @param {Array} agents - Agents to filter
 * @param {object} options - Filter options
 * @returns {Array} Filtered agents
 */
function filterAgents(agents, options = {}) {
  let result = [...agents];

  if (options.status) {
    result = result.filter(a => a.status === options.status);
  }

  if (options.model) {
    result = result.filter(a => a.model.toLowerCase().includes(options.model.toLowerCase()));
  }

  if (options.since) {
    const sinceMs = parseTime(options.since);
    const cutoff = Date.now() - sinceMs;
    result = result.filter(a => new Date(a.startTime).getTime() >= cutoff);
  }

  return result;
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string} Truncated string
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * Format agents as table
 * @param {Array} agents - Agents to format
 * @param {object} options - Format options
 * @returns {string} Formatted table
 */
function formatTable(agents, options = {}) {
  if (!agents || agents.length === 0) {
    return 'No agents found';
  }

  const maxWidth = options.maxWidth || 120;

  // Calculate column widths
  const colWidths = {
    id: Math.min(15, maxWidth / 5),
    name: Math.min(20, maxWidth / 4),
    model: Math.min(12, maxWidth / 6),
    status: 10,
    cost: 10,
  };

  // Header
  const header = [
    'ID'.padEnd(colWidths.id),
    'Name'.padEnd(colWidths.name),
    'Model'.padEnd(colWidths.model),
    'Status'.padEnd(colWidths.status),
    'Cost'.padEnd(colWidths.cost),
  ].join(' | ');

  const separator = '-'.repeat(header.length);

  // Rows
  const rows = agents.map(agent => [
    truncate(agent.id, colWidths.id).padEnd(colWidths.id),
    truncate(agent.name || '-', colWidths.name).padEnd(colWidths.name),
    truncate(agent.model, colWidths.model).padEnd(colWidths.model),
    agent.status.padEnd(colWidths.status),
    `$${(agent.cost || 0).toFixed(4)}`.padEnd(colWidths.cost),
  ].join(' | '));

  return [header, separator, ...rows].join('\n');
}

/**
 * Format agents as JSON
 * @param {Array} agents - Agents to format
 * @returns {string} JSON string
 */
function formatJSON(agents) {
  return JSON.stringify(agents, null, 2);
}

/**
 * Execute agents list command
 * @param {object} context - Execution context
 * @returns {Promise<object>} Command result
 */
async function execute(context) {
  const { registry, options = {} } = context;

  const allAgents = registry.listAgents();
  const filtered = filterAgents(allAgents, options);

  let output;
  if (options.json) {
    output = formatJSON(filtered);
  } else {
    output = formatTable(filtered, { maxWidth: options.width });
  }

  return {
    success: true,
    count: filtered.length,
    output,
  };
}

module.exports = {
  execute,
  filterAgents,
  formatTable,
  formatJSON,
  parseTime,
};
