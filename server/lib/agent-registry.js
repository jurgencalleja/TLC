/**
 * Agent Registry - Manages registered agents in the multi-agent system
 *
 * Provides registration, lookup, and lifecycle management for agents.
 * Uses singleton pattern for global access across the application.
 */

let singletonInstance = null;

/**
 * Generate a unique ID for agents
 * @returns {string} Unique identifier
 */
function generateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `agent-${timestamp}-${randomPart}`;
}

/**
 * AgentRegistry class - manages agent registration and lookup
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Register a new agent with metadata
   * @param {Object} agentData - Agent configuration
   * @param {string} agentData.name - Agent name
   * @param {string} agentData.model - Model identifier (e.g., 'claude-3')
   * @param {string} agentData.type - Agent type (e.g., 'worker', 'orchestrator')
   * @param {string} [agentData.status='idle'] - Initial status
   * @returns {string} Generated agent ID
   */
  registerAgent(agentData) {
    const id = generateId();
    const agent = {
      id,
      name: agentData.name,
      model: agentData.model,
      type: agentData.type,
      status: agentData.status || 'idle',
      registeredAt: Date.now(),
      ...agentData,
    };

    // Ensure id is set correctly after spread
    agent.id = id;

    this.agents.set(id, agent);
    return id;
  }

  /**
   * List all agents, optionally filtered
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.status] - Filter by status
   * @param {string} [filters.model] - Filter by model
   * @param {string} [filters.type] - Filter by type
   * @returns {Array} Array of matching agents
   */
  listAgents(filters = {}) {
    let agents = Array.from(this.agents.values());

    if (filters.status) {
      agents = agents.filter(a => a.status === filters.status);
    }

    if (filters.model) {
      agents = agents.filter(a => a.model === filters.model);
    }

    if (filters.type) {
      agents = agents.filter(a => a.type === filters.type);
    }

    return agents;
  }

  /**
   * Get a specific agent by ID
   * @param {string} id - Agent ID
   * @returns {Object|null} Agent object or null if not found
   */
  getAgent(id) {
    return this.agents.get(id) || null;
  }

  /**
   * Remove an agent from the registry
   * @param {string} id - Agent ID
   * @returns {boolean} True if removed, false if not found
   */
  removeAgent(id) {
    return this.agents.delete(id);
  }

  /**
   * Update an agent's properties
   * @param {string} id - Agent ID
   * @param {Object} updates - Properties to update
   * @returns {boolean} True if updated, false if not found
   */
  updateAgent(id, updates) {
    const agent = this.agents.get(id);
    if (!agent) {
      return false;
    }

    Object.assign(agent, updates);
    return true;
  }

  /**
   * Get count of registered agents
   * @returns {number} Number of agents
   */
  count() {
    return this.agents.size;
  }

  /**
   * Clear all agents from registry
   */
  clear() {
    this.agents.clear();
  }
}

/**
 * Get the singleton registry instance
 * @returns {AgentRegistry} Global registry instance
 */
function getAgentRegistry() {
  if (!singletonInstance) {
    singletonInstance = new AgentRegistry();
  }
  return singletonInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
function resetRegistry() {
  singletonInstance = null;
}

module.exports = {
  AgentRegistry,
  getAgentRegistry,
  resetRegistry,
};
