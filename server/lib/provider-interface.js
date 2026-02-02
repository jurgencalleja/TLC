/**
 * Provider Interface - Unified interface for CLI and API providers
 * Phase 33, Task 1
 */

export const ProviderType = {
  CLI: 'cli',
  API: 'api',
};

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config) {
  const errors = [];

  if (!config.name) {
    errors.push('name is required');
  }

  if (!config.type) {
    errors.push('type is required');
  } else if (config.type !== ProviderType.CLI && config.type !== ProviderType.API) {
    errors.push('invalid type: ' + config.type);
  }

  if (config.type === ProviderType.CLI && !config.command) {
    errors.push('command is required for CLI providers');
  }

  if (config.type === ProviderType.API && !config.baseUrl) {
    errors.push('baseUrl is required for API providers');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a provider instance
 */
export function createProvider(config) {
  const validation = validateProviderConfig(config);
  if (!validation.valid) {
    throw new Error('Invalid provider config: ' + validation.errors.join(', '));
  }

  const provider = {
    name: config.name,
    type: config.type,
    capabilities: config.capabilities || [],
    config,
    _execute: null,

    async run(prompt, options = {}) {
      if (this._execute) {
        return this._execute(prompt, options);
      }
      if (this.type === ProviderType.CLI) {
        return this._runCLI(prompt, options);
      } else {
        return this._runAPI(prompt, options);
      }
    },

    async _runCLI(prompt, options) {
      return {
        raw: '',
        parsed: null,
        exitCode: 0,
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
      };
    },

    async _runAPI(prompt, options) {
      return {
        raw: '',
        parsed: null,
        exitCode: 0,
        tokenUsage: { input: 0, output: 0 },
        cost: 0,
      };
    },

    calculateCost(tokenUsage) {
      const pricing = config.pricing || { inputPer1k: 0, outputPer1k: 0 };
      const inputCost = (tokenUsage.input / 1000) * pricing.inputPer1k;
      const outputCost = (tokenUsage.output / 1000) * pricing.outputPer1k;
      return inputCost + outputCost;
    },
  };

  return provider;
}

export default { createProvider, validateProviderConfig, ProviderType };
