/**
 * Hooks Generator
 *
 * Generates and installs git hooks that run the TLC code gate.
 * Hooks are portable sh scripts (not bash-specific).
 *
 * @module code-gate/hooks-generator
 */

const path = require('path');
const fs = require('fs');

/** Marker comment to identify TLC-generated hooks */
const TLC_HOOK_MARKER = '# TLC Code Gate';

/**
 * Generate a pre-commit hook script.
 * Runs fast static analysis (< 3s) on staged files.
 *
 * @returns {string} Shell script content
 */
function generatePreCommitHook() {
  return `#!/bin/sh
${TLC_HOOK_MARKER} — pre-commit
# Runs static code gate on staged files.
# To bypass: git commit --no-verify (bypass is logged)

# Get the project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# Run the TLC gate check on staged files
if command -v node > /dev/null 2>&1; then
  node "$PROJECT_ROOT/node_modules/.bin/tlc-gate" check --hook pre-commit
  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "Commit blocked by TLC Code Gate."
    echo "Fix the issues above or use: git commit --no-verify"
    exit 1
  fi
else
  echo "Warning: Node.js not found. Skipping TLC Code Gate."
fi

exit 0
`;
}

/**
 * Generate a pre-push hook script.
 * Runs full analysis including LLM-powered review.
 *
 * @returns {string} Shell script content
 */
function generatePrePushHook() {
  return `#!/bin/sh
${TLC_HOOK_MARKER} — pre-push
# Runs full code gate including LLM review before push.
# To bypass: git push --no-verify (bypass is logged)

PROJECT_ROOT="$(git rev-parse --show-toplevel)"

if command -v node > /dev/null 2>&1; then
  node "$PROJECT_ROOT/node_modules/.bin/tlc-gate" check --hook pre-push --full
  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "Push blocked by TLC Code Gate."
    echo "Fix the issues above or use: git push --no-verify"
    exit 1
  fi
else
  echo "Warning: Node.js not found. Skipping TLC Code Gate."
fi

exit 0
`;
}

/**
 * Install git hooks into the project's .git/hooks/ directory.
 *
 * @param {string} projectPath - Path to project root
 * @param {Object} [options] - Options
 * @param {Object} [options.fs] - File system module (for testing)
 * @param {string[]} [options.hooks] - Which hooks to install (default: both)
 * @returns {Promise<{installed: string[]}>}
 */
async function installHooks(projectPath, options = {}) {
  const fsModule = options.fs || fs;
  const hooks = options.hooks || ['pre-commit', 'pre-push'];
  const gitDir = path.join(projectPath, '.git');

  if (!fsModule.existsSync(gitDir)) {
    throw new Error('Not a git repository: .git directory not found');
  }

  const hooksDir = path.join(gitDir, 'hooks');
  const installed = [];

  const generators = {
    'pre-commit': generatePreCommitHook,
    'pre-push': generatePrePushHook,
  };

  for (const hookName of hooks) {
    const generator = generators[hookName];
    if (!generator) continue;

    const hookPath = path.join(hooksDir, hookName);
    const content = generator();

    fsModule.writeFileSync(hookPath, content, 'utf-8');
    fsModule.chmodSync(hookPath, '755');
    installed.push(hookName);
  }

  return { installed };
}

/**
 * Check if a TLC code gate hook is installed.
 *
 * @param {string} projectPath
 * @param {string} hookName - Hook name (pre-commit, pre-push)
 * @param {Object} [options]
 * @param {Object} [options.fs] - File system module
 * @returns {boolean}
 */
function isHookInstalled(projectPath, hookName, options = {}) {
  const fsModule = options.fs || fs;
  const hookPath = path.join(projectPath, '.git', 'hooks', hookName);

  if (!fsModule.existsSync(hookPath)) {
    return false;
  }

  const content = fsModule.readFileSync(hookPath, 'utf-8');
  return content.includes(TLC_HOOK_MARKER);
}

module.exports = {
  generatePreCommitHook,
  generatePrePushHook,
  installHooks,
  isHookInstalled,
};
