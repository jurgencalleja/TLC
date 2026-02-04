/**
 * Agents Get Command
 * Show detailed agent information
 */

/**
 * Format timestamp
 * @param {Date} date - Date to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

/**
 * Format state history
 * @param {Array} history - State history entries
 * @returns {string} Formatted history
 */
function formatStateHistory(history) {
  if (!history || history.length === 0) {
    return 'No state history';
  }

  return history.map(entry =>
    `  ${formatTimestamp(entry.timestamp)} → ${entry.state}`
  ).join('\n');
}

/**
 * Format token breakdown
 * @param {object} tokens - Token counts
 * @returns {string} Formatted breakdown
 */
function formatTokenBreakdown(tokens) {
  if (!tokens) return 'No token data';

  const input = tokens.input || 0;
  const output = tokens.output || 0;
  const total = input + output;

  return [
    `  Input:  ${input.toLocaleString()}`,
    `  Output: ${output.toLocaleString()}`,
    `  Total:  ${total.toLocaleString()}`,
  ].join('\n');
}

/**
 * Format cost breakdown
 * @param {number} cost - Total cost
 * @returns {string} Formatted cost
 */
function formatCostBreakdown(cost) {
  if (cost === undefined || cost === null) return 'No cost data';
  return `  Total: $${cost.toFixed(4)}`;
}

/**
 * Format quality scores
 * @param {object} quality - Quality data
 * @returns {string} Formatted quality
 */
function formatQualityScores(quality) {
  if (!quality) return 'No quality data';

  const lines = [`  Score: ${quality.score}%`];

  if (quality.dimensions) {
    for (const [dim, score] of Object.entries(quality.dimensions)) {
      lines.push(`    ${dim}: ${score}%`);
    }
  }

  return lines.join('\n');
}

/**
 * Format full agent details
 * @param {object} agent - Agent to format
 * @returns {string} Formatted details
 */
function formatDetails(agent) {
  const sections = [];

  // Header
  sections.push(`Agent: ${agent.id}`);
  sections.push('='.repeat(50));

  // Metadata
  sections.push('\n📋 Metadata');
  sections.push(`  ID:     ${agent.id}`);
  sections.push(`  Name:   ${agent.name || '-'}`);
  sections.push(`  Model:  ${agent.model}`);
  sections.push(`  Status: ${agent.status}`);
  sections.push(`  Start:  ${formatTimestamp(agent.startTime)}`);
  if (agent.endTime) {
    sections.push(`  End:    ${formatTimestamp(agent.endTime)}`);
  }

  // State History
  sections.push('\n📜 State History');
  sections.push(formatStateHistory(agent.stateHistory));

  // Tokens
  sections.push('\n🔢 Tokens');
  sections.push(formatTokenBreakdown(agent.tokens));

  // Cost
  sections.push('\n💰 Cost');
  sections.push(formatCostBreakdown(agent.cost));

  // Quality
  sections.push('\n📊 Quality');
  sections.push(formatQualityScores(agent.quality));

  return sections.join('\n');
}

/**
 * Execute agents get command
 * @param {object} context - Execution context
 * @returns {Promise<object>} Command result
 */
async function execute(context) {
  const { registry, agentId, options = {} } = context;

  const agent = registry.getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent not found: ${agentId}`,
    };
  }

  let output;
  if (options.json) {
    output = JSON.stringify(agent, null, 2);
  } else {
    output = formatDetails(agent);
  }

  return {
    success: true,
    agent,
    output,
  };
}

module.exports = {
  execute,
  formatDetails,
  formatStateHistory,
  formatTokenBreakdown,
  formatCostBreakdown,
  formatQualityScores,
};
