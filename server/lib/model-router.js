/**
 * Model Router - Routes requests to appropriate provider
 *
 * Implements two-tier routing:
 * - Local: CLI tools detected on the machine (free)
 * - Devserver: Headless CLI or API providers (paid)
 */

import { detectAllCLIs, clearCache } from './cli-detector.js';
import { createCLIProvider } from './cli-provider.js';
import { createAPIProvider } from './api-provider.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Default router configuration
 */
export const DEFAULT_CONFIG = {
  providers: {
    claude: {
      type: 'cli',
      command: 'claude',
      headlessArgs: ['-p', '--output-format', 'json'],
      capabilities: ['review', 'code-gen', 'refactor', 'explain'],
    },
    codex: {
      type: 'cli',
      command: 'codex',
      headlessArgs: ['exec', '--json', '--sandbox', 'read-only'],
      capabilities: ['review', 'code-gen', 'refactor'],
    },
    gemini: {
      type: 'cli',
      command: 'gemini',
      headlessArgs: ['-p', '--output-format', 'json'],
      capabilities: ['design', 'vision', 'review', 'image-gen'],
    },
    deepseek: {
      type: 'api',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-coder',
      capabilities: ['review'],
      devserverOnly: true,
    },
  },
  capabilities: {
    review: {
      providers: ['claude', 'codex', 'deepseek'],
      consensus: 'majority',
    },
    design: {
      providers: ['gemini'],
    },
    'code-gen': {
      providers: ['claude'],
    },
  },
  devserver: {
    url: null,
    queue: {
      maxConcurrent: 3,
      timeout: 120000,
    },
  },
};

/**
 * Load router configuration from .tlc.json
 * @param {string} projectDir - Project directory
 * @returns {Promise<Object>} Router configuration
 */
export async function loadConfig(projectDir) {
  try {
    const configPath = path.join(projectDir, '.tlc.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);

    // Merge with defaults
    return {
      providers: {
        ...DEFAULT_CONFIG.providers,
        ...(config.router?.providers || {}),
      },
      capabilities: {
        ...DEFAULT_CONFIG.capabilities,
        ...(config.router?.capabilities || {}),
      },
      devserver: {
        ...DEFAULT_CONFIG.devserver,
        ...(config.router?.devserver || {}),
      },
    };
  } catch (err) {
    // Return defaults if no config file
    return DEFAULT_CONFIG;
  }
}

/**
 * Create a router instance
 * @param {Object} [config] - Router configuration
 * @returns {Promise<Object>} Router instance
 */
export async function createRouter(config = DEFAULT_CONFIG) {
  // Detect local CLIs
  const detectedCLIs = await detectAllCLIs();

  // Create provider instances
  const providers = new Map();

  for (const [name, providerConfig] of Object.entries(config.providers || {})) {
    const detected = detectedCLIs.has(name);
    const cliInfo = detectedCLIs.get(name);

    if (providerConfig.type === 'cli') {
      providers.set(name, createCLIProvider({
        name,
        ...providerConfig,
        detected,
        version: cliInfo?.version,
        devserverUrl: config.devserver?.url,
      }));
    } else if (providerConfig.type === 'api') {
      providers.set(name, createAPIProvider({
        name,
        ...providerConfig,
      }));
    }
  }

  /**
   * Resolve a provider by name
   * @param {string} name - Provider name
   * @returns {Object|null} Resolution result { provider, via } or null
   */
  function resolveProvider(name) {
    const provider = providers.get(name);
    if (!provider) return null;

    // Determine routing
    if (provider.type === 'cli' && provider.detected) {
      return { provider, via: 'local' };
    }

    // Fall back to devserver
    return { provider, via: 'devserver' };
  }

  /**
   * Resolve providers for a capability
   * @param {string} capability - Capability name
   * @returns {Object[]} Array of providers
   */
  function resolveCapability(capability) {
    const capConfig = config.capabilities?.[capability];
    if (!capConfig) return [];

    const resolved = [];

    for (const providerName of capConfig.providers || []) {
      const result = resolveProvider(providerName);
      if (result) {
        resolved.push({
          ...result.provider,
          via: result.via,
        });
      }
    }

    return resolved;
  }

  /**
   * Run a prompt through providers for a capability
   * @param {string} capability - Capability name
   * @param {string} prompt - The prompt
   * @param {Object} [opts] - Run options
   * @returns {Promise<Object[]>} Array of results
   */
  async function run(capability, prompt, opts = {}) {
    const capProviders = resolveCapability(capability);

    if (capProviders.length === 0) {
      throw new Error(`No providers available for capability: ${capability}`);
    }

    // Run all providers in parallel
    const results = await Promise.all(
      capProviders.map(async (provider) => {
        try {
          const result = await provider.run(prompt, opts);
          return {
            provider: provider.name,
            via: provider.via,
            success: true,
            result,
          };
        } catch (err) {
          return {
            provider: provider.name,
            via: provider.via,
            success: false,
            error: err.message,
          };
        }
      })
    );

    return results;
  }

  /**
   * Get router status
   * @returns {Object} Status information
   */
  function getStatus() {
    const status = {
      providers: {},
      devserver: {
        configured: !!config.devserver?.url,
        url: config.devserver?.url,
      },
    };

    for (const [name, provider] of providers) {
      status.providers[name] = {
        type: provider.type,
        detected: provider.detected,
        capabilities: provider.capabilities,
      };
    }

    return status;
  }

  return {
    resolveProvider,
    resolveCapability,
    run,
    getStatus,
    providers,
    config,
  };
}

