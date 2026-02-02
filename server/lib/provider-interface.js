/**
 * Provider Interface - Unified interface for CLI and API providers
 *
 * Supports two provider types:
 * - CLI: Wraps AI coding CLI tools (claude, codex, gemini)
 * - API: Direct REST calls to OpenAI-compatible endpoints
 */

/**
 * Provider types enum
 */
export const PROVIDER_TYPES = {
  CLI: 'cli',
  API: 'api',
};

/**
 * Validate provider configuration
 * @param {Object} config - Provider configuration
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (!config.name) {
    throw new Error('name is required');
  }

  if (!config.type) {
    throw new Error('type is required');
  }

  if (config.type !== PROVIDER_TYPES.CLI && config.type !== PROVIDER_TYPES.API) {
    throw new Error(`Invalid provider type: ${config.type}. Must be 'cli' or 'api'`);
  }

  if (config.type === PROVIDER_TYPES.CLI && !config.command) {
    throw new Error('command is required for CLI providers');
  }

  if (config.type === PROVIDER_TYPES.API && !config.baseUrl) {
    throw new Error('baseUrl is required for API providers');
  }
}

/**
 * Create a ProviderResult object
 * @param {Object} data - Result data
 * @param {string} data.raw - Raw output string
 * @param {any} data.parsed - Parsed output (typically JSON)
 * @param {number} data.exitCode - Exit code (0 for success)
 * @param {Object} [data.tokenUsage] - Token usage statistics
 * @param {number} [data.cost] - Cost in USD
 * @returns {Object} ProviderResult
 */
export function createProviderResult({ raw, parsed, exitCode, tokenUsage = null, cost = null }) {
  return {
    raw,
    parsed,
    exitCode,
    tokenUsage,
    cost,
  };
}

/**
 * Calculate cost from token usage
 * @param {Object} tokenUsage - Token usage { input, output }
 * @param {Object} pricing - Pricing { input, output } per 1K tokens
 * @returns {number} Cost in USD
 */
function calculateCost(tokenUsage, pricing) {
  if (!tokenUsage || !pricing) return null;

  const inputCost = (tokenUsage.input * pricing.input) / 1000;
  const outputCost = (tokenUsage.output * pricing.output) / 1000;

  return inputCost + outputCost;
}

/**
 * Create a provider instance
 * @param {Object} config - Provider configuration
 * @param {string} config.name - Provider name
 * @param {string} config.type - Provider type ('cli' or 'api')
 * @param {string} [config.command] - CLI command (required for CLI type)
 * @param {string} [config.baseUrl] - API base URL (required for API type)
 * @param {string} [config.model] - Model identifier
 * @param {string[]} [config.capabilities] - List of capabilities
 * @param {string[]} [config.headlessArgs] - Headless mode arguments
 * @param {Object} [config.pricing] - Token pricing { input, output }
 * @param {Function} [config.runner] - Custom runner function (for testing)
 * @returns {Object} Provider instance
 */
export function createProvider(config) {
  // Validate
  if (!config.name) {
    throw new Error('name is required');
  }

  if (config.type !== PROVIDER_TYPES.CLI && config.type !== PROVIDER_TYPES.API) {
    throw new Error(`Invalid provider type: ${config.type}. Must be 'cli' or 'api'`);
  }

  // Freeze capabilities to make them immutable
  const capabilities = Object.freeze([...(config.capabilities || [])]);

  // Default runner that throws (should be overridden)
  const defaultRunner = async () => {
    throw new Error('Provider runner not implemented');
  };

  const runner = config.runner || defaultRunner;

  /**
   * Run a prompt through the provider
   * @param {string} prompt - The prompt to send
   * @param {Object} opts - Run options
   * @param {string} [opts.outputFormat] - Output format ('json' or 'text')
   * @param {string} [opts.sandbox] - Sandbox mode
   * @param {Object} [opts.outputSchema] - JSON schema for output
   * @param {string} [opts.cwd] - Working directory
   * @returns {Promise<Object>} ProviderResult
   */
  async function run(prompt, opts = {}) {
    const result = await runner(prompt, opts);

    // Calculate cost if we have token usage and pricing
    if (result.tokenUsage && config.pricing) {
      result.cost = calculateCost(result.tokenUsage, config.pricing);
    }

    return createProviderResult({
      raw: result.raw,
      parsed: result.parsed,
      exitCode: result.exitCode,
      tokenUsage: result.tokenUsage || null,
      cost: result.cost || null,
    });
  }

  return {
    name: config.name,
    type: config.type,
    command: config.command,
    baseUrl: config.baseUrl,
    model: config.model,
    headlessArgs: config.headlessArgs,
    pricing: config.pricing,
    detected: config.detected || false,
    capabilities,
    run,
  };
}
