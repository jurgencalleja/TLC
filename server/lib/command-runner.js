/**
 * Command Runner — execute TLC commands via container, Claude Code, or queue
 * Phase 80 Task 8
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const VALID_COMMANDS = ['build', 'deploy', 'test', 'plan', 'verify', 'review', 'status'];

/**
 * Create command runner
 * @param {Object} [options]
 * @param {Function} [options._checkDocker] - Check if tlc-standalone image exists
 * @param {Function} [options._checkClaude] - Check if Claude Code is running
 * @returns {Object} Command runner API
 */
function createCommandRunner(options = {}) {
  const checkDocker = options._checkDocker || defaultCheckDocker;
  const checkClaude = options._checkClaude || defaultCheckClaude;

  async function defaultCheckDocker() {
    try {
      execSync('docker image inspect tlc-standalone 2>/dev/null', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  function defaultCheckClaude() {
    try {
      const result = execSync('pgrep -f "claude" 2>/dev/null', { stdio: 'pipe' });
      return result.toString().trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Detect best execution method
   * @param {string} projectPath
   * @returns {Promise<string>} 'container' | 'claude-code' | 'queue'
   */
  async function detectExecutionMethod(projectPath) {
    if (await checkDocker()) return 'container';
    if (checkClaude()) return 'claude-code';
    return 'queue';
  }

  /**
   * Execute command via Docker container
   * @param {string} projectPath
   * @param {string} command
   * @param {Function} onOutput
   * @returns {Promise<{ exitCode: number }>}
   */
  async function executeViaContainer(projectPath, command, onOutput) {
    return new Promise((resolve, reject) => {
      const proc = spawn('docker', [
        'run', '--rm',
        '-v', `${projectPath}:/project`,
        '-w', '/project',
        'tlc-standalone',
        'tlc', command,
      ]);

      proc.stdout.on('data', (data) => onOutput && onOutput(data.toString()));
      proc.stderr.on('data', (data) => onOutput && onOutput(data.toString()));
      proc.on('close', (code) => resolve({ exitCode: code }));
      proc.on('error', (err) => reject(err));
    });
  }

  /**
   * Queue command as task in PLAN.md
   * @param {string} projectPath
   * @param {string} command
   */
  async function queueCommand(projectPath, command) {
    const timestamp = new Date().toISOString();
    const entry = `\n### Queued: tlc ${command}\n_Queued at ${timestamp}_\n`;

    // Find most recent plan file
    const planDir = path.join(projectPath, '.planning', 'phases');
    if (fs.existsSync(planDir)) {
      const plans = fs.readdirSync(planDir).filter(f => f.endsWith('-PLAN.md')).sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
        return numA - numB;
      });
      if (plans.length > 0) {
        const planPath = path.join(planDir, plans[plans.length - 1]);
        fs.appendFileSync(planPath, entry);
      }
    }

    // Log to history
    logCommand(projectPath, { command, timestamp, method: 'queue' });

    return { queued: true, method: 'queue', command };
  }

  /**
   * Log a command to history
   */
  function logCommand(projectPath, entry) {
    const histPath = path.join(projectPath, '.tlc', 'command-history.json');
    const dir = path.dirname(histPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let history = [];
    try {
      if (fs.existsSync(histPath)) {
        history = JSON.parse(fs.readFileSync(histPath, 'utf8'));
      }
    } catch {}
    history.push(entry);
    // Keep last 100
    if (history.length > 100) history = history.slice(-100);
    fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
  }

  /**
   * Get command history for a project
   * @param {string} projectPath
   * @returns {Array}
   */
  function getCommandHistory(projectPath) {
    const histPath = path.join(projectPath, '.tlc', 'command-history.json');
    try {
      if (fs.existsSync(histPath)) {
        return JSON.parse(fs.readFileSync(histPath, 'utf8'));
      }
    } catch {}
    return [];
  }

  /**
   * Validate command type
   * @param {string} command
   * @returns {boolean}
   */
  function validateCommand(command) {
    if (!command || typeof command !== 'string') return false;
    return VALID_COMMANDS.includes(command);
  }

  return {
    detectExecutionMethod,
    executeViaContainer,
    queueCommand,
    getCommandHistory,
    validateCommand,
  };
}

module.exports = { createCommandRunner };
