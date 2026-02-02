/**
 * Agent Persistence - Save and restore agent state across sessions
 *
 * Provides file-based persistence for agent data in the .tlc/agents/ directory.
 * Uses atomic writes (write to temp file, then rename) to prevent corruption.
 */

const fs = require('fs');
const path = require('path');

/**
 * Default directory for storing agent files
 */
const AGENTS_DIR = '.tlc/agents';

/**
 * Default max age for cleanup (7 days in milliseconds)
 */
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the storage path for an agent
 * @param {string|null} projectRoot - Project root directory (uses TLC_PROJECT_ROOT env if null)
 * @param {string} [agentId] - Optional agent ID for specific file path
 * @returns {string} Full path to agent file or agents directory
 */
function getStoragePath(projectRoot, agentId) {
  const root = projectRoot || process.env.TLC_PROJECT_ROOT || process.cwd();
  const agentsDir = path.join(root, AGENTS_DIR);

  if (agentId) {
    return path.join(agentsDir, `${agentId}.json`);
  }

  return agentsDir;
}

/**
 * Ensure the agents directory exists
 * @param {string} projectRoot - Project root directory
 */
function ensureAgentsDir(projectRoot) {
  const agentsDir = getStoragePath(projectRoot);
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }
}

/**
 * Save agent data to file using atomic write
 * @param {string} projectRoot - Project root directory
 * @param {Object} agentData - Agent data to save
 * @param {string} agentData.id - Agent ID (required)
 * @param {string} agentData.state - Agent state
 * @param {Object} agentData.metadata - Agent metadata
 * @param {number} agentData.createdAt - Creation timestamp
 * @param {number} agentData.updatedAt - Last update timestamp
 * @returns {Promise<void>}
 * @throws {Error} If agent ID is missing
 */
async function saveAgent(projectRoot, agentData) {
  if (!agentData || !agentData.id) {
    throw new Error('Agent ID is required');
  }

  ensureAgentsDir(projectRoot);

  const filePath = getStoragePath(projectRoot, agentData.id);
  const tempPath = `${filePath}.tmp`;

  // Write to temp file first
  const jsonData = JSON.stringify(agentData, null, 2);
  fs.writeFileSync(tempPath, jsonData, 'utf8');

  // Atomic rename
  fs.renameSync(tempPath, filePath);
}

/**
 * Load agent data from file
 * @param {string} projectRoot - Project root directory
 * @param {string} agentId - Agent ID to load
 * @returns {Promise<Object|null>} Agent data or null if not found/corrupted
 */
async function loadAgent(projectRoot, agentId) {
  const filePath = getStoragePath(projectRoot, agentId);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content || content.trim() === '') {
      return null;
    }
    return JSON.parse(content);
  } catch (err) {
    // Handle corrupted files gracefully
    return null;
  }
}

/**
 * Load all saved agents
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Array>} Array of agent data objects
 */
async function loadAllAgents(projectRoot) {
  const agentsDir = getStoragePath(projectRoot);

  if (!fs.existsSync(agentsDir)) {
    return [];
  }

  const files = fs.readdirSync(agentsDir);
  const agents = [];

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const agentId = path.basename(file, '.json');
    const agent = await loadAgent(projectRoot, agentId);

    if (agent) {
      agents.push(agent);
    }
  }

  return agents;
}

/**
 * Delete an agent file
 * @param {string} projectRoot - Project root directory
 * @param {string} agentId - Agent ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteAgent(projectRoot, agentId) {
  const filePath = getStoragePath(projectRoot, agentId);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Clean up old agent files
 * @param {string} projectRoot - Project root directory
 * @param {number} [maxAgeMs] - Maximum age in milliseconds (default: 7 days)
 * @returns {Promise<number>} Number of agents cleaned up
 */
async function cleanupOldAgents(projectRoot, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const agents = await loadAllAgents(projectRoot);
  const now = Date.now();
  let cleaned = 0;

  for (const agent of agents) {
    // Skip running agents - they might still be active
    if (agent.state === 'running' || agent.state === 'pending') {
      continue;
    }

    // Check age based on updatedAt (or createdAt if updatedAt is missing)
    const agentTime = agent.updatedAt || agent.createdAt;
    const age = now - agentTime;

    if (age > maxAgeMs) {
      await deleteAgent(projectRoot, agent.id);
      cleaned++;
    }
  }

  return cleaned;
}

module.exports = {
  saveAgent,
  loadAgent,
  loadAllAgents,
  deleteAgent,
  getStoragePath,
  cleanupOldAgents,
  AGENTS_DIR,
  DEFAULT_MAX_AGE_MS,
};
