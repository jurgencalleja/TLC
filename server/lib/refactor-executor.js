/**
 * Refactor Executor
 * Apply refactoring changes with interactive confirmation
 */

const { CheckpointManager } = require('./checkpoint-manager.js');

class RefactorExecutor {
  constructor(options = {}) {
    this.checkpointManager = options.checkpointManager || new CheckpointManager();
    this.testCommand = options.testCommand || 'npm test';
    this.maxAutofixAttempts = options.maxAutofixAttempts || 3;
    this.interactive = options.interactive !== false;
    this.prompt = options.prompt || this.defaultPrompt.bind(this);
    this.exec = options.exec || this.defaultExec.bind(this);
    this.writeFile = options.writeFile || require('fs').promises.writeFile;
    this.readFile = options.readFile || require('fs').promises.readFile;

    this.appliedChanges = [];
    this.checkpoint = null;
  }

  defaultPrompt(question) {
    // In real implementation, would use readline
    return Promise.resolve('y');
  }

  async defaultExec(command) {
    const { execSync } = require('child_process');
    return execSync(command, { encoding: 'utf-8' });
  }

  /**
   * Execute a list of refactorings
   * @param {Array} refactorings - List of refactoring operations
   * @returns {Object} Execution result
   */
  async execute(refactorings) {
    this.appliedChanges = [];

    // Create checkpoint before starting
    this.checkpoint = await this.checkpointManager.create();

    const results = {
      applied: [],
      skipped: [],
      failed: [],
      rolledBack: false,
    };

    for (const refactor of refactorings) {
      try {
        const result = await this.executeOne(refactor);

        if (result.applied) {
          results.applied.push(refactor);
          this.appliedChanges.push({
            refactor,
            timestamp: new Date(),
          });
        } else if (result.skipped) {
          results.skipped.push(refactor);
        } else if (result.failed) {
          results.failed.push({ refactor, error: result.error });

          // Rollback on failure
          await this.rollback();
          results.rolledBack = true;
          break;
        }
      } catch (error) {
        results.failed.push({ refactor, error: error.message });
        await this.rollback();
        results.rolledBack = true;
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single refactoring
   */
  async executeOne(refactor) {
    // Interactive confirmation
    if (this.interactive) {
      const description = this.describeRefactor(refactor);
      const answer = await this.prompt(`${description}\nApply? [Y/n/skip]: `);

      if (answer.toLowerCase() === 'n') {
        return { applied: false, skipped: true };
      }
      if (answer.toLowerCase() === 'skip') {
        return { applied: false, skipped: true };
      }
    }

    // Apply the refactoring
    await this.applyRefactor(refactor);

    // Run tests
    const testResult = await this.runTests();

    if (!testResult.success) {
      // Try autofix
      const fixed = await this.attemptAutofix(refactor, testResult);
      if (!fixed) {
        return { applied: false, failed: true, error: 'Tests failed after autofix attempts' };
      }
    }

    return { applied: true };
  }

  /**
   * Describe a refactoring in plain English
   */
  describeRefactor(refactor) {
    switch (refactor.type) {
      case 'extract':
        return `Extract "${refactor.name}" from "${refactor.source}" (${refactor.lines} lines)`;
      case 'rename':
        return `Rename "${refactor.oldName}" to "${refactor.newName}" in ${refactor.files?.length || 1} file(s)`;
      case 'split':
        return `Split "${refactor.source}" into ${refactor.targets?.length || 2} files`;
      case 'inline':
        return `Inline "${refactor.name}" into "${refactor.target}"`;
      default:
        return `Apply ${refactor.type} refactoring`;
    }
  }

  /**
   * Apply a refactoring to the codebase
   */
  async applyRefactor(refactor) {
    switch (refactor.type) {
      case 'extract':
        await this.applyExtract(refactor);
        break;
      case 'rename':
        await this.applyRename(refactor);
        break;
      case 'split':
        await this.applySplit(refactor);
        break;
      default:
        if (refactor.changes) {
          for (const change of refactor.changes) {
            await this.writeFile(change.file, change.content);
          }
        }
    }
  }

  async applyExtract(refactor) {
    const { source, name, startLine, endLine, newFile } = refactor;

    const content = await this.readFile(source, 'utf-8');
    const lines = content.split('\n');

    // Extract the function body
    const extractedLines = lines.slice(startLine - 1, endLine);
    const extractedCode = extractedLines.join('\n');

    // Create new file with extracted function
    const newContent = `/**
 * Extracted from ${source}
 */

${extractedCode}

module.exports = { ${name} };
`;

    if (newFile) {
      await this.writeFile(newFile, newContent);
    }

    // Update original file - replace with import/call
    const updatedLines = [
      ...lines.slice(0, startLine - 1),
      `const { ${name} } = require('${newFile}');`,
      ...lines.slice(endLine),
    ];

    await this.writeFile(source, updatedLines.join('\n'));
  }

  async applyRename(refactor) {
    const { oldName, newName, files } = refactor;

    for (const file of files || []) {
      const content = await this.readFile(file, 'utf-8');
      const updated = content.replace(new RegExp(oldName, 'g'), newName);
      await this.writeFile(file, updated);
    }
  }

  async applySplit(refactor) {
    const { source, targets } = refactor;

    for (const target of targets || []) {
      await this.writeFile(target.file, target.content);
    }
  }

  /**
   * Run tests and return result
   */
  async runTests() {
    try {
      await this.exec(this.testCommand);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Attempt to autofix failing tests
   */
  async attemptAutofix(refactor, testResult) {
    for (let attempt = 1; attempt <= this.maxAutofixAttempts; attempt++) {
      // In real implementation, would analyze error and fix
      // For now, just re-run tests
      const result = await this.runTests();
      if (result.success) {
        return true;
      }
    }
    return false;
  }

  /**
   * Rollback to checkpoint
   */
  async rollback() {
    if (this.checkpoint) {
      await this.checkpointManager.rollback(this.checkpoint);
      this.checkpoint = null;
    }
  }

  /**
   * Get log of applied changes
   */
  getLog() {
    return this.appliedChanges;
  }
}

module.exports = { RefactorExecutor };
