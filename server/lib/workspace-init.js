/**
 * Workspace Init - Detect and initialize TLC workspace structures
 *
 * When /tlc:init runs in a folder containing sub-repos, this module
 * detects that it's a workspace and creates the full workspace structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/** Directories to skip when scanning for sub-repos */
const IGNORE_DIRS = ['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage'];

class WorkspaceInit {
  /**
   * @param {string} rootDir - The root directory to inspect/initialize
   */
  constructor(rootDir) {
    this.rootDir = rootDir;
  }

  /**
   * Check if this directory looks like a workspace (2+ sub-repos with .git/)
   * @returns {{ isWorkspace: boolean, repos: Array<{ name: string, path: string, hasGit: boolean, hasTlc: boolean, gitUrl: string|null }> }}
   */
  detectWorkspace() {
    const repos = [];

    try {
      const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (IGNORE_DIRS.includes(entry.name)) continue;

        const subDir = path.join(this.rootDir, entry.name);
        const hasGit = fs.existsSync(path.join(subDir, '.git'));

        if (hasGit) {
          const hasTlc = fs.existsSync(path.join(subDir, '.tlc.json'));
          const gitUrl = this._extractGitUrl(subDir);

          repos.push({
            name: entry.name,
            path: entry.name,
            hasGit,
            hasTlc,
            gitUrl,
          });
        }
      }
    } catch (err) {
      // Ignore discovery errors
    }

    return {
      isWorkspace: repos.length >= 2,
      repos,
    };
  }

  /**
   * Initialize workspace structure
   * @param {Object} [options={}]
   * @param {boolean} [options.forceWorkspace] - Force workspace mode even with fewer than 2 repos
   * @returns {{ projectCount: number }}
   */
  initWorkspace(options = {}) {
    const detection = this.detectWorkspace();
    const repos = detection.repos;

    // Create .planning/ with phases/ subfolder
    this._mkdirSafe(path.join(this.rootDir, '.planning', 'phases'));

    // Create .planning/ROADMAP.md template
    this._writeFileSafe(
      path.join(this.rootDir, '.planning', 'ROADMAP.md'),
      this._roadmapTemplate()
    );

    // Create .planning/BUGS.md
    this._writeFileSafe(
      path.join(this.rootDir, '.planning', 'BUGS.md'),
      this._bugsTemplate()
    );

    // Create CLAUDE.md with workspace template
    this._writeFileSafe(
      path.join(this.rootDir, 'CLAUDE.md'),
      this._claudeTemplate()
    );

    // Create .tlc.json with workspace: true
    this._writeFileSafe(
      path.join(this.rootDir, '.tlc.json'),
      JSON.stringify(this._workspaceTlcConfig(), null, 2) + '\n'
    );

    // Create projects.json from discovered repos
    this._writeFileSafe(
      path.join(this.rootDir, 'projects.json'),
      JSON.stringify(this._buildProjectsJson(repos), null, 2) + '\n'
    );

    // Create memory/ with subdirectories
    this._mkdirSafe(path.join(this.rootDir, 'memory', 'decisions'));
    this._mkdirSafe(path.join(this.rootDir, 'memory', 'gotchas'));
    this._mkdirSafe(path.join(this.rootDir, 'memory', 'conversations'));

    return {
      projectCount: repos.length,
    };
  }

  /**
   * Initialize single project (existing behavior, not workspace)
   * @param {Object} [options={}]
   * @returns {{ project: string }}
   */
  initProject(options = {}) {
    const projectName = path.basename(this.rootDir);

    // Create .planning/ with phases/
    this._mkdirSafe(path.join(this.rootDir, '.planning', 'phases'));

    // Create .tlc.json for a single project (no workspace flag)
    this._writeFileSafe(
      path.join(this.rootDir, '.tlc.json'),
      JSON.stringify(this._projectTlcConfig(projectName), null, 2) + '\n'
    );

    // Create CLAUDE.md
    this._writeFileSafe(
      path.join(this.rootDir, 'CLAUDE.md'),
      this._projectClaudeTemplate(projectName)
    );

    return {
      project: projectName,
    };
  }

  // ─── Private helpers ───────────────────────────────────────

  /**
   * Extract git remote URL from a sub-repo
   * @param {string} repoPath - Absolute path to the repo
   * @returns {string|null} Git remote URL or null
   */
  _extractGitUrl(repoPath) {
    try {
      const url = execSync('git remote get-url origin', {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      return url || null;
    } catch {
      return null;
    }
  }

  /**
   * Create directory (and parents) if it doesn't exist
   * @param {string} dirPath
   */
  _mkdirSafe(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  /**
   * Write a file only if it doesn't already exist
   * @param {string} filePath
   * @param {string} content
   */
  _writeFileSafe(filePath, content) {
    if (fs.existsSync(filePath)) return;
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Build projects.json structure from discovered repos
   * @param {Array} repos
   * @returns {Object}
   */
  _buildProjectsJson(repos) {
    return {
      version: 1,
      projects: repos.map(r => ({
        name: r.name,
        path: r.path,
        gitUrl: r.gitUrl,
        hasTlc: r.hasTlc,
      })),
    };
  }

  /**
   * Generate workspace .tlc.json config
   * @returns {Object}
   */
  _workspaceTlcConfig() {
    return {
      workspace: true,
      version: 1,
      paths: {
        planning: '.planning',
        memory: 'memory',
      },
    };
  }

  /**
   * Generate single-project .tlc.json config
   * @param {string} projectName
   * @returns {Object}
   */
  _projectTlcConfig(projectName) {
    return {
      project: projectName,
      version: 1,
      paths: {
        planning: '.planning',
      },
    };
  }

  /**
   * Template for workspace-level ROADMAP.md
   * @returns {string}
   */
  _roadmapTemplate() {
    return `# Workspace Roadmap

## Phases

<!-- Add workspace-level phases here -->

## Milestones

<!-- Add milestones here -->
`;
  }

  /**
   * Template for BUGS.md
   * @returns {string}
   */
  _bugsTemplate() {
    return `# Bugs

<!-- Track cross-project bugs here -->
`;
  }

  /**
   * Template for workspace-level CLAUDE.md
   * @returns {string}
   */
  _claudeTemplate() {
    return `# CLAUDE.md - Workspace Conventions

This is a workspace containing multiple projects.

## Projects

See \`projects.json\` for the full list of projects in this workspace.

## Workflow

Use TLC commands to manage work across projects:

- \`/tlc:plan\` - Plan work across projects
- \`/tlc:build\` - Build with test-first discipline
- \`/tlc:progress\` - Check status across all projects
`;
  }

  /**
   * Template for single-project CLAUDE.md
   * @param {string} projectName
   * @returns {string}
   */
  _projectClaudeTemplate(projectName) {
    return `# CLAUDE.md - ${projectName}

## Project

${projectName}

## Workflow

Use TLC commands to manage work:

- \`/tlc:plan\` - Plan work
- \`/tlc:build\` - Build with test-first discipline
- \`/tlc:progress\` - Check status
`;
  }
}

module.exports = { WorkspaceInit };
