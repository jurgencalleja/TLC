/**
 * Memory Init - Initialize memory system directories
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Directory structure for memory system
 */
const MEMORY_STRUCTURE = {
  team: ['decisions', 'gotchas'],
  local: ['preferences', 'sessions'],
};

/**
 * Initialize the memory system directories
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<{created: boolean, directories: string[]}>}
 */
async function initMemorySystem(projectRoot) {
  const memoryRoot = path.join(projectRoot, '.tlc', 'memory');
  const created = [];

  // Create team directories
  for (const subdir of MEMORY_STRUCTURE.team) {
    const dirPath = path.join(memoryRoot, 'team', subdir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      created.push(dirPath);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  // Create local directories
  for (const subdir of MEMORY_STRUCTURE.local) {
    const dirPath = path.join(memoryRoot, '.local', subdir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      created.push(dirPath);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  // Ensure .gitignore has .local entry
  const gitignorePath = path.join(memoryRoot, '.gitignore');
  let gitignoreContent = '';
  try {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (!gitignoreContent.includes('.local')) {
    const newContent = gitignoreContent
      ? gitignoreContent.trim() + '\n.local\n'
      : '.local\n';
    await fs.writeFile(gitignorePath, newContent, 'utf-8');
  }

  return {
    created: created.length > 0,
    directories: created,
  };
}

/**
 * Check if memory system is initialized
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<boolean>}
 */
async function isMemoryInitialized(projectRoot) {
  const memoryRoot = path.join(projectRoot, '.tlc', 'memory');

  // Check team directories
  for (const subdir of MEMORY_STRUCTURE.team) {
    const dirPath = path.join(memoryRoot, 'team', subdir);
    try {
      await fs.access(dirPath);
    } catch {
      return false;
    }
  }

  // Check local directories
  for (const subdir of MEMORY_STRUCTURE.local) {
    const dirPath = path.join(memoryRoot, '.local', subdir);
    try {
      await fs.access(dirPath);
    } catch {
      return false;
    }
  }

  return true;
}

module.exports = {
  initMemorySystem,
  isMemoryInitialized,
  MEMORY_STRUCTURE,
};
