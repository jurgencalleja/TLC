/**
 * CLI Detector - Detect locally installed CLI tools
 * Phase 33, Task 2
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache for detection results
let cache = null;

// CLI capabilities by name
const CLI_CAPABILITIES = {
  claude: ['review', 'code-gen', 'refactor', 'explain', 'test'],
  codex: ['review', 'code-gen', 'refactor', 'explain'],
  gemini: ['design', 'vision', 'review', 'image-gen'],
};

/**
 * Detect a specific CLI tool
 */
export async function detectCLI(name) {
  try {
    const isWindows = process.platform === 'win32';
    const whichCmd = isWindows ? 'where' : 'which';
    
    const { stdout: path } = await execAsync(`${whichCmd} ${name}`, { timeout: 3000 });
    const cleanPath = path.trim().split('\n')[0];

    // Try to get version
    let version = null;
    try {
      const { stdout: ver } = await execAsync(`${name} --version`, { timeout: 3000 });
      version = ver.trim().split('\n')[0];
    } catch {
      // Version command may not exist
    }

    return {
      found: true,
      path: cleanPath,
      version,
    };
  } catch {
    return {
      found: false,
      path: null,
      version: null,
    };
  }
}

/**
 * Detect all known CLI tools
 */
export async function detectAllCLIs() {
  if (cache) {
    return cache;
  }

  const clis = ['claude', 'codex', 'gemini'];
  const results = {};

  await Promise.all(
    clis.map(async (cli) => {
      results[cli] = await detectCLI(cli);
    })
  );

  cache = results;
  return results;
}

/**
 * Clear the detection cache
 */
export function clearCache() {
  cache = null;
}

/**
 * Get capabilities for a CLI
 */
export function getCapabilities(name) {
  return CLI_CAPABILITIES[name] || [];
}

export default { detectCLI, detectAllCLIs, clearCache, getCapabilities };
