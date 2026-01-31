/**
 * Memory Storage - Directory structure and initialization for TLC memory system
 */

const fs = require('fs');
const path = require('path');

const MEMORY_PATHS = {
  TEAM: '.tlc/memory/team',
  DECISIONS: '.tlc/memory/team/decisions',
  GOTCHAS: '.tlc/memory/team/gotchas',
  LOCAL: '.tlc/memory/.local',
  SESSIONS: '.tlc/memory/.local/sessions'
};

const GITIGNORE_ENTRY = '.tlc/memory/.local/';

const CONVENTIONS_TEMPLATE = `# Team Conventions

This file documents team-wide coding conventions captured from conversations.

## Code Style

<!-- Conventions will be added here automatically -->

## Naming

<!-- Naming conventions will be added here -->

## Architecture

<!-- Architectural decisions will be added here -->
`;

/**
 * Initialize the memory directory structure
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
async function initMemoryStructure(projectRoot) {
  // Create all directories
  const directories = [
    MEMORY_PATHS.DECISIONS,
    MEMORY_PATHS.GOTCHAS,
    MEMORY_PATHS.SESSIONS
  ];

  for (const dir of directories) {
    const fullPath = path.join(projectRoot, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  // Create conventions.md if it doesn't exist
  const conventionsPath = path.join(projectRoot, MEMORY_PATHS.TEAM, 'conventions.md');
  if (!fs.existsSync(conventionsPath)) {
    fs.writeFileSync(conventionsPath, CONVENTIONS_TEMPLATE, 'utf8');
  }

  // Create preferences.json if it doesn't exist
  const prefsPath = path.join(projectRoot, MEMORY_PATHS.LOCAL, 'preferences.json');
  if (!fs.existsSync(prefsPath)) {
    fs.writeFileSync(prefsPath, '{}', 'utf8');
  }

  // Update .gitignore
  await updateGitignore(projectRoot);
}

/**
 * Add memory .local to gitignore if not present
 * @param {string} projectRoot - The project root directory
 */
async function updateGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  // Check if entry already exists
  if (content.includes(GITIGNORE_ENTRY)) {
    return;
  }

  // Append entry
  const newContent = content.endsWith('\n') || content === ''
    ? content + GITIGNORE_ENTRY + '\n'
    : content + '\n' + GITIGNORE_ENTRY + '\n';

  fs.writeFileSync(gitignorePath, newContent, 'utf8');
}

/**
 * Check if memory structure exists
 * @param {string} projectRoot - The project root directory
 * @returns {boolean}
 */
function hasMemoryStructure(projectRoot) {
  const teamPath = path.join(projectRoot, MEMORY_PATHS.TEAM);
  const localPath = path.join(projectRoot, MEMORY_PATHS.LOCAL);
  return fs.existsSync(teamPath) && fs.existsSync(localPath);
}

/**
 * Get absolute path for a memory path constant
 * @param {string} projectRoot - The project root directory
 * @param {string} memoryPath - One of MEMORY_PATHS values
 * @returns {string}
 */
function getMemoryPath(projectRoot, memoryPath) {
  return path.join(projectRoot, memoryPath);
}

module.exports = {
  MEMORY_PATHS,
  initMemoryStructure,
  hasMemoryStructure,
  getMemoryPath
};
