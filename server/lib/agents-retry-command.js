/**
 * Agents Retry Command
 * Retry failed agents
 */

/**
 * Check if agent can be retried
 * @param {object} agent - Agent to check
 * @returns {object} Result with canRetry and reason
 */
function canRetry(agent) {
  if (!agent) {
    return { canRetry: false, reason: 'Agent not found' };
  }

  if (agent.status === 'failed' || agent.status === 'cancelled') {
    return { canRetry: true };
  }

  return {
    canRetry: false,
    reason: `Cannot retry agent with status '${agent.status}'. Only failed or cancelled agents can be retried.`,
  };
}

/**
 * Get retry context from failed agent
 * @param {object} agent - Failed agent
 * @returns {string} Context string
 */
function getRetryContext(agent) {
  const parts = [];

  if (agent.error?.message) {
    parts.push(`Previous error: ${agent.error.message}`);
  }

  if (agent.retryCount) {
    parts.push(`Previous retries: ${agent.retryCount}`);
  }

  return parts.join('\n');
}

/**
 * Create retry agent from failed agent
 * @param {object} parent - Parent agent that failed
 * @param {object} options - Retry options
 * @returns {object} New agent data
 */
function createRetryAgent(parent, options = {}) {
  return {
    parentId: parent.id,
    model: options.model || parent.model,
    prompt: parent.prompt,
    status: 'queued',
    startTime: new Date(),
    tokens: { input: 0, output: 0 },
    cost: 0,
    retryCount: (parent.retryCount || 0) + 1,
    retryContext: getRetryContext(parent),
  };
}

/**
 * Execute agents retry command
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

  const { canRetry: allowed, reason } = canRetry(agent);

  if (!allowed) {
    return {
      success: false,
      error: reason,
    };
  }

  // Check budget
  if (registry.budget && registry.budget.remaining <= 0) {
    return {
      success: false,
      error: 'Budget exhausted. Cannot retry.',
    };
  }

  // Create new agent
  const retryData = createRetryAgent(agent, options);
  const newAgent = registry.createAgent(retryData);

  return {
    success: true,
    newAgentId: newAgent.id,
    parentId: agent.id,
    model: newAgent.model,
    message: `Created retry agent ${newAgent.id} (from ${agent.id})`,
  };
}

module.exports = {
  execute,
  createRetryAgent,
  canRetry,
  getRetryContext,
};
