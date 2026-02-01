/**
 * Audit Attribution - Track who triggered each action (user, agent, hook)
 */

const { execSync: defaultExecSync } = require('child_process');
const os = require('os');
const crypto = require('crypto');

/**
 * Get git user configuration
 * @param {Object} options - Options with optional execSync override
 * @returns {Promise<Object|null>} Git user info or null if unavailable
 */
async function getGitUser(options = {}) {
  const execSync = options.execSync || defaultExecSync;

  try {
    const name = execSync('git config user.name', { encoding: 'utf8' }).toString().trim();
    const email = execSync('git config user.email', { encoding: 'utf8' }).toString().trim();

    return { name, email };
  } catch {
    return null;
  }
}

/**
 * Get system username
 * @param {Object} options - Options with optional userInfo and env overrides
 * @returns {string} System username
 */
function getSystemUser(options = {}) {
  const userInfo = options.userInfo || os.userInfo;
  const env = options.env || process.env;

  try {
    const info = userInfo();
    return info.username;
  } catch {
    // Fall back to environment variables
    return env.USER || env.USERNAME || 'unknown';
  }
}

/**
 * Get complete user attribution information
 * @param {Object} options - Options for dependency injection
 * @returns {Promise<Object>} Attribution info with user, source, and timestamp
 */
async function getAttribution(options = {}) {
  const { env = process.env, execSync, userInfo } = options;
  const timestamp = new Date().toISOString();

  // Priority 1: TLC_USER environment variable
  if (env.TLC_USER) {
    return {
      user: {
        name: env.TLC_USER,
        email: null,
      },
      source: 'env',
      timestamp,
    };
  }

  // Priority 2: Git user configuration
  const gitUser = await getGitUser({ execSync });
  if (gitUser) {
    return {
      user: gitUser,
      source: 'git',
      timestamp,
    };
  }

  // Priority 3: System user
  const systemUser = getSystemUser({ userInfo, env });
  return {
    user: {
      name: systemUser,
      email: null,
    },
    source: 'system',
    timestamp,
  };
}

/**
 * Identify the source of an action (agent, human, hook)
 * @param {Object} context - Context about the action
 * @returns {string} Source type: 'agent', 'human', 'hook', or 'unknown'
 */
function identifySource(context = {}) {
  const { toolName, parentProcess, tty, env = {}, argv = [] } = context;

  // Check for hook-triggered actions first
  if (env.TLC_HOOK) {
    return 'hook';
  }

  // Git hook detection
  if (parentProcess === 'git' && env.GIT_EXEC_PATH) {
    const hookNames = ['pre-commit', 'post-commit', 'pre-push', 'post-merge', 'pre-rebase'];
    const isHookArg = argv.some((arg) => hookNames.includes(arg));
    if (isHookArg) {
      return 'hook';
    }
  }

  // Agent detection via tool name
  if (toolName === 'Task' || toolName === 'Skill') {
    return 'agent';
  }

  // Agent detection via Claude Code environment
  if (env.CLAUDE_CODE === '1' || env.CLAUDE_CODE === 'true') {
    return 'agent';
  }

  // Human detection via TTY and shell processes
  const shellProcesses = ['bash', 'zsh', 'sh', 'fish', 'pwsh', 'powershell'];
  if (tty && (shellProcesses.includes(parentProcess) || !toolName)) {
    return 'human';
  }

  return 'unknown';
}

/**
 * Create a unique session ID for correlating related actions
 * @returns {string} Unique session ID
 */
function createSessionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomPart}`;
}

/**
 * Correlate and filter actions by session ID
 * @param {string} sessionId - Session ID to filter by
 * @param {Array} actions - Array of actions to filter
 * @returns {Array} Filtered and sorted actions for the session
 */
function correlateSession(sessionId, actions) {
  const filtered = actions.filter((action) => action.sessionId === sessionId);

  // Sort by timestamp if available
  return filtered.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Get parent process context information
 * @param {Object} options - Options with optional process override
 * @returns {Object} Parent process context
 */
function getParentProcessContext(options = {}) {
  const proc = options.process || process;

  const context = {
    ppid: proc.ppid,
    argv: proc.argv,
  };

  // Add TTY info if available
  if (proc.stdout && typeof proc.stdout.isTTY !== 'undefined') {
    context.tty = proc.stdout.isTTY;
  }

  // Add terminal type if available
  if (proc.env && proc.env.TERM) {
    context.term = proc.env.TERM;
  }

  return context;
}

module.exports = {
  getGitUser,
  getSystemUser,
  getAttribution,
  identifySource,
  createSessionId,
  correlateSession,
  getParentProcessContext,
};
