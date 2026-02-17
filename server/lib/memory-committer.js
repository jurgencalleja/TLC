/**
 * Memory Committer - Auto-commit team memory with conventional commits
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Detect uncommitted memory files in team directory
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<string[]>} List of uncommitted file paths
 */
async function detectUncommittedMemory(projectRoot) {
  const teamDir = path.join(projectRoot, '.tlc', 'memory', 'team');

  try {
    await fs.access(teamDir);
  } catch {
    return [];
  }

  // Try git status first — only return modified/untracked files
  try {
    const teamRelative = path.relative(projectRoot, teamDir);
    const { stdout } = await execAsync(
      `git status --porcelain -- "${teamRelative}"`,
      { cwd: projectRoot }
    );
    if (stdout.trim().length === 0) return [];

    return stdout.trim().split('\n')
      .map(line => line.slice(3).trim()) // strip status prefix (e.g. "?? ", " M ")
      .filter(f => f.endsWith('.json') || f.endsWith('.md'))
      .filter(f => !f.endsWith('conventions.md'));
  } catch {
    // Not a git repo or git not available — fall back to walkDir
  }

  // Fallback: return all files (non-git directory)
  const files = [];

  async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.name.endsWith('.json') || entry.name.endsWith('.md')) {
        if (entry.name === 'conventions.md') continue;
        const relativePath = path.relative(projectRoot, fullPath);
        files.push(relativePath);
      }
    }
  }

  await walkDir(teamDir);

  return files;
}

/**
 * Generate conventional commit message for memory files
 * @param {string[]} files - List of file paths
 * @returns {string} Commit message
 */
function generateCommitMessage(files) {
  if (!files || files.length === 0) return '';

  const types = new Set();

  for (const file of files) {
    if (file.includes('decisions')) {
      types.add('decision');
    } else if (file.includes('gotchas')) {
      types.add('gotcha');
    }
  }

  const typeList = Array.from(types);
  const typeStr = typeList.length === 1
    ? typeList[0]
    : typeList.slice(0, -1).join(', ') + ' and ' + typeList[typeList.length - 1];

  return `docs(memory): add ${typeStr}${typeList.length > 1 || files.length > 1 ? 's' : ''}`;
}

/**
 * Commit team memory files
 * @param {string} projectRoot - Project root directory
 * @param {Object} options - Options
 * @param {boolean} options.dryRun - If true, don't actually commit
 * @returns {Promise<Object>} Commit result
 */
async function commitTeamMemory(projectRoot, options = {}) {
  const { dryRun = false } = options;

  const files = await detectUncommittedMemory(projectRoot);

  if (files.length === 0) {
    return {
      success: false,
      reason: 'nothing to commit',
      files: [],
    };
  }

  const message = generateCommitMessage(files);

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      committed: false,
      files,
      message,
    };
  }

  try {
    // Stage memory files
    for (const file of files) {
      await execAsync(`git add "${file}"`, { cwd: projectRoot });
    }

    // Commit
    await execAsync(`git commit -m "${message}"`, { cwd: projectRoot });

    return {
      success: true,
      committed: true,
      files,
      message,
    };
  } catch (err) {
    return {
      success: false,
      reason: err.message,
      files,
      message,
    };
  }
}

module.exports = {
  detectUncommittedMemory,
  generateCommitMessage,
  commitTeamMemory,
};
