/**
 * Workspace Watcher - Auto-detect and register new repos in a workspace
 *
 * Scans a workspace root directory for new git repositories, registers them
 * in the projects registry, and broadcasts WebSocket events on detection.
 * Also detects removed repos (directories deleted from disk but still in registry).
 *
 * Task 5 (Phase 72): Auto-Detect & Register New Repos
 */

import fs from 'fs';
import path from 'path';

/**
 * Extracts the git remote origin URL from a repo's .git/config file.
 * @param {string} repoPath - Absolute path to the repo directory
 * @returns {string|null} The remote origin URL or null if not found
 */
function extractGitRemoteUrl(repoPath) {
  const configPath = path.join(repoPath, '.git', 'config');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/\[remote\s+"origin"\][^[]*url\s*=\s*(.+)/);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // No config file or unreadable — return null
  }
  return null;
}

/**
 * Checks whether a directory contains a .git subdirectory.
 * @param {string} dirPath - Absolute path to the directory
 * @returns {boolean} True if a .git directory exists inside dirPath
 */
function isGitRepo(dirPath) {
  try {
    const gitDir = path.join(dirPath, '.git');
    const stat = fs.statSync(gitDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Creates a workspace watcher that scans for new and removed git repositories.
 *
 * @param {object} options - Configuration options
 * @param {object} options.registry - Projects registry with addProject/removeProject/listProjects
 * @param {Function} [options.broadcast] - Optional WebSocket broadcast function
 * @param {boolean} [options.enabled=true] - Whether the watcher is enabled
 * @param {number} [options.debounceMs=500] - Debounce interval in milliseconds (for future fs.watch)
 * @returns {object} Watcher with start(), stop(), and scan() methods
 */
export function createWorkspaceWatcher({ registry, broadcast, enabled = true, debounceMs = 500 } = {}) {
  let watching = false;

  /**
   * Start watching the workspace root for filesystem changes.
   * Placeholder for future fs.watch integration.
   * @param {string} workspaceRoot - Absolute path to the workspace directory
   */
  function start(workspaceRoot) {
    watching = true;
  }

  /**
   * Stop watching the workspace root.
   */
  function stop() {
    watching = false;
  }

  /**
   * Scan the workspace root for new and removed git repositories.
   *
   * - Lists all subdirectories in workspaceRoot
   * - For each directory with .git/: if not already registered, extract remote URL,
   *   call registry.addProject, and optionally broadcast a 'new-project' event
   * - For each project in the registry that no longer exists on disk,
   *   call registry.removeProject
   *
   * @param {string} workspaceRoot - Absolute path to the workspace directory
   * @returns {Promise<Array<{name: string, gitUrl: string|null}>>} Newly detected repos
   */
  async function scan(workspaceRoot) {
    if (!enabled) {
      return [];
    }

    // Get currently registered projects
    const existingProjects = registry.listProjects();
    const existingNames = new Set(
      (Array.isArray(existingProjects) ? existingProjects : []).map((p) => p.name)
    );

    const newRepos = [];

    // Read directories in workspaceRoot
    let entries;
    try {
      entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    // Collect names of directories that exist on disk (with .git/)
    const onDiskRepoNames = new Set();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(workspaceRoot, entry.name);

      if (!isGitRepo(dirPath)) continue;

      onDiskRepoNames.add(entry.name);

      // Skip repos already in the registry
      if (existingNames.has(entry.name)) continue;

      const gitUrl = extractGitRemoteUrl(dirPath) || null;

      const projectInfo = {
        name: entry.name,
        gitUrl,
      };

      // Register with the projects registry
      registry.addProject(workspaceRoot, projectInfo);

      // Broadcast WebSocket event if broadcast function provided
      if (typeof broadcast === 'function') {
        broadcast({
          type: 'new-project',
          project: projectInfo,
        });
      }

      newRepos.push(projectInfo);
    }

    // Detect removed repos: in registry but no longer on disk
    const registeredProjects = Array.isArray(existingProjects) ? existingProjects : [];
    for (const project of registeredProjects) {
      if (!onDiskRepoNames.has(project.name)) {
        registry.removeProject(workspaceRoot, project.name);
      }
    }

    return newRepos;
  }

  return {
    start,
    stop,
    scan,
  };
}
