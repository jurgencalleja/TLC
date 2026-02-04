/**
 * Agents Logs Command
 * View agent output and logs
 */

/**
 * Format a single log line
 * @param {object} entry - Log entry
 * @param {object} options - Format options
 * @returns {string} Formatted line
 */
function formatLogLine(entry, options = {}) {
  const parts = [];

  if (options.timestamps) {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    parts.push(`[${time}]`);
  }

  if (entry.stream === 'stderr') {
    parts.push('[ERR]');
  }

  parts.push(entry.message);

  return parts.join(' ');
}

/**
 * Format all logs
 * @param {Array} logs - Log entries
 * @param {object} options - Format options
 * @returns {string} Formatted output
 */
function formatLogs(logs, options = {}) {
  if (!logs || logs.length === 0) {
    return 'No logs available';
  }

  return logs.map(entry => formatLogLine(entry, options)).join('\n');
}

/**
 * Get last n log entries
 * @param {Array} logs - All logs
 * @param {number} n - Number of entries
 * @returns {Array} Last n entries
 */
function tailLogs(logs, n) {
  if (!logs || logs.length === 0) return [];
  if (logs.length <= n) return logs;
  return logs.slice(-n);
}

/**
 * Setup streaming for live logs
 * @param {object} agent - Agent to stream
 * @returns {object} Streaming info
 */
function streamLogs(agent) {
  return {
    streaming: true,
    agentId: agent.id,
    status: agent.status,
    currentLogs: agent.logs || [],
  };
}

/**
 * Execute agents logs command
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

  // Handle streaming mode
  if (options.follow && agent.status === 'running') {
    return {
      success: true,
      ...streamLogs(agent),
      output: formatLogs(agent.logs || [], options),
    };
  }

  // Get logs
  let logs = agent.logs || [];

  // Apply tail
  if (options.tail) {
    logs = tailLogs(logs, options.tail);
  }

  // Format output
  const output = formatLogs(logs, {
    timestamps: options.timestamps !== false,
    color: options.color,
  });

  return {
    success: true,
    agent: {
      id: agent.id,
      status: agent.status,
    },
    logCount: logs.length,
    output,
  };
}

module.exports = {
  execute,
  formatLogLine,
  formatLogs,
  streamLogs,
  tailLogs,
};
