/**
 * Router Status API - Returns provider status for dashboard
 * Phase 39, Task 3
 */

import { detectAllCLIs } from './cli-detector.js';
import { loadRouterConfig, defaultConfig } from './router-config.js';

/**
 * Check if devserver is reachable
 */
async function checkDevserver(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url + '/health', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get combined router status for dashboard display
 *
 * @param {Object} options - Dependency injection for testing
 * @param {Function} options._detectAllCLIs - Override CLI detection
 * @param {Function} options._loadRouterConfig - Override config loading
 * @param {Function} options._checkDevserver - Override devserver check
 * @returns {Object} Router status object
 */
export async function getRouterStatus(options = {}) {
  const detectCLIs = options._detectAllCLIs || detectAllCLIs;
  const loadConfig = options._loadRouterConfig || loadRouterConfig;
  const checkDev = options._checkDevserver || checkDevserver;

  // Load config (with fallback to defaults on error)
  let config;
  try {
    config = await loadConfig();
  } catch {
    config = { ...defaultConfig };
  }

  // Detect installed CLIs
  const cliResults = await detectCLIs();

  // Build providers object
  const providers = {};
  for (const [name, providerConfig] of Object.entries(config.providers || {})) {
    const cliInfo = cliResults[name] || { found: false, version: null };
    providers[name] = {
      name,
      type: providerConfig.type || 'cli',
      detected: cliInfo.found || false,
      version: cliInfo.version || null,
    };
  }

  // Build capabilities object (pass through from config)
  const capabilities = config.capabilities || {};

  // Check devserver connection
  let devserverStatus = {
    connected: false,
    url: config.devserver?.url || null,
  };

  if (config.devserver?.url) {
    const isConnected = await checkDev(config.devserver.url);
    devserverStatus.connected = isConnected;
  }

  // Usage stats (placeholder - would come from actual tracking)
  const usage = {
    requestsToday: 0,
    tokensUsed: 0,
  };

  return {
    providers,
    capabilities,
    devserver: devserverStatus,
    usage,
  };
}

export default { getRouterStatus };
