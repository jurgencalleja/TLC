/**
 * Version Checker - Detects when TLC updates are available
 *
 * Checks the current version from package.json and compares against
 * the latest version published to npm registry.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the current version from package.json
 * @returns {string} Current version or '0.0.0' if unable to read
 */
export function getCurrentVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Fetch the latest version from npm registry
 * @returns {Promise<string | null>} Latest version or null if unavailable
 */
export async function getLatestVersion() {
  try {
    const res = await fetch('https://registry.npmjs.org/tlc-server/latest', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version;
  } catch {
    return null;
  }
}

/**
 * Compare two semantic versions
 * @param {string} current - Current version (e.g., '1.4.2')
 * @param {string | null} latest - Latest version (e.g., '1.5.0')
 * @returns {boolean} True if latest is greater than current
 */
export function compareVersions(current, latest) {
  if (!latest) return false;

  const [cMaj, cMin, cPatch] = current.split('.').map(Number);
  const [lMaj, lMin, lPatch] = latest.split('.').map(Number);

  if (lMaj > cMaj) return true;
  if (lMaj === cMaj && lMin > cMin) return true;
  if (lMaj === cMaj && lMin === cMin && lPatch > cPatch) return true;

  return false;
}

/**
 * Check for available updates
 * @returns {Promise<{
 *   current: string,
 *   latest: string,
 *   updateAvailable: boolean,
 *   changelog: string[]
 * }>}
 */
export async function checkForUpdates() {
  const current = getCurrentVersion();
  const latest = await getLatestVersion();

  return {
    current,
    latest: latest || current,
    updateAvailable: compareVersions(current, latest),
    changelog: [], // TODO: fetch from GitHub releases
  };
}

export default { getCurrentVersion, getLatestVersion, compareVersions, checkForUpdates };
