/**
 * Agents Cancel Command
 * Cancel running agents
 */

/**
 * Check if confirmation is required
 * @param {object} options - Command options
 * @returns {boolean} True if confirmation needed
 */
function requiresConfirmation(options) {
  return !options.force;
}

/**
 * Cancel a single agent
 * @param {object} agent - Agent to cancel
 * @param {Function} updateAgent - Function to update agent
 * @returns {object} Cancelled agent
 */
function cancelAgent(agent, updateAgent) {
  return updateAgent(agent.id, {
    status: 'cancelled',
    endTime: new Date(),
  });
}

/**
 * Cancel all running agents
 * @param {Array} agents - All agents
 * @param {Function} updateAgent - Function to update agent
 * @returns {number} Count of cancelled agents
 */
function cancelAllRunning(agents, updateAgent) {
  const running = agents.filter(a => a.status === 'running' || a.status === 'queued');
  for (const agent of running) {
    cancelAgent(agent, updateAgent);
  }
  return running.length;
}

/**
 * Check if agent can be cancelled
 * @param {object} agent - Agent to check
 * @returns {object} Result with canCancel and reason
 */
function canCancel(agent) {
  if (!agent) {
    return { canCancel: false, reason: 'Agent not found' };
  }

  if (agent.status === 'cancelled') {
    return { canCancel: false, reason: 'Agent is already cancelled' };
  }

  if (agent.status === 'completed') {
    return { canCancel: false, reason: 'Agent is already completed' };
  }

  if (agent.status === 'failed') {
    return { canCancel: false, reason: 'Agent has already failed' };
  }

  return { canCancel: true };
}

/**
 * Execute agents cancel command
 * @param {object} context - Execution context
 * @returns {Promise<object>} Command result
 */
async function execute(context) {
  const { registry, agentId, options = {}, onCleanup } = context;

  // Handle --all flag
  if (options.all) {
    if (requiresConfirmation(options)) {
      const running = registry.listAgents().filter(a =>
        a.status === 'running' || a.status === 'queued'
      );
      return {
        success: false,
        needsConfirmation: true,
        message: `Cancel ${running.length} running agents?`,
        count: running.length,
      };
    }

    const agents = registry.listAgents();
    const count = cancelAllRunning(agents, registry.updateAgent.bind(registry));

    if (onCleanup) onCleanup();

    return {
      success: true,
      cancelled: count,
      message: `Cancelled ${count} agents`,
    };
  }

  // Single agent cancel
  const agent = registry.getAgent(agentId);
  const { canCancel: allowed, reason } = canCancel(agent);

  if (!allowed) {
    return {
      success: false,
      error: reason,
    };
  }

  if (requiresConfirmation(options)) {
    return {
      success: false,
      needsConfirmation: true,
      message: `Cancel agent ${agentId}?`,
      agent,
    };
  }

  cancelAgent(agent, registry.updateAgent.bind(registry));

  if (onCleanup) onCleanup();

  return {
    success: true,
    cancelled: 1,
    message: `Cancelled agent ${agentId}`,
    agent,
  };
}

module.exports = {
  execute,
  cancelAgent,
  cancelAllRunning,
  requiresConfirmation,
  canCancel,
};
