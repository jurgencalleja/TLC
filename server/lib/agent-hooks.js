/**
 * Agent Hooks - Lifecycle hooks for agent task execution
 *
 * Provides a hook system for the multi-agent task execution lifecycle.
 * Supports onStart, onComplete, onError, and onCancel hooks with
 * multiple async handlers per hook type.
 */

/**
 * Valid hook types for agent lifecycle
 */
const HOOK_TYPES = ['onStart', 'onComplete', 'onError', 'onCancel'];

let singletonInstance = null;

/**
 * AgentHooks class - manages lifecycle hooks for agent execution
 */
class AgentHooks {
  constructor() {
    this.handlers = new Map();
    // Initialize empty arrays for each hook type
    for (const type of HOOK_TYPES) {
      this.handlers.set(type, []);
    }
  }

  /**
   * Register a handler for a hook type
   * @param {string} hookType - One of: onStart, onComplete, onError, onCancel
   * @param {Function} handler - Handler function (can be async)
   * @returns {Function} Unregister function to remove the handler
   * @throws {Error} If hookType is invalid
   */
  registerHook(hookType, handler) {
    if (!HOOK_TYPES.includes(hookType)) {
      throw new Error(
        `Invalid hook type: ${hookType}. Valid types are: ${HOOK_TYPES.join(', ')}`
      );
    }

    const handlers = this.handlers.get(hookType);
    handlers.push(handler);

    // Return unregister function
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Trigger a hook, calling all registered handlers
   * @param {string} hookType - Hook type to trigger
   * @param {Object} context - Agent context passed to handlers
   * @returns {Promise<Array>} Array of results from all handlers
   */
  async triggerHook(hookType, context) {
    const handlers = this.handlers.get(hookType) || [];
    const results = [];

    // Execute handlers in order, awaiting each one
    for (const handler of handlers) {
      try {
        const result = await handler(context);
        results.push(result);
      } catch (error) {
        // Log error but continue to next handler
        results.push({ error: error.message });
      }
    }

    return results;
  }

  /**
   * Get all handlers for a hook type
   * @param {string} hookType - Hook type
   * @returns {Array<Function>} Array of handler functions
   */
  getHandlers(hookType) {
    return this.handlers.get(hookType) || [];
  }

  /**
   * Clear all handlers for a hook type, or all hooks if no type specified
   * @param {string} [hookType] - Optional hook type to clear
   */
  clearHooks(hookType) {
    if (hookType) {
      this.handlers.set(hookType, []);
    } else {
      // Clear all hooks
      for (const type of HOOK_TYPES) {
        this.handlers.set(type, []);
      }
    }
  }
}

/**
 * Get the singleton hooks instance
 * @returns {AgentHooks} Global hooks instance
 */
function getAgentHooks() {
  if (!singletonInstance) {
    singletonInstance = new AgentHooks();
  }
  return singletonInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
function resetHooks() {
  singletonInstance = null;
}

module.exports = {
  AgentHooks,
  getAgentHooks,
  resetHooks,
  HOOK_TYPES,
};
