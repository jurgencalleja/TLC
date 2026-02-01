/**
 * Workspace Command - CLI interface for workspace operations
 */

const fs = require('fs');
const path = require('path');
const { WorkspaceConfig } = require('./workspace-config.js');
const { BulkRepoInit } = require('./bulk-repo-init.js');
const { WorkspaceTestRunner } = require('./workspace-test-runner.js');
const { RepoDependencyTracker } = require('./repo-dependency-tracker.js');

const CONFIG_FILENAME = '.tlc-workspace.json';

class WorkspaceCommand {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.configPath = path.join(rootDir, CONFIG_FILENAME);
    this.config = null;
    this._loadConfig();
  }

  /**
   * Load existing workspace config
   */
  _loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      } catch (err) {
        this.config = null;
      }
    }
  }

  /**
   * Save workspace config
   */
  _saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * Check if workspace is initialized
   */
  isInitialized() {
    return this.config !== null;
  }

  /**
   * Get current config
   */
  getConfig() {
    return this.config;
  }

  /**
   * Initialize workspace - scan, detect, and optionally bulk-init repos
   */
  async init(options = {}) {
    const { dryRun = false, confirm = false } = options;

    const workspaceConfig = new WorkspaceConfig(this.rootDir);
    const bulkInit = new BulkRepoInit(this.rootDir);

    // Discover repos
    const discovered = workspaceConfig.discoverRepos();

    // Find uninitialized repos
    const needsInit = bulkInit.findUninitializedRepos();

    const result = {
      discovered,
      needsInit,
      initialized: 0,
      skipped: discovered.length - needsInit.length,
      errors: [],
    };

    if (dryRun) {
      return result;
    }

    if (confirm) {
      // Initialize all uninitialized repos
      if (needsInit.length > 0) {
        const initResult = bulkInit.initializeAll();
        result.initialized = initResult.initialized;
        result.errors = initResult.errors;
      }

      // Create workspace config
      this.config = {
        root: this.rootDir,
        repos: discovered,
        createdAt: new Date().toISOString(),
      };
      this._saveConfig();
    }

    return result;
  }

  /**
   * Add a repo to the workspace
   */
  async add(repoPath) {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const absolutePath = path.isAbsolute(repoPath)
      ? repoPath
      : path.join(this.rootDir, repoPath);

    const relativePath = path.relative(this.rootDir, absolutePath);

    // Check repo exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Repository not found: ${repoPath}`);
    }

    // Auto-initialize if no .tlc.json
    const tlcPath = path.join(absolutePath, '.tlc.json');
    if (!fs.existsSync(tlcPath)) {
      const bulkInit = new BulkRepoInit(this.rootDir);
      bulkInit.initializeRepo(relativePath);
    }

    // Add to config if not already present
    if (!this.config.repos.includes(relativePath)) {
      this.config.repos.push(relativePath);
      this._saveConfig();
    }
  }

  /**
   * Remove a repo from the workspace (does not delete files)
   */
  async remove(repoPath) {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const relativePath = path.isAbsolute(repoPath)
      ? path.relative(this.rootDir, repoPath)
      : repoPath;

    this.config.repos = this.config.repos.filter(r => r !== relativePath);
    this._saveConfig();
  }

  /**
   * List all repos with status
   */
  async list() {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const repos = [];

    for (const repoName of this.config.repos) {
      const repoPath = path.join(this.rootDir, repoName);
      const info = {
        name: repoName,
        path: repoName,
        status: 'ready',
        hasTlc: false,
        packageName: repoName,
      };

      // Check .tlc.json
      const tlcPath = path.join(repoPath, '.tlc.json');
      info.hasTlc = fs.existsSync(tlcPath);
      info.status = info.hasTlc ? 'ready' : 'needs-init';

      // Get package name
      const pkgPath = path.join(repoPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          if (pkg.name) {
            info.packageName = pkg.name;
          }
        } catch (err) {
          // Ignore
        }
      }

      repos.push(info);
    }

    return repos;
  }

  /**
   * Run tests across workspace
   */
  async test(options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const runner = new WorkspaceTestRunner(this.rootDir, this.config.repos);
    return runner.runTests(options);
  }

  /**
   * Generate dependency graph (Mermaid)
   */
  async graph() {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const tracker = new RepoDependencyTracker(this.rootDir, this.config.repos);
    return tracker.generateMermaidDiagram();
  }

  /**
   * Get workspace status overview
   */
  async status() {
    if (!this.isInitialized()) {
      throw new Error('Workspace not initialized. Run init first.');
    }

    const repoList = await this.list();
    const tracker = new RepoDependencyTracker(this.rootDir, this.config.repos);

    return {
      root: this.rootDir,
      repoCount: this.config.repos.length,
      repos: repoList.map(r => ({
        name: r.name,
        hasTlc: r.hasTlc,
        status: r.status,
        dependencies: tracker.getDependencies(r.name),
        dependents: tracker.getDependents(r.name),
      })),
      dependencyGraph: tracker.getDependencyGraph(),
      cycles: tracker.detectCircularDependencies(),
    };
  }
}

module.exports = {
  WorkspaceCommand,
};
