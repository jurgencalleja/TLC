/**
 * Workspace Configuration - Define and persist multi-repo workspace structure
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILENAME = '.tlc-workspace.json';
const IGNORE_DIRS = ['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage'];

class WorkspaceConfig {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.configPath = path.join(rootDir, CONFIG_FILENAME);
    this.config = this.load();
  }

  /**
   * Load existing config or return null
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load workspace config:', err.message);
    }
    return null;
  }

  /**
   * Save config to file
   */
  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save workspace config:', err.message);
    }
  }

  /**
   * Initialize a new workspace
   */
  init() {
    this.config = {
      root: this.rootDir,
      repos: [],
      createdAt: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Get current config
   */
  getConfig() {
    return this.config || { root: this.rootDir, repos: [] };
  }

  /**
   * Add a repo to the workspace
   * @param {string} repoPath - Relative or absolute path to repo
   */
  addRepo(repoPath) {
    if (!this.config) {
      throw new Error('Workspace not initialized. Run init() first.');
    }

    // Convert to relative path
    const relativePath = this.toRelativePath(repoPath);
    const absolutePath = path.join(this.rootDir, relativePath);

    // Validate repo exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Repository not found: ${repoPath}`);
    }

    // Add if not already present
    if (!this.config.repos.includes(relativePath)) {
      this.config.repos.push(relativePath);
      this.save();
    }
  }

  /**
   * Remove a repo from the workspace
   * @param {string} repoPath - Relative or absolute path to repo
   */
  removeRepo(repoPath) {
    if (!this.config) return;

    const relativePath = this.toRelativePath(repoPath);
    this.config.repos = this.config.repos.filter(r => r !== relativePath);
    this.save();
  }

  /**
   * Convert absolute path to relative
   */
  toRelativePath(inputPath) {
    if (path.isAbsolute(inputPath)) {
      return path.relative(this.rootDir, inputPath);
    }
    return inputPath;
  }

  /**
   * Discover repos in subdirectories
   * @returns {string[]} Array of relative paths to discovered repos
   */
  discoverRepos() {
    const discovered = [];

    try {
      const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue; // Skip hidden
        if (IGNORE_DIRS.includes(entry.name)) continue;

        const subDir = path.join(this.rootDir, entry.name);

        // Check if it has package.json (Node.js project)
        if (fs.existsSync(path.join(subDir, 'package.json'))) {
          discovered.push(entry.name);
          continue;
        }

        // Check if it has pyproject.toml or setup.py (Python project)
        if (
          fs.existsSync(path.join(subDir, 'pyproject.toml')) ||
          fs.existsSync(path.join(subDir, 'setup.py'))
        ) {
          discovered.push(entry.name);
          continue;
        }

        // Check if it has go.mod (Go project)
        if (fs.existsSync(path.join(subDir, 'go.mod'))) {
          discovered.push(entry.name);
          continue;
        }
      }
    } catch (err) {
      console.error('Failed to discover repos:', err.message);
    }

    return discovered;
  }

  /**
   * Expand glob pattern to matching paths
   * @param {string} pattern - Glob pattern like "packages/*"
   * @returns {string[]} Matching relative paths
   */
  expandGlob(pattern) {
    const results = [];

    // Simple glob expansion for "dir/*" pattern
    if (pattern.endsWith('/*')) {
      const baseDir = pattern.slice(0, -2);
      const absoluteBase = path.join(this.rootDir, baseDir);

      if (fs.existsSync(absoluteBase)) {
        try {
          const entries = fs.readdirSync(absoluteBase, { withFileTypes: true });

          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.')) continue;

            const subPath = path.join(baseDir, entry.name);
            const absolutePath = path.join(this.rootDir, subPath);

            // Check if it's a valid project
            if (
              fs.existsSync(path.join(absolutePath, 'package.json')) ||
              fs.existsSync(path.join(absolutePath, 'pyproject.toml')) ||
              fs.existsSync(path.join(absolutePath, 'go.mod'))
            ) {
              results.push(subPath);
            }
          }
        } catch (err) {
          console.error('Failed to expand glob:', err.message);
        }
      }
    }

    return results;
  }

  /**
   * Detect npm/pnpm/yarn workspaces from root package.json
   * @returns {string[]} Workspace package paths
   */
  detectNpmWorkspaces() {
    const packageJsonPath = path.join(this.rootDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const workspaces = packageJson.workspaces;

      if (!workspaces) {
        return [];
      }

      // Handle array of patterns
      const patterns = Array.isArray(workspaces) ? workspaces : workspaces.packages || [];
      const results = [];

      for (const pattern of patterns) {
        const expanded = this.expandGlob(pattern);
        results.push(...expanded);
      }

      return results;
    } catch (err) {
      console.error('Failed to detect npm workspaces:', err.message);
      return [];
    }
  }

  /**
   * Get info about a specific repo
   * @param {string} repoPath - Relative path to repo
   * @returns {Object} Repo info
   */
  getRepoInfo(repoPath) {
    const absolutePath = path.join(this.rootDir, repoPath);
    const info = {
      path: repoPath,
      name: repoPath,
      hasTlc: false,
      hasPackageJson: false,
    };

    // Check for package.json
    const packageJsonPath = path.join(absolutePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      info.hasPackageJson = true;
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        info.name = pkg.name || repoPath;
        info.version = pkg.version;
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Check for .tlc.json
    const tlcPath = path.join(absolutePath, '.tlc.json');
    info.hasTlc = fs.existsSync(tlcPath);

    return info;
  }
}

module.exports = {
  WorkspaceConfig,
  CONFIG_FILENAME,
};
