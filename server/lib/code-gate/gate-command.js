/**
 * Gate Command
 *
 * /tlc:gate command to install, configure, and run the code gate.
 * Subcommands: install, check, status, config
 *
 * @module code-gate/gate-command
 */

/**
 * Parse gate command arguments into structured options.
 *
 * @param {string} args - Raw argument string
 * @returns {{ subcommand: string }}
 */
function parseGateArgs(args) {
  const trimmed = (args || '').trim();
  const subcommand = trimmed.split(/\s+/)[0] || 'check';

  const valid = ['install', 'check', 'status', 'config'];
  return {
    subcommand: valid.includes(subcommand) ? subcommand : 'check',
  };
}

/**
 * Create a gate command with injectable dependencies.
 * This allows testing without real file system or git operations.
 *
 * @param {Object} deps - Dependencies
 * @param {string} deps.projectPath - Project root path
 * @param {Function} [deps.installHooks] - Hook installer function
 * @param {Function} [deps.runGate] - Gate engine runner function
 * @param {Function} [deps.getStagedFiles] - Get staged files function
 * @param {Function} [deps.loadConfig] - Config loader function
 * @param {Function} [deps.saveConfig] - Config saver function
 * @param {Function} [deps.isHookInstalled] - Hook check function
 * @returns {{ execute: Function }}
 */
function createGateCommand(deps) {
  const {
    projectPath,
    installHooks,
    runGate,
    getStagedFiles,
    loadConfig,
    saveConfig,
    isHookInstalled,
  } = deps;

  return {
    /**
     * Execute a gate subcommand.
     *
     * @param {string} subcommand - install|check|status|config
     * @param {Object} [options] - Subcommand-specific options
     * @returns {Promise<Object>} Subcommand result
     */
    async execute(subcommand, options = {}) {
      switch (subcommand) {
        case 'install':
          return handleInstall();
        case 'check':
          return handleCheck();
        case 'status':
          return handleStatus();
        case 'config':
          return handleConfig(options);
        default:
          return { success: false, error: `Unknown subcommand: ${subcommand}` };
      }
    },
  };

  async function handleInstall() {
    if (!installHooks) {
      return { success: false, error: 'Hook installer not available' };
    }
    const result = await installHooks(projectPath);
    return { success: true, installed: result.installed };
  }

  async function handleCheck() {
    if (!runGate) {
      return { success: false, error: 'Gate engine not available' };
    }
    const files = getStagedFiles ? await getStagedFiles() : [];
    return await runGate(files);
  }

  async function handleStatus() {
    const config = loadConfig ? loadConfig(projectPath) : {};
    const hooks = {
      'pre-commit': isHookInstalled ? isHookInstalled(projectPath, 'pre-commit') : false,
      'pre-push': isHookInstalled ? isHookInstalled(projectPath, 'pre-push') : false,
    };
    return { config, hooks };
  }

  async function handleConfig(updates) {
    if (!saveConfig) {
      return { success: false, error: 'Config saver not available' };
    }
    const current = loadConfig ? loadConfig(projectPath) : {};
    const merged = { ...current, ...updates };
    saveConfig(merged);
    return { success: true, config: merged };
  }
}

module.exports = {
  createGateCommand,
  parseGateArgs,
};
