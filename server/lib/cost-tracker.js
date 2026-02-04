/**
 * Cost Tracker Module
 *
 * Real-time cost tracking per agent, session, and day
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a new cost tracker instance
 * @param {Object} options - Configuration options
 * @param {Object} options.fs - File system module (for testing)
 * @returns {Object} Cost tracker instance
 */
function createCostTracker(options = {}) {
  const fsModule = options.fs || fs;

  return {
    records: [],
    byAgent: {},
    bySession: {},
    byDay: {},
    byModel: {},
    byProvider: {},
    fs: fsModule,
  };
}

/**
 * Record a cost entry
 * @param {Object} tracker - Cost tracker instance
 * @param {Object} entry - Cost entry
 * @param {string} entry.agentId - Agent identifier
 * @param {string} entry.sessionId - Session identifier
 * @param {string} entry.model - Model name
 * @param {string} entry.provider - Provider name
 * @param {number} entry.cost - Cost in dollars
 * @param {number} [entry.inputTokens] - Input token count
 * @param {number} [entry.outputTokens] - Output token count
 * @param {string} [entry.timestamp] - ISO timestamp
 */
function recordCost(tracker, entry) {
  const timestamp = entry.timestamp || new Date().toISOString();
  const day = timestamp.split('T')[0];

  const record = {
    ...entry,
    timestamp,
    day,
  };

  tracker.records.push(record);

  // Aggregate by agent
  tracker.byAgent[entry.agentId] = (tracker.byAgent[entry.agentId] || 0) + entry.cost;

  // Aggregate by session
  tracker.bySession[entry.sessionId] = (tracker.bySession[entry.sessionId] || 0) + entry.cost;

  // Aggregate by day
  tracker.byDay[day] = (tracker.byDay[day] || 0) + entry.cost;

  // Aggregate by model
  tracker.byModel[entry.model] = (tracker.byModel[entry.model] || 0) + entry.cost;

  // Aggregate by provider
  tracker.byProvider[entry.provider] = (tracker.byProvider[entry.provider] || 0) + entry.cost;
}

/**
 * Get cost for a specific agent
 * @param {Object} tracker - Cost tracker instance
 * @param {string} agentId - Agent identifier
 * @returns {number} Total cost for agent
 */
function getAgentCost(tracker, agentId) {
  return tracker.byAgent[agentId] || 0;
}

/**
 * Get cost for a specific session
 * @param {Object} tracker - Cost tracker instance
 * @param {string} sessionId - Session identifier
 * @returns {number} Total cost for session
 */
function getSessionCost(tracker, sessionId) {
  return tracker.bySession[sessionId] || 0;
}

/**
 * Get cost for a specific day
 * @param {Object} tracker - Cost tracker instance
 * @param {string} day - Day in YYYY-MM-DD format
 * @returns {number} Total cost for day
 */
function getDailyCost(tracker, day) {
  return tracker.byDay[day] || 0;
}

/**
 * Get cost for current week
 * @param {Object} tracker - Cost tracker instance
 * @returns {number} Total cost for current week
 */
function getWeeklyCost(tracker) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  let total = 0;
  for (const [day, cost] of Object.entries(tracker.byDay)) {
    const dayDate = new Date(day);
    if (dayDate >= weekStart && dayDate <= now) {
      total += cost;
    }
  }

  return total;
}

/**
 * Get cost for current month
 * @param {Object} tracker - Cost tracker instance
 * @returns {number} Total cost for current month
 */
function getMonthlyCost(tracker) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let total = 0;
  for (const [day, cost] of Object.entries(tracker.byDay)) {
    const dayDate = new Date(day);
    if (dayDate >= monthStart && dayDate <= now) {
      total += cost;
    }
  }

  return total;
}

/**
 * Get costs grouped by model
 * @param {Object} tracker - Cost tracker instance
 * @returns {Object} Costs by model
 */
function getCostByModel(tracker) {
  return { ...tracker.byModel };
}

/**
 * Get costs grouped by provider
 * @param {Object} tracker - Cost tracker instance
 * @returns {Object} Costs by provider
 */
function getCostByProvider(tracker) {
  return { ...tracker.byProvider };
}

/**
 * Persist costs to disk
 * @param {Object} tracker - Cost tracker instance
 * @param {string} filePath - Path to save file
 */
function persistCosts(tracker, filePath) {
  const data = {
    records: tracker.records,
    savedAt: new Date().toISOString(),
  };

  tracker.fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load costs from disk
 * @param {string} filePath - Path to load from
 * @param {Object} options - Options including fs module
 * @returns {Object} Cost tracker instance with loaded data
 */
function loadCosts(filePath, options = {}) {
  const fsModule = options.fs || fs;
  const tracker = createCostTracker(options);

  if (!fsModule.existsSync(filePath)) {
    return tracker;
  }

  try {
    const data = JSON.parse(fsModule.readFileSync(filePath, 'utf-8'));

    if (data.records && Array.isArray(data.records)) {
      for (const record of data.records) {
        recordCost(tracker, record);
      }
    }
  } catch (err) {
    // Return empty tracker on error
  }

  return tracker;
}

module.exports = {
  createCostTracker,
  recordCost,
  getAgentCost,
  getSessionCost,
  getDailyCost,
  getWeeklyCost,
  getMonthlyCost,
  getCostByModel,
  getCostByProvider,
  persistCosts,
  loadCosts,
};
