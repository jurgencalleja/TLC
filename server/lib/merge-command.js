/**
 * Merge Command Module
 * Handles /tlc:merge command for regression testing before merge
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Parse merge command arguments
 * @param {string} args - Command arguments
 * @returns {Object} Parsed options
 */
function parseMergeArgs(args = '') {
  const options = {
    branch: null,
    skipTests: false,
    force: false,
    noPush: false,
    verbose: false,
  };

  const parts = args.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === '--skip-tests') {
      options.skipTests = true;
    } else if (part === '--force') {
      options.force = true;
    } else if (part === '--no-push') {
      options.noPush = true;
    } else if (part === '--verbose') {
      options.verbose = true;
    } else if (!part.startsWith('-')) {
      options.branch = part;
    }
  }

  return options;
}

/**
 * Run a command and capture output
 * @param {string} cmd - Command to run
 * @param {Array} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<Object>} Command result
 */
function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd: options.cwd || process.cwd(),
      shell: true,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        code: -1,
        stdout,
        stderr: err.message,
      });
    });
  });
}

/**
 * Get current git branch
 * @param {string} cwd - Working directory
 * @returns {Promise<string>} Branch name
 */
async function getCurrentBranch(cwd) {
  const result = await runCommand('git', ['branch', '--show-current'], { cwd });
  return result.stdout.trim();
}

/**
 * Check if branch exists
 * @param {string} branch - Branch name
 * @param {string} cwd - Working directory
 * @returns {Promise<boolean>} Branch exists
 */
async function branchExists(branch, cwd) {
  const result = await runCommand('git', ['rev-parse', '--verify', branch], { cwd });
  return result.success;
}

/**
 * Check for uncommitted changes
 * @param {string} cwd - Working directory
 * @returns {Promise<boolean>} Has changes
 */
async function hasUncommittedChanges(cwd) {
  const result = await runCommand('git', ['status', '--porcelain'], { cwd });
  return result.stdout.trim().length > 0;
}

/**
 * Get merge base between branches
 * @param {string} branch1 - First branch
 * @param {string} branch2 - Second branch
 * @param {string} cwd - Working directory
 * @returns {Promise<string>} Merge base commit
 */
async function getMergeBase(branch1, branch2, cwd) {
  const result = await runCommand('git', ['merge-base', branch1, branch2], { cwd });
  return result.stdout.trim();
}

/**
 * Get commits between branches
 * @param {string} base - Base commit
 * @param {string} branch - Branch to check
 * @param {string} cwd - Working directory
 * @returns {Promise<Array>} Commits
 */
async function getCommitsBetween(base, branch, cwd) {
  const result = await runCommand('git', ['log', '--oneline', `${base}..${branch}`], { cwd });
  if (!result.success || !result.stdout.trim()) {
    return [];
  }
  return result.stdout.trim().split('\n').map(line => {
    const [hash, ...messageParts] = line.split(' ');
    return { hash, message: messageParts.join(' ') };
  });
}

/**
 * Run test command
 * @param {string} cmd - Test command
 * @param {string} cwd - Working directory
 * @returns {Promise<Object>} Test result
 */
async function runTests(cmd, cwd) {
  const result = await runCommand(cmd, [], { cwd });
  return {
    success: result.success,
    output: result.stdout + result.stderr,
  };
}

/**
 * Perform git merge
 * @param {string} branch - Branch to merge
 * @param {string} cwd - Working directory
 * @returns {Promise<Object>} Merge result
 */
async function performMerge(branch, cwd) {
  const result = await runCommand('git', ['merge', branch, '--no-edit'], { cwd });
  return {
    success: result.success,
    output: result.stdout + result.stderr,
    conflicts: result.stderr.includes('CONFLICT'),
  };
}

/**
 * Abort merge
 * @param {string} cwd - Working directory
 * @returns {Promise<boolean>} Success
 */
async function abortMerge(cwd) {
  const result = await runCommand('git', ['merge', '--abort'], { cwd });
  return result.success;
}

/**
 * Detect test command for project
 * @param {string} cwd - Working directory
 * @returns {Promise<string>} Test command
 */
async function detectTestCommand(cwd) {
  // Check package.json
  try {
    const pkgPath = path.join(cwd, 'package.json');
    const pkg = require(pkgPath);
    if (pkg.scripts?.test) {
      return 'npm test';
    }
  } catch {
    // No package.json
  }

  // Check for pytest
  const pytestResult = await runCommand('which', ['pytest'], { cwd });
  if (pytestResult.success) {
    return 'pytest';
  }

  // Check for go
  const goResult = await runCommand('which', ['go'], { cwd });
  if (goResult.success) {
    return 'go test ./...';
  }

  return 'npm test';
}

/**
 * Detect changed dependencies
 * @param {string} base - Base commit
 * @param {string} branch - Branch to check
 * @param {string} cwd - Working directory
 * @returns {Promise<Object>} Changed dependencies
 */
async function detectDependencyChanges(base, branch, cwd) {
  const result = await runCommand('git', ['diff', '--name-only', base, branch], { cwd });
  const files = result.stdout.trim().split('\n');

  const changes = {
    hasChanges: false,
    packageJson: false,
    lockFile: false,
    requirements: false,
    goMod: false,
    files: [],
  };

  for (const file of files) {
    if (file === 'package.json') {
      changes.packageJson = true;
      changes.hasChanges = true;
      changes.files.push(file);
    } else if (file.includes('lock') || file === 'package-lock.json' || file === 'pnpm-lock.yaml' || file === 'yarn.lock') {
      changes.lockFile = true;
      changes.hasChanges = true;
      changes.files.push(file);
    } else if (file === 'requirements.txt' || file === 'pyproject.toml') {
      changes.requirements = true;
      changes.hasChanges = true;
      changes.files.push(file);
    } else if (file === 'go.mod' || file === 'go.sum') {
      changes.goMod = true;
      changes.hasChanges = true;
      changes.files.push(file);
    }
  }

  return changes;
}

/**
 * Generate merge summary
 * @param {Object} context - Merge context
 * @returns {string} Summary markdown
 */
function generateMergeSummary(context) {
  const lines = [];

  lines.push('# Merge Summary');
  lines.push('');
  lines.push(`**Source Branch:** ${context.sourceBranch}`);
  lines.push(`**Target Branch:** ${context.targetBranch}`);
  lines.push(`**Commits:** ${context.commits.length}`);
  lines.push('');

  if (context.dependencyChanges.hasChanges) {
    lines.push('## Dependency Changes Detected');
    lines.push('');
    for (const file of context.dependencyChanges.files) {
      lines.push(`- ${file}`);
    }
    lines.push('');
    lines.push('> Consider running dependency install before testing.');
    lines.push('');
  }

  if (context.testResult) {
    if (context.testResult.success) {
      lines.push('## Tests: PASSED');
    } else {
      lines.push('## Tests: FAILED');
      lines.push('');
      lines.push('```');
      lines.push(context.testResult.output.slice(0, 2000));
      lines.push('```');
    }
    lines.push('');
  }

  if (context.mergeResult) {
    if (context.mergeResult.success) {
      lines.push('## Merge: COMPLETED');
    } else if (context.mergeResult.conflicts) {
      lines.push('## Merge: CONFLICTS');
      lines.push('');
      lines.push('Merge conflicts need manual resolution.');
    } else {
      lines.push('## Merge: FAILED');
    }
  }

  return lines.join('\n');
}

/**
 * Execute merge command
 * @param {string} args - Command arguments
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Command result
 */
async function executeMergeCommand(args = '', context = {}) {
  const { projectDir = process.cwd() } = context;
  const options = parseMergeArgs(args);

  const result = {
    success: false,
    steps: [],
  };

  // Check for uncommitted changes
  const hasChanges = await hasUncommittedChanges(projectDir);
  if (hasChanges) {
    return {
      success: false,
      error: 'Uncommitted changes detected. Commit or stash before merging.',
    };
  }

  // Get current branch
  const currentBranch = await getCurrentBranch(projectDir);
  result.currentBranch = currentBranch;

  // Validate source branch
  if (!options.branch) {
    return {
      success: false,
      error: 'No branch specified. Usage: /tlc:merge <branch>',
    };
  }

  const sourceExists = await branchExists(options.branch, projectDir);
  if (!sourceExists) {
    return {
      success: false,
      error: `Branch '${options.branch}' does not exist.`,
    };
  }

  result.sourceBranch = options.branch;
  result.targetBranch = currentBranch;

  // Get merge base and commits
  const mergeBase = await getMergeBase(currentBranch, options.branch, projectDir);
  const commits = await getCommitsBetween(mergeBase, options.branch, projectDir);
  result.commits = commits;

  // Check for dependency changes
  const depChanges = await detectDependencyChanges(mergeBase, options.branch, projectDir);
  result.dependencyChanges = depChanges;

  // Run tests unless skipped
  if (!options.skipTests) {
    const testCmd = await detectTestCommand(projectDir);
    result.steps.push({ step: 'tests', command: testCmd });

    const testResult = await runTests(testCmd, projectDir);
    result.testResult = testResult;

    if (!testResult.success && !options.force) {
      result.success = false;
      result.error = 'Tests failed. Use --force to merge anyway.';
      result.summary = generateMergeSummary(result);
      return result;
    }
  }

  // Perform merge
  const mergeResult = await performMerge(options.branch, projectDir);
  result.mergeResult = mergeResult;

  if (!mergeResult.success) {
    if (mergeResult.conflicts) {
      result.success = false;
      result.error = 'Merge conflicts detected. Resolve manually.';
    } else {
      result.success = false;
      result.error = 'Merge failed: ' + mergeResult.output;
    }
    result.summary = generateMergeSummary(result);
    return result;
  }

  result.success = true;
  result.summary = generateMergeSummary(result);
  return result;
}

/**
 * Create merge command handler
 * @param {Object} options - Handler options
 * @returns {Object} Command handler
 */
function createMergeCommand(options = {}) {
  return {
    execute: (args, ctx) => executeMergeCommand(args, { ...options, ...ctx }),
    parseArgs: parseMergeArgs,
    getCurrentBranch,
    branchExists,
    hasUncommittedChanges,
    detectTestCommand,
    detectDependencyChanges,
    generateMergeSummary,
  };
}

module.exports = {
  parseMergeArgs,
  runCommand,
  getCurrentBranch,
  branchExists,
  hasUncommittedChanges,
  getMergeBase,
  getCommitsBetween,
  runTests,
  performMerge,
  abortMerge,
  detectTestCommand,
  detectDependencyChanges,
  generateMergeSummary,
  executeMergeCommand,
  createMergeCommand,
};
