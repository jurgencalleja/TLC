/**
 * LaunchAgent plist generator for macOS.
 *
 * Generates, installs, and manages a macOS LaunchAgent that keeps
 * the TLC server running permanently — auto-starts on login,
 * auto-restarts on crash.
 *
 * @module launchd-agent
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/** LaunchAgent label */
const PLIST_LABEL = 'com.tlc.server';

/** Default plist install location */
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${PLIST_LABEL}.plist`);

/**
 * Generate a macOS LaunchAgent plist XML string.
 *
 * @param {object} opts
 * @param {string} opts.projectRoot - Absolute path to the TLC project
 * @param {number} [opts.port=3147] - Server port
 * @returns {string} Valid XML plist
 */
function generatePlist(opts) {
  const { projectRoot, port = 3147 } = opts;
  const nodePath = process.execPath;
  const serverScript = path.join(projectRoot, 'server', 'index.js');
  const logDir = path.join(os.homedir(), '.tlc', 'logs');
  const logFile = path.join(logDir, 'server.log');
  const envPath = process.env.PATH || '/usr/local/bin:/usr/bin:/bin';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${serverScript}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${projectRoot}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${envPath}</string>
    <key>HOME</key>
    <string>${os.homedir()}</string>
    <key>NODE_ENV</key>
    <string>development</string>
    <key>TLC_PORT</key>
    <string>${port}</string>
  </dict>

  <key>KeepAlive</key>
  <true/>

  <key>ThrottleInterval</key>
  <integer>10</integer>

  <key>StandardOutPath</key>
  <string>${logFile}</string>

  <key>StandardErrorPath</key>
  <string>${logFile}</string>
</dict>
</plist>
`;
}

/**
 * Write the plist file to disk.
 *
 * @param {object} opts
 * @param {string} opts.projectRoot - Absolute path to the TLC project
 * @param {string} [opts.targetDir] - Override install directory (for testing)
 * @param {number} [opts.port=3147] - Server port
 */
function installAgent(opts) {
  const targetDir = opts.targetDir || path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(targetDir, `${PLIST_LABEL}.plist`);

  // Ensure log directory exists
  const logDir = path.join(os.homedir(), '.tlc', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const xml = generatePlist(opts);
  fs.writeFileSync(plistPath, xml, 'utf-8');
}

/**
 * Remove the plist file from disk.
 *
 * @param {object} [opts]
 * @param {string} [opts.targetDir] - Override install directory (for testing)
 */
function uninstallAgent(opts = {}) {
  const targetDir = opts.targetDir || path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(targetDir, `${PLIST_LABEL}.plist`);

  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
}

/**
 * Check if the plist file is installed.
 *
 * @param {object} [opts]
 * @param {string} [opts.targetDir] - Override install directory (for testing)
 * @returns {boolean}
 */
function isInstalled(opts = {}) {
  const targetDir = opts.targetDir || path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(targetDir, `${PLIST_LABEL}.plist`);
  return fs.existsSync(plistPath);
}

/**
 * Load the agent into launchd.
 *
 * @param {object} [opts]
 * @param {Function} [opts.exec] - Async exec function (for testing)
 * @param {string} [opts.targetDir] - Override install directory
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function loadAgent(opts = {}) {
  const exec = opts.exec || defaultExec;
  const targetDir = opts.targetDir || path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(targetDir, `${PLIST_LABEL}.plist`);

  try {
    await exec(`launchctl load -w ${plistPath}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Unload the agent from launchd and remove the plist.
 *
 * @param {object} [opts]
 * @param {Function} [opts.exec] - Async exec function (for testing)
 * @param {string} [opts.targetDir] - Override install directory
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function unloadAgent(opts = {}) {
  const exec = opts.exec || defaultExec;
  const targetDir = opts.targetDir || path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(targetDir, `${PLIST_LABEL}.plist`);

  try {
    await exec(`launchctl unload ${plistPath}`);
  } catch {
    // Agent may not be loaded — that's fine
  }

  uninstallAgent({ targetDir });
  return { ok: true };
}

/**
 * Check if the agent is loaded in launchd.
 *
 * @param {object} [opts]
 * @param {Function} [opts.exec] - Async exec function (for testing)
 * @returns {Promise<{loaded: boolean, pid?: number}>}
 */
async function statusAgent(opts = {}) {
  const exec = opts.exec || defaultExec;

  try {
    const { stdout } = await exec(`launchctl list ${PLIST_LABEL}`);
    const parts = stdout.trim().split('\t');
    const pid = parts[0] && parts[0] !== '-' ? parseInt(parts[0], 10) : null;
    return { loaded: true, pid };
  } catch {
    return { loaded: false };
  }
}

/**
 * Default exec using child_process.
 * @param {string} cmd
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function defaultExec(cmd) {
  const { exec } = require('child_process');
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

module.exports = {
  generatePlist,
  installAgent,
  uninstallAgent,
  isInstalled,
  loadAgent,
  unloadAgent,
  statusAgent,
  PLIST_LABEL,
  PLIST_PATH,
};
