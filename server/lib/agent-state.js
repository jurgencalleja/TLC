/**
 * Agent State Machine - Manages agent lifecycle states with validation
 *
 * States: pending -> running -> completed/failed/cancelled
 * Provides event callbacks, transition history, and elapsed time tracking.
 */

/**
 * Valid agent states
 */
const STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Valid state transitions map
 * Each key maps to an array of valid target states
 */
const VALID_TRANSITIONS = {
  [STATES.PENDING]: [STATES.RUNNING, STATES.CANCELLED],
  [STATES.RUNNING]: [STATES.COMPLETED, STATES.FAILED, STATES.CANCELLED],
  [STATES.COMPLETED]: [],
  [STATES.FAILED]: [],
  [STATES.CANCELLED]: [],
};

/**
 * Terminal states (no further transitions allowed)
 */
const TERMINAL_STATES = [STATES.COMPLETED, STATES.FAILED, STATES.CANCELLED];

/**
 * Generate a unique state ID
 * @returns {string} Unique identifier
 */
function generateStateId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `state-${timestamp}-${randomPart}`;
}

/**
 * AgentState class - manages state machine for an agent
 */
class AgentState {
  /**
   * Create a new AgentState
   * @param {Object} options - Configuration options
   * @param {string} [options.agentId] - Optional agent ID
   */
  constructor(options = {}) {
    this.agentId = options.agentId || generateStateId();
    this.currentState = STATES.PENDING;
    this.createdAt = Date.now();
    this.history = [];
    this.stateTimestamps = {
      [STATES.PENDING]: this.createdAt,
    };
    this.callbacks = [];
  }

  /**
   * Get the agent ID
   * @returns {string} Agent ID
   */
  getAgentId() {
    return this.agentId;
  }

  /**
   * Get the current state
   * @returns {string} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Check if a transition is valid
   * @param {string} from - Current state
   * @param {string} to - Target state
   * @returns {boolean} True if transition is valid
   */
  isValidTransition(from, to) {
    const validTargets = VALID_TRANSITIONS[from];
    return validTargets && validTargets.includes(to);
  }

  /**
   * Transition to a new state
   * @param {string} targetState - Target state
   * @param {Object} [metadata={}] - Optional metadata for the transition
   * @returns {Object} Result with success flag and optional error
   */
  transition(targetState, metadata = {}) {
    // Check if target state is valid
    if (!Object.values(STATES).includes(targetState)) {
      return {
        success: false,
        error: `Unknown state: ${targetState}`,
      };
    }

    // Check if transition is valid
    if (!this.isValidTransition(this.currentState, targetState)) {
      return {
        success: false,
        error: `Invalid transition from ${this.currentState} to ${targetState}`,
      };
    }

    const timestamp = Date.now();
    const from = this.currentState;
    const to = targetState;

    // Record transition in history
    const transitionRecord = {
      from,
      to,
      timestamp,
      metadata,
    };
    this.history.push(transitionRecord);

    // Update state timestamps
    this.stateTimestamps[to] = timestamp;
    if (!this.stateTimestamps[`${from}_end`]) {
      this.stateTimestamps[`${from}_end`] = timestamp;
    }

    // Update current state
    this.currentState = targetState;

    // Fire callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(transitionRecord);
      } catch (err) {
        // Silently handle callback errors to prevent breaking state machine
        console.error('Transition callback error:', err);
      }
    });

    return { success: true };
  }

  /**
   * Register a callback for state transitions
   * @param {Function} callback - Function called on each transition
   * @returns {Function} Unsubscribe function
   */
  onTransition(callback) {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get transition history
   * @returns {Array} Array of transition records
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get elapsed time
   * @param {string} [state] - Optional specific state to measure
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime(state) {
    const now = Date.now();

    // If no state specified, return total elapsed time
    if (!state) {
      return now - this.createdAt;
    }

    // If state was never entered, return 0
    if (!this.stateTimestamps[state]) {
      return 0;
    }

    const stateStart = this.stateTimestamps[state];
    const stateEnd = this.stateTimestamps[`${state}_end`];

    // If state has ended, return the duration
    if (stateEnd) {
      return stateEnd - stateStart;
    }

    // If still in this state, calculate from start to now
    if (this.currentState === state) {
      return now - stateStart;
    }

    // State was entered but we're no longer in it (shouldn't happen with proper tracking)
    return 0;
  }

  /**
   * Check if current state is terminal (no further transitions possible)
   * @returns {boolean} True if in terminal state
   */
  isTerminal() {
    return TERMINAL_STATES.includes(this.currentState);
  }
}

/**
 * Factory function to create a new AgentState
 * @param {Object} [options] - Configuration options
 * @param {string} [options.agentId] - Optional agent ID
 * @returns {AgentState} New AgentState instance
 */
function createAgentState(options = {}) {
  return new AgentState(options);
}

module.exports = {
  AgentState,
  createAgentState,
  STATES,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
};
