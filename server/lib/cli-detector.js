/**
 * CLI Detector - Detects locally installed AI CLI tools
 *
 * Supports detection of:
 * - claude (Claude Code)
 * - codex (Codex CLI)
 * - gemini (Gemini CLI)
 */

import { execSync } from 'child_process';

/**
 * CLI tool configurations
 */
export const CLI_TOOLS = {
  claude: {
    command: 'claude',
    headlessArgs: ['-p', '--output-format', 'json'],
    capabilities: ['review', 'code-gen', 'refactor', 'explain', 'test-gen'],
    versionFlag: '--version',
    versionParser: (output) => {
      const match = output.match(/v?(\d+\.\d+\.\d+)/);
      return match ? match[0] : output.trim();
    },
  },
  codex: {
    command: 'codex',
    headlessArgs: ['exec', '--json', '--sandbox', 'read-only'],
    capabilities: ['review', 'code-gen', 'refactor', 'explain'],
    versionFlag: '--version',
    versionParser: (output) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? match[0] : output.trim();
    },
  },
  gemini: {
    command: 'gemini',
    headlessArgs: ['-p', '--output-format', 'json'],
    capabilities: ['design', 'image-gen', 'vision', 'review', 'explain'],
    versionFlag: '--version',
    versionParser: (output) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match ? match[0] : output.trim();
    },
  },
};

// Detection cache
let detectionCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get the 'which' command based on platform
 * @returns {string} Command to find executables
 */
function getWhichCommand() {
  return process.platform === 'win32' ? 'where' : 'which';
}

/**
 * Execute a command with timeout
 * @param {string} command - Command to execute
 * @param {number} timeout - Timeout in ms
 * @returns {string|null} Output or null on failure
 */
function execWithTimeout(command, timeout = 5000) {
  try {
    const result = execSync(command, {
      timeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.toString().trim();
  } catch (err) {
    return null;
  }
}

/**
 * Detect a single CLI tool
 * @param {string} name - CLI tool name (claude, codex, gemini)
 * @returns {Promise<Object|null>} Detection result or null if not found
 */
export async function detectCLI(name) {
  const tool = CLI_TOOLS[name];
  if (!tool) {
    return null;
  }

  const whichCmd = getWhichCommand();

  // Check if command exists
  const path = execWithTimeout(`${whichCmd} ${tool.command}`);
  if (!path) {
    return null;
  }

  // Get version
  let version = 'unknown';
  try {
    const versionOutput = execWithTimeout(`${tool.command} ${tool.versionFlag}`);
    if (versionOutput) {
      version = tool.versionParser(versionOutput);
    }
  } catch (err) {
    // Version detection failed, but CLI exists
  }

  return {
    name,
    command: tool.command,
    path: path.split('\n')[0].trim(),
    version,
    capabilities: tool.capabilities,
    headlessArgs: tool.headlessArgs,
  };
}

/**
 * Detect all CLI tools
 * @param {boolean} [useCache=true] - Whether to use cached results
 * @returns {Promise<Map<string, Object>>} Map of detected CLIs
 */
export async function detectAllCLIs(useCache = true) {
  const now = Date.now();

  // Return cached results if valid
  if (useCache && detectionCache && (now - cacheTimestamp) < CACHE_TTL) {
    return detectionCache;
  }

  const detected = new Map();

  // Detect each CLI tool
  for (const name of Object.keys(CLI_TOOLS)) {
    const result = await detectCLI(name);
    if (result) {
      detected.set(name, result);
    }
  }

  // Update cache
  detectionCache = detected;
  cacheTimestamp = now;

  return detected;
}

/**
 * Clear the detection cache
 */
export function clearCache() {
  detectionCache = null;
  cacheTimestamp = 0;
}

/**
 * Get capabilities for a CLI tool
 * @param {string} name - CLI tool name
 * @returns {string[]} List of capabilities
 */
export function getCapabilities(name) {
  const tool = CLI_TOOLS[name];
  return tool ? [...tool.capabilities] : [];
}
