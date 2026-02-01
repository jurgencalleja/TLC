/**
 * Checkpoint Manager
 * Create and manage git-based checkpoints for safe refactoring
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CheckpointManager {
  constructor(options = {}) {
    this.exec = options.exec || this.defaultExec.bind(this);
    this.readFile = options.readFile || this.defaultReadFile.bind(this);
    this.writeFile = options.writeFile || this.defaultWriteFile.bind(this);
    this.stateFile = options.stateFile || '.tlc/checkpoint.json';
  }

  /**
   * Default exec implementation
   */
  async defaultExec(command) {
    return new Promise((resolve, reject) => {
      try {
        const stdout = execSync(command, { encoding: 'utf-8' });
        resolve({ stdout });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Default read file implementation
   */
  async defaultReadFile(filePath) {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  /**
   * Default write file implementation
   */
  async defaultWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Create a new checkpoint
   * @param {Object} options - Creation options
   * @returns {Object} Checkpoint info
   */
  async create(options = {}) {
    // Check for existing checkpoint
    if (!options.force) {
      const existing = await this.load();
      if (existing) {
        throw new Error('Checkpoint already exists. Use rollback() first or force: true');
      }
    }

    // Get current branch
    let originalBranch;
    let wasDetached = false;

    try {
      const { stdout } = await this.exec('git branch --show-current');
      originalBranch = stdout.trim();

      if (!originalBranch) {
        // Detached HEAD
        const { stdout: headCommit } = await this.exec('git rev-parse HEAD');
        originalBranch = headCommit.trim();
        wasDetached = true;
      }
    } catch (error) {
      throw new Error('Failed to get current branch: ' + error.message);
    }

    // Check for uncommitted changes
    const { stdout: status } = await this.exec('git status --porcelain');
    const hasChanges = status.trim().length > 0;
    let hasStash = false;
    let stashRef = null;

    // Stash changes if any
    if (hasChanges) {
      await this.exec('git stash push -m "TLC checkpoint stash"');
      hasStash = true;
      stashRef = 'stash@{0}';
    }

    // Create refactor branch
    const timestamp = Date.now();
    let branch = `refactor/${timestamp}`;
    let attempts = 0;

    while (attempts < 3) {
      try {
        await this.exec(`git checkout -b ${branch}`);
        break;
      } catch (error) {
        if (error.message.includes('already exists')) {
          attempts++;
          branch = `refactor/${timestamp}-${attempts}`;
        } else {
          throw error;
        }
      }
    }

    // Get commit hash
    const { stdout: commitHash } = await this.exec('git rev-parse HEAD');

    const checkpoint = {
      id: `checkpoint-${timestamp}`,
      branch,
      originalBranch,
      wasDetached,
      hasStash,
      stashRef,
      commitHash: commitHash.trim(),
      createdAt: new Date(),
    };

    // Save checkpoint state
    await this.save(checkpoint);

    return checkpoint;
  }

  /**
   * Rollback to checkpoint state
   * @param {Object} checkpoint - Checkpoint to rollback to
   */
  async rollback(checkpoint) {
    // Checkout original branch
    await this.exec(`git checkout ${checkpoint.originalBranch}`);

    // Delete refactor branch
    try {
      await this.exec(`git branch -D ${checkpoint.branch}`);
    } catch (error) {
      // Branch might not exist
    }

    // Pop stash if we stashed
    if (checkpoint.hasStash) {
      try {
        await this.exec('git stash pop');
      } catch (error) {
        // Stash might be empty or conflict
      }
    }

    // Clear checkpoint state
    await this.clear();
  }

  /**
   * Commit current changes
   * @param {string} message - Commit message
   */
  async commit(message) {
    await this.exec('git add -A');
    await this.exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  }

  /**
   * Merge refactor branch back to original
   * @param {Object} checkpoint - Checkpoint info
   * @param {Object} options - Merge options
   */
  async merge(checkpoint, options = {}) {
    // Checkout original branch
    await this.exec(`git checkout ${checkpoint.originalBranch}`);

    // Merge refactor branch
    await this.exec(`git merge ${checkpoint.branch}`);

    // Cleanup if requested
    if (options.cleanup) {
      await this.exec(`git branch -d ${checkpoint.branch}`);
    }

    // Clear checkpoint state
    await this.clear();
  }

  /**
   * Save checkpoint state to file
   */
  async save(checkpoint) {
    await this.writeFile(this.stateFile, JSON.stringify(checkpoint, null, 2));
  }

  /**
   * Load existing checkpoint state
   * @returns {Object|null} Checkpoint or null if none exists
   */
  async load() {
    try {
      const content = await this.readFile(this.stateFile);
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear checkpoint state
   */
  async clear() {
    try {
      await fs.promises.unlink(this.stateFile);
    } catch (error) {
      // File might not exist
    }
  }

  /**
   * Get current checkpoint status
   * @returns {Object} Status info
   */
  async status() {
    const checkpoint = await this.load();

    if (!checkpoint) {
      return {
        active: false,
      };
    }

    // Get current branch
    const { stdout: currentBranch } = await this.exec('git branch --show-current');

    // Check for uncommitted changes
    const { stdout: status } = await this.exec('git status --porcelain');

    return {
      active: true,
      branch: checkpoint.branch,
      originalBranch: checkpoint.originalBranch,
      isOnRefactorBranch: currentBranch.trim() === checkpoint.branch,
      hasUncommittedChanges: status.trim().length > 0,
      createdAt: checkpoint.createdAt,
    };
  }
}

module.exports = { CheckpointManager };
