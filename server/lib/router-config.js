/**
 * Router Config Schema - Configuration for .tlc.json router section
 * Phase 33, Task 9
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const defaultConfig = {
  providers: {
    claude: { type: 'cli', command: 'claude', capabilities: ['review', 'code-gen', 'refactor'] },
    codex: { type: 'cli', command: 'codex', capabilities: ['review', 'code-gen'] },
    gemini: { type: 'cli', command: 'gemini', capabilities: ['design', 'vision'] },
  },
  capabilities: {
    review: { providers: ['claude', 'codex'] },
    'code-gen': { providers: ['claude'] },
    design: { providers: ['gemini'] },
  },
  devserver: { url: null, queue: { maxConcurrent: 3, timeout: 120000 } },
};

export async function loadRouterConfig(options = {}) {
  try {
    let content;
    if (options._readFile) {
      content = await options._readFile();
    } else {
      const configPath = join(process.cwd(), '.tlc.json');
      content = await readFile(configPath, 'utf-8');
    }
    
    const data = JSON.parse(content);
    const routerConfig = data.router || {};
    
    return {
      providers: { ...defaultConfig.providers, ...routerConfig.providers },
      capabilities: { ...defaultConfig.capabilities, ...routerConfig.capabilities },
      devserver: { ...defaultConfig.devserver, ...routerConfig.devserver },
    };
  } catch {
    return { ...defaultConfig };
  }
}

export function validateConfig(config) {
  const errors = [];

  // Check capability provider references
  if (config.capabilities) {
    for (const [cap, capConfig] of Object.entries(config.capabilities)) {
      for (const provider of capConfig.providers || []) {
        if (!config.providers?.[provider]) {
          errors.push('Capability ' + cap + ' references unknown provider: ' + provider);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getProviderConfig(config, name) {
  return config.providers?.[name] || null;
}

export function getCapabilityConfig(config, name) {
  return config.capabilities?.[name] || null;
}

export async function saveRouterConfig(config, options = {}) {
  const configPath = join(process.cwd(), '.tlc.json');
  
  let existing = {};
  try {
    const content = await readFile(configPath, 'utf-8');
    existing = JSON.parse(content);
  } catch {
    // New file
  }

  existing.router = config;
  const json = JSON.stringify(existing, null, 2);

  if (options._writeFile) {
    await options._writeFile(json);
  } else {
    await writeFile(configPath, json);
  }
}

export default {
  loadRouterConfig,
  validateConfig,
  getProviderConfig,
  getCapabilityConfig,
  defaultConfig,
  saveRouterConfig,
};
