/**
 * Workspace Bootstrap — clones repos from the projects registry and sets up
 * a workspace on a new machine.
 *
 * Factory function `createWorkspaceBootstrap` accepts dependencies:
 *   - registry   — projects registry (listProjects / load)
 *   - vectorIndexer — optional vector indexer (rebuildIndex)
 *   - execAsync  — optional async exec function (defaults to no-op for testing)
 *
 * The returned object exposes:
 *   - execute(workspaceRoot, options) — clone repos, install deps, rebuild vectors
 *
 * @module workspace-bootstrap
 */

import fs from 'fs';
import path from 'path';

/**
 * Default no-op exec function used when no execAsync is injected.
 * @param {string} _cmd - Command string (ignored)
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function defaultExecAsync(_cmd) {
  return { stdout: '', stderr: '' };
}

/**
 * Creates a workspace bootstrap instance.
 *
 * @param {object} deps
 * @param {object} deps.registry - Projects registry with listProjects()
 * @param {object} [deps.vectorIndexer] - Optional vector indexer with rebuildIndex()
 * @param {Function} [deps.execAsync] - Async exec function for shell commands
 * @returns {{ execute: Function }}
 */
export function createWorkspaceBootstrap({ registry, vectorIndexer, execAsync } = {}) {
  const exec = execAsync || defaultExecAsync;

  /**
   * Execute the bootstrap workflow: clone repos, install deps, rebuild vectors.
   *
   * @param {string} workspaceRoot - Absolute path to the workspace root directory
   * @param {object} [options={}]
   * @param {boolean} [options.dryRun=false] - If true, no exec calls are made
   * @param {boolean} [options.skipInstall=false] - If true, skip npm install
   * @param {number} [options.parallel=1] - Concurrency (reserved for future use)
   * @param {Function} [options.onProgress] - Progress callback (phase, project, status)
   * @returns {Promise<{cloned: number, skipped: number, failed: number, errors: Array, plan?: Array}>}
   */
  async function execute(workspaceRoot, options = {}) {
    const {
      dryRun = false,
      skipInstall = false,
      parallel = 1,
      onProgress,
    } = options;

    const projects = await registry.listProjects();

    const result = {
      cloned: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // In dry-run mode, build a plan but execute nothing
    if (dryRun) {
      const plan = [];

      for (const project of projects) {
        const targetDir = path.join(workspaceRoot, project.localPath);
        const gitDir = path.join(targetDir, '.git');
        const alreadyCloned = fs.existsSync(gitDir);

        if (alreadyCloned) {
          result.skipped++;
          if (onProgress) {
            onProgress({ phase: 'scan', project: project.name, status: 'skipped' });
          }
        } else {
          plan.push({
            name: project.name,
            gitUrl: project.gitUrl,
            localPath: project.localPath,
            defaultBranch: project.defaultBranch,
          });
          if (onProgress) {
            onProgress({ phase: 'plan', project: project.name, status: 'would-clone' });
          }
        }
      }

      result.plan = plan;
      return result;
    }

    // Live run: clone each project sequentially
    for (const project of projects) {
      const targetDir = path.join(workspaceRoot, project.localPath);
      const gitDir = path.join(targetDir, '.git');

      // Check if already cloned
      if (fs.existsSync(gitDir)) {
        result.skipped++;
        if (onProgress) {
          onProgress({ phase: 'clone', project: project.name, status: 'skipped' });
        }
        continue;
      }

      // Ensure parent directories exist for nested localPath values
      const parentDir = path.dirname(targetDir);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      try {
        // Clone the repository
        if (onProgress) {
          onProgress({ phase: 'clone', project: project.name, status: 'cloning' });
        }

        await exec(`git clone ${project.gitUrl} ${targetDir}`);

        // Checkout the configured default branch
        await exec(`git -C ${targetDir} checkout ${project.defaultBranch}`);

        // Run npm install unless skipInstall is set
        if (!skipInstall) {
          await exec(`npm install --prefix ${targetDir}`);
        }

        result.cloned++;
        if (onProgress) {
          onProgress({ phase: 'clone', project: project.name, status: 'done' });
        }
      } catch (err) {
        result.failed++;
        result.errors.push({
          project: project.name,
          error: err.message || String(err),
        });
        if (onProgress) {
          onProgress({ phase: 'clone', project: project.name, status: 'failed' });
        }
      }
    }

    // Rebuild vector index if vectorIndexer is provided
    if (vectorIndexer && typeof vectorIndexer.rebuildIndex === 'function') {
      try {
        await vectorIndexer.rebuildIndex();
      } catch (_err) {
        // Vector rebuild failure is non-fatal
      }
    }

    return result;
  }

  return { execute };
}
