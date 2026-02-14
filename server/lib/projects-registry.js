/**
 * Projects Registry - Track repos in a workspace
 *
 * Provides a registry for managing multiple projects within a workspace.
 * Supports adding, removing, listing, and auto-detecting projects.
 *
 * @module projects-registry
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECTS_FILE = 'projects.json';

/** Directories to ignore when scanning for repos */
const IGNORE_DIRS = ['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage'];

/**
 * Validate a git URL (SSH or HTTPS format)
 * @param {string} url - The URL to validate
 * @throws {Error} If the URL is not a valid git URL
 */
function validateGitUrl(url) {
  // SSH format: git@host:user/repo.git
  const sshPattern = /^git@[\w.-]+:[\w./-]+$/;
  // HTTPS format: https://host/user/repo.git or https://host/user/repo
  const httpsPattern = /^https:\/\/[\w.-]+\/[\w./-]+$/;

  if (!sshPattern.test(url) && !httpsPattern.test(url)) {
    throw new Error(`Invalid git URL: "${url}". Must be SSH (git@host:user/repo.git) or HTTPS (https://host/user/repo.git)`);
  }
}

/**
 * Ensure a path is relative (strip leading /)
 * @param {string} localPath - The path to normalize
 * @returns {string} Relative path
 */
function ensureRelativePath(localPath) {
  return localPath.replace(/^\/+/, '');
}

/**
 * Try to extract git remote URL from a repo directory
 * Uses execSync first, falls back to parsing .git/config
 * @param {string} repoAbsPath - Absolute path to the repo
 * @returns {string} Git remote URL or empty string
 */
function extractGitRemoteUrl(repoAbsPath) {
  // Try execSync first
  try {
    const url = execSync('git remote get-url origin', {
      cwd: repoAbsPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (url) return url;
  } catch {
    // execSync failed, try parsing .git/config
  }

  // Fallback: parse .git/config
  try {
    const configPath = path.join(repoAbsPath, '.git', 'config');
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/\[remote "origin"\][^[]*url\s*=\s*(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // Can't read git config
  }

  return '';
}

/**
 * Check if a directory has TLC configured
 * @param {string} dirAbsPath - Absolute path to directory
 * @returns {boolean}
 */
function hasTlcConfig(dirAbsPath) {
  try {
    return fs.statSync(path.join(dirAbsPath, '.tlc.json')).isFile();
  } catch {
    return false;
  }
}

/**
 * Create a projects registry instance
 * @returns {Object} Registry with load, save, addProject, removeProject, listProjects, detectFromFilesystem methods
 */
function createProjectsRegistry() {
  /**
   * Load projects.json from a workspace root
   * @param {string} workspaceRoot - Absolute path to workspace
   * @returns {Promise<{version: number, projects: Array}>} Registry data
   */
  async function load(workspaceRoot) {
    const filePath = path.join(workspaceRoot, PROJECTS_FILE);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { version: 1, projects: [] };
    }
  }

  /**
   * Save registry data to projects.json atomically (write to temp, then rename)
   * @param {string} workspaceRoot - Absolute path to workspace
   * @param {Object} registryData - Registry data with version and projects
   * @returns {Promise<void>}
   */
  async function save(workspaceRoot, registryData) {
    if (!registryData || typeof registryData.version !== 'number') {
      throw new Error('Registry data must have a "version" field');
    }

    const filePath = path.join(workspaceRoot, PROJECTS_FILE);
    const tempPath = filePath + '.tmp.' + Date.now();

    const content = JSON.stringify(registryData, null, 2) + '\n';
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Add a project to the registry
   * @param {string} workspaceRoot - Absolute path to workspace
   * @param {Object} project - Project details
   * @param {string} project.name - Project name
   * @param {string} project.gitUrl - Git remote URL (SSH or HTTPS)
   * @param {string} project.localPath - Relative path within workspace
   * @param {string} project.branch - Default branch name
   * @returns {Promise<void>}
   */
  async function addProject(workspaceRoot, { name, gitUrl, localPath, branch }) {
    validateGitUrl(gitUrl);

    const registryData = await load(workspaceRoot);
    const existing = registryData.projects.find(p => p.name === name);
    if (existing) {
      throw new Error(`Project "${name}" already exists in registry`);
    }

    registryData.projects.push({
      name,
      gitUrl,
      localPath: ensureRelativePath(localPath),
      defaultBranch: branch || 'main',
      hasTlc: false,
      description: '',
    });

    await save(workspaceRoot, registryData);
  }

  /**
   * Remove a project from the registry by name
   * @param {string} workspaceRoot - Absolute path to workspace
   * @param {string} name - Project name to remove
   * @returns {Promise<void>}
   */
  async function removeProject(workspaceRoot, name) {
    const registryData = await load(workspaceRoot);
    registryData.projects = registryData.projects.filter(p => p.name !== name);
    await save(workspaceRoot, registryData);
  }

  /**
   * List all projects in the registry
   * @param {string} workspaceRoot - Absolute path to workspace
   * @returns {Promise<Array>} Array of project entries
   */
  async function listProjects(workspaceRoot) {
    const registryData = await load(workspaceRoot);
    return registryData.projects;
  }

  /**
   * Detect projects from filesystem by scanning for directories with .git/
   * @param {string} workspaceRoot - Absolute path to workspace
   * @returns {Promise<Array>} Array of detected project entries
   */
  async function detectFromFilesystem(workspaceRoot) {
    const detected = [];

    try {
      const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (IGNORE_DIRS.includes(entry.name)) continue;

        const dirAbsPath = path.join(workspaceRoot, entry.name);
        const gitDir = path.join(dirAbsPath, '.git');

        // Only include directories that have a .git/ subdirectory
        try {
          const stat = fs.statSync(gitDir);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }

        const gitUrl = extractGitRemoteUrl(dirAbsPath);

        detected.push({
          name: entry.name,
          gitUrl,
          localPath: entry.name,
          defaultBranch: 'main',
          hasTlc: hasTlcConfig(dirAbsPath),
          description: '',
        });
      }
    } catch {
      // Ignore scan errors
    }

    return detected;
  }

  return {
    load,
    save,
    addProject,
    removeProject,
    listProjects,
    detectFromFilesystem,
  };
}

module.exports = { createProjectsRegistry };
