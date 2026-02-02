/**
 * Router Setup Command - Interactive setup for multi-model routing
 */

import { detectAllCLIs } from './cli-detector.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default cost estimates per 1K tokens (in USD)
 */
const API_COSTS = {
  deepseek: { input: 0.0001, output: 0.0002 },
  mistral: { input: 0.0002, output: 0.0006 },
  default: { input: 0.001, output: 0.002 },
};

/**
 * Average tokens per request type
 */
const AVG_TOKENS = {
  review: { input: 2000, output: 500 },
  design: { input: 1000, output: 2000 },
  'code-gen': { input: 500, output: 1500 },
};

/**
 * Execute the router setup command
 * @param {Object} options - Command options
 * @param {string} options.projectDir - Project directory
 * @param {boolean} [options.dryRun] - Don't write config
 * @returns {Promise<Object>} Setup result
 */
export async function execute(options = {}) {
  const { projectDir = process.cwd(), dryRun = false } = options;

  // Step 1: Detect local CLIs
  const detected = await detectLocalCLIs();

  // Step 2: Load existing config
  let existingConfig = {};
  try {
    const configPath = path.join(projectDir, '.tlc.json');
    const content = await fs.readFile(configPath, 'utf8');
    existingConfig = JSON.parse(content);
  } catch (err) {
    // No existing config
  }

  // Step 3: Test devserver connection
  const devserverUrl = existingConfig.router?.devserver?.url;
  const devserver = await testDevserverConnection(devserverUrl);

  // Step 4: Build routing table
  const routingTable = buildRoutingTable(detected, devserver);

  // Step 5: Estimate costs
  const costEstimate = estimateCosts(
    {
      providers: buildProviderConfig(detected),
      capabilities: buildCapabilityConfig(detected),
    },
    { reviewsPerDay: 10, designsPerDay: 2, codeGensPerDay: 5 }
  );

  // Step 6: Build final config
  const routerConfig = {
    providers: buildProviderConfig(detected),
    capabilities: buildCapabilityConfig(detected),
    devserver: {
      url: devserverUrl || null,
      queue: {
        maxConcurrent: 3,
        timeout: 120000,
      },
    },
  };

  // Step 7: Save config (unless dry run)
  if (!dryRun) {
    await saveConfig(projectDir, routerConfig);
  }

  return {
    detected,
    devserver,
    routingTable,
    costEstimate,
    config: routerConfig,
  };
}

/**
 * Detect locally installed CLIs
 * @returns {Promise<Object>} Detected CLI info
 */
export async function detectLocalCLIs() {
  const detected = await detectAllCLIs();
  const result = {};

  for (const [name, info] of detected) {
    result[name] = {
      detected: true,
      version: info.version,
      capabilities: info.capabilities || [],
    };
  }

  return result;
}

/**
 * Test devserver connection
 * @param {string|null} url - Devserver URL
 * @returns {Promise<Object>} Connection result
 */
export async function testDevserverConnection(url) {
  if (!url) {
    return { connected: false, configured: false };
  }

  try {
    const response = await fetch(`${url}/api/health`);
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        configured: true,
        healthy: data.healthy,
        providers: data.providers,
      };
    }
    return { connected: false, configured: true, error: 'Unhealthy response' };
  } catch (err) {
    return { connected: false, configured: true, error: err.message };
  }
}

/**
 * Configure a provider
 * @param {Object} config - Current config
 * @param {string} name - Provider name
 * @param {Object} providerConfig - Provider configuration
 * @returns {Object} Updated config
 */
export function configureProvider(config, name, providerConfig) {
  return {
    ...config,
    providers: {
      ...config.providers,
      [name]: providerConfig,
    },
  };
}

/**
 * Configure a capability
 * @param {Object} config - Current config
 * @param {string} name - Capability name
 * @param {string[]} providers - Provider names
 * @returns {Object} Updated config
 */
export function configureCapability(config, name, providers) {
  return {
    ...config,
    capabilities: {
      ...config.capabilities,
      [name]: { providers },
    },
  };
}

/**
 * Test provider connectivity
 * @param {Object} provider - Provider config
 * @returns {Promise<Object>} Test result
 */
export async function testProvider(provider) {
  if (provider.type === 'cli') {
    // CLI providers are available if detected
    return {
      available: provider.detected === true,
      via: provider.detected ? 'local' : 'devserver',
    };
  }

  if (provider.type === 'api') {
    // Test API endpoint
    try {
      const response = await fetch(`${provider.baseUrl}/v1/models`);
      return { available: response.ok, via: 'api' };
    } catch (err) {
      return { available: true, via: 'api', note: 'Endpoint not tested' };
    }
  }

  return { available: false, error: 'Unknown provider type' };
}

/**
 * Format routing summary
 * @param {Object} config - Router config
 * @returns {string} Formatted summary
 */
export function formatRoutingSummary(config) {
  const lines = ['Routing Summary:', ''];

  for (const [capName, capConfig] of Object.entries(
    config.capabilities || {}
  )) {
    lines.push(`  ${capName}:`);

    for (const providerName of capConfig.providers || []) {
      const provider = config.providers?.[providerName];
      if (!provider) continue;

      let routing = 'unknown';
      if (provider.type === 'cli') {
        routing = provider.detected ? 'local' : 'devserver';
      } else if (provider.type === 'api') {
        routing = 'devserver';
      }

      lines.push(`    - ${providerName} (${routing})`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Estimate costs
 * @param {Object} config - Router config
 * @param {Object} usage - Usage estimates
 * @returns {Object} Cost estimates
 */
export function estimateCosts(config, usage = {}) {
  const estimate = {};

  for (const [capName, capConfig] of Object.entries(
    config.capabilities || {}
  )) {
    const perDay = usage[`${capName}sPerDay`] || usage.reviewsPerDay || 10;
    const tokens = AVG_TOKENS[capName] || AVG_TOKENS.review;

    let localCost = 0;
    let devserverCost = 0;

    for (const providerName of capConfig.providers || []) {
      const provider = config.providers?.[providerName];
      if (!provider) continue;

      if (provider.type === 'cli' && provider.detected) {
        // Local CLI is free
        localCost += 0;
      } else {
        // API or devserver costs money
        const pricing = API_COSTS[providerName] || API_COSTS.default;
        const inputCost = (tokens.input / 1000) * pricing.input * perDay * 30;
        const outputCost = (tokens.output / 1000) * pricing.output * perDay * 30;
        devserverCost += inputCost + outputCost;
      }
    }

    estimate[capName] = {
      local: localCost,
      devserver: Math.round(devserverCost * 100) / 100,
    };
  }

  return estimate;
}

/**
 * Save router config
 * @param {string} projectDir - Project directory
 * @param {Object} routerConfig - Router configuration
 */
export async function saveConfig(projectDir, routerConfig) {
  const configPath = path.join(projectDir, '.tlc.json');

  // Read existing config
  let existingConfig = {};
  try {
    const content = await fs.readFile(configPath, 'utf8');
    existingConfig = JSON.parse(content);
  } catch (err) {
    // No existing config
  }

  // Merge router config
  const newConfig = {
    ...existingConfig,
    router: routerConfig,
  };

  await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
}

/**
 * Build provider config from detected CLIs
 * @param {Object} detected - Detected CLI info
 * @returns {Object} Provider config
 */
function buildProviderConfig(detected) {
  const providers = {};

  // Add detected CLIs
  if (detected.claude) {
    providers.claude = {
      type: 'cli',
      command: 'claude',
      detected: true,
      headlessArgs: ['-p', '--output-format', 'json'],
      capabilities: ['review', 'code-gen', 'refactor', 'explain'],
    };
  }

  if (detected.codex) {
    providers.codex = {
      type: 'cli',
      command: 'codex',
      detected: true,
      headlessArgs: ['exec', '--json', '--sandbox', 'read-only'],
      capabilities: ['review', 'code-gen', 'refactor'],
    };
  }

  if (detected.gemini) {
    providers.gemini = {
      type: 'cli',
      command: 'gemini',
      detected: true,
      headlessArgs: ['-p', '--output-format', 'json'],
      capabilities: ['design', 'vision', 'review', 'image-gen'],
    };
  }

  // Always include API providers (devserver-only)
  providers.deepseek = {
    type: 'api',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-coder',
    capabilities: ['review'],
    devserverOnly: true,
  };

  return providers;
}

/**
 * Build capability config from detected CLIs
 * @param {Object} detected - Detected CLI info
 * @returns {Object} Capability config
 */
function buildCapabilityConfig(detected) {
  const capabilities = {};

  // Review capability - use all available
  const reviewProviders = [];
  if (detected.claude) reviewProviders.push('claude');
  if (detected.codex) reviewProviders.push('codex');
  reviewProviders.push('deepseek'); // Always available via devserver

  capabilities.review = {
    providers: reviewProviders,
    consensus: 'majority',
  };

  // Design capability - gemini only
  if (detected.gemini) {
    capabilities.design = {
      providers: ['gemini'],
    };
  }

  // Code generation - claude preferred
  const codeGenProviders = [];
  if (detected.claude) codeGenProviders.push('claude');
  if (detected.codex) codeGenProviders.push('codex');

  if (codeGenProviders.length > 0) {
    capabilities['code-gen'] = {
      providers: codeGenProviders,
    };
  }

  return capabilities;
}

/**
 * Build routing table from detected CLIs and devserver
 * @param {Object} detected - Detected CLI info
 * @param {Object} devserver - Devserver status
 * @returns {Object} Routing table
 */
function buildRoutingTable(detected, devserver) {
  const table = {};

  // CLI providers
  for (const name of ['claude', 'codex', 'gemini']) {
    table[name] = {
      local: detected[name]?.detected || false,
      devserver: devserver.connected,
      preferred: detected[name]?.detected ? 'local' : 'devserver',
    };
  }

  // API providers
  table.deepseek = {
    local: false,
    devserver: true,
    preferred: 'devserver',
  };

  return table;
}
