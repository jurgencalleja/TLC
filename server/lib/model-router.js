/**
 * Model Router - Route requests to appropriate provider
 * Phase 33, Task 5
 */

import { detectCLI } from './cli-detector.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const DEFAULT_CONFIG = {
  providers: {},
  capabilities: {},
  devserver: { url: null },
};

export class ModelRouter {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.devserverUrl = config.devserver?.url || null;
    this._detectCLI = detectCLI;
    this._readConfig = null;
  }

  async resolveProvider(name) {
    const providerConfig = this.config.providers[name];
    if (!providerConfig) {
      throw new Error('Unknown provider: ' + name);
    }

    // API providers always go to devserver
    if (providerConfig.type === 'api') {
      return {
        name,
        config: providerConfig,
        location: 'devserver',
        available: !!this.devserverUrl,
      };
    }

    // CLI providers: try local first
    const detected = await this._detectCLI(providerConfig.command || name);
    if (detected.found) {
      return {
        name,
        config: providerConfig,
        location: 'local',
        path: detected.path,
        available: true,
      };
    }

    // Fall back to devserver
    return {
      name,
      config: providerConfig,
      location: 'devserver',
      available: !!this.devserverUrl,
    };
  }

  async resolveCapability(capability) {
    const capConfig = this.config.capabilities[capability];
    if (!capConfig) {
      return [];
    }

    const providers = [];
    for (const name of capConfig.providers || []) {
      const provider = await this.resolveProvider(name);
      providers.push(provider);
    }

    return providers;
  }

  async loadConfig() {
    try {
      let configData;
      if (this._readConfig) {
        configData = await this._readConfig();
      } else {
        const configPath = join(process.cwd(), '.tlc.json');
        const content = await readFile(configPath, 'utf-8');
        configData = JSON.parse(content);
      }

      if (configData.router) {
        this.config = { ...DEFAULT_CONFIG, ...configData.router };
        this.devserverUrl = configData.router.devserver?.url || null;
      }
    } catch {
      // Use defaults
    }
  }
}

export async function resolveProvider(name, config) {
  const router = new ModelRouter(config);
  return router.resolveProvider(name);
}

export async function resolveCapability(capability, config) {
  const router = new ModelRouter(config);
  return router.resolveCapability(capability);
}

export default { ModelRouter, resolveProvider, resolveCapability };
