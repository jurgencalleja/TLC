/**
 * Agent Cleanup - Handles timeouts and orphaned agents
 *
 * Detects stuck agents (running state but no activity for timeout period)
 * and transitions them to cancelled state.
 * Supports periodic cleanup via setInterval with configurable interval.
 */

import { getAgentRegistry } from './agent-registry.js';
import { getAgentHooks } from './agent-hooks.js';
import { STATES } from './agent-state.js';

/**
 * Default timeout for detecting orphaned agents (30 minutes)
 */
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

/**
 * Default interval for periodic cleanup (5 minutes)
 */
const DEFAULT_INTERVAL = 5 * 60 * 1000;

/**
 * Internal state for cleanup scheduling and stats
 */
let cleanupIntervalId = null;
let cleanupStats = {
  totalCleaned: 0,
  cleanupRuns: 0,
  lastCleanupAt: null,
};

/**
 * Find agents that are orphaned (stuck in running state without activity)
 * @param {Object} [options] - Options
 * @param {number} [options.timeout] - Timeout in ms (default: 30 minutes)
 * @returns {Array} Array of orphaned agent objects
 */
function findOrphanedAgents(options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const registry = getAgentRegistry();
  const now = Date.now();

  // Get all running agents
  const runningAgents = registry.listAgents({ status: STATES.RUNNING });

  // Filter to those with no activity for longer than timeout
  const orphans = runningAgents.filter(agent => {
    const lastActivity = agent.lastActivity || agent.registeredAt;
    const inactiveTime = now - lastActivity;

    // Check if agent has a custom grace period
    if (agent.gracePeriod) {
      return inactiveTime > agent.gracePeriod;
    }

    return inactiveTime > timeout;
  });

  return orphans;
}

/**
 * Clean up orphaned agents by transitioning them to cancelled state
 * @param {Object} [options] - Options
 * @param {number} [options.timeout] - Timeout for finding orphans (default: 30 minutes)
 * @returns {Promise<Object>} Result with cleaned agents and any errors
 */
async function cleanupOrphans(options = {}) {
  const orphans = findOrphanedAgents(options);
  const registry = getAgentRegistry();
  const hooks = getAgentHooks();

  const cleaned = [];
  const errors = [];

  for (const agent of orphans) {
    try {
      // Update agent status to cancelled
      registry.updateAgent(agent.id, {
        status: STATES.CANCELLED,
        cancelledAt: Date.now(),
        cancelReason: 'orphaned',
      });

      // Trigger onCancel hook
      try {
        await hooks.triggerHook('onCancel', {
          agentId: agent.id,
          agent: agent,
          reason: 'orphaned',
          timeout: options.timeout || DEFAULT_TIMEOUT,
        });
      } catch (hookError) {
        // Hook errors are logged but don't stop cleanup
        errors.push({ agentId: agent.id, error: hookError.message, type: 'hook' });
      }

      cleaned.push(agent);

      // Log cleanup action
      console.log(`[agent-cleanup] Cleaned orphaned agent: ${agent.id} (${agent.name})`);
    } catch (err) {
      errors.push({ agentId: agent.id, error: err.message, type: 'cleanup' });
    }
  }

  // Update stats
  cleanupStats.totalCleaned += cleaned.length;
  cleanupStats.cleanupRuns += 1;
  cleanupStats.lastCleanupAt = Date.now();

  return { cleaned, errors };
}

/**
 * Schedule periodic cleanup
 * @param {Object} [options] - Options
 * @param {number} [options.interval] - Interval in ms (default: 5 minutes)
 * @param {number} [options.timeout] - Timeout for finding orphans (default: 30 minutes)
 */
function scheduleCleanup(options = {}) {
  const interval = options.interval || DEFAULT_INTERVAL;

  // Stop any existing schedule
  stopCleanup();

  // Schedule periodic cleanup
  cleanupIntervalId = setInterval(async () => {
    try {
      await cleanupOrphans(options);
    } catch (err) {
      console.error('[agent-cleanup] Error during scheduled cleanup:', err);
    }
  }, interval);
}

/**
 * Stop the scheduled cleanup
 */
function stopCleanup() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Get cleanup statistics
 * @returns {Object} Stats including totalCleaned, cleanupRuns, lastCleanupAt
 */
function getCleanupStats() {
  return { ...cleanupStats };
}

/**
 * Reset cleanup state (for testing)
 */
function resetCleanup() {
  stopCleanup();
  cleanupStats = {
    totalCleaned: 0,
    cleanupRuns: 0,
    lastCleanupAt: null,
  };
}

export {
  findOrphanedAgents,
  cleanupOrphans,
  scheduleCleanup,
  stopCleanup,
  getCleanupStats,
  resetCleanup,
  DEFAULT_TIMEOUT,
  DEFAULT_INTERVAL,
};
