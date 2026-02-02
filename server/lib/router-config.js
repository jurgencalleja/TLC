/**
 * Router Config - Configuration schema for .tlc.json router section
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Default router configuration
 */
export const defaultConfig = {
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
 * Validate provider configurations
 * @param {Object} providers - Provider configs
 * @throws {Error} If validation fails
 */
export function validateProviders(providers) {
  for (const [name, config] of Object.entries(providers)) {
    if (!config.type) {
      throw new Error(`Provider ${name}: type is required`);
    }

    if (config.type === 'cli' && !config.command) {
      throw new Error(`Provider ${name}: command is required for CLI providers`);
    }

    if (config.type === 'api' && !config.baseUrl) {
      throw new Error(`Provider ${name}: baseUrl is required for API providers`);
    }
  }
}

/**
 * Validate capability configurations
 * @param {Object} config - Full config with providers and capabilities
 * @throws {Error} If validation fails
 */
export function validateCapabilities(config) {
  const { providers, capabilities } = config;

  for (const [capName, capConfig] of Object.entries(capabilities || {})) {
    for (const providerName of capConfig.providers || []) {
      if (!providers[providerName]) {
        throw new Error(
          `Capability ${capName}: references unknown provider "${providerName}"`
        );
      }
    }
  }
}

/**
 * Get provider configuration by name
 * @param {Object} config - Router config
 * @param {string} name - Provider name
 * @returns {Object|null} Provider config or null
 */
export function getProviderConfig(config, name) {
  return config.providers?.[name] || null;
}

/**
 * Get capability configuration by name
 * @param {Object} config - Router config
 * @param {string} name - Capability name
 * @returns {Object|null} Capability config or null
 */
export function getCapabilityConfig(config, name) {
  return config.capabilities?.[name] || null;
}

/**
 * Migrate old config format to new format
 * @param {Object} config - Possibly old format config
 * @returns {Object} New format config
 */
export function migrateConfig(config) {
  // If already has router section, extract it
  if (config.router) {
    return {
      providers: {
        ...defaultConfig.providers,
        ...(config.router.providers || {}),
      },
      capabilities: {
        ...defaultConfig.capabilities,
        ...(config.router.capabilities || {}),
      },
      devserver: {
        ...defaultConfig.devserver,
        ...(config.router.devserver || {}),
      },
    };
  }

  // Handle old adapter-based format
  if (config.adapters) {
    const providers = {};

    for (const [name, adapter] of Object.entries(config.adapters)) {
      providers[name] = {
        type: adapter.type || 'cli',
        command: adapter.command || name,
        capabilities: adapter.capabilities || [],
      };
    }

    return {
      providers: {
        ...defaultConfig.providers,
        ...providers,
      },
      capabilities: defaultConfig.capabilities,
      devserver: defaultConfig.devserver,
    };
  }

  // Return defaults
  return defaultConfig;
}

/**
 * Load router configuration from .tlc.json
 * @param {string} projectDir - Project directory
 * @returns {Promise<Object>} Router configuration
 */
export async function loadRouterConfig(projectDir) {
  const configPath = path.join(projectDir, '.tlc.json');

  let fileConfig = {};
  try {
    const content = await fs.readFile(configPath, 'utf8');
    fileConfig = JSON.parse(content);
  } catch (err) {
    // File doesn't exist, use defaults
    return defaultConfig;
  }

  // Migrate if needed
  const config = migrateConfig(fileConfig);

  // Validate
  validateProviders(config.providers);
  validateCapabilities(config);

  return config;
}

/**
 * Save router configuration to .tlc.json
 * @param {string} projectDir - Project directory
 * @param {Object} routerConfig - Router configuration
 */
export async function saveRouterConfig(projectDir, routerConfig) {
  const configPath = path.join(projectDir, '.tlc.json');

  // Read existing config
  let existingConfig = {};
  try {
    const content = await fs.readFile(configPath, 'utf8');
    existingConfig = JSON.parse(content);
  } catch (err) {
    // File doesn't exist
  }

  // Merge router config
  const newConfig = {
    ...existingConfig,
    router: routerConfig,
  };

  await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
}
