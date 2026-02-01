/**
 * Bulk Repo Initializer - Initialize TLC in multiple repos at once
 */

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage'];

class BulkRepoInit {
  constructor(rootDir) {
    this.rootDir = rootDir;
  }

  /**
   * Find all repos in the workspace that don't have .tlc.json
   * @returns {string[]} Array of relative paths to uninitialized repos
   */
  findUninitializedRepos() {
    const allRepos = this.discoverRepos();
    return allRepos.filter(repo => {
      const tlcPath = path.join(this.rootDir, repo, '.tlc.json');
      // Check if .tlc.json exists AND is a file (not a directory)
      try {
        const stat = fs.statSync(tlcPath);
        return !stat.isFile();
      } catch (err) {
        // File doesn't exist
        return true;
      }
    });
  }

  /**
   * Discover all repos in subdirectories
   * @returns {string[]} Array of relative paths to discovered repos
   */
  discoverRepos() {
    const discovered = [];

    try {
      const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (IGNORE_DIRS.includes(entry.name)) continue;

        const subDir = path.join(this.rootDir, entry.name);

        // Check for project markers
        if (this.isProject(subDir)) {
          discovered.push(entry.name);
        }
      }
    } catch (err) {
      // Ignore discovery errors
    }

    return discovered;
  }

  /**
   * Check if a directory is a project
   * @param {string} dirPath - Absolute path to directory
   * @returns {boolean}
   */
  isProject(dirPath) {
    return (
      fs.existsSync(path.join(dirPath, 'package.json')) ||
      fs.existsSync(path.join(dirPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(dirPath, 'setup.py')) ||
      fs.existsSync(path.join(dirPath, 'go.mod'))
    );
  }

  /**
   * Detect the project type for a repo
   * @param {string} repoPath - Absolute path to repo
   * @returns {string} Project type: 'node', 'python', 'go', or 'unknown'
   */
  detectProjectType(repoPath) {
    if (fs.existsSync(path.join(repoPath, 'package.json'))) {
      return 'node';
    }

    if (
      fs.existsSync(path.join(repoPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(repoPath, 'setup.py'))
    ) {
      return 'python';
    }

    if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
      return 'go';
    }

    return 'unknown';
  }

  /**
   * Detect the test framework for a repo
   * @param {string} repoPath - Absolute path to repo
   * @returns {string|null} Test framework name or null if not detected
   */
  detectTestFramework(repoPath) {
    // Check for vitest config files
    if (
      fs.existsSync(path.join(repoPath, 'vitest.config.js')) ||
      fs.existsSync(path.join(repoPath, 'vitest.config.ts')) ||
      fs.existsSync(path.join(repoPath, 'vitest.config.mjs')) ||
      fs.existsSync(path.join(repoPath, 'vite.config.js')) ||
      fs.existsSync(path.join(repoPath, 'vite.config.ts')) ||
      fs.existsSync(path.join(repoPath, 'vite.config.mjs'))
    ) {
      return 'vitest';
    }

    // Check for jest config files
    if (
      fs.existsSync(path.join(repoPath, 'jest.config.js')) ||
      fs.existsSync(path.join(repoPath, 'jest.config.ts')) ||
      fs.existsSync(path.join(repoPath, 'jest.config.json')) ||
      fs.existsSync(path.join(repoPath, 'jest.config.mjs'))
    ) {
      return 'jest';
    }

    // Check for mocha config files
    if (
      fs.existsSync(path.join(repoPath, '.mocharc.json')) ||
      fs.existsSync(path.join(repoPath, '.mocharc.js')) ||
      fs.existsSync(path.join(repoPath, '.mocharc.yaml')) ||
      fs.existsSync(path.join(repoPath, '.mocharc.yml'))
    ) {
      return 'mocha';
    }

    // Check for pytest config
    if (fs.existsSync(path.join(repoPath, 'pytest.ini'))) {
      return 'pytest';
    }

    // Check pyproject.toml for pytest config
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        if (content.includes('[tool.pytest') || content.includes('[tool.pytest.ini_options]')) {
          return 'pytest';
        }
      } catch (err) {
        // Ignore read errors
      }
    }

    // Check package.json for devDependencies
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...pkg.devDependencies, ...pkg.dependencies };

        if (deps.vitest) return 'vitest';
        if (deps.jest) return 'jest';
        if (deps.mocha) return 'mocha';
      } catch (err) {
        // Ignore parse errors
      }
    }

    return null;
  }

  /**
   * Get project name from package.json or pyproject.toml
   * @param {string} repoPath - Absolute path to repo
   * @param {string} repoName - Default repo name (directory name)
   * @returns {string} Project name
   */
  getProjectName(repoPath, repoName) {
    // Try package.json first
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (pkg.name) return pkg.name;
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Try pyproject.toml
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        const match = content.match(/name\s*=\s*"([^"]+)"/);
        if (match) return match[1];
      } catch (err) {
        // Ignore read errors
      }
    }

    return repoName;
  }

  /**
   * Create a minimal .tlc.json config for a repo
   * @param {string} repoPath - Absolute path to repo
   * @param {string} repoName - Repo directory name
   * @returns {Object} TLC config object
   */
  createConfig(repoPath, repoName) {
    const projectType = this.detectProjectType(repoPath);
    const testFramework = this.detectTestFramework(repoPath);
    const projectName = this.getProjectName(repoPath, repoName);

    const config = {
      project: projectName,
      projectType,
      testFrameworks: {
        primary: testFramework || this.getDefaultTestFramework(projectType),
      },
      paths: {
        planning: '.planning',
        tests: this.getDefaultTestPath(projectType),
      },
    };

    return config;
  }

  /**
   * Get default test framework for project type
   * @param {string} projectType
   * @returns {string}
   */
  getDefaultTestFramework(projectType) {
    switch (projectType) {
      case 'python':
        return 'pytest';
      case 'go':
        return 'go-test';
      case 'node':
      default:
        return 'mocha';
    }
  }

  /**
   * Get default test path for project type
   * @param {string} projectType
   * @returns {string}
   */
  getDefaultTestPath(projectType) {
    switch (projectType) {
      case 'python':
        return 'tests';
      case 'go':
        return '.';
      case 'node':
      default:
        return 'test';
    }
  }

  /**
   * Initialize TLC for a single repo
   * @param {string} repoName - Relative path to repo
   * @throws {Error} If initialization fails
   */
  initializeRepo(repoName) {
    const repoPath = path.join(this.rootDir, repoName);
    const tlcConfigPath = path.join(repoPath, '.tlc.json');

    // Create config
    const config = this.createConfig(repoPath, repoName);

    // Write config file
    fs.writeFileSync(tlcConfigPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }

  /**
   * Initialize TLC for all uninitialized repos in the workspace
   * @returns {Object} Summary of initialization results
   */
  initializeAll() {
    const allRepos = this.discoverRepos();
    const uninitialized = this.findUninitializedRepos();
    const skipped = allRepos.length - uninitialized.length;

    return this.initializeReposInternal(uninitialized, skipped, allRepos.length);
  }

  /**
   * Initialize TLC for specific repos
   * @param {string[]} repoNames - Array of repo names to initialize
   * @returns {Object} Summary of initialization results
   */
  initializeRepos(repoNames) {
    return this.initializeReposInternal(repoNames, 0, repoNames.length);
  }

  /**
   * Internal method to initialize repos and build results
   * @param {string[]} repoNames - Repos to initialize
   * @param {number} skipped - Number of skipped repos
   * @param {number} total - Total number of repos
   * @returns {Object} Summary of initialization results
   */
  initializeReposInternal(repoNames, skipped, total) {
    const result = {
      initialized: 0,
      skipped,
      failed: 0,
      total,
      repos: [],
      errors: [],
    };

    for (const repoName of repoNames) {
      try {
        this.initializeRepo(repoName);
        result.initialized++;
        result.repos.push(repoName);
      } catch (err) {
        result.failed++;
        result.errors.push({
          repo: repoName,
          error: err.message,
        });
      }
    }

    return result;
  }
}

module.exports = {
  BulkRepoInit,
};
