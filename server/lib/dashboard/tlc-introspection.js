/**
 * TLC Introspection Module
 * Reads TLC project state (ROADMAP.md, PROJECT.md, .tlc.json)
 */
import { promises as defaultFs } from 'fs';
import path from 'path';

/**
 * Parse phases from ROADMAP.md content
 * @param {string} content - ROADMAP.md content
 * @returns {Array} Parsed phases
 */
export function parseRoadmap(content) {
  const phases = [];
  let currentMilestone = null;

  const lines = content.split('\n');

  for (const line of lines) {
    // Check for milestone
    const milestoneMatch = line.match(/^##\s+Milestone:\s*(.+)$/);
    if (milestoneMatch) {
      currentMilestone = milestoneMatch[1].trim();
      continue;
    }

    // Check for phase
    const phaseMatch = line.match(/^###\s+Phase\s+(\d+):\s*(.+?)\s*\[(x|>|\s*)\]/);
    if (phaseMatch) {
      const number = parseInt(phaseMatch[1], 10);
      const name = phaseMatch[2].trim();
      const marker = phaseMatch[3];

      let status;
      if (marker === 'x') {
        status = 'complete';
      } else if (marker === '>') {
        status = 'current';
      } else {
        status = 'pending';
      }

      phases.push({
        number,
        name,
        status,
        milestone: currentMilestone
      });
    }
  }

  return phases;
}

/**
 * Parse PROJECT.md content
 * @param {string} content - PROJECT.md content
 * @returns {Object} Parsed project info
 */
export function parseProjectMd(content) {
  if (!content || !content.trim()) {
    return { name: 'Untitled', description: '' };
  }

  const lines = content.split('\n');
  let name = 'Untitled';
  let description = '';

  // Extract name from first H1
  const nameMatch = content.match(/^#\s+(.+)$/m);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  // Extract description (content between first H1 and next heading)
  let foundName = false;
  let descLines = [];

  for (const line of lines) {
    if (line.match(/^#\s+/)) {
      if (foundName) break;
      foundName = true;
      continue;
    }
    if (foundName && line.match(/^##/)) {
      break;
    }
    if (foundName && line.trim()) {
      descLines.push(line);
    }
  }

  description = descLines.join('\n').trim();

  return { name, description };
}

/**
 * Parse .tlc.json config
 * @param {string} content - JSON string
 * @returns {Object} Parsed config
 */
export function parseTlcConfig(content) {
  try {
    return JSON.parse(content);
  } catch {
    return { project: 'unknown' };
  }
}

/**
 * Get complete project state
 * @param {Object} options - Options with fs and basePath
 * @returns {Promise<Object>} Project state
 */
export async function getProjectState(options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();

  let projectContent = '';
  let roadmapContent = '';
  let configContent = '';

  try {
    projectContent = await fs.readFile(path.join(basePath, 'PROJECT.md'), 'utf-8');
  } catch {
    projectContent = '';
  }

  try {
    roadmapContent = await fs.readFile(path.join(basePath, '.planning', 'ROADMAP.md'), 'utf-8');
  } catch {
    roadmapContent = '';
  }

  try {
    configContent = await fs.readFile(path.join(basePath, '.tlc.json'), 'utf-8');
  } catch {
    configContent = '';
  }

  return {
    project: parseProjectMd(projectContent),
    phases: parseRoadmap(roadmapContent),
    config: parseTlcConfig(configContent)
  };
}

/**
 * Get current phase from phases array
 * @param {Array} phases - Array of phases
 * @returns {Object|null} Current phase
 */
export function getCurrentPhase(phases) {
  // First look for explicitly current phase
  const current = phases.find(p => p.status === 'current');
  if (current) return current;

  // Otherwise return first pending phase
  const pending = phases.find(p => p.status === 'pending');
  return pending || null;
}

/**
 * Create TLC introspection instance
 * @param {Object} options - Options
 * @returns {Object} Introspection API
 */
export function createTlcIntrospection(options = {}) {
  const fs = options.fs || defaultFs;
  const basePath = options.basePath || process.cwd();

  let cachedState = null;

  return {
    async getState() {
      if (!cachedState) {
        cachedState = await getProjectState({ fs, basePath });
      }
      return cachedState;
    },

    async getPhases() {
      const state = await this.getState();
      return state.phases;
    },

    async getCurrentPhase() {
      const phases = await this.getPhases();
      return getCurrentPhase(phases);
    },

    invalidateCache() {
      cachedState = null;
    }
  };
}
