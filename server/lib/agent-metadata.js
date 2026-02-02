/**
 * Agent Metadata - Tracks execution metadata for agent tasks
 *
 * Provides immutable tracking of:
 * - Model used
 * - Token counts (input/output)
 * - Cost calculation
 * - Duration
 * - Task type and parameters
 */

/**
 * Model pricing per million tokens (USD)
 * Updated as of early 2026
 */
const MODEL_PRICING = {
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3, output: 15 },
  'claude-3.5-haiku': { input: 0.25, output: 1.25 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'default': { input: 1, output: 3 },
};

/**
 * AgentMetadata class - tracks metadata for a single agent task execution
 */
class AgentMetadata {
  /**
   * Create a new AgentMetadata instance
   * @param {Object} config - Configuration
   * @param {string} config.model - Model identifier
   * @param {string} config.taskType - Type of task being executed
   * @param {Object} [config.parameters] - Task parameters
   */
  constructor(config) {
    if (!config.model) {
      throw new Error('model is required');
    }
    if (!config.taskType) {
      throw new Error('taskType is required');
    }

    this.model = config.model;
    this.taskType = config.taskType;
    this.parameters = config.parameters || {};
    this.inputTokens = config.inputTokens || 0;
    this.outputTokens = config.outputTokens || 0;
    this.totalTokens = config.totalTokens || 0;
    this.cost = config.cost || 0;
    this.duration = config.duration || null;
    this.startedAt = config.startedAt || Date.now();
    this.completedAt = config.completedAt || null;
    this.frozen = config.frozen || false;
  }

  /**
   * Update token counts
   * @param {Object} tokens - Token counts to add
   * @param {number} [tokens.input=0] - Input tokens to add
   * @param {number} [tokens.output=0] - Output tokens to add
   * @returns {AgentMetadata} This instance for chaining
   * @throws {Error} If metadata is frozen
   */
  updateTokens({ input = 0, output = 0 }) {
    if (this.frozen) {
      throw new Error('Cannot update frozen metadata');
    }

    this.inputTokens += input;
    this.outputTokens += output;
    this.totalTokens = this.inputTokens + this.outputTokens;

    return this;
  }

  /**
   * Calculate cost based on model pricing
   * @returns {number} Total cost in USD
   */
  calculateCost() {
    const pricing = MODEL_PRICING[this.model] || MODEL_PRICING['default'];

    const inputCost = (this.inputTokens * pricing.input) / 1_000_000;
    const outputCost = (this.outputTokens * pricing.output) / 1_000_000;

    this.cost = inputCost + outputCost;
    return this.cost;
  }

  /**
   * Set duration based on elapsed time since start
   * @returns {AgentMetadata} This instance for chaining
   * @throws {Error} If metadata is frozen
   */
  setDuration() {
    if (this.frozen) {
      throw new Error('Cannot update frozen metadata');
    }

    this.completedAt = Date.now();
    this.duration = this.completedAt - this.startedAt;

    return this;
  }

  /**
   * Freeze the metadata, preventing further updates
   * Automatically calculates final cost
   * @returns {AgentMetadata} This instance for chaining
   */
  freeze() {
    this.calculateCost();
    this.frozen = true;
    return this;
  }

  /**
   * Serialize to plain JSON object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      model: this.model,
      taskType: this.taskType,
      parameters: this.parameters,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.totalTokens,
      cost: this.cost,
      duration: this.duration,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      frozen: this.frozen,
    };
  }

  /**
   * Restore from JSON
   * @param {Object} json - Serialized metadata
   * @returns {AgentMetadata} Restored instance
   */
  static fromJSON(json) {
    return new AgentMetadata({
      model: json.model,
      taskType: json.taskType,
      parameters: json.parameters,
      inputTokens: json.inputTokens,
      outputTokens: json.outputTokens,
      totalTokens: json.totalTokens,
      cost: json.cost,
      duration: json.duration,
      startedAt: json.startedAt,
      completedAt: json.completedAt,
      frozen: json.frozen,
    });
  }
}

/**
 * Create a new metadata instance
 * @param {Object} config - Configuration
 * @param {string} config.model - Model identifier
 * @param {string} config.taskType - Type of task being executed
 * @param {Object} [config.parameters] - Task parameters
 * @returns {AgentMetadata} New metadata instance
 */
function createMetadata(config) {
  return new AgentMetadata(config);
}

module.exports = {
  AgentMetadata,
  createMetadata,
  MODEL_PRICING,
};
