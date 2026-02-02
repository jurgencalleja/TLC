/**
 * Agent Registry Command
 * CLI for agent registry operations
 */

import registry from './agent-registry.js';
import { transitionTo, STATES } from './agent-state.js';
import { cleanupOrphans, getCleanupStats } from './agent-cleanup.js';
import { triggerHook } from './agent-hooks.js';

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed arguments
 */
export function parseArgs(args) {
  if (!args || args.length === 0) {
    return { command: 'help', args: [], flags: {} };
  }

  const command = args[0];
  const flags = {};
  const positionalArgs = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      // Check if next arg is a value or another flag
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[flagName] = args[i + 1];
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      positionalArgs.push(arg);
    }
  }

  return { command, args: positionalArgs, flags };
}

/**
 * Execute a registry command
 * @param {string[]} args - Command arguments
 * @returns {Promise<Object>} Command result
 */
export async function execute(args) {
  const parsed = parseArgs(args);

  switch (parsed.command) {
    case 'list':
      return executeList(parsed);
    case 'get':
      return executeGet(parsed);
    case 'cancel':
      return executeCancel(parsed);
    case 'cleanup':
      return executeCleanup(parsed);
    case 'help':
      return executeHelp();
    default:
      return {
        success: false,
        error: `Unknown command: ${parsed.command}. Use 'help' to see available commands.`,
      };
  }
}

/**
 * Execute list command
 */
function executeList(parsed) {
  const filters = {};

  if (parsed.flags.status) {
    filters.status = parsed.flags.status;
  }
  if (parsed.flags.model) {
    filters.model = parsed.flags.model;
  }

  const agents = registry.listAgents(Object.keys(filters).length > 0 ? filters : undefined);

  return {
    success: true,
    data: agents,
    formatted: formatAgentList(agents),
  };
}

/**
 * Execute get command
 */
function executeGet(parsed) {
  const agentId = parsed.args[0];

  if (!agentId) {
    return {
      success: false,
      error: 'Agent ID required. Usage: tlc agents get <id>',
    };
  }

  const agent = registry.getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent '${agentId}' not found`,
    };
  }

  return {
    success: true,
    data: agent,
    formatted: formatAgentDetails(agent),
  };
}

/**
 * Execute cancel command
 */
async function executeCancel(parsed) {
  const agentId = parsed.args[0];

  if (!agentId) {
    return {
      success: false,
      error: 'Agent ID required. Usage: tlc agents cancel <id>',
    };
  }

  const agent = registry.getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent '${agentId}' not found`,
    };
  }

  // Check if agent can be cancelled
  const cancellableStates = [STATES.PENDING, STATES.RUNNING];
  if (!cancellableStates.includes(agent.state.current)) {
    return {
      success: false,
      error: `Cannot cancel agent in '${agent.state.current}' state. Only pending or running agents can be cancelled.`,
    };
  }

  // Transition to cancelled
  transitionTo(agent.state, STATES.CANCELLED, { reason: 'User requested cancellation' });

  // Trigger cancel hook
  await triggerHook('onCancel', agent);

  return {
    success: true,
    message: `Agent '${agentId}' cancelled successfully`,
    data: agent,
  };
}

/**
 * Execute cleanup command
 */
async function executeCleanup(parsed) {
  const result = await cleanupOrphans();
  const stats = getCleanupStats();

  return {
    success: true,
    data: {
      cleaned: result.cleaned,
      errors: result.errors,
      stats,
    },
    formatted: formatCleanupResult(result, stats),
  };
}

/**
 * Execute help command
 */
function executeHelp() {
  const message = `
Usage: tlc agents <command> [options]

Commands:
  list                  List all agents
    --status <status>   Filter by status (pending, running, completed, failed, cancelled)
    --model <model>     Filter by model
    --json              Output as JSON

  get <id>              Show agent details
    --json              Output as JSON

  cancel <id>           Cancel a running agent

  cleanup               Run cleanup for orphaned agents

  help                  Show this help message

Examples:
  tlc agents list
  tlc agents list --status running
  tlc agents list --model claude --status completed
  tlc agents get agent-abc123
  tlc agents cancel agent-abc123
  tlc agents cleanup
`.trim();

  return {
    success: true,
    message,
  };
}

/**
 * Format agent list as table
 * @param {Object[]} agents - List of agents
 * @returns {string} Formatted table
 */
export function formatAgentList(agents) {
  if (!agents || agents.length === 0) {
    return 'No agents found.';
  }

  const header = '| ID | Name | Status | Model | Created |';
  const separator = '|------|------|--------|-------|---------|';

  const rows = agents.map(agent => {
    const id = truncate(agent.id, 15);
    const name = truncate(agent.name || '-', 20);
    const status = agent.state?.current || '-';
    const model = agent.metadata?.model || '-';
    const created = agent.createdAt ? formatDate(agent.createdAt) : '-';

    return `| ${id} | ${name} | ${status} | ${model} | ${created} |`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Format agent details
 * @param {Object} agent - Agent object
 * @returns {string} Formatted details
 */
export function formatAgentDetails(agent) {
  const lines = [
    `Agent: ${agent.id}`,
    `Name: ${agent.name || '-'}`,
    `Status: ${agent.state?.current || '-'}`,
    `Model: ${agent.metadata?.model || '-'}`,
    `Created: ${agent.createdAt || '-'}`,
    '',
  ];

  // Add token info if available
  if (agent.metadata?.tokens) {
    lines.push('Tokens:');
    lines.push(`  Input: ${agent.metadata.tokens.input || 0}`);
    lines.push(`  Output: ${agent.metadata.tokens.output || 0}`);
    lines.push(`  Total: ${(agent.metadata.tokens.input || 0) + (agent.metadata.tokens.output || 0)}`);
    lines.push('');
  }

  // Add cost if available
  if (agent.metadata?.cost !== undefined) {
    lines.push(`Cost: $${agent.metadata.cost.toFixed(4)}`);
    lines.push('');
  }

  // Add state history if available
  if (agent.state?.history && agent.state.history.length > 0) {
    lines.push('State History:');
    agent.state.history.forEach(entry => {
      const time = entry.timestamp ? formatDate(entry.timestamp) : '-';
      lines.push(`  ${time}: ${entry.state}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format cleanup result
 */
function formatCleanupResult(result, stats) {
  const lines = [
    'Cleanup Results:',
    `  Cleaned this run: ${result.cleaned.length}`,
    `  Errors: ${result.errors.length}`,
    '',
    'Overall Stats:',
    `  Total cleaned: ${stats.totalCleaned}`,
    `  Cleanup runs: ${stats.cleanupRuns}`,
    `  Last cleanup: ${stats.lastCleanupAt ? formatDate(stats.lastCleanupAt) : 'Never'}`,
  ];

  if (result.cleaned.length > 0) {
    lines.push('');
    lines.push('Cleaned agents:');
    result.cleaned.forEach(id => lines.push(`  - ${id}`));
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    result.errors.forEach(err => lines.push(`  - ${err.id}: ${err.error}`));
  }

  return lines.join('\n');
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLength) {
  if (!str) return '-';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return dateStr;
  }
}

export default { execute, parseArgs, formatAgentList, formatAgentDetails };
