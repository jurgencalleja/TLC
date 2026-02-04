/**
 * Orchestration Integration
 * Integrate orchestration with existing TLC commands
 */

/**
 * Create agent data for a command
 * @param {string} command - Command name
 * @param {object} options - Agent options
 * @returns {object} Agent data
 */
function createAgentForCommand(command, options = {}) {
  return {
    command,
    model: options.model || 'default',
    status: 'queued',
    startTime: new Date(),
    tokens: { input: 0, output: 0 },
    cost: 0,
  };
}

/**
 * Track command cost
 * @param {object} tracker - Cost tracker
 * @param {string} command - Command name
 * @param {number} amount - Cost amount
 */
function trackCommandCost(tracker, command, amount) {
  if (tracker && tracker.track) {
    tracker.track({
      command,
      amount,
      timestamp: new Date(),
    });
  }
}

/**
 * Apply quality gate to output
 * @param {object} gate - Quality gate
 * @param {object} output - Command output
 * @returns {Promise<object>} Quality result
 */
async function applyQualityGate(gate, output) {
  if (!gate || !gate.evaluate) {
    return { pass: true, score: 100 };
  }
  return gate.evaluate(output);
}

/**
 * Wrap function with orchestration tracking
 * @param {Function} fn - Function to wrap
 * @param {object} options - Wrap options
 * @returns {Function} Wrapped function
 */
function wrapWithOrchestration(fn, options = {}) {
  return async (context = {}) => {
    const startTime = Date.now();

    try {
      const result = await fn(context);

      if (options.onComplete) {
        options.onComplete({
          duration: Date.now() - startTime,
          result,
        });
      }

      return result;
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  };
}

/**
 * Orchestration Integration class
 */
class OrchestrationIntegration {
  constructor(options = {}) {
    this.registry = options.registry;
    this.costTracker = options.costTracker;
    this.qualityGate = options.qualityGate;
    this.fallbackOnError = options.fallbackOnError || false;
  }

  /**
   * Wrap a command with orchestration
   * @param {string} commandName - Command name
   * @param {Function} commandFn - Command function
   * @param {object} options - Command options
   * @returns {Promise<object>} Command result
   */
  async wrapCommand(commandName, commandFn, options = {}) {
    let agent = null;

    // Create agent in registry
    try {
      if (this.registry) {
        agent = this.registry.createAgent(
          createAgentForCommand(commandName, options)
        );
        this.registry.updateAgent(agent.id, { status: 'running' });
      }
    } catch (error) {
      if (!this.fallbackOnError) throw error;
    }

    try {
      // Execute command
      const result = await commandFn({
        ...options,
        agentId: agent?.id,
      });

      // Track cost
      if (result.cost && this.costTracker) {
        trackCommandCost(this.costTracker, commandName, result.cost);
      }

      // Apply quality gate
      if (options.useQualityGate && this.qualityGate) {
        const qualityResult = await applyQualityGate(this.qualityGate, result);
        if (agent) {
          this.registry.updateAgent(agent.id, {
            quality: { score: result.quality || qualityResult.score },
            qualityScore: result.quality || qualityResult.score,
          });
        }
      } else if (agent && result.quality !== undefined) {
        this.registry.updateAgent(agent.id, {
          quality: { score: result.quality },
          qualityScore: result.quality,
        });
      }

      // Update agent status
      if (agent) {
        this.registry.updateAgent(agent.id, {
          status: 'completed',
          endTime: new Date(),
          cost: result.cost || 0,
        });
      }

      return result;
    } catch (error) {
      if (agent) {
        this.registry.updateAgent(agent.id, {
          status: 'failed',
          endTime: new Date(),
          error: { message: error.message },
        });
      }
      throw error;
    }
  }

  /**
   * Apply consensus from multi-model results
   * @param {Array} results - Results from multiple models
   * @returns {object} Consensus result
   */
  applyConsensus(results) {
    if (!results || results.length === 0) {
      return { score: 0, issues: [] };
    }

    // Average score
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;

    // Find common issues
    const issueCounts = {};
    for (const result of results) {
      for (const issue of result.issues || []) {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      }
    }

    // Issues mentioned by majority
    const threshold = Math.ceil(results.length / 2);
    const commonIssues = Object.entries(issueCounts)
      .filter(([, count]) => count >= threshold)
      .map(([issue]) => issue);

    return {
      score: avgScore,
      issues: commonIssues,
      modelCount: results.length,
    };
  }
}

module.exports = {
  OrchestrationIntegration,
  wrapWithOrchestration,
  createAgentForCommand,
  trackCommandCost,
  applyQualityGate,
};
